export class CompanyResponseDto {
  id!: string;
  name!: string;
  email!: string;
  phone?: string;
  active!: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  usersCount?: number;
}
