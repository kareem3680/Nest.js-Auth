export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  phone?: string;
  active!: boolean;
  role!: string;
  hireDate?: Date;
  position?: string;
  job?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
