import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const apiBase =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api/v1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = String(credentials?.phone ?? "").trim();
        const code = String(credentials?.code ?? "").trim();

        if (!phone || !code) return null;

        const response = await fetch(`${apiBase}/auth/phone/verify`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ phone, code }),
          cache: "no-store",
        });

        if (!response.ok) return null;

        const result = (await response.json()) as {
          user: {
            id: string;
            phone: string;
            displayName?: string | null;
          };
        };

        return {
          id: result.user.id,
          name: result.user.displayName || result.user.phone,
          phone: result.user.phone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.userId = user.id;
      if (account?.provider) token.provider = account.provider;
      if (user && "phone" in user) {
        token.phone = String(user.phone ?? "");
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? "");
        session.user.phone = String(token.phone ?? "");
      }
      session.provider = String(token.provider ?? "");
      return session;
    },
  },
});
