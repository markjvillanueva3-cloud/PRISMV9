import type { ApiError } from "../types/sfc";

const BASE_URL = "/api/v1/sfc";
const TIMEOUT_MS = 15_000;

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function post<TReq, TRes>(endpoint: string, body: TReq, signal?: AbortSignal): Promise<TRes> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Combine external signal with timeout
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });

    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiRequestError(err.message || "Request failed", res.status, err.code);
    }

    return (await res.json()) as TRes;
  } finally {
    clearTimeout(timeout);
  }
}
