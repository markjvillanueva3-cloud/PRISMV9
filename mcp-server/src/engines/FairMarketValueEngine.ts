/**
 * FairMarketValueEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP03
 *
 * Computes a fair-market-value estimate for a CNC job given:
 *   - time_in_cut_s + setup_time_s
 *   - machine_rate_usd_per_hr
 *   - material_spend_usd
 *   - overhead_pct (default 0.15)
 *   - target_margin_pct (default 0.20)
 *
 *   fmv_usd = ((cycle_h + setup_h) × machine_rate + material × material_markup)
 *             × (1 + overhead_pct) × (1 + target_margin_pct)
 *
 * Then compares against `charged_usd`:
 *   gap_pct = (charged - fmv) / fmv
 *   verdict: under-charged (<-10%), at-market (-10..+10%), over-charged (>+10%)
 *
 * Per R12 fail-loud: missing required inputs → explicit reason, no fabricated FMV.
 *
 * @milestone JM-DIE-PROGRAM-ANALYSIS-MS0/U-JP03-FMV
 * @author slot:charlie /goal-15 iter1, 2026-05-24
 */

export interface FmvInputs {
  time_in_cut_s: number;
  setup_time_s?: number;
  machine_rate_usd_per_hr: number;
  material_spend_usd: number;
  material_markup?: number;     // default 1.30 (30% markup on material pass-through)
  overhead_pct?: number;        // default 0.15
  target_margin_pct?: number;   // default 0.20
  charged_usd?: number;         // optional — when provided, compute verdict
}

export type FmvVerdict = "under-charged" | "at-market" | "over-charged";

export interface FmvResult {
  ok: boolean;
  reason?: string;
  fmv_usd: number;
  components: {
    machine_time_usd: number;
    material_passthrough_usd: number;
    overhead_usd: number;
    margin_usd: number;
  };
  charged_usd: number | null;
  gap_pct: number | null;
  verdict: FmvVerdict | null;
}

const DEFAULT_SETUP_S = 1800; // 30 min
const DEFAULT_MATERIAL_MARKUP = 1.30;
const DEFAULT_OVERHEAD_PCT = 0.15;
const DEFAULT_TARGET_MARGIN_PCT = 0.20;
const UNDER_THRESHOLD = -0.10;
const OVER_THRESHOLD = 0.10;

export class FairMarketValueEngine {
  estimate(inputs: FmvInputs): FmvResult {
    const empty: FmvResult = {
      ok: false, fmv_usd: 0,
      components: { machine_time_usd: 0, material_passthrough_usd: 0, overhead_usd: 0, margin_usd: 0 },
      charged_usd: null, gap_pct: null, verdict: null,
    };
    if (!inputs || typeof inputs.time_in_cut_s !== "number" || typeof inputs.machine_rate_usd_per_hr !== "number" || typeof inputs.material_spend_usd !== "number") {
      return { ...empty, reason: "missing-required:time_in_cut_s+machine_rate+material_spend" };
    }
    if (!Number.isFinite(inputs.time_in_cut_s) || inputs.time_in_cut_s < 0) {
      return { ...empty, reason: "invalid-time_in_cut_s" };
    }
    if (!Number.isFinite(inputs.machine_rate_usd_per_hr) || inputs.machine_rate_usd_per_hr <= 0) {
      return { ...empty, reason: "invalid-machine_rate" };
    }
    if (!Number.isFinite(inputs.material_spend_usd) || inputs.material_spend_usd < 0) {
      return { ...empty, reason: "invalid-material_spend" };
    }

    const setupS = inputs.setup_time_s ?? DEFAULT_SETUP_S;
    const markup = inputs.material_markup ?? DEFAULT_MATERIAL_MARKUP;
    const overheadPct = inputs.overhead_pct ?? DEFAULT_OVERHEAD_PCT;
    const marginPct = inputs.target_margin_pct ?? DEFAULT_TARGET_MARGIN_PCT;

    const cycleHr = (inputs.time_in_cut_s + setupS) / 3600;
    const machineTime = cycleHr * inputs.machine_rate_usd_per_hr;
    const materialPass = inputs.material_spend_usd * markup;
    const subtotal = machineTime + materialPass;
    const overhead = subtotal * overheadPct;
    const withOverhead = subtotal + overhead;
    const margin = withOverhead * marginPct;
    const fmv = withOverhead + margin;

    const result: FmvResult = {
      ok: true,
      fmv_usd: Math.round(fmv * 100) / 100,
      components: {
        machine_time_usd: Math.round(machineTime * 100) / 100,
        material_passthrough_usd: Math.round(materialPass * 100) / 100,
        overhead_usd: Math.round(overhead * 100) / 100,
        margin_usd: Math.round(margin * 100) / 100,
      },
      charged_usd: null, gap_pct: null, verdict: null,
    };

    if (typeof inputs.charged_usd === "number" && Number.isFinite(inputs.charged_usd) && fmv > 0) {
      result.charged_usd = Math.round(inputs.charged_usd * 100) / 100;
      const gap = (inputs.charged_usd - fmv) / fmv;
      result.gap_pct = Math.round(gap * 10000) / 10000;
      result.verdict = gap < UNDER_THRESHOLD ? "under-charged"
                    : gap > OVER_THRESHOLD ? "over-charged"
                    : "at-market";
    }
    return result;
  }
}

export const fairMarketValueEngine = new FairMarketValueEngine();
