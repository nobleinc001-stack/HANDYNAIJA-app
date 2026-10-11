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

export async function getProviderProfileService(providerId) {
  const user = await prisma.user.findUnique({
    where: { id: providerId },
    include: { providerProfile: { include: { services: true } } },
  });
  if (user?.role === 'PROVIDER') return toProviderProfile(user, user.providerProfile);

  const profile = await prisma.profile.findUnique({
    where: { id: providerId },
    include: { user: true, services: true },
  });
  if (!profile || profile.user.role !== 'PROVIDER') {
    throw new AppError('Provider profile not found.', 404, 'PROFILE_NOT_FOUND');
  }

  return toProviderProfile(profile.user, profile);
}

export async function getMyProviderProfileService(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { providerProfile: { include: { services: true } } },
  });
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  if (user.role !== 'PROVIDER') {
    throw new AppError('This profile is only available to provider accounts.', 403, 'FORBIDDEN');
  }

  return toProviderProfile(user, user.providerProfile);
}

export async function updateMyProviderProfileService(userId, payload) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { providerProfile: true },
  });
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  if (user.role !== 'PROVIDER') {
    throw new AppError('This profile is only available to provider accounts.', 403, 'FORBIDDEN');
  }

  const areas = payload.areasServed ?? user.providerProfile?.areas ?? [];
  const state = payload.state ?? user.providerProfile?.state ?? user.state;
  const city = payload.city ?? user.providerProfile?.city ?? user.city;
  const [profile, updatedUser] = await prisma.$transaction([
    prisma.profile.upsert({
      where: { userId },
      update: {
        ...(payload.businessName !== undefined ? { businessName: payload.businessName } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
        ...(payload.yearsExperience !== undefined ? { experienceYears: payload.yearsExperience } : {}),
        ...(payload.state !== undefined ? { state } : {}),
        ...(payload.city !== undefined ? { city } : {}),
        ...(payload.areasServed !== undefined ? { areas } : {}),
      },
      create: {
        userId,
        businessName: payload.businessName ?? `${user.fullName}'s business`,
        fullName: user.fullName,
        bio: payload.bio ?? null,
        serviceCategory: 'General',
        categories: [],
        state,
        city,
        areas,
        experienceYears: payload.yearsExperience ?? 0,
      },
      include: { services: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
        ...(payload.state !== undefined ? { state } : {}),
        ...(payload.city !== undefined ? { city } : {}),
        ...(payload.areasServed !== undefined ? { area: areas[0] ?? null } : {}),
      },
    }),
  ]);

  return toProviderProfile(updatedUser, profile);
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

function toProviderProfile(user, profile) {
  return {
    id: user.id,
    userId: user.id,
    fullName: user.fullName,
    businessName: profile?.businessName ?? `${user.fullName}'s business`,
    bio: profile?.bio ?? '',
    state: profile?.state ?? user.state ?? '',
    city: profile?.city ?? user.city ?? '',
    area: user.area ?? profile?.areas?.[0] ?? '',
    areas: profile?.areas ?? [],
    areasServed: profile?.areas ?? [],
    yearsExperience: profile?.experienceYears ?? 0,
    experienceYears: profile?.experienceYears ?? 0,
    avatarUrl: user.avatarUrl,
    categories: profile?.categories ?? [],
    services: profile?.services ?? [],
    rating: profile?.rating ?? 0,
    verificationStatus: profile?.verificationStatus?.toLowerCase() ?? 'unverified',
  };
}
