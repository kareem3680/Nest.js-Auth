import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  Matches,
  IsNotEmpty,
  IsMongoId,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsIn(['admin', 'employee', 'guest'])
  @IsNotEmpty()
  role!: string;

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

  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
