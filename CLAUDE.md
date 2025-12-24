# Sydney's Fusion Fitness Auto-Booker

Automatically books Sydney's preferred spots at Fusion Fitness / Sweat Lab classes.

## Tech Stack
- **Runtime:** Bun
- **Framework:** NestJS
- **API:** Marianatek (Fusion Fitness booking platform)

## Booking Workflow

The app books classes **14 days in advance** using a two-stage approach:

### 12:00 PM CST - Pre-flight
1. Warm up auth token
2. Find target class for 14 days out
3. Locate best available spot from preferred list
4. **Attempt immediate booking** (in case booking opens at 12:00 PM)

### 12:01 PM CST - Retry
1. If 12:00 PM booking succeeded, skip
2. Otherwise, use cached class/spot data for fast booking
3. Fall back to full booking flow if spot was taken

## Schedule Configuration

**File:** `config/schedule.json`

Defines which classes to book by day of week:
- `dayOfWeek`: 0=Sunday, 1=Monday, ..., 6=Saturday
- `time`: Class start time (24h format, e.g., "05:30")
- `classType`: Partial match against class name (e.g., "SCULPT")
- `location`: "sweat-lab" or "fusion-fitness"
- `preferredSpots`: Array of spot numbers to try in order

## Key Files

| File | Purpose |
|------|---------|
| `src/booking/booking.scheduler.ts` | Cron jobs for 12:00/12:01 PM booking |
| `src/booking/booking.service.ts` | Core booking logic, class matching, spot selection |
| `src/mariana/mariana.service.ts` | Marianatek API client |
| `src/auth/auth.service.ts` | OAuth2 token management |
| `config/schedule.json` | Class schedule configuration |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MARIANA_CLIENT_ID` | Marianatek OAuth client ID |
| `MARIANA_REFRESH_TOKEN` | OAuth refresh token for authentication |
| `MEMBERSHIP_ID` | Sydney's membership ID for booking |
