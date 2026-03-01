/**
 * Document Learning API Client — CC-EXT-MS0 U07
 *
 * Typed functions for the 5 document learning endpoints.
 * Mirrors the ERP/PPG client pattern, targets /api/v1/doc-learn.
 */
import type {
  DocUploadRequest,
  DocUploadResult,
  DocExtractRequest,
  DocExtractResult,
  DocListResult,
  DocGetRequest,
  DocGetResult,
  DocDeleteRequest,
  DocDeleteResult,
} from "../types/docLearn";
import { ApiRequestError } from "./client";

const BASE_URL = "/api/v1/doc-learn";
const TIMEOUT_MS = 120_000; // Extraction can take time

async function docPost<TReq, TRes>(
  endpoint: string,
  body: TReq,
  signal?: AbortSignal,
): Promise<TRes> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiRequestError(err.message || "Request failed", res.status, err.code);
    }

    return (await res.json()) as TRes;
  } finally {
    clearTimeout(timeout);
  }
}

async function docGet<TRes>(
  endpoint: string,
  signal?: AbortSignal,
): Promise<TRes> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      signal: combinedSignal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiRequestError(err.message || "Request failed", res.status, err.code);
    }

    return (await res.json()) as TRes;
  } finally {
    clearTimeout(timeout);
  }
}

async function docDelete<TRes>(
  endpoint: string,
  signal?: AbortSignal,
): Promise<TRes> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      signal: combinedSignal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiRequestError(err.message || "Request failed", res.status, err.code);
    }

    return (await res.json()) as TRes;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const docLearnApi = {
  /** Register a document for extraction. */
  upload: (params: DocUploadRequest, signal?: AbortSignal) =>
    docPost<DocUploadRequest, DocUploadResult>("/upload", params, signal),

  /** Run extraction on a registered document. */
  extract: (params: DocExtractRequest, signal?: AbortSignal) =>
    docPost<DocExtractRequest, DocExtractResult>("/extract", params, signal),

  /** List all registered documents. */
  list: (signal?: AbortSignal) =>
    docGet<DocListResult>("/list", signal),

  /** Get a specific document's details and knowledge. */
  get: (params: DocGetRequest, signal?: AbortSignal) =>
    docGet<DocGetResult>(`/${params.document_id}`, signal),

  /** Delete a document's knowledge. */
  delete: (params: DocDeleteRequest, signal?: AbortSignal) =>
    docDelete<DocDeleteResult>(`/${params.document_id}`, signal),
};
