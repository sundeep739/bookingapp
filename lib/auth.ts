import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const prismaAdapter = PrismaAdapter(prisma);

// Google sends `refresh_token_expires_in` which older Prisma client versions
// don't recognise. Strip it before the insert so the adapter doesn't crash.
const adapter = {
  ...prismaAdapter,
  linkAccount: (account: any) => {
    const { refresh_token_expires_in, ...rest } = account;
    return (prismaAdapter.linkAccount as any)(rest);
  },
};

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        const account = await prisma.account.findFirst({
          where: { userId: user.id, provider: "google" },
        });
        if (account) {
          (session as any).accessToken = account.access_token;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// Helper: get session in Server Components
export async function auth() {
  return getServerSession(authOptions);
}
