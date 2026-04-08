import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../../shared/database/base.repository';
import { Company, CompanyDocument } from '../../entities/company.entity';
import { PaginationQuery } from '../../../../common/interfaces/request.interface';
import { PaginationResult } from '../../../../common/utils/api-features.util';

@Injectable()
export class CompaniesRepository extends BaseRepository<CompanyDocument> {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {
    super(companyModel);
  }

  async findByName(name: string): Promise<CompanyDocument | null> {
    return this.findOne({ name });
  }

  async findByEmail(email: string): Promise<CompanyDocument | null> {
    return this.findOne({ email });
  }

  async findByNameExcludingId(
    name: string,
    excludeId: string,
  ): Promise<CompanyDocument | null> {
    return this.companyModel.findOne({ name, _id: { $ne: excludeId } }).exec();
  }

  async findByEmailExcludingId(
    email: string,
    excludeId: string,
  ): Promise<CompanyDocument | null> {
    return this.companyModel.findOne({ email, _id: { $ne: excludeId } }).exec();
  }

  async findAllWithPagination(
    query: PaginationQuery,
    options?: { populate?: string[] },
  ): Promise<{
    results: number;
    data: CompanyDocument[];
    paginationResult: PaginationResult;
  }> {
    return this.findWithPagination({}, query, 'company', options);
  }

  async toggleActive(
    id: string,
    active: boolean,
  ): Promise<CompanyDocument | null> {
    return this.update(id, { active });
  }
}
