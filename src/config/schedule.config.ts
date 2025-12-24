import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ScheduleConfig, ScheduleEntry, LocationConfig } from './schedule.types';

@Injectable()
export class ScheduleConfigService {
  private readonly logger = new Logger(ScheduleConfigService.name);
  private config!: ScheduleConfig;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const configPath = join(process.cwd(), 'config', 'schedule.json');
    try {
      const rawConfig = readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(rawConfig) as ScheduleConfig;
      this.logger.log(`Loaded ${this.config.schedules.length} schedule entries`);
    } catch (error) {
      this.logger.error(`Failed to load schedule config: ${error}`);
      throw error;
    }
  }

  getScheduleForDay(dayOfWeek: number): ScheduleEntry | undefined {
    return this.config.schedules.find((s) => s.dayOfWeek === dayOfWeek);
  }

  getLocation(locationKey: 'sweat-lab' | 'fusion-fitness'): LocationConfig {
    return this.config.locations[locationKey];
  }

  getAllSchedules(): ScheduleEntry[] {
    return this.config.schedules;
  }
}
