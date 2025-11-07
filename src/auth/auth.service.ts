import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/create-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { Verification, VerificationType, } from './entities/verification.entity';
import { RequestVerificationDto, VerifyCodeDto, ForgotPasswordDto, ResetPasswordDto } from './dto/verification.dto';
import { CartService } from '../cart/cart.service';
import { GoogleProfile, FacebookProfile } from '../types/social-profile.interface';
import { User } from '../user/entities/user.entity';

interface LinkData {
  token: string;
  userId: string;
  provider: string;
  socialId: string;
  expiresAt: Date;
}


@Injectable()
export class AuthService {

  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    @InjectRepository(Verification)
    private readonly verificationRepo: Repository<Verification>,
    private readonly mailerService: MailerService,
    private cartService: CartService,
  ) { }


  async register(dto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    await this.cartService.createCartForUser(newUser);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.verificationRepo.save(this.verificationRepo.create({
      email: newUser.email,
      code,
      type: VerificationType.EMAIL_VERIFICATION,
      user: newUser
    }));

    await this.mailerService.sendMail({
      to: newUser.email,
      subject: 'Verify your email',
      html: `<p>Your verification code is <strong>${code}</strong></p>`,
    });

    return {
      message: 'Registration successful',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      await this.requestEmailVerification({ email: dto.email });
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async requestEmailVerification(dto: RequestVerificationDto) {
    const existing = await this.verificationRepo.findOne({ where: { email: dto.email } });

    const now = Date.now();

    if (existing) {
      const ageInSeconds = (now - new Date(existing.createdAt).getTime()) / 1000;

      if (ageInSeconds < 60) {
        // Cooldown to prevent spam
        throw new BadRequestException('Please wait before requesting a new code.');
      }

      // Optionally delete expired or reused code
      await this.verificationRepo.delete({ email: dto.email });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const record = this.verificationRepo.create({
      email: dto.email,
      code,
      createdAt: new Date(),
    });

    await this.verificationRepo.save(record);

    await this.mailerService.sendMail({
      to: dto.email,
      subject: 'Verify Your Email',
      html: `<p>Your verification code is <strong>${code}</strong></p>`,
    });

    return { message: 'Verification code sent.' };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const record = await this.verificationRepo.findOne({ where: { email: dto.email } });

    if (!record || record.code !== dto.code) {
      throw new BadRequestException('Invalid verification code');
    }

    const codeAgeMs = Date.now() - new Date(record.createdAt).getTime();
    const expiryMs = 15 * 60 * 1000;

    if (codeAgeMs > expiryMs) {
      await this.verificationRepo.delete({ email: dto.email });
      throw new BadRequestException('Verification code expired');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (user && !user.emailVerified) {
      await this.usersService.update(user.id, { emailVerified: true });
    }

    await this.verificationRepo.delete({ email: dto.email });

    return { message: 'Email verified successfully' };
  }

  // في AuthService

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // لا نخبر المستخدم إن الإيميل غير موجود (أمان)
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // حذف أي طلب سابق
    await this.verificationRepo.delete({
      email: dto.email,
      type: VerificationType.PASSWORD_RESET,
    });

    // إنشاء توكن عشوائي
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hashedToken = await bcrypt.hash(token, 10);

    await this.verificationRepo.save(
      this.verificationRepo.create({
        email: dto.email,
        code: hashedToken,
        type: VerificationType.PASSWORD_RESET,
      })
    );

    // رابط إعادة التعيين (يُفضل استخدام frontend URL)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(dto.email)}`;

    await this.mailerService.sendMail({
      to: dto.email,
      subject: 'إعادة تعيين كلمة المرور',
      html: `
      <p>مرحباً ${user.username || ''},</p>
      <p>لقد طلبت إعادة تعيين كلمة المرور.</p>
      <p>اضغط على الرابط التالي لتغيير كلمة المرور (صلاحية الرابط 1 ساعة):</p>
      <p><a href="${resetLink}" style="color: blue;">إعادة تعيين كلمة المرور</a></p>
      <p>إذا لم تطلب هذا، تجاهل الرسالة.</p>
    `,
    });

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.verificationRepo.findOne({
      where: {
        email: decodeURIComponent(dto.token.split('&email=')[1]?.split('&')[0] || ''),
        type: VerificationType.PASSWORD_RESET,
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const tokenFromUrl = dto.token.split('&email=')[0];
    const isValidToken = await bcrypt.compare(tokenFromUrl, record.code);
    if (!isValidToken) {
      throw new BadRequestException('Invalid reset token');
    }

    const tokenAgeMs = Date.now() - new Date(record.createdAt).getTime();
    const expiryMs = 60 * 60 * 1000; // 1 ساعة
    if (tokenAgeMs > expiryMs) {
      await this.verificationRepo.delete({ id: record.id });
      throw new BadRequestException('Reset token has expired');
    }

    const user = await this.usersService.findByEmail(record.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.update(user.id, { password: hashedPassword });

    // حذف التوكن بعد الاستخدام
    await this.verificationRepo.delete({ id: record.id });

    return { message: 'Password reset successfully' };
  }

  async handleSocialUser(profile: FacebookProfile | GoogleProfile, provider: string) {
    let user;

    if (provider === 'google') {
      user = await this.usersService.findByGoogleId(profile.id);
    } else if (provider === 'facebook') {
      user = await this.usersService.findByFacebookId(profile.id);
    }

    if (!user) {
      const userByEmail = await this.usersService.findByEmail(profile.email);

      if (userByEmail) {
        if (
          (provider === 'google' && userByEmail.googleId && userByEmail.googleId !== profile.id) ||
          (provider === 'facebook' && userByEmail.facebookId && userByEmail.facebookId !== profile.id)
        ) {
          throw new UnauthorizedException('This social account is already linked to another user.');
        }

        if (provider === 'google') {
          userByEmail.googleId = profile.id;
        } else if (provider === 'facebook') {
          userByEmail.facebookId = profile.id;
        }

        user = await this.usersService.save(userByEmail);
      } else {
        user = await this.usersService.createSocialUser(
          profile.email,
          profile.name || profile.email.split('@')[0],
          provider,
          profile.id
        );

        await this.cartService.createCartForUser(user);
      }
    }

    return this.generateJwtToken(user);
  }

  generateJwtToken(user: User) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username
    };
    return this.jwtService.sign(payload);
  }
}