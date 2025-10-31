import { Router } from 'express';
import { deactivateDevice, listDevices, registerDevice } from '../controllers/devicesController';

const router = Router();

router.post('/', registerDevice);
router.get('/', listDevices);
router.post('/:id/deactivate', deactivateDevice);

export default router;
