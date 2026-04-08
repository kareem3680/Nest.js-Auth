import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { cleanOldLogs } from './logger.util';

@Injectable()
export class CronJobUtil {
  private readonly logger = new Logger(CronJobUtil.name);

  @Cron('0 16 * * 1') // Every Monday at 4 PM
  handleLogCleanup() {
    this.logger.log('Daily log cleanup started (Every Monday at 4 PM)');
    try {
      cleanOldLogs();
      this.logger.log('Log cleanup completed successfully');
    } catch (error) {
      this.logger.error('Log cleanup failed', error);
    }
  }
}
