import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return sendError(res, 401, 'Authentication token is required', null, 'AUTH_TOKEN_REQUIRED');
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return sendError(res, 401, 'Invalid or expired token', null, 'INVALID_TOKEN');
  }
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'User is not authenticated', null, 'AUTH_REQUIRED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to access this resource', null, 'FORBIDDEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, status: true },
    });

    if (!user || user.status !== 'active') {
      return sendError(res, 403, 'Your account is inactive or unavailable', null, 'ACCOUNT_DISABLED');
    }

    req.user = { ...req.user, role: user.role };
    return next();
  };
}
