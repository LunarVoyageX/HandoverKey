import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

/**
 * Global error handler middleware
 * Handles all errors thrown in the application and formats them consistently
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Generate request ID if not present
  const requestId = (req as any).id || 'unknown';

  // Handle known application errors
  if (error instanceof AppError) {
    // Log operational errors at appropriate level
    if (error.isOperational) {
      logger.warn({
        type: 'operational_error',
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        requestId,
        path: req.path,
        method: req.method,
      }, `Operational error: ${error.message}`);
    } else {
      // Log non-operational errors as errors
      logger.error({
        err: error,
        type: 'application_error',
        code: error.code,
        statusCode: error.statusCode,
        requestId,
        path: req.path,
        method: req.method,
      }, `Application error: ${error.message}`);

      // In production, you could integrate with error tracking service here
      // For now, we rely on structured logging
      if (process.env.NODE_ENV === 'production') {
        logger.fatal({ err: error, requestId }, 'Critical application error');
      }
    }

    // Send error response
    const response: any = {
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    };

    // Add additional details for specific error types
    if ('details' in error && error.details) {
      response.error.details = error.details;
    }
    if ('retryAfter' in error && error.retryAfter) {
      response.error.retryAfter = error.retryAfter;
      res.setHeader('Retry-After', error.retryAfter.toString());
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({
      type: 'validation_error',
      message: 'Request validation failed',
      errors: error.issues,
      requestId,
      path: req.path,
      method: req.method,
    }, 'Request validation failed');

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues,
        requestId,
      },
    });
    return;
  }

  // Handle unexpected errors
  logger.error({
    err: error,
    type: 'unexpected_error',
    requestId,
    path: req.path,
    method: req.method,
  }, `Unexpected error: ${error.message}`);

  // In production, critical errors should be escalated
  if (process.env.NODE_ENV === 'production') {
    logger.fatal({ err: error, requestId }, 'Critical unexpected error');
  }

  // Never expose internal error details to clients
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  });
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to the error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be registered after all routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as any).id || 'unknown';

  logger.warn({
    type: 'not_found',
    path: req.path,
    method: req.method,
    requestId,
  }, `Route not found: ${req.method} ${req.path}`);

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId,
    },
  });
}
