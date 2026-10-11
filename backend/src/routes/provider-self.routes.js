import { Router } from 'express';
import { getMyProviderProfile, updateMyProviderProfile } from '../controllers/provider.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateProviderProfileSchema } from '../validators/provider.validator.js';

const router = Router();

router.use(authenticateToken, requireRole('PROVIDER'));
router.get('/me', getMyProviderProfile);
router.put('/profile', validateBody(updateProviderProfileSchema), updateMyProviderProfile);

export default router;
