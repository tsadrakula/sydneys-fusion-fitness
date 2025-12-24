# Sydney's Fusion Fitness Auto-Booker Design

## Overview

NestJS application using Bun that automatically books Sydney's preferred spot in Fusion Fitness classes at exactly 12:01 PM CST daily, 14 days before each class.

## Tech Stack

- **Runtime/Package Manager**: Bun
- **Framework**: NestJS
- **Scheduling**: `@nestjs/schedule` (cron)
- **HTTP Client**: Bun native fetch

## API Endpoints

| Step | Endpoint | Method |
|------|----------|--------|
| Auth | `https://fusionfitness.marianatek.com/o/token/` | POST |
| List classes | `/api/customer/v1/classes?min_start_date=...&max_start_date=...&location=...&region=...` | GET |
| Get class + layout | `/api/customer/v1/classes/{class_id}` | GET |
| Book spot | `/api/customer/v1/me/reservations` | POST |

## Configuration

### Environment Variables (`.env`)

```env
MARIANA_CLIENT_ID=sbLziNCoF5HcOhkSV6zRL8O7betwd3mDDIQbWZa3
MARIANA_REFRESH_TOKEN=YUmj6qxsFiBMjzyIs82HL4D9xO58ie
MEMBERSHIP_ID=membership-2566
```

### Schedule Config (`config/schedule.json`)

```json
{
  "schedules": [
    {
      "dayOfWeek": 2,
      "time": "07:00",
      "classType": "STRENGTH + SWEAT",
      "location": "sweat-lab",
      "preferredSpots": ["8", "9", "6", "15"]
    },
    {
      "dayOfWeek": 4,
      "time": "08:30",
      "classType": "STRENGTH",
      "location": "sweat-lab",
      "preferredSpots": ["8", "9", "6", "15"]
    },
    {
      "dayOfWeek": 5,
      "time": "07:00",
      "classType": "SWEAT LAB",
      "location": "sweat-lab",
      "preferredSpots": ["8", "9", "6", "15"]
    },
    {
      "dayOfWeek": 6,
      "time": "08:00",
      "classType": "SCULPT",
      "location": "sweat-lab",
      "preferredSpots": ["8", "9", "6", "15"]
    }
  ],
  "locations": {
    "sweat-lab": {
      "id": "48718",
      "region": "48541"
    },
    "fusion-fitness": {
      "id": "48717",
      "region": "48541"
    }
  }
}
```

- `dayOfWeek`: 0=Sunday, 1=Monday, ... 6=Saturday
- `preferredSpots`: Tried in order; if all taken, joins waitlist

## Project Structure

```
sydneys-fusion-fitness/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   └── auth.service.ts          # Token refresh, caches access_token
│   │
│   ├── booking/
│   │   ├── booking.module.ts
│   │   ├── booking.service.ts       # Core booking logic
│   │   └── booking.scheduler.ts     # Cron job (12:01 PM CST)
│   │
│   ├── mariana/
│   │   ├── mariana.module.ts
│   │   └── mariana.service.ts       # API client using Bun fetch
│   │
│   └── config/
│       ├── config.module.ts
│       └── schedule.config.ts       # Loads schedule.json
│
├── config/
│   └── schedule.json
│
├── .env
├── bunfig.toml
├── package.json
└── tsconfig.json
```

## Booking Flow

```
12:01 PM CST daily
    │
    ▼
┌─────────────────┐
│ Refresh Token   │ → Get fresh access_token
└────────┬────────┘
         ▼
┌─────────────────┐
│ Load Schedule   │ → Check what class to book for today + 14 days
└────────┬────────┘
         ▼
┌─────────────────┐
│ Find Class      │ → GET /api/customer/v1/classes?date=...
└────────┬────────┘
         ▼
┌─────────────────┐
│ Get Layout      │ → GET /api/customer/v1/classes/{id}
└────────┬────────┘
         ▼
┌─────────────────┐
│ Book Spot       │ → Try preferred spots in order, then waitlist
└─────────────────┘
```

### Detailed Logic

1. **authService.getAccessToken()** - Refresh if needed, return cached token

2. **marianaService.getClasses(targetDate, location)** - Fetch classes for target date

3. **Find matching class by:**
   - `class_type.name` contains `scheduleEntry.classType`
   - `start_time` matches `scheduleEntry.time`
   - `layout_format === "pick-a-spot"`

4. **marianaService.getClassWithLayout(classId)** - Get full class with spot layout

5. **Find best available spot:**
   - Loop through `preferredSpots` array
   - Find spot where `name` matches AND `is_available === true`
   - Return first match

6. **If spot found:** Book it via POST to reservations

7. **If no preferred spots available:** Join waitlist

## Error Handling

| Scenario | Action |
|----------|--------|
| Token refresh fails | Log error, skip booking attempt |
| No matching class found | Log warning (holidays, etc.) |
| Class is `first-come-first-serve` | Log info, skip |
| All preferred spots taken | Join waitlist |
| Booking API returns error | Log error, retry once after 2s |
| Already booked for class | Log info, skip |
| Class is cancelled | Log info, skip |

## Types

```typescript
interface ScheduleEntry {
  dayOfWeek: number;
  time: string;
  classType: string;
  location: 'sweat-lab' | 'fusion-fitness';
  preferredSpots: string[];
}

interface MarianaClass {
  id: string;
  name: string;
  class_type: { id: string; name: string };
  start_date: string;
  start_time: string;
  layout_format: 'pick-a-spot' | 'first-come-first-serve';
  is_cancelled: boolean;
  is_user_reserved: boolean;
  layout?: MarianaLayout;
}

interface MarianaLayout {
  id: string;
  name: string;
  spots: MarianaSpot[];
}

interface MarianaSpot {
  id: string;
  name: string;
  is_available: boolean;
  x_position: number;
  y_position: number;
}

interface BookingRequest {
  class_session: { id: string };
  spot: { id: string };
  payment_option: { id: string };
  is_booked_for_me: boolean;
  reservation_type: 'standard' | 'waitlist';
}
```

## Key Constants

- **Membership ID**: `membership-2566`
- **Sweat Lab**: location `48718`, region `48541`
- **Fusion Fitness**: location `48717`, region `48541`
- **Client ID**: `sbLziNCoF5HcOhkSV6zRL8O7betwd3mDDIQbWZa3`
- **Cron**: `0 1 12 * * *` (12:01 PM CST / America/Chicago)
