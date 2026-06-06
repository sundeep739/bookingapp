import { google } from "googleapis";

export function getGoogleCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  {
    summary,
    description,
    startTime,
    endTime,
    attendeeEmail,
    meetingLink,
  }: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
    meetingLink?: string;
  }
) {
  const calendar = getGoogleCalendarClient(accessToken);

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: [{ email: attendeeEmail }],
      conferenceData: meetingLink
        ? {
            entryPoints: [{ entryPointType: "video", uri: meetingLink }],
          }
        : undefined,
    },
  });

  return event.data;
}

export async function getCalendarBusyTimes(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
) {
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
