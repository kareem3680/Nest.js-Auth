import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

export interface TokenPayload {
  userId: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  role: string;
}

export class TokenUtil {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return secret;
  }

  private static getAccessExpire(): string | number {
    const expire = process.env.JWT_ACCESS_EXPIRE || '15m';
    // Check if it's a number (seconds)
    if (/^\d+$/.test(expire)) {
      return parseInt(expire, 10);
    }
    return expire;
  }

  private static getRefreshExpire(): string | number {
    const expire = process.env.JWT_REFRESH_EXPIRE || '30d';
    // Check if it's a number (seconds)
    if (/^\d+$/.test(expire)) {
      return parseInt(expire, 10);
    }
    return expire;
  }

  static createAccessToken(payload: TokenPayload): string {
    const secret = this.getJwtSecret();
    const expiresIn = this.getAccessExpire();

    return jwt.sign(
      {
        userId: payload.userId,
        companyId: payload.companyId,
        role: payload.role,
      },
      secret,
      { expiresIn } as jwt.SignOptions,
    );
  }

  static async createRefreshToken(
    payload: TokenPayload,
  ): Promise<{ token: string; hashed: string }> {
    const secret = this.getJwtSecret();
    const expiresIn = this.getRefreshExpire();

    const token = jwt.sign(
      {
        userId: payload.userId,
        companyId: payload.companyId,
        role: payload.role,
      },
      secret,
      { expiresIn } as jwt.SignOptions,
    );

    const hashed = await bcrypt.hash(token, 12);
    return { token, hashed };
  }

  static verifyAccessToken(token: string): jwt.JwtPayload {
    const secret = this.getJwtSecret();
    return jwt.verify(token, secret) as jwt.JwtPayload;
  }

  static verifyRefreshToken(token: string): jwt.JwtPayload {
    const secret = this.getJwtSecret();
    return jwt.verify(token, secret) as jwt.JwtPayload;
  }

  static fromUser(user: {
    _id: Types.ObjectId | string;
    companyId?: Types.ObjectId | string;
    role: string;
    [key: string]: any;
  }): TokenPayload {
    return {
      userId: user._id,
      companyId: user.companyId,
      role: user.role,
    };
  }
}
