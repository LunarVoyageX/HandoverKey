/**
 * Advanced input sanitization utilities
 *
 * This module provides comprehensive sanitization functions to prevent
 * XSS, SQL injection, and other injection attacks.
 */

/**
 * Sanitize HTML content by removing dangerous tags and attributes
 * Uses a whitelist approach for maximum security
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  // Remove all HTML tags - we don't allow any HTML in user input
  // If you need to allow specific tags, use a library like DOMPurify
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize SQL-like input by escaping special characters
 * Note: This is a defense-in-depth measure. Always use parameterized queries!
 *
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeSqlInput(input: string): string {
  // Escape single quotes and other SQL special characters
  return input
    .replace(/'/g, "''")
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "");
}

/**
 * Sanitize email address
 * Validates and normalizes email format
 *
 * @param email - Email address to sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Remove any potential XSS attempts
  const sanitized = trimmed.replace(/[<>'"]/g, "");

  return sanitized;
}

/**
 * Sanitize URL
 * Validates and sanitizes URL to prevent javascript: and data: protocols
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const trimmed = url.trim();

    // Block dangerous protocols
    const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
    const lowerUrl = trimmed.toLowerCase();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return null;
      }
    }

    // Validate URL format
    // eslint-disable-next-line no-undef
    const urlObj = new URL(trimmed);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return null;
    }

    return urlObj.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename
 * Removes path traversal attempts and dangerous characters
 *
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and parent directory references
  let sanitized = filename
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .replace(/\0/g, "");

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.split(".").pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf("."));
    sanitized = nameWithoutExt.substring(0, 250) + "." + extension;
  }

  return sanitized.trim();
}

/**
 * Sanitize JSON string
 * Validates and parses JSON, then re-stringifies to ensure safety
 *
 * @param jsonString - JSON string to sanitize
 * @returns Sanitized JSON string or null if invalid
 */
export function sanitizeJson(jsonString: string): string | null {
  try {
    // Parse and re-stringify to validate and normalize
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

/**
 * Sanitize phone number
 * Removes non-numeric characters and validates format
 *
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number or null if invalid
 */
export function sanitizePhoneNumber(phone: string): string | null {
  // Remove all non-numeric characters except + at the start
  let sanitized = phone.trim();

  // Allow + at the start for international numbers
  const hasPlus = sanitized.startsWith("+");
  sanitized = sanitized.replace(/[^\d]/g, "");

  if (hasPlus) {
    sanitized = "+" + sanitized;
  }

  // Validate length (between 10 and 15 digits)
  const digitCount = sanitized.replace(/\D/g, "").length;
  if (digitCount < 10 || digitCount > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize base64 string
 * Validates base64 format and removes invalid characters
 *
 * @param base64 - Base64 string to sanitize
 * @returns Sanitized base64 string or null if invalid
 */
export function sanitizeBase64(base64: string): string | null {
  // Remove whitespace
  const trimmed = base64.replace(/\s/g, "");

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Regex.test(trimmed)) {
    return null;
  }

  // Validate padding
  const paddingCount = (trimmed.match(/=/g) || []).length;
  if (paddingCount > 2) {
    return null;
  }

  // Ensure padding is only at the end
  if (paddingCount > 0 && !trimmed.endsWith("=".repeat(paddingCount))) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize integer input
 * Validates and converts to integer
 *
 * @param input - Input to sanitize
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized integer or null if invalid
 */
export function sanitizeInteger(
  input: string | number,
  min?: number,
  max?: number,
): number | null {
  const num = typeof input === "string" ? parseInt(input, 10) : input;

  if (isNaN(num) || !Number.isInteger(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  return num;
}

/**
 * Sanitize UUID
 * Validates UUID format
 *
 * @param uuid - UUID to sanitize
 * @returns Sanitized UUID or null if invalid
 */
export function sanitizeUuid(uuid: string): string | null {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const trimmed = uuid.trim().toLowerCase();

  if (!uuidRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize array of strings
 * Sanitizes each string in the array and removes duplicates
 *
 * @param arr - Array of strings to sanitize
 * @param maxLength - Maximum length for each string
 * @param maxItems - Maximum number of items in array
 * @returns Sanitized array
 */
export function sanitizeStringArray(
  arr: string[],
  maxLength: number = 100,
  maxItems: number = 100,
): string[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  // Sanitize each item
  const sanitized = arr
    .map((item) => {
      if (typeof item !== "string") {
        return "";
      }

      // Remove HTML and dangerous patterns
      let clean = item
        .replace(/<[^>]*>/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .trim();

      // Limit length
      if (clean.length > maxLength) {
        clean = clean.substring(0, maxLength);
      }

      return clean;
    })
    .filter((item) => item.length > 0);

  // Remove duplicates
  const unique = [...new Set(sanitized)];

  // Limit array size
  return unique.slice(0, maxItems);
}
