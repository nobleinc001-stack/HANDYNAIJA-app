import { Router } from 'express';
import { createProviderProfile, getProviderProfile, updateProviderServices, searchProviders } from '../controllers/provider.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createProviderProfileSchema, updateProviderServicesSchema, searchProvidersSchema } from '../validators/provider.validator.js';

const router = Router();

router.get('/search', validateBody(searchProvidersSchema), searchProviders);
router.get('/:providerId', getProviderProfile);
router.use(authenticateToken);

router.post('/profile', requireRole('PROVIDER'), validateBody(createProviderProfileSchema), createProviderProfile);
router.put('/services', requireRole('PROVIDER'), validateBody(updateProviderServicesSchema), updateProviderServices);

export default router;
