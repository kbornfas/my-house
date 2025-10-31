import { Prisma, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export async function listBills(_req: Request, res: Response) {
  const bills = await prisma.bill.findMany({ take: 100, orderBy: { dueDate: 'asc' } });
  return res.json({ data: bills });
}

export async function createBill(req: Request, res: Response) {
  const { userId, name, amount, dueDate, color, category, recurrence, status, paymentMethod, notes, autoPay } = req.body;
  if (!userId || !name || !amount || !dueDate) return res.status(400).json({ error: 'userId, name, amount and dueDate required' });

  const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numericAmount)) return res.status(400).json({ error: 'amount must be a number' });

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return res.status(400).json({ error: 'dueDate must be a valid date' });

  const data: Prisma.BillCreateInput = {
    name,
    amount: new Prisma.Decimal(numericAmount),
    dueDate: due,
    user: { connect: { id: userId } },
  };

  if (color) data.color = color;
  if (category) data.category = category;
  if (recurrence) data.recurrence = recurrence;
  if (status) data.status = status;
  if (paymentMethod) data.paymentMethod = paymentMethod;
  if (notes) data.notes = notes;
  if (typeof autoPay === 'boolean') data.autoPay = autoPay;

  const bill = await prisma.bill.create({ data });
  return res.status(201).json({ data: bill });
}
