import { HttpException, HttpStatus, Injectable, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { prisma, syncGoogleIdentity } from '@seo-machine/db';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { SyncGoogleIdentityDto } from './identity.dto';
import { SmsService } from './sms.service';

@Injectable()
export class IdentityService implements OnModuleInit {
  constructor(private readonly sms: SmsService) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'production' && (!process.env.OTP_HASH_SECRET || process.env.OTP_HASH_SECRET.length < 32 || process.env.SMS_DEV_MODE === 'true')) throw new Error('Production requires a strong OTP_HASH_SECRET and SMS_DEV_MODE=false.');
  }

  async syncGoogle(dto: SyncGoogleIdentityDto) {
    const user = await prisma.$transaction((tx) => syncGoogleIdentity(tx, dto));
    return { id: user.id, email: user.email, name: user.name, image: user.image, onboardingComplete: Boolean(user.onboardingCompletedAt) };
  }

  async requestPhoneOtp(phone: string) {
    const code = String(randomInt(100000, 1000000));
    const codeHash = this.hashOtp(phone, code);
    const otp = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${phone}, 0))`;
      const recent = await tx.phoneOtp.findFirst({ where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } }, select: { id: true } });
      if (recent) throw new HttpException('Wait one minute before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
      await tx.phoneOtp.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
      return tx.phoneOtp.create({ data: { phone, codeHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
    });
    try { await this.sms.sendVerificationCode(phone, code); }
    catch (error) { await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }); if (error instanceof ServiceUnavailableException) throw error; throw new ServiceUnavailableException('SMS delivery is temporarily unavailable.'); }
    return { accepted: true, expiresInSeconds: 300, ...(process.env.SMS_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production' ? { devCode: code } : {}) };
  }

  async verifyPhoneOtp(phone: string, code: string) {
    const user = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${phone}, 0))`;
      const otp = await tx.phoneOtp.findFirst({ where: { phone, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, orderBy: { createdAt: 'desc' } });
      const actual = Buffer.from(this.hashOtp(phone, code), 'hex');
      const expected = Buffer.from(otp?.codeHash ?? '', 'hex');
      if (!otp || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        if (otp) await tx.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
        return null; // Commit the failed-attempt counter before raising the public error.
      }
      await tx.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
      return tx.user.upsert({ where: { phone }, create: { phone, phoneVerifiedAt: new Date() }, update: { phoneVerifiedAt: new Date() } });
    });
    if (!user) throw new UnauthorizedException('The verification code is invalid or expired.');
    return { id: user.id, phone: user.phone, name: user.name, email: user.email };
  }

  private hashOtp(phone: string, code: string) { return createHash('sha256').update(`${phone}:${code}:${process.env.OTP_HASH_SECRET ?? 'local-only'}`).digest('hex'); }
}
