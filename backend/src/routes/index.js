import { Router } from 'express';
import authRoutes from './auth.routes.js';
import providerRoutes from './provider.routes.js';
import bookingRoutes from './booking.routes.js';
import reviewRoutes from './review.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/providers', providerRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', service: 'handynaija-backend' },
    error: null,
  });
});

export default router;
