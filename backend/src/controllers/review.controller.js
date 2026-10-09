import { createReviewService, getProviderReviewsService } from '../services/review.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createReview(req, res, next) {
  try {
    const review = await createReviewService(req.user.id, req.body);
    return sendSuccess(res, review, 201);
  } catch (error) {
    return next(error);
  }
}

export async function getProviderReviews(req, res, next) {
  try {
    const reviews = await getProviderReviewsService(req.params.providerId);
    return sendSuccess(res, reviews, 200);
  } catch (error) {
    return next(error);
  }
}
