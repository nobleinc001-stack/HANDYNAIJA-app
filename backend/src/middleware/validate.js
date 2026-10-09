import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          400,
          'Validation failed',
          error.errors,
          'VALIDATION_ERROR'
        );
      }

      return sendError(res, 500, 'Unexpected validation error', null, 'VALIDATION_FAILURE');
    }
  };
}
