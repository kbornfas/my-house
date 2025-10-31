import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
export const notificationQueue = new Queue('notifications', { connection });

export async function enqueueNotification(deviceToken: string, payload: { title: string; body: string; data?: Record<string, string> }) {
  await notificationQueue.add('send', { deviceToken, payload }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
}
