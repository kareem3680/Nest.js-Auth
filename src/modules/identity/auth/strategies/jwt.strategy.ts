import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../../users/repository/users.repository';
import { User } from '../../entities/user.entity';
import { Types } from 'mongoose';

interface JwtPayload {
  userId: string;
  companyId?: string;
  role: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersRepository: UsersRepository,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (!payload?.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.usersRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.active) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    if (user.changedPasswordAt) {
      const changedTime = Math.floor(user.changedPasswordAt.getTime() / 1000);
      if (changedTime > payload.iat) {
        throw new UnauthorizedException(
          'Password changed recently. Please login again.',
        );
      }
    }

    if (payload.companyId) {
      user.companyId = new Types.ObjectId(payload.companyId);
    }

    return user;
  }
}
