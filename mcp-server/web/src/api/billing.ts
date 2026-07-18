import { ApiError, getRequestHeaders } from './client';

/**
 * Billing API client.
 *
 * Backend routes (mcp-server/src/routes/billing.ts) return FLAT JSON
 * ({ url, sessionId } / status object) -- NOT the {result}-wrapped PrismResponse
 * shape. billingRequest returns the parsed body directly.
 */
const BILLING_BASE = '/api/v1/billing';

export interface BillingStatusResult {
  userId: string;
  plan: string;
  role: string;
  prices: Record<string, { monthly_cents: number; annual_cents: number; label: string }>;
  authenticated?: boolean;
  timestamp: string;
}

export interface CheckoutResult {
  url: string;
  sessionId?: string;
}

/** type ceiling for a post-processor purchase; backend accepts monthly|annual|permanent. */
export type PostPurchaseType = 'monthly' | 'annual' | 'permanent' | 'subscription';

async function billingRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BILLING_BASE}${path}`, {
    method,
    headers: getRequestHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      typeof err?.error === 'string'
        ? err.error
        : err?.error?.message || err?.message || 'Billing request failed';
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

/** Current subscription status + canonical plan prices. Backend: GET /status (flat). */
export async function getBillingStatus(): Promise<BillingStatusResult> {
  return billingRequest<BillingStatusResult>('GET', '/status');
}

/** Start a subscription checkout. Backend: POST /create-checkout { plan }. */
export async function createCheckout(plan: string): Promise<CheckoutResult> {
  return billingRequest<CheckoutResult>('POST', '/create-checkout', { plan });
}

/**
 * Open the Stripe billing portal (manage / upgrade / cancel a subscription).
 * Backend: POST /portal -- resolves the Stripe customerId from the authenticated
 * user server-side (U-COMM-02b), so no arg is needed. Returns 409 NO_CUSTOMER if
 * the user has never completed a checkout. Cancellation happens inside the portal
 * (there is no dedicated /cancel route).
 */
export async function createPortal(): Promise<{ url: string }> {
  return billingRequest<{ url: string }>('POST', '/portal', {});
}

/**
 * Purchase / subscribe to a post-processor controller.
 *
 * FIXED 2026-06-21 (slot:quebec): the previous implementation called
 * POST /purchase with body { controller_id, license_type } -- but no such
 * route exists; the backend registers POST /purchase-post with body
 * { controller, type } (routes/billing.ts:133,139). Every post purchase
 * therefore 404'd silently. Legacy 'subscription' maps to backend 'monthly'.
 */
export async function purchasePost(
  controller: string,
  type: PostPurchaseType,
): Promise<CheckoutResult> {
  const backendType = type === 'subscription' ? 'monthly' : type;
  return billingRequest<CheckoutResult>('POST', '/purchase-post', {
    controller,
    type: backendType,
  });
}

/** A user's perpetual (one-time) license -- shape from LicenseStore.LicenseRecord. */
export interface LicenseSummary {
  licenseKey: string;
  /** ONE_TIME_PRODUCTS id: sfc_perpetual | post_perpetual | post_bundle_5 | post_bundle_all. */
  product: string;
  /** Blanket entitlement key this grants (null for a controller-scoped product). */
  feature: string | null;
  /** Controller id for a controller-scoped product (post_perpetual). */
  scope?: string | null;
  status: 'active' | 'revoked';
  activatedAt?: string | null;
}

export interface LicensesResult {
  licenses: LicenseSummary[];
  count: number;
}

/** The authenticated user's perpetual licenses. Backend: GET /licenses (flat). */
export async function getLicenses(): Promise<LicensesResult> {
  return billingRequest<LicensesResult>('GET', '/licenses');
}

export const billingApi = {
  getBillingStatus,
  createCheckout,
  createPortal,
  purchasePost,
  getLicenses,
};
