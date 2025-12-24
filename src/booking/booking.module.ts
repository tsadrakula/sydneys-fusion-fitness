import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingScheduler } from './booking.scheduler';

@Module({
  providers: [BookingService, BookingScheduler],
  exports: [BookingService, BookingScheduler],
})
export class BookingModule {}
