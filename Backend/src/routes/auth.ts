import { Router } from 'express';
import { login, register } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/authSchemas';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

export default router;
