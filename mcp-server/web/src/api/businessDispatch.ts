/**
 * businessDispatch.ts — shared client envelope for the prism_business MCP dispatcher.
 *
 * prism_business actions are invoked via POST /api/v1/business/dispatch with a { action, params }
 * body (the route in src/routes/business.ts; the same path hotelBusiness.ts targets). That route is
 * ALLOWLISTED server-side — only curated read-safe actions are reachable; everything else returns 403
 * (deny-by-default, see src/data/business-dispatch-allowlist.ts). This is the single canonical envelope
 * + response normalizer that business-domain client modules (vendorNetwork.ts, …) build on, so fetch
 * plumbing is not re-implemented per module.
 *
 * Response-shape note (verified 2026-05-31 against businessDispatcher.ts): the dispatcher
 * is INCONSISTENT — most actions emit { success, data } (e.g. vendor_rank,
 * vendor_compute_scorecard, vendor_list_all) while a few emit the bare payload
 * (e.g. vendor_catalog_query → VendorRecord[]). `unwrapBusiness` normalizes both so callers
 * always receive the underlying domain value.
 *
 * P2 follow-up: hotelBusiness.ts predates this module and carries its own private callAction
 * copy. Migrate it onto callBusinessAction in a future unit — left untouched here so its
 * shipped tests are not disturbed. — hotel, HOTEL-NETPLAT-UI
 */

const API_BASE = '/api/v1/business';
const TIMEOUT_MS = 15_000;

export class BusinessDispatchError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'BusinessDispatchError';
  }
}

/** The common `{ success, data }` dispatch envelope. */
export interface BusinessEnvelope<T> {
  success: boolean;
  data: T;
}

/**
 * True when `raw` is the `{ success, data }` envelope (vs. a bare payload).
 * Requires `success` to be a BOOLEAN — so a legitimate domain object that merely happens to carry
 * both `success` and `data` keys (with `success` non-boolean) is NOT mistaken for the envelope and
 * silently unwrapped to its inner `data`.
 */
function isEnvelope(raw: unknown): raw is BusinessEnvelope<unknown> {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'success' in raw &&
    typeof (raw as { success: unknown }).success === 'boolean' &&
    'data' in raw
  );
}

/**
 * Normalize the dispatcher's two observed shapes to the underlying domain value:
 * `{ success, data }` → `data`; a bare payload → itself.
 */
export function unwrapBusiness<T>(raw: unknown): T {
  return (isEnvelope(raw) ? raw.data : raw) as T;
}

/**
 * POST a { action, params } envelope to the prism_business dispatch route and return the
 * RAW parsed JSON (callers apply {@link unwrapBusiness} when they want the domain value).
 * Aborts after TIMEOUT_MS; throws {@link BusinessDispatchError} on a non-2xx response.
 */
export async function callBusinessAction<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('prism_auth_token') : null;
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, params }),
        signal: controller.signal,
      });
    } catch (e) {
      // fetch() rejects on abort (timeout) or transport failure — normalize BOTH to
      // BusinessDispatchError so every caller sees one error type (the non-2xx path already does).
      if ((e as { name?: string })?.name === 'AbortError') {
        throw new BusinessDispatchError(408, `business dispatch timed out after ${TIMEOUT_MS}ms (${action})`);
      }
      throw new BusinessDispatchError(0, `network error calling ${action}: ${(e as Error)?.message ?? 'fetch failed'}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      throw new BusinessDispatchError(res.status, text || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
