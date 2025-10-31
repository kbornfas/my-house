import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const worker = new Worker('notifications', async (job) => {
  const { deviceToken, payload } = job.data as any;
  // In a real deployment we'd call FCM here. For the scaffold we'll log the payload.
  console.log('[notificationWorker] sending to', deviceToken, payload);
  return { ok: true };
}, { connection });

worker.on('failed', (job, err) => {
  console.error('notification job failed', job?.id, err);
});

export default worker;
