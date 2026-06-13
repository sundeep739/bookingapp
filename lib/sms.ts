const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

function getTwilio() {
  if (!accountSid || !authToken) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require("twilio");
  return twilio(accountSid, authToken);
}

function formatPhone(phone: string): string {
  // Strip non-digits
  const digits = phone.replace(/\D/g, "");
  // Add + if missing
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`; // US default
  return `+${digits}`;
}

/** Generic SMS send — used by custom reminder workflows. No-op if Twilio unset. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilio();
  if (!client || !fromNumber) return false;
  try {
    await client.messages.create({ body, from: fromNumber, to: formatPhone(to) });
    return true;
  } catch (err: any) {
    console.error("SMS send error:", err?.message ?? err);
    return false;
  }
}

export async function sendSmsReminder({
  to,
  hostName,
  eventTitle,
  startTime,
  timezone,
  cancelToken,
  hoursUntil,
}: {
  to: string;
  hostName: string;
  eventTitle: string;
  startTime: Date;
  timezone: string;
  cancelToken?: string | null;
  hoursUntil: number;
}) {
  const client = getTwilio();
  if (!client || !fromNumber) return; // silently skip if not configured

  const timeStr = startTime.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const cancelLine = cancelToken
    ? `\nCancel: ${appUrl}/cancel/${cancelToken}`
    : "";

  const label = hoursUntil >= 20 ? "tomorrow" : `in ${hoursUntil}h`;
  const body = `BookEasy Reminder: Your "${eventTitle}" with ${hostName} is ${label} at ${timeStr}.${cancelLine}`;

  try {
    await client.messages.create({
      body,
      from: fromNumber,
      to: formatPhone(to),
    });
  } catch (err: any) {
    console.error("SMS send error:", err?.message ?? err);
  }
}

export async function sendWaitlistNotification({
  to,
  name,
  eventTitle,
  hostName,
  bookingUrl,
}: {
  to: string;
  name: string;
  eventTitle: string;
  hostName: string;
  bookingUrl: string;
}) {
  const client = getTwilio();
  if (!client || !fromNumber) return;

  const body = `Hi ${name}! A slot just opened for "${eventTitle}" with ${hostName}. Book now: ${bookingUrl}`;

  try {
    await client.messages.create({ body, from: fromNumber, to: formatPhone(to) });
  } catch (err: any) {
    console.error("SMS waitlist error:", err?.message ?? err);
  }
}
