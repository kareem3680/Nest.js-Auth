import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(5)
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number',
  })
  @IsNotEmpty()
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPasswordConfirm!: string;
}
