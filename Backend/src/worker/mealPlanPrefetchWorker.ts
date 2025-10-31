import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';
import cron from 'node-cron';
import { ensureUserPreferences, findHolidayForDate, getMealPlanForDate } from '../services/mealPlanService';

const prisma = new PrismaClient();

cron.schedule('0 5 * * *', async () => {
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const user of users) {
      await ensureUserPreferences(user.id);
      for (let offset = 0; offset < 7; offset += 1) {
        const date = DateTime.utc().startOf('day').plus({ days: offset }).toJSDate();
        const holiday = await findHolidayForDate(user.id, date);
        await getMealPlanForDate(user.id, date, holiday ?? undefined);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('meal plan prefetch error', err);
  }
});
