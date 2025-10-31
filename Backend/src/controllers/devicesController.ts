import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export async function registerDevice(req: Request, res: Response) {
  const { userId, fcmToken, platform } = req.body;
  if (!userId || !fcmToken) return res.status(400).json({ error: 'userId and fcmToken required' });

  const device = await prisma.device.upsert({
    where: { id: `${userId}-${platform || 'web'}` },
    update: { fcmToken, lastSeen: new Date(), isActive: true },
    create: { id: `${userId}-${platform || 'web'}`, userId, fcmToken, platform },
  });

  return res.json({ data: device });
}

export async function listDevices(req: Request, res: Response) {
  const { userId } = req.query as any;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const devices = await prisma.device.findMany({ where: { userId } });
  return res.json({ data: devices });
}

export async function deactivateDevice(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.device.update({ where: { id }, data: { isActive: false } });
  return res.json({ ok: true });
}
