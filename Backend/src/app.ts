import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { NextFunction, Request, Response } from 'express';
import { health } from './controllers/healthController';
import authRoutes from './routes/auth';
import billsRoutes from './routes/bills';
import devicesRoutes from './routes/devices';
import refreshRoutes from './routes/refresh';
import remindersRoutes from './routes/reminders';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple request logger to avoid requiring an extra dependency in the scaffold
app.use((req: Request, _res: Response, next: NextFunction) => {
	// eslint-disable-next-line no-console
	console.log(`${new Date().toISOString()} -> ${req.method} ${req.originalUrl}`);
	next();
});

app.use('/api/auth', authRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/auth/refresh', refreshRoutes);
app.use('/api/devices', devicesRoutes);
app.get('/health', health);
app.use('/api/reminders', remindersRoutes);

import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

app.get('/', (_req: Request, res: Response) => res.json({ ok: true, service: 'personal-fortress-backend' }));

export default app;
