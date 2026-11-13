const KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OWNER_USER_ID', 'SERVICE_API_SECRET', 'CRON_SECRET', 'GARMIN_PERSONAL_API_KEY'];
// Reports only whether each setting is present, never its value.
export const GET = () => Response.json({
  ok: true,
  time: new Date().toISOString(),
  settings: Object.fromEntries(KEYS.map(k => [k, !!process.env[k]?.trim()])),
});
