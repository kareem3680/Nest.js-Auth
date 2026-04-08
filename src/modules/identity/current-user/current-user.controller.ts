import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CurrentUserService } from './current-user.service';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { UserMapper } from '../users/mappers/user.mapper';

import type { RequestWithUser } from '../../../common/interfaces/request.interface';
import { UserDocument } from '../entities/user.entity';

@Controller('current-user')
@UseGuards(JwtAuthGuard)
@UseInterceptors(
  TransformInterceptor.forMapper((user: UserDocument) =>
    UserMapper.toDto(user),
  ),
)
export class CurrentUserController {
  constructor(private readonly currentUserService: CurrentUserService) {}

  @Get('getMyData')
  async getMyData(@Request() req: RequestWithUser) {
    const user = await this.currentUserService.getMyData(req.user._id);
    return { data: user, message: 'User data retrieved successfully' };
  }

  @Patch('updateMyData')
  async updateMyData(
    @Request() req: RequestWithUser,
    @Body() updateCurrentUserDto: UpdateCurrentUserDto,
  ) {
    const updatedUser = await this.currentUserService.updateMyData(
      req.user._id,
      updateCurrentUserDto,
    );
    return { data: updatedUser, message: 'User data updated successfully' };
  }
}
