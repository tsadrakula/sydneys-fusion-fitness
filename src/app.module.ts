import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { MarianaModule } from './mariana/mariana.module';
import { BookingModule } from './booking/booking.module';
import { ScheduleConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    MarianaModule,
    BookingModule,
    ScheduleConfigModule,
  ],
})
export class AppModule {}
