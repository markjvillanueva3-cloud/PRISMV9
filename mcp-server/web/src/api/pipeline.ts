import type { PipelineInput, PipelineResult } from "../types/pipeline";
import { getAuthHeaders } from './authToken';

const BASE_URL = "/api/v1/pipeline";
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

export const pipelineApi = {
  analyze: (input: PipelineInput) => post<PipelineResult>("/analyze", input),
  selectTools: (input: PipelineInput) => post<PipelineResult>("/tools", input),
  sequence: (input: PipelineInput) => post<PipelineResult>("/sequence", input),
  speedFeed: (input: PipelineInput) => post<PipelineResult>("/speed-feed", input),
  program: (input: PipelineInput) => post<PipelineResult>("/program", input),
  quote: (input: PipelineInput) => post<PipelineResult>("/quote", input),
  roi: (input: PipelineInput) => post<PipelineResult>("/roi", input),
  fullPipeline: (input: PipelineInput) => post<PipelineResult>("/full", input),
  fusion360: (input: PipelineInput) => post<PipelineResult>("/fusion360", input),
};
