import type { OrchestratorInput } from "../types/speedfeed";

const BASE_URL = "/api/v1/speed-feed";
const TIMEOUT_MS = 30_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const speedFeedApi = {
  orchestrate: (req: OrchestratorInput) => post("/orchestrate", req),
  quick: (req: OrchestratorInput) => post("/quick", req),
  stochastic: (req: OrchestratorInput) => post("/stochastic", req),
  resolveMachine: (req: OrchestratorInput) => post("/resolve/machine", req),
  resolveTool: (req: OrchestratorInput) => post("/resolve/tool", req),
  resolveMaterial: (req: OrchestratorInput) => post("/resolve/material", req),
  compare: (req: { scenarios: Array<{ label: string; input: OrchestratorInput }> }) => post("/compare", req),
  optimize: (req: OrchestratorInput & { objectives?: string[] }) => post("/optimize", req),
};
