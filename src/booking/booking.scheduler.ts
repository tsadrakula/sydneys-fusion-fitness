import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingService } from './booking.service';
import { ScheduleConfigService } from '../config/schedule.config';
import { AuthService } from '../auth/auth.service';
import type { ScheduleEntry } from '../config/schedule.types';

interface PreflightResult {
  targetDate: Date;
  scheduleEntry: ScheduleEntry;
  classId: string;
  spotId: string;
  spotName: string;
}

@Injectable()
export class BookingScheduler {
  private readonly logger = new Logger(BookingScheduler.name);
  private preflightResult: PreflightResult | null = null;

  constructor(
    private readonly bookingService: BookingService,
    private readonly scheduleConfig: ScheduleConfigService,
    private readonly authService: AuthService,
  ) {}

  /**
   * PRE-FLIGHT: Runs at 12:00 PM CST (America/Chicago) every day
   * - Fetches fresh token
   * - Checks if class exists and finds the best available spot
   * - Caches result for the 12:01 PM booking attempt
   */
  @Cron('0 0 12 * * *', {
    timeZone: 'America/Chicago',
  })
  async handlePreflightCron(): Promise<void> {
    this.logger.log('=== Pre-flight check at 12:00 PM ===');
    this.preflightResult = null;

    try {
      // Calculate target date (14 days from now)
      const targetDate = this.addDays(new Date(), 14);
      const targetDayOfWeek = targetDate.getDay();

      this.logger.log(
        `Target date: ${targetDate.toISOString().split('T')[0]} (${this.getDayName(targetDayOfWeek)})`,
      );

      // Find schedule entry for target day
      const scheduleEntry = this.scheduleConfig.getScheduleForDay(targetDayOfWeek);

      if (!scheduleEntry) {
        this.logger.log(`No class scheduled for ${this.getDayName(targetDayOfWeek)}, skipping`);
        return;
      }

      this.logger.log(
        `Found schedule: ${scheduleEntry.classType} @ ${scheduleEntry.time} at ${scheduleEntry.location}`,
      );

      // Warm up token
      await this.authService.getAccessToken();

      // Pre-flight check - find the class and best spot
      const result = await this.bookingService.preflight(targetDate, scheduleEntry);

      if (result) {
        this.preflightResult = {
          targetDate,
          scheduleEntry,
          classId: result.classId,
          spotId: result.spotId,
          spotName: result.spotName,
        };
        this.logger.log(
          `Pre-flight ready: Class ${result.classId}, Spot ${result.spotName} (${result.spotId})`,
        );

        // Try booking immediately at 12:00 PM - booking might be open!
        this.logger.log('Attempting immediate booking at 12:00 PM...');
        const booked = await this.bookingService.bookDirectly(
          result.classId,
          result.spotId,
          result.spotName,
        );

        if (booked) {
          this.logger.log('=== Successfully booked at 12:00 PM! ===');
          this.preflightResult = null; // Clear so 12:01 doesn't retry
        } else {
          this.logger.log('12:00 PM booking not available yet, will retry at 12:01 PM');
        }
      } else {
        this.logger.warn('Pre-flight failed - no class or spots found');
      }

      this.logger.log('=== Pre-flight check completed ===');
    } catch (error) {
      this.logger.error(`Pre-flight check failed: ${error}`);
    }
  }

  /**
   * BOOKING: Runs at 12:01 PM CST (America/Chicago) every day
   * - Uses pre-flight cached data if available
   * - Otherwise does full booking flow
   */
  @Cron('0 1 12 * * *', {
    timeZone: 'America/Chicago',
  })
  async handleBookingCron(): Promise<void> {
    this.logger.log('=== Booking cron at 12:01 PM ===');

    try {
      // If pre-flight already booked successfully, skip
      if (this.preflightResult === null) {
        // Check if we have no schedule for today or already booked at 12:00
        const targetDate = this.addDays(new Date(), 14);
        const targetDayOfWeek = targetDate.getDay();
        const scheduleEntry = this.scheduleConfig.getScheduleForDay(targetDayOfWeek);

        if (!scheduleEntry) {
          this.logger.log('No class scheduled for today, skipping');
          return;
        }

        // Pre-flight didn't run or failed, do full booking
        this.logger.log('No pre-flight data, running full booking flow...');
        await this.bookingService.bookClass(targetDate, scheduleEntry);
      } else {
        // Use pre-flight cached data for fast booking
        this.logger.log(
          `Using pre-flight data: Class ${this.preflightResult.classId}, Spot ${this.preflightResult.spotName}`,
        );

        const booked = await this.bookingService.bookDirectly(
          this.preflightResult.classId,
          this.preflightResult.spotId,
          this.preflightResult.spotName,
        );

        if (!booked) {
          // Spot might have been taken, try full flow with fallbacks
          this.logger.warn('Pre-flight spot unavailable, trying full booking flow...');
          await this.bookingService.bookClass(
            this.preflightResult.targetDate,
            this.preflightResult.scheduleEntry,
          );
        }
      }

      this.logger.log('=== Booking cron completed ===');
    } catch (error) {
      this.logger.error(`Booking cron failed: ${error}`);
    } finally {
      // Clear pre-flight data
      this.preflightResult = null;
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualBooking(daysFromNow: number = 14): Promise<void> {
    this.logger.log(`=== Manual booking triggered (${daysFromNow} days out) ===`);

    const targetDate = this.addDays(new Date(), daysFromNow);
    const targetDayOfWeek = targetDate.getDay();

    const scheduleEntry = this.scheduleConfig.getScheduleForDay(targetDayOfWeek);

    if (!scheduleEntry) {
      this.logger.log(`No class scheduled for ${this.getDayName(targetDayOfWeek)}`);
      return;
    }

    await this.bookingService.bookClass(targetDate, scheduleEntry);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }
}
