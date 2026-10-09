import { createBookingService, updateBookingStatusService } from '../services/booking.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createBooking(req, res, next) {
  try {
    const booking = await createBookingService(req.user.id, req.body);
    return sendSuccess(res, booking, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateBookingStatus(req, res, next) {
  try {
    const booking = await updateBookingStatusService(req.params.id, req.body, req.user.id, req.user.role);
    return sendSuccess(res, booking, 200);
  } catch (error) {
    return next(error);
  }
}
