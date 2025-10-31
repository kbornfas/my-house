import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { NextFunction, Request, Response } from 'express';
import { health } from './controllers/healthController';
import { authenticate } from './middleware/authenticate';
import authRoutes from './routes/auth';
import billsRoutes from './routes/bills';
import calendarRoutes from './routes/calendar';
import devicesRoutes from './routes/devices';
import mealPlansRoutes from './routes/mealPlans';
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
app.use('/api/auth/refresh', refreshRoutes);
app.use('/api/bills', authenticate, billsRoutes);
app.use('/api/devices', authenticate, devicesRoutes);
app.use('/api/calendar', authenticate, calendarRoutes);
app.get('/health', health);
app.use('/api/reminders', authenticate, remindersRoutes);
app.use('/api/meal-plans', authenticate, mealPlansRoutes);

import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

app.get('/', (_req: Request, res: Response) => res.json({ ok: true, service: 'personal-fortress-backend' }));

export default app;
