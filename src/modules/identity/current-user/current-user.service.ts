import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersRepository } from '../users/repository/users.repository';
import { LoggerService } from '../../../common/utils/logger.util';
import { UserMapper } from '../users/mappers/user.mapper';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

@Injectable()
export class CurrentUserService {
  private readonly logger = new LoggerService('current-user');

  constructor(private usersRepository: UsersRepository) {}

  async getMyData(userId: Types.ObjectId) {
    const userIdString = userId.toString();
    const user = await this.usersRepository.findById(userIdString);

    if (!user) {
      this.logger.error('User not found', { userId: userIdString });
      throw new NotFoundException(`No user found with ID: ${userIdString}`);
    }

    this.logger.info('Fetched user data', { userId: userIdString });
    return UserMapper.toDto(user);
  }

  async updateMyData(userId: Types.ObjectId, updateData: UpdateCurrentUserDto) {
    const { name, email, phone } = updateData;
    const userIdString = userId.toString();

    // First, check if user exists
    const existingUser = await this.usersRepository.findById(userIdString);
    if (!existingUser) {
      this.logger.error('User not found', { userId: userIdString });
      throw new NotFoundException(`No user found with ID: ${userIdString}`);
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailUser = await this.usersRepository.findByEmail(email);

      if (emailUser && emailUser._id.toString() !== userIdString) {
        this.logger.error('Email already exists', { email });
        throw new BadRequestException('This email is already in use.');
      }
    }

    // Update user fields
    if (name !== undefined) existingUser.name = name;
    if (phone !== undefined) existingUser.phone = phone;
    if (email !== undefined) existingUser.email = email;

    // Save the updated user
    const savedUser = await existingUser.save();

    this.logger.info('Updated user data', { userId: userIdString });
    return UserMapper.toDto(savedUser);
  }
}
