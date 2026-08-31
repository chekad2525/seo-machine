import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type KavenegarResponse = { return?: { status?: number } };

@Injectable()
export class SmsService {
  async sendVerificationCode(phone: string, code: string) {
    if (process.env.SMS_DEV_MODE === 'true') return { provider: 'dev' as const };
    const apiKey = process.env.KAVENEGAR_API_KEY;
    const template = process.env.KAVENEGAR_VERIFY_TEMPLATE;
    if (!apiKey || !template) throw new ServiceUnavailableException('SMS delivery is not configured.');
    const response = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ receptor: phone, token: code, template }) });
    const payload = await response.json() as KavenegarResponse;
    if (!response.ok || payload.return?.status !== 200) throw new ServiceUnavailableException('SMS delivery is temporarily unavailable.');
    return { provider: 'kavenegar' as const };
  }
}
