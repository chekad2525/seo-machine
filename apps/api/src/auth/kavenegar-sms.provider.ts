import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { SmsProvider } from "./sms-provider";

@Injectable()
export class KavenegarSmsProvider implements SmsProvider {
  async sendOtp(input: { phone: string; code: string }): Promise<void> {
    const apiKey = process.env.KAVENEGAR_API_KEY;
    const template = process.env.KAVENEGAR_VERIFY_TEMPLATE;

    if (!apiKey || !template) {
      if (process.env.SMS_DEV_MODE === "true") {
        console.log(`[SMS_DEV_MODE] OTP for ${input.phone}: ${input.code}`);
        return;
      }

      throw new ServiceUnavailableException(
        "SMS provider is not configured",
      );
    }

    const receptor = input.phone.replace(/^\+/, "");
    const endpoint =
      `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}` +
      `/verify/lookup.json?receptor=${encodeURIComponent(receptor)}` +
      `&token=${encodeURIComponent(input.code)}` +
      `&template=${encodeURIComponent(template)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("SMS delivery failed");
    }
  }
}
