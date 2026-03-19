import { Module } from '@nestjs/common';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { UsersModule } from '../users/users.module';
import { EmailService } from '../../../shared/email/email.service';

@Module({
  imports: [UsersModule],
  controllers: [PasswordController],
  providers: [PasswordService, EmailService],
  exports: [PasswordService],
})
export class PasswordModule {}
