import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export async function createProviderProfileService(userId, payload) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      businessName: payload.businessName,
      fullName: payload.fullName,
      bio: payload.bio ?? null,
      serviceCategory: payload.serviceCategory,
      categories: payload.categories ?? [],
      state: payload.state ?? user.state,
      city: payload.city ?? user.city,
      areas: payload.areas ?? [],
      experienceYears: payload.experienceYears ?? 0,
      responseTime: payload.responseTime ?? null,
      available: payload.available ?? true,
    },
    create: {
      userId,
      businessName: payload.businessName,
      fullName: payload.fullName,
      bio: payload.bio ?? null,
      serviceCategory: payload.serviceCategory,
      categories: payload.categories ?? [],
      state: payload.state ?? user.state,
      city: payload.city ?? user.city,
      areas: payload.areas ?? [],
      experienceYears: payload.experienceYears ?? 0,
      responseTime: payload.responseTime ?? null,
      available: payload.available ?? true,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { role: 'PROVIDER' },
  });

  return profile;
}

export async function updateProviderServicesService(userId, payload) {
  const profile = await prisma.profile.findUnique({ where: { userId } });

  if (!profile) {
    throw new AppError('Provider profile not found.', 404, 'PROFILE_NOT_FOUND');
  }

  await prisma.service.deleteMany({ where: { profileId: profile.id } });

  const services = await prisma.service.createMany({
    data: payload.services.map((service) => ({
      profileId: profile.id,
      name: service.name,
      category: service.category,
      description: service.description ?? null,
      priceFrom: service.priceFrom ? service.priceFrom.toString() : null,
      priceTo: service.priceTo ? service.priceTo.toString() : null,
      isActive: service.isActive ?? true,
    })),
  });

  return { profileId: profile.id, created: services.count };
}

export async function searchProvidersService(filters = {}) {
  const where = {
    user: { role: 'PROVIDER' },
    ...(filters.serviceCategory ? { serviceCategory: { contains: filters.serviceCategory, mode: 'insensitive' } } : {}),
    ...(filters.state ? { state: { contains: filters.state, mode: 'insensitive' } } : {}),
    ...(filters.city ? { city: { contains: filters.city, mode: 'insensitive' } } : {}),
    ...(filters.q ? {
      OR: [
        { businessName: { contains: filters.q, mode: 'insensitive' } },
        { fullName: { contains: filters.q, mode: 'insensitive' } },
        { bio: { contains: filters.q, mode: 'insensitive' } },
      ],
    } : {}),
  };

  const providers = await prisma.profile.findMany({
    where,
    include: {
      services: true,
      user: { select: { id: true, email: true, phone: true, role: true } },
    },
    orderBy: { rating: 'desc' },
  });

  return providers;
}
