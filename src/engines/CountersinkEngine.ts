/**
 * CountersinkEngine — Countersink Depth & Parameter Calculator
 *
 * Calculates countersink parameters for fastener seating:
 * - Countersink depth from screw head diameter and angle
 * - Standard dimensions for common fastener types
 * - Feed/speed for countersink tools
 * - Depth tolerance for flush/sub-flush/proud
 * - Multi-flute vs single-flute selection
 *
 * Key physics: Countersinks are conical cuts that seat
 * flat-head screws flush with the surface. The depth
 * determines flush height. Chatter is common due to
 * interrupted cut at large diameters — multi-flute tools
 * and reduced speed help. Back-taper on the tool affects
 * effective angle.
 *
 * Reference: Machinery's Handbook Ch.26 (Countersinks),
 *            ANSI B18.6.2 (Flat head screws),
 *            DIN 74 (Countersink dimensions)
 *
 * Actions: countersink_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CountersinkInput {
  screw_size?: string;
  screw_head_diameter_mm?: number;
  hole_diameter_mm?: number;
  countersink_angle_deg?: number;
  flush_type?: "flush" | "sub_flush" | "proud";
  flush_offset_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "composite" | "plastic";
  tool_flutes?: number;
  tool_type?: "hss" | "carbide" | "cobalt";
}

export interface CountersinkResult {
  countersink_diameter: AtomicValue;
  countersink_depth: AtomicValue;
  total_hole_depth_added: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  feed_per_rev: AtomicValue;
  cycle_time_per_hole: AtomicValue;
  recommended_flutes: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * Common flat-head screw head diameters (mm)
 * Based on ANSI B18.6.2 / DIN 965
 */
const SCREW_HEADS: Record<string, { head_dia: number; hole_dia: number }> = {
  "M2": { head_dia: 3.8, hole_dia: 2.4 },
  "M2.5": { head_dia: 4.7, hole_dia: 2.9 },
  "M3": { head_dia: 5.6, hole_dia: 3.4 },
  "M4": { head_dia: 7.5, hole_dia: 4.5 },
  "M5": { head_dia: 9.2, hole_dia: 5.5 },
  "M6": { head_dia: 11.0, hole_dia: 6.6 },
  "M8": { head_dia: 14.5, hole_dia: 9.0 },
  "M10": { head_dia: 18.0, hole_dia: 11.0 },
  "M12": { head_dia: 21.5, hole_dia: 13.5 },
  "#4": { head_dia: 5.5, hole_dia: 3.0 },
  "#6": { head_dia: 7.1, hole_dia: 3.6 },
  "#8": { head_dia: 8.7, hole_dia: 4.4 },
  "#10": { head_dia: 10.3, hole_dia: 5.1 },
  "1/4": { head_dia: 12.7, hole_dia: 6.9 },
  "5/16": { head_dia: 15.9, hole_dia: 8.5 },
  "3/8": { head_dia: 19.0, hole_dia: 10.3 },
};

const DEFAULT_VC: Record<string, number> = {
  steel: 25,
  aluminum: 60,
  titanium: 12,
  stainless: 18,
  composite: 30,
  plastic: 40,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CountersinkEngine {
  calculate(input: CountersinkInput): CountersinkResult {
    const warnings: string[] = [];
    const angle = input.countersink_angle_deg ?? 82;
    const mat = input.material_type ?? "steel";
    const flushType = input.flush_type ?? "flush";
    const flushOffset = input.flush_offset_mm ?? 0.1;
    const toolType = input.tool_type ?? "hss";
    const flutes = input.tool_flutes ?? 3;

    // Determine head diameter
    let headDia: number;
    let holeDia: number;

    if (input.screw_head_diameter_mm) {
      headDia = input.screw_head_diameter_mm;
      holeDia = input.hole_diameter_mm ?? headDia * 0.55;
    } else if (input.screw_size && SCREW_HEADS[input.screw_size]) {
      const std = SCREW_HEADS[input.screw_size];
      headDia = std.head_dia;
      holeDia = input.hole_diameter_mm ?? std.hole_dia;
    } else {
      headDia = input.hole_diameter_mm
        ? input.hole_diameter_mm * 2
        : 10;
      holeDia = input.hole_diameter_mm ?? headDia * 0.55;
      if (!input.screw_head_diameter_mm && !input.screw_size) {
        warnings.push(
          "No screw size specified — using estimated head diameter"
        );
      }
    }

    // Countersink diameter = head diameter + clearance
    const cskDia = headDia + 0.2;

    // Countersink depth from geometry
    // depth = (cskDia - holeDia) / (2 × tan(angle/2))
    const halfAngleRad = ((angle / 2) * Math.PI) / 180;
    let cskDepth = (cskDia - holeDia)
      / (2 * Math.tan(halfAngleRad));

    // Adjust for flush type
    if (flushType === "sub_flush") {
      cskDepth += flushOffset;
    } else if (flushType === "proud") {
      cskDepth -= flushOffset;
    }

    cskDepth = Math.max(cskDepth, 0.1);

    // Cutting parameters
    const Vc = DEFAULT_VC[mat] ?? 25;
    const toolMult = toolType === "carbide" ? 1.8
      : toolType === "cobalt" ? 1.3 : 1.0;
    const rpm = r0((Vc * toolMult * 1000) / (Math.PI * cskDia));

    // Feed: light for countersinks to avoid chatter
    const baseFr = mat === "aluminum" ? 0.08
      : mat === "composite" ? 0.04
      : mat === "titanium" ? 0.03 : 0.05;
    const fr = baseFr;
    const feedRate = r1(fr * rpm);

    // Cycle time per hole: approach + cut + dwell + retract
    const cutTime = feedRate > 0 ? cskDepth / feedRate : 0;
    const dwellTime = 0.5 / 60; // 0.5 sec dwell for surface
    const cycleTime = cutTime + dwellTime + 0.02;

    // Recommended flutes
    const recFlutes = cskDia > 15 ? 5
      : cskDia > 8 ? 3
      : 1;

    // Warnings
    if (angle !== 82 && angle !== 90 && angle !== 60
      && angle !== 100 && angle !== 120) {
      warnings.push(
        `Non-standard countersink angle ${angle}° — ` +
        "common angles: 82°, 90°, 100°, 120°"
      );
    }
    if (mat === "composite") {
      warnings.push(
        "Composite countersinking — use sharp tool, low feed " +
        "to prevent delamination"
      );
    }
    if (cskDia > 25 && flutes < 3) {
      warnings.push(
        "Large countersink with few flutes — " +
        "expect chatter, use 3+ flutes"
      );
    }
    if (holeDia > headDia * 0.9) {
      warnings.push(
        "Clearance hole nearly as large as head — " +
        "minimal countersink contact"
      );
    }

    return {
      countersink_diameter: av(r2(cskDia), "mm", 0.05,
        `Head ${r2(headDia)}mm + 0.2mm clearance`),
      countersink_depth: av(r3(cskDepth), "mm", 0.02,
        `(${r2(cskDia)}-${r2(holeDia)}) / ` +
        `(2×tan(${angle / 2}°))`),
      total_hole_depth_added: av(r3(cskDepth), "mm", 0.02,
        `${flushType} mount`),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${r0(Vc * toolMult)} at Ø${r2(cskDia)}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fr=${fr} mm/rev × ${rpm} rpm`),
      feed_per_rev: av(fr, "mm/rev", 0.005,
        `${mat} / ${toolType}`),
      cycle_time_per_hole: av(r3(cycleTime), "min", 0.005,
        "Cut + 0.5s dwell + retract"),
      recommended_flutes: av(recFlutes, "flutes", 0,
        cskDia > 15 ? "Large dia → 5 flutes"
          : cskDia > 8 ? "Medium → 3 flutes"
          : "Small → single flute"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const countersinkEngine = new CountersinkEngine();
