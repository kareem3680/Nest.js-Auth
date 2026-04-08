import { CompanyResponseDto } from '../dto/company-response.dto';
import { CompanyDocument } from '../../entities/company.entity';
import { Types, Document } from 'mongoose';

type CompanyLean = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
  createdBy?: Types.ObjectId | { name: string };
  updatedBy?: Types.ObjectId | { name: string };
  createdAt?: Date;
  updatedAt?: Date;
};

function isMongooseDocument(value: unknown): value is Document {
  return value instanceof Document;
}

export class CompanyMapper {
  static toDto(
    company: CompanyDocument | CompanyLean,
    usersCount = 0,
  ): CompanyResponseDto {
    const obj: CompanyLean = isMongooseDocument(company)
      ? company.toObject<CompanyLean>()
      : company;

    return {
      id: obj._id.toString(),
      name: obj.name,
      email: obj.email,
      phone: obj.phone,
      active: obj.active,

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

      usersCount,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }
}
