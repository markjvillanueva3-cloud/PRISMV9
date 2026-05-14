/**
 * WEDM-ERP API Client (U-WEDM-ERP08-10 support)
 *
 * Thin wrapper around /api/v1/wedm-erp/* endpoints for the QuoteBuilder,
 * JobsPage, and completion modal flows.
 */
import { fetchJson } from './requestCore';
import { getRequestHeaders } from './client';

const BASE = '/api/v1/wedm-erp';

export interface WedmEstimateInput {
  part_id?: string;
  material: string;
  perimeter_mm: number;
  thickness_mm: number;
  pass_count?: number;
  wire_type?: 'brass' | 'coated' | 'molybdenum' | 'tungsten';
  wire_diameter_mm?: number;
  quantity?: number;
  machine_rate_per_hr?: number;
  setup_hrs?: number;
}

export interface WedmEstimateResponse {
  ok: boolean;
  data?: {
    cost_estimate: Record<string, unknown>;
    quote: {
      line_items: Array<{
        description: string;
        total: number;
        category: string;
        source: string;
      }>;
      subtotal: number;
      overhead: number;
      margin: number;
      total: number;
      total_uncertainty_pct: number;
      confidence_interval: { low: number; high: number; confidence: number };
    };
  };
  error?: string;
}

export interface WedmJobCompleteInput {
  actual_cutting_time_min: number;
  actual_wire_m: number;
  actual_passes: number;
  actual_cost_usd: number;
  completed_at?: string;
  completion_notes?: string;
  machine_rate_usd_per_hr?: number;
  tax_rate_pct?: number;
}

export interface WedmInvoiceResponse {
  ok: boolean;
  data?: {
    invoice: {
      invoice_number: string;
      job_id: string;
      total_usd: number;
      subtotal_usd: number;
      cost_variance_pct: number;
      requires_overage_approval: boolean;
      overage_approval?: { request_id: string; status: string };
      lines: Array<{ description: string; amount_usd: number; category: string }>;
      notes: string[];
    };
  };
  error?: string;
}

function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(body),
    fallbackMessage: `WEDM-ERP request failed: ${path}`,
  });
}

function get<T>(path: string): Promise<T> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'GET',
    headers: getRequestHeaders(),
    fallbackMessage: `WEDM-ERP request failed: ${path}`,
  });
}

export const wedmErpApi = {
  estimate: (input: WedmEstimateInput) => post<WedmEstimateResponse>('/quote/estimate', input),
  quoteFromProgram: (input: { program_result: unknown; quantity?: number }) =>
    post<WedmEstimateResponse>('/quote/from-program', input),
  quantityBreaks: (input: { cost_estimate: unknown; quantities: number[] }) =>
    post<{ ok: boolean; data?: { quantity_breaks: Array<{ quantity: number; unit_price: number; total_price: number; savings_pct_vs_qty1: number }> }; error?: string }>(
      '/quote/quantity-breaks',
      input,
    ),
  creditCost: (input: { perimeter_mm: number; thickness_mm: number; passes: number; taper_count?: number }) =>
    post<{ ok: boolean; data?: { credits: number; breakdown: Record<string, number> }; error?: string }>(
      '/quote/credit-cost',
      input,
    ),
  jobCreate: (input: { program_result: unknown; options?: Record<string, unknown>; quote?: unknown }) =>
    post<{ ok: boolean; data?: { job: { jobId: string; [k: string]: unknown } }; error?: string }>(
      '/job/create',
      input,
    ),
  jobGet: (id: string) =>
    get<{ ok: boolean; data?: { job: Record<string, unknown> }; error?: string }>(`/job/${encodeURIComponent(id)}`),
  jobComplete: (id: string, input: WedmJobCompleteInput) =>
    post<WedmInvoiceResponse>(`/job/${encodeURIComponent(id)}/complete`, input as unknown as Record<string, unknown>),
  overageApprove: (id: string, approver: string) =>
    post<{ ok: boolean; data?: { overage: { status: string } }; error?: string }>(
      `/overage/${encodeURIComponent(id)}/approve`,
      { approver },
    ),
  overageReject: (id: string, approver: string, reason?: string) =>
    post<{ ok: boolean; data?: { overage: { status: string } }; error?: string }>(
      `/overage/${encodeURIComponent(id)}/reject`,
      { approver, reason },
    ),
};
