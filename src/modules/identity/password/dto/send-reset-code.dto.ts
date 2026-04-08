import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendResetCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
