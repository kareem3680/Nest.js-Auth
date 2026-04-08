import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from '../users/repository/users.repository';
import { EmailService } from '../../../shared/email/email.service';
import { LoggerService } from '../../../common/utils/logger.util';
import { TokenUtil, TokenPayload } from '../../../common/utils/token.util';
import { UserMapper } from '../users/mappers/user.mapper';
import { UserDocument } from '../entities/user.entity';

@Injectable()
export class PasswordService {
  private readonly logger = new LoggerService('forget-password');

  constructor(
    private usersRepository: UsersRepository,
    private emailService: EmailService,
  ) {}

  private mapUserToTokenPayload(user: UserDocument): TokenPayload {
    return {
      userId: user._id,
      companyId: user.companyId,
      role: user.role,
    };
  }

  // Helper function to mask email in logs
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    const maskedLocal = local[0] + '***' + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  async sendResetCode(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      this.logger.error('User not found', { email: this.maskEmail(email) });
      throw new NotFoundException(`No user found with this email: ${email}`);
    }

    const now = Date.now();

    // Check if user has recently requested a code
    if (
      user.lastResetCodeSentAt &&
      now - user.lastResetCodeSentAt.getTime() < 2 * 60 * 1000
    ) {
      const wait = Math.ceil(
        (2 * 60 * 1000 - (now - user.lastResetCodeSentAt.getTime())) / 1000,
      );
      throw new ForbiddenException(
        `Please wait ${wait} seconds before requesting a new code`,
      );
    }

    // Check rate limit (max 5 requests per hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentRequests = (user.resetCodeRequests || []).filter(
      (t: Date) => t.getTime() > oneHourAgo,
    );

    if (recentRequests.length >= 5) {
      throw new ForbiddenException(
        'You have reached the limit reset code requests, try again later',
      );
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash('sha256').update(resetCode).digest('hex');

    await this.usersRepository.setPasswordResetCode(
      user._id.toString(),
      hashed,
      new Date(now + 10 * 60 * 1000),
    );

    try {
      await this.emailService.sendEmail({
        email: user.email,
        subject: 'Reset your password',
        message: `Hello ${user.name}, your reset code is ${resetCode}. It expires in 10 minutes.`,
      });

      this.logger.info('Reset code sent successfully', {
        email: this.maskEmail(email),
      });
    } catch (error: unknown) {
      await this.usersRepository.clearResetCode(user._id.toString());

      this.logger.error('Failed to send reset email', {
        email: this.maskEmail(email),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BadRequestException('Failed to send reset email');
    }
  }

  async resendResetCode(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      this.logger.error('User not found', { email: this.maskEmail(email) });
      throw new NotFoundException(`No user found with this email: ${email}`);
    }

    const now = Date.now();

    if (!user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
      throw new BadRequestException(
        "You haven't requested a reset code yet. Please request a code first.",
      );
    }

    const isFirstResend = !user.lastResendCodeAt;
    const isOldResend =
      user.lastResendCodeAt &&
      now - user.lastResendCodeAt.getTime() > 60 * 60 * 1000;

    const lastAnySend = Math.max(
      user.lastResetCodeSentAt?.getTime() || 0,
      user.lastResendCodeAt?.getTime() || 0,
    );

    const timeSinceLastSend = now - lastAnySend;

    if (!isFirstResend && !isOldResend && timeSinceLastSend < 2 * 60 * 1000) {
      const wait = Math.ceil((2 * 60 * 1000 - timeSinceLastSend) / 1000);
      throw new ForbiddenException(
        `Please wait ${wait} seconds before requesting another code`,
      );
    }

    const oneHourAgo = now - 60 * 60 * 1000;
    const recentRequests = (user.resetCodeRequests || []).filter(
      (t: Date) => t.getTime() > oneHourAgo,
    );

    if (recentRequests.length >= 5) {
      throw new ForbiddenException(
        'You have reached the limit reset code requests, try again later',
      );
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash('sha256').update(resetCode).digest('hex');

    await this.usersRepository.setPasswordResetCode(
      user._id.toString(),
      hashed,
      new Date(now + 10 * 60 * 1000),
    );

    user.lastResendCodeAt = new Date(now);
    await user.save();

    try {
      await this.emailService.sendEmail({
        email: user.email,
        subject: 'Reset your password (Resent Code)',
        message: `Hello ${user.name}, your new reset code is ${resetCode}. It expires in 10 minutes.`,
      });

      this.logger.info('Reset code resent successfully', {
        email: this.maskEmail(email),
        isFirstResend,
      });
    } catch (error: unknown) {
      await this.usersRepository.clearResetCode(user._id.toString());

      this.logger.error('Failed to resend reset email', {
        email: this.maskEmail(email),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BadRequestException('Failed to resend reset email');
    }
  }

  async verifyResetCode(code: string) {
    const hashed = crypto.createHash('sha256').update(code).digest('hex');

    const user = await this.usersRepository.findByResetCode(hashed);

    if (!user) {
      this.logger.error('Invalid or expired reset code');
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Check if code was already verified
    if (user.passwordResetCodeVerified) {
      this.logger.error('Reset code already used', {
        email: this.maskEmail(user.email),
      });
      throw new BadRequestException('Reset code has already been used');
    }

    user.passwordResetCodeVerified = true;
    await user.save();

    this.logger.info('Reset code verified successfully', {
      email: this.maskEmail(user.email),
    });
  }

  async resetPassword(email: string, newPassword: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      this.logger.error('User not found during password reset', {
        email: this.maskEmail(email),
      });
      throw new NotFoundException(`No user found with this email: ${email}`);
    }

    if (!user.passwordResetCodeVerified) {
      this.logger.error('Reset code not verified', {
        email: this.maskEmail(email),
      });
      throw new BadRequestException('Reset code is not verified');
    }

    // Check if code has expired (additional safety check)
    if (
      user.passwordResetCodeExpiresAt &&
      user.passwordResetCodeExpiresAt < new Date()
    ) {
      this.logger.error('Reset code expired before reset', {
        email: this.maskEmail(email),
      });
      throw new BadRequestException(
        'Reset code has expired. Please request a new one.',
      );
    }

    user.password = newPassword;
    user.changedPasswordAt = new Date();

    // Clear all reset code related fields
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresAt = undefined;
    user.passwordResetCodeVerified = undefined;

    const tokenPayload = TokenUtil.fromUser(user);
    const accessToken = TokenUtil.createAccessToken(tokenPayload);
    const { token: refreshToken, hashed } =
      await TokenUtil.createRefreshToken(tokenPayload);

    user.refreshToken = hashed;
    user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await user.save();

    this.logger.info('Password reset successful', {
      email: this.maskEmail(email),
    });

    return { accessToken, refreshToken };
  }

  async updateMyPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      this.logger.error('User not found', { userId });
      throw new BadRequestException(
        'Current or new password is invalid. Please check and try again.',
      );
    }

    const userWithPassword = await this.usersRepository.findByEmailWithPassword(
      user.email,
    );
    if (!userWithPassword) {
      this.logger.error('User not found with password', { userId });
      throw new BadRequestException(
        'Current or new password is invalid. Please check and try again.',
      );
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      userWithPassword.password,
    );
    if (!isMatch) {
      this.logger.error('Incorrect current password', { userId });
      throw new BadRequestException(
        'Current or new password is invalid. Please check and try again.',
      );
    }

    userWithPassword.password = newPassword;
    userWithPassword.changedPasswordAt = new Date();

    const tokenPayload = TokenUtil.fromUser(userWithPassword);
    const accessToken = TokenUtil.createAccessToken(tokenPayload);
    const { token: refreshToken, hashed } =
      await TokenUtil.createRefreshToken(tokenPayload);

    userWithPassword.refreshToken = hashed;
    userWithPassword.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );

    await userWithPassword.save();

    this.logger.info('Password updated successfully', { userId });

    return {
      user: UserMapper.toDto(userWithPassword),
      accessToken,
      refreshToken,
    };
  }
}
