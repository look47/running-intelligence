import { db, OWNER } from './db';
import { GarminHttpSource, type GarminSource } from './garmin/client';

const LIMIT = 100, sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e: any) { if (!e.retry || i >= n - 1) throw e; await sleep(500 * 2 ** i); }
  }
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Backfill (until complete): resumable 2-year import in pages of 100; the offset is kept in a 'backfill' sync_logs row.
 * Afterwards: incremental, last 21 days each run (overlap catches edits). Upserts on (user, garmin id): duplicate-safe.
 */
export async function runSync(source: GarminSource = new GarminHttpSource(), maxPages = 5) {
  const sb = db(), user = OWNER();
  const { data: log } = await sb.from('sync_logs').insert({ user_id: user, kind: 'activities', status: 'running' }).select('id').single();
  let imported = 0;
  try {
    const { data: bf } = await sb.from('sync_logs').select('id,status,imported').eq('user_id', user).eq('kind', 'backfill').maybeSingle();
    const backfilling = bf?.status !== 'done';
    let offset = backfilling ? bf?.imported ?? 0 : 0, done = !backfilling;
    const startDate = ymd(new Date(Date.now() - (backfilling ? 730 : 21) * 864e5)), endDate = ymd(new Date(Date.now() + 864e5));
    for (let p = 0; p < maxPages; p++) {
      const items = await retry(() => source.fetchActivities({ startDate, endDate, start: offset, limit: LIMIT }));
      const rows = items.filter(a => a.start_time).map(a => ({ ...a, user_id: user }));
      if (rows.length) {
        const { error } = await sb.from('activities').upsert(rows, { onConflict: 'user_id,garmin_activity_id' });
        if (error) throw new Error(error.message);
        imported += rows.length;
      }
      offset += items.length;
      if (items.length < LIMIT) { done = true; break; }
    }
    if (backfilling) await sb.from('sync_logs').upsert({ ...(bf ? { id: bf.id } : {}), user_id: user, kind: 'backfill', status: done ? 'done' : 'partial', imported: offset });
    await sb.from('sync_logs').update({ status: 'ok', imported, finished_at: new Date().toISOString() }).eq('id', log!.id);
    return { ok: true, imported, mode: backfilling ? (done ? 'backfill-complete' : 'backfill-partial: call again') : 'incremental' };
  } catch (e: any) {
    await sb.from('sync_logs').update({ status: 'error', imported, error: String(e.message).slice(0, 500), finished_at: new Date().toISOString() }).eq('id', log!.id);
    return { ok: false, imported, error: e.message as string };
  }
}
