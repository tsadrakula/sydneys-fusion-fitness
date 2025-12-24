import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

interface ScheduleEntry {
  dayOfWeek: number;
  time: string;
  classType: string;
  location: 'sweat-lab' | 'fusion-fitness';
  preferredSpots: string[];
}

interface LocationConfig {
  id: string;
  region: string;
}

interface ScheduleConfig {
  schedules: ScheduleEntry[];
  locations: Record<string, LocationConfig>;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface MarianaInstructor {
  id: string;
  name: string;
}

interface MarianaClassType {
  id: string;
  name: string;
  description: string;
}

interface MarianaSpot {
  id: string;
  name: string;
  spot_type: string;
  is_available: boolean;
}

interface MarianaClass {
  id: string;
  start_datetime: string;
  class_type: MarianaClassType;
  instructors: MarianaInstructor[];
  is_cancelled: boolean;
  layout_format: string;
  layout?: {
    spots: MarianaSpot[];
  };
}

interface MarianaClassesResponse {
  results: MarianaClass[];
}

// =============================================================================
// Constants
// =============================================================================

const BASE_URL = 'https://fusionfitness.marianatek.com/api/customer/v1';
const TOKEN_URL = 'https://fusionfitness.marianatek.com/o/token/';

// =============================================================================
// Config
// =============================================================================

function loadScheduleConfig(): ScheduleConfig {
  const configPath = join(process.cwd(), 'config', 'schedule.json');
  const rawConfig = readFileSync(configPath, 'utf-8');
  return JSON.parse(rawConfig) as ScheduleConfig;
}

// =============================================================================
// Auth
// =============================================================================

async function getAccessToken(): Promise<string> {
  const clientId = process.env.MARIANA_CLIENT_ID!;
  const refreshToken = process.env.MARIANA_REFRESH_TOKEN!;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const tokenData = (await response.json()) as TokenResponse;
  return tokenData.access_token;
}

// =============================================================================
// Marianatek API
// =============================================================================

async function apiRequest<T>(
  token: string,
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function getClasses(
  token: string,
  date: string,
  locationId: string,
  regionId: string
): Promise<MarianaClass[]> {
  const params = new URLSearchParams({
    min_start_date: date,
    max_start_date: date,
    page_size: '500',
    location: locationId,
    region: regionId,
  });

  const response = await apiRequest<MarianaClassesResponse>(
    token,
    'GET',
    `/classes?${params.toString()}`
  );

  return response.results;
}

async function getClassWithLayout(token: string, classId: string): Promise<MarianaClass> {
  return apiRequest<MarianaClass>(token, 'GET', `/classes/${classId}`);
}

async function bookSpot(
  token: string,
  classId: string,
  spotId: string,
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest(token, 'POST', '/me/reservations', {
      class_session: { id: classId },
      spot: { id: spotId },
      payment_option: { id: membershipId },
      is_booked_for_me: true,
      reservation_type: 'standard',
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function joinWaitlist(
  token: string,
  classId: string,
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest(token, 'POST', '/me/reservations', {
      class_session: { id: classId },
      payment_option: { id: membershipId },
      is_booked_for_me: true,
      reservation_type: 'waitlist',
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// Booking Logic
// =============================================================================

function getChicagoDate(): { date: string; dayOfWeek: number } {
  const now = new Date();

  // Get Chicago date components
  const chicagoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = chicagoFormatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const weekday = parts.find(p => p.type === 'weekday')!.value;

  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };

  return {
    date: `${year}-${month}-${day}`,
    dayOfWeek: dayMap[weekday]!,
  };
}

function addDays(dateStr: string, days: number): { date: string; dayOfWeek: number } {
  const date = new Date(dateStr + 'T12:00:00-06:00'); // Parse as Chicago noon
  date.setDate(date.getDate() + days);

  const chicagoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = chicagoFormatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const weekday = parts.find(p => p.type === 'weekday')!.value;

  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };

  return {
    date: `${year}-${month}-${day}`,
    dayOfWeek: dayMap[weekday]!,
  };
}

function extractTime(isoDatetime: string): string {
  // Convert to America/Chicago timezone (CST/CDT)
  const date = new Date(isoDatetime);
  const chicagoTime = date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  // toLocaleString returns "HH:MM", extract just the time
  return chicagoTime;
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

async function bookClass(logs: string[]): Promise<{ booked: boolean; waitlisted: boolean }> {
  const config = loadScheduleConfig();
  const membershipId = process.env.MEMBERSHIP_ID!;

  // Calculate target date (14 days out in Chicago timezone)
  const today = getChicagoDate();
  const target = addDays(today.date, 14);

  logs.push(`Today (Chicago): ${today.date}`);
  logs.push(`Target date: ${target.date} (${getDayName(target.dayOfWeek)})`);

  // Find schedule entry for target day
  const scheduleEntry = config.schedules.find((s) => s.dayOfWeek === target.dayOfWeek);

  if (!scheduleEntry) {
    logs.push(`No class scheduled for ${getDayName(target.dayOfWeek)}, skipping`);
    return { booked: false, waitlisted: false };
  }

  logs.push(`Looking for: ${scheduleEntry.classType} @ ${scheduleEntry.time} at ${scheduleEntry.location}`);

  // Get access token
  logs.push('Fetching access token...');
  const token = await getAccessToken();
  logs.push('Token acquired');

  // Get location config
  const location = config.locations[scheduleEntry.location];
  if (!location) {
    logs.push(`Unknown location: ${scheduleEntry.location}`);
    return { booked: false, waitlisted: false };
  }

  // Fetch classes for target date
  logs.push('Fetching classes...');
  const classes = await getClasses(token, target.date, location.id, location.region);
  logs.push(`Found ${classes.length} classes`);

  // Find matching class
  const matchingClass = classes.find((c) => {
    if (c.is_cancelled) return false;
    const classTime = extractTime(c.start_datetime);
    const classTypeName = c.class_type.name.toLowerCase();
    const targetType = scheduleEntry.classType.toLowerCase();
    return classTime === scheduleEntry.time && classTypeName.includes(targetType);
  });

  if (!matchingClass) {
    logs.push('No matching class found');
    return { booked: false, waitlisted: false };
  }

  const instructor = matchingClass.instructors[0]?.name || 'Unknown';
  logs.push(`Found class: ${matchingClass.class_type.name} with ${instructor} (ID: ${matchingClass.id})`);

  // Check layout format
  if (matchingClass.layout_format !== 'pick-a-spot') {
    logs.push(`Class is ${matchingClass.layout_format}, not pick-a-spot - joining waitlist`);
    const result = await joinWaitlist(token, matchingClass.id, membershipId);
    if (result.success) {
      logs.push('Joined waitlist successfully');
      return { booked: false, waitlisted: true };
    } else {
      logs.push(`Waitlist failed: ${result.error}`);
      return { booked: false, waitlisted: false };
    }
  }

  // Get class layout with spots
  logs.push('Fetching spot layout...');
  const classWithLayout = await getClassWithLayout(token, matchingClass.id);

  if (!classWithLayout.layout?.spots) {
    logs.push('No layout found');
    return { booked: false, waitlisted: false };
  }

  const spots = classWithLayout.layout.spots;
  logs.push(`Found ${spots.length} spots, ${spots.filter((s) => s.is_available).length} available`);

  // Find best available spot from preferred list
  for (const preferredSpot of scheduleEntry.preferredSpots) {
    const spot = spots.find((s) => s.name === preferredSpot && s.is_available);
    if (spot) {
      logs.push(`Attempting to book spot ${spot.name}...`);
      const result = await bookSpot(token, matchingClass.id, spot.id, membershipId);

      if (result.success) {
        logs.push(`SUCCESS! Booked spot ${spot.name}`);
        return { booked: true, waitlisted: false };
      } else {
        logs.push(`Failed to book spot ${spot.name}: ${result.error}`);
      }
    }
  }

  // No preferred spots available, try waitlist
  logs.push('No preferred spots available, joining waitlist...');
  const waitlistResult = await joinWaitlist(token, matchingClass.id, membershipId);

  if (waitlistResult.success) {
    logs.push('Joined waitlist successfully');
    return { booked: false, waitlisted: true };
  } else {
    logs.push(`Waitlist failed: ${waitlistResult.error}`);
    return { booked: false, waitlisted: false };
  }
}

// =============================================================================
// Vercel Handler (Web API standard)
// =============================================================================

export async function GET() {
  const logs: string[] = [];
  const startTime = Date.now();

  logs.push(`Booking triggered at ${new Date().toISOString()}`);

  try {
    const result = await bookClass(logs);
    const duration = Date.now() - startTime;

    logs.push(`Completed in ${duration}ms`);

    return Response.json({
      success: true,
      booked: result.booked,
      waitlisted: result.waitlisted,
      logs,
    });
  } catch (error) {
    logs.push(`ERROR: ${error}`);
    const duration = Date.now() - startTime;
    logs.push(`Failed after ${duration}ms`);

    return Response.json(
      {
        success: false,
        error: String(error),
        logs,
      },
      { status: 500 }
    );
  }
}
