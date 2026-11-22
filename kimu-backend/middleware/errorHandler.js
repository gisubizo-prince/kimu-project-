/**
 * Central error handler. Converts Mongoose/validation/JWT errors into
 * consistent JSON responses so the frontend never has to guess the shape.
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Server error. Please try again.';

  // Body parser errors carry an HTTP status and type instead of an app error code.
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body contains invalid JSON.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  }

  if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database unavailable. Please try again later.';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `That ${field} is already in use.` : 'Duplicate value.';
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}.`;
  }

  const requestId = req.requestId || 'unavailable';
  if (statusCode >= 500) {
    console.error(JSON.stringify({ level: 'error', requestId, method: req.method, statusCode, name: err.name || 'Error' }));
    message = 'An unexpected server error occurred.';
  } else {
    console.warn(JSON.stringify({ level: 'warn', requestId, method: req.method, statusCode, code: err.code || err.name || 'request_error' }));
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.', requestId: req.requestId || 'unavailable' });
}

module.exports = { errorHandler, notFound };
