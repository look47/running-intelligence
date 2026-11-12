'use client';
import { useState } from 'react';

export default function Admin() {
  const [key, setKey] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(path: string, method = 'GET') {
    setBusy(true);
    setOut('Attendi...');
    try {
      const r = await fetch(path, { method, headers: { 'X-API-Key': key } });
      const t = await r.text();
      setOut('Stato ' + r.status + '\n' + t.slice(0, 6000));
    } catch (e) {
      setOut('Errore: ' + String(e));
    }
    setBusy(false);
  }

  const btn = { padding: '12px 16px', margin: '6px 6px 6px 0', fontSize: 16, borderRadius: 8, border: 'none', background: '#2563eb', color: 'white' } as const;

  return (
    <main style={{ maxWidth: 700 }}>
      <h1>Running Intelligence - Admin</h1>
      <p>Scrivi la tua password (SERVICE_API_SECRET). Resta solo in questa pagina.</p>
      <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Password"
        style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8 }} />
      <div style={{ marginTop: 12 }}>
        <button style={btn} disabled={busy || !key} onClick={() => call('/api/garmin/probe')}>1. Prova Garmin</button>
        <button style={btn} disabled={busy || !key} onClick={() => call('/api/sync', 'POST')}>2. Importa corse</button>
        <button style={btn} disabled={busy || !key} onClick={() => call('/api/coach/context')}>3. Vedi riepilogo</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#161a20', padding: 12, borderRadius: 8, marginTop: 12 }}>{out}</pre>
    </main>
  );
}
