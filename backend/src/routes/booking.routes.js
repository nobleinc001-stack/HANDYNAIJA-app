import { Router } from 'express';
import { createBooking, updateBookingStatus } from '../controllers/booking.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createBookingSchema, bookingStatusSchema } from '../validators/booking.validator.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole('CUSTOMER'), validateBody(createBookingSchema), createBooking);
router.patch('/:id/status', requireRole('CUSTOMER', 'PROVIDER'), validateBody(bookingStatusSchema), updateBookingStatus);

export default router;
