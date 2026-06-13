import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
      allowDangerousEmailAccountLinking: false,
      // Sign-in only needs basic identity scopes — these are NON-sensitive, so
      // the app can be published to production without Google verification and
      // without the "unverified app" warning. The Google Calendar scope (which
      // is sensitive) is requested separately, opt-in, via
      // /api/integrations/google/connect when the user connects their calendar.
      authorization: {
        params: { scope: "openid email profile" },
      },
    }),
    EmailProvider({
      from: process.env.RESEND_FROM_EMAIL ?? "BookEasy <onboarding@resend.dev>",
      maxAge: 15 * 60, // magic link valid for 15 minutes
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        if (!resend) {
          console.error("RESEND_API_KEY not set — cannot send magic link");
          throw new Error("Email sign-in is not configured");
        }
        await resend.emails.send({
          from: provider.from!,
          to: identifier,
          subject: "Sign in to BookEasy",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;text-align:center">
              <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:24px">
                <span style="font-size:20px;font-weight:bold;color:#1E1B4B">BookEasy</span>
              </div>
              <h2 style="color:#1E1B4B">Sign in to your account</h2>
              <p style="color:#6b7280">Click the button below to sign in. This link expires in 15 minutes.</p>
              <a href="${url}" style="display:inline-block;background:#4F46E5;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:20px 0">Sign in to BookEasy</a>
              <p style="color:#9ca3af;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // With the database session strategy, `user` is the full DB record —
        // read id/suspended straight off it instead of an extra query per request.
        (session.user as any).id = user.id;
        (session.user as any).suspended = (user as any).suspended ?? false;
        // NOTE: do NOT attach accessToken to the session — it gets serialised
        // into the session cookie and is readable by client-side JS. Server-side
        // callers must use getFreshGoogleAccessToken(userId) instead.
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
