import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BookingScheduler } from './booking/booking.scheduler';
import { Logger } from '@nestjs/common';

/**
 * Test script to manually trigger a booking
 * Usage: bun run src/test-booking.ts [daysFromNow]
 * Example: bun run src/test-booking.ts 14
 */
async function testBooking() {
  const logger = new Logger('TestBooking');

  // Get days from command line args (default 14)
  const daysFromNow = parseInt(process.argv[2] || '14', 10);

  logger.log(`Starting test booking for ${daysFromNow} days from now...`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const scheduler = app.get(BookingScheduler);

  try {
    await scheduler.triggerManualBooking(daysFromNow);
    logger.log('Test booking completed');
  } catch (error) {
    logger.error(`Test booking failed: ${error}`);
  } finally {
    await app.close();
  }
}

testBooking();
