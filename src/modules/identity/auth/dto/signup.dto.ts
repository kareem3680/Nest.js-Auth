import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class SignUpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(5)
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number',
  })
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation!: string;

  @IsOptional()
  @IsString()
  position?: string;
}
