import { z } from 'zod';

export const createBookingSchema = z.object({
  providerId: z.string().uuid('Provider id must be a valid UUID'),
  serviceId: z.string().uuid('Service id must be a valid UUID'),
  title: z.string().trim().min(3, 'Title is required'),
  description: z.string().trim().optional(),
  location: z.string().trim().min(3, 'Location is required'),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  totalAmount: z.number().min(0).optional(),
});

export const bookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  reason: z.string().trim().optional(),
});
