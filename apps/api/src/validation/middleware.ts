import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema, ZodIssue } from 'zod';

// Extend Express Request type to include id property
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Validation target types
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation error response format
 */
interface ValidationErrorResponse {
  error: string;
  code: string;
  details: Array<{
    field: string;
    message: string;
  }>;
  requestId?: string;
}

/**
 * List of dangerous patterns to remove from strings
 */
const DANGEROUS_PATTERNS = [
  // Script tags and content
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // All HTML tags
  /<[^>]+>/g,
  // JavaScript protocol
  /javascript:/gi,
  // Data protocol (can be used for XSS)
  /data:text\/html/gi,
  // Event handlers
  /on\w+\s*=/gi,
  // VBScript protocol
  /vbscript:/gi,
  // File protocol
  /file:/gi,
  // Null bytes
  /\0/g,
];

/**
 * Sanitize string values to prevent XSS attacks
 * Removes HTML tags, script content, and dangerous patterns
 * 
 * @param value - Value to sanitize
 * @param options - Sanitization options
 * @returns Sanitized value
 */
function sanitizeValue(
  value: unknown,
  options: { preserveWhitespace?: boolean; maxLength?: number } = {}
): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    
    // Apply all dangerous pattern removals
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // Remove control characters except newlines and tabs if preserving whitespace
    if (options.preserveWhitespace) {
      // eslint-disable-next-line no-control-regex
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else {
      // eslint-disable-next-line no-control-regex
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }
    
    // Normalize whitespace
    if (!options.preserveWhitespace) {
      sanitized = sanitized.trim();
      // Replace multiple spaces with single space
      sanitized = sanitized.replace(/\s+/g, ' ');
    }
    
    // Apply max length if specified
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    // Decode HTML entities to prevent double-encoding attacks
    sanitized = sanitized
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&');
    
    // Re-apply dangerous pattern removal after decoding
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    return sanitized;
  }
  
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, options));
  }
  
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize object keys as well
      const sanitizedKey = sanitizeValue(key, { maxLength: 100 }) as string;
      sanitized[sanitizedKey] = sanitizeValue(val, options);
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Validate file upload
 * Checks file size, type, and name for security issues
 * 
 * @param file - File object from multer or similar
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFileUpload(
  file: {
    originalname: string;
    mimetype: string;
    size: number;
  },
  options: {
    maxSize?: number; // in bytes
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = [],
    allowedExtensions = [],
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
    };
  }
  
  // Check MIME type if specified
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed`,
    };
  }
  
  // Sanitize and validate filename
  const sanitizedFilename = sanitizeValue(file.originalname, { maxLength: 255 }) as string;
  
  // Check for path traversal attempts
  if (sanitizedFilename.includes('..') || sanitizedFilename.includes('/') || sanitizedFilename.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename: path traversal detected',
    };
  }
  
  // Check file extension if specified
  if (allowedExtensions.length > 0) {
    const extension = sanitizedFilename.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed`,
      };
    }
  }
  
  // Check for double extensions (e.g., file.pdf.exe)
  const parts = sanitizedFilename.split('.');
  if (parts.length > 2) {
    return {
      valid: false,
      error: 'Invalid filename: multiple extensions detected',
    };
  }
  
  return { valid: true };
}

/**
 * Format Zod validation errors into a consistent structure
 */
function formatZodError(error: ZodError): ValidationErrorResponse['details'] {
  return error.issues.map((err: ZodIssue) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Validation middleware factory
 * 
 * Creates Express middleware that validates request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'query', or 'params')
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * router.post('/users', 
 *   validateRequest(CreateUserSchema, 'body'),
 *   userController.create
 * );
 * ```
 */
export function validateRequest<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target];
      
      // Sanitize input before validation
      const sanitizedData = sanitizeValue(dataToValidate);
      
      // Validate and parse the data
      const validatedData = await schema.parseAsync(sanitizedData);
      
      // Replace the request data with validated and sanitized data
      req[target] = validatedData as typeof req[typeof target];
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse: ValidationErrorResponse = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formatZodError(error),
          requestId: req.id,
        };
        
        res.status(400).json(errorResponse);
        return;
      }
      
      // Unexpected error during validation
      next(error);
    }
  };
}

/**
 * Validate multiple targets in a single middleware
 * 
 * @example
 * ```typescript
 * router.put('/users/:id',
 *   validateMultiple({
 *     params: UserIdSchema,
 *     body: UpdateUserSchema
 *   }),
 *   userController.update
 * );
 * ```
 */
export function validateMultiple(schemas: Partial<Record<ValidationTarget, ZodSchema>>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: ValidationErrorResponse['details'] = [];
      
      // Validate each target
      for (const [target, schema] of Object.entries(schemas) as [ValidationTarget, ZodSchema][]) {
        try {
          const dataToValidate = req[target];
          const sanitizedData = sanitizeValue(dataToValidate);
          const validatedData = await schema.parseAsync(sanitizedData);
          req[target] = validatedData as typeof req[typeof target];
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodError(error));
          }
        }
      }
      
      // If there are any validation errors, return them all
      if (errors.length > 0) {
        const errorResponse: ValidationErrorResponse = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
          requestId: req.id,
        };
        
        res.status(400).json(errorResponse);
        return;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
