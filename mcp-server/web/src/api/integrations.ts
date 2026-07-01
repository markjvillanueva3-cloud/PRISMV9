import type { IntegrationInput, CamIntegration, DncTransfer, ErpSync, MobileInterface, MeasurementResult } from "../types/integrations";
import { getRequestHeaders } from "./client";

const BASE_URL = "/api/v1/integrations";
const TIMEOUT_MS = 15_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      // getRequestHeaders() already sets Content-Type + attaches the Bearer once setApiKey ran at login,
      // so the gated /erp + /measurement routes (and the verifyToken-gated cam/dnc/mobile) authenticate.
      headers: getRequestHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const integrationsApi = {
  cam: (input: IntegrationInput) => post<CamIntegration>("/cam", input),
  dnc: (input: IntegrationInput) => post<DncTransfer>("/dnc", input),
  erp: (input: IntegrationInput) => post<ErpSync>("/erp", input),
  mobile: (input: IntegrationInput) => post<MobileInterface>("/mobile", input),
  measurement: (input: IntegrationInput) => post<MeasurementResult>("/measurement", input),
};
