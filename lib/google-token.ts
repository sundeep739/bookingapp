import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Returns a valid (non-expired) Google access token for a user, refreshing it
 * via the stored refresh_token when needed and persisting the new token.
 * Returns null if the user has no connected Google account or no way to refresh.
 */
export async function getFreshGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });
  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  const stillValid = account.access_token && account.expires_at && account.expires_at - 60 > now;
  if (stillValid) return account.access_token!;

  // Need to refresh
  if (!account.refresh_token) {
    // No refresh token (user logged in before offline access was granted).
    // Fall back to the existing access token; calendar calls may fail until re-consent.
    return account.access_token ?? null;
  }

  try {
    const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: account.refresh_token });
    const res = await oauth2.getAccessToken(); // refreshes when expired
    const token = res.token ?? null;
    const expiryMs = oauth2.credentials.expiry_date;

    if (token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: token,
          ...(expiryMs ? { expires_at: Math.floor(expiryMs / 1000) } : {}),
        },
      });
    }
    return token;
  } catch (err) {
    console.error("Google token refresh failed:", err);
    return account.access_token ?? null;
  }
}
