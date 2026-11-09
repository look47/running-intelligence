export interface Split { distanceM: number; durationS: number; avgHr?: number }
export interface Act {
  id: string; startTime: string; distanceM: number; durationS: number;
  avgHr?: number; trainingLoad?: number; elevationGainM?: number; splits?: Split[];
}
const DAY = 86400000;
const t = (a: Act) => new Date(a.startTime).getTime();

export function weeklyKm(acts: Act[], weeks: number, now = new Date()) {
  const out: number[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = now.getTime() - w * 7 * DAY, start = end - 7 * DAY;
    out.push(acts.filter(a => t(a) > start && t(a) <= end).reduce((s, a) => s + a.distanceM, 0) / 1000);
  }
  return out;
}
export const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);

/** Session load: Garmin value if present, else duration(min) x intensity factor from avg HR / maxHR. Flagged by source. */
export function sessionLoad(a: Act, maxHr: number) {
  if (a.trainingLoad != null) return { load: a.trainingLoad, source: 'garmin' as const };
  const f = a.avgHr ? Math.max(0.5, a.avgHr / maxHr) : 0.7;
  return { load: (a.durationS / 60) * f * f * 1.2, source: 'estimated' as const };
}
/** Rolling-average acute (7d) vs chronic (28d) load. ACWR is context only, not an injury predictor. */
export function loadMetrics(acts: Act[], maxHr: number, now = new Date()) {
  const daily: number[] = Array(28).fill(0);
  let estimated = 0;
  for (const a of acts) {
    const d = Math.floor((now.getTime() - t(a)) / DAY);
    if (d >= 0 && d < 28) { const s = sessionLoad(a, maxHr); daily[d] += s.load; if (s.source === 'estimated') estimated++; }
  }
  const acute = avg(daily.slice(0, 7)), chronic = avg(daily);
  const wk = daily.slice(0, 7), m = avg(wk), sd = Math.sqrt(avg(wk.map(x => (x - m) ** 2)));
  const monotony = sd > 0 ? m / sd : null;
  return { acute, chronic, acwr: chronic > 0 ? acute / chronic : null,
    monotony, strain: monotony ? monotony * wk.reduce((a, b) => a + b, 0) : null, estimatedSessions: estimated };
}
/** Approximation by activity average HR (no per-record data): easy <78%, moderate <87%, threshold <93%, high otherwise. */
export function intensityDistribution(acts: Act[], maxHr: number) {
  const z = { easy: 0, moderate: 0, threshold: 0, high: 0, unknown: 0 };
  for (const a of acts) {
    const km = a.distanceM / 1000;
    if (!a.avgHr) { z.unknown += km; continue; }
    const p = a.avgHr / maxHr;
    z[p < 0.78 ? 'easy' : p < 0.87 ? 'moderate' : p < 0.93 ? 'threshold' : 'high'] += km;
  }
  return z;
}
/** Aerobic decoupling: efficiency (speed/HR) first half vs second half, in %. Positive = drift. */
export function decoupling(splits: Split[]) {
  const ok = splits.filter(s => s.avgHr && s.durationS > 0);
  if (ok.length < 4) return null;
  const ef = (xs: Split[]) => {
    const d = xs.reduce((a, s) => a + s.distanceM, 0), tt = xs.reduce((a, s) => a + s.durationS, 0);
    return d / tt / avg(xs.map(s => s.avgHr!));
  };
  const h = Math.floor(ok.length / 2), e1 = ef(ok.slice(0, h)), e2 = ef(ok.slice(h));
  return ((e1 - e2) / e1) * 100;
}
export const isLongRun = (a: Act) => a.distanceM >= 18000 || a.durationS >= 5400;

export interface Effort { distanceM: number; timeS: number; date: string }
const TARGETS = { '5K': 5000, '10K': 10000, Half: 21097.5, Marathon: 42195 } as const;
export interface Prediction { low: number; mid: number; high: number; confidence: 'low' | 'medium'; basis: string }
/** Riegel-based ranges from efforts in the last 12 weeks. Marathon needs a >=10K effort and ~weekly volume; never from 5K alone. */
export function predictRaces(efforts: Effort[], avgWeeklyKm: number, now = new Date()) {
  const recent = efforts.filter(e => now.getTime() - new Date(e.date).getTime() < 84 * DAY);
  const res: Record<string, Prediction | { unavailable: string }> = {};
  for (const [name, dist] of Object.entries(TARGETS)) {
    const usable = recent.filter(e => e.distanceM >= dist * 0.4 && e.distanceM <= dist * 2.5);
    const pool = name === 'Marathon' ? usable.filter(e => e.distanceM >= 10000) : usable;
    if (!pool.length) { res[name] = { unavailable: name === 'Marathon' ? 'needs a recent effort of at least 10 km' : 'no comparable recent effort' }; continue; }
    const best = pool.reduce((b, e) => (e.timeS / e.distanceM < b.timeS / b.distanceM ? e : b));
    const at = (k: number) => best.timeS * (dist / best.distanceM) ** k;
    const marathon = name === 'Marathon';
    const volPenalty = marathon && avgWeeklyKm < 60 ? 1.03 : 1;
    res[name] = { low: at(marathon ? 1.1 : 1.07) * volPenalty, mid: at(marathon ? 1.07 : 1.06) * volPenalty, high: at(marathon ? 1.05 : 1.045),
      confidence: marathon || Math.abs(Math.log(dist / best.distanceM)) > 0.7 ? 'low' : 'medium',
      basis: `${(best.distanceM / 1000).toFixed(1)} km on ${best.date.slice(0, 10)}` };
  }
  return res;
}

/** Conservative fallback only. Explains itself; the coach makes the final call. */
export function conservativeWorkout(acts: Act[], maxHr: number, now = new Date()) {
  const last7 = acts.filter(a => now.getTime() - t(a) < 7 * DAY);
  const hard = acts.filter(a => a.avgHr && a.avgHr / maxHr >= 0.87 && now.getTime() - t(a) < 3 * DAY);
  const lm = loadMetrics(acts, maxHr, now);
  if (acts.length < 5) return { title: 'Insufficient data', detail: 'Fewer than 5 activities imported; no prescription.', reason: 'data' };
  if (hard.length || (lm.acwr ?? 0) > 1.5) return { title: 'Easy run 40-60 min or rest', detail: 'Easy effort, HR below 78% max.', reason: hard.length ? 'hard session in last 72h' : 'acute load well above chronic' };
  return { title: 'Easy to steady run', detail: 'Easy 60-75 min; quality session only if you confirm the plan and feel fresh.', reason: `${last7.length} runs in last 7 days, load ratio ${lm.acwr?.toFixed(2) ?? 'n/a'}` };
}
