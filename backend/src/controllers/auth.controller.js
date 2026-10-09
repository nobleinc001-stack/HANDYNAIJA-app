import { registerUserService, loginUserService, resetPasswordService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export async function registerUser(req, res, next) {
  try {
    const result = await registerUserService(req.body);
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function loginUser(req, res, next) {
  try {
    const result = await loginUserService(req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await resetPasswordService(req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
