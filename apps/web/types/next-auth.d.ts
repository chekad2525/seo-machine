import "next-auth";

declare module "next-auth" {
  interface User {
    phone?: string;
  }

  interface Session {
    provider?: string;
    user: {
      id: string;
      phone?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    phone?: string;
    provider?: string;
  }
}
