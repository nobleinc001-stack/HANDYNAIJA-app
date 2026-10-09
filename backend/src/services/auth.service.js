import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export async function registerUserService(payload) {
  const email = payload.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError('A user with this email already exists.', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email,
      passwordHash,
      phone: payload.phone ?? null,
      role: payload.role ?? 'CUSTOMER',
      state: payload.state ?? null,
      city: payload.city ?? null,
      area: payload.area ?? null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      state: true,
      city: true,
      area: true,
      status: true,
      createdAt: true,
    },
  });

  const token = signToken(user);

  return {
    user,
    token,
  };
}

export async function loginUserService(payload) {
  const email = payload.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'active') {
    throw new AppError('Your account is currently inactive.', 403, 'ACCOUNT_DISABLED');
  }

  const token = signToken(user);

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      state: user.state,
      city: user.city,
      area: user.area,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function resetPasswordService(payload) {
  const user = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });

  if (!user) {
    throw new AppError('No account was found for this email.', 404, 'USER_NOT_FOUND');
  }

  return {
    message: 'Password reset instructions have been sent.',
    email: user.email,
  };
}
