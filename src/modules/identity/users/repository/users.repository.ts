import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';

import { BaseRepository } from '../../../../shared/database/base.repository';
import { User, UserDocument } from '../../entities/user.entity';
import { PaginationQuery } from '../../../../common/interfaces/request.interface';

type FilterQuery<T> = {
  [P in keyof T]?: any;
} & {
  $or?: any[];
  $and?: any[];
  $nor?: any[];
  [key: string]: any;
};

@Injectable()
export class UsersRepository extends BaseRepository<UserDocument> {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super(userModel);
  }

  async findByEmail(
    email: string,
    companyId?: string,
  ): Promise<UserDocument | null> {
    const filter: FilterQuery<UserDocument> = { email };

    if (companyId) {
      filter.companyId = new Types.ObjectId(companyId);
    }

    return this.findOne(filter);
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(new Types.ObjectId(id))
      .select('+refreshToken +refreshTokenExpires')
      .exec();
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
    expires?: Date,
  ): Promise<void> {
    const update: UpdateQuery<UserDocument> = { refreshToken };

    if (expires) {
      update.refreshTokenExpires = expires;
    }

    await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(id), update)
      .exec();
  }

  async findUsersByCompany(
    companyId: string,
    query: PaginationQuery,
    options?: { populate?: string[] },
  ) {
    const filter: FilterQuery<UserDocument> = {
      companyId: new Types.ObjectId(companyId),
    };

    return this.findWithPagination(filter, query, 'user', options);
  }

  async countUsersByCompany(companyId: string): Promise<number> {
    return this.countDocuments({
      companyId: new Types.ObjectId(companyId),
    });
  }

  async countByRole(companyId: string, role: string): Promise<number> {
    return this.countDocuments({
      companyId: new Types.ObjectId(companyId),
      role,
    });
  }

  async updateUserRole(
    id: string,
    role: string,
    companyId?: string,
  ): Promise<UserDocument | null> {
    const filter: FilterQuery<UserDocument> = {
      _id: new Types.ObjectId(id),
    };

    if (companyId) {
      filter.companyId = new Types.ObjectId(companyId);
    }

    return this.updateOne(filter, { role });
  }

  async toggleUserActive(
    id: string,
    active: boolean,
    companyId?: string,
  ): Promise<UserDocument | null> {
    const filter: FilterQuery<UserDocument> = {
      _id: new Types.ObjectId(id),
    };

    if (companyId) {
      filter.companyId = new Types.ObjectId(companyId);
    }

    return this.updateOne(filter, { active });
  }

  async setPasswordResetCode(
    id: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        {
          passwordResetCode: codeHash,
          passwordResetCodeExpiresAt: expiresAt,
          passwordResetCodeVerified: false,
          lastResetCodeSentAt: new Date(),
          $push: { resetCodeRequests: new Date() },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async findByResetCode(codeHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetCode: codeHash,
        passwordResetCodeExpiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async clearResetCode(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        {
          $unset: {
            passwordResetCode: 1,
            passwordResetCodeExpiresAt: 1,
            passwordResetCodeVerified: 1,
            lastResetCodeSentAt: 1,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async getNextJobId(): Promise<number> {
    const lastUser = await this.userModel.findOne().sort('-jobId').exec();

    return (lastUser?.jobId || 99) + 1;
  }

  async updateMany(
    filter: FilterQuery<UserDocument>,
    update: UpdateQuery<UserDocument>,
  ) {
    return this.userModel.updateMany(filter, update).exec();
  }
}
