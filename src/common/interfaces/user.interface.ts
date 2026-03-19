import { Types } from 'mongoose';

export interface IUser {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  changedPasswordAt?: Date;
  passwordResetCode?: string;
  passwordResetCodeExpiresAt?: Date;
  passwordResetCodeVerified?: boolean;
  lastResetCodeSentAt?: Date;
  resetCodeRequests?: Date[];
  active: boolean;
  role: 'super-admin' | 'admin' | 'employee' | 'guest';
  position?: string;
  jobId?: number;
  hireDate?: Date;
  companyId?: Types.ObjectId;
  refreshToken?: string;
  refreshTokenExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserSanitized {
  id: string;
  name: string;
  active: boolean;
  email: string;
  phone?: string;
  role: string;
  hireDate?: Date;
  position?: string;
  jobId?: number;
  profileImage?: any;
}
