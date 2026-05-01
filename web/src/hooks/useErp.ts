/**
 * ERP React hooks — wraps each ERP API call with loading/error/data state.
 * Mirrors the usePpg.ts pattern.
 */
import { useCallback, useRef, useState } from "react";
import { erpApi } from "../api/erp";
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
} from "../types/erp";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Generic hook for ERP POST calls */
function useErpCall<TReq, TRes>(
  apiFn: (params: TReq, signal?: AbortSignal) => Promise<TRes>,
) {
  const [state, setState] = useState<AsyncState<TRes>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (params: TReq) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiFn(params, controller.signal);
        if (!controller.signal.aborted) {
          setState({ data: result, loading: false, error: null });
        }
        return result;
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return null;
        const msg = (e as Error).message || "ERP request failed";
        setState({ data: null, loading: false, error: msg });
        return null;
      }
    },
    [apiFn],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// ---------------------------------------------------------------------------
// Exported hooks — one per ERP endpoint
// ---------------------------------------------------------------------------

// --- Quoting ---

/** POST /erp/quote/generate — Generate manufacturing quote */
export const useErpQuoteGenerate = () =>
  useErpCall<ErpQuoteGenerateRequest, ErpQuoteGenerateResult>(erpApi.quoteGenerate);

/** POST /erp/quote/breakdown — Detailed cost breakdown */
export const useErpQuoteBreakdown = () =>
  useErpCall<ErpQuoteBreakdownRequest, ErpQuoteBreakdownResult>(erpApi.quoteBreakdown);

/** POST /erp/quote/compare — Compare quotes across strategies */
export const useErpQuoteCompare = () =>
  useErpCall<ErpQuoteCompareRequest, ErpQuoteCompareResult>(erpApi.quoteCompare);

// --- Job Management ---

/** POST /erp/job/plan — Plan manufacturing job */
export const useErpJobPlan = () =>
  useErpCall<ErpJobPlanRequest, ErpJobPlanResult>(erpApi.jobPlan);

/** POST /erp/job/schedule — Schedule job on machines */
export const useErpJobSchedule = () =>
  useErpCall<ErpJobScheduleRequest, ErpJobScheduleResult>(erpApi.jobSchedule);

/** POST /erp/job/track — Track job progress */
export const useErpJobTrack = () =>
  useErpCall<ErpJobTrackRequest, ErpJobTrackResult>(erpApi.jobTrack);

// --- Business Intelligence ---

/** POST /erp/analytics/capacity — Capacity utilization */
export const useErpCapacity = () =>
  useErpCall<ErpCapacityRequest, ErpCapacityResult>(erpApi.capacity);

/** POST /erp/analytics/bottleneck — Bottleneck identification */
export const useErpBottleneck = () =>
  useErpCall<ErpBottleneckRequest, ErpBottleneckResult>(erpApi.bottleneck);

/** POST /erp/analytics/oee — Overall Equipment Effectiveness */
export const useErpOee = () =>
  useErpCall<ErpOeeRequest, ErpOeeResult>(erpApi.oee);

/** POST /erp/analytics/predictive — Predictive maintenance */
export const useErpPredictive = () =>
  useErpCall<ErpPredictiveRequest, ErpPredictiveResult>(erpApi.predictive);
