import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CompaniesRepository } from './repository/companies.repository';
import { UsersRepository } from '../users/repository/users.repository';
import { CacheService } from '../../../shared/cache/cache.service';
import { LoggerService } from '../../../common/utils/logger.util';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import type { RequestWithUser } from '../../../common/interfaces/request.interface';
import { CompanyMapper } from './mappers/company.mapper';

@Injectable()
export class CompaniesService {
  private readonly logger = new LoggerService('company');

  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly cacheService: CacheService,
  ) {}

  async createCompany(dto: CreateCompanyDto, userId: string) {
    const existingName = await this.companiesRepository.findByName(dto.name);
    if (existingName) {
      throw new ConflictException(
        `Company with name "${dto.name}" already exists`,
      );
    }

    if (dto.email) {
      const existingEmail = await this.companiesRepository.findByEmail(
        dto.email,
      );
      if (existingEmail) {
        throw new ConflictException(
          `Company with email "${dto.email}" already exists`,
        );
      }
    }

    const company = await this.companiesRepository.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });

    await company.populate([
      { path: 'createdBy', select: 'name' },
      { path: 'updatedBy', select: 'name' },
    ]);

    await this.cacheService.del('companies:*');

    return CompanyMapper.toDto(company);
  }

  async getCompanies(req: RequestWithUser, query: PaginationDto) {
    const cacheKey = `all:${JSON.stringify(query)}`;

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const result = await this.companiesRepository.findAllWithPagination(
          query,
          { populate: ['createdBy', 'updatedBy'] },
        );

        const companyIds = result.data.map((c) => c._id);

        const usersAggregation = await this.usersRepository.aggregate<{
          _id: Types.ObjectId;
          usersCount: number;
        }>([
          { $match: { companyId: { $in: companyIds } } },
          { $group: { _id: '$companyId', usersCount: { $sum: 1 } } },
        ]);

        const usersMap = new Map(
          usersAggregation.map((item) => [
            item._id.toString(),
            item.usersCount,
          ]),
        );

        const data = result.data.map((company) => ({
          ...CompanyMapper.toDto(company),
          usersCount: usersMap.get(company._id.toString()) || 0,
        }));

        return {
          data,
          results: result.results,
          paginationResult: result.paginationResult,
        };
      },
      3600,
      'companies',
    );
  }

  async getCompany(id: string) {
    return this.cacheService.wrap(
      `id:${id}`,
      async () => {
        const company = await this.companiesRepository.findOne(
          { _id: new Types.ObjectId(id) },
          { populate: ['createdBy', 'updatedBy'] },
        );

        if (!company) throw new NotFoundException('Company not found');

        const usersCount = await this.usersRepository.countDocuments({
          companyId: company._id,
        });

        const companyDto = CompanyMapper.toDto(company);

        return {
          ...companyDto,
          usersCount,
        };
      },
      3600,
      'companies',
    );
  }

  async updateCompany(id: string, dto: UpdateCompanyDto, userId: string) {
    const company = await this.companiesRepository.findOne({
      _id: new Types.ObjectId(id),
    });

    if (!company) throw new NotFoundException('Company not found');

    if (dto.name && dto.name !== company.name) {
      const exists = await this.companiesRepository.findByNameExcludingId(
        dto.name,
        id,
      );
      if (exists) {
        throw new ConflictException(
          `Company with name "${dto.name}" already exists`,
        );
      }
      company.name = dto.name;
    }

    if (dto.email && dto.email !== company.email) {
      const exists = await this.companiesRepository.findByEmailExcludingId(
        dto.email,
        id,
      );
      if (exists) {
        throw new ConflictException(
          `Company with email "${dto.email}" already exists`,
        );
      }
      company.email = dto.email;
    }

    if (dto.phone && dto.phone !== company.phone) {
      company.phone = dto.phone;
    }

    company.updatedBy = new Types.ObjectId(userId);

    await company.save();
    await this.cacheService.del('companies:*');

    await company.populate([
      { path: 'createdBy', select: 'name' },
      { path: 'updatedBy', select: 'name' },
    ]);

    return CompanyMapper.toDto(company);
  }

  async deactivateCompany(id: string) {
    const company = await this.companiesRepository.findOne({
      _id: new Types.ObjectId(id),
    });

    if (!company) throw new NotFoundException('Company not found');
    if (!company.active)
      throw new BadRequestException('Company already inactive');

    company.active = false;
    await company.save();

    await this.usersRepository.updateMany(
      { companyId: company._id },
      { active: false },
    );

    await this.cacheService.del('companies:*');

    return { message: 'Company deactivated successfully' };
  }

  async activateCompany(id: string) {
    const company = await this.companiesRepository.findOne({
      _id: new Types.ObjectId(id),
    });

    if (!company) throw new NotFoundException('Company not found');
    if (company.active) throw new BadRequestException('Company already active');

    company.active = true;
    await company.save();

    await this.usersRepository.updateMany(
      { companyId: company._id },
      { active: true },
    );

    await this.cacheService.del('companies:*');

    return { message: 'Company activated successfully' };
  }
}
