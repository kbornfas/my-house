import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { findHolidayForDate, getMealPlanForDate, listUpcomingMealPlans, upsertUserMealOverride } from '../services/mealPlanService';

const prisma = new PrismaClient();

export async function getDailyMealPlan(req: Request, res: Response) {
  try {
    const userId = req.userId || String(req.query.userId || req.body.userId || '');
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const targetDate = req.query.date ? new Date(String(req.query.date)) : new Date();
    const holidayId = req.query.holidayId ? String(req.query.holidayId) : undefined;
    const holiday = holidayId ? await prisma.holiday.findUnique({ where: { id: holidayId } }) : await findHolidayForDate(userId, targetDate);
    const plan = await getMealPlanForDate(userId, targetDate, holiday ?? undefined);
    return res.json({ data: plan });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getUpcomingMealPlans(req: Request, res: Response) {
  try {
    const userId = req.userId || String(req.query.userId || req.body.userId || '');
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const days = Number(req.query.days ?? 7);
    const plans = await listUpcomingMealPlans(userId, Math.max(1, Math.min(days, 30)));
    return res.json({ data: plans });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function saveMealPlanOverride(req: Request, res: Response) {
  try {
    const userId = req.userId || req.body.userId;
    const { dateKey, courses, holidayId, calories, macros, notes } = req.body;
    if (!userId || !dateKey || !courses) {
      return res.status(400).json({ error: 'userId, dateKey and courses are required' });
    }
    const override = await upsertUserMealOverride(userId, dateKey, {
      holidayId: holidayId ?? null,
      courses,
      calories,
      macros,
      notes,
    });
    return res.status(201).json({ data: override });
  } catch (err) {
    return handleError(res, err);
  }
}

function handleError(res: Response, err: unknown) {
  // eslint-disable-next-line no-console
  console.error('meal planner controller error', err);
  const message = err instanceof Error ? err.message : 'Unexpected error';
  return res.status(500).json({ error: message });
}
