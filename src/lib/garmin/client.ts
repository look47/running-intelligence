// Verified against Garmin's official Personal API FAQ and the Garmin client README:
//  - base https://personal.connectapi.garmin.com, token = POST /personalapitoken-service/personal-api/personal-api-key/token
//    with "Authorization: ApiKey <key>", valid 24h, no refresh tokens; data calls use "Authorization: Bearer <token>".
//  - activity list = GET /activitylist-service/activities/search/activities?start&limit&startDate&endDate
// UNVERIFIED (not in the docs I have): token response body shape, activity JSON field names. Raw JSON is stored
// in activities.raw so the mapping can be corrected later without re-downloading. Use /api/garmin/probe to inspect.
export interface RawActivity {
  garmin_activity_id: string; start_time: string; sport?: string; distance_m?: number; duration_s?: number;
  avg_hr?: number; max_hr?: number; elevation_gain_m?: number; training_load?: number; raw: unknown;
}
export interface ActivityQuery { startDate: string; endDate: string; start: number; limit: number }
export interface GarminSource { fetchActivities(q: ActivityQuery): Promise<RawActivity[]> }

const need = (k: string) => { const v = process.env[k]?.trim(); if (!v) throw new Error(`Missing env ${k}`); return v; };
const BASE = () => process.env.GARMIN_BASE_URL ?? 'https://personal.connectapi.garmin.com';

export function jwtExp(token: string): number | null {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).exp ?? null; } catch { return null; }
}
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined);

export function mapActivity(a: Record<string, any>): RawActivity {
  const gmt = a.startTimeGMT as string | undefined;
  const start = gmt ? (gmt.includes('T') ? gmt : gmt.replace(' ', 'T')) + (/[zZ]|[+-]\d\d:?\d\d$/.test(gmt) ? '' : 'Z') : a.startTimeLocal;
  return { garmin_activity_id: String(a.activityId), start_time: start, sport: a.activityType?.typeKey,
    distance_m: num(a.distance), duration_s: num(a.duration), avg_hr: num(a.averageHR), max_hr: num(a.maxHR),
    elevation_gain_m: num(a.elevationGain), training_load: num(a.activityTrainingLoad), raw: a };
}

export class GarminHttpSource implements GarminSource {
  private token?: { value: string; exp: number };
  private f: typeof fetch;
  constructor(f: typeof fetch = fetch) { this.f = f; }

  private async getToken(force = false) {
    const now = Date.now() / 1000;
    if (!force && this.token && this.token.exp - now > 3600) return this.token.value;
    const res = await this.f(`${BASE()}/personalapitoken-service/personal-api/personal-api-key/token`,
      { method: 'POST', headers: { Authorization: `ApiKey ${need('GARMIN_PERSONAL_API_KEY')}` } });
    if (!res.ok) throw new Error(`Garmin token exchange failed (${res.status}); key may be expired or deleted`);
    const text = (await res.text()).trim();
    let value = text;
    if (text.startsWith('{')) { const j = JSON.parse(text); value = j.access_token ?? j.accessToken ?? j.token; }
    if (!value) throw new Error('Garmin token response had no recognizable token');
    this.token = { value, exp: jwtExp(value) ?? now + 3600 * 2 };
    return value;
  }

  async get(path: string, params: Record<string, string | number> = {}): Promise<any> {
    const url = new URL(path, BASE());
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.f(url, { headers: { Authorization: `Bearer ${await this.getToken(attempt === 1)}` } });
      if (res.status === 401 && attempt === 0) continue; // token revoked early: re-exchange once
      if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`Garmin ${res.status}`), { retry: true });
      if (!res.ok) throw new Error(`Garmin ${res.status} on ${path}`);
      return res.status === 204 ? null : res.json();
    }
    throw new Error('Garmin rejected a fresh token (401)');
  }

  async fetchActivities(q: ActivityQuery) {
    const body = await this.get('/activitylist-service/activities/search/activities', q as unknown as Record<string, number>);
    const list: any[] = Array.isArray(body) ? body : body?.activities ?? [];
    return list.filter(a => a?.activityId != null).map(mapActivity);
  }
}
