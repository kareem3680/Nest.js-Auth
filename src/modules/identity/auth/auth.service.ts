import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UsersRepository } from '../users/repository/users.repository';
import { CompaniesRepository } from '../companies/repository/companies.repository';
import { EmailService } from '../../../shared/email/email.service';
import { LoggerService } from '../../../common/utils/logger.util';
import { TokenUtil } from '../../../common/utils/token.util';
import { SanitizeUtil } from '../../../common/utils/sanitize.util';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../entities/user.entity';

// Extended interface for User document with Mongoose methods
interface UserDocument extends User {
  _id: Types.ObjectId;
  password: string;
  refreshToken: string;
  refreshTokenExpires: Date;

  compareRefreshToken?(token: string): Promise<boolean>;
  toObject?(): Record<string, any>;
}

// Interface for token payload
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  [key: string]: any;
}

@Injectable()
export class AuthService {
  private readonly logger = new LoggerService('auth');
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly emailService: EmailService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { passwordConfirmation, ...userData } = signUpDto;

    // Check password confirmation
    if (userData.password !== passwordConfirmation) {
      throw new BadRequestException(
        'Password confirmation does not match password',
      );
    }

    // Check if user exists
    const existingUser = await this.usersRepository.findByEmail(userData.email);
    if (existingUser) {
      this.logger.error('Registration failed - email already exists', {
        email: userData.email,
      });
      throw new BadRequestException('Email already in use');
    }

    // Create user
    const user = (await this.usersRepository.create(
      userData,
    )) as unknown as UserDocument;

    // Create tokens
    const tokenPayload: TokenPayload = this.createTokenPayload(user);
    const accessToken = TokenUtil.createAccessToken(tokenPayload);
    const { token: refreshToken, hashed } =
      await TokenUtil.createRefreshToken(tokenPayload);

    // Update user with refresh token
    await this.usersRepository.updateRefreshToken(
      user._id.toString(),
      hashed,
      this.getRefreshTokenExpiryDate(),
    );

    // Send welcome email (non-blocking)
    this.sendWelcomeEmail(user.email).catch((error: Error) => {
      this.logger.error('Failed to send welcome email', {
        email: user.email,
        error: error.message,
      });
    });

    this.logger.info('User registered successfully', {
      email: user.email,
      userId: user._id.toString(),
    });

    return {
      user: this.mapperUserData(user),
      accessToken,
      refreshToken,
    };
  }

  async logIn(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with password
    const user = (await this.usersRepository.findByEmailWithPassword(
      email,
    )) as unknown as UserDocument;

    if (!user) {
      this.logger.error('Login failed - user not found', { email });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.active) {
      this.logger.error('Login failed - account deactivated', { email });
      throw new ForbiddenException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.error('Login failed - incorrect password', { email });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create tokens
    const tokenPayload: TokenPayload = this.createTokenPayload(user);
    const accessToken = TokenUtil.createAccessToken(tokenPayload);
    const { token: refreshToken, hashed } =
      await TokenUtil.createRefreshToken(tokenPayload);

    // Update user with refresh token
    await this.usersRepository.updateRefreshToken(
      user._id.toString(),
      hashed,
      this.getRefreshTokenExpiryDate(),
    );

    this.logger.info('User logged in successfully', {
      email,
      userId: user._id.toString(),
    });

    return {
      user: this.mapperUserData(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Refresh token required');
    }

    let decoded: TokenPayload;
    try {
      decoded = TokenUtil.verifyRefreshToken(token) as TokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = (await this.usersRepository.findByIdWithRefreshToken(
      decoded.userId,
    )) as unknown as UserDocument;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has compareRefreshToken method
    if (!user.compareRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await user.compareRefreshToken(token);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenPayload: TokenPayload = this.createTokenPayload(user);
    const accessToken = TokenUtil.createAccessToken(tokenPayload);

    this.logger.info('Token refreshed successfully', {
      userId: user._id.toString(),
    });

    return { accessToken };
  }

  async logout(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = (await this.usersRepository.findById(
      userId,
    )) as unknown as UserDocument;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersRepository.updateRefreshToken(userId, null);

    this.logger.info('User logged out successfully', {
      userId,
      email: user.email,
    });

    return { message: 'Logged out successfully' };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = (await this.usersRepository.findByEmailWithPassword(
      email,
    )) as unknown as UserDocument;

    if (!user || !user.active) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return this.mapperUserData(user);
  }

  private createTokenPayload(user: UserDocument): TokenPayload {
    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }
  private mapperUserData(user: UserDocument): Record<string, any> {
    const userObject = user.toObject ? user.toObject() : user;

    // Transform the data to match expected types
    const sanitizedUser = {
      ...userObject,
      _id: user._id.toString(),
      // Convert jobId to string if it's a number
    };

    return SanitizeUtil.sanitizeUser(sanitizedUser);
  }
  private getRefreshTokenExpiryDate(): Date {
    return new Date(
      Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    await this.emailService.sendEmail({
      email,
      subject: 'Welcome to Auth Back-End API 🚀',
      message:
        'Your account has been successfully created!\nThank you for joining us.',
    });
  }
}
