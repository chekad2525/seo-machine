import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma, normalizePhone, syncGoogleIdentity } from '@seo-machine/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { scope: 'openid email profile' } },
    }),
    Credentials({
      id: 'phone-otp',
      name: 'Phone OTP',
      credentials: { phone: { label: 'Phone', type: 'text' }, code: { label: 'Code', type: 'text' } },
      async authorize(credentials) {
        const phone = normalizePhone(String(credentials?.phone ?? ''));
        const code = String(credentials?.code ?? '').trim();
        if (!phone || !/^\d{6}$/.test(code)) return null;
        const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/api/v1/identity/phone/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, code }), cache: 'no-store' });
        if (!response.ok) return null;
        return await response.json();
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && account.providerAccountId) {
        await syncGoogleIdentity(prisma, { providerAccountId: account.providerAccountId, email: user.email, name: user.name, image: user.image, emailVerified: Boolean((profile as { email_verified?: boolean } | null)?.email_verified ?? user.email) });
      }
    },
  },
});
