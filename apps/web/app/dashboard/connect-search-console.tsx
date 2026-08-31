'use client';

import { useState } from 'react';

export default function ConnectSearchConsole({ projectId, property }: { projectId: string; property: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function connect() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/gsc/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, property: `sc-domain:${property}` }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Search Console is not configured yet.');
      window.location.assign(data.authorizationUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'Search Console is not configured yet.'); setBusy(false); }
  }
  return <div><button className="secondary-button" type="button" onClick={connect} disabled={busy}>{busy ? 'Opening Google…' : 'Connect Search Console'} <span>→</span></button>{error && <p className="form-error">{error}</p>}</div>;
}
