export type ApiErrorKind = 'http' | 'timeout' | 'offline' | 'network' | 'parse' | 'unknown';

export type ApiErrorPresentation = {
  title: string;
  message: string;
  hint?: string;
  retryLabel: string;
};

type ApiErrorOptions = {
  kind?: ApiErrorKind;
  retryable?: boolean;
  hint?: string;
  cause?: unknown;
};

type FetchJsonOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit;
  timeoutMs?: number;
  retries?: number;
  fallbackMessage?: string;
};

const DEFAULT_TIMEOUT_MS = 12000;

function hasNavigator() {
  return typeof navigator !== 'undefined';
}

function isOffline() {
  return hasNavigator() && typeof navigator.onLine === 'boolean' && !navigator.onLine;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : typeof error === 'object'
      && error !== null
      && 'name' in error
      && (error as { name?: string }).name === 'AbortError';
}

function sleep(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function statusHint(status: number) {
  if (status === 401 || status === 403) {
    return 'Sign in again or verify that this account has access to the requested workflow.';
  }

  if (status === 404) {
    return 'The route or record is not available in this environment yet.';
  }

  if (status === 408 || status === 429 || status >= 500) {
    return 'PRISM is available but busy right now. Retry in a moment.';
  }

  return undefined;
}

function defaultMessageForStatus(status: number, fallbackMessage: string) {
  if (status === 401 || status === 403) {
    return 'PRISM rejected this request because the current session is not authorized.';
  }

  if (status === 404) {
    return 'PRISM could not find the requested route or record.';
  }

  if (status === 408) {
    return 'PRISM took too long to respond to this request.';
  }

  if (status === 429) {
    return 'PRISM is rate-limiting requests right now.';
  }

  if (status >= 500) {
    return 'PRISM hit a server-side problem while handling this request.';
  }

  return fallbackMessage;
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly retryable: boolean;
  readonly hint?: string;

  constructor(status: number, message: string, options: ApiErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
    this.kind = options.kind ?? 'unknown';
    this.retryable = options.retryable ?? false;
    this.hint = options.hint;
  }
}

async function readJsonSafely(response: Response) {
  return response.json().catch(() => null);
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === 'object' && payload !== null) {
    const errorField = (payload as { error?: unknown }).error;
    if (typeof errorField === 'string' && errorField.trim().length > 0) {
      return errorField;
    }

    if (
      typeof errorField === 'object'
      && errorField !== null
      && 'message' in errorField
      && typeof (errorField as { message?: unknown }).message === 'string'
      && (errorField as { message: string }).message.trim().length > 0
    ) {
      return (errorField as { message: string }).message;
    }
  }

  return null;
}

export function toApiError(error: unknown, fallbackMessage = 'Request failed') {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAbortError(error)) {
    return new ApiError(408, 'PRISM did not respond before the request timed out.', {
      kind: 'timeout',
      retryable: true,
      hint: 'Retry in a moment. If it keeps timing out, check the local server and network posture.',
      cause: error,
    });
  }

  if (isOffline()) {
    return new ApiError(0, 'This device appears to be offline, so PRISM could not reach the service.', {
      kind: 'offline',
      retryable: true,
      hint: 'Reconnect to the network and retry.',
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError(0, error.message || fallbackMessage, {
      kind: 'network',
      retryable: true,
      hint: 'Check the local PRISM server and your connection, then retry.',
      cause: error,
    });
  }

  return new ApiError(0, fallbackMessage, {
    kind: 'unknown',
    retryable: false,
    cause: error,
  });
}

export function describeApiError(error: unknown, fallbackMessage = 'Data unavailable'): ApiErrorPresentation {
  const issue = toApiError(error, fallbackMessage);

  if (issue.kind === 'offline') {
    return {
      title: 'Offline',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Retry',
    };
  }

  if (issue.kind === 'timeout') {
    return {
      title: 'Request timed out',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Try again',
    };
  }

  if (issue.kind === 'network') {
    return {
      title: 'Connection issue',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Retry',
    };
  }

  if (issue.kind === 'parse') {
    return {
      title: 'Unexpected response',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Retry',
    };
  }

  if (issue.status === 401 || issue.status === 403) {
    return {
      title: 'Access required',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Retry',
    };
  }

  if (issue.status === 404) {
    return {
      title: 'Not available',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Retry',
    };
  }

  if (issue.status === 429 || issue.status >= 500) {
    return {
      title: 'Service issue',
      message: issue.message,
      hint: issue.hint,
      retryLabel: 'Try again',
    };
  }

  return {
    title: 'Data unavailable',
    message: issue.message,
    hint: issue.hint,
    retryLabel: 'Retry',
  };
}

export function isRetryableApiError(error: unknown) {
  return toApiError(error).retryable;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const {
    method = 'GET',
    headers,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = method.toUpperCase() === 'GET' ? 1 : 0,
    fallbackMessage = 'Request failed',
  } = options;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (isOffline()) {
        throw new ApiError(0, 'This device appears to be offline, so PRISM could not reach the service.', {
          kind: 'offline',
          retryable: true,
          hint: 'Reconnect to the network and retry.',
        });
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await readJsonSafely(response);
        const message =
          extractErrorMessage(payload)
          ?? defaultMessageForStatus(response.status, fallbackMessage)
          ?? response.statusText
          ?? fallbackMessage;

        throw new ApiError(response.status, message, {
          kind: 'http',
          retryable: response.status === 408 || response.status === 429 || response.status >= 500,
          hint: statusHint(response.status),
        });
      }

      const payload = await response.json().catch((parseError: unknown) => {
        throw new ApiError(response.status, 'PRISM returned a response that could not be parsed as JSON.', {
          kind: 'parse',
          retryable: false,
          hint: 'Check the backend route contract or server logs for malformed output.',
          cause: parseError,
        });
      });

      return payload as T;
    } catch (error) {
      const issue = toApiError(error, fallbackMessage);
      if (attempt >= retries || !issue.retryable) {
        throw issue;
      }

      await sleep(Math.min(250 * 2 ** attempt, 1000));
    } finally {
      globalThis.clearTimeout(timeoutHandle);
    }
  }
}
