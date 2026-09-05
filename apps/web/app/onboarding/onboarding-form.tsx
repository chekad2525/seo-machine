'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const steps = ['سازمان', 'فضای کاری', 'پروژه', 'سرچ کنسول'];
const numerals = ['۰۱','۰۲','۰۳','۰۴'];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ organizationName: '', workspaceName: '', projectName: '', domain: '', property: '' });
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  const canContinue = step === 0 ? !!form.organizationName.trim() : step === 1 ? !!form.workspaceName.trim() : step === 2 ? !!form.projectName.trim() && !!form.domain.trim() : true;
  const next = () => { if (!canContinue) { setError('برای ادامه، فیلدهای ضروری این مرحله را کامل کنید.'); return; } setError(''); setStep(Math.min(step + 1, steps.length - 1)); };
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'ذخیره فضای کاری انجام نشد. دوباره تلاش کنید.');
      router.push('/dashboard');
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره فضای کاری انجام نشد. دوباره تلاش کنید.'); setBusy(false); }
  }
  return <form className="onboarding-form formal-onboarding" onSubmit={submit}>
    <div className="formal-stepper" aria-label="مراحل راه‌اندازی">{steps.map((label,index)=><button type="button" key={label} className={index===step?'active':index<step?'done':''} onClick={()=>index<step&&setStep(index)} aria-current={index===step?'step':undefined}><span>{index<step?'✓':numerals[index]}</span><b>{label}</b></button>)}</div>
    <div className="formal-form-body"><div className="form-position">مرحله {step+1} از ۴</div>
      {step===0&&<><h2>نام سازمان شما چیست؟</h2><p>سازمان، سطح اصلی مدیریت اعضا، فضاهای کاری و پروژه‌هاست.</p><label htmlFor="organization-name">نام سازمان <em>ضروری</em></label><input id="organization-name" autoFocus value={form.organizationName} onChange={update('organizationName')} placeholder="مثال: شرکت چکاد" required/></>}
      {step===1&&<><h2>تیم شما کجا کار می‌کند؟</h2><p>فضای کاری، سایت‌ها و داده‌های یک تیم را در یک محیط منظم نگه می‌دارد.</p><label htmlFor="workspace-name">نام فضای کاری <em>ضروری</em></label><input id="workspace-name" autoFocus value={form.workspaceName} onChange={update('workspaceName')} placeholder="مثال: تیم رشد و محتوا" required/></>}
      {step===2&&<><h2>اولین سایت را معرفی کنید.</h2><p>هر پروژه نماینده یک سایت و داده‌های عملکرد جست‌وجوی آن است.</p><label htmlFor="project-name">نام پروژه <em>ضروری</em></label><input id="project-name" autoFocus value={form.projectName} onChange={update('projectName')} placeholder="مثال: وب‌سایت اصلی چکاد" required/><label htmlFor="project-domain">دامنه سایت <em>ضروری</em></label><input id="project-domain" dir="ltr" value={form.domain} onChange={update('domain')} placeholder="example.com" required/></>}
      {step===3&&<><h2>داده‌های سرچ کنسول را متصل کنید.</h2><p>می‌توانید Property را اکنون وارد کنید یا اتصال را بعداً از داشبورد انجام دهید.</p><label htmlFor="gsc-property">Property سرچ کنسول <em>اختیاری</em></label><input id="gsc-property" dir="ltr" autoFocus value={form.property} onChange={update('property')} placeholder="sc-domain:example.com"/><div className="formal-scope-note"><span>✓</span><div><strong>دسترسی فقط‌خواندنی</strong><small>SEO Machine نمی‌تواند سایت یا آدرس‌های شما را تغییر دهد.</small></div></div></>}
    </div>
    {error&&<p className="formal-form-error" role="alert">{error}</p>}
    <div className="formal-form-actions">{step>0?<button className="app-button-quiet" type="button" onClick={()=>setStep(step-1)}>→ مرحله قبل</button>:<span/>}{step<3?<button className="app-submit inline" type="button" onClick={next} disabled={!canContinue}>ادامه <span>←</span></button>:<button className="app-submit inline" type="submit" disabled={busy}>{busy?'در حال ذخیره…':'ورود به فضای کاری'} <span>←</span></button>}</div>
  </form>;
}
