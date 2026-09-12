'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncSearchConsole({ projectId, connected }: { projectId: string; connected: boolean }) {
  const router = useRouter();
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
      if (!response.ok) throw new Error(data.message ?? 'دریافت داده‌های Search Console انجام نشد.');
      setMessage(`${data.queryRows ?? 0} عبارت و ${data.pageRows ?? 0} صفحه با موفقیت دریافت شد.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت داده‌های Search Console انجام نشد.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="sync-action"><button className="app-submit inline" type="button" onClick={sync} disabled={!connected || busy}>{busy ? 'در حال دریافت داده‌ها…' : connected ? 'همگام‌سازی داده‌ها' : 'ابتدا اتصال را برقرار کنید'} <span>↗</span></button>{message && <p className="sync-note">{message}</p>}{error && <p className="formal-form-error">{error}</p>}</div>;
}
