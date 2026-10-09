import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export async function createReviewService(customerId, payload) {
  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    include: { provider: true, customer: true },
  });

  if (!booking) {
    throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND');
  }

  if (booking.customerId !== customerId) {
    throw new AppError('You can only review your own bookings.', 403, 'FORBIDDEN');
  }

  if (booking.status !== 'COMPLETED') {
    throw new AppError('Only completed bookings can be reviewed.', 400, 'INVALID_REVIEW_STATE');
  }

  const existingReview = await prisma.review.findFirst({
    where: { bookingId: payload.bookingId },
  });

  if (existingReview) {
    throw new AppError('This booking has already been reviewed.', 409, 'REVIEW_ALREADY_EXISTS');
  }

  const review = await prisma.review.create({
    data: {
      customerId,
      providerId: booking.providerId,
      bookingId: booking.id,
      rating: payload.rating,
      comment: payload.comment ?? null,
    },
  });

  const providerReviews = await prisma.review.aggregate({
    where: { providerId: booking.providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.profile.update({
    where: { userId: booking.providerId },
    data: {
      rating: Number(providerReviews._avg.rating ?? 0),
      reviewCount: providerReviews._count.rating ?? 0,
    },
  });

  return review;
}

export async function getProviderReviewsService(providerId) {
  const provider = await prisma.user.findUnique({
    where: { id: providerId, role: 'PROVIDER' },
  });

  if (!provider) {
    throw new AppError('Provider not found.', 404, 'PROVIDER_NOT_FOUND');
  }

  const reviews = await prisma.review.findMany({
    where: { providerId },
    include: {
      customer: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reviews;
}
