import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub?: string;
  [key: string]: unknown;
}

const JWT_SECRET = process.env.JWT_PRIVATE_KEY || 'dev';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'authorization required' });
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'invalid token payload' });
    }
    req.userId = payload.sub;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}