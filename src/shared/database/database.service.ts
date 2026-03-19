import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    try {
      if (this.connection.readyState === ConnectionStates.connected) {
        this.logger.log('MongoDB Connected Successfully');
      } else {
        await this.connection.asPromise();
        this.logger.log('MongoDB Connected Successfully');
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`MongoDB Connection Error: ${error.message}`);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    if (this.connection.readyState !== ConnectionStates.disconnected) {
      await this.connection.close();
      this.logger.log('MongoDB connection closed gracefully');
    }
  }

  getConnection(): Connection {
    return this.connection;
  }
}
