'use client';
import { useCallback, useEffect, useState } from 'react';

const T = (s: number | null | undefined) => { if (s == null || !Number.isFinite(s)) return '—'; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const P = (distM: number, timeS: number) => { if (!Number.isFinite(distM) || distM <= 0 || !Number.isFinite(timeS) || timeS <= 0) return '—'; const t = Math.round(timeS / (distM / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}/km`; };
const PS = (s: number | null) => { if (s == null) return '—'; const t = Math.round(s); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') + '/km'; };
const N = (v: any, d = 0) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(d));
const D = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
const CSS = `body{margin:0}.wrap{max-width:1120px;margin:0 auto;padding:20px}.g{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.c{background:#161a20;border:1px solid #232933;border-radius:12px;padding:14px}.l{font-size:12px;color:#8b95a5;text-transform:uppercase;letter-spacing:.04em}.v{font-size:26px;font-weight:650;margin-top:4px}
.s{font-size:12px;color:#8b95a5;margin-top:2px}h2{font-size:15px;margin:22px 0 8px;color:#c7cdd8}.status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.status.ok{background:#123525;color:#73e0a0}.status.warning{background:#3b2e14;color:#f2c66d}.status.error{background:#401e24;color:#ff8b97}.diag{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.diagitem{background:#12161c;border:1px solid #252d38;border-radius:10px;padding:12px}.muted{color:#9aa5b4}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:7px 6px;text-align:right;border-bottom:1px solid #232933;white-space:nowrap}th:first-child,td:first-child{text-align:left}
.sc{overflow-x:auto}.nav{position:sticky;top:0;z-index:20;display:flex;gap:7px;overflow-x:auto;padding:10px 0;background:#0b0d10;border-bottom:1px solid #252d38;margin:8px 0 14px}.nav a{flex:0 0 auto;color:#b8c8e4;text-decoration:none;border:1px solid #303a49;border-radius:999px;padding:7px 11px;font-size:12px}.nav a:hover{background:#1b2635;color:#fff}.section{scroll-margin-top:64px}button{padding:10px 14px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-size:15px}.warn{color:#e5b04a}.ok{color:#5fd08a}`;

function Bars({ v }: { v: number[] }) {
  const mx = Math.max(1, ...v), w = 300 / v.length;
  return <svg viewBox="0 0 300 110" width="100%">{v.map((x, i) => <g key={i}><rect x={i * w + 3} y={95 - (x / mx) * 80} width={w - 6} height={(x / mx) * 80} rx="3" fill={i === v.length - 1 ? '#2563eb' : '#3b4a63'} />
    <text x={i * w + w / 2} y={108} fontSize="8" fill="#8b95a5" textAnchor="middle">{Math.round(x)}</text></g>)}</svg>;
}
function Spark({ v }: { v: number[] }) {
  if (v.length < 2) return <div className="s">pochi dati</div>;
  const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * 120},${30 - ((x - mn) / r) * 26}`).join(' ');
  return <svg viewBox="0 0 120 32" width="100%" height="32"><polyline points={pts} fill="none" stroke="#5fd08a" strokeWidth="2" /></svg>;
}

export default function Dashboard() {
  const [key, setKey] = useState(''); const [d, setD] = useState<any>(null); const [diag, setDiag] = useState<any>(null); const [err, setErr] = useState(''); const [syncMsg, setSyncMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [raceName, setRaceName] = useState(''); const [raceDate, setRaceDate] = useState(''); const [raceKm, setRaceKm] = useState('10'); const [raceTime, setRaceTime] = useState(''); const [raceDifficulty, setRaceDifficulty] = useState(''); const [raceMsg, setRaceMsg] = useState('');
  const load = useCallback(async (k: string) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/coach/context', { headers: { 'X-API-Key': k } });
      if (r.status === 401) { setErr('Password non valida'); setD(null); setDiag(null); try { sessionStorage.removeItem('ri_key'); } catch {} }
      else {
        if (!r.ok) { setErr(`Errore ${r.status} nel caricamento dei dati`); setD(null); }
        else { setD(await r.json()); try { sessionStorage.setItem('ri_key', k); } catch {} }
        try { const q = await fetch('/api/diagnostics', { headers: { 'X-API-Key': k } }); setDiag(q.ok ? await q.json() : { checks: [{ id: 'diagnostics', label: 'Diagnostica', status: 'error', detail: `Errore ${q.status}` }] }); } catch (e) { setDiag({ checks: [{ id: 'diagnostics', label: 'Diagnostica', status: 'error', detail: String(e) }] }); }
      }
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  }, []);
  useEffect(() => { let k = ''; try { k = sessionStorage.getItem('ri_key') || ''; } catch {} if (k) { setKey(k); load(k); } }, [load]);
  const sync = async () => { setBusy(true); setSyncMsg('Sincronizzazione in corso…'); try { const r = await fetch('/api/sync', { method: 'POST', headers: { 'X-API-Key': key } }); const j = await r.json(); setSyncMsg(r.ok && j.ok ? `Sync completato: ${j.imported} attività · ${j.mode}` : `Sync non completato: ${j.error ?? `HTTP ${r.status}`}`); } catch (e) { setSyncMsg('Errore sync: ' + String(e)); } await load(key); };
  const refresh = () => load(key);
  const saveRace = async () => {
    const parts = raceTime.trim().split(':').map(Number);
    const seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : NaN;
    const distanceM = Number(raceKm) * 1000;
    if (!raceName.trim() || !raceDate || !raceDifficulty || !Number.isFinite(seconds) || seconds <= 0) { setRaceMsg('Controlla nome, data, condizioni e tempo (mm:ss oppure hh:mm:ss).'); return; }
    setBusy(true); setRaceMsg('Salvataggio…');
    try { const r = await fetch('/api/race-results', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': key }, body: JSON.stringify({ name: raceName, date: raceDate, distanceM, timeS: seconds, courseDifficulty: raceDifficulty }) }); const j = await r.json(); if (!r.ok) setRaceMsg(j.error || `Errore ${r.status}`); else { setRaceMsg('Gara salvata. Previsioni aggiornate.'); setRaceName(''); setRaceTime(''); setRaceDifficulty(''); await load(key); } } catch (e) { setRaceMsg(String(e)); }
    setBusy(false);
  };

  if (!d) return <div className="wrap"><style>{CSS}</style><h1>Running Intelligence</h1>
    <p>Inserisci la tua password (SERVICE_API_SECRET). Resta nella sessione corrente del browser.</p>
    <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Password" style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, boxSizing: 'border-box' }} />
    <p><button disabled={busy || !key} onClick={() => load(key)}>{busy ? 'Carico...' : 'Entra'}</button></p>{err && <p className="warn">{err}</p>}
    {diag?.checks && <div className="c" style={{ marginTop: 16 }}><b>Diagnostica</b><div className="diag" style={{ marginTop: 10 }}>{diag.checks.map((c: any) => <div className="diagitem" key={c.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{c.label}</b><span className={`status ${c.status}`}>{c.status === 'ok' ? 'OK' : c.status === 'warning' ? 'Avviso' : 'Errore'}</span></div><div className="s" style={{ marginTop: 8 }}>{c.detail}</div></div>)}</div></div>}</div>;

  const race = d.activeRace, days = race ? Math.ceil((new Date(race.race_date).getTime() - Date.now()) / 864e5) : null;
  const rec = d.recovery, last = d.recent[0], pr = d.predictions, mar = pr?.Maratona;
  const chrono = (k: string) => rec.days.map((x: any) => x[k]).filter((x: any) => typeof x === 'number').reverse();
  const wk0 = d.weeklyKm12[d.weeklyKm12.length - 1];
  return <div className="wrap"><style>{CSS}</style>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Running Intelligence</h1><button disabled={busy} onClick={sync}>{busy ? '...' : 'Sincronizza'}</button></div>
    <div className="s">Ultimo sync: {d.lastSync ? new Date(d.lastSync.started_at).toLocaleString('it-IT') + ' (' + d.lastSync.status + ')' : 'mai'} · FC max usata: {d.maxHr}</div>
    <nav className="nav" aria-label="Navigazione dashboard">
      <a href="#overview">Panoramica</a><a href="#workout">Allenamento</a><a href="#recovery">Recupero</a><a href="#effort">FC e sforzo</a><a href="#predictions">Previsioni</a><a href="#activities">Corse</a><a href="#long-runs">Lunghi</a><a href="#system">Sistema</a><a href="/admin">Admin ↗</a>
    </nav>
    <div id="system" className="c section" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><div><div className="l">Controllo sistema</div><div style={{ fontSize: 17, fontWeight: 650, marginTop: 4 }}>{diag ? (diag.summary?.errors ? 'Ci sono problemi da verificare' : diag.summary?.warnings ? 'Sistema operativo con avvisi' : 'Controlli superati') : 'Diagnostica non ancora eseguita'}</div></div><button disabled={busy} onClick={refresh}>{busy ? 'Controllo…' : 'Ricontrolla tutto'}</button></div>
      {diag?.checks && <div className="diag" style={{ marginTop: 12 }}>{diag.checks.map((c: any) => <div className="diagitem" key={c.id}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b>{c.label}</b><span className={`status ${c.status}`}>{c.status === 'ok' ? 'OK' : c.status === 'warning' ? 'Avviso' : 'Errore'}</span></div><div className="s" style={{ marginTop: 8, lineHeight: 1.5 }}>{c.detail}</div></div>)}</div>}
      {diag?.checkedAt && <div className="s" style={{ marginTop: 8 }}>Verificato: {new Date(diag.checkedAt).toLocaleString('it-IT')}</div>}
      {syncMsg && <div className="s" style={{ marginTop: 8, color: syncMsg.startsWith('Sync completato') ? '#73e0a0' : '#f2c66d' }}>{syncMsg}</div>}
    </div>

    {race && <div className="c" style={{ marginTop: 12 }}><div className="l">{race.name} · {new Date(race.race_date).toLocaleDateString('it-IT')}</div>
      <div className="v">{days} giorni</div><div className="s">Obiettivo {race.goal_time_s ? `${T(race.goal_time_s)} (${P(race.distance_m, race.goal_time_s)})` : 'tempo non impostato'}
        {mar && !mar.unavailable && mar.meanS != null && race.goal_time_s != null && <> · previsione media semplice {T(mar.meanS)} ({mar.meanS - race.goal_time_s >= 0 ? '+' : '−'}{T(Math.abs(mar.meanS - race.goal_time_s))})</>}</div></div>}

    <h2 id="overview" className="section">Questa settimana</h2>
    <div className="g">
      <div className="c"><div className="l">Km ultimi 7 gg</div><div className="v">{N(wk0, 1)}</div><div className="s">media 4 sett.: {N(d.avgWeeklyKm.w4, 1)}</div></div>
      <div className="c"><div className="l">Carico 7g / media 21g precedenti</div><div className="v">{N(d.load.acute)} / {N(d.load.chronic)}</div><div className="s">rapporto {N(d.load.acwr, 2)} · {d.load.source}</div></div>
      <div className="c"><div className="l">Ultima corsa</div><div className="v">{last ? N(last.distanceM / 1000, 1) + ' km' : '—'}</div><div className="s">{last && `${D(last.startTime)} · ${P(last.distanceM, last.durationS)} · FC ${N(last.avgHr)}`}</div></div>
      <div className="c"><div className="l">Km per fascia FC media (28g)</div><div className="v" style={{ fontSize: 20 }}>{Math.round(d.intensityKm28d.easy)} / {Math.round(d.intensityKm28d.moderate)} / {Math.round(d.intensityKm28d.threshold)} km</div><div className="s">classificazione dell’intera seduta, NON tempo in zona</div></div>
    </div>
    <div className="c" style={{ marginTop: 12 }}><div className="l">Km per settimana (12 sett.)</div><Bars v={d.weeklyKm12} /></div>

    <h2 id="workout" className="section">Allenamento di oggi</h2>
    <div className="c"><div className="v" style={{ fontSize: 20 }}>{d.fallbackWorkout.title}</div><div>{d.fallbackWorkout.detail}</div><p><b>Riscaldamento:</b> {d.fallbackWorkout.warmup}</p><p><b>Parte centrale:</b> {d.fallbackWorkout.main}</p><p><b>Defaticamento:</b> {d.fallbackWorkout.cooldown}</p><div className="s">Durata: {d.fallbackWorkout.durationMin} min · confidenza {d.fallbackWorkout.confidence} · Motivo: {d.fallbackWorkout.reason}. Suggerimento deterministico basato su riepiloghi Garmin, non un piano individuale completo.</div></div>

    <h2 id="recovery" className="section">Recupero (Garmin)</h2>
    {rec.coverage.days === 0 ? <div className="c warn">Nessun dato di recupero importato. Apri /admin e usa «Importa recupero».</div> :
      <div className="g">
        <div className="c"><div className="l">HRV 7g</div><div className="v">{N(rec.hrv7)}</div><div className="s">base 28g precedenti: {N(rec.hrvBase)} ms</div><Spark v={chrono('hrv_ms')} /></div>
        <div className="c"><div className="l">FC a riposo 7g</div><div className="v">{N(rec.rhr7)}</div><div className="s">base 28g precedenti: {N(rec.rhrBase)}</div><Spark v={chrono('resting_hr')} /></div>
        <div className="c"><div className="l">Sonno 7g</div><div className="v">{rec.sleep7 == null ? '—' : N(rec.sleep7 / 3600, 1) + ' h'}</div><Spark v={chrono('sleep_s')} /></div>
        <div className="c"><div className="l">Body Battery (max) 7g</div><div className="v">{N(rec.battery7)}</div><Spark v={chrono('body_battery_max')} /></div>
        <div className="c"><div className="l">Stress medio 7g</div><div className="v">{N(rec.stress7)}</div><Spark v={chrono('stress_avg')} /></div>
      </div>}
    <div className="s">Giorni con dato su {rec.coverage.days}: HRV {rec.coverage.hrv} · sonno {rec.coverage.sleep} · FC riposo {rec.coverage.restingHr} · Body Battery {rec.coverage.bodyBattery} · stress {rec.coverage.stress}. Se una voce è a 0, il nome del campo Garmin va verificato.</div>
    {rec.signal?.status && <div className="s">Segnali di recupero: <b className={rec.signal.status === 'nella norma' ? 'ok' : 'warn'}>{rec.signal.status}</b>{rec.signal.flags.length ? ' · ' + rec.signal.flags.join('; ') : ''}. Indicazione descrittiva, non una diagnosi.</div>}

    {d.effort && (() => { const e = d.effort; return <>
      <h2 id="effort" className="section">FC e sforzo</h2>
      <div className="g">
        <div className="c"><div className="l">FC max stimata</div><div className="v">{e.maxHr.value}</div><div className="s">dai tuoi dati · affidabilità {e.maxHr.confidence}</div></div>
        <div className="c"><div className="l">FC a riposo</div><div className="v">{Math.round(e.restHr)}</div><div className="s">{e.assumedRest ? 'ASSUNTA: nessun dato Garmin' : 'media 28 giorni'}</div></div>
        <div className="c"><div className="l">Forma (fitness − fatica)</div><div className="v">{N(e.form.form)}</div><div className="s">fitness {N(e.form.fitness)} · fatica {N(e.form.fatigue)}</div><Spark v={e.form.formSeries} /></div>
        <div className="c"><div className="l">Efficienza ultime 4 sett.</div><div className="v">{e.efficiency.changePct == null ? '—' : (e.efficiency.changePct >= 0 ? '+' : '') + N(e.efficiency.changePct, 1) + '%'}</div><div className="s">vs 4 sett. prima · {e.efficiency.n} corse</div></div>
        {e.goalPaceHr && <div className="c"><div className="l">FC attesa al passo gara</div><div className="v">{Math.round(e.goalPaceHr.hr)} ±{Math.round(e.goalPaceHr.pm)}</div><div className="s">{N(e.goalPaceHr.pctMax)}% FC max{e.goalPaceHr.extrapolated ? ' · fuori dai tuoi dati recenti' : ''}</div></div>}
        {e.vdot && <div className="c"><div className="l">VDOT (valore minimo)</div><div className="v">{N(e.vdot.vdot, 1)}</div><div className="s">da {N(e.vdot.km, 1)} km del {D(e.vdot.date)}</div></div>}
      </div>
      <div className="c sc" style={{ marginTop: 12 }}><table><thead><tr><th>Zona</th><th>% FC max (bpm)</th><th>Riserva FC (bpm)</th></tr></thead><tbody>
        {e.zones.percentMax.map((z: number[], i: number) => <tr key={i}><td>Z{i + 1}</td><td>{z[0]}–{z[1]}</td><td>{e.zones.reserve ? e.zones.reserve[i][0] + '–' + e.zones.reserve[i][1] : '—'}</td></tr>)}</tbody></table></div>
      {e.paceAtHr && <div className="c sc" style={{ marginTop: 12 }}><table><thead><tr><th>% FC max</th><th>bpm</th><th>Passo atteso</th></tr></thead><tbody>
        {e.paceAtHr.map((p: any) => <tr key={p.pct}><td>{p.pct}%</td><td>{p.hr}</td><td>{PS(p.paceSPerKm)}{p.extrapolated ? ' *' : ''}</td></tr>)}</tbody></table>
        <div className="s">Relazione FC-passo sulle ultime 8 settimane: {e.hrSpeed.n} corse, R² {N(e.hrSpeed.r2, 2)}, errore tipico ±{N(e.hrSpeed.sd, 0)} bpm. * = fuori dall'intervallo dei tuoi dati, meno affidabile. Dislivello, caldo e fatica sporcano il dato.</div></div>}
      {e.vdot && <div className="c sc" style={{ marginTop: 12 }}><table><thead><tr><th>Passi di allenamento (Daniels)</th><th>Passo</th></tr></thead><tbody>
        <tr><td>Facile</td><td>{PS(e.vdot.paces.easy[1])} – {PS(e.vdot.paces.easy[0])}</td></tr><tr><td>Soglia</td><td>{PS(e.vdot.paces.threshold)}</td></tr><tr><td>Intervalli</td><td>{PS(e.vdot.paces.interval)}</td></tr>
        {e.threshold && <tr><td>Soglia dai tuoi dati ({D(e.threshold.date)})</td><td>{PS(e.threshold.paceSPerKm)} · FC {e.threshold.hr}</td></tr>}</tbody></table>
        <div className="s">Il VDOT parte dalle tue corse di allenamento, non da gare: è un limite inferiore della forma reale.</div></div>}
      <div className="s" style={{ marginTop: 6 }}>Le stime usano FC media e massima per corsa (non la FC secondo per secondo): il TRIMP è una stima di seduta e non descrive i picchi degli intervalli. Forma negativa = fatica accumulata; nel tapering deve salire.</div>
    </>; })()}

    <h2 id="predictions" className="section">Previsioni gara – modelli pubblicati</h2>
    <div className="c sc"><table><thead><tr><th>Gara</th><th>Riegel</th><th>Cameron</th><th>Daniels VDOT</th><th>Purdy</th><th>Vickers–Vertosick</th><th>Media semplice</th></tr></thead><tbody>
      {Object.entries<any>(pr).map(([name, p]) => p.unavailable ? <tr key={name}><td>{name}</td><td colSpan={6} className="warn" style={{ textAlign: 'left' }}>{p.unavailable}</td></tr> :
        <tr key={name}><td>{name}</td>{['riegel','cameron','vdot','purdy','vickers'].map(id => { const m = p.models.find((x: any) => x.id === id); return <td key={id}>{m ? T(m.timeS) : '—'}</td>; })}<td><b>{p.meanS == null ? '—' : T(p.meanS)}</b></td></tr>)}
    </tbody></table></div>
    {Object.entries<any>(pr).filter(([, p]) => !p.unavailable).map(([name, p]) => <div className="s" key={name}>{name}: riferimento {p.ref.type === 'race' ? 'gara' : 'attività Garmin'} di {p.ref.km.toFixed(1)} km del {D(p.ref.date)} in {T(p.ref.timeS)}{p.notes.length ? ' · ' + p.notes.join('; ') : ''}</div>)}
    <div className="s" style={{ marginTop: 6 }}>Riegel (1981), Cameron (1998), Daniels–Gilbert (1979), Purdy (1970/1974) e Vickers–Vertosick (2016, solo maratona). Vickers usa esclusivamente gare inserite manualmente. Gli altri modelli preferiscono le gare inserite, ma in loro assenza possono usare attività Garmin: in quel caso non sono necessariamente prestazioni massimali. La media semplice è descrittiva, non calibrata, e non è un intervallo di confidenza.</div>
    <div className="c" style={{ marginTop: 12 }}><b>Aggiungi una gara reale</b><div className="s">Serve per il modello Vickers–Vertosick e migliora il riferimento degli altri modelli. Inserisci solo gare vere. Per Vickers seleziona ‘condizioni medie’ solo se percorso e meteo non erano particolarmente difficili o veloci; usa solo 5 km, 5 mi, 10 km, 10 mi o mezza.</div>
      <div className="g" style={{ marginTop: 10 }}>
        <input value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="Nome gara" style={{ padding: 10, borderRadius: 7, minWidth: 0 }} />
        <input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} style={{ padding: 10, borderRadius: 7 }} />
        <select value={raceKm} onChange={e => setRaceKm(e.target.value)} style={{ padding: 10, borderRadius: 7 }}><option value="5">5 km</option><option value="10">10 km</option><option value="8.04672">5 miglia</option><option value="16.09344">10 miglia</option><option value="21.0975">Mezza maratona</option><option value="42.195">Maratona</option></select>
        <select value={raceDifficulty} onChange={e => setRaceDifficulty(e.target.value)} style={{ padding: 10, borderRadius: 7 }}><option value="" disabled>Condizioni gara…</option><option value="average">Condizioni medie</option><option value="difficult">Difficili</option><option value="fast">Veloce</option><option value="very_difficult">Molto difficili</option><option value="very_fast">Molto veloce</option></select>
        <input value={raceTime} onChange={e => setRaceTime(e.target.value)} placeholder="Tempo mm:ss / hh:mm:ss" style={{ padding: 10, borderRadius: 7, minWidth: 0 }} />
      </div><p><button disabled={busy} onClick={saveRace}>Salva gara</button></p>{raceMsg && <div className="s">{raceMsg}</div>}
      {d.raceResults?.length > 0 && <div className="s">Gare registrate: {d.raceResults.map((r: any) => `${r.name} · ${(r.distanceM/1000).toFixed(2)} km · ${D(r.date)}`).join(' | ')}</div>}
    </div>

    <h2 id="activities" className="section">Corse recenti</h2>
    <div className="c sc"><table><thead><tr><th>Data</th><th>Km</th><th>Passo</th><th>FC</th><th>Carico</th><th>D+</th><th>%FCmax</th><th>Sforzo</th><th>TRIMP stimato</th><th>TE</th></tr></thead><tbody>
      {d.recent.map((a: any, i: number) => { const f = d.recentEffort[i]; return <tr key={a.id}><td>{D(a.startTime)}</td><td>{N(a.distanceM / 1000, 1)}</td><td>{P(a.distanceM, a.durationS)}</td><td>{N(a.avgHr)}</td><td>{N(a.trainingLoad)}</td><td>{N(a.elevationGainM)}</td><td>{N(f?.pctMax)}</td><td>{f?.label ?? '—'}</td><td>{N(f?.trimp)}</td><td>{N(f?.te, 1)}</td></tr>; })}
    </tbody></table></div>

    <h2 id="long-runs" className="section">Lunghi recenti</h2>
    <div className="c sc"><table><thead><tr><th>Data</th><th>Km</th><th>FC media</th></tr></thead><tbody>
      {d.longRuns.map((a: any) => <tr key={a.date}><td>{D(a.date)}</td><td>{N(a.km, 1)}</td><td>{N(a.avgHr)}</td></tr>)}</tbody></table></div>
    <p className="s">Non disponibili: FC continua e tempo reale in zona (non importati); il piano resta una raccomandazione deterministica, non un coach AI. <a href="/admin" style={{ color: '#6ea8ff' }}>Strumenti /admin</a></p>
  </div>;
}
