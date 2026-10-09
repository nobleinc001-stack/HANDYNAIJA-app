import {
  createProviderProfileService,
  updateProviderServicesService,
  searchProvidersService,
} from '../services/provider.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createProviderProfile(req, res, next) {
  try {
    const profile = await createProviderProfileService(req.user.id, req.body);
    return sendSuccess(res, profile, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateProviderServices(req, res, next) {
  try {
    const result = await updateProviderServicesService(req.user.id, req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function searchProviders(req, res, next) {
  try {
    const providers = await searchProvidersService(req.query);
    return sendSuccess(res, providers, 200);
  } catch (error) {
    return next(error);
  }
}
