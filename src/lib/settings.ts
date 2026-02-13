import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ScheduleEntry {
  dayOfWeek: number;
  time: string;
  classType: string;
  location: 'sweat-lab' | 'fusion-fitness';
  preferredSpots: string[];
  instructor?: string;
}

export interface LocationConfig {
  id: string;
  region: string;
}

export interface ScheduleConfig {
  schedules: ScheduleEntry[];
  locations: Record<string, LocationConfig>;
}

const CONFIG_PATH = join(process.cwd(), 'config', 'schedule.json');

export function getScheduleConfig(): ScheduleConfig {
  const data = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(data) as ScheduleConfig;
}

export function saveScheduleConfig(config: ScheduleConfig): void {
  // Validate
  if (!config || !Array.isArray(config.schedules)) {
    throw new Error('schedules must be an array');
  }
  if (!config.locations || typeof config.locations !== 'object') {
    throw new Error('locations must be an object');
  }
  for (const entry of config.schedules) {
    if (typeof entry.dayOfWeek !== 'number' || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
      throw new Error('Invalid dayOfWeek (must be 0-6)');
    }
    if (!entry.time || typeof entry.time !== 'string') {
      throw new Error('Invalid time');
    }
    if (!entry.classType || typeof entry.classType !== 'string') {
      throw new Error('Invalid classType');
    }
    if (!entry.location || typeof entry.location !== 'string') {
      throw new Error('Invalid location');
    }
    if (!Array.isArray(entry.preferredSpots)) {
      throw new Error('preferredSpots must be an array');
    }
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const CLASS_TYPES = ['SCULPT', 'STRENGTH + SWEAT', 'SWEAT LAB', 'DRENCHED', 'RIDE', 'RESTORE'];

export const LOCATIONS: Record<string, string> = {
  'fusion-fitness': 'Fusion Fitness',
  'sweat-lab': 'Sweat Lab',
};

export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}
