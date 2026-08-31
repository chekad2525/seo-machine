'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const steps = ['Organization', 'Workspace', 'Project', 'Search Console'];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ organizationName: '', workspaceName: '', projectName: '', domain: '', property: '' });
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  const next = () => { setError(''); setStep(Math.min(step + 1, steps.length - 1)); };
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'We could not save your workspace.');
      router.push('/dashboard');
    } catch (err) { setError(err instanceof Error ? err.message : 'We could not save your workspace.'); setBusy(false); }
  }
  return <form className="onboarding-form" onSubmit={submit}><div className="stepper">{steps.map((label, index) => <button type="button" key={label} className={index === step ? 'step active' : index < step ? 'step done' : 'step'} onClick={() => index < step && setStep(index)}><span>{index < step ? '✓' : `0${index + 1}`}</span>{label}</button>)}</div><div className="form-body"><p className="eyebrow">{steps[step]} / 04</p>{step === 0 && <><h2>Who are you doing this work for?</h2><p className="muted">This is the account-level home for your people and projects.</p><label>Organization name<input autoFocus value={form.organizationName} onChange={update('organizationName')} placeholder="Northstar Studio" required /></label></>}{step === 1 && <><h2>Where should the team work?</h2><p className="muted">Workspaces keep a team’s sites, notes, and search signals together.</p><label>Workspace name<input autoFocus value={form.workspaceName} onChange={update('workspaceName')} placeholder="Growth team" required /></label></>}{step === 2 && <><h2>What site are we watching?</h2><p className="muted">Start with one project. We’ll use the domain as the anchor for search performance.</p><label>Project name<input autoFocus value={form.projectName} onChange={update('projectName')} placeholder="Northstar marketing site" required /></label><label>Website domain<input value={form.domain} onChange={update('domain')} placeholder="northstar.example" required /></label></>}{step === 3 && <><h2>Connect the search signal.</h2><p className="muted">Google Search Console connection is prepared with read-only access. Add a property now or do it from the dashboard.</p><label>Search Console property <span className="optional">optional</span><input autoFocus value={form.property} onChange={update('property')} placeholder="sc-domain:northstar.example" /></label><div className="scope-note"><span>◉</span><div><strong>Read-only by design</strong><br /><small>SEO Machine will never change your site or submit URLs.</small></div></div></>}</div>{error && <p className="form-error">{error}</p>}<div className="form-actions">{step > 0 && <button className="secondary-button" type="button" onClick={() => setStep(step - 1)}>← Back</button>}{step < steps.length - 1 ? <button className="primary-button" type="button" onClick={next}>Continue <span>→</span></button> : <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Open the workspace'} <span>↗</span></button>}</div></form>;
}
