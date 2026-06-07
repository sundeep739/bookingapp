import { google } from "googleapis";
import { randomUUID } from "crypto";

export function getGoogleCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

/**
 * Creates a calendar event. When `withMeet` is true, Google auto-generates a
 * Google Meet link and returns it. Returns the event id and meet link.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  {
    summary, description, startTime, endTime, attendeeEmail, location, withMeet = true,
  }: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
    location?: string | null;
    withMeet?: boolean;
  }
): Promise<{ eventId: string | null; meetLink: string | null }> {
  const calendar = getGoogleCalendarClient(accessToken);

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: withMeet ? 1 : 0,
    sendUpdates: "all",
    requestBody: {
      summary,
      description,
      location: location ?? undefined,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: [{ email: attendeeEmail }],
      ...(withMeet
        ? {
            conferenceData: {
              createRequest: {
                requestId: randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }
        : {}),
    },
  });

  const meetLink =
    event.data.hangoutLink ??
    event.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
    null;

  return { eventId: event.data.id ?? null, meetLink };
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  { startTime, endTime, summary }: { startTime: Date; endTime: Date; summary?: string }
) {
  const calendar = getGoogleCalendarClient(accessToken);
  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    requestBody: {
      ...(summary ? { summary } : {}),
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    },
  });
}

export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
  const calendar = getGoogleCalendarClient(accessToken);
  await calendar.events.delete({ calendarId: "primary", eventId, sendUpdates: "all" });
}

export async function getCalendarBusyTimes(accessToken: string, timeMin: Date, timeMax: Date) {
  const calendar = getGoogleCalendarClient(accessToken);
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });
  return response.data.calendars?.primary?.busy || [];
}
