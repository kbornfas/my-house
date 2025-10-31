import { Router } from 'express';
import { refresh } from '../controllers/refreshController';

const router = Router();

router.post('/', refresh);

export default router;
