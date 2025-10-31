import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export async function createReminder(req: Request, res: Response) {
  const { userId, title, description, reminderTime, recurrence, category } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const reminder = await prisma.reminder.create({ data: { userId, title, description, reminderTime: new Date(reminderTime), recurrence, category } });
  return res.status(201).json({ data: reminder });
}

export async function listReminders(_req: Request, res: Response) {
  const reminders = await prisma.reminder.findMany({ orderBy: { reminderTime: 'asc' } });
  return res.json({ data: reminders });
}
