/**
 * PRISM Tool Crib API client -- talks to /api/v1/tool-crib (createToolCribRouter -> prism_calc:tool_crib_*).
 *
 * Consumed by the Kienzle Tool Crib page. BASE_URL is relative on every form factor: the global fetch
 * proxy (installApiFetchProxy, installed once in main.tsx) rewrites it to the resolved backend origin
 * when the app is packaged (Electron/mobile); on web it stays relative. Mirrors src/api/calc.ts.
 *
 * The route wraps the engine payload as `{ result }`; this client unwraps it. A failure surfaces as a
 * non-2xx with `{ error }` and is thrown (R12 -- the page's catch shows the real backend reason).
 */
const BASE_URL = '/api/v1/tool-crib';
const TIMEOUT_MS = 10_000;

/** One tool in the crib (mirror of ToolCribEngine.ToolCribItem). */
export interface ToolCribItem {
  tool_id: string;
  description: string;
  category: string;
  location: string;
  total_quantity: number;
  available_quantity: number;
  checked_out: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  lead_time_days: number;
  supplier: string;
  avg_life_min: number;
  total_usage_min: number;
  last_ordered: string;
}

/** A single checkout record. */
export interface CheckoutRecord {
  tool_id: string;
  operator_id: string;
  machine_id: string;
  job_id: string;
  checkout_time: string;
  expected_return_time: string;
  actual_return_time?: string;
  usage_min?: number;
  condition_on_return?: 'good' | 'worn' | 'broken' | 'scrap';
}

/** Result of POST /checkout. `success:false` is a VALID denial (e.g. out of stock) -- read `message`. */
export interface ToolCribCheckout {
  success: boolean;
  record: CheckoutRecord | null;
  message: string;
  remaining_available: number;
}

/** Result of POST /checkin. */
export interface ToolCribCheckin {
  success: boolean;
  record: CheckoutRecord | null;
  remaining_life_pct: number;
  recommendation: 'return_to_stock' | 'regrind' | 'scrap';
}

/** Result of GET /inventory. */
export interface InventoryReport {
  total_items: number;
  total_value: number;
  below_reorder: ToolCribItem[];
  checked_out_count: number;
  utilization_pct: number;
  turnover_rate: number;
  categories: Record<string, { count: number; value: number }>;
}

/** One entry of GET /reorder. */
export interface ReorderRecommendation {
  tool_id: string;
  description: string;
  current_stock: number;
  reorder_point: number;
  recommended_qty: number;
  estimated_cost: number;
  urgency: 'immediate' | 'soon' | 'planned';
  reason: string;
}

export interface ToolCribCheckoutRequest {
  tool_id: string;
  operator_id: string;
  machine_id: string;
  job_id: string;
}

export interface ToolCribCheckinRequest {
  tool_id: string;
  operator_id: string;
  usage_min: number;
  condition?: 'good' | 'worn' | 'broken' | 'scrap';
}

interface ResultEnvelope<T> {
  result?: T;
  error?: unknown;
}

async function call<T>(method: 'GET' | 'POST', endpoint: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => ({}))) as ResultEnvelope<T>;
    if (!res.ok) {
      const msg = typeof payload?.error === 'string' && payload.error ? payload.error : res.statusText;
      throw new Error(msg || `tool-crib ${endpoint} failed`);
    }
    // Route wraps the engine payload as { result }. Defensive: fall back to the raw body if absent.
    return (payload && 'result' in payload ? payload.result : (payload as unknown)) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const toolCribApi = {
  inventory: () => call<InventoryReport>('GET', '/inventory'),
  reorder: () => call<ReorderRecommendation[]>('GET', '/reorder'),
  checkout: (req: ToolCribCheckoutRequest) => call<ToolCribCheckout>('POST', '/checkout', req),
  checkin: (req: ToolCribCheckinRequest) => call<ToolCribCheckin>('POST', '/checkin', req),
};
