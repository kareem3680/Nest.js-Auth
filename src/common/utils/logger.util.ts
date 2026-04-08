import { createLogger, format, transports, Logger } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const { combine, printf, colorize } = format;

const logDir = process.env.LOG_PATH || 'logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const dateFormat = () =>
  new Date().toLocaleString('en-EG', { timeZone: 'Africa/Cairo' });

const customFormat = printf(({ level, message, ...meta }) => {
  let log = `${dateFormat()} | ${level.toUpperCase()} | ${String(message)}`;
  if (Object.keys(meta).length > 0) log += ` | ${JSON.stringify(meta)}`;
  return log;
});

export class LoggerService {
  private logger: Logger;
  private topic: string;

  constructor(topic: string) {
    this.topic = topic;
    const filename = path.join(logDir, `${topic}.log`);

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(customFormat),
      transports: [
        new transports.Console({
          format: combine(customFormat, colorize({ all: true })),
        }),
        new transports.File({ filename }),
      ],
    });
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.logger.debug(message, meta);
  }
}

// Clean old logs function (unchanged)
export const cleanOldLogs = () => {
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(logDir);

    files.forEach((file) => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      const recentLines = lines.filter((line) => {
        const match = line.match(
          /^(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[AP]M)/,
        );
        if (!match) return true;
        const logTime = new Date(match[1]).getTime();
        return now - logTime < maxAge;
      });

      fs.writeFileSync(filePath, recentLines.join('\n') + '\n', 'utf-8');
    });
  } catch (err) {
    console.error('Error cleaning logs:', err);
  }
};
