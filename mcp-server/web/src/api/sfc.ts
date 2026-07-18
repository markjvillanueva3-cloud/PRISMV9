import { getRequestHeaders } from "./client";
import { ApiError } from "./requestCore";
import { assertNoEnvelopeError, assertNotBlocked } from "./envelopeGuard";
import type {
  SfcCalculateRequest, SfcCalculateResult,
  CycleTimeRequest, CycleTimeResult,
  EngagementRequest, EngagementResult,
  DeflectionRequest, DeflectionResult,
  PowerTorqueRequest, PowerTorqueResult,
  SurfaceFinishRequest, SurfaceFinishResult,
  ToolLifeRequest, ToolLifeResult,
} from "../types/sfc";

const SFC_BASE = "/api/v1/sfc";

async function post<TReq, TRes>(
  endpoint: string,
  params: TReq,
  signal?: AbortSignal,
): Promise<TRes> {
  const res = await fetch(`${SFC_BASE}${endpoint}`, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify(params),
    signal,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as
      | { error?: unknown; message?: unknown }
      | null;
    // The backend error envelope is { error: { status, message, code } } (or a
    // bare string). Extract the human message + machine code -- never stringify
    // the object to "[object Object]" (the old `err.error || ...` bug).
    const errObj =
      err && typeof err.error === "object" && err.error !== null
        ? (err.error as { message?: unknown; code?: unknown })
        : null;
    const message =
      (errObj && typeof errObj.message === "string" && errObj.message) ||
      (typeof err?.error === "string" && err.error) ||
      (typeof err?.message === "string" && err.message) ||
      res.statusText ||
      "SFC request failed";
    const code = errObj && typeof errObj.code === "string" ? errObj.code : undefined;
    // Preserve status + code (403 TIER_LIMIT vs ENTITLEMENT_REVOKED) so the page
    // can show the right upgrade / contact-admin prompt, not a raw error.
    throw new ApiError(res.status, message, { code });
  }
  // Silent-zero guard: a 200 OK body is a handled failure when it carries
  // { error } (assertNoEnvelopeError) OR a { blocked: true } gate envelope
  // (assertNotBlocked) -- e.g. the SFC pre-machine-completeness-gate, which
  // returns 200 with no `error` key when machine spindle data is missing. Both
  // are failures that DID NOT produce a calc, so they must throw (surfacing the
  // backend reason) -- never resolve as success (frontend-app/CLAUDE.md s2 + s5).
  const json = await res.json();
  assertNoEnvelopeError<TRes>(json, endpoint);
  return assertNotBlocked<TRes>(json, endpoint);
}

type Wrapped<T> = { result: T; safety?: SfcCalculateResult["safety"]; meta?: Record<string, unknown> };

export const sfcApi = {
  calculate: (params: SfcCalculateRequest, signal?: AbortSignal) =>
    post<SfcCalculateRequest, Wrapped<SfcCalculateResult>>("/calculate", params, signal),

  cycleTime: (params: CycleTimeRequest, signal?: AbortSignal) =>
    post<CycleTimeRequest, Wrapped<CycleTimeResult>>("/cycle-time", params, signal),

  engagement: (params: EngagementRequest, signal?: AbortSignal) =>
    post<EngagementRequest, Wrapped<EngagementResult>>("/engagement", params, signal),

  deflection: (params: DeflectionRequest, signal?: AbortSignal) =>
    post<DeflectionRequest, Wrapped<DeflectionResult>>("/deflection", params, signal),

  powerTorque: (params: PowerTorqueRequest, signal?: AbortSignal) =>
    post<PowerTorqueRequest, Wrapped<PowerTorqueResult>>("/power-torque", params, signal),

  surfaceFinish: (params: SurfaceFinishRequest, signal?: AbortSignal) =>
    post<SurfaceFinishRequest, Wrapped<SurfaceFinishResult>>("/surface-finish", params, signal),

  toolLife: (params: ToolLifeRequest, signal?: AbortSignal) =>
    post<ToolLifeRequest, Wrapped<ToolLifeResult>>("/tool-life", params, signal),
};
