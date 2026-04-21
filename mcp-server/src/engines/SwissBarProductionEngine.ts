/**
 * SwissBarProductionEngine
 * ========================
 *
 * Swiss-type bar-stock production management (U-LPS24, MS6b). Complements
 * `BarStockCutPlanEngine` (1-D bin-packing for multiple parts per bar) with
 * Swiss-specific single-part-family logic: parts-per-bar with grip and
 * cutoff allowances, controller-specific bar-end detection M-codes,
 * magazine planning, and total run-time estimation for lights-out runs.
 *
 * Formulas:
 *   stride_mm   = part_length + cutoff_width + facing_stock
 *   N_parts     = floor((bar_length - grip_length - remnant_min) / stride_mm)
 *   remnant_mm  = bar_length - grip_length - N_parts · stride_mm
 *   # if remnant >= stride, one more part is possible without exceeding remnant_min
 *
 *   N_bars      = ceil(batch_qty / N_parts)
 *   run_time_s  = N_bars · (N_parts · cycle_time_s + bar_change_time_s)
 *
 * Controller M-code map (bar feed / bar pull / bar-end signal):
 *   Citizen Cincom : M82 bar-feed-to-stop, M83 bar-pull, M67 bar-feed-check, M30 program end
 *   Star SR        : M220 bar-feed, M221 bar-pull, M230 bar-end signal
 *   Tsugami B      : M82 / M83 / M67 (similar to Citizen)
 *   Mazak Integrex : M91 bar-advance, M92 bar-retract, M95 bar-end sensor
 *   DMG MORI NTX   : M71 bar-advance, M72 bar-retract, M75 bar-end sensor
 *   Generic        : caller supplies M-codes via MachineRegistry bar feeder config
 *
 * Bar-end detection strategies (caller picks one):
 *   - "skip_signal"   : G31 skip-to-signal at expected end position
 *   - "overtravel"    : rely on Z-axis overtravel alarm
 *   - "feeder_signal" : M-code + input contact handshake with bar feeder
 *
 * Physics / reference:
 *   - LNS Quick Load Servo / Iemca Boss / FMB Turbo 8-80 operator manuals
 *   - EN 10278 bar tolerance standards
 *
 * @module engines/SwissBarProductionEngine
 * @milestone LATHE-PRO-MS6b / U-LPS24
 */

export type BarFeederDialect = "citizen" | "star" | "tsugami" | "mazak" | "dmg_mori" | "generic";

export type BarEndStrategy = "skip_signal" | "overtravel" | "feeder_signal";

export interface SwissBarInput {
  dialect: BarFeederDialect;
  /** Full bar length (mm), e.g. 3000 mm for a 3 m bar. */
  bar_length_mm: number;
  /** Length inside the collet that is unusable (mm). Default 50. */
  grip_length_mm?: number;
  /** Minimum unusable remnant (mm) retained at the end of the bar. Default 0
   *  (use remnant as next bar-pull end). */
  remnant_min_mm?: number;
  /** Finished part length (mm). */
  part_length_mm: number;
  /** Cut-off (parting) width per part (mm). Default 3. */
  cutoff_width_mm?: number;
  /** Facing allowance per part (mm). Default 0.5. */
  facing_stock_mm?: number;
  /** Total batch quantity to produce. */
  batch_quantity: number;
  /** Magazine capacity (bars). Default 12. */
  magazine_capacity?: number;
  /** Cycle time per part (seconds). */
  cycle_time_s: number;
  /** Time to change bars — magazine advance + re-grip + face (seconds). Default 30. */
  bar_change_time_s?: number;
  /** Bar-end detection strategy. Default "feeder_signal". */
  bar_end_strategy?: BarEndStrategy;
  /** Custom M-code overrides (generic dialect only). */
  custom_mcodes?: {
    bar_feed?: string;
    bar_pull?: string;
    bar_end_check?: string;
  };
}

export interface BarMcodeSet {
  bar_feed: string;
  bar_pull: string;
  bar_end_check: string;
}

export interface SwissBarResult {
  stride_mm: number;
  parts_per_bar: number;
  remnant_mm: number;
  /** True when the remnant still fits one more stride — caller may recycle it. */
  remnant_usable_for_one_more: boolean;
  bars_required: number;
  /** True when bars_required > magazine_capacity — operator must reload. */
  magazine_reload_needed: boolean;
  run_time_s: number;
  /** Derived per-dialect M-codes for the bar-feeder program. */
  mcodes: BarMcodeSet;
  /** Bar-end detection program snippet (lines). */
  bar_end_detection_lines: string[];
  warnings: string[];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Per-dialect bar feeder M-code table. */
function mcodeSet(dialect: BarFeederDialect, custom?: SwissBarInput["custom_mcodes"]): BarMcodeSet {
  switch (dialect) {
    case "citizen":
    case "tsugami":
      return { bar_feed: "M82", bar_pull: "M83", bar_end_check: "M67" };
    case "star":
      return { bar_feed: "M220", bar_pull: "M221", bar_end_check: "M230" };
    case "mazak":
      return { bar_feed: "M91", bar_pull: "M92", bar_end_check: "M95" };
    case "dmg_mori":
      return { bar_feed: "M71", bar_pull: "M72", bar_end_check: "M75" };
    case "generic":
      return {
        bar_feed: custom?.bar_feed ?? "M-BAR-FEED",
        bar_pull: custom?.bar_pull ?? "M-BAR-PULL",
        bar_end_check: custom?.bar_end_check ?? "M-BAR-END",
      };
  }
}

/** Emit bar-end detection lines for the chosen strategy. */
function barEndLines(
  strategy: BarEndStrategy,
  mcodes: BarMcodeSet,
  expectedEndZ: number,
): string[] {
  switch (strategy) {
    case "skip_signal":
      return [
        "(--- BAR END DETECT: G31 skip-to-signal ---)",
        `G31 Z${round3(expectedEndZ)} F200 ; skip to bar-end contact`,
        "IF [#5063 EQ 0] GOTO 9000 ; skip did not fire = bar present",
        "(N9000: BAR END REACHED — pause and reload)",
      ];
    case "overtravel":
      return [
        "(--- BAR END DETECT: Z-axis overtravel alarm ---)",
        `G00 Z${round3(expectedEndZ - 5)} ; deliberate overtravel checks remaining length`,
        "(Overtravel alarm halts program when bar depleted)",
      ];
    case "feeder_signal":
      return [
        "(--- BAR END DETECT: feeder signal handshake ---)",
        `${mcodes.bar_end_check} ; bar feeder end-of-bar sensor poll`,
        "M00 ; optional stop if feeder signalled end",
      ];
  }
}

export class SwissBarProductionEngine {
  /**
   * Plan a Swiss bar-stock production run.
   */
  plan(input: SwissBarInput): SwissBarResult {
    const warnings: string[] = [];
    const grip = input.grip_length_mm ?? 50;
    const remnantMin = input.remnant_min_mm ?? 0;
    const cutoff = input.cutoff_width_mm ?? 3;
    const facing = input.facing_stock_mm ?? 0.5;
    const magCap = input.magazine_capacity ?? 12;
    const changeTime = input.bar_change_time_s ?? 30;
    const strategy = input.bar_end_strategy ?? "feeder_signal";

    if (input.part_length_mm <= 0) {
      warnings.push(`part_length_mm=${input.part_length_mm} must be > 0.`);
    }
    if (input.bar_length_mm <= grip + input.part_length_mm + cutoff) {
      warnings.push(
        `bar_length_mm=${input.bar_length_mm} is too short for grip (${grip}) + one part (${input.part_length_mm}) + cutoff (${cutoff}).`,
      );
    }

    const stride = input.part_length_mm + cutoff + facing;
    const usableLength = input.bar_length_mm - grip - remnantMin;
    const partsPerBar = stride > 0 ? Math.max(0, Math.floor(usableLength / stride)) : 0;
    const remnant = input.bar_length_mm - grip - partsPerBar * stride;
    const remnantUsable = remnant >= stride;

    const barsRequired = partsPerBar > 0 ? Math.ceil(input.batch_quantity / partsPerBar) : 0;
    if (partsPerBar === 0) {
      warnings.push("parts_per_bar is 0 — bar cannot produce any complete part with these dimensions.");
    }
    const magazineReload = barsRequired > magCap;
    if (magazineReload) {
      warnings.push(
        `batch requires ${barsRequired} bars but magazine holds ${magCap} — ` +
          `operator must reload ${barsRequired - magCap} time(s) during run.`,
      );
    }

    const runTime = barsRequired * (partsPerBar * input.cycle_time_s + changeTime);

    const mcodes = mcodeSet(input.dialect, input.custom_mcodes);
    // Expected Z at which the bar-end sensor fires (datum is at bar-feed reference).
    const expectedEndZ = -(grip + partsPerBar * stride);
    const barEnd = barEndLines(strategy, mcodes, expectedEndZ);

    return {
      stride_mm: round3(stride),
      parts_per_bar: partsPerBar,
      remnant_mm: round3(remnant),
      remnant_usable_for_one_more: remnantUsable,
      bars_required: barsRequired,
      magazine_reload_needed: magazineReload,
      run_time_s: round3(runTime),
      mcodes,
      bar_end_detection_lines: barEnd,
      warnings,
    };
  }
}

/** Singleton instance. */
export const swissBarProductionEngine = new SwissBarProductionEngine();
