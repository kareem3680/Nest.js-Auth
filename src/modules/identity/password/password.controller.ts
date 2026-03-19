import {
  Controller,
  Post,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PasswordService } from './password.service';
import { SendResetCodeDto } from './dto/send-reset-code.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';
import type { RequestWithUser } from '../../../common/interfaces/request.interface';

@Controller()
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Public()
  @Post('forgetPassword/sendResetCode')
  @HttpCode(HttpStatus.OK)
  async sendResetCode(@Body() sendResetCodeDto: SendResetCodeDto) {
    await this.passwordService.sendResetCode(sendResetCodeDto.email);
    return {
      message: 'Reset code sent to your email',
    };
  }

  @Public()
  @Post('forgetPassword/resendResetCode')
  @HttpCode(HttpStatus.OK)
  async resendResetCode(@Body() sendResetCodeDto: SendResetCodeDto) {
    await this.passwordService.resendResetCode(sendResetCodeDto.email);
    return {
      message: 'Reset code resent successfully',
    };
  }

  @Public()
  @Post('forgetPassword/verifyResetCode')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    await this.passwordService.verifyResetCode(verifyResetCodeDto.resetCode);
    return {
      message: 'Reset code verified successfully',
    };
  }

  @Public()
  @Put('forgetPassword/resetPassword')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { accessToken, refreshToken } =
      await this.passwordService.resetPassword(
        resetPasswordDto.email,
        resetPasswordDto.newPassword,
      );

    return {
      message: 'Password has been reset successfully',
      accessToken,
      refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('updatePassword')
  @HttpCode(HttpStatus.OK)
  async updateMyPassword(
    @Request() req: RequestWithUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const userId = req.user._id.toString();

    const { user, accessToken, refreshToken } =
      await this.passwordService.updateMyPassword(
        userId,
        updatePasswordDto.currentPassword,
        updatePasswordDto.newPassword,
      );

    return {
      status: 'success',
      message: 'Password updated successfully',
      data: user,
      accessToken,
      refreshToken,
    };
  }
}
