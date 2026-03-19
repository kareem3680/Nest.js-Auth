import { IsString, IsOptional, IsIn, IsMongoId } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'employee', 'guest'])
  role?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsMongoId()
  companyId?: string;
}
