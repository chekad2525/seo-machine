import { Prisma, PrismaClient } from '@prisma/client';

export type GoogleIdentityInput = {
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
};

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

export function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const normalized = phone.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return null;
  return normalized;
}

/**
 * Canonical linking rules:
 * - a Google provider account is always keyed by provider + provider account id;
 * - an email is only used as a secondary link when Google vouches for it;
 * - a verified phone can be linked only after OTP verification in the API.
 */
export async function syncGoogleIdentity(db: PrismaClient | Prisma.TransactionClient, input: GoogleIdentityInput) {
  const email = normalizeEmail(input.email);
  const identity = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: input.providerAccountId } },
    include: { user: true },
  });

  if (identity) {
    return db.user.update({
      where: { id: identity.userId },
      data: {
        name: identity.user.name || input.name || undefined,
        image: input.image || identity.user.image || undefined,
        ...(email && input.emailVerified && !identity.user.email ? { email, emailVerified: new Date() } : {}),
      },
    });
  }

  let user = email && input.emailVerified
    ? await db.user.findFirst({ where: { email, emailVerified: { not: null } } })
    : null;

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerified: email && input.emailVerified ? new Date() : null,
        name: input.name,
        image: input.image,
      },
    });
  }

  try {
    await db.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: input.providerAccountId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.account.findUnique({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: input.providerAccountId } },
      });
      if (existing) return db.user.findUniqueOrThrow({ where: { id: existing.userId } });
    }
    throw error;
  }

  return user;
}
