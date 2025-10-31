import dotenv from 'dotenv';
dotenv.config();

import app from './app';
// Start background workers/schedulers in dev (these will run in the same process for the scaffold)
import './worker/notificationWorker';
import './worker/reminderScheduler';

const port = process.env.PORT || 3001;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
