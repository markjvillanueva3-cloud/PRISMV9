/**
 * ThreadTurningEngine — Single-Point Thread Turning Calculations
 *
 * Calculates parameters for thread turning on a lathe:
 * - Infeed method (radial, flank, modified flank, alternating)
 * - Number of passes and depth-of-cut schedule
 * - Cutting speed adjusted for thread pitch
 * - Thread profile geometry (60° metric, 55° BSP/UN)
 * - Spring passes for finish
 *
 * Key physics: Thread turning uses progressively decreasing
 * depth of cut per pass (constant area method) to maintain
 * consistent chip load and avoid insert overload.
 *
 * Reference: Sandvik threading guide (C-2920:52),
 *            ISO 261 (metric threads),
 *            Machinery's Handbook Ch.20 "Threading"
 *
 * Actions: thread_turn_calc, thread_infeed, thread_profile
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type InfeedMethod =
  | "radial" | "flank" | "modified_flank" | "alternating";

export type ThreadForm =
  | "metric_60" | "un_60" | "bsp_55" | "acme_29" | "trapezoidal_30";

export interface ThreadTurnInput {
  pitch_mm: number;
  major_diameter_mm: number;
  thread_form?: ThreadForm;
  is_external?: boolean;
  infeed_method?: InfeedMethod;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  insert_nose_radius_mm?: number;
  num_spring_passes?: number;
}

export interface ThreadTurnResult {
  thread_depth: AtomicValue;
  number_of_passes: AtomicValue;
  pass_schedule: Array<{
    pass: number;
    depth_mm: number;
    cumulative_mm: number;
  }>;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  infeed_method: InfeedMethod;
  infeed_angle: AtomicValue;
  spring_passes: AtomicValue;
  thread_height: AtomicValue;
  minor_diameter: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Thread profile: [included_angle_deg, height_factor (H/P)] */
const THREAD_PROFILES: Record<ThreadForm, [number, number]> = {
  metric_60: [60, 0.6134],
  un_60: [60, 0.6134],
  bsp_55: [55, 0.6403],
  acme_29: [29, 0.5000],
  trapezoidal_30: [30, 0.5000],
};

/** Infeed angle by method (degrees) */
const INFEED_ANGLES: Record<InfeedMethod, number> = {
  radial: 0,
  flank: 30,           // along thread flank
  modified_flank: 29.5, // slight offset for chip control
  alternating: 0,       // alternates left-right
};

/** Threading speed (m/min) by ISO group */
const THREAD_SPEEDS: Record<string, number> = {
  P: 120, M: 80, K: 150, N: 250, S: 40, H: 50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ThreadTurningEngine {
  /**
   * Calculate thread turning parameters and pass schedule.
   */
  calculate(input: ThreadTurnInput): ThreadTurnResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const pitch = input.pitch_mm;
    const majorDia = input.major_diameter_mm;
    const form = input.thread_form ?? "metric_60";
    const isExternal = input.is_external ?? true;
    const noseR = input.insert_nose_radius_mm ?? 0.3;
    const springPasses = input.num_spring_passes ?? 2;

    const [includedAngle, hFactor] = THREAD_PROFILES[form];

    // Thread height = full radial depth-of-thread for a single-point thread.
    // For 60° external (ISO 68-1) this is h3 = 17·H/24 = 0.61343·P, where
    // H = 0.86603·P is the fundamental-triangle height; hFactor already encodes
    // h3/P (metric/UN = 0.6134). This value IS the radial infeed — it must NOT
    // be re-truncated (the removed ×0.625 was a spurious re-application of the
    // H→H1 5/8 internal-engagement ratio and cut every 60° thread 0.625× too
    // shallow → oversize minor Ø, GO ring-gauge reject; see Recent regressions).
    // Ref: Machinery's Handbook Ch.20 "Threading"; ISO 68-1.
    const threadHeight = pitch * hFactor;

    // Minor diameter (diametral = 2× the radial infeed depth).
    // External: infeed inward  → minor = D_major − 2·h3
    // Internal: infeed outward → D_major + 2·h3
    // Coherent with SinglePointThreadEngine (DEPTH_FACTOR 0.6134, OD X = D−2·d)
    // and ThreadCalculationEngine (H = 0.6134·P, minor = D_major − 2H).
    const minorDia = isExternal
      ? majorDia - 2 * threadHeight
      : majorDia + 2 * threadHeight;

    // Infeed method
    const infeed = input.infeed_method ?? (
      pitch > 3 ? "modified_flank"
        : pitch > 1.5 ? "flank"
          : "radial"
    );
    const infeedAngle = INFEED_ANGLES[infeed];

    // Pass schedule (constant area method)
    // Total area ∝ depth². For n passes with constant area:
    // d_i = total_depth × sqrt(i/n) - sqrt((i-1)/n)
    // Full radial infeed for a single-point thread = the thread height h3.
    const totalDepth = threadHeight;
    const numPasses = calculatePasses(totalDepth, pitch);
    const schedule: Array<{
      pass: number;
      depth_mm: number;
      cumulative_mm: number;
    }> = [];

    let cumulative = 0;
    for (let i = 1; i <= numPasses; i++) {
      const targetCum = totalDepth * Math.sqrt(i / numPasses);
      const passDepth = targetCum - cumulative;
      cumulative = targetCum;
      schedule.push({
        pass: i,
        depth_mm: r3(passDepth),
        cumulative_mm: r3(cumulative),
      });
    }

    // Cutting speed (reduce for coarse pitch)
    const baseVc = THREAD_SPEEDS[iso] ?? 120;
    const pitchFactor = pitch > 3 ? 0.7
      : pitch > 2 ? 0.8
        : pitch > 1.5 ? 0.9
          : 1.0;
    const vc = baseVc * pitchFactor;
    const rpm = (vc * 1000) / (Math.PI * majorDia);

    // Warnings
    if (pitch > 6) {
      warnings.push(
        "Very coarse pitch — consider modified flank infeed"
      );
    }
    if (noseR > pitch * 0.3) {
      warnings.push(
        "Insert nose radius > 30% of pitch — " +
        "may interfere with thread form"
      );
    }
    if (majorDia < 6 && pitch > 1) {
      warnings.push(
        "Small diameter with coarse pitch — " +
        "high relative thread depth"
      );
    }
    if (infeed === "radial" && pitch > 2) {
      warnings.push(
        "Radial infeed not recommended for pitch > 2mm — " +
        "use flank or modified flank"
      );
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["threading", "turning"],
      operation_type: "turning",
      material_iso: iso,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      thread_depth: av(r3(totalDepth), "mm", 0.05,
        `P × ${hFactor} (radial depth-of-thread h3, ISO 68-1)`),
      number_of_passes: av(numPasses, "passes", 0,
        "Constant area method"),
      pass_schedule: schedule,
      cutting_speed: av(r1(vc), "m/min", 0.1,
        "Base Vc × pitch factor"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_major)"),
      infeed_method: infeed,
      infeed_angle: av(infeedAngle, "deg", 0,
        `${infeed} method`),
      spring_passes: av(springPasses, "passes", 0,
        "Zero-depth finish passes"),
      thread_height: av(r3(threadHeight), "mm", 0.02,
        `P × ${hFactor} (${form})`),
      minor_diameter: av(r2(minorDia), "mm", 0.05,
        isExternal
          ? "D_major - 2H"
          : "D_major + 2H"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Calculate number of threading passes based on depth and pitch.
 * Rougher threads need more passes.
 */
function calculatePasses(
  totalDepth: number, pitch: number
): number {
  // Approximate: sqrt(total_area) drives pass count
  // First pass ≈ 0.15mm, decreasing
  if (totalDepth < 0.3) return 3;
  if (totalDepth < 0.5) return 4;
  if (totalDepth < 0.8) return 6;
  if (totalDepth < 1.2) return 8;
  if (totalDepth < 2.0) return 10;
  return Math.ceil(totalDepth * 6);
}

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const threadTurningEngine = new ThreadTurningEngine();

// ============================================================================
// G76 DIALECT SUPPORT (ENGINE-WIRE-MS0/U-WIRE04)
// ============================================================================
//
// Controller-specific G76 threading cycle dialects. Used by
// LatheAIReasoningEngine.selectG76Dialect to route the same threading
// intent to the correct G-code shape per controller family.
//
// Source: Fanuc 0i/30i Operator's Manual; Okuma OSP-P200/P300L Operator's
// Reference; Mitsubishi M70V Programming; Siemens 840D sl Programming;
// Mazak Mazatrol M-Plus Programming Reference.

/** Identifier for a G76 dialect family. */
export interface G76Dialect {
  dialect: "fanuc_double" | "okuma" | "mitsubishi" | "siemens" | "mazak";
  controller_names: string[];
  line_format: string;
  notes: string[];
}

/** Known G76 dialects, indexed for controller fingerprinting. */
export const G76_DIALECTS: G76Dialect[] = [
  {
    dialect: "fanuc_double",
    controller_names: ["fanuc", "haas", "doosan-fanuc", "hwacheon"],
    line_format: "G76 P{repeat}{chamfer}{angle} Q{min_depth} R{finish}; G76 X{end_x} Z{end_z} P{depth} Q{first_cut} F{pitch}",
    notes: ["Two-line G76 P/Q/R header plus X/Z/P/Q/F move. Most common dialect."],
  },
  {
    dialect: "okuma",
    controller_names: ["okuma", "osp-p", "osp"],
    line_format: "G76 X{end_x} Z{end_z} I0 K{depth} D{first_cut_um} F{pitch} A{angle}",
    notes: ["Single-line G76 with K=full depth, D=first-cut depth in microns, A=infeed angle."],
  },
  {
    dialect: "mitsubishi",
    controller_names: ["mitsubishi", "m70", "m700", "m80"],
    line_format: "G76 P{repeat}{chamfer}{angle} Q{min_depth} R{finish}; G76 X{end_x} Z{end_z} P{depth} Q{first_cut} F{pitch}",
    notes: ["Mitsubishi follows Fanuc two-line shape with minor parameter codings."],
  },
  {
    dialect: "siemens",
    controller_names: ["siemens", "sinumerik", "840d"],
    line_format: "CYCLE99(SPL, FPL, DM1, DM2, APP, ROP, TDEP, FAL, IANG, NSP, NRC, NID, PIT, VARI, NUMTH, SDAC, MID, GAMW)",
    notes: ["Siemens uses CYCLE99 wrapper instead of G76; parameter list is positional."],
  },
  {
    dialect: "mazak",
    controller_names: ["mazak", "mazatrol", "smooth"],
    line_format: "G76 P{repeat}{chamfer}{angle} Q{min_depth} R{finish}; G76 X{end_x} Z{end_z} P{depth} Q{first_cut} F{pitch}",
    notes: ["Mazak EIA mode mirrors Fanuc; Mazatrol conversational mode skips raw G-code."],
  },
];

/**
 * Resolve a controller string to its G76 dialect. Substring match is
 * case-insensitive; falls back to undefined if no dialect matches so callers
 * can apply their own default (typically fanuc_double).
 */
export function getG76Dialect(controller: string | null | undefined): G76Dialect | undefined {
  if (!controller || typeof controller !== "string") return undefined;
  const c = controller.toLowerCase();
  for (const d of G76_DIALECTS) {
    if (d.controller_names.some(name => c.includes(name))) return d;
  }
  return undefined;
}

/** Parameters needed to render a G76 cycle. */
export interface G76Params {
  end_x_mm: number;
  end_z_mm: number;
  thread_depth_mm: number;
  first_cut_mm: number;
  pitch_mm: number;
  spring_passes?: number;
  infeed_angle?: number;
  chamfer_pitches?: number;
  min_depth_mm?: number;
  finish_allowance_mm?: number;
}

/**
 * Render a G76 threading block for the requested dialect. Returns a
 * single multi-line string ready to drop into a controller program.
 *
 * Numeric formatting follows each controller's documented conventions
 * (microns for Okuma D-code, hundredths-of-mm for Fanuc P/Q-fields).
 */
export function generateG76Code(
  dialect: G76Dialect["dialect"] | string,
  params: G76Params,
): string {
  const repeat = String(params.spring_passes ?? 1).padStart(2, "0");
  const chamfer = String(Math.round((params.chamfer_pitches ?? 1) * 10)).padStart(2, "0");
  const angle = String(Math.round(params.infeed_angle ?? 60)).padStart(2, "0");
  const minDepthUm = Math.round((params.min_depth_mm ?? 0.05) * 1000);
  const depthUm = Math.round(params.thread_depth_mm * 1000);
  const firstCutUm = Math.round(params.first_cut_mm * 1000);
  const x = params.end_x_mm.toFixed(3);
  const z = params.end_z_mm.toFixed(3);
  const f = params.pitch_mm.toFixed(4);
  const finish = (params.finish_allowance_mm ?? 0.02).toFixed(3);

  switch (dialect) {
    case "okuma":
      return [
        "( G76 OKUMA SINGLE-LINE )",
        `G76 X${x} Z${z} I0 K${depthUm} D${firstCutUm} F${f} A${params.infeed_angle ?? 60}`,
      ].join("\n");
    case "siemens":
      return [
        "; CYCLE99 (Siemens 840D)",
        `CYCLE99(0, 0, ${x}, ${z}, 0, ${finish}, ${params.thread_depth_mm.toFixed(3)}, ${finish}, ${params.infeed_angle ?? 60}, 0, ${params.spring_passes ?? 1}, 0, ${f}, 1, 1, 0, 0, 0)`,
      ].join("\n");
    case "fanuc_double":
    case "mitsubishi":
    case "mazak":
    default:
      return [
        "( G76 TWO-LINE )",
        `G76 P${repeat}${chamfer}${angle} Q${minDepthUm} R${finish}`,
        `G76 X${x} Z${z} P${depthUm} Q${firstCutUm} F${f}`,
      ].join("\n");
  }
}
