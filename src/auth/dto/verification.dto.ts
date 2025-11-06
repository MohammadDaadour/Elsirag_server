
import { IsEmail, IsString, IsNumber, IsNotEmpty, IsStrongPassword } from 'class-validator';

export class RequestVerificationDto {
  @IsEmail()
  email: string;
}

export class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;

  // @IsNumber()
  // userId: number;
}

export class ConfirmPasswordDto {
  @IsNotEmpty()
  @IsString()
  linkToken: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  newPassword: string;
}

