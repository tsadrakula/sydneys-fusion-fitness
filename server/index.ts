<<<<<<<< HEAD:src/app/api/book/route.ts
import { getScheduleConfig } from '@/lib/settings';
import type { ScheduleEntry } from '@/lib/settings';
========
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import cron from 'node-cron';

// =============================================================================
// Config
// =============================================================================

const PORT = Number(process.env.PORT || 3001);
const CONFIG_PATH = join(import.meta.dir, '..', 'config', 'schedule.json');
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
>>>>>>>> b52dc9a (feat: move booking cron to local Bun server with Cloudflare Tunnel):server/index.ts

// =============================================================================
// Types
// =============================================================================

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
// CORS
// =============================================================================

function corsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin =
    ALLOWED_ORIGINS.includes('*')
      ? '*'
      : ALLOWED_ORIGINS.find((o) => o === origin) || ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// =============================================================================
// Schedule Config (local JSON)
// =============================================================================

function loadScheduleConfig(): ScheduleConfig {
  const data = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(data) as ScheduleConfig;
}

function saveScheduleConfig(config: ScheduleConfig): void {
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

// =============================================================================
// Marianatek Auth
// =============================================================================

const BASE_URL = 'https://fusionfitness.marianatek.com/api/customer/v1';
const TOKEN_URL = 'https://fusionfitness.marianatek.com/o/token/';

<<<<<<<< HEAD:src/app/api/book/route.ts
// =============================================================================
// Auth
// =============================================================================

========
>>>>>>>> b52dc9a (feat: move booking cron to local Bun server with Cloudflare Tunnel):server/index.ts
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
  body?: object,
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
  regionId: string,
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
    `/classes?${params.toString()}`,
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
  membershipId: string,
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
  membershipId: string,
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
  const chicagoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = chicagoFormatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  const weekday = parts.find((p) => p.type === 'weekday')!.value;

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return { date: `${year}-${month}-${day}`, dayOfWeek: dayMap[weekday]! };
}

function addDays(dateStr: string, days: number): { date: string; dayOfWeek: number } {
  const date = new Date(dateStr + 'T12:00:00-06:00');
  date.setDate(date.getDate() + days);

  const chicagoFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = chicagoFormatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  const weekday = parts.find((p) => p.type === 'weekday')!.value;

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return { date: `${year}-${month}-${day}`, dayOfWeek: dayMap[weekday]! };
}

function extractTime(isoDatetime: string): string {
  const date = new Date(isoDatetime);
  return date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

<<<<<<<< HEAD:src/app/api/book/route.ts
async function bookClass(logs: string[]): Promise<{ booked: boolean; waitlisted: boolean }> {
  const config = getScheduleConfig();
========
async function bookClass(
  logs: string[],
  action: 'book' | 'waitlist' = 'book',
): Promise<{ booked: boolean; waitlisted: boolean }> {
  const config = loadScheduleConfig();
>>>>>>>> b52dc9a (feat: move booking cron to local Bun server with Cloudflare Tunnel):server/index.ts
  const membershipId = process.env.MEMBERSHIP_ID!;

  const today = getChicagoDate();
  const target = addDays(today.date, 14);

  logs.push(`Today (Chicago): ${today.date}`);
  logs.push(`Target date: ${target.date} (${getDayName(target.dayOfWeek)})`);

<<<<<<<< HEAD:src/app/api/book/route.ts
  // Find schedule entry for target day
  const scheduleEntry = config.schedules.find((s: ScheduleEntry) => s.dayOfWeek === target.dayOfWeek);
========
  const scheduleEntry = config.schedules.find((s) => s.dayOfWeek === target.dayOfWeek);
>>>>>>>> b52dc9a (feat: move booking cron to local Bun server with Cloudflare Tunnel):server/index.ts

  if (!scheduleEntry) {
    logs.push(`No class scheduled for ${getDayName(target.dayOfWeek)}, skipping`);
    return { booked: false, waitlisted: false };
  }

  logs.push(`Looking for: ${scheduleEntry.classType} @ ${scheduleEntry.time} at ${scheduleEntry.location}`);

  logs.push('Fetching access token...');
  const token = await getAccessToken();
  logs.push('Token acquired');

  const location = config.locations[scheduleEntry.location];
  if (!location) {
    logs.push(`Unknown location: ${scheduleEntry.location}`);
    return { booked: false, waitlisted: false };
  }

  logs.push('Fetching classes...');
  const classes = await getClasses(token, target.date, location.id, location.region);
  logs.push(`Found ${classes.length} classes`);

  const matchingClass = classes.find((c) => {
    if (c.is_cancelled) return false;
    const classTime = extractTime(c.start_datetime);
    const classTypeName = c.class_type.name.toLowerCase();
    const targetType = scheduleEntry.classType.toLowerCase();
    const timeAndTypeMatch = classTime === scheduleEntry.time && classTypeName.includes(targetType);

    if (timeAndTypeMatch && scheduleEntry.instructor) {
      const hasInstructor = c.instructors.some((i) =>
        i.name.toLowerCase().includes(scheduleEntry.instructor!.toLowerCase()),
      );
      if (!hasInstructor) {
        logs.push(
          `Skipping class (instructor mismatch: ${c.instructors.map((i) => i.name).join(', ')} ≠ ${scheduleEntry.instructor})`,
        );
        return false;
      }
    }

    return timeAndTypeMatch;
  });

  if (!matchingClass) {
    logs.push('No matching class found');
    return { booked: false, waitlisted: false };
  }

  const instructor = matchingClass.instructors[0]?.name || 'Unknown';
  logs.push(`Found class: ${matchingClass.class_type.name} with ${instructor} (ID: ${matchingClass.id})`);

  // Waitlist-only mode (second cron run)
  if (action === 'waitlist') {
    logs.push('Waitlist mode - joining waitlist directly');
    const result = await joinWaitlist(token, matchingClass.id, membershipId);
    if (result.success) {
      logs.push('Joined waitlist successfully');
      return { booked: false, waitlisted: true };
    }
    logs.push(`Waitlist failed: ${result.error}`);
    return { booked: false, waitlisted: false };
  }

  if (matchingClass.layout_format !== 'pick-a-spot') {
    logs.push(`Class is ${matchingClass.layout_format}, not pick-a-spot - joining waitlist`);
    const result = await joinWaitlist(token, matchingClass.id, membershipId);
    if (result.success) {
      logs.push('Joined waitlist successfully');
      return { booked: false, waitlisted: true };
    }
    logs.push(`Waitlist failed: ${result.error}`);
    return { booked: false, waitlisted: false };
  }

  logs.push('Fetching spot layout...');
  const classWithLayout = await getClassWithLayout(token, matchingClass.id);

  if (!classWithLayout.layout?.spots) {
    logs.push('No layout found');
    return { booked: false, waitlisted: false };
  }

  const spots = classWithLayout.layout.spots;
  logs.push(`Found ${spots.length} spots, ${spots.filter((s) => s.is_available).length} available`);

  for (const preferredSpot of scheduleEntry.preferredSpots) {
    const spot = spots.find((s) => s.name === preferredSpot && s.is_available);
    if (spot) {
      logs.push(`Attempting to book spot ${spot.name}...`);
      const result = await bookSpot(token, matchingClass.id, spot.id, membershipId);

      if (result.success) {
        logs.push(`SUCCESS! Booked spot ${spot.name}`);
        return { booked: true, waitlisted: false };
      }
      logs.push(`Failed to book spot ${spot.name}: ${result.error}`);
    }
  }

  logs.push('No preferred spots available, joining waitlist...');
  const waitlistResult = await joinWaitlist(token, matchingClass.id, membershipId);

  if (waitlistResult.success) {
    logs.push('Joined waitlist successfully');
    return { booked: false, waitlisted: true };
  }
  logs.push(`Waitlist failed: ${waitlistResult.error}`);
  return { booked: false, waitlisted: false };
}

// =============================================================================
<<<<<<<< HEAD:src/app/api/book/route.ts
// Next.js App Router Handler
========
// Cron trigger helper
>>>>>>>> b52dc9a (feat: move booking cron to local Bun server with Cloudflare Tunnel):server/index.ts
// =============================================================================

async function runBooking(action: 'book' | 'waitlist') {
  const logs: string[] = [];
  const startTime = Date.now();
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  logs.push(`[CRON] ${action} triggered at ${timestamp}`);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[CRON] ${action.toUpperCase()} triggered at ${timestamp}`);

  try {
    const result = await bookClass(logs, action);
    const duration = Date.now() - startTime;
    logs.push(`Completed in ${duration}ms`);

    for (const log of logs) console.log(`  ${log}`);
    console.log(`  Result: booked=${result.booked}, waitlisted=${result.waitlisted}`);
  } catch (error) {
    logs.push(`ERROR: ${error}`);
    for (const log of logs) console.log(`  ${log}`);
  }
  console.log('='.repeat(60));
}

// =============================================================================
// Cron Jobs - 12:00 PM and 12:01 PM Chicago time
// =============================================================================

cron.schedule('0 12 * * *', () => runBooking('book'), {
  timezone: 'America/Chicago',
});

cron.schedule('1 12 * * *', () => runBooking('waitlist'), {
  timezone: 'America/Chicago',
});

console.log('Cron jobs scheduled:');
console.log('  - Book:     12:00 PM Chicago time daily');
console.log('  - Waitlist: 12:01 PM Chicago time daily');

// =============================================================================
// HTTP Server
// =============================================================================

function json(data: unknown, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin');

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── /api/settings ──
    if (url.pathname === '/api/settings') {
      if (req.method === 'GET') {
        try {
          const config = loadScheduleConfig();
          return json(config, 200, origin);
        } catch (error) {
          return json({ error: String(error) }, 500, origin);
        }
      }

      if (req.method === 'PUT') {
        try {
          const body = await req.json();
          saveScheduleConfig(body);
          return json({ success: true }, 200, origin);
        } catch (error) {
          const msg = String(error);
          const status = msg.includes('Invalid') || msg.includes('must be') ? 400 : 500;
          return json({ error: msg }, status, origin);
        }
      }
    }

    // ── /api/book ──
    if (url.pathname === '/api/book') {
      const action = (url.searchParams.get('action') as 'book' | 'waitlist') || 'book';
      const logs: string[] = [];
      const startTime = Date.now();

      logs.push(`Booking triggered at ${new Date().toISOString()}`);

      try {
        const result = await bookClass(logs, action);
        const duration = Date.now() - startTime;
        logs.push(`Completed in ${duration}ms`);

        return json({ success: true, booked: result.booked, waitlisted: result.waitlisted, logs }, 200, origin);
      } catch (error) {
        logs.push(`ERROR: ${error}`);
        const duration = Date.now() - startTime;
        logs.push(`Failed after ${duration}ms`);

        return json({ success: false, error: String(error), logs }, 500, origin);
      }
    }

    // ── Health check ──
    if (url.pathname === '/health') {
      return json({ status: 'ok', uptime: process.uptime() }, 200, origin);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
});

console.log(`\nServer running on http://localhost:${PORT}`);
console.log('Endpoints:');
console.log(`  GET  http://localhost:${PORT}/api/settings`);
console.log(`  PUT  http://localhost:${PORT}/api/settings`);
console.log(`  GET  http://localhost:${PORT}/api/book`);
console.log(`  GET  http://localhost:${PORT}/api/book?action=waitlist`);
console.log(`  GET  http://localhost:${PORT}/health`);
