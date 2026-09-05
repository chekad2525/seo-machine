import { randomInt } from 'crypto';
import { prisma } from '@seo-machine/db';
import { IdentityService } from './identity.service';
import { SmsService } from './sms.service';

const databaseTests = process.env.RUN_DATABASE_TESTS === 'true' ? describe : describe.skip;
databaseTests('OTP race protection with PostgreSQL', () => {
  const phone = `+1999${randomInt(100000000, 999999999)}`;
  const sendVerificationCode = jest.fn(async (_phone: string, _code: string) => ({ provider: 'dev' as const }));
  const service = new IdentityService({ sendVerificationCode } as SmsService);
  afterAll(async () => {
    await prisma.phoneOtp.deleteMany({ where: { phone } });
    await prisma.user.deleteMany({ where: { phone } });
    await prisma.$disconnect();
  });

  it('sends one code under concurrent requests and consumes it once', async () => {
    const sent = await Promise.allSettled([service.requestPhoneOtp(phone), service.requestPhoneOtp(phone)]);
    expect(sent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(sendVerificationCode).toHaveBeenCalledTimes(1);
    const code = sendVerificationCode.mock.calls[0][1];
    const verified = await Promise.allSettled([service.verifyPhoneOtp(phone, code), service.verifyPhoneOtp(phone, code)]);
    expect(verified.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('commits failed attempts and caps them under concurrency', async () => {
    await prisma.phoneOtp.deleteMany({ where: { phone } });
    await service.requestPhoneOtp(phone);
    await Promise.allSettled(Array.from({ length: 8 }, () => service.verifyPhoneOtp(phone, '000000')));
    const otp = await prisma.phoneOtp.findFirstOrThrow({ where: { phone } });
    expect(otp.attempts).toBe(5);
    const code = sendVerificationCode.mock.calls.at(-1)![1];
    await expect(service.verifyPhoneOtp(phone, code)).rejects.toThrow('invalid or expired');
  });
});
