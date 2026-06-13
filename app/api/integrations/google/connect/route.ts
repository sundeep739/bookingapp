import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

// Starts the opt-in Google Calendar OAuth flow (incremental authorization).
// Requests the sensitive calendar scope only when the user explicitly connects.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`${appUrl}/login`);

  const redirectUri = `${appUrl}/api/integrations/google/callback`;
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);

  const state = randomUUID();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",            // force a refresh_token back every time
    include_granted_scopes: true,
    scope: ["openid", "email", "https://www.googleapis.com/auth/calendar"],
    state,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set("g_cal_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return res;
}
