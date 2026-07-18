/**
 * CadCamHandoffEngine — autonomous CAD-AI → CAM-AI handoff bridge
 * =============================================================================
 *
 * Deep-integration bridge (U-BRIDGE-CAD-CAM-HANDOFF, FEATURE-GAP-AUDIT-MS0 /
 * ROADMAP-CONSOLIDATED DEEP_INTEGRATION_BRIDGES). Autonomously-generated CAD
 * geometry (NeuralCADGenerationEngine / TextToCADGenerationEngine /
 * BlueprintToCADGenerationEngine / CADKernelEngine all emit `FeatureSpec[]`)
 * flows into CAM strategy programming WITHOUT a manual transcription step.
 *
 * This engine owns the *contract*, not the algorithms — the canonical bridge
 * pattern (cf. RGS-TOOL-AUTOINVOKE rule-table). It:
 *   1. Normalizes a CAD-gen result into a per-feature handoff DTO.
 *   2. Synthesizes a CAM `part_hint` per feature from feature.type + params.
 *   3. Delegates strategy ranking to `camStrategyRecommenderEngine` (existing,
 *      production, CAM-EXHAUST-MS0 corpus).
 *   4. Sequences operations rough→finish→drill and assembles one plan.
 *   5. Wraps the plan in an UNCONDITIONAL operator gate — per the PRISM
 *      "operator-in-the-loop is unconditional" invariant, the bridge NEVER
 *      auto-executes CAM; it emits an approval-required plan.
 *
 * Pure / deterministic / never throws on a well-typed input (Zod-validated at
 * the dispatcher boundary). No physics constants — this is orchestration only;
 * cutting parameters are owned downstream by prism_calc / the CAM bridges.
 *
 * Authored 2026-05-18 — FEATURE-GAP-AUDIT-MS0 slot delta (claude-3ddf0577).
 */

import { z } from "zod";
import {
  camStrategyRecommenderEngine,
  type StrategyCandidate,
} from "./CAMStrategyRecommenderEngine.js";

/** Canonical CAD-gen feature (matches NeuralCADGenerationEngine.FeatureSpec). */
export interface HandoffFeature {
  type: string;
  params?: Record<string, number | string>;
}

export interface CadCamHandoffInput {
  /** Structured features from a CAD-gen result (FeatureSpec[]). */
  features: HandoffFeature[];
  /** Target CAM slug, e.g. "fusion360", "hypermill", "mastercam". */
  target_cam: string;
  /** Stock / part material, e.g. "ti-6al-4v", "aluminum 6061". */
  material?: string;
  /** CAD-gen confidence [0,1] (GenerationResult.confidence). */
  cad_confidence?: number;
  /** Part name for provenance / traveler. */
  part_name?: string;
  /** Alternatives surfaced per feature. Defaults to 3. */
  max_alternatives_per_feature?: number;
  /**
   * Minimum CAD confidence to permit an autonomous handoff. Below this the
   * plan is BLOCKED (geometry too uncertain to program unsupervised).
   * Default 0.5.
   */
  min_cad_confidence?: number;
}

export interface HandoffOperation {
  feature_type: string;
  /** Synthesized CAM part_hint fed to the recommender. */
  part_hint: string;
  recommended_strategy: string | null;
  recommended_score: number;
  phase: "roughing" | "finishing" | "drilling" | "other";
  rationale: string;
  alternatives: StrategyCandidate[];
}

export interface CadCamHandoffResult {
  part_name: string;
  target_cam: string;
  material: string;
  /** Operations in machining order (rough → finish → drill → other). */
  operations: HandoffOperation[];
  /** clamp( cad_confidence * mean(featureScores) ) — overall handoff trust. */
  handoff_confidence: number;
  /** ALWAYS true — operator-in-the-loop is unconditional. */
  requires_operator_approval: true;
  /** ALWAYS false — this bridge never auto-runs CAM. */
  auto_executed: false;
  /** True when the handoff is refused (low CAD confidence / no features). */
  blocked: boolean;
  block_reason: string | null;
  gate_reason: string;
  /** Features dropped past MAX_FEATURES (DoS guard). 0 when none. */
  truncated_features: number;
  advisories: string[];
}

/** Hard cap on features processed in one handoff (DoS / runaway-gen guard). */
export const MAX_HANDOFF_FEATURES = 500;
const DEFAULT_MIN_CAD_CONFIDENCE = 0.5;

export const CadCamHandoffInputSchema = z.object({
  features: z
    .array(
      z.object({
        type: z.string(),
        params: z
          .record(z.string(), z.union([z.number(), z.string()]))
          .optional(),
      }),
    )
    .default([]),
  target_cam: z.string().min(1),
  material: z.string().optional(),
  // bounded for loud rejection at the dispatcher boundary; the engine ALSO
  // clamp01s at runtime (defense-in-depth) so direct callers can't poison it.
  cad_confidence: z.number().min(0).max(1).optional(),
  part_name: z.string().optional(),
  max_alternatives_per_feature: z.number().int().min(1).max(20).optional(),
  min_cad_confidence: z.number().min(0).max(1).optional(),
});

/**
 * Feature-type → (phase, hint tokens) mapping. Tokens are appended to the
 * synthesized part_hint so the recommender's tag-overlap scoring fires. Keyed
 * on substrings so generator-specific names ("rect_pocket", "thru_hole",
 * "edge_fillet") all resolve. Order matters — first hit wins.
 */
const FEATURE_PHASE_MAP: ReadonlyArray<{
  match: RegExp;
  phase: HandoffOperation["phase"];
  hint: string;
}> = [
  { match: /pocket|cavity|cutout/i, phase: "roughing", hint: "rough pocket 2d clearing" },
  { match: /slot|groove|channel/i, phase: "roughing", hint: "slot trochoidal narrow" },
  { match: /hole|drill|bore|c.?bore|c.?sink|tap|thread/i, phase: "drilling", hint: "drill drilling hole peck" },
  { match: /fillet|round|blend/i, phase: "finishing", hint: "finish 3d surface scallop pencil corner" },
  { match: /chamfer|bevel|edge/i, phase: "finishing", hint: "finish chamfer edge profile" },
  { match: /boss|pad|island|rib|wall/i, phase: "roughing", hint: "rough wall profile contour" },
  // NOTE: the surface/freeform entry MUST precede the face entry — "face" is a
  // substring of "sur*face*", so a bare /face/ test would steal every
  // surface_finish feature and mis-route it to the flat-face hint (P1 fix,
  // scrutiny arm B). First-hit-wins ordering makes this load-bearing.
  { match: /surface|freeform|sculpt|loft|sweep|spline|nurbs/i, phase: "finishing", hint: "finish 3d surface scallop steep shallow" },
  { match: /face|plane|floor|top/i, phase: "finishing", hint: "finish parallel flat bottom shallow" },
  { match: /contour|profile|perimeter|outline/i, phase: "other", hint: "2d contour profile outline external" },
];

const PHASE_ORDER: Record<HandoffOperation["phase"], number> = {
  roughing: 0,
  finishing: 1,
  drilling: 2,
  other: 3,
};

const clamp01 = (n: number): number =>
  !Number.isFinite(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n;

/** Sanitize a free-form param value into hint-safe tokens (drop NaN/Inf/control). */
function paramTokens(params?: Record<string, number | string>): string {
  if (!params) return "";
  const out: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "number") {
      if (!Number.isFinite(v)) continue;
    } else if (typeof v === "string") {
      const cleaned = v.replace(/[^\w\s-]+/g, " ").trim();
      if (cleaned) out.push(cleaned.slice(0, 32));
    }
    // numeric magnitudes carry no strategy signal — only string params help
    void k;
  }
  return out.join(" ").slice(0, 120);
}

export class CadCamHandoffEngine {
  /**
   * Bridge a CAD-gen feature list into a sequenced, operator-gated CAM plan.
   *
   * @param input CAD-gen handoff DTO (features + target_cam + material + confidence).
   * @returns Operator-gated, phase-ordered CAM plan. Never auto-executes.
   */
  static handoff(input: CadCamHandoffInput): CadCamHandoffResult {
    const partName = input.part_name?.trim() || "unnamed-part";
    const targetCam = input.target_cam ?? "";
    const material = input.material?.trim() ?? "";
    const cadConf = clamp01(
      input.cad_confidence === undefined ? 1 : input.cad_confidence,
    );
    // A direct caller (tests / non-dispatcher ingress that bypasses the Zod
    // bound) must NOT be able to disable the low-confidence refusal by
    // passing a hostile threshold (scrutiny arm A, safety gap). clamp-to-0
    // would still defeat it (cadConf < 0 is always false). The only safe
    // semantic: an out-of-range / non-finite threshold falls back to the
    // DEFAULT floor — an invalid value can never LOWER the safety bar.
    const rawMin = input.min_cad_confidence;
    const minConf =
      typeof rawMin === "number" &&
      Number.isFinite(rawMin) &&
      rawMin >= 0 &&
      rawMin <= 1
        ? rawMin
        : DEFAULT_MIN_CAD_CONFIDENCE;
    const maxAlt = input.max_alternatives_per_feature ?? 3;
    const advisories: string[] = [];

    const rawFeatures = Array.isArray(input.features) ? input.features : [];
    let features = rawFeatures;
    let truncated = 0;
    if (rawFeatures.length > MAX_HANDOFF_FEATURES) {
      truncated = rawFeatures.length - MAX_HANDOFF_FEATURES;
      features = rawFeatures.slice(0, MAX_HANDOFF_FEATURES);
      advisories.push(
        `feature list capped at ${MAX_HANDOFF_FEATURES} (${truncated} dropped — runaway-generation guard)`,
      );
    }

    const baseGate =
      "Operator must verify CAD geometry + recognized features before CAM runs. " +
      "PRISM never auto-executes a CAD→CAM handoff.";

    // Refusal path 1 — nothing to program.
    if (features.length === 0) {
      return {
        part_name: partName,
        target_cam: targetCam,
        material,
        operations: [],
        handoff_confidence: 0,
        requires_operator_approval: true,
        auto_executed: false,
        blocked: true,
        block_reason: "no CAD features supplied — nothing to hand off",
        gate_reason: baseGate,
        truncated_features: truncated,
        advisories,
      };
    }

    // Refusal path 2 — CAD geometry too uncertain to program unsupervised.
    if (cadConf < minConf) {
      return {
        part_name: partName,
        target_cam: targetCam,
        material,
        operations: [],
        handoff_confidence: cadConf,
        requires_operator_approval: true,
        auto_executed: false,
        blocked: true,
        block_reason: `CAD confidence ${cadConf.toFixed(
          3,
        )} < min ${minConf} — geometry too uncertain for autonomous handoff`,
        gate_reason: baseGate,
        truncated_features: truncated,
        advisories,
      };
    }

    const operations: HandoffOperation[] = features.map((f) => {
      const ftype = (f?.type ?? "").toString();
      const mapped =
        FEATURE_PHASE_MAP.find((m) => m.match.test(ftype)) ?? null;
      const phase: HandoffOperation["phase"] = mapped?.phase ?? "other";
      // Sanitize the (untrusted, generator-emitted) feature type the same
      // way string params are cleaned — strip everything but word chars,
      // spaces and hyphens so an injection-y type can't reach the hint.
      const safeType = ftype
        .replace(/[^\w\s-]+/g, " ")
        .replace(/[_-]+/g, " ")
        .trim();
      const partHint = [safeType, mapped?.hint ?? "", paramTokens(f?.params)]
        .join(" ")
        .trim();

      const rec = camStrategyRecommenderEngine.recommend({
        target_cam: targetCam,
        part_hint: partHint,
        material,
        max_alternatives: maxAlt,
      });

      return {
        feature_type: ftype || "(unknown)",
        part_hint: partHint,
        recommended_strategy: rec.recommended_strategy,
        recommended_score: rec.recommended_score,
        phase,
        rationale: rec.rationale,
        alternatives: rec.alternatives,
      };
    });

    // Machining order: rough → finish → drill → other; stable within phase.
    operations.sort(
      (a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase],
    );

    const scored = operations.filter((o) => o.recommended_score > 0);
    const meanScore =
      scored.length === 0
        ? 0
        : scored.reduce((s, o) => s + Math.min(1, o.recommended_score), 0) /
          scored.length;
    const handoffConfidence = clamp01(cadConf * meanScore);

    if (scored.length < operations.length) {
      advisories.push(
        `${operations.length - scored.length}/${operations.length} feature(s) had no CAM strategy match — operator must program them manually`,
      );
    }
    if (!targetCam) {
      advisories.push("empty target_cam — recommender returned null strategies");
    }

    return {
      part_name: partName,
      target_cam: targetCam,
      material,
      operations,
      handoff_confidence: handoffConfidence,
      requires_operator_approval: true,
      auto_executed: false,
      blocked: false,
      block_reason: null,
      gate_reason:
        baseGate +
        ` handoff_confidence=${handoffConfidence.toFixed(3)} — review before approving.`,
      truncated_features: truncated,
      advisories,
    };
  }
}

export const cadCamHandoffEngine = CadCamHandoffEngine;
