'use server';

import { AuthError } from 'next-auth';
import { normalizePhone } from '@seo-machine/db/web';
import { signIn } from '../../auth';
import { internalApiFetch } from '../../lib/internal-api';

type PhoneState = { message: string };

export async function requestPhoneCode(_state: PhoneState, form: FormData): Promise<PhoneState> {
  const phone = normalizePhone(String(form.get('phone') ?? ''));
  if (!phone) return { message: 'Use an international phone number, for example +989121234567.' };
  try {
    const response = await internalApiFetch('/api/v1/identity/phone/request', { identity: true, method: 'POST', body: JSON.stringify({ phone }) });
    if (!response.ok) return { message: response.status === 429 ? 'Wait one minute before requesting another code.' : 'The code could not be sent. Try again later.' };
    const result = await response.json() as { devCode?: string };
    return { message: result.devCode && process.env.NODE_ENV !== 'production' ? `Development code: ${result.devCode}` : 'Code sent. Enter it below within five minutes.' };
  } catch { return { message: 'SMS service is temporarily unavailable.' }; }
}

export async function verifyPhoneCode(_state: PhoneState, form: FormData): Promise<PhoneState> {
  const phone = normalizePhone(String(form.get('phone') ?? ''));
  const code = String(form.get('code') ?? '').trim();
  if (!phone || !/^\d{6}$/.test(code)) return { message: 'Enter your phone number and six-digit code.' };
  try { await signIn('phone-otp', { phone, code, redirectTo: '/onboarding' }); }
  catch (error) {
    if (error instanceof AuthError) return { message: 'The code is invalid, expired, or temporarily unavailable.' };
    throw error; // Preserve the successful Next.js redirect.
  }
  return { message: '' };
}
