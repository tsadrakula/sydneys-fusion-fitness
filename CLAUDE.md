# Sydney's Fusion Fitness Auto-Booker

Automatically books Sydney's preferred spots at Fusion Fitness / Sweat Lab classes.

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4, Motion (framer-motion)
- **Platform:** Vercel (serverless functions + cron)
- **Language:** TypeScript
- **Package Manager:** Bun
- **API:** Marianatek (Fusion Fitness booking platform)

## Project Structure

```
src/
  app/
    page.tsx            # Dashboard - next class card, weekly schedule
    layout.tsx          # Root layout with coral/cream theme
    globals.css         # Tailwind v4 imports + custom properties
    api/
      settings/route.ts # GET/PUT schedule config
    settings/
      page.tsx          # Settings page - add/edit/delete classes
  lib/
    settings.ts         # Shared types, config read/write, helpers

api/
  book.ts               # Serverless function - all booking logic (Vercel function)

config/
  schedule.json         # Class schedule configuration
```

## How It Works

### Booking (api/book.ts)
Vercel Cron triggers `/api/book` at **12:00 PM and 12:01 PM CST** daily.

The function:
1. Calculates target date (14 days out)
2. Finds scheduled class for that day of week
3. Authenticates with Marianatek (OAuth refresh token)
4. Fetches available classes
5. Matches class by type + time
6. Books best available spot from preferred list
7. Falls back to waitlist if no preferred spots available

### Cron Schedule
Configured in `vercel.json`:
- `0 18 * * *` (18:00 UTC = 12:00 PM CST)
- `1 18 * * *` (18:01 UTC = 12:01 PM CST)

**Note:** During daylight saving time (CDT), 12:00 PM = 17:00 UTC. Adjust cron if needed.

### Settings UI
- Dashboard (`/`) shows next upcoming class and weekly schedule
- Settings (`/settings`) allows CRUD operations on schedule
- API (`/api/settings`) validates and persists to `config/schedule.json`

## Schedule Configuration

**File:** `config/schedule.json`

```json
{
  "schedules": [
    {
      "dayOfWeek": 2,        // 0=Sun, 1=Mon, ..., 6=Sat
      "time": "05:30",       // 24h format, local time
      "classType": "SCULPT", // Partial match
      "location": "sweat-lab",
      "preferredSpots": ["8", "9", "6", "15"],
      "instructor": "Erica"  // Optional filter
    }
  ],
  "locations": {
    "sweat-lab": { "id": "48718", "region": "48541" },
    "fusion-fitness": { "id": "48717", "region": "48541" }
  }
}
```

## Environment Variables (Vercel Dashboard)

| Variable | Description |
|----------|-------------|
| `MARIANA_CLIENT_ID` | Marianatek OAuth client ID |
| `MARIANA_REFRESH_TOKEN` | OAuth refresh token |
| `MEMBERSHIP_ID` | Sydney's membership ID |

## Commands

```bash
# Install dependencies
bun install

# Development server (Turbopack)
bun dev

# Production build
bun run build

# Start production server
bun start

# Lint
bun lint
```

## Deployment

Push to `main` branch → Vercel auto-deploys.

Cron jobs only run in production, not preview deployments.

## Testing Locally

```bash
# Run Next.js dev server
bun dev

# For testing booking function locally
bun add -g vercel
vercel dev
```

Visit `http://localhost:3000` for dashboard, `http://localhost:3000/api/book` to trigger booking manually.

## Design Notes

- Color scheme: coral (#e8829a) / cream (#fef7f0)
- Mobile-first responsive design
- Bottom-sheet modal for add/edit on settings page
- Class emoji: 💪 Sculpt, 🔥 S+S, 💧 Sweat Lab, 🌊 Drenched
- Motion animations with spring physics for modals