import { CalendarAccount, Prisma, PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { createDAVClient } from 'tsdav';
import { decryptSecret, encryptSecret } from '../utils/crypto';

const prisma = new PrismaClient();

const googleScopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
  'profile',
];

export function getGoogleAuthUrl(userId: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const statePayload = Buffer.from(JSON.stringify({ userId, redirectUri })).toString('base64url');
  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: googleScopes,
    include_granted_scopes: true,
    prompt: 'consent',
    state: statePayload,
  });
}

export async function exchangeGoogleCode(userId: string, code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauthClient.getToken(code);
  oauthClient.setCredentials(tokens);

  const oauth2 = google.oauth2('v2');
  const profile = await oauth2.userinfo.get({ auth: oauthClient });
  const externalId = profile.data.id;
  if (!externalId) {
    throw new Error('Unable to resolve Google account id');
  }

  const accessToken = tokens.access_token;
  if (!accessToken) {
    throw new Error('Google OAuth did not return an access token');
  }

  const refreshToken = tokens.refresh_token;
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  const storedAccount = await prisma.calendarAccount.upsert({
    where: { provider_externalId: { provider: 'google', externalId } },
    update: {
      userId,
      email: profile.data.email ?? undefined,
      label: profile.data.name ?? profile.data.email ?? undefined,
      accessTokenEnc: encryptSecret(accessToken),
      refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : undefined,
      expiresAt,
      lastSyncedAt: null,
    },
    create: {
      userId,
      provider: 'google',
      externalId,
      email: profile.data.email ?? undefined,
      label: profile.data.name ?? profile.data.email ?? undefined,
      accessTokenEnc: encryptSecret(accessToken),
      refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : undefined,
      expiresAt,
    },
  });

  await syncCalendarAccount(storedAccount.id);
  return storedAccount;
}

async function resolveGoogleClient(account: CalendarAccount, redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri ?? process.env.GOOGLE_REDIRECT_URI);
  const credentials = {
    access_token: decryptSecret(account.accessTokenEnc),
    refresh_token: account.refreshTokenEnc ? decryptSecret(account.refreshTokenEnc) : undefined,
    expiry_date: account.expiresAt?.getTime(),
  };
  oauthClient.setCredentials(credentials);

  oauthClient.on('tokens', async (newTokens) => {
    const nextAccess = newTokens.access_token ?? credentials.access_token;
    if (!nextAccess) return;
    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEnc: encryptSecret(nextAccess),
        refreshTokenEnc: (newTokens.refresh_token ?? credentials.refresh_token)
          ? encryptSecret(newTokens.refresh_token ?? credentials.refresh_token!)
          : undefined,
        expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : account.expiresAt,
      },
    });
  });

  return oauthClient;
}

export async function syncGoogleCalendar(account: CalendarAccount) {
  const oauthClient = await resolveGoogleClient(account);
  const calendarApi = google.calendar({ version: 'v3', auth: oauthClient });

  const timeMin = DateTime.utc().startOf('day').minus({ days: 7 }).toISO();
  const timeMax = DateTime.utc().startOf('day').plus({ days: 60 }).toISO();

  const events: {
    externalId: string;
    summary?: string;
    description?: string;
    startsAt: Date;
    endsAt: Date;
    location?: string;
    metadata?: Prisma.JsonValue;
  }[] = [];
  let pageToken: string | undefined;
  do {
    const response = await calendarApi.events.list({
      calendarId: 'primary',
      timeMin: timeMin ?? undefined,
      timeMax: timeMax ?? undefined,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
      pageToken,
    });
    pageToken = response.data.nextPageToken ?? undefined;
    const items = response.data.items ?? [];
    for (const item of items) {
      if (!item.id || !item.start || !item.end) continue;
      const startIso = item.start.dateTime ?? item.start.date ?? undefined;
      const endIso = item.end.dateTime ?? item.end.date ?? undefined;
      if (!startIso || !endIso) continue;
      const start = DateTime.fromISO(startIso, { zone: item.start.timeZone ?? 'utc' }).toJSDate();
      const end = DateTime.fromISO(endIso, { zone: item.end.timeZone ?? 'utc' }).toJSDate();
      events.push({
        externalId: item.id,
        summary: item.summary ?? undefined,
        description: item.description ?? undefined,
        startsAt: start,
        endsAt: end,
        location: item.location ?? undefined,
        metadata: item as unknown as Prisma.JsonValue,
      });
    }
  } while (pageToken);

  await prisma.calendarEvent.deleteMany({ where: { accountId: account.id, isMeal: false } });

  for (const event of events) {
    await prisma.calendarEvent.create({
      data: {
        accountId: account.id,
        userId: account.userId,
        externalId: event.externalId,
        summary: event.summary,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        source: 'google',
        metadata: event.metadata ?? Prisma.JsonNull,
      },
    });
  }

  await prisma.calendarAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
}

interface AppleConnectPayload {
  email: string;
  appSpecificPassword: string;
  principalUrl?: string;
}

export async function connectAppleCalendar(userId: string, payload: AppleConnectPayload) {
  if (!payload.email || !payload.appSpecificPassword) {
    throw new Error('Apple credentials are required');
  }

  const credentials = { username: payload.email, password: payload.appSpecificPassword } as const;
  const davClient = await createDAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials,
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const principalResponse = (await (davClient as unknown as { getPrincipal?: () => Promise<{ url: string }>; fetchPrincipal?: () => Promise<{ url: string }>; }).getPrincipal?.())
    ?? (await (davClient as unknown as { fetchPrincipal?: () => Promise<{ url: string }>; }).fetchPrincipal?.());
  const principal = payload.principalUrl || principalResponse?.url;
  if (!principal) {
    throw new Error('Unable to resolve CalDAV principal URL');
  }

  const stored = await prisma.calendarAccount.upsert({
    where: { provider_externalId: { provider: 'apple', externalId: principal } },
    update: {
      userId,
      email: payload.email,
      label: 'Apple Calendar',
      accessTokenEnc: encryptSecret(`${payload.email}:${payload.appSpecificPassword}`),
      refreshTokenEnc: undefined,
      expiresAt: null,
      lastSyncedAt: null,
    },
    create: {
      userId,
      provider: 'apple',
      externalId: principal,
      email: payload.email,
      label: 'Apple Calendar',
      accessTokenEnc: encryptSecret(`${payload.email}:${payload.appSpecificPassword}`),
    },
  });

  await syncAppleCalendar(stored.id);
  return stored;
}

export async function syncAppleCalendar(accountId: string) {
  const account = await prisma.calendarAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new Error('Calendar account not found');
  }
  if (account.provider !== 'apple') return;

  const secret = decryptSecret(account.accessTokenEnc);
  const [username, password] = secret.split(':');
  if (!username || !password) {
    throw new Error('Stored Apple credentials are invalid');
  }

  const davClient = await createDAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: { username, password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const principalUrl = account.externalId;
  const calendars = await (davClient as unknown as {
    listCalendars?: (params: { url: string; props: string[] }) => Promise<any[]>;
  }).listCalendars?.({
    url: principalUrl,
    props: ['{DAV:}displayname'],
  }) ?? [];

  const allEvents: {
    uid: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: Date;
    end?: Date;
  }[] = [];

  for (const calendar of calendars) {
    const objects = await davClient.fetchCalendarObjects({ calendar });
    for (const object of objects) {
      const parsed = parseIcs(object.data);
      if (!parsed) continue;
      allEvents.push(parsed);
    }
  }

  await prisma.calendarEvent.deleteMany({ where: { accountId: account.id, isMeal: false } });

  for (const item of allEvents) {
    if (!item.uid || !item.start || !item.end) continue;
    await prisma.calendarEvent.create({
      data: {
        accountId: account.id,
        userId: account.userId,
        externalId: item.uid,
        summary: item.summary,
        description: item.description,
        location: item.location,
        startsAt: item.start,
        endsAt: item.end,
        source: 'apple',
        metadata: Prisma.JsonNull,
      },
    });
  }

  await prisma.calendarAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
}

function parseIcs(ics: string) {
  if (!ics) return null;
  const lines = ics.split(/\r?\n/);
  let current: Record<string, string> = {};
  for (const line of lines) {
    const [rawKey, rawValue] = line.split(':', 2);
    if (!rawKey || rawValue === undefined) continue;
    const key = rawKey.toUpperCase();
    current[key] = rawValue;
  }
  if (!current['UID']) return null;
  const start = decodeIcsDate(current['DTSTART']);
  const end = decodeIcsDate(current['DTEND']);
  return {
    uid: current['UID'],
    summary: current['SUMMARY'],
    description: current['DESCRIPTION'],
    location: current['LOCATION'],
    start,
    end,
  };
}

function decodeIcsDate(value?: string) {
  if (!value) return undefined;
  const dateValue = value.split(';').pop();
  if (!dateValue) return undefined;
  const cleaned = dateValue.replace('Z', '');
  if (dateValue.length === 8) {
    return DateTime.fromFormat(dateValue, 'yyyyMMdd', { zone: 'utc' }).toJSDate();
  }
  if (dateValue.length === 15) {
    return DateTime.fromFormat(cleaned, 'yyyyMMddHHmmss', { zone: value.endsWith('Z') ? 'utc' : undefined }).toJSDate();
  }
  return DateTime.fromISO(dateValue, { zone: 'utc' }).toJSDate();
}

export async function syncCalendarAccount(accountId: string) {
  const account = await prisma.calendarAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Calendar account not found');
  if (account.provider === 'google') {
    await syncGoogleCalendar(account);
    return;
  }
  if (account.provider === 'apple') {
    await syncAppleCalendar(account.id);
    return;
  }
}

export async function syncCalendarsForUser(userId: string) {
  const accounts = await prisma.calendarAccount.findMany({ where: { userId } });
  for (const account of accounts) {
    await syncCalendarAccount(account.id);
  }
}

export async function listCalendarAccounts(userId: string) {
  return prisma.calendarAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}
