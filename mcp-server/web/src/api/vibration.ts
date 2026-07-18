import type { VibrationInput, StabilityLobeResult, ModalAnalysisResult, ChatterDetectionResult, ProcessDampingResult } from "../types/vibration";
import { getAuthHeaders } from './authToken';

const BASE_URL = "/api/v1/vibration";
const TIMEOUT_MS = 15_000;

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

export const vibrationApi = {
  stabilityLobes: (input: VibrationInput) => post<StabilityLobeResult>("/stability-lobes", input),
  modal: (input: VibrationInput) => post<ModalAnalysisResult>("/modal", input),
  chatter: (input: VibrationInput) => post<ChatterDetectionResult>("/chatter", input),
  damping: (input: VibrationInput) => post<ProcessDampingResult>("/damping", input),
};
