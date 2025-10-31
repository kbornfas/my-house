import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

// Create a refresh token record and return the plain token (to set as cookie)
export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return token;
}

export async function refresh(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.refreshToken.findFirst({ where: { tokenHash } });
  if (!record || record.revoked || record.expiresAt < new Date()) return res.status(401).json({ error: 'invalid refresh token' });

  // rotate: revoke current and issue new
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  const newToken = await createRefreshToken(record.userId);

  // issue new access token
  const accessToken = 'dev-token';
  // For scaffold we'll return both tokens in body; in prod set httpOnly cookie for refresh
  return res.json({ accessToken, refreshToken: newToken });
}
