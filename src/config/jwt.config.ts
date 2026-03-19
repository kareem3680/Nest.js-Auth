import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  accessExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
  refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
}));
