import {
  BadRequestException,
  Injectable,
  TooManyRequestsException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { KavenegarSmsProvider } from "./kavenegar-sms.provider";

@Injectable()
export class PhoneAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: KavenegarSmsProvider,
  ) {}

  private hash(phone: string, code: string) {
    const secret = process.env.OTP_HASH_SECRET;
    if (!secret) {
      throw new BadRequestException("OTP_HASH_SECRET is not configured");
    }

    return createHmac("sha256", secret)
      .update(`${phone}:${code}`)
      .digest("hex");
  }

  async request(phone: string) {
    const oneMinuteAgo = new Date(Date.now() - 60_000);

    const recent = await this.prisma.phoneOtpChallenge.findFirst({
      where: {
        phone,
        createdAt: { gte: oneMinuteAgo },
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      throw new TooManyRequestsException(
        "Please wait before requesting another code",
      );
    }

    const code = String(randomInt(100000, 1_000_000));
    const expiresAt = new Date(Date.now() + 5 * 60_000);

    await this.prisma.phoneOtpChallenge.create({
      data: {
        phone,
        codeHash: this.hash(phone, code),
        expiresAt,
      },
    });

    await this.sms.sendOtp({ phone, code });

    return {
      ok: true,
      expiresInSeconds: 300,
    };
  }

  async verify(phone: string, code: string) {
    const challenge = await this.prisma.phoneOtpChallenge.findFirst({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    if (challenge.attempts >= 5) {
      throw new TooManyRequestsException("Too many verification attempts");
    }

    const supplied = Buffer.from(this.hash(phone, code), "hex");
    const stored = Buffer.from(challenge.codeHash, "hex");

    const valid =
      supplied.length === stored.length &&
      timingSafeEqual(supplied, stored);

    if (!valid) {
      await this.prisma.phoneOtpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException("Invalid or expired code");
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.upsert({
        where: { phone },
        create: {
          phone,
          displayName: phone,
        },
        update: {},
      });

      await tx.phoneOtpChallenge.update({
        where: { id: challenge.id },
        data: {
          consumedAt: new Date(),
          userId: savedUser.id,
        },
      });

      return savedUser;
    });

    return {
      ok: true,
      user: {
        id: user.id,
        phone: user.phone!,
        displayName: user.displayName,
      },
    };
  }
}
