import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetUserDto {
  @IsMongoId()
  @IsNotEmpty()
  id!: string;
}
