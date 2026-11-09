import test from 'node:test';
import assert from 'node:assert/strict';
import { GarminHttpSource, jwtExp, mapActivity } from './client.ts';

process.env.GARMIN_PERSONAL_API_KEY = 'fake-test-key';
const jwt = (exp: number) => `x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.y`;

test('jwt exp', () => { assert.equal(jwtExp(jwt(123)), 123); assert.equal(jwtExp('bad'), null); });
test('mapActivity handles GMT string', () => {
  const a = mapActivity({ activityId: 9, startTimeGMT: '2026-11-01 07:00:00', distance: 10000, duration: 3000, averageHR: 150, activityType: { typeKey: 'running' } });
  assert.equal(a.garmin_activity_id, '9'); assert.equal(a.start_time, '2026-11-01T07:00:00Z'); assert.equal(a.sport, 'running');
});
test('exchanges key with ApiKey header, uses Bearer, re-exchanges once on 401', async () => {
  const calls: { url: string; auth: string }[] = [];
  let n401 = 0;
  const fake = (async (url: any, init: any) => {
    const auth = init?.headers?.Authorization; calls.push({ url: String(url), auth });
    if (init?.method === 'POST') return new Response(JSON.stringify({ access_token: jwt(Date.now() / 1000 + 86400) }), { status: 200 });
    if (n401++ === 0) return new Response('', { status: 401 });
    return new Response(JSON.stringify([{ activityId: 1, startTimeGMT: '2026-11-01 07:00:00' }]), { status: 200 });
  }) as typeof fetch;
  const items = await new GarminHttpSource(fake).fetchActivities({ startDate: '2026-01-01', endDate: '2026-11-10', start: 0, limit: 100 });
  assert.equal(items.length, 1);
  assert.equal(calls[0].auth, 'ApiKey fake-test-key');
  assert.match(calls[0].url, /personalapitoken-service/);
  assert.ok(calls.filter(c => c.url.includes('activitylist-service')).every(c => c.auth.startsWith('Bearer ')));
  assert.equal(calls.filter(c => c.auth?.startsWith('ApiKey')).length, 2); // initial + forced refresh after 401
});
