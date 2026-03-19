import { Request } from 'express';
import { IUser } from './user.interface';
import { Types } from 'mongoose';

export interface RequestWithUser extends Request {
  user: IUser & { _id: Types.ObjectId };
  companyId?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  fields?: string;
  keyword?: string;
  from?: string;
  to?: string;
  [key: string]: unknown;
}
