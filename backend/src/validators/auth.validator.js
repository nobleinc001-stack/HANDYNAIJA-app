import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().trim().optional(),
  role: z.enum(['customer', 'provider', 'admin']).optional().default('customer'),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
}).transform((value) => ({
  ...value,
  role: value.role.toUpperCase(),
}));

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});
