/**
 * ToolSelectionRecommenderEngine — material-aware end-mill recommendation +
 * assembly stiffness check + holder compatibility match.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-07, mill-galaxy). Original
 * was a 16-line U-EFF25 stub. millDispatcher routes 3 actions here
 * (recommend / assemblyCheck / matchHolder). Real implementation surfaces
 * Sandvik Coromant ISO-group recommendations + cantilever stiffness L:D
 * ratio gates + ER/HSK holder compatibility.
 *
 * Physics defers to MillingForceEngine deflection model (canonical
 * src/physics/constants.ts) — NEVER inlined per bravo-soul.
 *
 * @version 2.0.0 — restored from stub
 */
import { millingForceEngine, type ToolGeometry } from "./MillingForceEngine.js";
import type { ISOGroup } from "../physics/constants.js";

// ─── Constants ─────────────────────────────────────────────────────────────
const LD_RATIO_MAX_RIGID = 3;             // L:D ≤ 3 → "rigid" envelope
const LD_RATIO_MAX_STANDARD = 5;          // 3 < L:D ≤ 5 → "standard" (extra care)
const LD_RATIO_MAX_LONGREACH = 8;         // 5 < L:D ≤ 8 → "long-reach" (chatter risk)
const DEFAULT_DEFLECTION_TOLERANCE_MM = 0.05;
const DEFAULT_CUTTING_FORCE_N = 200;       // proxy probe force for assembly check

// Sandvik Coromant ISO-group baseline tool prescriptions.
const ISO_RECOMMENDATIONS: Record<ISOGroup, { substrate: "carbide" | "hss"; coating: string; flutes: number; helix_deg: number }> = {
  P: { substrate: "carbide", coating: "TiAlN",   flutes: 4, helix_deg: 30 },
  M: { substrate: "carbide", coating: "AlTiCrN", flutes: 4, helix_deg: 38 },
  K: { substrate: "carbide", coating: "TiCN",    flutes: 4, helix_deg: 30 },
  N: { substrate: "carbide", coating: "uncoated_polished", flutes: 3, helix_deg: 45 },
  S: { substrate: "carbide", coating: "AlTiN",   flutes: 4, helix_deg: 38 },
  H: { substrate: "carbide", coating: "TiSiN",   flutes: 6, helix_deg: 35 },
};

// Holder taper → max safe RPM + recommended max tool weight.
const HOLDER_LIMITS: Record<string, { maxRpm: number; maxToolWeightKg: number }> = {
  "ER16":  { maxRpm: 18000, maxToolWeightKg: 0.5 },
  "ER25":  { maxRpm: 15000, maxToolWeightKg: 1.2 },
  "ER32":  { maxRpm: 12000, maxToolWeightKg: 2.0 },
  "HSK-A40": { maxRpm: 30000, maxToolWeightKg: 1.5 },
  "HSK-A63": { maxRpm: 20000, maxToolWeightKg: 4.0 },
  "HSK-A100": { maxRpm: 12000, maxToolWeightKg: 10.0 },
};

// ─── Types ─────────────────────────────────────────────────────────────────
export interface RecommendInput {
  iso_group?: ISOGroup;
  material?: string;
  operation?: "rough" | "semi" | "finish";
  diameter_mm: number;
  overhang_mm?: number;
}

export interface RecommendResult {
  iso_group: ISOGroup;
  substrate: "carbide" | "hss";
  coating: string;
  flutes: number;
  helix_deg: number;
  operation: "rough" | "semi" | "finish";
  rationale: string;
}

export interface AssemblyCheckInput {
  tool: ToolGeometry;
  overhang_mm: number;
  cutting_force_n?: number;
  tolerance_mm?: number;
}

export interface AssemblyCheckResult {
  L_over_D: number;
  category: "rigid" | "standard" | "long-reach" | "extreme";
  deflection: ReturnType<typeof millingForceEngine.checkDeflection>;
  pass: boolean;
  warnings: string[];
}

export interface MatchHolderInput {
  tool: ToolGeometry & { weight_kg?: number };
  rpm: number;
  holder?: string;                       // explicit holder query; otherwise candidates filtered
}

export interface HolderMatch {
  holder: string;
  maxRpm: number;
  maxToolWeightKg: number;
  fits: boolean;
  reason?: string;
}

export interface MatchHolderResult {
  candidates: HolderMatch[];
  best: HolderMatch | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function resolveIso(input: { iso_group?: ISOGroup; material?: string }): ISOGroup {
  if (input.iso_group) return input.iso_group;
  if (input.material) {
    const lower = input.material.toLowerCase();
    if (/inconel|titanium|hastelloy|waspaloy/.test(lower)) return "S";
    if (/alum|aluminium| al |al-|copper|brass|bronze/.test(lower)) return "N";
    if (/iron|nodular|cgi/.test(lower)) return "K";
    if (/stainless|304|316|17-4/.test(lower)) return "M";
    if (/hardened|d2|h13/.test(lower)) return "H";
    return "P";
  }
  throw new Error("ToolSelectionRecommenderEngine: iso_group or material required");
}

// ─── Engine ────────────────────────────────────────────────────────────────
export class ToolSelectionRecommenderEngine {
  /** Recommend substrate/coating/flutes/helix from ISO + operation. */
  recommend(input: RecommendInput): RecommendResult {
    if (!Number.isFinite(input?.diameter_mm) || input.diameter_mm <= 0) {
      throw new Error("ToolSelectionRecommenderEngine.recommend: diameter_mm > 0 required");
    }
    const iso = resolveIso(input);
    const op = input.operation ?? "rough";
    const base = ISO_RECOMMENDATIONS[iso];
    // Operation tweak: finish prefers fewer flutes (better chip evacuation) for soft groups;
    // rough prefers more flutes for steel/SS.
    let flutes = base.flutes;
    if (op === "finish" && (iso === "N" || iso === "K")) flutes = Math.max(2, base.flutes - 1);
    if (op === "rough" && (iso === "P" || iso === "M") && input.diameter_mm >= 12) flutes = Math.min(6, base.flutes + 1);
    return {
      iso_group: iso,
      substrate: base.substrate,
      coating: base.coating,
      flutes,
      helix_deg: base.helix_deg,
      operation: op,
      rationale: `ISO ${iso} ${op} on Ø${input.diameter_mm}mm: ${base.substrate} + ${base.coating}, ${flutes}-flute helix ${base.helix_deg}° per Sandvik Coromant baseline`,
    };
  }

  /** Cantilever assembly stiffness check + L:D classification. */
  assemblyCheck(input: AssemblyCheckInput): AssemblyCheckResult {
    if (!input?.tool) throw new Error("ToolSelectionRecommenderEngine.assemblyCheck: tool required");
    if (!Number.isFinite(input.overhang_mm) || input.overhang_mm <= 0) {
      throw new Error("ToolSelectionRecommenderEngine.assemblyCheck: overhang_mm > 0 required");
    }
    const L_over_D = input.overhang_mm / input.tool.diameter_mm;
    let category: AssemblyCheckResult["category"];
    if (L_over_D <= LD_RATIO_MAX_RIGID) category = "rigid";
    else if (L_over_D <= LD_RATIO_MAX_STANDARD) category = "standard";
    else if (L_over_D <= LD_RATIO_MAX_LONGREACH) category = "long-reach";
    else category = "extreme";
    const deflection = millingForceEngine.checkDeflection({
      tool: input.tool,
      overhang_mm: input.overhang_mm,
      cutting_force_n: input.cutting_force_n ?? DEFAULT_CUTTING_FORCE_N,
      tolerance_mm: input.tolerance_mm ?? DEFAULT_DEFLECTION_TOLERANCE_MM,
    });
    const warnings: string[] = [];
    if (category === "long-reach") warnings.push("L:D > 5 — chatter risk; reduce feed by 30-50%");
    if (category === "extreme") warnings.push("L:D > 8 — extreme overhang; consider shrink-fit holder + reduced ap");
    if (!deflection.pass) warnings.push(`deflection ${deflection.deflection_mm.toFixed(4)} mm > tolerance ${deflection.tolerance_mm} mm`);
    return { L_over_D, category, deflection, pass: deflection.pass && category !== "extreme", warnings };
  }

  /** Match tool to compatible holder candidates by RPM + weight. */
  matchHolder(input: MatchHolderInput): MatchHolderResult {
    if (!input?.tool) throw new Error("ToolSelectionRecommenderEngine.matchHolder: tool required");
    if (!Number.isFinite(input.rpm) || input.rpm <= 0) {
      throw new Error("ToolSelectionRecommenderEngine.matchHolder: rpm > 0 required");
    }
    const wt = input.tool.weight_kg ?? 0.3;
    const candidates: HolderMatch[] = [];
    const holderKeys = input.holder ? [input.holder] : Object.keys(HOLDER_LIMITS);
    for (const key of holderKeys) {
      const limits = HOLDER_LIMITS[key];
      if (!limits) {
        candidates.push({ holder: key, maxRpm: 0, maxToolWeightKg: 0, fits: false, reason: "unknown holder" });
        continue;
      }
      const rpmOk = input.rpm <= limits.maxRpm;
      const wtOk = wt <= limits.maxToolWeightKg;
      const fits = rpmOk && wtOk;
      let reason: string | undefined;
      if (!rpmOk) reason = `rpm ${input.rpm} > max ${limits.maxRpm}`;
      else if (!wtOk) reason = `weight ${wt} kg > max ${limits.maxToolWeightKg} kg`;
      candidates.push({ holder: key, maxRpm: limits.maxRpm, maxToolWeightKg: limits.maxToolWeightKg, fits, reason });
    }
    // Best = smallest-capable holder (least overkill).
    const feasible = candidates.filter((c) => c.fits).sort((a, b) => a.maxToolWeightKg - b.maxToolWeightKg);
    return { candidates, best: feasible[0] ?? null };
  }
}

export const toolSelectionRecommenderEngine = new ToolSelectionRecommenderEngine();
