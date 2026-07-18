import { getAuthHeaders } from './authToken';
const BASE_URL = "/api/v1/orchestration";
const TIMEOUT_MS = 30_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export type ReasoningMode =
  | "chain_of_thought"
  | "tree_of_thought"
  | "counterfactual"
  | "hypothesis_ranking"
  | "analogical"
  | "causal"
  | "abductive"
  | "deductive"
  | "inductive"
  | "creative"
  | "cross_domain";

export interface IntelligenceRequest {
  task: string;
  mode?: ReasoningMode;
  context?: Record<string, unknown>;
  max_branches?: number;
}

export interface IntelligenceResult {
  best_answer: string;
  confidence: number;
  evidence: Array<{ source: string; weight: number }>;
  alternatives: Array<{ answer: string; confidence: number }>;
  reasoning_trace?: string[];
}

export const intelligenceApi = {
  reason: (req: IntelligenceRequest) => post<IntelligenceResult>("/intelligence/reason", req),
  jobPlan: (req: { intent: string; part_context?: Record<string, unknown> }) => post("/intelligence/job-plan", req),
  decide: (req: { options: string[]; context: Record<string, unknown> }) => post<IntelligenceResult>("/intelligence/decide", req),
};
