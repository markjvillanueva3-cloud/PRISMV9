/**
 * HyperMillSecondaryOpsSequencer — Combined secondary operations sequencer
 *
 * Sequences grinding + EDM + heat treatment steps into a physically correct
 * manufacturing order for hyperMILL operations.
 *
 * Physical constraints enforced:
 *   1. Cannot grind hardened-finish surface BEFORE hardening
 *   2. Cannot EDM BEFORE stress relief (EDM introduces residual stress)
 *   3. Cannot case-harden AFTER final grinding (carbon/nitride layer removed)
 *   4. Stress relief MUST follow heavy roughing BEFORE semi-finish
 *   5. Inspection occurs AFTER all secondary ops, not before
 *
 * Canonical manufacturing sequences:
 *   Mold Tool:    rough → stress_relief → semi_finish → harden → grind → EDM → inspect
 *   Bearing:      rough → harden → temper → cylindrical_grind → superfinish → inspect
 *   Gear:         rough → normalize → finish_teeth → case_harden → grind_flanks → inspect
 *
 * Sources:
 *   - Kalpakjian & Schmid (2010) "Manufacturing Engineering and Technology" §27
 *   - AGMA 2001 — Fundamental Rating Factors for Gear Teeth (gear sequence)
 *   - DIN 8580 — manufacturing process classification
 *
 * HM-REV-MS6 / U-HMR36
 */

import type { HeatTreatStep } from "./HyperMillHeatTreatmentRouter.js";
import type { GrindingType } from "./HyperMillGrindingBridge.js";
import type { EDMRouteType } from "./HyperMillEDMBridge.js";

// ============================================================================
// Types
// ============================================================================

export type SecondaryOpType =
  | "rough_machine"
  | "stress_relief"
  | "semi_finish_machine"
  | "anneal"
  | "normalize"
  | "harden"
  | "temper"
  | "case_harden"
  | "grind"
  | "edm"
  | "superfinish"
  | "final_inspect"
  | "material_cert_verify"
  | "dimension_check";

export type PartApplication =
  | "mold_tool"       // injection mold / die: requires grind + EDM after harden
  | "bearing"         // bearing race / journal: OD/ID cylindrical grind
  | "gear"            // gear: profile grind after case harden
  | "aerospace_part"  // general aerospace: NADCAP heat treat, full cert chain
  | "general";        // general machining: apply only triggered ops

export interface SecondaryOpsInput {
  /** Part application type — drives canonical sequence */
  partApplication: PartApplication;
  /** Part name / drawing number */
  partName: string;
  /** Material */
  material: string;
  /** Heat treatment steps (from HyperMillHeatTreatmentRouter) */
  heatTreatSteps?: HeatTreatStep[];
  /** Grinding type required (if any) */
  grindingRequired?: boolean;
  grindingType?: GrindingType;
  /** EDM required (if any) */
  edmRequired?: boolean;
  edmType?: EDMRouteType;
  /** Heavy roughing planned */
  heavyRoughing?: boolean;
  /** Superfinish required (Ra < 0.1µm) */
  superfinishRequired?: boolean;
  /** NADCAP requirements (aerospace) */
  nadcapRequired?: boolean;
}

export interface SequencedOperation {
  /** Operation number in sequence (1-based) */
  opNumber: number;
  /** Operation type */
  type: SecondaryOpType;
  /** Human-readable description */
  description: string;
  /** Duration estimate [hours] */
  estimatedDuration_h: number;
  /** Whether this operation requires special process approval (NADCAP) */
  nadcapRequired: boolean;
  /** Constraint reason (why this op is at this position) */
  constraintReason: string;
  /** Heat treat step reference (if this op = heat treat) */
  heatTreatRef?: HeatTreatStep;
}

export interface SecondaryOpsSequenceResult {
  /** Part application */
  partApplication: PartApplication;
  /** Ordered sequence of operations */
  sequence: SequencedOperation[];
  /** Physical constraints that were enforced */
  constraintsEnforced: string[];
  /** Total estimated secondary ops time [hours] */
  totalTime_h: number;
  /** Critical path operations */
  criticalPath: string[];
  /** MS10 quality chain compatibility token */
  ms10Compatible: true;
  /** Warnings */
  warnings: string[];
  /** Source */
  source: string;
}

// ============================================================================
// Canonical sequence templates
// ============================================================================

/**
 * Canonical manufacturing sequences by part application.
 * Source: Kalpakjian §27; industry practice for each part type.
 */
const CANONICAL_SEQUENCES: Record<PartApplication, SecondaryOpType[]> = {
  mold_tool: [
    "rough_machine",
    "stress_relief",       // prevents distortion after heavy roughing
    "semi_finish_machine",
    "harden",
    "temper",
    "grind",               // finish grind hardened surfaces
    "edm",                 // EDM pockets/ribs (stress-neutral after stress relief)
    "dimension_check",
    "final_inspect",
  ],
  bearing: [
    "rough_machine",
    "harden",
    "temper",
    "grind",               // cylindrical OD/ID grind
    "superfinish",
    "dimension_check",
    "final_inspect",
  ],
  gear: [
    "rough_machine",
    "normalize",           // relieve forging stresses
    "semi_finish_machine",
    "case_harden",
    "grind",               // gear flank profile grinding
    "dimension_check",
    "final_inspect",
  ],
  aerospace_part: [
    "material_cert_verify",
    "rough_machine",
    "stress_relief",
    "semi_finish_machine",
    "harden",
    "temper",
    "grind",
    "dimension_check",
    "final_inspect",
  ],
  general: [
    "rough_machine",
    "semi_finish_machine",
    "dimension_check",
    "final_inspect",
  ],
};

/** Estimated operation durations [hours] */
const OP_DURATIONS_H: Record<SecondaryOpType, number> = {
  rough_machine:        4,
  stress_relief:        6,   // furnace cycle
  semi_finish_machine:  3,
  anneal:               8,
  normalize:            5,
  harden:               4,
  temper:               3,
  case_harden:          16,  // carburize cycle
  grind:                2,
  edm:                  6,
  superfinish:          1,
  final_inspect:        2,
  material_cert_verify: 0.5,
  dimension_check:      1,
};

/** Operations requiring NADCAP approval */
const NADCAP_OPS = new Set<SecondaryOpType>([
  "stress_relief", "anneal", "normalize", "harden", "temper", "case_harden",
]);

/** Constraint descriptions applied when re-ordering */
const CONSTRAINT_REASONS: Partial<Record<SecondaryOpType, string>> = {
  stress_relief:  "Stress relief MUST follow rough machining to prevent finish-stage distortion",
  harden:         "Hardening MUST occur before precision grinding (grind-before-harden wastes the grind)",
  grind:          "Grinding MUST occur after hardening (hardness is the reason for grinding)",
  edm:            "EDM MUST occur after stress relief to avoid EDM-induced residual stress compounding roughing stresses",
  case_harden:    "Case hardening MUST precede final grinding — grinding removes case layer",
  final_inspect:  "Final inspection MUST be the last operation",
};

// ============================================================================
// Engine
// ============================================================================

export class HyperMillSecondaryOpsSequencer {

  /**
   * Build a physically-constrained secondary operations sequence.
   *
   * @param input - Part application, triggered ops (grind/EDM/heat treat)
   * @returns Sequenced operation list with constraint enforcement log
   */
  calculate(input: SecondaryOpsInput): SecondaryOpsSequenceResult {
    const warnings: string[] = [];
    const constraintsEnforced: string[] = [];

    // ── 1. Build the base sequence from canonical template ────────────────────
    let baseSequence = [...(CANONICAL_SEQUENCES[input.partApplication] ?? CANONICAL_SEQUENCES.general)];

    // ── 2. Trim ops not triggered ─────────────────────────────────────────────
    baseSequence = this._filterTriggeredOps(baseSequence, input);

    // ── 3. Insert heat treat steps at correct timing positions ────────────────
    if (input.heatTreatSteps?.length) {
      const result = this._insertHeatTreatSteps(baseSequence, input.heatTreatSteps);
      baseSequence = result.sequence;
      constraintsEnforced.push(...result.constraints);
    }

    // ── 4. Validate physical constraints ─────────────────────────────────────
    const constraintResult = this._enforceConstraints(baseSequence, input);
    baseSequence = constraintResult.sequence;
    constraintsEnforced.push(...constraintResult.violations);
    warnings.push(...constraintResult.warnings);

    // ── 5. Build SequencedOperation objects ───────────────────────────────────
    const sequence: SequencedOperation[] = baseSequence.map((type, i) => {
      const htRef = input.heatTreatSteps?.find(s =>
        (type === "harden" || type === "temper") && s.type === "through_harden" ||
        type === "case_harden" && (s.type === "case_harden_carburize" || s.type === "case_harden_nitride") ||
        type === "stress_relief" && s.type === "stress_relief" ||
        type === "anneal" && s.type === "anneal"
      );

      return {
        opNumber: i + 1,
        type,
        description: this._describeOp(type, input),
        estimatedDuration_h: OP_DURATIONS_H[type] ?? 2,
        nadcapRequired: NADCAP_OPS.has(type) && (input.nadcapRequired ?? false),
        constraintReason: CONSTRAINT_REASONS[type] ?? "",
        heatTreatRef: htRef,
      };
    });

    // ── 6. Critical path ─────────────────────────────────────────────────────
    const criticalPath = sequence
      .filter(op => op.estimatedDuration_h >= 4 || NADCAP_OPS.has(op.type))
      .map(op => `${op.opNumber}. ${op.type}`);

    const totalTime_h = sequence.reduce((sum, op) => sum + op.estimatedDuration_h, 0);

    return {
      partApplication: input.partApplication,
      sequence,
      constraintsEnforced,
      totalTime_h: Math.round(totalTime_h * 10) / 10,
      criticalPath,
      ms10Compatible: true,
      warnings,
      source: "Kalpakjian-2010-ManufEng + AGMA-2001 + DIN-8580 + AS9102B",
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _filterTriggeredOps(
    sequence: SecondaryOpType[],
    input: SecondaryOpsInput,
  ): SecondaryOpType[] {
    return sequence.filter(op => {
      if (op === "grind" && !input.grindingRequired) return false;
      if (op === "edm" && !input.edmRequired) return false;
      if (op === "superfinish" && !input.superfinishRequired) return false;
      if (op === "stress_relief" && !input.heavyRoughing) return false;
      if (op === "material_cert_verify" && !input.nadcapRequired) return false;
      return true;
    });
  }

  private _insertHeatTreatSteps(
    sequence: SecondaryOpType[],
    htSteps: HeatTreatStep[],
  ): { sequence: SecondaryOpType[]; constraints: string[] } {
    const constraints: string[] = [];
    const result = [...sequence];

    // Ensure required heat treat types are present
    for (const step of htSteps) {
      const opType = this._htTypeToOpType(step.type);
      if (opType && !result.includes(opType)) {
        // Insert at correct position based on timing
        const insertIdx = this._timingToIndex(step.timing, result);
        result.splice(insertIdx, 0, opType);
        constraints.push(
          `Inserted '${opType}' at position ${insertIdx + 1} (timing: ${step.timing})`,
        );
      }
    }

    return { sequence: result, constraints };
  }

  private _enforceConstraints(
    sequence: SecondaryOpType[],
    input: SecondaryOpsInput,
  ): { sequence: SecondaryOpType[]; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];
    let seq = [...sequence];

    // Constraint: grind MUST come after harden
    const grindIdx  = seq.indexOf("grind");
    const hardenIdx = seq.indexOf("harden");
    if (grindIdx >= 0 && hardenIdx >= 0 && grindIdx < hardenIdx) {
      // Move grind after temper (or harden if no temper)
      seq.splice(grindIdx, 1);
      const newRef = seq.indexOf("temper") >= 0 ? seq.indexOf("temper") : seq.indexOf("harden");
      seq.splice(newRef + 1, 0, "grind");
      violations.push("CONSTRAINT ENFORCED: moved 'grind' after 'harden' — cannot grind before hardening");
    }

    // Constraint: EDM MUST come after stress relief
    const edmIdx     = seq.indexOf("edm");
    const srIdx      = seq.indexOf("stress_relief");
    if (edmIdx >= 0 && srIdx >= 0 && edmIdx < srIdx) {
      seq.splice(edmIdx, 1);
      seq.splice(srIdx + 1, 0, "edm");
      violations.push("CONSTRAINT ENFORCED: moved 'edm' after 'stress_relief' — EDM introduces residual stress");
    }

    // Constraint: case_harden MUST come before grind
    const caseHardenIdx = seq.indexOf("case_harden");
    const grindIdx2     = seq.indexOf("grind");
    if (caseHardenIdx >= 0 && grindIdx2 >= 0 && caseHardenIdx > grindIdx2) {
      seq.splice(caseHardenIdx, 1);
      seq.splice(grindIdx2, 0, "case_harden");
      violations.push("CONSTRAINT ENFORCED: moved 'case_harden' before 'grind' — grinding removes case layer");
    }

    // Constraint: final_inspect always last
    const inspectIdx = seq.indexOf("final_inspect");
    if (inspectIdx >= 0 && inspectIdx !== seq.length - 1) {
      seq.splice(inspectIdx, 1);
      seq.push("final_inspect");
      violations.push("CONSTRAINT ENFORCED: moved 'final_inspect' to last position");
    }

    return { sequence: seq, violations, warnings };
  }

  private _htTypeToOpType(htType: string): SecondaryOpType | null {
    const map: Record<string, SecondaryOpType> = {
      anneal:                  "anneal",
      stress_relief:           "stress_relief",
      through_harden:          "harden",
      case_harden_carburize:   "case_harden",
      case_harden_nitride:     "case_harden",
      normalize:               "normalize",
      age_harden:              "harden",
    };
    return map[htType] ?? null;
  }

  private _timingToIndex(timing: string, sequence: SecondaryOpType[]): number {
    const timingMap: Record<string, SecondaryOpType> = {
      before_rough:  "rough_machine",
      after_rough:   "rough_machine",
      before_finish: "semi_finish_machine",
      after_finish:  "semi_finish_machine",
      before_grind:  "grind",
      after_grind:   "grind",
    };
    const anchor = timingMap[timing];
    if (!anchor) return Math.max(0, sequence.length - 2); // before inspect

    const anchorIdx = sequence.indexOf(anchor);
    if (anchorIdx < 0) return Math.max(0, sequence.length - 2);

    return timing.startsWith("after") ? anchorIdx + 1 : anchorIdx;
  }

  private _describeOp(type: SecondaryOpType, input: SecondaryOpsInput): string {
    const descriptions: Record<SecondaryOpType, string> = {
      rough_machine:        `Rough machine ${input.partName} — remove bulk stock`,
      stress_relief:        `Stress relief — furnace cycle to relieve roughing stresses`,
      semi_finish_machine:  `Semi-finish machine — reduce stock to 0.3-0.5mm for final ops`,
      anneal:               `Full anneal ${input.material} — soften for machinability`,
      normalize:            `Normalize — uniform microstructure, relieve forging stresses`,
      harden:               `Through harden ${input.material} — austenitize + quench`,
      temper:               `Temper — stress relief after quench, set final hardness`,
      case_harden:          `Case harden — carburize/nitride to specified case depth`,
      grind:                `${(input.grindingType ?? "surface").replace("_", " ")} grinding — final dimensional finishing`,
      edm:                  `${(input.edmType ?? "sinker").toUpperCase()} EDM — features requiring EDM precision`,
      superfinish:          `Superfinish (Ra < 0.1µm) — lapping/honing for bearing surfaces`,
      final_inspect:        `Final dimensional inspection + hardness verification`,
      material_cert_verify: `Verify material certification before machining (AS9102B)`,
      dimension_check:      `Intermediate dimensional check — verify in-process tolerances`,
    };
    return descriptions[type] ?? type;
  }
}

export const hyperMillSecondaryOpsSequencer = new HyperMillSecondaryOpsSequencer();
