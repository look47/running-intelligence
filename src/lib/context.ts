import { db, OWNER } from './db';
import { weeklyKm, avg, loadMetrics, intensityDistribution, conservativeWorkout, predictRaces, isLongRun, decoupling, type Act } from './analytics';

export async function buildContext() {
  const sb = db(), user = OWNER();
  const [{ data: prof }, { data: rows }, { data: sync }, { data: race }] = await Promise.all([
    sb.from('profiles').select('max_hr').eq('id', user).maybeSingle(),
    sb.from('activities').select('*').eq('user_id', user).gte('start_time', new Date(Date.now() - 400 * 864e5).toISOString()).order('start_time', { ascending: false }).limit(1000),
    sb.from('sync_logs').select('status,started_at,finished_at,imported,error').eq('user_id', user).order('started_at', { ascending: false }).limit(1),
    sb.from('races').select('name,race_date,distance_m,goal_time_s').eq('user_id', user).eq('is_active', true).order('race_date').limit(1),
  ]);
  const maxHr = prof?.max_hr ?? 193;
  const runs = (rows ?? []).filter(r => !r.sport || /run/i.test(r.sport));
  const acts: Act[] = runs.map(r => ({ id: r.garmin_activity_id, startTime: r.start_time, distanceM: +r.distance_m || 0, durationS: +r.duration_s || 0, avgHr: r.avg_hr ?? undefined, trainingLoad: r.training_load ?? undefined, elevationGainM: r.elevation_gain_m ?? undefined }));
  const wk = weeklyKm(acts, 12);
  const efforts = acts.filter(a => a.distanceM >= 4800).map(a => ({ distanceM: a.distanceM, timeS: a.durationS, date: a.startTime }));
  return {
    generatedAt: new Date().toISOString(), lastSync: sync?.[0] ?? null, activeRace: race?.[0] ?? null,
    dataQuality: { runsImported: acts.length, note: acts.length < 5 ? 'insufficient data' : 'ok', splitsAvailable: false, wellnessAvailable: false },
    weeklyKm12: wk, avgWeeklyKm: { w4: avg(wk.slice(-4)), w8: avg(wk.slice(-8)), w12: avg(wk) },
    load: loadMetrics(acts, maxHr), intensityKm28d: intensityDistribution(acts.filter(a => Date.now() - new Date(a.startTime).getTime() < 28 * 864e5), maxHr),
    longRuns: acts.filter(isLongRun).slice(0, 5).map(a => ({ date: a.startTime, km: a.distanceM / 1000, avgHr: a.avgHr ?? null, decoupling: a.splits ? decoupling(a.splits) : null })),
    recent: acts.slice(0, 14),
    racePredictions: predictRaces(efforts, wk.slice(-4).reduce((a, b) => a + b, 0) / 4),
    fallbackWorkout: conservativeWorkout(acts, maxHr),
  };
}
