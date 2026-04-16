import type { SfcCalculateResult } from "../../types/sfc";
import type { SfcParams } from "./ParameterPanel";

/** A snapshot of a complete SFC calculation for comparison/history */
export interface CalcSnapshot {
  id: string;
  materialName: string;
  materialId: string;
  materialGroup: string;
  operationLabel: string;
  operationId: string;
  toolName?: string;
  params: SfcParams;
  result: SfcCalculateResult;
  ts: number;
}

/** Saved user preset */
export interface SfcPreset {
  id: string;
  name: string;
  materialId: string;
  operationId: string;
  params: SfcParams;
  createdAt: number;
}

const COMPARISON_KEY = "prism-sfc-comparison";
const FULL_HISTORY_KEY = "prism-sfc-full-history";
const PRESETS_KEY = "prism-sfc-presets";

function loadJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function saveJson(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* storage full or unavailable */ }
}

export function loadComparison(): CalcSnapshot[] { return loadJson(COMPARISON_KEY, []); }
export function saveComparison(entries: CalcSnapshot[]) { saveJson(COMPARISON_KEY, entries.slice(0, 4)); }

export function loadFullHistory(): CalcSnapshot[] { return loadJson(FULL_HISTORY_KEY, []); }
export function saveFullHistory(entries: CalcSnapshot[]) { saveJson(FULL_HISTORY_KEY, entries.slice(0, 100)); }

export function loadPresets(): SfcPreset[] { return loadJson(PRESETS_KEY, []); }
export function savePresets(presets: SfcPreset[]) { saveJson(PRESETS_KEY, presets); }
