import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().uuid('Booking id must be a valid UUID'),
  providerId: z.string().uuid('Provider id must be a valid UUID'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().min(5, 'Comment is required').optional(),
});
