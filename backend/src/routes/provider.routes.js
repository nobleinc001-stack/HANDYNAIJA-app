import { Router } from 'express';
import { createProviderProfile, updateProviderServices, searchProviders } from '../controllers/provider.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createProviderProfileSchema, updateProviderServicesSchema, searchProvidersSchema } from '../validators/provider.validator.js';

const router = Router();

router.use(authenticateToken);

router.post('/profile', requireRole('PROVIDER'), validateBody(createProviderProfileSchema), createProviderProfile);
router.put('/services', requireRole('PROVIDER'), validateBody(updateProviderServicesSchema), updateProviderServices);
router.get('/search', validateBody(searchProvidersSchema), searchProviders);

export default router;
