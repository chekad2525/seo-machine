import { SmsService } from './sms.service';

describe('SmsService', () => {
  const previous = process.env.SMS_DEV_MODE;
  afterEach(() => { process.env.SMS_DEV_MODE = previous; });

  it('uses the local provider without making a network request', async () => {
    process.env.SMS_DEV_MODE = 'true';
    await expect(new SmsService().sendVerificationCode('+989121234567', '123456')).resolves.toEqual({ provider: 'dev' });
  });

  it('fails closed when production SMS credentials are absent', async () => {
    process.env.SMS_DEV_MODE = 'false';
    delete process.env.KAVENEGAR_API_KEY;
    delete process.env.KAVENEGAR_VERIFY_TEMPLATE;
    await expect(new SmsService().sendVerificationCode('+989121234567', '123456')).rejects.toThrow('SMS delivery is not configured.');
  });
});
