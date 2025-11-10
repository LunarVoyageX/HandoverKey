/**
 * Request ID middleware
 * 
 * Generates or extracts a unique request ID for tracing requests
 * through the system. The request ID is added to the request object
 * and included in the response headers.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extend Express Request type to include id property
 * Note: This is also declared in validation/middleware.ts
 * Both declarations must match exactly
 */
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Request ID middleware
 * 
 * Generates a unique ID for each request or uses the one provided
 * in the X-Request-ID header. The ID is added to both the request
 * object and response headers for tracing.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Add to request object (ensure it's always set)
  req.id = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
