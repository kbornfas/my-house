import { Router } from 'express';
import { createReminder, listReminders } from '../controllers/remindersController';
import { validateBody } from '../middleware/validate';
import { createReminderSchema } from '../schemas/reminderSchemas';

const router = Router();

router.get('/', listReminders);
router.post('/', validateBody(createReminderSchema), createReminder);

export default router;
