# Sydney's Fusion Fitness Auto-Booker

Automatically books Sydney's preferred spots at Fusion Fitness / Sweat Lab classes.

## Tech Stack
- **Platform:** Vercel Serverless Functions
- **Language:** TypeScript
- **API:** Marianatek (Fusion Fitness booking platform)

## How It Works

Vercel Cron triggers `/api/book` at **12:00 PM and 12:01 PM CST** daily.

The function:
1. Calculates target date (14 days out)
2. Finds scheduled class for that day of week
3. Authenticates with Marianatek (OAuth refresh token)
4. Fetches available classes
5. Matches class by type + time
6. Books best available spot from preferred list
7. Falls back to waitlist if no preferred spots available

## Cron Schedule

Configured in `vercel.json`:
- `0 18 * * *` (18:00 UTC = 12:00 PM CST)
- `1 18 * * *` (18:01 UTC = 12:01 PM CST)

**Note:** During daylight saving time (CDT), 12:00 PM = 17:00 UTC. Adjust cron if needed.

## Schedule Configuration

**File:** `config/schedule.json`

```json
{
  "schedules": [
    {
      "dayOfWeek": 2,        // 0=Sun, 1=Mon, ..., 6=Sat
      "time": "05:30",       // 24h format, UTC
      "classType": "SCULPT", // Partial match
      "location": "sweat-lab",
      "preferredSpots": ["8", "9", "6", "15"]
    }
  ],
  "locations": {
    "sweat-lab": { "id": "48718", "region": "48541" },
    "fusion-fitness": { "id": "48717", "region": "48541" }
  }
}
```

## Project Structure

```
api/
  book.ts          # Serverless function - all booking logic
config/
  schedule.json    # Class schedule configuration
vercel.json        # Cron configuration
```

## Environment Variables (Vercel Dashboard)

| Variable | Description |
|----------|-------------|
| `MARIANA_CLIENT_ID` | Marianatek OAuth client ID |
| `MARIANA_REFRESH_TOKEN` | OAuth refresh token |
| `MEMBERSHIP_ID` | Sydney's membership ID |

## Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Cron jobs only run in production, not preview deployments.

## Testing Locally

```bash
# Install Vercel CLI
bun add -g vercel

# Run locally (cron won't trigger, but you can hit /api/book manually)
vercel dev
```

Then visit `http://localhost:3000/api/book` to trigger manually.
