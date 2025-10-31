import { Router } from 'express';
import { getDailyMealPlan, getUpcomingMealPlans, saveMealPlanOverride } from '../controllers/mealPlanController';

const router = Router();

router.get('/daily', getDailyMealPlan);
router.get('/upcoming', getUpcomingMealPlans);
router.post('/override', saveMealPlanOverride);

export default router;
