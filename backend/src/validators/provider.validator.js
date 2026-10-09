import { z } from 'zod';

export const createProviderProfileSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required'),
  fullName: z.string().trim().min(2, 'Full name is required'),
  bio: z.string().trim().min(20, 'Bio is too short').optional(),
  serviceCategory: z.string().trim().min(2, 'Service category is required'),
  categories: z.array(z.string().trim()).default([]),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  areas: z.array(z.string().trim()).default([]),
  experienceYears: z.number().int().min(0).default(0),
  responseTime: z.string().trim().optional(),
  available: z.boolean().default(true),
});

export const updateProviderServicesSchema = z.object({
  services: z.array(z.object({
    name: z.string().trim().min(2),
    category: z.string().trim().min(2),
    description: z.string().trim().min(10).optional(),
    priceFrom: z.number().min(0).optional(),
    priceTo: z.number().min(0).optional(),
    isActive: z.boolean().optional().default(true),
  })).min(1, 'At least one service is required'),
});

export const searchProvidersSchema = z.object({
  serviceCategory: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  q: z.string().trim().optional(),
}).catchall(z.any());
