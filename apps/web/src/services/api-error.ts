import axios from "axios";

interface ApiErrorData {
  message?: string;
  error?: {
    message?: string;
    code?: string;
    details?: Array<{ message?: string }>;
  };
}

/**
 * Extracts a human-readable error message from an Axios error response.
 * Falls back to a generic message when the response shape is unexpected.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as ApiErrorData;
    const message = data.message || data.error?.message || fallback;
    const detail = data.error?.details?.[0]?.message;
    return detail ? `${message}: ${detail}` : message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}
