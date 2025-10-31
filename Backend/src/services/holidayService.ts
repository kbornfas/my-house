import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

const CALENDARIFIC_URL = 'https://calendarific.com/api/v2/holidays';

export async function syncHolidaysForUser(userId: string, year: number) {
  const country = await resolveUserCountry(userId);
  const holidays = await fetchHolidays(country, year);

  const stored: { id: string; date: Date; name: string }[] = [];
  for (const holiday of holidays) {
    const holidayDate = DateTime.fromISO(holiday.date.iso ?? `${year}-01-01`).toUTC().startOf('day');
    const record = await prisma.holiday.upsert({
      where: {
        countryCode_date_name: {
          countryCode: country,
          date: holidayDate.toJSDate(),
          name: holiday.name,
        },
      },
      update: {
        type: holiday.type?.[0],
        rawPayload: holiday as unknown as Prisma.InputJsonValue,
      },
      create: {
        countryCode: country,
        name: holiday.name,
        date: holidayDate.toJSDate(),
        type: holiday.type?.[0],
  rawPayload: holiday as unknown as Prisma.InputJsonValue,
      },
    });
    stored.push({ id: record.id, date: holidayDate.toJSDate(), name: holiday.name });
  }

  await prisma.calendarEvent.deleteMany({ where: { userId, isHoliday: true, source: 'calendarific' } });

  for (const holiday of stored) {
    await prisma.calendarEvent.create({
      data: {
        userId,
        holidayId: holiday.id,
        summary: holiday.name,
        description: 'Holiday from Calendarific',
        startsAt: holiday.date,
        endsAt: DateTime.fromJSDate(holiday.date).plus({ days: 1 }).toJSDate(),
        isHoliday: true,
        isMeal: false,
        source: 'calendarific',
      },
    });
  }

  return stored;
}

export async function fetchHolidays(country: string, year: number) {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) {
    throw new Error('CALENDARIFIC_API_KEY is not configured');
  }
  const { data } = await axios.get(CALENDARIFIC_URL, {
    params: {
      api_key: apiKey,
      country,
      year,
      type: 'national',
    },
  });
  return data?.response?.holidays ?? [];
}

async function resolveUserCountry(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const locale = prefs?.locale ?? 'en-US';
  const country = locale.split('-')[1]?.toUpperCase() ?? 'US';
  return country;
}
