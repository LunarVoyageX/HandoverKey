import { z } from 'zod';

/**
 * Base64 string validation
 */
const base64Regex = /^[A-Za-z0-9+/]+=*$/;

/**
 * Schema for creating a vault entry
 */
export const CreateVaultEntrySchema = z.object({
  encryptedData: z
    .string()
    .min(1, 'Encrypted data is required')
    .max(10485760, 'Encrypted data cannot exceed 10MB') // 10MB limit
    .regex(base64Regex, 'Encrypted data must be valid base64'),
  iv: z
    .string()
    .min(1, 'IV is required')
    .regex(base64Regex, 'IV must be valid base64')
    .length(24, 'IV must be 24 characters (16 bytes base64)'), // 16 bytes = 24 chars in base64
  algorithm: z
    .literal('AES-GCM')
    .or(z.literal('AES-256-GCM'))
    .default('AES-GCM'),
  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional(),
  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be less than 50 characters')
        .trim()
    )
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  title: z
    .string()
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),
});

/**
 * Schema for updating a vault entry
 */
export const UpdateVaultEntrySchema = z.object({
  encryptedData: z
    .string()
    .min(1, 'Encrypted data is required')
    .max(10485760, 'Encrypted data cannot exceed 10MB') // 10MB limit
    .regex(base64Regex, 'Encrypted data must be valid base64')
    .optional(),
  iv: z
    .string()
    .min(1, 'IV is required')
    .regex(base64Regex, 'IV must be valid base64')
    .length(24, 'IV must be 24 characters (16 bytes base64)')
    .optional(),
  algorithm: z
    .literal('AES-GCM')
    .or(z.literal('AES-256-GCM'))
    .default('AES-GCM')
    .optional(),
  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional(),
  tags: z
    .array(
      z.string()
        .min(1, 'Tag cannot be empty')
        .max(50, 'Tag must be less than 50 characters')
        .trim()
    )
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  title: z
    .string()
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),
}).refine(
  (data) => {
    // Ensure at least one field is being updated
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

/**
 * Schema for vault entry query parameters
 */
export const VaultQuerySchema = z.object({
  category: z
    .string()
    .max(100, 'Category must be less than 100 characters')
    .trim()
    .optional(),
  tag: z
    .string()
    .max(50, 'Tag must be less than 50 characters')
    .trim()
    .optional(),
  search: z
    .string()
    .max(200, 'Search query must be less than 200 characters')
    .trim()
    .optional(),
  limit: z
    .coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50)
    .optional(),
  offset: z
    .coerce
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0)
    .optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'category'])
    .default('created_at')
    .optional(),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc')
    .optional(),
});

/**
 * Schema for vault entry ID parameter
 */
export const VaultEntryIdSchema = z.object({
  id: z.string().uuid('Invalid vault entry ID'),
});
