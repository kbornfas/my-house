import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createRefreshToken } from './refreshController';

const prisma = new PrismaClient();

export async function register(req: Request, res: Response) {
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'user exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, fullName } });

  const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_PRIVATE_KEY || 'dev', { algorithm: 'HS256', expiresIn: '15m' });
  const refreshToken = await createRefreshToken(user.id);

  // In a real app we'd set httpOnly cookie for refresh token. For scaffold return both tokens.
  return res.status(201).json({ user: { id: user.id, email: user.email, fullName: user.fullName }, accessToken, refreshToken });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_PRIVATE_KEY || 'dev', { algorithm: 'HS256', expiresIn: '15m' });
  const refreshToken = await createRefreshToken(user.id);
  return res.json({
    user: { id: user.id, email: user.email, fullName: user.fullName },
    accessToken,
    refreshToken,
  });
}
