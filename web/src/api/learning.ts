/**
 * Learning API Client — typed functions for all 10 learning endpoints.
 * Mirrors the PPG client pattern but targets /api/v1/learning.
 */
import type {
  AssessRequest,
  AssessResult,
  PlanRequest,
  PlanResult,
  ProgressRequest,
  ProgressResult,
  RecommendRequest,
  RecommendResult,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  TribalSearchRequest,
  TribalSearchResult,
  MaterialSelectRequest,
  MaterialSelectResult,
  ToolSelectRequest,
  ToolSelectResult,
  MachineSelectRequest,
  MachineSelectResult,
  TwinRequest,
  TwinResult,
  LearningApiResponse,
} from "../types/learning";
import { ApiRequestError } from "./client";

const BASE_URL = "/api/v1/learning";
const TIMEOUT_MS = 30_000;

async function learningPost<TReq, TRes>(
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

    const json: LearningApiResponse<TRes> = await res.json();
    if (!json.ok) {
      throw new ApiRequestError(json.error || "Learning request failed", 500);
    }
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

/** Learning API client — all 10 endpoints */
export const learningApi = {
  /** POST /learning/assess — Assess operator skill levels */
  assess: (params: AssessRequest, signal?: AbortSignal) =>
    learningPost<AssessRequest, AssessResult>("/assess", params, signal),

  /** POST /learning/plan — Generate personalized learning plan */
  plan: (params: PlanRequest, signal?: AbortSignal) =>
    learningPost<PlanRequest, PlanResult>("/plan", params, signal),

  /** POST /learning/progress — Track learning progress */
  progress: (params: ProgressRequest, signal?: AbortSignal) =>
    learningPost<ProgressRequest, ProgressResult>("/progress", params, signal),

  /** POST /learning/recommend — Recommend next learning modules */
  recommend: (params: RecommendRequest, signal?: AbortSignal) =>
    learningPost<RecommendRequest, RecommendResult>("/recommend", params, signal),

  /** POST /learning/knowledge/search — Search manufacturing knowledge base */
  knowledgeSearch: (params: KnowledgeSearchRequest, signal?: AbortSignal) =>
    learningPost<KnowledgeSearchRequest, KnowledgeSearchResult>("/knowledge/search", params, signal),

  /** POST /learning/tribal — Search tribal/shop floor knowledge */
  tribalSearch: (params: TribalSearchRequest, signal?: AbortSignal) =>
    learningPost<TribalSearchRequest, TribalSearchResult>("/tribal", params, signal),

  /** POST /learning/select/material — Material selection wizard */
  selectMaterial: (params: MaterialSelectRequest, signal?: AbortSignal) =>
    learningPost<MaterialSelectRequest, MaterialSelectResult>("/select/material", params, signal),

  /** POST /learning/select/tool — Tool selection wizard */
  selectTool: (params: ToolSelectRequest, signal?: AbortSignal) =>
    learningPost<ToolSelectRequest, ToolSelectResult>("/select/tool", params, signal),

  /** POST /learning/select/machine — Machine selection wizard */
  selectMachine: (params: MachineSelectRequest, signal?: AbortSignal) =>
    learningPost<MachineSelectRequest, MachineSelectResult>("/select/machine", params, signal),

  /** POST /learning/twin — Digital twin operations */
  twin: (params: TwinRequest, signal?: AbortSignal) =>
    learningPost<TwinRequest, TwinResult>("/twin", params, signal),
};
