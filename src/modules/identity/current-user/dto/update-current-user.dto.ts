import {
  IsOptional,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Helper functions with proper typing
const trimString = ({ value }: { value: unknown }): unknown => {
  return typeof value === 'string' ? value.trim() : value;
};

const normalizeEmail = ({ value }: { value: unknown }): unknown => {
  return typeof value === 'string' ? value.toLowerCase().trim() : value;
};

export class UpdateCurrentUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(32, { message: 'Name must be at most 32 characters' })
  @Transform(trimString)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(normalizeEmail)
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  phone?: string;
}
