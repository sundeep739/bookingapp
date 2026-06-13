import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Completes the opt-in Google Calendar OAuth flow and stores the calendar grant
// on the user's google Account row so getFreshGoogleAccessToken() can use it.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const done = (q: string) => NextResponse.redirect(`${appUrl}/dashboard/integrations?${q}`);

  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`${appUrl}/login`);
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get("g_cal_state")?.value;

  if (searchParams.get("error")) return done("calendar=denied");
  if (!code || !state || !cookieState || state !== cookieState) return done("calendar=error");

  const redirectUri = `${appUrl}/api/integrations/google/callback`;
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);

  let tokens;
  try {
    ({ tokens } = await oauth2.getToken(code));
  } catch (e) {
    console.error("Google calendar token exchange failed:", e);
    return done("calendar=error");
  }
  if (!tokens.scope?.includes("calendar")) return done("calendar=denied");

  // Identify the Google account (sub) so we can key the Account row.
  oauth2.setCredentials(tokens);
  let providerAccountId: string | null = null;
  try {
    const me = await google.oauth2({ version: "v2", auth: oauth2 }).userinfo.get();
    providerAccountId = me.data.id ?? null;
  } catch (e) {
    console.error("Google userinfo failed:", e);
  }
  if (!providerAccountId) return done("calendar=error");

  // Don't hijack a Google identity already linked to a different BookEasy user.
  const existing = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId } },
  });
  if (existing && existing.userId !== userId) return done("calendar=conflict");

  const data = {
    access_token: tokens.access_token ?? null,
    refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
    expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
    scope: tokens.scope ?? null,
    token_type: tokens.token_type ?? null,
    id_token: tokens.id_token ?? null,
  };

  if (existing) {
    await prisma.account.update({ where: { id: existing.id }, data });
  } else {
    await prisma.account.create({
      data: { userId, type: "oauth", provider: "google", providerAccountId, ...data },
    });
  }

  const res = done("calendar=connected");
  res.cookies.delete("g_cal_state");
  return res;
}
