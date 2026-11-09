import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyKm, loadMetrics, decoupling, predictRaces, intensityDistribution, conservativeWorkout, type Act } from './analytics.ts';

const now = new Date('2026-11-09T12:00:00Z');
const mk = (d: number, km: number, hr = 140): Act => ({ id: `s${d}`, startTime: new Date(now.getTime() - d * 86400000).toISOString(), distanceM: km * 1000, durationS: km * 330, avgHr: hr });
const acts = [1, 3, 5, 8, 10, 12, 15, 20].map(d => mk(d, 10)); // SYNTHETIC

test('weekly mileage', () => assert.deepEqual(weeklyKm(acts, 2, now), [30, 30]));
test('load metrics', () => { const m = loadMetrics(acts, 193, now); assert.ok(m.acute > 0 && m.chronic > 0 && m.acwr! > 0); });
test('intensity buckets', () => assert.equal(intensityDistribution([mk(1, 10, 180)], 193).high, 10));
test('decoupling detects drift', () => {
  const s = [0, 1, 2, 3].map(i => ({ distanceM: 1000, durationS: 330, avgHr: 140 + i * 5 }));
  assert.ok(decoupling(s)! > 0);
  assert.equal(decoupling(s.slice(0, 2)), null);
});
test('marathon refuses 5K-only basis', () => {
  const r = predictRaces([{ distanceM: 5000, timeS: 1313, date: '2026-10-20' }], 70, now);
  assert.ok('unavailable' in r.Marathon);
  assert.ok('mid' in r['10K']);
});
test('marathon from 10K+ is ordered', () => {
  const r = predictRaces([{ distanceM: 21097, timeS: 5603, date: '2026-10-01' }], 70, now).Marathon as any;
  assert.ok(r.low > r.mid && r.mid > r.high);
});
test('few activities gives no prescription', () => assert.equal(conservativeWorkout(acts.slice(0, 2), 193, now).reason, 'data'));
test('recent hard session forces easy', () => assert.match(conservativeWorkout([...acts, mk(1, 12, 175)], 193, now).title, /Easy/));
