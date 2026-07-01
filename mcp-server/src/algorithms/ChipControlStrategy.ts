/**
 * ChipControlStrategy — Lathe #4.5
 * Picks chip-breaking strategy for turning: chip-breaker geometry · feed-modulation
 * · dwell-and-break · interrupted-cut shifts. Long stringy chips on stainless/
 * Inconel wrap around the tool → broken insert. Discrete chips on aluminum
 * jam in coolant returns. This picks the right strategy per material + feed.
 */
export type ChipControlIso = "P" | "M" | "K" | "N" | "S" | "H";
export type ChipControlStrategyKind = "chip_breaker_geometry" | "feed_modulation" | "dwell_and_break" | "interrupted_cut";

export interface ChipControlInput {
  iso_group: ChipControlIso;
  feed_mm_per_rev: number;
  depth_of_cut_mm: number;
  /** Spindle RPM for dwell-time computation. */
  rpm: number;
}

export interface ChipControlResult {
  strategy: ChipControlStrategyKind;
  feed_modulation_amplitude_pct: number;
  dwell_period_sec: number;
  recommended_breaker_code: string;
  notes: string[];
  source: string;
}

// Chip-breaker codes follow ISO 4288 / Sandvik naming:
//   PR = roughing (high feed)
//   MR = medium roughing
//   PF = finishing
//   MM = medium machining (general)
const BREAKER_BY_ISO: Record<ChipControlIso, { rough: string; finish: string }> = {
  P: { rough: "PR", finish: "PF" },
  M: { rough: "MR", finish: "MF" },
  K: { rough: "KR", finish: "KF" },
  N: { rough: "AL", finish: "AL" },           // aluminum geometry (sharp + polished)
  S: { rough: "SM", finish: "SF" },
  H: { rough: "HR", finish: "HF" },
};

const FEED_FINISH_THRESHOLD_MM = 0.10;
const FEED_MAX_MM = 2.0;
const DOC_MAX_MM = 50;
const RPM_MIN = 1;
const RPM_MAX = 100_000;
const FEED_MOD_PCT_M = 15;
const FEED_MOD_PCT_S = 25;
const ISO_VALID = new Set(["P","M","K","N","S","H"]);

function emit(reason: string): ChipControlResult {
  return { strategy: "chip_breaker_geometry", feed_modulation_amplitude_pct: 0, dwell_period_sec: 0, recommended_breaker_code: "", notes: [reason], source: "ChipControlStrategy v1.0.0" };
}

export function pickStrategy(input: ChipControlInput): ChipControlResult {
  if (!input) return emit("missing input");
  if (!ISO_VALID.has(input.iso_group)) return emit(`unknown iso_group: ${input.iso_group}`);
  if (!Number.isFinite(input.feed_mm_per_rev) || input.feed_mm_per_rev <= 0 || input.feed_mm_per_rev > FEED_MAX_MM) return emit(`feed_mm_per_rev outside (0, ${FEED_MAX_MM}]`);
  if (!Number.isFinite(input.depth_of_cut_mm) || input.depth_of_cut_mm <= 0 || input.depth_of_cut_mm > DOC_MAX_MM) return emit(`depth_of_cut_mm outside (0, ${DOC_MAX_MM}]`);
  if (!Number.isFinite(input.rpm) || input.rpm < RPM_MIN || input.rpm > RPM_MAX) return emit(`rpm outside [${RPM_MIN}, ${RPM_MAX}]`);

  const isFinish = input.feed_mm_per_rev < FEED_FINISH_THRESHOLD_MM;
  const breaker = isFinish ? BREAKER_BY_ISO[input.iso_group].finish : BREAKER_BY_ISO[input.iso_group].rough;
  const notes: string[] = [];

  // M-stainless and S-superalloy: feed-modulation is the canonical strategy
  if (input.iso_group === "M") {
    notes.push("M-stainless: long stringy chips wrap around tool — apply ±15% feed-modulation");
    return { strategy: "feed_modulation", feed_modulation_amplitude_pct: FEED_MOD_PCT_M, dwell_period_sec: 0, recommended_breaker_code: breaker, notes, source: "ChipControlStrategy v1.0.0" };
  }
  if (input.iso_group === "S") {
    notes.push("S-superalloy: built-up edge + stringy chips — apply ±25% feed-modulation + matching breaker");
    return { strategy: "feed_modulation", feed_modulation_amplitude_pct: FEED_MOD_PCT_S, dwell_period_sec: 0, recommended_breaker_code: breaker, notes, source: "ChipControlStrategy v1.0.0" };
  }
  // H-hardened steel: dwell-and-break for chip control on rigid setups
  if (input.iso_group === "H" && !isFinish) {
    const dwell = 60 / input.rpm * 2;   // 2 revolutions
    notes.push(`H-hardened roughing: dwell-and-break every 2 rev (${dwell.toFixed(3)}s pause to fracture chip)`);
    return { strategy: "dwell_and_break", feed_modulation_amplitude_pct: 0, dwell_period_sec: dwell, recommended_breaker_code: breaker, notes, source: "ChipControlStrategy v1.0.0" };
  }
  // K-cast iron: interrupted cut (chips are powder, want to AVOID re-cutting)
  if (input.iso_group === "K") {
    notes.push("K-cast iron: brittle chip → interrupted-cut clearance pattern minimizes recutting + dust");
    return { strategy: "interrupted_cut", feed_modulation_amplitude_pct: 0, dwell_period_sec: 0, recommended_breaker_code: breaker, notes, source: "ChipControlStrategy v1.0.0" };
  }
  // P-steel, N-aluminum: chip-breaker geometry handles it (no special motion)
  notes.push(`${input.iso_group}-group ${isFinish ? "finish" : "rough"}: chip-breaker insert geometry sufficient`);
  return { strategy: "chip_breaker_geometry", feed_modulation_amplitude_pct: 0, dwell_period_sec: 0, recommended_breaker_code: breaker, notes, source: "ChipControlStrategy v1.0.0" };
}

export const ChipControlStrategy = { version: "1.0.0" as const, pickStrategy };
