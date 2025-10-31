import { Router } from 'express';
import { createBill, listBills } from '../controllers/billsController';
import { validateBody } from '../middleware/validate';
import { createBillSchema } from '../schemas/billSchemas';

const router = Router();

router.get('/', listBills);
router.post('/', validateBody(createBillSchema), createBill);

export default router;
