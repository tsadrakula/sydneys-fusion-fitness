# Settings Feature — Requirements (VET)

**Date:** 2026-02-13
**Feature:** Class Schedule Settings UI & API
**Status:** Building

## Problem Statement

Sydney's workout auto-booking app has a hardcoded schedule in `config/schedule.json`. She needs a simple UI to view and edit her class schedule without editing JSON files manually.

## User

- **Primary:** Sydney (app owner/sole user)
- **Context:** Personal workout booking app, single-user, Vercel serverless

## Acceptance Criteria

1. User can view current schedule on a web page
2. User can edit each schedule entry (time, class type, location, spots, instructor)
3. User can add new schedule entries
4. User can delete schedule entries
5. Changes persist to config/schedule.json
6. UI is mobile-friendly (she'll use it on her phone)
7. Visual feedback on save (success/error message)

## Out of Scope

- Authentication (single-user, private deployment)
- Database (file-based storage is sufficient)
- History/undo
- Multiple user profiles