export function sendSuccess(res, data, statusCode = 200, meta = null) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(res, statusCode, message, details = null, code = 'ERROR') {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
  });
}
