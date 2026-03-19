import { Injectable, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { IUser } from '../../common/interfaces/user.interface';

interface ICompanyFilter {
  companyId?: Types.ObjectId | string;
  [key: string]: any;
}

@Injectable()
export class TenantService {
  validateCompanyContext(user: IUser, companyId?: string): void {
    if (user.role !== 'super-admin' && !companyId && !user.companyId) {
      throw new ForbiddenException('Company context is missing');
    }
  }

  getCompanyId(user: IUser, requestCompanyId?: string): string | null {
    if (user.role === 'super-admin') {
      return requestCompanyId || null;
    }
    return user.companyId?.toString() || null;
  }

  applyCompanyFilter<T extends ICompanyFilter>(
    user: IUser,
    filter: T,
    companyId?: string,
  ): T {
    const companyIdToUse =
      user.role !== 'super-admin' ? user.companyId : (companyId ?? undefined);

    if (companyIdToUse) {
      filter.companyId = companyIdToUse;
    }

    return filter;
  }

  createCompanyFilter(user: IUser, companyId?: string): ICompanyFilter {
    const filter: ICompanyFilter = {};

    const companyIdToUse =
      user.role !== 'super-admin' ? user.companyId : (companyId ?? undefined);

    if (companyIdToUse) {
      filter.companyId = companyIdToUse;
    }

    return filter;
  }
}
