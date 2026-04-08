import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());

  try {
    console.log('🟢 Connected to MongoDB');

    // Add companyId to users without companyId
    const result = await connection
      .collection('users')
      .updateMany(
        { companyId: { $exists: false } },
        { $set: { companyId: null } },
      );

    console.log(`✅ Updated ${result.modifiedCount} users`);
  } catch (error) {
    console.error('🔴 Error:', error);
  } finally {
    await connection.close();
    await app.close();
    process.exit(0);
  }
}

void bootstrap();
