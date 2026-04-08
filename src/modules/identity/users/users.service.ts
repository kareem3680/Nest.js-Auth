import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Types } from 'mongoose';

import { UsersRepository } from './repository/users.repository';
import { CompaniesRepository } from '../companies/repository/companies.repository';
import { EmailService } from '../../../shared/email/email.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { LoggerService } from '../../../common/utils/logger.util';

import { UserMapper } from './mappers/user.mapper';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RequestWithUser } from '../../../common/interfaces/request.interface';

@Injectable()
export class UsersService {
  private readonly logger = new LoggerService('admin');

  constructor(
    private usersRepository: UsersRepository,
    private companiesRepository: CompaniesRepository,
    private emailService: EmailService,
    private cacheService: CacheService,
  ) {}

  private ensureCompanyId(companyId?: string): string {
    if (!companyId) {
      throw new ForbiddenException('Company context is required');
    }
    return companyId;
  }

  async createUser(req: RequestWithUser, createUserDto: CreateUserDto) {
    const {
      role,
      companyId: bodyCompanyId,
      passwordConfirmation,
      ...rest
    } = createUserDto;

    if (rest.password !== passwordConfirmation) {
      throw new BadRequestException(
        'Password confirmation does not match password',
      );
    }

    if (role === 'super-admin') {
      throw new ForbiddenException('You cannot assign super-admin role');
    }

    let companyIdToUse: string;

    if (req.user.role === 'super-admin') {
      if (!bodyCompanyId) {
        throw new BadRequestException('Company ID is required for super-admin');
      }
      companyIdToUse = bodyCompanyId;
    } else {
      companyIdToUse = this.ensureCompanyId(req.companyId);
    }

    const company = await this.companiesRepository.findById(companyIdToUse);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const existingUser = await this.usersRepository.findByEmail(
      rest.email,
      companyIdToUse,
    );

    if (existingUser) {
      throw new BadRequestException('Email already exists for this company');
    }

    const jobId = await this.usersRepository.getNextJobId();

    const newUser = await this.usersRepository.create({
      ...rest,
      role,
      companyId: new Types.ObjectId(companyIdToUse),
      jobId,
    });

    this.emailService
      .sendEmail({
        email: newUser.email,
        subject: 'Welcome 🚀',
        message: 'Your account has been created successfully',
      })
      .catch((err: unknown) =>
        this.logger.error('Email sending failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        }),
      );

    await this.cacheService.del('companies:*');

    this.logger.info('User created', {
      userId: newUser._id,
      companyId: companyIdToUse,
      createdBy: req.user._id,
    });

    return UserMapper.toDto(newUser);
  }

  async getUsers(req: RequestWithUser, query: PaginationDto) {
    const companyId = this.ensureCompanyId(req.companyId);

    const result = await this.usersRepository.findUsersByCompany(
      companyId,
      query,
    );

    const total = await this.usersRepository.countUsersByCompany(companyId);
    const admins = await this.usersRepository.countByRole(companyId, 'admin');
    const employees = await this.usersRepository.countByRole(
      companyId,
      'employee',
    );

    return {
      stats: { total, admins, employees },
      data: result.data.map((user) => UserMapper.toDto(user)),
      results: result.results,
      paginationResult: result.paginationResult,
    };
  }

  async getSpecificUser(id: string, companyId: string) {
    const user = await this.usersRepository.findOne({
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
    });

    if (!user) {
      throw new NotFoundException('User not found for this company');
    }

    return UserMapper.toDto(user);
  }

  async updateUser(id: string, role: string, companyId: string) {
    if (!role) {
      throw new BadRequestException('Role is required');
    }

    const user = await this.usersRepository.updateUserRole(id, role, companyId);

    if (!user) {
      throw new NotFoundException('User not found for this company');
    }

    return UserMapper.toDto(user);
  }

  async deactivateUser(id: string, companyId: string) {
    const user = await this.usersRepository.toggleUserActive(
      id,
      false,
      companyId,
    );

    if (!user) {
      throw new NotFoundException('User not found for this company');
    }
  }

  async activateUser(id: string, companyId: string) {
    const user = await this.usersRepository.toggleUserActive(
      id,
      true,
      companyId,
    );

    if (!user) {
      throw new NotFoundException('User not found for this company');
    }
  }
}
