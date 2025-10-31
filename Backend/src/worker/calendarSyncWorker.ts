import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import cron from 'node-cron';
import { syncCalendarsForUser } from '../services/calendarService';
import { syncHolidaysForUser } from '../services/holidayService';

const prisma = new PrismaClient();

cron.schedule('0 * * * *', async () => {
  try {
    const accounts = await prisma.calendarAccount.findMany({ select: { userId: true }, distinct: ['userId'] });
    for (const account of accounts) {
      await syncCalendarsForUser(account.userId);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('calendar hourly sync failed', err);
  }
});

cron.schedule('15 2 * * *', async () => {
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    const currentYear = DateTime.utc().year;
    for (const user of users) {
      await syncHolidaysForUser(user.id, currentYear);
      await syncHolidaysForUser(user.id, currentYear + 1);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('holiday daily sync failed', err);
  }
});
