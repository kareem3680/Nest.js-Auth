import { Types } from 'mongoose';
import { UserDocument } from '../../entities/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';

type UserLean = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
  role: string;
  hireDate?: Date;
  position?: string;
  jobId?: Types.ObjectId | { title: string };
  createdBy?: Types.ObjectId | { name: string };
  updatedBy?: Types.ObjectId | { name: string };
  createdAt?: Date;
  updatedAt?: Date;
};

export class UserMapper {
  static toDto(user: UserDocument): UserResponseDto {
    const obj = user.toObject<UserLean>();

    return {
      id: obj._id.toString(),
      name: obj.name,
      email: obj.email,
      phone: obj.phone,
      active: obj.active,
      role: obj.role,
      hireDate: obj.hireDate,
      position: obj.position,

      job:
        obj.jobId && typeof obj.jobId === 'object' && 'title' in obj.jobId
          ? obj.jobId.title
          : obj.jobId?.toString(),

      createdBy:
        obj.createdBy &&
        typeof obj.createdBy === 'object' &&
        'name' in obj.createdBy
          ? obj.createdBy.name
          : obj.createdBy?.toString(),

      updatedBy:
        obj.updatedBy &&
        typeof obj.updatedBy === 'object' &&
        'name' in obj.updatedBy
          ? obj.updatedBy.name
          : obj.updatedBy?.toString(),

      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}
