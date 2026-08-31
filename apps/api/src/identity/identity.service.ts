import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma, syncGoogleIdentity } from '@seo-machine/db';
import { createHash, randomInt } from 'crypto';
import { SyncGoogleIdentityDto } from './identity.dto';

@Injectable()
export class IdentityService {
  async syncGoogle(dto: SyncGoogleIdentityDto) {
    const user = await prisma.$transaction((tx) => syncGoogleIdentity(tx, dto));
    return { id: user.id, email: user.email, name: user.name, image: user.image, onboardingComplete: Boolean(user.onboardingCompletedAt) };
  }

  async requestPhoneOtp(phone: string) {
    const code = String(randomInt(100000, 1000000));
    const codeHash = this.hashOtp(phone, code);
    await prisma.phoneOtp.create({ data: { phone, codeHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
    // The SMS adapter boundary is deliberately kept here so Kavenegar can be swapped without changing auth flows.
    return { accepted: true, expiresInSeconds: 300, ...(process.env.SMS_DEV_MODE === 'true' ? { devCode: code } : {}) };
  }

  async verifyPhoneOtp(phone: string, code: string) {
    const otp = await prisma.phoneOtp.findFirst({ where: { phone, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, orderBy: { createdAt: 'desc' } });
    if (!otp || this.hashOtp(phone, code) !== otp.codeHash) {
      if (otp) await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('The verification code is invalid or expired.');
    }
    const user = await prisma.$transaction(async (tx) => {
      await tx.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
      return tx.user.upsert({ where: { phone }, create: { phone, phoneVerifiedAt: new Date() }, update: { phoneVerifiedAt: new Date() } });
    });
    return { id: user.id, phone: user.phone, name: user.name, email: user.email };
  }

  private hashOtp(phone: string, code: string) { return createHash('sha256').update(`${phone}:${code}:${process.env.OTP_HASH_SECRET ?? 'local-only'}`).digest('hex'); }
}
