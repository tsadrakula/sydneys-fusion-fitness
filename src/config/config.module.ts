import { Module, Global } from '@nestjs/common';
import { ScheduleConfigService } from './schedule.config';

@Global()
@Module({
  providers: [ScheduleConfigService],
  exports: [ScheduleConfigService],
})
export class ScheduleConfigModule {}
