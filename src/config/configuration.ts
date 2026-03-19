export default () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,

  // Database
  MONGO_URI: process.env.MONGO_URI,

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  REDIS_CONNECT_TIMEOUT: process.env.REDIS_CONNECT_TIMEOUT
    ? parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10)
    : 5000,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ACCESS_EXPIRE: process.env.JWT_ACCESS_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',

  // Email (Brevo)
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@Backend.com',
  EMAIL_BRAND_NAME: process.env.EMAIL_BRAND_NAME || 'Backend Services',

  // Hosts
  MAIN_HOST_DEV: process.env.MAIN_HOST_DEV,
  MAIN_HOST_PROD: process.env.MAIN_HOST_PROD,
  LOCAL_HOST: process.env.LOCAL_HOST,

  // Logging
  LOG_PATH: process.env.LOG_PATH || 'logs',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
});
