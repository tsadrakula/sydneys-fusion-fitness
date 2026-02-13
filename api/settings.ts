import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'config', 'schedule.json');

export default async function handler(req: Request) {
  // CORS headers for local development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    if (req.method === 'GET') {
      const data = readFileSync(CONFIG_PATH, 'utf-8');
      return new Response(data, { status: 200, headers });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      
      // Validate structure
      if (!body || typeof body !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400, headers });
      }
      
      if (!Array.isArray(body.schedules)) {
        return new Response(JSON.stringify({ error: 'schedules must be an array' }), { status: 400, headers });
      }
      
      if (!body.locations || typeof body.locations !== 'object') {
        return new Response(JSON.stringify({ error: 'locations must be an object' }), { status: 400, headers });
      }
      
      // Validate each schedule entry
      for (const entry of body.schedules) {
        if (typeof entry.dayOfWeek !== 'number' || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
          return new Response(JSON.stringify({ error: 'Invalid dayOfWeek (must be 0-6)' }), { status: 400, headers });
        }
        if (!entry.time || typeof entry.time !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid time' }), { status: 400, headers });
        }
        if (!entry.classType || typeof entry.classType !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid classType' }), { status: 400, headers });
        }
        if (!entry.location || typeof entry.location !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid location' }), { status: 400, headers });
        }
        if (!Array.isArray(entry.preferredSpots)) {
          return new Response(JSON.stringify({ error: 'preferredSpots must be an array' }), { status: 400, headers });
        }
      }
      
      writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
}