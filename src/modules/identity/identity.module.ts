import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { PasswordModule } from './password/password.module';
import { User, UserSchema } from './entities/user.entity';
import { Company, CompanySchema } from './entities/company.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    AuthModule,
    UsersModule,
    CompaniesModule,
    PasswordModule,
  ],
  exports: [AuthModule, UsersModule, CompaniesModule, PasswordModule],
})
export class IdentityModule {}
