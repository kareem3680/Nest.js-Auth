import { Module } from '@nestjs/common';
import { CurrentUserController } from './current-user.controller';
import { CurrentUserService } from './current-user.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [CurrentUserController],
  providers: [CurrentUserService],
  exports: [CurrentUserService],
})
export class CurrentUserModule {}
