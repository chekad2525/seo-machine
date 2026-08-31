'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestPhoneCode, verifyPhoneCode } from './phone-actions';

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <button className="secondary-button full" type="submit" disabled={pending}>{pending ? 'Please wait…' : children}</button>;
}

export default function PhoneSignIn() {
  const [requestState, requestAction] = useFormState(requestPhoneCode, { message: '' });
  const [verifyState, verifyAction] = useFormState(verifyPhoneCode, { message: '' });
  return <details><summary>Sign in with a phone code</summary>
    <form action={requestAction}>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+989121234567" required maxLength={24} /></label>
      <Submit>Send code</Submit><p role="status">{requestState.message}</p>
    </form>
    <form action={verifyAction}>
      <label>Confirm phone number<input name="phone" type="tel" autoComplete="tel" required maxLength={24} /></label>
      <label>Verification code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
      <Submit>Verify and sign in</Submit><p role="status">{verifyState.message}</p>
    </form>
  </details>;
}
