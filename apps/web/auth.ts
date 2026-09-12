import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma, normalizePhone, syncGoogleIdentity } from "@seo-machine/db/web";
import { internalApiFetch } from "./lib/internal-api";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = normalizePhone(String(credentials?.phone ?? ""));
        const code = String(credentials?.code ?? "").trim();
        if (!phone || !/^\d{6}$/.test(code)) return null;
        const response = await internalApiFetch(
          "/api/v1/identity/phone/verify",
          {
            method: "POST",
            identity: true,
            body: JSON.stringify({ phone, code }),
          },
        );
        if (!response.ok) return null;
        return await response.json();
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const google = profile as
        | { sub?: string; email_verified?: boolean }
        | undefined;
      return (
        google?.email_verified === true &&
        google?.sub === account.providerAccountId
      );
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && account.providerAccountId) {
        await prisma.$transaction((tx) =>
          syncGoogleIdentity(tx, {
            providerAccountId: account.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified:
              (profile as { email_verified?: boolean } | null)
                ?.email_verified === true,
          }),
        );
      }
    },
  },
});
