export interface ScheduleEntry {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  time: string; // "07:00"
  classType: string; // "STRENGTH + SWEAT"
  location: 'sweat-lab' | 'fusion-fitness';
  preferredSpots: string[]; // ["8", "9", "6", "15"]
}

export interface LocationConfig {
  id: string;
  region: string;
}

export interface ScheduleConfig {
  schedules: ScheduleEntry[];
  locations: {
    'sweat-lab': LocationConfig;
    'fusion-fitness': LocationConfig;
  };
}
