import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  apiKey: process.env.BREVO_API_KEY,
  from: process.env.EMAIL_FROM || 'noreply@Backend.com',
  brandName: process.env.EMAIL_BRAND_NAME || 'Backend Services',
}));
