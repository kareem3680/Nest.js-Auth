import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesRepository } from './repository/companies.repository';
import { Company, CompanySchema } from '../entities/company.entity';
import { UsersModule } from '../users/users.module';
import { CacheService } from '../../../shared/cache/cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
    forwardRef(() => UsersModule),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository, CacheService],
  exports: [CompaniesService, CompaniesRepository],
})
export class CompaniesModule {}
