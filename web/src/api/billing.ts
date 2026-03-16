/**
 * PRISM Web — Billing API client
 * Covers subscription checkout, portal, billing status, and post-processor purchases.
 */

const BASE = "/api/v1/billing";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("prism-auth-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const billingApi = {
  /** GET /status — current user subscription status */
  getStatus: (): Promise<{
    userId: string;
    plan: string;
    role: string;
    prices: Record<string, { monthly_cents: number; annual_cents: number; label: string }>;
    timestamp: string;
  }> =>
    fetch(BASE + "/status", { headers: authHeaders() }).then((r) => {
      if (!r.ok) throw new Error(`Billing status failed: ${r.status}`);
      return r.json();
    }),

  /** POST /create-checkout — initiate subscription upgrade checkout */
  createCheckout: (plan: string): Promise<{ url: string; sessionId?: string }> =>
    fetch(BASE + "/create-checkout", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ plan }),
    }).then((r) => {
      if (!r.ok) throw new Error(`Checkout failed: ${r.status}`);
      return r.json();
    }),

  /** POST /portal — open Stripe customer billing portal */
  createPortal: (): Promise<{ url: string }> =>
    fetch(BASE + "/portal", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    }).then((r) => {
      if (!r.ok) throw new Error(`Portal failed: ${r.status}`);
      return r.json();
    }),

  /** POST /purchase-post — purchase or subscribe to a post-processor controller */
  purchasePost: (
    controller: string,
    type: "monthly" | "annual" | "permanent",
  ): Promise<{ url: string; sessionId?: string }> =>
    fetch(BASE + "/purchase-post", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ controller, type }),
    }).then((r) => {
      if (!r.ok) throw new Error(`Post purchase failed: ${r.status}`);
      return r.json();
    }),
};
