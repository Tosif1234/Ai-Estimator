import { IsJWT, IsNotEmpty } from 'class-validator';

export class LogoutDto {
  @IsNotEmpty()
  @IsJWT()
  refreshToken: string;
}