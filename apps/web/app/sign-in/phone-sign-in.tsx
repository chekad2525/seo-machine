'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestPhoneCode, verifyPhoneCode } from './phone-actions';

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <button className="app-submit" type="submit" disabled={pending}>{pending ? 'لطفاً صبر کنید…' : children}<span>←</span></button>;
}

export default function PhoneSignIn() {
  const [requestState, requestAction] = useFormState(requestPhoneCode, { message: '' });
  const [verifyState, verifyAction] = useFormState(verifyPhoneCode, { message: '' });
  return <details className="phone-access">
    <summary>ورود با کد پیامکی <span>＋</span></summary>
    <div className="phone-access-body">
      <form action={requestAction}>
        <label htmlFor="request-phone">شماره موبایل</label>
        <input id="request-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" placeholder="+989121234567" required maxLength={24} />
        <small>شماره را با کد کشور وارد کنید.</small><Submit>دریافت کد ورود</Submit>
        {requestState.message && <p className="app-status" role="status">{requestState.message}</p>}
      </form>
      <form action={verifyAction}>
        <label htmlFor="verify-phone">تأیید شماره موبایل</label>
        <input id="verify-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" required maxLength={24} />
        <label htmlFor="verify-code">کد شش‌رقمی</label>
        <input id="verify-code" name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
        <Submit>تأیید و ورود</Submit>{verifyState.message && <p className="app-status" role="status">{verifyState.message}</p>}
      </form>
    </div>
  </details>;
}
