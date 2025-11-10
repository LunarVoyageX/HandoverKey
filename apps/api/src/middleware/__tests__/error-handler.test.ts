import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from '../error-handler';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from '../../errors';
import { logger } from '../../config/logger';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();

    mockRequest = {
      path: '/api/test',
      method: 'GET',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    };

    mockNext = jest.fn();

    // Suppress logger output during tests
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
    jest.spyOn(logger, 'fatal').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
          requestId: 'unknown',
        },
      });
    });

    it('should handle AuthenticationError correctly', () => {
      const error = new AuthenticationError('Invalid token');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid token',
          requestId: 'unknown',
        },
      });
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          requestId: 'unknown',
        },
      });
    });

    it('should handle RateLimitError with retryAfter', () => {
      const error = new RateLimitError('Too many requests', 60);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', '60');
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: 60,
          requestId: 'unknown',
        },
      });
    });

    it('should use request ID from request if available', () => {
      const error = new ValidationError('Invalid input');
      (mockRequest as any).id = 'test-request-id';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('should handle unexpected errors without exposing details', () => {
      const error = new Error('Internal database error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId: 'unknown',
        },
      });
    });

    it('should log operational errors at warn level', () => {
      const error = new ValidationError('Invalid input');
      const warnSpy = jest.spyOn(logger, 'warn');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should log non-operational errors at error level', () => {
      const error = new AppError('Critical error', 500, 'CRITICAL', false);
      const errorSpy = jest.spyOn(logger, 'error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with correct message', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Route GET /api/test not found',
          requestId: 'unknown',
        },
      });
    });

    it('should log not found errors', () => {
      const warnSpy = jest.spyOn(logger, 'warn');

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const handler = asyncHandler(async (_req, res, _next) => {
        res.json({ success: true });
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and pass errors to next', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async (_req, _res, _next) => {
        throw error;
      });

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle rejected promises', (done) => {
      const error = new Error('Promise rejection');
      const handler = asyncHandler(async (_req, _res, _next) => {
        return Promise.reject(error);
      });

      handler(mockRequest as Request, mockResponse as Response, mockNext);

      // Use setTimeout to wait for promise to resolve
      setTimeout(() => {
        expect(mockNext).toHaveBeenCalledWith(error);
        done();
      }, 0);
    });
  });
});
