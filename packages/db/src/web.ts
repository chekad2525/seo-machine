import { Prisma, PrismaClient } from '@prisma/client';
export { internalApiSecret, signInternalRequest } from './internal-auth';

declare global {
  // eslint-disable-next-line no-var
  var webPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.webPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.webPrisma = prisma;

export function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const normalized = phone.replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function hasPrismaErrorCode(error: unknown, code: string): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}

export async function syncGoogleIdentity(db: PrismaClient | Prisma.TransactionClient, input: { providerAccountId: string; email?: string | null; name?: string | null; image?: string | null; emailVerified?: boolean }) {
  const email = input.email?.trim().toLowerCase() || null;
  const identity = await db.account.findUnique({ where: { provider_providerAccountId: { provider: 'google', providerAccountId: input.providerAccountId } }, include: { user: true } });
  if (identity) return db.user.update({ where: { id: identity.userId }, data: { name: identity.user.name || input.name || undefined, image: input.image || identity.user.image || undefined, ...(email && input.emailVerified && !identity.user.email ? { email, emailVerified: new Date() } : {}) } });
  let user = email && input.emailVerified ? await db.user.findFirst({ where: { email, emailVerified: { not: null } } }) : null;
  if (!user) user = await db.user.create({ data: { email, emailVerified: email && input.emailVerified ? new Date() : null, name: input.name, image: input.image } });
  try { await db.account.create({ data: { userId: user.id, type: 'oauth', provider: 'google', providerAccountId: input.providerAccountId } }); }
  catch (error) {
    if (hasPrismaErrorCode(error, 'P2002')) {
      const existing = await db.account.findUnique({ where: { provider_providerAccountId: { provider: 'google', providerAccountId: input.providerAccountId } } });
      if (existing) return db.user.findUniqueOrThrow({ where: { id: existing.userId } });
    }
    throw error;
  }
  return user;
}
