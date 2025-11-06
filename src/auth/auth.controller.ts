import { Controller, Post, Body, Res, Req, Get, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LoginDto } from './dto/create-auth.dto';
import { RequestVerificationDto, VerifyCodeDto, ForgotPasswordDto, ResetPasswordDto } from './dto/verification.dto';
import { Public } from './decorators/public.decorator';
import { Response } from 'express';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) { }

  @Post('register')
  @Public()
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(dto);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return { user, message: 'Logged in successfully' };
  }

  @Post('request-verification')
  @Public()
  requestVerification(@Body() dto: RequestVerificationDto) {
    return this.authService.requestEmailVerification(dto);
  }

  @Post('verify-code')
  @Public()
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @Public()
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return {
      id: req.user?.id,
      email: req.user?.email,
      username: req.user?.username,
      role: req.user?.role,
    };
  }

  @Get('facebook')
  @Public()
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @Public()
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.handleSocialCallback(req, res);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.handleSocialCallback(req, res);
  }

  private handleSocialCallback(
    @Req() req: Request,
    @Res() res: Response
  ) {
    // @ts-ignore 
    const token = req.user.token;

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false,   //process.env.NODE_ENV === 'production'
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    // Redirect to frontend with token in URL for mobile apps
    res.redirect(`${process.env.FRONTEND_URL}/sign-in?token=${token}`);
  }
}
