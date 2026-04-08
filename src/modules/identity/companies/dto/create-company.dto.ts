import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
