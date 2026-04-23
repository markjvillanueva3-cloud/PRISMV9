/**
 * LathePartoffSafetyRailEngine — LATHE-PROD-READY-MS0/U-LPR-PARTOFF-RAIL
 *
 * Safety rail for the highest-risk lathe operation: parting-off.
 *
 * Parting is where lathes kill workpieces. Narrow tool, deep radial cut,
 * chip that wants to weld to the blade, workpiece that wants to fly when
 * the cut completes. Individual physics calcs exist in turning / workholding
 * dispatchers, but nothing ties them into a single go/no-go gate for the
 * operator's sanity check.
 *
 * This engine runs a deterministic sequence of gates against the op spec
 * and returns a single PartoffSafetyVerdict: passed (boolean, false if ANY
 * hard_block violated) + gates[] + violations[] + advisories[] + summary.
 *
 * Each gate has a severity:
 *   - hard_block: failure = operation blocked (crash / scrap risk)
 *   - warn:       failure = operator must acknowledge (quality risk)
 *   - info:       failure = advisory only (process optimization)
 *
 * Thresholds grounded in Sandvik parting guide + Machinery's Handbook
 * 31st ed. §Turning§Parting/Grooving + Kennametal Turning Catalog 2024.
 *
 * This engine is PURE — inputs in, verdict out, no I/O. All thresholds
 * are declared constants so a future CAM-override layer can re-parameterize
 * the rail per-shop without forking this code.
 */

// ============================================================================
// CONSTANTS (thresholds / rules of thumb)
// ============================================================================

/** L/D ratio above which a parting tool is considered overhang-limited. */
const L_TO_D_RATIO_HARD_BLOCK = 4.0;
const L_TO_D_RATIO_WARN = 3.0;

/** Max SFM for parting on carbon steel with uncoated carbide (Sandvik). */
const PARTING_SFM_WARN = 800;
/** SFM above which parting is reckless regardless of material. */
const PARTING_SFM_HARD_BLOCK = 1200;

/** Minimum chip-clearance multiplier: clearance ≥ MULT × parting_width. */
const CHIP_CLEARANCE_MULT_HARD_BLOCK = 1.5;
const CHIP_CLEARANCE_MULT_WARN = 2.5;

/** Max feed on carbon steel for 3mm parting blade (Sandvik CoroCut table). */
const FEED_MM_PER_REV_WARN = 0.12;
const FEED_MM_PER_REV_HARD_BLOCK = 0.25;

/** UTS threshold (MPa) above which a chip breaker is mandatory. */
const UTS_CHIP_BREAKER_REQUIRED_MPA = 600;

// ============================================================================
// TYPES
// ============================================================================

export type WorkholdingType = "chuck" | "collet" | "bar_puller" | "sub_spindle";
export type ChipBreaker = "none" | "groove" | "coated" | "high_positive";
export type GateSeverity = "hard_block" | "warn" | "info";

export interface PartoffOpSpec {
  /** Part outer diameter at the parting line (mm). */
  part_diameter_mm: number;
  /** Parting blade / insert width (mm). */
  parting_width_mm: number;
  /** Tool overhang from toolholder face (mm). */
  tool_overhang_mm: number;
  spindle_rpm: number;
  feed_mm_per_rev: number;
  /** Ultimate tensile strength of workpiece material (MPa). */
  material_uts_mpa: number;
  workholding_type: WorkholdingType;
  /** Clearance between tool/holder and the next feature on the part (mm). */
  chip_clearance_mm: number;
  /** If a sub-spindle catches the cut part, purge plan present? */
  has_subspindle_purge: boolean;
  chip_breaker: ChipBreaker;
}

export interface SafetyGate {
  name: string;
  severity: GateSeverity;
  passed: boolean;
  /** Measured value (context-dependent). */
  value?: number;
  /** Threshold the value was compared against. */
  threshold?: number;
  /** Human-readable explanation (populated on fail). */
  note?: string;
}

export interface PartoffSafetyVerdict {
  /** Overall go / no-go. False if any hard_block gate failed. */
  passed: boolean;
  /** All gates evaluated, in order. */
  gates: SafetyGate[];
  /** Failed gates of any severity. */
  violations: SafetyGate[];
  /** Failed gates at severity 'info' or 'warn' only. */
  advisories: SafetyGate[];
  /** One-line human summary. */
  summary: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class LathePartoffSafetyRailEngine {
  /** Evaluate the parting operation against the safety gate sequence. */
  evaluate(op: PartoffOpSpec): PartoffSafetyVerdict {
    this._validate(op);

    const gates: SafetyGate[] = [
      this._gateToolOverhang(op),
      this._gateSFM(op),
      this._gateFeed(op),
      this._gateChipClearance(op),
      this._gateChipBreaker(op),
      this._gateWorkholding(op),
      this._gateSubspindlePurge(op),
    ];

    const violations = gates.filter((g) => !g.passed);
    const hardBlocked = violations.some((g) => g.severity === "hard_block");
    const advisories = violations.filter((g) => g.severity !== "hard_block");

    return {
      passed: !hardBlocked,
      gates,
      violations,
      advisories,
      summary: this._summarize(hardBlocked, violations),
    };
  }

  // ── input validation ───────────────────────────────────────────────────

  private _validate(op: PartoffOpSpec): void {
    const numericFields: Array<[string, number]> = [
      ["part_diameter_mm", op.part_diameter_mm],
      ["parting_width_mm", op.parting_width_mm],
      ["tool_overhang_mm", op.tool_overhang_mm],
      ["spindle_rpm", op.spindle_rpm],
      ["feed_mm_per_rev", op.feed_mm_per_rev],
      ["material_uts_mpa", op.material_uts_mpa],
      ["chip_clearance_mm", op.chip_clearance_mm],
    ];
    for (const [name, v] of numericFields) {
      if (!Number.isFinite(v) || v <= 0) {
        throw new Error(`${name} must be a positive finite number; got ${v}`);
      }
    }
  }

  // ── individual gates ───────────────────────────────────────────────────

  private _gateToolOverhang(op: PartoffOpSpec): SafetyGate {
    const ratio = op.tool_overhang_mm / op.parting_width_mm;
    if (ratio > L_TO_D_RATIO_HARD_BLOCK) {
      return {
        name: "tool_overhang_ratio",
        severity: "hard_block",
        passed: false,
        value: round(ratio, 2),
        threshold: L_TO_D_RATIO_HARD_BLOCK,
        note: `Tool overhang/width = ${round(ratio, 2)} > ${L_TO_D_RATIO_HARD_BLOCK} — parting blade will deflect into the cut and snap.`,
      };
    }
    if (ratio > L_TO_D_RATIO_WARN) {
      return {
        name: "tool_overhang_ratio",
        severity: "warn",
        passed: false,
        value: round(ratio, 2),
        threshold: L_TO_D_RATIO_WARN,
        note: `Tool overhang/width = ${round(ratio, 2)} > ${L_TO_D_RATIO_WARN} — reduce overhang or expect chatter.`,
      };
    }
    return {
      name: "tool_overhang_ratio",
      severity: "hard_block",
      passed: true,
      value: round(ratio, 2),
      threshold: L_TO_D_RATIO_WARN,
    };
  }

  private _gateSFM(op: PartoffOpSpec): SafetyGate {
    // SFM = π × D(mm) × rpm / 304.8  (304.8 mm/ft)
    const sfm = (Math.PI * op.part_diameter_mm * op.spindle_rpm) / 304.8;
    if (sfm > PARTING_SFM_HARD_BLOCK) {
      return {
        name: "surface_speed_sfm",
        severity: "hard_block",
        passed: false,
        value: round(sfm, 0),
        threshold: PARTING_SFM_HARD_BLOCK,
        note: `Surface speed ${round(sfm, 0)} SFM > ${PARTING_SFM_HARD_BLOCK} — tool failure imminent at parting geometry.`,
      };
    }
    if (sfm > PARTING_SFM_WARN) {
      return {
        name: "surface_speed_sfm",
        severity: "warn",
        passed: false,
        value: round(sfm, 0),
        threshold: PARTING_SFM_WARN,
        note: `Surface speed ${round(sfm, 0)} SFM > ${PARTING_SFM_WARN} — expected tool life compressed; verify against Sandvik table.`,
      };
    }
    return {
      name: "surface_speed_sfm",
      severity: "warn",
      passed: true,
      value: round(sfm, 0),
      threshold: PARTING_SFM_WARN,
    };
  }

  private _gateFeed(op: PartoffOpSpec): SafetyGate {
    if (op.feed_mm_per_rev > FEED_MM_PER_REV_HARD_BLOCK) {
      return {
        name: "feed_per_rev",
        severity: "hard_block",
        passed: false,
        value: op.feed_mm_per_rev,
        threshold: FEED_MM_PER_REV_HARD_BLOCK,
        note: `Feed ${op.feed_mm_per_rev} mm/rev > ${FEED_MM_PER_REV_HARD_BLOCK} — blade overload certain.`,
      };
    }
    if (op.feed_mm_per_rev > FEED_MM_PER_REV_WARN) {
      return {
        name: "feed_per_rev",
        severity: "warn",
        passed: false,
        value: op.feed_mm_per_rev,
        threshold: FEED_MM_PER_REV_WARN,
        note: `Feed ${op.feed_mm_per_rev} mm/rev > ${FEED_MM_PER_REV_WARN} — high chip load for parting; verify chip breaker geometry.`,
      };
    }
    return {
      name: "feed_per_rev",
      severity: "warn",
      passed: true,
      value: op.feed_mm_per_rev,
      threshold: FEED_MM_PER_REV_WARN,
    };
  }

  private _gateChipClearance(op: PartoffOpSpec): SafetyGate {
    const mult = op.chip_clearance_mm / op.parting_width_mm;
    if (mult < CHIP_CLEARANCE_MULT_HARD_BLOCK) {
      return {
        name: "chip_clearance",
        severity: "hard_block",
        passed: false,
        value: round(mult, 2),
        threshold: CHIP_CLEARANCE_MULT_HARD_BLOCK,
        note: `Clearance/width = ${round(mult, 2)} < ${CHIP_CLEARANCE_MULT_HARD_BLOCK} — chip will jam between blade and fixture, inducing weld-up.`,
      };
    }
    if (mult < CHIP_CLEARANCE_MULT_WARN) {
      return {
        name: "chip_clearance",
        severity: "warn",
        passed: false,
        value: round(mult, 2),
        threshold: CHIP_CLEARANCE_MULT_WARN,
        note: `Clearance/width = ${round(mult, 2)} < ${CHIP_CLEARANCE_MULT_WARN} — use air blast or TSC to evacuate chips.`,
      };
    }
    return {
      name: "chip_clearance",
      severity: "warn",
      passed: true,
      value: round(mult, 2),
      threshold: CHIP_CLEARANCE_MULT_WARN,
    };
  }

  private _gateChipBreaker(op: PartoffOpSpec): SafetyGate {
    if (
      op.material_uts_mpa >= UTS_CHIP_BREAKER_REQUIRED_MPA &&
      op.chip_breaker === "none"
    ) {
      return {
        name: "chip_breaker",
        severity: "warn",
        passed: false,
        value: op.material_uts_mpa,
        threshold: UTS_CHIP_BREAKER_REQUIRED_MPA,
        note: `UTS ${op.material_uts_mpa} MPa ≥ ${UTS_CHIP_BREAKER_REQUIRED_MPA} but no chip breaker selected — stringy chips will wrap the part.`,
      };
    }
    return {
      name: "chip_breaker",
      severity: "warn",
      passed: true,
      value: op.material_uts_mpa,
      threshold: UTS_CHIP_BREAKER_REQUIRED_MPA,
    };
  }

  private _gateWorkholding(op: PartoffOpSpec): SafetyGate {
    // Bar puller on a large diameter part → warn (part may fly)
    if (op.workholding_type === "bar_puller" && op.part_diameter_mm > 50) {
      return {
        name: "workholding_adequacy",
        severity: "warn",
        passed: false,
        value: op.part_diameter_mm,
        threshold: 50,
        note: `Bar puller on ${op.part_diameter_mm} mm diameter — part mass at cutoff may exceed puller retention; use sub-spindle or chute.`,
      };
    }
    return {
      name: "workholding_adequacy",
      severity: "warn",
      passed: true,
    };
  }

  private _gateSubspindlePurge(op: PartoffOpSpec): SafetyGate {
    if (op.workholding_type === "sub_spindle" && !op.has_subspindle_purge) {
      return {
        name: "subspindle_purge",
        severity: "info",
        passed: false,
        note: "Sub-spindle workholding without purge plan — cut part may tumble at high speed; add air blow cycle.",
      };
    }
    return {
      name: "subspindle_purge",
      severity: "info",
      passed: true,
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private _summarize(hardBlocked: boolean, violations: SafetyGate[]): string {
    if (violations.length === 0) return "All parting-off safety gates passed.";
    if (hardBlocked) {
      const blocks = violations.filter((v) => v.severity === "hard_block").map((v) => v.name);
      return `BLOCKED by ${blocks.length} hard gate(s): ${blocks.join(", ")}.`;
    }
    return `Passed with ${violations.length} advisory violation(s).`;
  }
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const lathePartoffSafetyRailEngine = new LathePartoffSafetyRailEngine();
