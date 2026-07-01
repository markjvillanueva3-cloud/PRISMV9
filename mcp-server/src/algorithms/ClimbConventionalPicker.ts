/**
 * ClimbConventionalPicker — Mill Wizard algorithm #3.6
 *
 * Decides climb vs conventional milling direction given material, machine
 * rigidity/backlash class, surface-finish target, and depth-of-cut regime.
 * Climb is the HSM default for rigid machines (lower forces, better finish,
 * cooler edge); conventional is mandatory on machines with measurable
 * backlash (ball-screw wear, old machines) because climb-milling backlash
 * pulls the part into the cutter → broken tool.
 *
 * Decision matrix (cited from machining textbooks + vendor docs):
 *   Backlash > 0.05mm OR machine_class = "manual/legacy" → conventional
 *   Roughing in cast iron / abrasive material → conventional (better tool life)
 *   Hardened steel + rigid machine + finish pass → climb (mandatory for finish)
 *   Aluminum / non-ferrous + rigid machine → climb (default HSM)
 *   Stainless / Inconel + rigid machine → climb (lower work-hardening)
 *
 * Citations: Smith & Tlusty Vol. II §HSM-direction · Sandvik Coromant §milling-direction
 *
 * @module ClimbConventionalPicker
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

export type IsoGroupLabel = "P" | "M" | "K" | "N" | "S" | "H";
export type MachineClass = "modern_hmc_rigid" | "legacy_3axis" | "manual_legacy" | "lathe_live_tool";
export type OperationKind = "roughing" | "semi_finish" | "finish";
export type ClimbDecision = "climb" | "conventional";

export interface ClimbConventionalInput {
  iso_group: IsoGroupLabel;
  machine_class: MachineClass;
  /** Backlash in mm at the cutter axis — measured or spec sheet. */
  backlash_mm: number;
  operation: OperationKind;
  /** Surface finish target Ra in µm; affects climb-preference for finish ops. */
  ra_target_um?: number;
}

export interface ClimbConventionalResult {
  decision: ClimbDecision;
  confidence: AtomicValue;
  reasons: string[];
  override_required: boolean;
  notes: string[];
  source: string;
}

const BACKLASH_HARD_LIMIT_MM = 0.05;       // above this = conventional mandatory
const BACKLASH_SOFT_WARN_MM = 0.02;        // between soft+hard = climb permitted with warning
const ISO_VALID = new Set(["P","M","K","N","S","H"]);
const MACHINE_VALID = new Set(["modern_hmc_rigid","legacy_3axis","manual_legacy","lathe_live_tool"]);
const OP_VALID = new Set(["roughing","semi_finish","finish"]);

function emit(reason: string): ClimbConventionalResult {
  return {
    decision: "conventional",
    confidence: { value: 0, unit: "probability", uncertainty: 0, source: "invalid-input", confidence: 0 },
    reasons: [reason],
    override_required: false,
    notes: [reason],
    source: "ClimbConventionalPicker v1.0.0",
  };
}

export function pickDirection(input: ClimbConventionalInput): ClimbConventionalResult {
  if (!input) return emit("missing input");
  if (!ISO_VALID.has(input.iso_group)) return emit(`unknown iso_group: ${input.iso_group}`);
  if (!MACHINE_VALID.has(input.machine_class)) return emit(`unknown machine_class: ${input.machine_class}`);
  if (!OP_VALID.has(input.operation)) return emit(`unknown operation: ${input.operation}`);
  if (!Number.isFinite(input.backlash_mm)) return emit("backlash_mm not finite");
  if (input.backlash_mm < 0) return emit("backlash_mm cannot be negative");

  const reasons: string[] = [];
  const notes: string[] = [];

  // Rule 1: backlash hard limit → conventional MANDATORY (safety).
  if (input.backlash_mm > BACKLASH_HARD_LIMIT_MM || input.machine_class === "manual_legacy") {
    reasons.push(`backlash ${input.backlash_mm} mm > ${BACKLASH_HARD_LIMIT_MM} mm or manual_legacy machine → climb would pull part into cutter`);
    return {
      decision: "conventional",
      confidence: { value: 0.99, unit: "probability", uncertainty: 0.01, source: "backlash-safety-rule", confidence: 1 },
      reasons, override_required: false,
      notes: ["conventional is safety-mandatory; no operator override permitted"],
      source: "ClimbConventionalPicker v1.0.0",
    };
  }

  // Rule 2: roughing in cast iron / abrasive material → conventional (life)
  if (input.operation === "roughing" && input.iso_group === "K") {
    reasons.push("K-group roughing: conventional gives 20-30% better tool life vs climb (abrasive chip)");
    return {
      decision: "conventional",
      confidence: { value: 0.85, unit: "probability", uncertainty: 0.10, source: "K-group-roughing rule", confidence: 0.85 },
      reasons, override_required: false,
      notes: ["climb permissible for K-group FINISH; this is the roughing-specific rule"],
      source: "ClimbConventionalPicker v1.0.0",
    };
  }

  // Rule 3: finish pass with tight Ra and rigid machine → climb mandatory
  if (input.operation === "finish" && input.machine_class === "modern_hmc_rigid"
      && Number.isFinite(input.ra_target_um) && (input.ra_target_um as number) < 1.6) {
    reasons.push(`finish op + rigid machine + Ra<1.6µm target → climb mandatory for Ra spec`);
    if (input.backlash_mm > BACKLASH_SOFT_WARN_MM) {
      notes.push(`backlash ${input.backlash_mm} mm above soft-warn ${BACKLASH_SOFT_WARN_MM} — verify reverse-clearance before climb-finish`);
    }
    return {
      decision: "climb",
      confidence: { value: 0.95, unit: "probability", uncertainty: 0.05, source: "finish-Ra rule", confidence: 0.95 },
      reasons, override_required: false,
      notes,
      source: "ClimbConventionalPicker v1.0.0",
    };
  }

  // Default rule: climb on rigid modern machine, conventional otherwise.
  let decision: ClimbDecision;
  let conf: number;
  if (input.machine_class === "modern_hmc_rigid" || input.machine_class === "lathe_live_tool") {
    decision = "climb";
    conf = 0.85;
    reasons.push(`rigid machine (${input.machine_class}) + acceptable backlash → climb is HSM default (lower forces, better finish)`);
    if (input.iso_group === "S" || input.iso_group === "M") {
      reasons.push(`${input.iso_group}-group: climb reduces work-hardening at the cutting edge`);
      conf = 0.92;
    }
  } else {
    // legacy_3axis: conditional on backlash
    if (input.backlash_mm > BACKLASH_SOFT_WARN_MM) {
      decision = "conventional";
      conf = 0.80;
      reasons.push(`legacy_3axis + backlash ${input.backlash_mm} mm > ${BACKLASH_SOFT_WARN_MM} soft-warn → conventional safer`);
    } else {
      decision = "climb";
      conf = 0.65;
      reasons.push("legacy_3axis with low-backlash: climb permissible but verify reverse-clearance");
      notes.push("operator override permitted if conventional is preferred for tool-life reasons");
    }
  }

  return {
    decision,
    confidence: { value: conf, unit: "probability", uncertainty: (1 - conf) / 2, source: "default rule", confidence: conf },
    reasons, override_required: false, notes,
    source: "ClimbConventionalPicker v1.0.0",
  };
}

export const ClimbConventionalPicker = {
  version: "1.0.0" as const,
  pickDirection,
};
