/**
 * ThreadMethodSelectorEngine — PCCA-MS4 U02
 *
 * Selects the optimal threading method based on thread form, material,
 * hole size, and production volume. Covers:
 *   - Single-point turning (G76/G92)
 *   - Thread milling (helical interpolation)
 *   - Tapping (rigid, tension-compression, form)
 *   - Thread rolling / forming
 *   - Thread grinding
 *
 * References:
 *   - Sandvik Coromant Threading Guide (2023)
 *   - ISO 261 (metric thread profiles)
 *   - ASME B1.1 (unified thread series)
 *
 * @module engines/ThreadMethodSelectorEngine
 */

import { CANONICAL_KIENZLE } from "../physics/constants.js";
import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type ThreadForm = "metric" | "unified" | "bsp" | "npt" | "acme" | "buttress" | "trapezoidal";
export type ThreadMethod = "single_point" | "thread_mill" | "rigid_tap" | "form_tap" | "thread_roll" | "thread_grind";

export interface ThreadMethodInput {
  thread_form: ThreadForm;
  pitch_mm: number;
  major_diameter_mm: number;
  hole_depth_mm?: number;       // for internal threads
  blind_hole?: boolean;
  material_iso_group?: ISOGroup;
  material_hardness_hrc?: number;
  production_qty?: number;
  machine_has_rigid_tap?: boolean;
  machine_has_live_tooling?: boolean;
  tolerance_class?: string;     // 6g, 6H, 4h, etc.
  surface_finish_um?: number;   // required Ra
  internal?: boolean;           // true = nut side, false = bolt side
}

export interface ThreadMethodResult {
  recommended: ThreadMethod;
  alternatives: { method: ThreadMethod; score: number; rationale: string }[];
  parameters: {
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    number_of_passes: number;
    infeed_strategy: "radial" | "modified_flank" | "alternating_flank";
    estimated_cycle_time_sec: number;
  };
  warnings: string[];
}

// ============================================================================
// METHOD SCORING
// ============================================================================

/** Cutting speed ranges by ISO group for single-point threading (m/min). Source: Sandvik */
const THREADING_SPEED: Record<string, { min: number; max: number }> = {
  P: { min: 100, max: 200 },
  M: { min: 50, max: 120 },
  K: { min: 80, max: 160 },
  N: { min: 150, max: 400 },
  S: { min: 20, max: 60 },
  H: { min: 15, max: 50 },
};

function scoreMethod(method: ThreadMethod, input: ThreadMethodInput): { score: number; rationale: string } {
  let score = 50;
  const reasons: string[] = [];
  const pitch = input.pitch_mm;
  const diameter = input.major_diameter_mm;
  const isInternal = input.internal ?? true;
  const hardness = input.material_hardness_hrc ?? 30;
  const qty = input.production_qty ?? 1;
  const blind = input.blind_hole ?? false;

  switch (method) {
    case "single_point":
      if (!isInternal || diameter > 20) { score += 15; reasons.push("good for external or large internal"); }
      if (pitch > 2.0) { score += 20; reasons.push("preferred for coarse pitch >2mm"); }
      if (hardness > 45) { score += 10; reasons.push("works on hardened materials with CBN"); }
      if (qty > 500) { score -= 15; reasons.push("slow for high volume"); }
      if (isInternal && diameter < 10) { score -= 20; reasons.push("difficult for small bores"); }
      break;

    case "thread_mill":
      if (isInternal && diameter > 6) { score += 15; reasons.push("flexible for internal >6mm"); }
      if (blind) { score += 10; reasons.push("excellent for blind holes — no chip evac issue"); }
      if (pitch < 1.5 && diameter < 50) { score += 10; reasons.push("precise for fine pitch"); }
      if (!input.machine_has_live_tooling && isInternal) { score -= 30; reasons.push("requires milling capability"); }
      if (hardness > 50) { score += 15; reasons.push("works on hardened materials"); }
      break;

    case "rigid_tap":
      if (isInternal && diameter >= 3 && diameter <= 30) { score += 25; reasons.push("fastest for standard internal threads"); }
      if (qty > 100) { score += 20; reasons.push("highest productivity for volume"); }
      if (!input.machine_has_rigid_tap) { score -= 40; reasons.push("machine lacks rigid tapping"); }
      if (hardness > 40) { score -= 20; reasons.push("tap life drops on hard materials"); }
      if (blind && pitch > 2) { score -= 10; reasons.push("chip evacuation risk in blind coarse threads"); }
      break;

    case "form_tap":
      if (isInternal && diameter >= 2 && diameter <= 16) { score += 20; reasons.push("chipless — ideal for blind holes"); }
      if (blind) { score += 15; reasons.push("no chip evacuation needed"); }
      if (hardness > 35) { score -= 25; reasons.push("requires ductile material"); }
      if (input.material_iso_group === "N") { score += 15; reasons.push("excellent in aluminum"); }
      if (input.material_iso_group === "S" || input.material_iso_group === "H") { score -= 30; reasons.push("not suitable for superalloys/hardened steel"); }
      break;

    case "thread_roll":
      if (!isInternal && qty > 1000) { score += 25; reasons.push("fastest for high-volume external threads"); }
      if (isInternal) { score -= 30; reasons.push("external threads only"); }
      if (hardness > 40) { score -= 20; reasons.push("material too hard for rolling"); }
      break;

    case "thread_grind":
      if (input.surface_finish_um != null && input.surface_finish_um < 0.8) { score += 25; reasons.push("best surface finish"); }
      if (hardness > 55) { score += 20; reasons.push("handles hardened materials well"); }
      if (qty < 50) { score += 5; reasons.push("precision low-volume"); }
      if (qty > 500) { score -= 15; reasons.push("slow for high volume"); }
      break;
  }

  return { score: Math.max(0, Math.min(100, score)), rationale: reasons.join("; ") || "baseline score" };
}

// ============================================================================
// ENGINE
// ============================================================================

export class ThreadMethodSelectorEngine {
  static select(input: ThreadMethodInput): ThreadMethodResult {
    const methods: ThreadMethod[] = ["single_point", "thread_mill", "rigid_tap", "form_tap", "thread_roll", "thread_grind"];
    const scored = methods.map(m => ({ method: m, ...scoreMethod(m, input) }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const iso = (input.material_iso_group ?? "P") as keyof typeof THREADING_SPEED;
    const speedRange = THREADING_SPEED[iso] ?? THREADING_SPEED.P;

    // Calculate pass count using constant chip area method
    const depth = input.pitch_mm * 0.6134; // 60° thread depth factor
    const firstCut = 0.15; // mm
    const nPasses = Math.max(3, Math.ceil(depth / firstCut));

    // Infeed strategy by material
    const infeed: ThreadMethodResult["parameters"]["infeed_strategy"] =
      iso === "M" || iso === "S" ? "alternating_flank" :
      iso === "H" ? "radial" : "modified_flank";

    const cuttingSpeed = (speedRange.min + speedRange.max) / 2;
    const rpm = (cuttingSpeed * 1000) / (Math.PI * input.major_diameter_mm);
    const cyclePerPass = (input.hole_depth_mm ?? input.major_diameter_mm * 2) / (input.pitch_mm * rpm / 60);
    const cycleSec = cyclePerPass * nPasses * 1.3; // 1.3x for approach/retract

    const warnings: string[] = [];
    if (best.score < 40) warnings.push("No method scored above 40 — review thread requirements");
    if (input.material_hardness_hrc && input.material_hardness_hrc > 55 && best.method === "rigid_tap") {
      warnings.push("Rigid tapping on >55 HRC — consider thread milling or grinding instead");
    }

    return {
      recommended: best.method,
      alternatives: scored.map(s => ({ method: s.method, score: s.score, rationale: s.rationale })),
      parameters: {
        cutting_speed_m_min: Math.round(cuttingSpeed),
        feed_mm_rev: input.pitch_mm,
        number_of_passes: nPasses,
        infeed_strategy: infeed,
        estimated_cycle_time_sec: Math.round(cycleSec * 10) / 10,
      },
      warnings,
    };
  }
}

export const threadMethodSelectorEngine = new ThreadMethodSelectorEngine();
