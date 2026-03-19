import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';

import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { CompanyMapper } from './mappers/company.mapper';

import type { RequestWithUser } from '../../../common/interfaces/request.interface';
import { CompanyDocument } from '../entities/company.entity';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(
  TransformInterceptor.forMapper((company: CompanyDocument) =>
    CompanyMapper.toDto(company),
  ),
)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles('super-admin')
  async createCompany(
    @Request() req: RequestWithUser,
    @Body() dto: CreateCompanyDto,
  ) {
    const company = await this.companiesService.createCompany(
      dto,
      String(req.user._id),
    );
    return { data: company, message: 'Company created successfully' };
  }

  @Get()
  @Roles('super-admin')
  async getCompanies(
    @Request() req: RequestWithUser,
    @Query() query: PaginationDto,
  ) {
    const companies = await this.companiesService.getCompanies(req, query);
    return { data: companies, message: 'Companies fetched successfully' };
  }

  @Get(':id')
  @Roles('super-admin')
  async getCompany(@Param('id') id: string) {
    const company = await this.companiesService.getCompany(id);
    return { data: company, message: 'Company retrieved successfully' };
  }

  @Patch(':id')
  @Roles('super-admin')
  async updateCompany(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Request() req: RequestWithUser,
  ) {
    const updatedCompany = await this.companiesService.updateCompany(
      id,
      dto,
      String(req.user._id),
    );
    return { data: updatedCompany, message: 'Company updated successfully' };
  }

  @Patch('deactivate/:id')
  @Roles('super-admin')
  async deactivateCompany(@Param('id') id: string) {
    await this.companiesService.deactivateCompany(id);
    return { message: 'Company deactivated successfully' };
  }

  @Patch('activate/:id')
  @Roles('super-admin')
  async activateCompany(@Param('id') id: string) {
    await this.companiesService.activateCompany(id);
    return { message: 'Company activated successfully' };
  }
}
