/**
 * CAMAGIMasterOrchestratorEngine — Multi-CAM AGI Router
 * ========================================================
 *
 * The CAM-side counterpart to MillingAGIMasterEngine. Picks the best CAM
 * vendor (Mastercam / hyperMILL / Fusion360 / InventorCAM / SolidCAM) for a
 * given part + material + operation + machine context, and optionally runs
 * comparisons or weighted ensembles across multiple CAM systems.
 *
 * Bidirectional binding with MillingAGIMasterEngine (closes MILL-MASTER-P1-U03):
 *   - Implements CAMAGIBinding.pickVendor(ctx) — so MillingAGIMaster can
 *     delegate vendor choice here.
 *   - Registers itself at construction via bindToMillAGI() (lazy — called by
 *     the dispatcher register function to avoid top-level circular imports).
 *
 * Physics constants: NONE in this engine. Vendor picks are heuristic on
 * capability matches, not physics values. Physics stays in MillingAGIMaster
 * and its sub-orchestrators.
 *
 * @module engines/CAMAGIMasterOrchestratorEngine
 * @milestone MILL-MASTER-P1-U06-CAM-AGI-WIRE
 */

import { log } from "../utils/Logger.js";
import type {
  CAMAGIBinding,
  CamVendorChoiceContext,
  CamVendorChoiceResult,
} from "./MillingAGIMasterEngine.js";

export type CAMVendor =
  | "mastercam"
  | "hypermill"
  | "fusion360"
  | "inventorcam"
  | "solidcam";

interface VendorProfile {
  vendor: CAMVendor;
  strengths: string[];          // capability tags
  complexity_fit: ("simple" | "moderate" | "complex" | "extreme")[];
  machine_classes: ("3-axis" | "4-axis" | "5-axis" | "mill-turn" | "swiss")[];
  material_priority: Partial<Record<"P" | "M" | "K" | "N" | "S" | "H", number>>; // 0..1
  notes: string;
}

const VENDOR_PROFILES: Readonly<Record<CAMVendor, VendorProfile>> = Object.freeze({
  mastercam: {
    vendor: "mastercam",
    strengths: ["broad adoption", "template library", "post processor depth", "mastercam-2024-friendly"],
    complexity_fit: ["simple", "moderate", "complex"],
    machine_classes: ["3-axis", "4-axis", "5-axis", "mill-turn"],
    material_priority: { P: 1.0, M: 0.9, K: 0.85, N: 0.9, S: 0.8, H: 0.8 },
    notes: "Broadest shop adoption + most post processors. Excellent default.",
  },
  hypermill: {
    vendor: "hypermill",
    strengths: ["5-axis depth", "SWARF/flank", "tilted-plane", "AC macro automation", "collision avoidance"],
    complexity_fit: ["complex", "extreme"],
    machine_classes: ["5-axis", "mill-turn"],
    material_priority: { P: 0.95, M: 0.95, K: 0.9, N: 0.85, S: 0.95, H: 0.95 },
    notes: "Deepest 5-axis strategy library + collision. Picks for mill-turn / 5-axis hard materials.",
  },
  fusion360: {
    vendor: "fusion360",
    strengths: ["fast turnaround", "cloud CAD integration", "adaptive clear", "rapid prototyping"],
    complexity_fit: ["simple", "moderate"],
    machine_classes: ["3-axis", "4-axis"],
    material_priority: { P: 0.9, M: 0.8, K: 0.85, N: 0.95, S: 0.7, H: 0.7 },
    notes: "Best for fast iteration on simpler parts. Limited for extreme-complexity / hard materials.",
  },
  inventorcam: {
    vendor: "inventorcam",
    strengths: ["Inventor CAD integration", "iMachining proxy", "feature recognition"],
    complexity_fit: ["simple", "moderate", "complex"],
    machine_classes: ["3-axis", "4-axis", "5-axis"],
    material_priority: { P: 0.9, M: 0.85, K: 0.85, N: 0.85, S: 0.8, H: 0.75 },
    notes: "Natural choice when upstream CAD is Inventor. Feature-driven programming.",
  },
  solidcam: {
    vendor: "solidcam",
    strengths: ["iMachining", "SOLIDWORKS integration", "physics-backed feeds"],
    complexity_fit: ["moderate", "complex"],
    machine_classes: ["3-axis", "4-axis", "5-axis", "mill-turn"],
    material_priority: { P: 0.9, M: 0.9, K: 0.85, N: 0.85, S: 0.85, H: 0.85 },
    notes: "iMachining's adaptive-path physics is its differentiator; strong on hardened steels.",
  },
});

/** Per-vendor score breakdown — kept as the explanation for pickVendor. */
export interface VendorScore {
  vendor: CAMVendor;
  score: number;            // 0..1 composite
  capability_match: number; // 0..1
  complexity_match: number; // 0..1
  machine_match: number;    // 0..1
  material_priority: number; // 0..1
  rationale: string;
}

/** Output of compareSystems — per-vendor side-by-side. */
export interface CompareSystemsResult {
  context_digest: string;
  scored: VendorScore[];
  recommended: CAMVendor;
  runner_up: CAMVendor;
  spread: number; // top_score - 2nd_score — small spread → ensemble makes sense
  ts: string;
}

/** Output of ensemble — weighted combination of top-K vendors. */
export interface EnsembleResult {
  context_digest: string;
  members: Array<{ vendor: CAMVendor; weight: number }>;
  consensus_strengths: string[];
  ensemble_recommendation: string;
  ts: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CAMAGIMasterOrchestratorEngine implements CAMAGIBinding {
  private invocationCount = 0;
  private boundToMillAGI = false;

  /** Tell this engine to register itself as the CAMAGIBinding on MillingAGIMaster.
   *  Called by registerCamDispatcher (or by tests) to close the P1-U03 loop.
   *  Lazy to avoid any top-level circular import issue.
   */
  async bindToMillAGI(): Promise<void> {
    if (this.boundToMillAGI) return;
    const { millingAGIMasterEngine } = await import("./MillingAGIMasterEngine.js");
    millingAGIMasterEngine.bindCAMAGIMaster(this);
    this.boundToMillAGI = true;
    log.info("[CAMAGIMasterOrchestratorEngine] bound to MillingAGIMasterEngine");
  }

  /** Unbind — used by tests. */
  async unbindFromMillAGI(): Promise<void> {
    const { millingAGIMasterEngine } = await import("./MillingAGIMasterEngine.js");
    millingAGIMasterEngine.bindCAMAGIMaster(null);
    this.boundToMillAGI = false;
  }

  isBoundToMillAGI(): boolean {
    return this.boundToMillAGI;
  }

  /** Count how many times any of pickVendor/compareSystems/ensemble ran. */
  getInvocationCount(): number {
    return this.invocationCount;
  }

  /**
   * Implementation of CAMAGIBinding.pickVendor — scores every vendor profile
   * against the context and returns the top result with full rationale.
   */
  pickVendor(ctx: CamVendorChoiceContext): CamVendorChoiceResult {
    this.invocationCount++;
    const scored = this.scoreAllVendors(ctx);
    const top = scored[0]!;
    const fallbacks = scored.slice(1, 3).map((s) => s.vendor);
    return {
      delegated: true,
      vendor: top.vendor,
      confidence: top.score,
      rationale: top.rationale,
      fallbacks,
      source: "CAMAGIMasterOrchestratorEngine",
    };
  }

  /**
   * Compare all vendors side-by-side with score breakdowns.
   * Used when caller wants transparency into the decision rather than just
   * the pick.
   */
  compareSystems(ctx: CamVendorChoiceContext): CompareSystemsResult {
    this.invocationCount++;
    const scored = this.scoreAllVendors(ctx);
    const top = scored[0]!;
    const runnerUp = scored[1]!;
    return {
      context_digest: this.digestContext(ctx),
      scored,
      recommended: top.vendor,
      runner_up: runnerUp.vendor,
      spread: +(top.score - runnerUp.score).toFixed(3),
      ts: new Date().toISOString(),
    };
  }

  /**
   * Ensemble — take the top-K scoring vendors, normalize scores into weights,
   * and return a combined strength set + consensus recommendation string.
   * When spread is small, ensemble outperforms a single pick.
   */
  ensemble(ctx: CamVendorChoiceContext, k: number = 3): EnsembleResult {
    this.invocationCount++;
    const scored = this.scoreAllVendors(ctx).slice(0, Math.max(1, Math.min(k, 5)));
    const sum = scored.reduce((s, v) => s + v.score, 0) || 1;
    const members = scored.map((v) => ({
      vendor: v.vendor,
      weight: +(v.score / sum).toFixed(3),
    }));
    const allStrengths = new Set<string>();
    for (const s of scored) {
      for (const strength of VENDOR_PROFILES[s.vendor].strengths) allStrengths.add(strength);
    }
    const memberList = members.map((m) => `${m.vendor} (w=${m.weight})`).join(", ");
    return {
      context_digest: this.digestContext(ctx),
      members,
      consensus_strengths: Array.from(allStrengths),
      ensemble_recommendation: `Blend: ${memberList}`,
      ts: new Date().toISOString(),
    };
  }

  // ========================================================================
  // INTERNAL
  // ========================================================================

  private scoreAllVendors(ctx: CamVendorChoiceContext): VendorScore[] {
    const all = Object.values(VENDOR_PROFILES) as VendorProfile[];
    const scored = all.map((v) => this.scoreVendor(v, ctx));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  private scoreVendor(profile: VendorProfile, ctx: CamVendorChoiceContext): VendorScore {
    // Capability match — strengths intersected with ctx.part_features
    const featureSet = new Set((ctx.part_features || []).map((f) => f.toLowerCase()));
    let capability_match = 0.7; // baseline
    if (featureSet.size > 0) {
      const hits = profile.strengths.filter((s) =>
        Array.from(featureSet).some((f) => s.toLowerCase().includes(f)),
      ).length;
      capability_match = Math.min(1, 0.5 + hits * 0.2);
    }

    // Complexity match
    const complexity_match = profile.complexity_fit.includes(ctx.complexity ?? "moderate") ? 1 : 0.4;

    // Machine class match
    const machine_match = profile.machine_classes.includes(ctx.machine_class ?? "3-axis") ? 1 : 0.35;

    // Material priority (lookup, default 0.6 when ISO absent)
    const material_priority = ctx.material_iso
      ? (profile.material_priority[ctx.material_iso] ?? 0.6)
      : 0.6;

    // Composite — weighted sum (capability 0.3, complexity 0.25, machine 0.25, material 0.2)
    const score = +(
      capability_match * 0.3 +
      complexity_match * 0.25 +
      machine_match * 0.25 +
      material_priority * 0.2
    ).toFixed(3);

    const rationale =
      `${profile.vendor}: capability=${capability_match.toFixed(2)} ` +
      `complexity=${complexity_match.toFixed(2)} machine=${machine_match.toFixed(2)} ` +
      `material=${material_priority.toFixed(2)} — ${profile.notes}`;

    return {
      vendor: profile.vendor,
      score,
      capability_match: +capability_match.toFixed(3),
      complexity_match,
      machine_match,
      material_priority,
      rationale,
    };
  }

  private digestContext(ctx: CamVendorChoiceContext): string {
    return [
      ctx.material,
      ctx.material_iso ?? "?",
      ctx.operation,
      ctx.machine_class ?? "?",
      ctx.complexity ?? "?",
    ].join("|");
  }

  /** Self-description for introspection. */
  getSelfAwareness(): {
    engine_name: string;
    vendor_count: number;
    vendors: CAMVendor[];
    bound_to_mill_agi: boolean;
    invocation_count: number;
  } {
    return {
      engine_name: "CAMAGIMasterOrchestratorEngine",
      vendor_count: Object.keys(VENDOR_PROFILES).length,
      vendors: Object.keys(VENDOR_PROFILES) as CAMVendor[],
      bound_to_mill_agi: this.boundToMillAGI,
      invocation_count: this.invocationCount,
    };
  }
}

export const camAGIMasterOrchestratorEngine = new CAMAGIMasterOrchestratorEngine();
