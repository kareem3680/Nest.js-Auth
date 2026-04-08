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
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CompanyContextGuard } from '../auth/guards/company-context.guard';

import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { UserMapper } from './mappers/user.mapper';

import type { RequestWithUser } from '../../../common/interfaces/request.interface';
import { UserDocument } from '../entities/user.entity';

@Controller('adminDashboard')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyContextGuard)
@UseInterceptors(
  TransformInterceptor.forMapper((user: UserDocument) =>
    UserMapper.toDto(user),
  ),
)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private ensureCompanyId(companyId?: string): string {
    if (!companyId) {
      throw new ForbiddenException('Company context is required');
    }
    return companyId;
  }

  @Get()
  @Roles('super-admin', 'admin')
  async getUsers(
    @Request() req: RequestWithUser,
    @Query() query: PaginationDto,
  ) {
    const response = await this.usersService.getUsers(req, query);
    return response;
  }

  @Post()
  @Roles('super-admin', 'admin')
  async createUser(
    @Request() req: RequestWithUser,
    @Body() createUserDto: CreateUserDto,
  ) {
    const user = await this.usersService.createUser(req, createUserDto);
    return { data: user, message: 'User created successfully' };
  }

  @Get(':id')
  @Roles('admin')
  async getSpecificUser(
    @Request() req: RequestWithUser,
    @Param() params: GetUserDto,
  ) {
    const companyId = this.ensureCompanyId(req.companyId);
    const user = await this.usersService.getSpecificUser(params.id, companyId);
    return { data: user, message: 'User retrieved successfully' };
  }

  @Patch(':id')
  @Roles('admin')
  async updateUser(
    @Request() req: RequestWithUser,
    @Param() params: GetUserDto,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const companyId = this.ensureCompanyId(req.companyId);

    if (!updateUserDto.role) {
      throw new BadRequestException('Role is required');
    }

    const updatedUser = await this.usersService.updateUser(
      params.id,
      updateUserDto.role,
      companyId,
    );

    return { data: updatedUser, message: 'User role updated successfully' };
  }

  @Patch('deactivate/:id')
  @Roles('admin')
  async deactivateUser(
    @Request() req: RequestWithUser,
    @Param() params: GetUserDto,
  ) {
    const companyId = this.ensureCompanyId(req.companyId);
    await this.usersService.deactivateUser(params.id, companyId);
    return { message: 'User deactivated successfully' };
  }

  @Patch('activate/:id')
  @Roles('admin')
  async activateUser(
    @Request() req: RequestWithUser,
    @Param() params: GetUserDto,
  ) {
    const companyId = this.ensureCompanyId(req.companyId);
    await this.usersService.activateUser(params.id, companyId);
    return { message: 'User activated successfully' };
  }
}
