import type { ThermalInput, HeatExchangerResult, PumpResult, PipeResult, HydraulicResult, CompressorResult, CoolingResult } from "../types/thermal";

const BASE_URL = "/api/v1/thermal";
const TIMEOUT_MS = 15_000;

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

export const thermalApi = {
  heatExchanger: (input: ThermalInput) => post<HeatExchangerResult>("/heat-exchanger", input),
  pump: (input: ThermalInput) => post<PumpResult>("/pump", input),
  pipe: (input: ThermalInput) => post<PipeResult>("/pipe", input),
  hydraulic: (input: ThermalInput) => post<HydraulicResult>("/hydraulic", input),
  compressor: (input: ThermalInput) => post<CompressorResult>("/compressor", input),
  cooling: (input: ThermalInput) => post<CoolingResult>("/cooling", input),
};
