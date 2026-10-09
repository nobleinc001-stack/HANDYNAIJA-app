import { Router } from 'express';
import { createReview, getProviderReviews } from '../controllers/review.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createReviewSchema } from '../validators/review.validator.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole('CUSTOMER'), validateBody(createReviewSchema), createReview);
router.get('/provider/:providerId', getProviderReviews);

export default router;
