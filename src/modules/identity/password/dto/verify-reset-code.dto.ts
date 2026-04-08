import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyResetCodeDto {
  @IsString()
  @IsNotEmpty()
  resetCode: string;
}
