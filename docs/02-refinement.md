# Settings Feature — Refinement (REFINE)

**Date:** 2026-02-13

## Current Approach

Simple Vercel serverless app with:
- `api/book.ts` — booking logic
- `config/schedule.json` — schedule config
- No frontend currently

## Proposed Solution

Add:
- `api/settings.ts` — GET/PUT endpoint for config
- `public/settings.html` — static HTML UI (no build step needed)
- Update `vercel.json` — route `/settings` to the HTML file

## Design Decisions

### Why static HTML instead of React/Next.js?
- No build complexity — just serve a static file
- Faster to develop and deploy
- Sufficient for single-user tool
- Mobile-friendly with responsive CSS

### Why file-based storage?
- Single user, low traffic
- No database complexity
- Easy to backup (just the JSON file)
- Vercel persists files between serverless calls in the `/tmp` or project dir

### Validation Strategy
- Client-side: Basic validation in HTML (required fields, number constraints)
- Server-side: Validate JSON structure before writing

## Edge Cases to Handle

1. **Corrupted config file** → Return error, don't crash
2. **Missing config file** → Return empty schedule template
3. **Invalid dayOfWeek** → Client validates (0-6)
4. **Empty schedules array** → Valid, just show "no classes"

## UI/UX Decisions

- Group classes by day of week
- Use 12-hour time format for display (easier to read)
- Bottom-sheet style modal for mobile editing
- Pink/coral accent color to match fitness vibe
- "Add Class" button always visible at bottom