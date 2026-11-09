import { apiAuthorized, unauthorized } from '@/lib/auth';
import { GarminHttpSource } from '@/lib/garmin/client';
export const maxDuration = 60;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** Returns raw Garmin JSON so field names can be verified. Contains personal data: only for the key holder. */
export async function GET(req: Request) {
  if (!apiAuthorized(req)) return unauthorized();
  const g = new GarminHttpSource(), to = new Date(), from = new Date(Date.now() - 3 * 864e5);
  const tryGet = async (path: string, params = {}) => { try { return await g.get(path, params); } catch (e: any) { return { error: e.message }; } };
  return Response.json({
    activities: await tryGet('/activitylist-service/activities/search/activities', { start: 0, limit: 2 }),
    hrvSummaries: await tryGet(`/hrv-service/hrv/daily/${ymd(from)}/${ymd(to)}`),
    sleepSummaries: await tryGet('/sleep-service/sleep/dailySleepSummariesByDate', { startDate: ymd(from), endDate: ymd(to) }),
    dailySummaries: await tryGet('/usersummary-service/v2/dailysummaries', { startDate: ymd(from), endDate: ymd(to) }),
    heartRateZones: await tryGet('/biometric-service/heartRateZones/v2'),
  });
}
