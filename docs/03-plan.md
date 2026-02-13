# Settings Feature — Implementation Plan (PLAN)

**Date:** 2026-02-13

## Architecture

```
config/schedule.json  ←→  /api/settings (GET/PUT)  ←→  /settings.html (static UI)
```

Simple file-based config. No database, no build step for frontend.

## API Design

### GET /api/settings
- Returns current `config/schedule.json` content
- Response: `{ schedules: [...], locations: {...} }`
- Status: 200 (success), 500 (file error)

### PUT /api/settings
- Accepts JSON body with full schedule config
- Validates structure before writing
- Response: `{ success: true }` or `{ error: string }`
- Status: 200 (success), 400 (validation), 500 (file error)

## File Structure

```
api/
  book.ts          — existing booking logic
  settings.ts      — NEW: GET/PUT config endpoint
config/
  schedule.json    — existing schedule config
docs/
  01-requirements.md
  02-refinement.md
  03-plan.md
public/
  settings.html    — NEW: settings UI
vercel.json         — update with route
```

## UI Components

1. **Header** — "My Class Schedule" title
2. **Day Groups** — Classes grouped by day (Sun-Sat)
3. **Class Cards** — Time, type, location, spots, instructor
4. **Edit Modal** — Bottom-sheet style for mobile
5. **Actions** — Add, Edit, Delete buttons

## Implementation Order

1. Create `api/settings.ts` (GET/PUT)
2. Create `public/settings.html` (UI)
3. Update `vercel.json` (routing)
4. Test locally with `vercel dev`
5. Commit and push
6. Verify deployment