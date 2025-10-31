import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { enqueueNotification } from '../services/notificationService';

const prisma = new PrismaClient();

// Run every minute and enqueue due reminders (last minute window)
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const dueReminders = await prisma.reminder.findMany({
      where: {
        reminderTime: { lte: now, gte: oneMinuteAgo },
        notificationSent: false,
        isCompleted: false,
      },
      include: { user: true },
    });

    for (const reminder of dueReminders) {
      // enqueue notification for each active device
      const devices = await prisma.device.findMany({ where: { userId: reminder.userId, isActive: true } });
      for (const device of devices) {
        await enqueueNotification(device.fcmToken, {
          title: reminder.title,
          body: reminder.description || 'Reminder',
          data: { type: 'reminder', id: reminder.id },
        });
      }

      await prisma.reminder.update({ where: { id: reminder.id }, data: { notificationSent: true } });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('reminderScheduler error', err);
  }
});
