import { Injectable, Logger } from '@nestjs/common';
import { MarianaService } from '../mariana/mariana.service';
import { ScheduleConfigService } from '../config/schedule.config';
import type { ScheduleEntry } from '../config/schedule.types';
import type { MarianaClass, MarianaSpot } from '../mariana/types';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly marianaService: MarianaService,
    private readonly scheduleConfig: ScheduleConfigService,
  ) {}

  /**
   * Pre-flight check: Find the class and best available spot without booking.
   * Returns null if class not found or no spots available.
   */
  async preflight(
    targetDate: Date,
    scheduleEntry: ScheduleEntry,
  ): Promise<{ classId: string; spotId: string; spotName: string } | null> {
    const dateStr = this.formatDate(targetDate);
    const dayName = this.getDayName(targetDate.getDay());

    this.logger.log(
      `Pre-flight: ${scheduleEntry.classType} @ ${scheduleEntry.time} on ${dayName} ${dateStr}`,
    );

    try {
      const location = this.scheduleConfig.getLocation(scheduleEntry.location);
      const classes = await this.marianaService.getClasses(
        dateStr,
        location.id,
        location.region,
      );

      const matchingClass = this.findMatchingClass(classes, scheduleEntry);
      if (!matchingClass) {
        this.logger.warn(`Pre-flight: No matching class found`);
        return null;
      }

      if (matchingClass.is_cancelled) {
        this.logger.warn(`Pre-flight: Class ${matchingClass.id} is cancelled`);
        return null;
      }

      if (matchingClass.is_user_reserved) {
        this.logger.log(`Pre-flight: Already booked for class ${matchingClass.id}`);
        return null;
      }

      if (matchingClass.layout_format !== 'pick-a-spot') {
        this.logger.log(`Pre-flight: Class is first-come-first-serve`);
        return null;
      }

      const classWithLayout = await this.marianaService.getClassWithLayout(
        matchingClass.id,
      );

      if (!classWithLayout.layout) {
        this.logger.error(`Pre-flight: No layout found`);
        return null;
      }

      const spot = this.findBestSpot(
        classWithLayout.layout.spots,
        scheduleEntry.preferredSpots,
      );

      if (!spot) {
        this.logger.warn(`Pre-flight: No preferred spots available`);
        return null;
      }

      return {
        classId: matchingClass.id,
        spotId: spot.id,
        spotName: spot.name,
      };
    } catch (error) {
      this.logger.error(`Pre-flight failed: ${error}`);
      return null;
    }
  }

  /**
   * Direct booking with known class and spot IDs.
   * Returns true if successful, false if booking not yet available.
   */
  async bookDirectly(
    classId: string,
    spotId: string,
    spotName: string,
  ): Promise<boolean> {
    try {
      const result = await this.marianaService.bookSpot(classId, spotId);
      this.logger.log(
        `Successfully booked spot ${spotName} - Reservation ID: ${result.id}`,
      );
      return true;
    } catch (error) {
      const errorMsg = String(error);
      // Check if it's a "too early" error - that's expected at 12:00 PM
      if (errorMsg.includes('too early')) {
        this.logger.log('Booking not available yet (too early)');
        return false;
      }
      this.logger.error(`Direct booking failed: ${error}`);
      return false;
    }
  }

  async bookClass(targetDate: Date, scheduleEntry: ScheduleEntry): Promise<void> {
    const dateStr = this.formatDate(targetDate);
    const dayName = this.getDayName(targetDate.getDay());

    this.logger.log(
      `Attempting to book ${scheduleEntry.classType} @ ${scheduleEntry.time} on ${dayName} ${dateStr}`,
    );

    try {
      // 1. Get location config
      const location = this.scheduleConfig.getLocation(scheduleEntry.location);

      // 2. Fetch classes for target date
      const classes = await this.marianaService.getClasses(
        dateStr,
        location.id,
        location.region,
      );

      // 3. Find matching class
      const matchingClass = this.findMatchingClass(classes, scheduleEntry);
      if (!matchingClass) {
        this.logger.warn(
          `No matching class found for ${scheduleEntry.classType} @ ${scheduleEntry.time}`,
        );
        return;
      }

      // 4. Check if already booked or cancelled
      if (matchingClass.is_cancelled) {
        this.logger.warn(`Class ${matchingClass.id} is cancelled, skipping`);
        return;
      }

      if (matchingClass.is_user_reserved) {
        this.logger.log(`Already booked for class ${matchingClass.id}, skipping`);
        return;
      }

      // 5. Check layout format
      if (matchingClass.layout_format !== 'pick-a-spot') {
        this.logger.log(
          `Class ${matchingClass.id} is first-come-first-serve, cannot pick spot`,
        );
        // Could still book without spot selection if desired
        return;
      }

      // 6. Get class with layout
      const classWithLayout = await this.marianaService.getClassWithLayout(
        matchingClass.id,
      );

      if (!classWithLayout.layout) {
        this.logger.error(`No layout found for class ${matchingClass.id}`);
        return;
      }

      // 7. Find best available spot
      const spot = this.findBestSpot(
        classWithLayout.layout.spots,
        scheduleEntry.preferredSpots,
      );

      if (spot) {
        // 8. Book the spot
        await this.bookSpotWithRetry(matchingClass.id, spot);
      } else {
        // 9. All preferred spots taken - join waitlist
        this.logger.warn(
          `All preferred spots ${scheduleEntry.preferredSpots.join(', ')} are taken`,
        );
        await this.joinWaitlistWithRetry(matchingClass.id);
      }
    } catch (error) {
      this.logger.error(`Booking failed: ${error}`);
      throw error;
    }
  }

  private findMatchingClass(
    classes: MarianaClass[],
    scheduleEntry: ScheduleEntry,
  ): MarianaClass | undefined {
    return classes.find((c) => {
      // Match class type (case-insensitive, partial match)
      const classTypeName = c.class_type.name.toUpperCase();
      const targetType = scheduleEntry.classType.toUpperCase();
      const typeMatches = classTypeName.includes(targetType) || targetType.includes(classTypeName);

      // Match start time (format: "07:00:00" vs "07:00")
      const classTime = c.start_time.substring(0, 5); // "07:00:00" -> "07:00"
      const timeMatches = classTime === scheduleEntry.time;

      return typeMatches && timeMatches;
    });
  }

  private findBestSpot(
    spots: MarianaSpot[],
    preferredSpotNames: string[],
  ): MarianaSpot | undefined {
    for (const preferredName of preferredSpotNames) {
      const spot = spots.find(
        (s) => s.name === preferredName && s.is_available,
      );
      if (spot) {
        this.logger.log(`Found available preferred spot: ${spot.name}`);
        return spot;
      }
      this.logger.debug(`Spot ${preferredName} not available`);
    }
    return undefined;
  }

  private async bookSpotWithRetry(
    classId: string,
    spot: MarianaSpot,
  ): Promise<void> {
    try {
      const result = await this.marianaService.bookSpot(classId, spot.id);
      this.logger.log(
        `Successfully booked spot ${spot.name} - Reservation ID: ${result.id}`,
      );
    } catch (error) {
      this.logger.warn(`First booking attempt failed, retrying in 2s...`);
      await this.sleep(2000);

      try {
        const result = await this.marianaService.bookSpot(classId, spot.id);
        this.logger.log(
          `Successfully booked spot ${spot.name} on retry - Reservation ID: ${result.id}`,
        );
      } catch (retryError) {
        this.logger.error(`Booking failed after retry: ${retryError}`);
        throw retryError;
      }
    }
  }

  private async joinWaitlistWithRetry(classId: string): Promise<void> {
    try {
      const result = await this.marianaService.joinWaitlist(classId);
      this.logger.log(
        `Joined waitlist - Reservation ID: ${result.id}, Position: ${result.waitlist_position}`,
      );
    } catch (error) {
      this.logger.warn(`First waitlist attempt failed, retrying in 2s...`);
      await this.sleep(2000);

      try {
        const result = await this.marianaService.joinWaitlist(classId);
        this.logger.log(
          `Joined waitlist on retry - Reservation ID: ${result.id}, Position: ${result.waitlist_position}`,
        );
      } catch (retryError) {
        this.logger.error(`Waitlist join failed after retry: ${retryError}`);
        throw retryError;
      }
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
