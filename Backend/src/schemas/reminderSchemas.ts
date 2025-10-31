import { z } from 'zod';

export const createReminderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  reminderTime: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'invalid date' }),
  recurrence: z.string().optional(),
  category: z.string().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
