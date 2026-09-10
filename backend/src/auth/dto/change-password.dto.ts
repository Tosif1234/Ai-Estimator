import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'New password must be at least 8 characters long',
  })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d|.*[!@#$%^&*(),.?":{}|<>])/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, and at least one number or special character',
  })
  newPassword: string;
}
