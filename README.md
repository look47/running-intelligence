# Running Intelligence (backend core)

## Status
- Tested (synthetic fixtures): analytics in `src/lib/analytics.ts` (`npm test`).
- NOT tested: Garmin client, Supabase sync, API routes, typecheck/build (no network/credentials here).
- Verified from Garmin's official FAQ/README: base URL, token exchange (ApiKey header, 24h, no refresh), activity-list endpoint and its start/limit/startDate/endDate params. Unit-tested with a fake fetch only.
- Still UNVERIFIED: token response body shape and activity JSON field names. Call `GET /api/garmin/probe` after deploy and share the (redacted) output so the mapping can be confirmed. Raw JSON is stored in `activities.raw`.
- Wellness (HRV, sleep, Body Battery) endpoints are known but not yet imported.
- Not built: Supabase Auth login, dashboard/activity/training pages, laps/records/wellness import, in-app LLM coach, GPT Action OpenAPI route.

## Setup
1. Supabase: run `supabase/migrations/0001_init.sql`; create your user; insert a `profiles` row with that user id.
2. Vercel: import the repo, set the env vars in `.env.example` plus `OWNER_USER_ID`.
3. After deploy: `GET /api/garmin/probe`, then `POST /api/sync` repeatedly until it reports `backfill-complete`.
4. `npm install && npm run typecheck`, deploy, then `POST /api/sync` with header `X-API-Key`.

Endpoints: `GET /api/health`, `POST /api/sync`, `GET /api/cron/sync` (Vercel cron), `GET /api/coach/today`, `GET /api/coach/context`.
