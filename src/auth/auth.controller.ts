import { Controller, Post, Body, Res, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/create-auth.dto';
import { Public } from './decorators/public.decorator';
import { Response } from 'express';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

/**
 * The catalogue has no customer accounts, so auth exists only to let staff
 * reach the admin dashboard. Registration, email verification, password reset
 * and social login were removed along with the shop.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

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
}
