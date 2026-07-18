/**
 * LATHE-PRO-MS3, U-LPS12
 * SoftJawBoringGCodeEngine — G71/G70 Bore Cycle Generator for Soft Jaws
 *
 * Generates controller-specific G-code for boring soft jaws to finished OD.
 *
 * Bore diameter calculation by material:
 * - Steel: finished_OD + 0.05mm (spring-back to grip)
 * - Aluminum: finished_OD + 0.10mm (softer, more spring needed)
 * - Titanium: finished_OD + 0.03mm (low spring-back)
 *
 * Bolt clearance check ensures bore path doesn't intersect jaw bolt pattern.
 *
 * Reference: Peter Smid "CNC Programming Handbook" 3rd ed., Ch. 2
 * Reference: Kitagawa chuck manual — jaw bolt patterns
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type SoftJawMaterial = "steel" | "aluminum" | "titanium" | "custom";
export type ControllerDialect = "fanuc" | "haas" | "okuma" | "mazak" | "siemens";

export interface SoftJawBoringInput {
  workpiece: {
    finished_od_mm: number;
    material?: SoftJawMaterial;
    custom_clearance_mm?: number;
  };
  chuck: {
    jaw_type?: string;
    bolt_pattern_radius_mm?: number;
    bolt_count?: number;
    bolt_head_dia_mm?: number;
    jaw_travel_range_mm?: [number, number];
  };
  machine: {
    controller_dialect: ControllerDialect;
  };
  cutting_params?: {
    rough_depth_mm?: number;
    rough_feed_mm_rev?: number;
    finish_feed_mm_rev?: number;
    spindle_rpm?: number;
  };
}

export interface SoftJawBoringResult {
  gcode_lines: string[];
  bore_diameter_mm: number;
  bore_clearance_mm: number;
  bolt_clearance_ok: boolean;
  bolt_clearance_details?: string;
  relief_groove_required: boolean;
  controller: ControllerDialect;
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Bore clearance over finished OD by material */
const CLEARANCE_BY_MATERIAL: Record<SoftJawMaterial, number> = {
  steel: 0.05,
  aluminum: 0.10,
  titanium: 0.03,
  custom: 0.05,
};

/** Default soft jaw bore depth (mm) */
const DEFAULT_BORE_DEPTH = 15;

/** Default rough pass depth (mm) */
const DEFAULT_ROUGH_DOC = 1.5;

/** Default rough feed (mm/rev) */
const DEFAULT_ROUGH_FEED = 0.15;

/** Default finish feed (mm/rev) */
const DEFAULT_FINISH_FEED = 0.08;

/** Default spindle RPM for soft jaw boring */
const DEFAULT_RPM = 800;

/**
 * Controller dialects for which a G71/G70 (or CYCLE95) bore template exists.
 * Any dialect outside this set has no cutting cycle — the engine rejects it with a
 * warned, empty program rather than emitting a silent header-only "safe-looking" bore.
 */
const KNOWN_CONTROLLER_DIALECTS: ReadonlySet<ControllerDialect> = new Set<ControllerDialect>([
  "fanuc",
  "haas",
  "okuma",
  "mazak",
  "siemens",
]);

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class SoftJawBoringGCodeEngine {
  /**
   * Generate soft jaw boring G-code with bolt clearance check.
   *
   * @param input Workpiece OD, chuck bolt pattern, controller dialect
   * @returns G-code lines, bore diameter, bolt clearance status
   */
  generate(input: SoftJawBoringInput): SoftJawBoringResult {
    const { workpiece, chuck, machine, cutting_params } = input;
    const warnings: string[] = [];

    // ── DEFENSIVE GUARD (gap #2): finished OD must be finite and > 0 ──
    // A non-finite (NaN/Infinity) or non-positive OD would otherwise reach the
    // emitted G-code as `XNaN` / `X-9.950` — a runnable but nonsensical bore move.
    // Reject up front with a warned, EMPTY program instead of emitting bad moves.
    if (!Number.isFinite(workpiece.finished_od_mm) || workpiece.finished_od_mm <= 0) {
      return this.rejectedResult(
        machine.controller_dialect,
        `Invalid finished_od_mm (${String(workpiece.finished_od_mm)}) — must be a finite number > 0; no G-code emitted`,
      );
    }

    // Bore diameter calculation
    const material = workpiece.material ?? "steel";
    const clearance = workpiece.custom_clearance_mm ?? CLEARANCE_BY_MATERIAL[material];
    const boreDia = workpiece.finished_od_mm + clearance;

    // ── DEFENSIVE GUARD (gap #1): controller dialect must be recognized ──
    // An unknown dialect has no G71/G70 (or CYCLE95) template; emitting only the
    // header would be a "safe-looking" EMPTY bore program with no cutting moves and
    // no warning. Reject with a warned, empty result so it is never silently empty.
    if (!KNOWN_CONTROLLER_DIALECTS.has(machine.controller_dialect)) {
      return this.rejectedResult(
        machine.controller_dialect,
        `Unknown controller dialect '${String(machine.controller_dialect)}' — no bore cycle generated (supported: ${[...KNOWN_CONTROLLER_DIALECTS].join(", ")})`,
        parseFloat(boreDia.toFixed(3)),
        clearance,
      );
    }

    // Cutting parameters
    const doc = cutting_params?.rough_depth_mm ?? DEFAULT_ROUGH_DOC;
    const roughFeed = cutting_params?.rough_feed_mm_rev ?? DEFAULT_ROUGH_FEED;
    const finishFeed = cutting_params?.finish_feed_mm_rev ?? DEFAULT_FINISH_FEED;
    const rpm = cutting_params?.spindle_rpm ?? DEFAULT_RPM;
    const boreDepth = DEFAULT_BORE_DEPTH;

    // Bolt clearance check
    let boltOk = true;
    let boltDetails: string | undefined;
    let reliefRequired = false;

    if (chuck.bolt_pattern_radius_mm && chuck.bolt_head_dia_mm) {
      const boltInnerRadius = chuck.bolt_pattern_radius_mm - chuck.bolt_head_dia_mm / 2;
      const boreRadius = boreDia / 2;
      if (boreRadius >= boltInnerRadius) {
        boltOk = false;
        reliefRequired = true;
        boltDetails = `Bore Ø${boreDia.toFixed(2)}mm (R=${boreRadius.toFixed(1)}) interferes with bolt at R=${boltInnerRadius.toFixed(1)}mm`;
        warnings.push(boltDetails);
        warnings.push("Relief groove required in bore profile to clear bolt heads");
      } else {
        const margin = boltInnerRadius - boreRadius;
        boltDetails = `Bolt clearance OK — ${margin.toFixed(2)}mm margin`;
      }
    } else if (chuck.bolt_pattern_radius_mm || chuck.bolt_head_dia_mm) {
      // ── DEFENSIVE GUARD (gap #3): partial chuck spec ──
      // Exactly ONE of bolt_pattern_radius_mm / bolt_head_dia_mm was supplied, so the
      // interference check cannot run. Do NOT return an optimistic bolt_clearance_ok:true
      // — flag it as not-verified with a warning so the caller knows it was NOT checked.
      boltOk = false;
      boltDetails =
        "Incomplete chuck bolt spec — bolt_pattern_radius_mm AND bolt_head_dia_mm are BOTH required to verify bolt clearance; clearance NOT checked";
      warnings.push(boltDetails);
    }

    // Generate G-code for target controller
    const lines = this.generateGcode(
      boreDia, boreDepth, doc, roughFeed, finishFeed, rpm,
      machine.controller_dialect,
    );

    return {
      gcode_lines: lines,
      bore_diameter_mm: parseFloat(boreDia.toFixed(3)),
      bore_clearance_mm: clearance,
      bolt_clearance_ok: boltOk,
      bolt_clearance_details: boltDetails,
      relief_groove_required: reliefRequired,
      controller: machine.controller_dialect,
      warnings,
    };
  }

  /**
   * Build a warned, EMPTY-program result for a rejected input (defensive guards).
   * No gcode_lines are emitted; the single warning explains why. Flags are set
   * conservatively (bolt_clearance_ok=false, relief_groove_required=false) so a
   * caller can never read an empty program as a verified-safe bore.
   *
   * @param controller       The requested controller dialect (echoed back)
   * @param warning          Human-readable reason the input was rejected
   * @param boreDiameterMm   Reported bore Ø when known (valid OD but bad dialect); else 0
   * @param boreClearanceMm  Reported material clearance when known; else 0
   * @returns Empty-program result carrying exactly one warning
   */
  private rejectedResult(
    controller: ControllerDialect,
    warning: string,
    boreDiameterMm = 0,
    boreClearanceMm = 0,
  ): SoftJawBoringResult {
    return {
      gcode_lines: [],
      bore_diameter_mm: boreDiameterMm,
      bore_clearance_mm: boreClearanceMm,
      bolt_clearance_ok: false,
      relief_groove_required: false,
      controller,
      warnings: [warning],
    };
  }

  /**
   * Generate controller-specific G71/G70 bore cycle.
   *
   * G71 rough bore + G70 finish pass.
   * Controller differences:
   * - Fanuc: G71 U(depth) R(retract) / G71 P(start) Q(end) U(stock) W(stock) F(feed)
   * - Haas: Same as Fanuc (NGC is Fanuc-compatible)
   * - Okuma: G71 U(depth) R(retract) P(start) Q(end) with different P/Q block numbering
   * - Mazak: G71 U(depth) R(retract) P(start) Q(end) — Mazatrol compatible
   * - Siemens: CYCLE95 (contour turning cycle)
   */
  private generateGcode(
    boreDia: number, depth: number, doc: number,
    roughFeed: number, finishFeed: number, rpm: number,
    controller: ControllerDialect,
  ): string[] {
    const boreRadius = boreDia / 2;
    const lines: string[] = [];

    // Common header
    lines.push(`(SOFT JAW BORING - Bore Dia ${boreDia.toFixed(3)}mm)`);
    lines.push(`(Controller: ${controller.toUpperCase()})`);
    lines.push(`(Generated by PRISM SoftJawBoringGCodeEngine)`);
    lines.push("");

    switch (controller) {
      case "fanuc":
      case "haas": {
        lines.push(`G97 S${rpm} M03`);
        lines.push("G00 X0 Z2.0");
        lines.push(`G71 U${doc.toFixed(1)} R0.5`);
        lines.push(`G71 P100 Q200 U0.2 W0.1 F${roughFeed}`);
        lines.push(`N100 G00 X${(boreDia + 2).toFixed(3)}`);
        lines.push(`G01 Z0 F${roughFeed}`);
        lines.push(`X${boreDia.toFixed(3)} Z0`);
        lines.push(`Z-${depth.toFixed(1)}`);
        lines.push(`X${(boreDia + 2).toFixed(3)}`);
        lines.push("N200 G00 Z2.0");
        lines.push(`G70 P100 Q200 F${finishFeed}`);
        lines.push("G00 X100.0 Z50.0 (SAFE RETRACT)");
        break;
      }
      case "okuma": {
        lines.push(`G97 S${rpm} M03`);
        lines.push("G00 X0 Z2.0");
        lines.push(`G71 U${doc.toFixed(1)} R0.5`);
        lines.push(`G71 P1000 Q2000 U0.2 W0.1 F${roughFeed}`);
        lines.push(`N1000 G00 X${(boreDia + 2).toFixed(3)}`);
        lines.push(`G01 Z0 F${roughFeed}`);
        lines.push(`X${boreDia.toFixed(3)} Z0`);
        lines.push(`Z-${depth.toFixed(1)}`);
        lines.push(`X${(boreDia + 2).toFixed(3)}`);
        lines.push("N2000 G00 Z2.0");
        lines.push(`G70 P1000 Q2000 F${finishFeed}`);
        lines.push("G00 X100.0 Z50.0 (SAFE RETRACT)");
        break;
      }
      case "mazak": {
        lines.push(`G97 S${rpm} M03`);
        lines.push("G00 X0 Z2.0");
        lines.push(`G71 U${doc.toFixed(1)} R0.5`);
        lines.push(`G71 P100 Q200 U0.2 W0.1 F${roughFeed}`);
        lines.push(`N100 G00 X${(boreDia + 2).toFixed(3)}`);
        lines.push(`G01 Z0 F${roughFeed}`);
        lines.push(`X${boreDia.toFixed(3)}`);
        lines.push(`Z-${depth.toFixed(1)}`);
        lines.push(`X${(boreDia + 2).toFixed(3)}`);
        lines.push("N200 G00 Z2.0");
        lines.push(`G70 P100 Q200 F${finishFeed}`);
        lines.push("G00 X100.0 Z50.0");
        break;
      }
      case "siemens": {
        lines.push(`G97 S${rpm} M3`);
        lines.push("G0 X0 Z2");
        lines.push("; CYCLE95 — Contour Turning (Siemens ShopTurn)");
        lines.push(`CYCLE95("BORE_CONTOUR",${doc},0,0.2,0.1,${roughFeed},${finishFeed},7)`);
        lines.push("; Contour definition:");
        lines.push(`; Start: X=${(boreDia + 2).toFixed(3)} Z=0`);
        lines.push(`; To: X=${boreDia.toFixed(3)} Z=0`);
        lines.push(`; To: X=${boreDia.toFixed(3)} Z=-${depth.toFixed(1)}`);
        lines.push(`; End: X=${(boreDia + 2).toFixed(3)} Z=-${depth.toFixed(1)}`);
        lines.push("G0 X100 Z50 (SAFE RETRACT)");
        break;
      }
    }

    lines.push("M05");
    lines.push("M30");
    return lines;
  }
}

export const softJawBoringGCodeEngine = new SoftJawBoringGCodeEngine();
