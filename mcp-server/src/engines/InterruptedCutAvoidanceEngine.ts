/**
 * InterruptedCutAvoidanceEngine — auto-detect and remediate interrupted cuts
 *
 * The architectural mirror of AirCutDetectionEngine. Two complementary problems:
 *   - AirCut    → tool is in the air, feeding when it could rapid (wastes time)
 *   - Interrupted Cut → tool intermittently bites material (breaks tools, ruins surface)
 *
 * Two analysis modes:
 *   1. SEQUENCE mode — pre-CAM. Given a planned `OperationStep[]` with affected_regions,
 *      detects pairwise (step_i, step_j) where step_j operates on a region that step_i
 *      has perturbed (drilled, pocketed, faced) in a way that creates an interrupted
 *      entry / exit. Recommends sequence-swap, feature-suppress, machine-swap, etc.
 *   2. GCODE mode — post-emit. Builds a Z-height map from the cutting history (same
 *      approach AirCutDetectionEngine uses), flags moves where the tool transitions
 *      between "no material" and "material" mid-move (engagement_drop).
 *
 * Physics composition (NO inline constants — all from `physics/constants.ts`):
 *   - Shock load multiplier:  Fc_shock = Fc_baseline × shock_load_factor
 *     (1.05..3.0 by severity, per Konig 1976 / Astakhov 2004)
 *   - Tool-life loss:  T_after = T_baseline × life_multiplier (0.95..0.25)
 *     The engine returns the percentage loss; downstream consumers integrate it into
 *     their Taylor / Bayesian-wear computation.
 *
 * References:
 *   - Konig, W. (1976). "Wear behaviour of cutting tools under interrupted cuts"
 *   - Astakhov, V.P. (2004). "Tribology of metal cutting" Ch. 4 (impact loading)
 *   - Sandvik Coromant, "Application Guide — interrupted cutting" (2019 ed.)
 *
 * Doctrine: never inlines physics constants; refers to ISOGroup + CANONICAL_KIENZLE +
 * CANONICAL_TAYLOR. Severity-to-multiplier table is a *domain heuristic table*, not a
 * physics constant — it lives in this file and is explicitly typed `as const`.
 *
 * @module engines/InterruptedCutAvoidanceEngine
 * @version 1.0.0
 */

import type { ISOGroup } from "../physics/constants.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

// ─── Types ──────────────────────────────────────────────────────────

export type OperationType =
  | "drill" | "face_mill" | "pocket" | "contour" | "slot" | "thread"
  | "tap" | "bore" | "ream" | "spot" | "chamfer" | "engrave"
  | "trochoidal" | "adaptive";

/** Region of the part affected by an operation, in part coordinates (mm). */
export interface AffectedRegion {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  /** Z of the region top (highest Z, usually stock_top for first ops). */
  z_top: number;
  /** Z of the region bottom (lowest Z the op reaches). */
  z_bottom: number;
}

export interface OperationStep {
  id: string;
  type: OperationType;
  /** Optional CAD feature ref. */
  feature_id?: string;
  affected_regions: AffectedRegion[];
  tool_id?: string;
  notes?: string;
}

/** Pre-CAM sequence-mode input. */
export interface SequenceInput {
  mode: "sequence";
  steps: OperationStep[];
  material_iso_group: ISOGroup;
  /** 0..1. Default 0.7. Higher rigidity → minor severity floor drops one tier. */
  machine_rigidity?: number;
  /** If true, severity ≤ 2 detections are dropped. Default false. */
  tolerate_minor?: boolean;
}

/** Post-emit G-code-mode input. */
export interface GcodeInput {
  mode: "gcode";
  gcode: string;
  controller?: string;
  material_iso_group: ISOGroup;
  /** Z of stock top surface. Default 0 (convention). */
  stock_top_z?: number;
  /** Minimum cutter engagement percentage that's NOT flagged. Default 30. */
  min_engagement_pct?: number;
}

export type InterruptedCutInput = SequenceInput | GcodeInput;

export type InterruptedCutType =
  | "drill_into_existing_pocket"
  | "mill_face_after_drill"
  | "pocket_through_breakthrough"
  | "finish_across_rough_breaks"
  | "slot_crosses_hole"
  | "engagement_drop";

export type InterruptedCutSeverity = 1 | 2 | 3 | 4 | 5;

export type RemediationKind =
  | "swap_sequence" | "defer_to_setup" | "suppress_feature"
  | "swap_machine" | "flip_milling_direction"
  | "reduce_engagement" | "add_dwell";

export interface InterruptedCutRemediation {
  kind: RemediationKind;
  details: string;
  estimated_severity_after: InterruptedCutSeverity;
}

export interface InterruptedCutDetection {
  id: string;
  type: InterruptedCutType;
  severity: InterruptedCutSeverity;
  affected_step_ids: string[];
  region?: { x: number; y: number; z_top: number; z_bottom: number };
  reason: string;
  shock_load_factor: number;
  estimated_tool_life_loss_pct: number;
  remediations: InterruptedCutRemediation[];
}

export interface InterruptedCutResult {
  detections: InterruptedCutDetection[];
  optimized_sequence?: OperationStep[];
  summary: {
    total_steps_or_lines: number;
    detections: number;
    max_severity: 0 | InterruptedCutSeverity;
    estimated_total_life_loss_pct: number;
    by_type: Record<string, number>;
  };
  report: string;
}

// ─── Domain heuristic table (NOT physics constants) ─────────────────

/**
 * Severity → impact-load multiplier (shock) + tool-life multiplier.
 *
 * Per Konig (1976) and Astakhov (2004): interrupted-cut impact loading produces
 * 1.05x..3.0x peak cutting force above baseline Kienzle, and proportionally
 * reduces tool life via fatigue (life multiplier 0.95..0.25).
 *
 * These are domain heuristics — they are NOT in `physics/constants.ts` because
 * the canonical Kienzle/Taylor models live there and these are *multiplicative
 * adjustments* on top, calibrated against literature. This table is the only
 * place they appear; consumers compose via the engine API.
 */
const SEVERITY_TABLE: Record<InterruptedCutSeverity, {
  shock_load_factor: number;
  life_multiplier: number;
  description: string;
}> = {
  1: { shock_load_factor: 1.05, life_multiplier: 0.95, description: "minor surface impact" },
  2: { shock_load_factor: 1.20, life_multiplier: 0.85, description: "chip-evacuation issue" },
  3: { shock_load_factor: 1.50, life_multiplier: 0.70, description: "clear interrupted entry" },
  4: { shock_load_factor: 2.00, life_multiplier: 0.50, description: "heavy / multi-impact" },
  5: { shock_load_factor: 3.00, life_multiplier: 0.25, description: "drilling into through-hole or brittle interrupt" },
} as const;

/** ISO groups with low Taylor n (faster life decay) → +1 severity penalty. */
const BRITTLE_PENALTY_GROUPS: ReadonlySet<ISOGroup> = new Set<ISOGroup>(["S", "H"]);

/** Valid OperationType values for adversarial-input validation. */
const VALID_OPERATION_TYPES: ReadonlySet<string> = new Set([
  "drill", "face_mill", "pocket", "contour", "slot", "thread",
  "tap", "bore", "ream", "spot", "chamfer", "engrave",
  "trochoidal", "adaptive",
]);

/**
 * Ops that create LOCALIZED voids (pockets / holes / slots) — when a later op
 * crosses one of these, it experiences interrupted engagement.
 *
 * Distinct from UNIFORM-plane ops (face_mill, full-traverse contour) where the
 * later op simply starts at a new uniform plane — not interrupted.
 */
const VOID_CREATING_OPS: ReadonlySet<OperationType> = new Set<OperationType>([
  "drill", "bore", "ream", "pocket", "slot",
  "adaptive", "trochoidal", "engrave", "tap", "thread", "spot",
]);

// ─── Heuristic thresholds (named for traceability) ───────────────────

/** Rigidity ≥ this threshold softens minor severities by one tier. */
const RIGIDITY_SOFTEN_THRESHOLD = 0.85;

/** Surface considered "already disturbed" if prior step's lowest Z dropped by this much below stepJ's plane (mm). */
const SURFACE_DISTURBANCE_TOL_MM = 0.5;

/** Finish-pass extends below prior rough by more than this → flag as repeat-rough (mm). */
const FINISH_REPEAT_ROUGH_TOL_MM = 0.1;

/** Cavity depth at drill location > this → severity 5 (mm). */
const CAVITY_DEPTH_SEV5_MM = 10;

/** Cavity depth at drill location > this → severity 4 (mm). */
const CAVITY_DEPTH_SEV4_MM = 3;

/** Face/contour hole-drop > this → severity 5 (mm). */
const FACE_DROP_SEV5_MM = 5;

/** Face/contour hole-drop > this → severity 4 (mm). */
const FACE_DROP_SEV4_MM = 1;

/** G-code engagement-drop deeper than this below stock_top → bump from sev 3 to sev 4 (mm). */
const ENGAGEMENT_DROP_DEEP_MM = 3;

/** Z-height map gap considered void for engagement detection (mm). */
const VOID_GAP_TOL_MM = 0.5;

/** Sample-count for engagement-drop scan along a segment. */
const ENGAGEMENT_SAMPLE_COUNT = 5;

// ─── G-code parsing regexes (mirror AirCutDetectionEngine) ──────────

const G_MOTION_LINEAR = /G0?1\b/;
const G_MOTION_RAPID = /G0?0\b/;
const G_MOTION_ARC_CW = /G0?2\b/;
const G_MOTION_ARC_CCW = /G0?3\b/;
const X_REGEX = /X(-?[\d.]+)/;
const Y_REGEX = /Y(-?[\d.]+)/;
const Z_REGEX = /Z(-?[\d.]+)/;

// ─── Engine ─────────────────────────────────────────────────────────

class InterruptedCutAvoidanceEngineImpl {
  /**
   * Detect interrupted cuts in a sequence plan or G-code program.
   *
   * @throws Error if input.mode is missing or unsupported; if a sequence step has an
   *   invalid `type` (fail-loud per R12); if `material_iso_group` is missing.
   */
  detect(input: InterruptedCutInput): InterruptedCutResult {
    if (!input || typeof input !== "object") {
      throw new Error("InterruptedCutAvoidanceEngine: input is required");
    }
    if (input.mode !== "sequence" && input.mode !== "gcode") {
      throw new Error(`InterruptedCutAvoidanceEngine: unsupported mode '${(input as { mode?: unknown }).mode}'`);
    }
    if (!input.material_iso_group || !["P", "M", "K", "N", "S", "H"].includes(input.material_iso_group)) {
      throw new Error(`InterruptedCutAvoidanceEngine: material_iso_group must be one of P|M|K|N|S|H (got '${String(input.material_iso_group)}')`);
    }

    if (input.mode === "sequence") {
      return this.detectInSequence(input);
    }
    return this.detectInGcode(input);
  }

  // ─── Sequence mode ────────────────────────────────────────────────

  private detectInSequence(input: SequenceInput): InterruptedCutResult {
    // Validate steps
    if (!Array.isArray(input.steps)) {
      throw new Error("InterruptedCutAvoidanceEngine: input.steps must be an array");
    }
    for (const step of input.steps) {
      if (!step || typeof step !== "object") {
        throw new Error("InterruptedCutAvoidanceEngine: every step must be an object");
      }
      if (typeof step.id !== "string" || step.id.length === 0) {
        throw new Error("InterruptedCutAvoidanceEngine: every step needs a non-empty id");
      }
      if (!VALID_OPERATION_TYPES.has(step.type)) {
        throw new Error(`InterruptedCutAvoidanceEngine: invalid step.type '${step.type}' on step ${step.id}`);
      }
      if (!Array.isArray(step.affected_regions)) {
        throw new Error(`InterruptedCutAvoidanceEngine: step ${step.id} missing affected_regions array`);
      }
    }

    const material = input.material_iso_group;
    const rigidity = input.machine_rigidity ?? 0.7;
    const tolerateMinor = input.tolerate_minor ?? false;

    const detections: InterruptedCutDetection[] = [];
    let detectionCounter = 0;

    // Pairwise scan: for each later step j, check if earlier step i perturbed its region
    for (let j = 1; j < input.steps.length; j++) {
      const stepJ = input.steps[j];
      for (let i = 0; i < j; i++) {
        const stepI = input.steps[i];
        const overlapping = this.findRegionOverlap(stepI, stepJ);
        if (!overlapping) continue;

        const interrupted = this.classifyInterruption(stepI, stepJ, overlapping, material, rigidity);
        if (!interrupted) continue;

        if (tolerateMinor && interrupted.severity <= 2) continue;

        detectionCounter++;
        const remediations = this.buildRemediations(stepI, stepJ, interrupted, material);
        const severityRow = SEVERITY_TABLE[interrupted.severity];

        detections.push({
          id: `IC${detectionCounter.toString().padStart(3, "0")}`,
          type: interrupted.type,
          severity: interrupted.severity,
          affected_step_ids: [stepI.id, stepJ.id],
          region: {
            x: (overlapping.x_min + overlapping.x_max) / 2,
            y: (overlapping.y_min + overlapping.y_max) / 2,
            z_top: overlapping.z_top,
            z_bottom: overlapping.z_bottom,
          },
          reason: interrupted.reason,
          shock_load_factor: severityRow.shock_load_factor,
          estimated_tool_life_loss_pct: Math.round((1 - severityRow.life_multiplier) * 100),
          remediations,
        });
      }
    }

    // Build optimized sequence: simple swap remediation for swap_sequence detections.
    // Multi-detection sequences may need topological re-sort — out of scope here;
    // we apply the first-detection pairwise swap as a useful first-cut. The
    // operator/follow-on `U-CAM-TRAIN-PIPE-ORCH` does global re-ordering.
    const optimized = this.buildOptimizedSequence(input.steps, detections);

    const byType: Record<string, number> = {};
    let maxSev: 0 | InterruptedCutSeverity = 0;
    let totalLifeLoss = 0;
    for (const d of detections) {
      byType[d.type] = (byType[d.type] ?? 0) + 1;
      if (d.severity > maxSev) maxSev = d.severity;
      totalLifeLoss += d.estimated_tool_life_loss_pct;
    }
    const avgLifeLoss = detections.length === 0
      ? 0
      : Math.round(totalLifeLoss / detections.length);

    return {
      detections,
      optimized_sequence: optimized,
      summary: {
        total_steps_or_lines: input.steps.length,
        detections: detections.length,
        max_severity: maxSev,
        estimated_total_life_loss_pct: avgLifeLoss,
        by_type: byType,
      },
      report: this.buildReport(detections, input.steps.length, maxSev, avgLifeLoss, byType, material),
    };
  }

  /** Return the overlap rectangle if any region of stepI overlaps any region of stepJ; else null. */
  private findRegionOverlap(stepI: OperationStep, stepJ: OperationStep): AffectedRegion | null {
    for (const a of stepI.affected_regions) {
      for (const b of stepJ.affected_regions) {
        const x_min = Math.max(a.x_min, b.x_min);
        const x_max = Math.min(a.x_max, b.x_max);
        const y_min = Math.max(a.y_min, b.y_min);
        const y_max = Math.min(a.y_max, b.y_max);
        if (x_min < x_max && y_min < y_max) {
          return {
            x_min, x_max, y_min, y_max,
            z_top: Math.min(a.z_top, b.z_top),
            z_bottom: Math.max(a.z_bottom, b.z_bottom),
          };
        }
      }
    }
    return null;
  }

  /**
   * Given two overlapping steps, classify whether stepJ on top of stepI's perturbation
   * creates an interrupted cut, and at what severity. Returns null if the pair is safe
   * (e.g., second pocket lower than first — purely roughing-to-finishing handoff).
   */
  private classifyInterruption(
    stepI: OperationStep,
    stepJ: OperationStep,
    _overlap: AffectedRegion,
    material: ISOGroup,
    rigidity: number,
  ): { type: InterruptedCutType; severity: InterruptedCutSeverity; reason: string } | null {
    const t_i = stepI.type;
    const t_j = stepJ.type;

    // Take the lowest reached Z from stepI on the overlap region
    const lowestI = Math.min(...stepI.affected_regions.map(r => r.z_bottom));

    // Take stepJ's plane of attack
    const topJ = Math.max(...stepJ.affected_regions.map(r => r.z_top));

    // Helper: bump severity by ISO penalty + rigidity discount
    const adjust = (base: InterruptedCutSeverity, reason: string): {
      type: InterruptedCutType; severity: InterruptedCutSeverity; reason: string;
    } | null => {
      let sev = base;
      if (BRITTLE_PENALTY_GROUPS.has(material) && sev < 5) sev = (sev + 1) as InterruptedCutSeverity;
      if (rigidity >= RIGIDITY_SOFTEN_THRESHOLD && sev > 1) sev = (sev - 1) as InterruptedCutSeverity;
      return { type: detectType(t_i, t_j), severity: sev, reason };
    };

    const detectType = (a: OperationType, b: OperationType): InterruptedCutType => {
      // Drill into prior pocket/face
      if (b === "drill" && (a === "pocket" || a === "face_mill" || a === "contour" || a === "adaptive" || a === "trochoidal")) {
        return "drill_into_existing_pocket";
      }
      // Mill face after drill / through-hole
      if ((b === "face_mill" || b === "contour") && (a === "drill" || a === "bore" || a === "ream")) {
        return "mill_face_after_drill";
      }
      // Pocket that breaks through a known hole
      if (b === "pocket" && (a === "drill" || a === "bore" || a === "ream")) {
        return "pocket_through_breakthrough";
      }
      // Slot that crosses a hole
      if (b === "slot" && (a === "drill" || a === "bore" || a === "ream")) {
        return "slot_crosses_hole";
      }
      // Finish across rough breaks (default fallback for finish-style B after rough-style A)
      return "finish_across_rough_breaks";
    };

    // 1. Drill (later) into a prior LOCALIZED void (pocket / hole / slot).
    //    Drilling onto a uniform face is NOT interrupted — only void-creating prior
    //    ops trigger this branch.
    if (t_j === "drill" || t_j === "bore" || t_j === "ream") {
      if (!VOID_CREATING_OPS.has(t_i)) {
        return null;  // prior was a uniform plane (face_mill / contour) — drill is fine
      }
      if (lowestI < topJ - SURFACE_DISTURBANCE_TOL_MM) {
        const depthOfCavity = topJ - lowestI;
        if (depthOfCavity > CAVITY_DEPTH_SEV5_MM) return adjust(5, `drill enters existing cavity ${depthOfCavity.toFixed(1)}mm deep`);
        if (depthOfCavity > CAVITY_DEPTH_SEV4_MM) return adjust(4, `drill enters existing cavity ${depthOfCavity.toFixed(1)}mm deep`);
        return adjust(3, `drill enters existing cavity ${depthOfCavity.toFixed(1)}mm deep`);
      }
      // Drill at same plane but already-disturbed surface (use small floating-point tolerance)
      if (lowestI < topJ + Number.EPSILON) {
        return adjust(2, "drill onto already-cut surface");
      }
      return null;
    }

    // 2. Facing or contour across a prior drilled hole = interrupted top.
    if ((t_j === "face_mill" || t_j === "contour") &&
        (t_i === "drill" || t_i === "bore" || t_i === "ream")) {
      if (lowestI < topJ) {
        const dropDepth = topJ - lowestI;
        if (dropDepth > FACE_DROP_SEV5_MM) return adjust(5, `face / contour crosses prior hole ${dropDepth.toFixed(1)}mm deep — guaranteed interrupted top`);
        if (dropDepth > FACE_DROP_SEV4_MM) return adjust(4, `face / contour crosses prior hole ${dropDepth.toFixed(1)}mm deep`);
        return adjust(3, "face / contour crosses prior hole");
      }
      return null;
    }

    // 3. Pocket breaking through a known hole.
    if (t_j === "pocket" && (t_i === "drill" || t_i === "bore" || t_i === "ream")) {
      if (lowestI < topJ) {
        return adjust(3, "pocket pass breaks through prior hole — interrupted side wall");
      }
      return null;
    }

    // 4. Slot crossing a prior hole.
    if (t_j === "slot" && (t_i === "drill" || t_i === "bore" || t_i === "ream")) {
      if (lowestI < topJ) {
        return adjust(4, "slot toolpath crosses prior hole — repeated impact at every pass");
      }
      return null;
    }

    // 5. Finish (contour / face / slot after pocket) across rough breaks — minor.
    if ((t_j === "contour" || t_j === "face_mill") &&
        (t_i === "pocket" || t_i === "adaptive" || t_i === "trochoidal")) {
      // Only flag if finish is going below the prior rough floor (re-roughing) — usually
      // safe finishing pass at same Z is fine. Below floor = re-entering rough territory.
      const stepJBottom = Math.min(...stepJ.affected_regions.map(r => r.z_bottom));
      if (stepJBottom < lowestI - FINISH_REPEAT_ROUGH_TOL_MM) {
        return adjust(2, "finish pass extends below prior rough — possible repeat-rough");
      }
      return null;
    }

    return null;
  }

  /** Plain-English rationale for a sequence-swap remediation. */
  private swapRationale(a: OperationType, b: OperationType): string {
    if (a === "drill" && (b === "face_mill" || b === "contour")) {
      return "Standard rule: mill face first, then drill. Drilling first creates an interrupted top surface that breaks face-mill inserts.";
    }
    if (a === "pocket" && b === "drill") {
      return "Pocket leaves a partial floor under the drill — drilling into the cavity wall causes single-edge interrupted entry.";
    }
    if (a === "drill" && b === "pocket") {
      return "The pocket pass would crash into the drilled hole at its sidewall — pocket first, then drill if still needed.";
    }
    return `Reordering eliminates the interrupted entry pattern from ${a} to ${b}.`;
  }

  /** Build remediation list given the detection context. */
  private buildRemediations(
    stepI: OperationStep,
    stepJ: OperationStep,
    detection: { type: InterruptedCutType; severity: InterruptedCutSeverity; reason: string },
    _material: ISOGroup,
  ): InterruptedCutRemediation[] {
    const out: InterruptedCutRemediation[] = [];
    const severityAfterSwap = Math.max(1, (detection.severity - 3) || 1) as InterruptedCutSeverity;

    // Primary remediation: swap_sequence (works for most pairwise)
    if (detection.type === "drill_into_existing_pocket"
        || detection.type === "mill_face_after_drill"
        || detection.type === "pocket_through_breakthrough"
        || detection.type === "slot_crosses_hole") {
      out.push({
        kind: "swap_sequence",
        details: `Run ${stepJ.type} (step ${stepJ.id}) BEFORE ${stepI.type} (step ${stepI.id}). ${this.swapRationale(stepI.type, stepJ.type)}`,
        estimated_severity_after: severityAfterSwap,
      });
    }

    // Severity-4+ adds feature-suppress + machine-swap options
    if (detection.severity >= 4) {
      out.push({
        kind: "suppress_feature",
        details: `In CAD, suppress ${stepI.feature_id ?? "feature for " + stepI.id} until after step ${stepJ.id} completes; CAM regenerates against modified geometry.`,
        estimated_severity_after: 1,
      });
      out.push({
        kind: "swap_machine",
        details: "Move this op to a higher-rigidity machine (Okuma M460V > Hurco VMX > Haas VF2 ranking by ATC drift + spindle stiffness).",
        estimated_severity_after: Math.max(1, detection.severity - 2) as InterruptedCutSeverity,
      });
    }

    // Severity-3+ adds reduce-engagement + flip-direction
    if (detection.severity >= 3) {
      out.push({
        kind: "reduce_engagement",
        details: "Halve `ap` and double the pass count (preserves MRR but softens per-impact shock).",
        estimated_severity_after: Math.max(1, detection.severity - 1) as InterruptedCutSeverity,
      });
      out.push({
        kind: "flip_milling_direction",
        details: "Switch to conventional milling for the interrupted segment (less prone to insert chip-out on re-entry than climb).",
        estimated_severity_after: Math.max(1, detection.severity - 1) as InterruptedCutSeverity,
      });
    }

    // Always offer add_dwell as last-resort
    out.push({
      kind: "add_dwell",
      details: "Insert G4 P0.2 (200ms dwell) before re-entry to clear chip and let spindle stabilize.",
      estimated_severity_after: Math.max(1, detection.severity - 1) as InterruptedCutSeverity,
    });

    // Defer-to-setup only for severity 5
    if (detection.severity === 5) {
      out.push({
        kind: "defer_to_setup",
        details: `Move ${stepI.id} or ${stepJ.id} to a separate setup; current setup cannot avoid this interrupted cut.`,
        estimated_severity_after: 1,
      });
    }

    return out;
  }

  /** Apply pairwise swap remediations to produce a re-ordered step list. */
  private buildOptimizedSequence(steps: OperationStep[], detections: InterruptedCutDetection[]): OperationStep[] {
    const result = [...steps];
    const idIndex = new Map(result.map((s, i) => [s.id, i]));
    for (const d of detections) {
      const swap = d.remediations.find(r => r.kind === "swap_sequence");
      if (!swap || d.affected_step_ids.length !== 2) continue;
      const [aId, bId] = d.affected_step_ids;
      const aIdx = idIndex.get(aId);
      const bIdx = idIndex.get(bId);
      if (aIdx === undefined || bIdx === undefined || aIdx === bIdx) continue;
      // Move bId BEFORE aId in result (don't actually swap — that loses ordering)
      if (bIdx > aIdx) {
        const [moved] = result.splice(bIdx, 1);
        result.splice(aIdx, 0, moved);
        // Rebuild index after mutation
        idIndex.clear();
        result.forEach((s, i) => idIndex.set(s.id, i));
      }
    }
    return result;
  }

  // ─── G-code mode (post-emit engagement-drop detection) ───────────

  private detectInGcode(input: GcodeInput): InterruptedCutResult {
    if (typeof input.gcode !== "string") {
      throw new Error("InterruptedCutAvoidanceEngine: gcode must be a string in gcode-mode");
    }
    const lines = input.gcode.split("\n");
    const stockTopZ = input.stock_top_z ?? 0;
    // We do not currently use min_engagement_pct as a continuous metric — we use a
    // discrete Z-height-map "did the tool just transition above/below previously-cut
    // material" heuristic, which corresponds to engagement going 100% → 0% and back.
    // The min_engagement_pct parameter is captured for forward-compatibility with a
    // future continuous engagement model.

    const detections: InterruptedCutDetection[] = [];
    let detectionCounter = 0;

    // Build Z-height map from cutting moves (same approach as AirCutDetectionEngine).
    const zMap = new Map<string, number>();
    const gridKey = (x: number, y: number): string =>
      `${Math.round(x)},${Math.round(y)}`;

    let scanX = 0, scanY = 0, scanZ = stockTopZ + 50;
    let scanMotion: "rapid" | "linear" | "arc" = "rapid";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || this.isComment(trimmed)) continue;
      if (G_MOTION_RAPID.test(trimmed)) scanMotion = "rapid";
      else if (G_MOTION_LINEAR.test(trimmed)) scanMotion = "linear";
      else if (G_MOTION_ARC_CW.test(trimmed) || G_MOTION_ARC_CCW.test(trimmed)) scanMotion = "arc";

      const xm = trimmed.match(X_REGEX);
      const ym = trimmed.match(Y_REGEX);
      const zm = trimmed.match(Z_REGEX);
      // Fail-loud on NaN coordinate parse (pathological inputs like "X.." / "X-."):
      // skip the line rather than poison the zMap with NaN keys.
      if (xm) {
        const parsed = parseFloat(xm[1]);
        if (Number.isFinite(parsed)) scanX = parsed;
      }
      if (ym) {
        const parsed = parseFloat(ym[1]);
        if (Number.isFinite(parsed)) scanY = parsed;
      }
      if (zm) {
        const parsed = parseFloat(zm[1]);
        if (Number.isFinite(parsed)) scanZ = parsed;
      }

      if (scanMotion !== "rapid" && scanZ <= stockTopZ) {
        const key = gridKey(scanX, scanY);
        const existing = zMap.get(key);
        if (existing === undefined || scanZ < existing) {
          zMap.set(key, scanZ);
        }
      }
    }

    // Second pass: detect engagement drops on linear cutting moves.
    let curX = 0, curY = 0, curZ = stockTopZ + 50;
    let motionMode: "rapid" | "linear" | "arc" = "rapid";

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || this.isComment(trimmed)) continue;

      if (G_MOTION_RAPID.test(trimmed)) motionMode = "rapid";
      else if (G_MOTION_LINEAR.test(trimmed)) motionMode = "linear";
      else if (G_MOTION_ARC_CW.test(trimmed) || G_MOTION_ARC_CCW.test(trimmed)) motionMode = "arc";

      const xm = trimmed.match(X_REGEX);
      const ym = trimmed.match(Y_REGEX);
      const zm = trimmed.match(Z_REGEX);
      const xCandidate = xm ? parseFloat(xm[1]) : curX;
      const yCandidate = ym ? parseFloat(ym[1]) : curY;
      const zCandidate = zm ? parseFloat(zm[1]) : curZ;
      const newX = Number.isFinite(xCandidate) ? xCandidate : curX;
      const newY = Number.isFinite(yCandidate) ? yCandidate : curY;
      const newZ = Number.isFinite(zCandidate) ? zCandidate : curZ;

      // Engagement-drop only makes sense on LATERAL cutting moves (Z roughly constant).
      // Plunge / ramp moves (large dz) self-reference their own endpoint depth in zMap;
      // skip them — they're standard CAM entry strategies, not interrupted-cut events.
      const zChange = Math.abs(newZ - curZ);
      const isLateral = zChange < VOID_GAP_TOL_MM;
      if ((motionMode === "linear" || motionMode === "arc") && isLateral) {
        // Walk sample points along the segment; if some samples sit in material and
        // others sit in already-cut void, the cutter engagement transitions mid-move.
        let hadMaterial = false;
        let hadVoid = false;
        for (let k = 0; k <= ENGAGEMENT_SAMPLE_COUNT; k++) {
          const t = k / ENGAGEMENT_SAMPLE_COUNT;
          const sx = curX + (newX - curX) * t;
          const sy = curY + (newY - curY) * t;
          const sz = curZ + (newZ - curZ) * t;
          const deepest = zMap.get(gridKey(sx, sy));
          if (sz > stockTopZ) {
            // Above stock — air, not relevant to engagement
            continue;
          }
          if (deepest !== undefined && deepest < sz - VOID_GAP_TOL_MM) {
            hadVoid = true;
          } else {
            hadMaterial = true;
          }
        }

        if (hadMaterial && hadVoid) {
          detectionCounter++;
          const severity: InterruptedCutSeverity = newZ < stockTopZ - ENGAGEMENT_DROP_DEEP_MM ? 4 : 3;
          const adjustedSev = BRITTLE_PENALTY_GROUPS.has(input.material_iso_group)
            ? Math.min(5, severity + 1) as InterruptedCutSeverity
            : severity;
          const row = SEVERITY_TABLE[adjustedSev];
          detections.push({
            id: `IC-G${detectionCounter.toString().padStart(3, "0")}`,
            type: "engagement_drop",
            severity: adjustedSev,
            affected_step_ids: [`gcode-line-${i + 1}`],
            region: { x: (curX + newX) / 2, y: (curY + newY) / 2, z_top: Math.max(curZ, newZ), z_bottom: Math.min(curZ, newZ) },
            reason: `G-code line ${i + 1}: cutter transitions material/void mid-move`,
            shock_load_factor: row.shock_load_factor,
            estimated_tool_life_loss_pct: Math.round((1 - row.life_multiplier) * 100),
            remediations: [
              { kind: "reduce_engagement", details: "Reduce stepover or split this move into two passes — one over material, one over void.", estimated_severity_after: 1 },
              { kind: "add_dwell", details: "Insert short dwell at the transition; let chip clear before re-engage.", estimated_severity_after: 2 },
              { kind: "flip_milling_direction", details: "Conventional milling absorbs re-engagement impact better than climb in this geometry.", estimated_severity_after: 2 },
            ],
          });
        }
      }

      curX = newX;
      curY = newY;
      curZ = newZ;
    }

    const byType: Record<string, number> = {};
    let maxSev: 0 | InterruptedCutSeverity = 0;
    let totalLifeLoss = 0;
    for (const d of detections) {
      byType[d.type] = (byType[d.type] ?? 0) + 1;
      if (d.severity > maxSev) maxSev = d.severity;
      totalLifeLoss += d.estimated_tool_life_loss_pct;
    }
    const avgLifeLoss = detections.length === 0 ? 0 : Math.round(totalLifeLoss / detections.length);

    return {
      detections,
      summary: {
        total_steps_or_lines: lines.length,
        detections: detections.length,
        max_severity: maxSev,
        estimated_total_life_loss_pct: avgLifeLoss,
        by_type: byType,
      },
      report: this.buildReport(detections, lines.length, maxSev, avgLifeLoss, byType, input.material_iso_group),
    };
  }

  /**
   * Compose Kienzle baseline cutting force. Downstream consumers multiply by `shock_load_factor`.
   *
   * Fc = kc1.1 × ap × fz^(1 - mc)   (kc1.1 + mc from `CANONICAL_KIENZLE[material]`)
   *
   * @param material - ISO material group ("P"|"M"|"K"|"N"|"S"|"H")
   * @param ap_mm    - depth of cut [mm]
   * @param fz_mm    - feed per tooth [mm]
   * @returns Baseline cutting force [N] (positive)
   */
  baselineKienzleForce(material: ISOGroup, ap_mm: number, fz_mm: number): number {
    const kc = CANONICAL_KIENZLE[material];
    return kc.kc1_1 * ap_mm * Math.pow(fz_mm, 1 - kc.mc);
  }

  /**
   * Compose Taylor baseline tool life. Downstream consumers multiply by `life_multiplier`.
   *
   * T = (C / Vc)^(1/n)              (C + n from `CANONICAL_TAYLOR[material]`)
   *
   * @param material  - ISO material group ("P"|"M"|"K"|"N"|"S"|"H")
   * @param Vc_m_min  - cutting speed [m/min] (strictly positive)
   * @returns Tool life [min]
   */
  baselineTaylorLifeMin(material: ISOGroup, Vc_m_min: number): number {
    const t = CANONICAL_TAYLOR[material];
    return Math.pow(t.C / Vc_m_min, 1 / t.n);
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private isComment(line: string): boolean {
    return (line.startsWith("(") && line.endsWith(")")) ||
           line.startsWith(";") ||
           line.startsWith("%");
  }

  private buildReport(
    detections: InterruptedCutDetection[],
    total: number,
    maxSev: 0 | InterruptedCutSeverity,
    avgLifeLoss: number,
    byType: Record<string, number>,
    material: ISOGroup,
  ): string {
    const parts: string[] = [
      "INTERRUPTED-CUT DETECTION REPORT",
      "================================",
      `Material ISO group: ${material}`,
      `Total steps / lines analyzed: ${total}`,
      `Detections: ${detections.length}`,
      `Max severity: ${maxSev}`,
      `Average tool-life loss across detections: ${avgLifeLoss}%`,
      "",
      "BY TYPE:",
    ];
    for (const [type, count] of Object.entries(byType)) {
      parts.push(`  ${type}: ${count} occurrence(s)`);
    }
    if (detections.length > 0) {
      parts.push("", "TOP DETECTIONS (by severity then life loss):");
      const sorted = [...detections].sort((a, b) =>
        b.severity - a.severity || b.estimated_tool_life_loss_pct - a.estimated_tool_life_loss_pct);
      for (const d of sorted.slice(0, 10)) {
        parts.push(`  ${d.id} [sev ${d.severity}] ${d.type} on steps ${d.affected_step_ids.join(", ")}`);
        parts.push(`    ${d.reason}`);
        parts.push(`    shock=${d.shock_load_factor.toFixed(2)}x, life loss=${d.estimated_tool_life_loss_pct}%`);
        if (d.remediations.length > 0) {
          parts.push(`    primary remediation [${d.remediations[0].kind}]: ${d.remediations[0].details}`);
        }
      }
    }
    return parts.join("\n");
  }
}

/** Singleton export. */
export const interruptedCutAvoidanceEngine = new InterruptedCutAvoidanceEngineImpl();
