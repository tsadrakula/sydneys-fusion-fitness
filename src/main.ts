import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log('Sydney\'s Fusion Fitness Auto-Booker started');
  logger.log('Pre-flight scheduled for 12:00 PM CST daily');
  logger.log('Booking scheduled for 12:01 PM CST daily');

  // Keep the app running
  process.on('SIGINT', async () => {
    logger.log('Shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
