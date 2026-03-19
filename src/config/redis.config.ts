import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL,
  connectTimeout: process.env.REDIS_CONNECT_TIMEOUT
    ? parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10)
    : 5000,
}));
