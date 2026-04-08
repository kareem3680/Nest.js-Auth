import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../../entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
  companyId?: string;
}

@Injectable()
export class CompanyContextGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if company context is required
    const requiresCompany = this.reflector.getAllAndOverride<boolean>(
      'requiresCompany',
      [context.getHandler(), context.getClass()],
    );

    // If super-admin, they can provide companyId in body/query
    if (user.role === 'super-admin') {
      const body = request.body as { companyId?: string };
      const query = request.query as { companyId?: string };

      const companyId = body.companyId || query.companyId;

      if (requiresCompany && !companyId) {
        throw new ForbiddenException('Company ID is required for super-admin');
      }

      request.companyId = companyId;
      return true;
    }
    // For non super-admin, companyId must exist in user
    if (!user.companyId) {
      throw new ForbiddenException('Company context is missing');
    }

    request.companyId = user.companyId.toString();
    return true;
  }
}
