'use client';

import { useState } from 'react';

export default function ConnectSearchConsole({ projectId, property }: { projectId: string; property: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function connect() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/gsc/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, property: property.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'اتصال Search Console هنوز تنظیم نشده است.');
      window.location.assign(data.authorizationUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'اتصال Search Console هنوز تنظیم نشده است.'); setBusy(false); }
  }
  return <div><button className="app-button-quiet" type="button" onClick={connect} disabled={busy}>{busy ? 'در حال بازکردن گوگل…' : 'اتصال Search Console'} <span>←</span></button>{error && <p className="formal-form-error">{error}</p>}</div>;
}
