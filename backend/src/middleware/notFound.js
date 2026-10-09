import { sendError } from '../utils/response.js';

export function notFound(req, res) {
  return sendError(res, 404, `Route not found: ${req.originalUrl}`, null, 'ROUTE_NOT_FOUND');
}
