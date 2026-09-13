'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function KeywordProjectSetup() {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const name = projectName.trim();
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationName: `${name} — سئو`,
          workspaceName: 'فضای کاری رهگیری رتبه',
          projectName: name,
          domain: domain.trim(),
          property: '',
        }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'ساخت پروژه انجام نشد.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ساخت پروژه انجام نشد.');
      setBusy(false);
    }
  }

  return <form className="keyword-project-setup" onSubmit={submit}>
    <div><label htmlFor="tracking-project-name">نام پروژه</label><input id="tracking-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="مثلاً سایت چکاد" required maxLength={120}/></div>
    <div><label htmlFor="tracking-project-domain">دامنه سایت</label><input id="tracking-project-domain" dir="ltr" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" required maxLength={2048}/></div>
    <button className="app-submit inline" type="submit" disabled={busy}>{busy ? 'در حال ساخت…' : 'ساخت پروژه رهگیری'} <span>←</span></button>
    {error && <p className="formal-form-error" role="alert">{error}</p>}
  </form>;
}
