/**
 * Resilient Fetch — Retry Logic & Error Handling
 * S4-MS1 P0-U04: Error Handling & Offline Support
 *
 * Wraps fetch with:
 * - Automatic retries with exponential backoff
 * - Timeout handling
 * - Offline detection
 * - Error normalization
 */

export interface FetchOptions extends RequestInit {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Skip retry for these status codes (default: [400, 401, 403, 404, 422]) */
  noRetryStatuses?: number[];
  /** Callback on retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly isOffline: boolean = false,
    public readonly isTimeout: boolean = false,
    public readonly response?: Response
  ) {
    super(message);
    this.name = 'FetchError';
  }

  static fromResponse(response: Response, message?: string): FetchError {
    return new FetchError(
      message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      response.statusText,
      false,
      false,
      response
    );
  }

  static offline(): FetchError {
    return new FetchError(
      'Network unavailable. Please check your connection.',
      0,
      'Offline',
      true,
      false
    );
  }

  static timeout(): FetchError {
    return new FetchError(
      'Request timed out. Please try again.',
      0,
      'Timeout',
      false,
      true
    );
  }
}

const DEFAULT_NO_RETRY_STATUSES = [400, 401, 403, 404, 422];

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30s
}

/**
 * Check if we're offline
 */
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resilient fetch with retries, timeout, and error handling
 */
export async function resilientFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    noRetryStatuses = DEFAULT_NO_RETRY_STATUSES,
    onRetry,
    ...fetchOptions
  } = options;

  // Check if offline before even trying
  if (isOffline()) {
    throw FetchError.offline();
  }

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);

      // Success - return response
      if (response.ok) {
        return response;
      }

      // Check if we should retry this status
      if (noRetryStatuses.includes(response.status)) {
        throw FetchError.fromResponse(response);
      }

      // Server error - retry
      lastError = FetchError.fromResponse(response);
    } catch (error) {
      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = FetchError.timeout();
      }
      // Handle offline
      else if (isOffline()) {
        throw FetchError.offline();
      }
      // Handle fetch error
      else if (error instanceof FetchError) {
        lastError = error;
        // Don't retry client errors
        if (noRetryStatuses.includes(error.status)) {
          throw error;
        }
      }
      // Handle other errors
      else if (error instanceof Error) {
        lastError = error;
      }
    }

    // Don't sleep after last attempt
    if (attempt < retries) {
      onRetry?.(attempt + 1, lastError);
      await sleep(getBackoffDelay(attempt, retryDelay));

      // Check if we went offline during retry wait
      if (isOffline()) {
        throw FetchError.offline();
      }
    }
  }

  throw lastError;
}

/**
 * Resilient JSON fetch - parses response as JSON
 */
export async function resilientFetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await resilientFetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  return response.json();
}

/**
 * Resilient POST with JSON body
 */
export async function resilientPost<T>(
  url: string,
  body: unknown,
  options: FetchOptions = {}
): Promise<T> {
  const response = await resilientFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}
