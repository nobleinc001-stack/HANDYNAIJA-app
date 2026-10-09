import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export async function createBookingService(customerId, payload) {
  const provider = await prisma.user.findUnique({ where: { id: payload.providerId } });

  if (!provider || provider.role !== 'PROVIDER') {
    throw new AppError('Selected provider is invalid.', 404, 'PROVIDER_NOT_FOUND');
  }

  const service = await prisma.service.findUnique({ where: { id: payload.serviceId } });

  if (!service) {
    throw new AppError('Selected service is invalid.', 404, 'SERVICE_NOT_FOUND');
  }

  const booking = await prisma.booking.create({
    data: {
      customerId,
      providerId: provider.id,
      serviceId: service.id,
      title: payload.title,
      description: payload.description ?? null,
      location: payload.location,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
      status: 'PENDING',
      totalAmount: payload.totalAmount ? payload.totalAmount.toString() : null,
    },
    include: {
      customer: { select: { id: true, fullName: true, email: true } },
      provider: { select: { id: true, fullName: true, email: true } },
      service: true,
    },
  });

  return booking;
}

export async function updateBookingStatusService(bookingId, payload, actorId, actorRole) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { provider: true, customer: true } });

  if (!booking) {
    throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');
  }

  if (actorRole === 'CUSTOMER' && booking.customerId !== actorId) {
    throw new AppError('You cannot change this booking.', 403, 'FORBIDDEN');
  }

  if (actorRole === 'PROVIDER' && booking.providerId !== actorId) {
    throw new AppError('You cannot change this booking.', 403, 'FORBIDDEN');
  }

  const validStatuses = {
    PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    ACCEPTED: ['SCHEDULED', 'CANCELLED'],
    SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  if (!validStatuses[booking.status]?.includes(payload.status)) {
    throw new AppError(`Status transition from ${booking.status} to ${payload.status} is not allowed.`, 400, 'INVALID_STATUS_TRANSITION');
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: payload.status,
      cancellationReason: payload.reason ?? null,
    },
  });

  return updatedBooking;
}
