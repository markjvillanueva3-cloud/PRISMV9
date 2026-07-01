/**
 * ERP API Client — typed functions for all 10 ERP endpoints.
 * Mirrors the PPG client pattern but targets /api/v1/erp.
 */
import type {
  ErpQuoteGenerateRequest,
  ErpQuoteGenerateResult,
  ErpQuoteBreakdownRequest,
  ErpQuoteBreakdownResult,
  ErpQuoteCompareRequest,
  ErpQuoteCompareResult,
  ErpJobPlanRequest,
  ErpJobPlanResult,
  ErpJobScheduleRequest,
  ErpJobScheduleResult,
  ErpJobTrackRequest,
  ErpJobTrackResult,
  ErpCapacityRequest,
  ErpCapacityResult,
  ErpBottleneckRequest,
  ErpBottleneckResult,
  ErpOeeRequest,
  ErpOeeResult,
  ErpPredictiveRequest,
  ErpPredictiveResult,
  ErpApiResponse,
} from "../types/erp";
import { ApiRequestError } from "./client";

const BASE_URL = "/api/v1/erp";
const TIMEOUT_MS = 30_000;

async function erpPost<TReq, TRes>(
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiRequestError(err.error || "Request failed", res.status);
    }

    const json: ErpApiResponse<TRes> = await res.json();
    if (!json.ok) {
      throw new ApiRequestError(json.error || "ERP request failed", 500);
    }
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

/** ERP API client — all 10 endpoints */
export const erpApi = {
  // --- Quoting ---

  /** POST /erp/quote/generate — Generate manufacturing quote */
  quoteGenerate: (params: ErpQuoteGenerateRequest, signal?: AbortSignal) =>
    erpPost<ErpQuoteGenerateRequest, ErpQuoteGenerateResult>("/quote/generate", params, signal),

  /** POST /erp/quote/breakdown — Detailed cost breakdown */
  quoteBreakdown: (params: ErpQuoteBreakdownRequest, signal?: AbortSignal) =>
    erpPost<ErpQuoteBreakdownRequest, ErpQuoteBreakdownResult>("/quote/breakdown", params, signal),

  /** POST /erp/quote/compare — Compare quotes across strategies */
  quoteCompare: (params: ErpQuoteCompareRequest, signal?: AbortSignal) =>
    erpPost<ErpQuoteCompareRequest, ErpQuoteCompareResult>("/quote/compare", params, signal),

  // --- Job Management ---

  /** POST /erp/job/plan — Plan manufacturing job */
  jobPlan: (params: ErpJobPlanRequest, signal?: AbortSignal) =>
    erpPost<ErpJobPlanRequest, ErpJobPlanResult>("/job/plan", params, signal),

  /** POST /erp/job/schedule — Schedule job on machines */
  jobSchedule: (params: ErpJobScheduleRequest, signal?: AbortSignal) =>
    erpPost<ErpJobScheduleRequest, ErpJobScheduleResult>("/job/schedule", params, signal),

  /** POST /erp/job/track — Track job progress */
  jobTrack: (params: ErpJobTrackRequest, signal?: AbortSignal) =>
    erpPost<ErpJobTrackRequest, ErpJobTrackResult>("/job/track", params, signal),

  // --- Business Intelligence ---

  /** POST /erp/analytics/capacity — Capacity utilization */
  capacity: (params: ErpCapacityRequest, signal?: AbortSignal) =>
    erpPost<ErpCapacityRequest, ErpCapacityResult>("/analytics/capacity", params, signal),

  /** POST /erp/analytics/bottleneck — Bottleneck identification */
  bottleneck: (params: ErpBottleneckRequest, signal?: AbortSignal) =>
    erpPost<ErpBottleneckRequest, ErpBottleneckResult>("/analytics/bottleneck", params, signal),

  /** POST /erp/analytics/oee — Overall Equipment Effectiveness */
  oee: (params: ErpOeeRequest, signal?: AbortSignal) =>
    erpPost<ErpOeeRequest, ErpOeeResult>("/analytics/oee", params, signal),

  /** POST /erp/analytics/predictive — Predictive maintenance */
  predictive: (params: ErpPredictiveRequest, signal?: AbortSignal) =>
    erpPost<ErpPredictiveRequest, ErpPredictiveResult>("/analytics/predictive", params, signal),
};
