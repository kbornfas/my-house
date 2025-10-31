import { z } from 'zod';

export const createBillSchema = z.object({
  name: z.string().min(1),
  amount: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number()),
  dueDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'invalid date' }),
  category: z.string().optional(),
  recurrence: z.string().optional(),
  autoPay: z.boolean().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
