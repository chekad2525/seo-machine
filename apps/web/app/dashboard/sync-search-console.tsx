'use client';

import { useState } from 'react';

export default function SyncSearchConsole({ projectId, connected }: { projectId: string; connected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function sync() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/gsc/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId }) });
      const data = await response.json() as { message?: string; queryRows?: number; pageRows?: number };
      if (!response.ok) throw new Error(data.message ?? 'Search Console data could not be synced.');
      setMessage(`${data.queryRows ?? 0} query rows and ${data.pageRows ?? 0} page rows synced.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search Console data could not be synced.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="sync-action"><button className="primary-button" type="button" onClick={sync} disabled={!connected || busy}>{busy ? 'Syncing…' : connected ? 'Sync Search Console' : 'Connect Search Console first'} <span>↗</span></button>{message && <p className="sync-note">{message}</p>}{error && <p className="form-error">{error}</p>}</div>;
}
