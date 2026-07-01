/**
 * PPG API Client — typed functions for all 8 PPG endpoints.
 * Mirrors the SFC client pattern but targets /api/v1/ppg.
 */
import type {
  PpgGenerateRequest,
  PpgGenerateResult,
  PpgTemplateRequest,
  PpgTemplateResult,
  PpgProgramRequest,
  PpgProgramResult,
  PpgValidateRequest,
  PpgValidateResult,
  PpgCompareRequest,
  PpgCompareResult,
  PpgOptimizeRequest,
  PpgOptimizeResult,
  PpgControllerInfo,
  PpgOperationInfo,
  PpgApiResponse,
} from "../types/ppg";
import { ApiRequestError } from "./client";

const BASE_URL = "/api/v1/ppg";
const TIMEOUT_MS = 30_000; // PPG operations can be slower than SFC

async function ppgPost<TReq, TRes>(
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

    const json: PpgApiResponse<TRes> = await res.json();
    if (!json.ok) {
      throw new ApiRequestError(json.error || "PPG request failed", 500);
    }
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function ppgGet<TRes>(
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiRequestError(err.error || "Request failed", res.status);
    }

    const json: PpgApiResponse<TRes> = await res.json();
    if (!json.ok) {
      throw new ApiRequestError(json.error || "PPG request failed", 500);
    }
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

/** PPG API client — all 8 endpoints */
export const ppgApi = {
  /** POST /ppg/generate — Generate G-code from toolpath moves */
  generate: (params: PpgGenerateRequest, signal?: AbortSignal) =>
    ppgPost<PpgGenerateRequest, PpgGenerateResult>("/generate", params, signal),

  /** POST /ppg/template — Generate from parametric template */
  template: (params: PpgTemplateRequest, signal?: AbortSignal) =>
    ppgPost<PpgTemplateRequest, PpgTemplateResult>("/template", params, signal),

  /** POST /ppg/program — Generate multi-operation program */
  program: (params: PpgProgramRequest, signal?: AbortSignal) =>
    ppgPost<PpgProgramRequest, PpgProgramResult>("/program", params, signal),

  /** POST /ppg/validate — Validate G-code for controller compatibility */
  validate: (params: PpgValidateRequest, signal?: AbortSignal) =>
    ppgPost<PpgValidateRequest, PpgValidateResult>("/validate", params, signal),

  /** POST /ppg/compare — Compare G-code output across controllers */
  compare: (params: PpgCompareRequest, signal?: AbortSignal) =>
    ppgPost<PpgCompareRequest, PpgCompareResult>("/compare", params, signal),

  /** POST /ppg/optimize — Optimize G-code */
  optimize: (params: PpgOptimizeRequest, signal?: AbortSignal) =>
    ppgPost<PpgOptimizeRequest, PpgOptimizeResult>("/optimize", params, signal),

  /** GET /ppg/controllers — List supported CNC controllers */
  getControllers: (signal?: AbortSignal) =>
    ppgGet<PpgControllerInfo[]>("/controllers", signal),

  /** GET /ppg/operations — List supported G-code operations */
  getOperations: (signal?: AbortSignal) =>
    ppgGet<PpgOperationInfo[]>("/operations", signal),
};
