
"use client";
import { useCallback, useEffect, useState } from "react";

type Activity = {
  id: string;
  startTime: string;
  distanceM: number;
  durationS: number;
  avgHr?: number;
  trainingLoad?: number;
  elevationGainM?: number;
};

const fmtTime = (s?: number | null) => {
  if (s == null || !Number.isFinite(s)) return "—";
  const n = Math.round(s);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};

const fmtPace = (a: Activity) => {
  if (a.distanceM <= 0 || a.durationS <= 0) return "—";
  const pace = Math.round(a.durationS / (a.distanceM / 1000));
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}/km`;
};

const num = (v?: number | null, d = 1) =>
  v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toFixed(d);

const date = (s?: string) =>
  s ? new Date(s).toLocaleDateString("it-IT") : "—";

const styles = `
*{box-sizing:border-box}
body{margin:0;background:#0b0d10;color:#e8eaed;font-family:system-ui}
.wrap{max-width:1120px;margin:auto;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.card{background:#161a20;border:1px solid #29313c;border-radius:12px;padding:16px;margin:10px 0}
.label{font-size:12px;color:#9aa5b4;text-transform:uppercase}
.value{font-size:25px;font-weight:700;margin-top:5px}
h2{font-size:17px;margin:24px 0 8px}
button,input{padding:11px;border-radius:8px;border:1px solid #394454;font:inherit}
button{background:#2563eb;color:white;border:0;cursor:pointer}
button:disabled{opacity:.5}
.muted{color:#9aa5b4;font-size:13px}
.error{color:#ff929d}
.tablewrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
td,th{padding:9px;text-align:left;border-bottom:1px solid #29313c;white-space:nowrap}
a{color:#8db8ff}
`;

export default function Dashboard() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const load = useCallback(async (k: string) => {
    setBusy(true);
    setError("");

    try {
      const r = await fetch("/api/coach/context", {
        headers: { "X-API-Key": k },
      });

      if (r.status === 401) {
        setData(null);
        setError("Password non valida");
        try {
          sessionStorage.removeItem("ri_key");
        } catch {}
        return;
      }

      if (!r.ok) throw new Error(`Errore API ${r.status}`);

      const j = await r.json();

      if (
        !j ||
        !Array.isArray(j.recent) ||
        !Array.isArray(j.weeklyKm12) ||
        !j.load ||
        !j.intensityKm28d
      ) {
        throw new Error(
          "La risposta del server non ha il formato atteso. Controllare /api/coach/context."
        );
      }

      setData(j);

      try {
        sessionStorage.setItem("ri_key", k);
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let k = "";
    try {
      k = sessionStorage.getItem("ri_key") || "";
    } catch {}

    if (k) {
      setKey(k);
      void load(k);
    }
  }, [load]);

  const sync = async () => {
    setBusy(true);
    setSyncMessage("Sincronizzazione in corso…");

    try {
      const r = await fetch("/api/sync", {
        method: "POST",
        headers: { "X-API-Key": key },
      });

      const j = await r.json();

      setSyncMessage(
        r.ok && j.ok
          ? `Sync completato: ${j.imported ?? 0} attività`
          : `Sync non completato: ${j.error ?? `HTTP ${r.status}`}`
      );
    } catch (e) {
      setSyncMessage(String(e));
    } finally {
      await load(key);
    }
  };

  if (!data) {
    return (
      <>
        <style>{styles}</style>
        <main className="wrap">
          <h1>Running Intelligence</h1>
          <p>Inserisci la password di accesso.</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Password"
            style={{ width: "100%", maxWidth: 420 }}
          />
          <p>
            <button
              disabled={!key || busy}
              onClick={() => void load(key)}
            >
              {busy ? "Caricamento…" : "Entra"}
            </button>
          </p>
          {error && <p className="error">{error}</p>}
        </main>
      </>
    );
  }

  const activities: Activity[] = data.recent ?? [];
  const latest = activities[0];
  const predictions = data.racePredictions ?? {};

  return (
    <>
      <style>{styles}</style>
      <main className="wrap">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 4px" }}>Running Intelligence</h1>
            <div className="muted">
              Ultimo sync:{" "}
              {data.lastSync
                ? `${date(data.lastSync.started_at)} · ${data.lastSync.status}`
                : "mai"}{" "}
              · FC max: {data.maxHr ?? "—"}
            </div>
          </div>
          <button disabled={busy} onClick={() => void sync()}>
            {busy ? "Attendi…" : "Sincronizza Garmin"}
          </button>
        </header>

        {syncMessage && <p className="muted">{syncMessage}</p>}

        {data.activeRace && (
          <section className="card">
            <div className="label">
              Prossima gara · {data.activeRace.name}
            </div>
            <div className="value">
              {date(data.activeRace.race_date)}
            </div>
            <div className="muted">
              Obiettivo:{" "}
              {data.activeRace.goal_time_s
                ? fmtTime(data.activeRace.goal_time_s)
                : "non impostato"}
            </div>
          </section>
        )}

        <h2>Carico e settimana</h2>
        <div className="grid">
          <div className="card">
            <div className="label">Km ultima settimana</div>
            <div className="value">
              {num(data.weeklyKm12.at(-1))} km
            </div>
            <div className="muted">
              Media 4 settimane: {num(data.avgWeeklyKm?.w4)} km
            </div>
          </div>

          <div className="card">
            <div className="label">Carico acuto / cronico</div>
            <div className="value">
              {num(data.load.acute)} / {num(data.load.chronic)}
            </div>
            <div className="muted">
              Rapporto: {num(data.load.acwr, 2)} · monotonia:{" "}
              {num(data.load.monotony, 2)}
            </div>
          </div>

          <div className="card">
            <div className="label">Ultima corsa</div>
            <div className="value">
              {latest ? `${num(latest.distanceM / 1000)} km` : "—"}
            </div>
            <div className="muted">
              {latest
                ? `${date(latest.startTime)} · ${fmtPace(latest)} · FC ${latest.avgHr ?? "—"}`
                : "Nessuna attività importata"}
            </div>
          </div>

          <div className="card">
            <div className="label">Distribuzione km per FC media</div>
            <div className="value" style={{ fontSize: 19 }}>
              {num(data.intensityKm28d.easy)} /{" "}
              {num(data.intensityKm28d.moderate)} /{" "}
              {num(data.intensityKm28d.threshold)} km
            </div>
            <div className="muted">
              Facile / moderato / soglia · ultime 4 settimane
            </div>
          </div>
        </div>

        <section className="card">
          <div className="label">Km per settimana · ultime 12</div>
          <div
            style={{
              display: "flex",
              alignItems: "end",
              gap: 5,
              height: 130,
              marginTop: 15,
            }}
          >
            {data.weeklyKm12.map((v: number, i: number) => (
              <div
                key={i}
                title={`${num(v)} km`}
                style={{
                  flex: 1,
                  minWidth: 5,
                  height: `${Math.max(
                    3,
                    Math.min(
                      100,
                      (v / Math.max(...data.weeklyKm12, 1)) * 100
                    )
                  )}%`,
                  background:
                    i === data.weeklyKm12.length - 1
                      ? "#3b82f6"
                      : "#52647f",
                  borderRadius: "4px 4px 0 0",
                }}
              />
            ))}
          </div>
        </section>

        <h2>Allenamento suggerito</h2>
        <section className="card">
          <div className="value" style={{ fontSize: 20 }}>
            {data.fallbackWorkout?.title ?? "Dati insufficienti"}
          </div>
          <p>
            {data.fallbackWorkout?.detail ??
              "Non è disponibile un suggerimento."}
          </p>
          <div className="muted">
            {data.fallbackWorkout?.reason ?? ""} · Suggerimento automatico
            prudenziale basato sui riepiloghi delle attività, non sostituisce
            un piano personalizzato.
          </div>
        </section>

        <h2>Previsioni indicative</h2>
        <section className="card tablewrap">
          <table>
            <thead>
              <tr>
                <th>Distanza</th>
                <th>Stima prudente</th>
                <th>Stima centrale</th>
                <th>Stima ottimistica</th>
                <th>Riferimento</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries<any>(predictions).map(([name, p]) => (
                <tr key={name}>
                  <td>{name}</td>
                  {p.unavailable ? (
                    <td colSpan={4}>{p.unavailable}</td>
                  ) : (
                    <>
                      <td>{fmtTime(p.high)}</td>
                      <td>
                        <b>{fmtTime(p.mid)}</b>
                      </td>
                      <td>{fmtTime(p.low)}</td>
                      <td>{p.basis ?? "—"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Stime basate sulle attività recenti, non necessariamente gare
            massimali. Non sono garanzie di prestazione.
          </p>
        </section>

        <h2>Corse recenti</h2>
        <section className="card tablewrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Km</th>
                <th>Passo</th>
                <th>FC media</th>
                <th>Carico Garmin</th>
                <th>Dislivello</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>{date(a.startTime)}</td>
                  <td>{num(a.distanceM / 1000)}</td>
                  <td>{fmtPace(a)}</td>
                  <td>{a.avgHr ?? "—"}</td>
                  <td>{a.trainingLoad ?? "—"}</td>
                  <td>{a.elevationGainM ?? "—"} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <h2>Lunghi recenti</h2>
        <section className="card tablewrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Km</th>
                <th>FC media</th>
                <th>Disaccoppiamento</th>
              </tr>
            </thead>
            <tbody>
              {(data.longRuns ?? []).map((a: any) => (
                <tr key={a.date}>
                  <td>{date(a.date)}</td>
                  <td>{num(a.km)}</td>
                  <td>{a.avgHr ?? "—"}</td>
                  <td>
                    {a.decoupling == null
                      ? "—"
                      : `${num(a.decoupling)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="muted">
          Dati Garmin a livello di attività. Recupero giornaliero, HRV,
          sonno e analisi battito-per-battito non sono esposti da questa
          versione del backend. <a href="/admin">Strumenti amministrativi</a>
        </p>
      </main>
    </>
  );
}
