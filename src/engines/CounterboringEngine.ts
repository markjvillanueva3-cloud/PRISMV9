/**
 * CounterboringEngine — Counterbore Dimension & Parameter Calculator
 *
 * Calculates counterbore parameters for socket head cap screws:
 * - Standard counterbore diameter and depth from screw size
 * - Feed/speed for counterbore tools, end mills, interpolation
 * - Flatness and perpendicularity considerations
 * - Pilot hole requirements
 *
 * Key physics: Counterboring creates a flat-bottomed recess
 * for screw head seating. The tool must be concentric with
 * the through-hole. Cutting forces are intermittent as the
 * pilot enters/exits the hole. For precision work, boring
 * bar interpolation gives better concentricity than a
 * fixed counterbore tool.
 *
 * Reference: ANSI B18.3 (Socket head cap screws),
 *            DIN 974 (Counterbore dimensions),
 *            Machinery's Handbook Ch.26 (Counterboring)
 *
 * Actions: counterbore_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CounterboringInput {
  screw_size?: string;
  screw_head_diameter_mm?: number;
  screw_head_height_mm?: number;
  through_hole_diameter_mm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  method?: "counterbore_tool" | "end_mill" | "interpolation";
  clearance_mm?: number;
}

export interface CounterboringResult {
  counterbore_diameter: AtomicValue;
  counterbore_depth: AtomicValue;
  through_hole_diameter: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  tool_diameter: AtomicValue;
  cycle_time_per_hole: AtomicValue;
  flatness_tolerance: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * Socket head cap screw dimensions (mm)
 * [screw_size, head_dia, head_height, through_hole, cbore_dia]
 */
const SHCS_TABLE: Record<string, {
  head_dia: number;
  head_h: number;
  through_hole: number;
  cbore_dia: number;
}> = {
  "M3": { head_dia: 5.5, head_h: 3.0, through_hole: 3.4, cbore_dia: 6.5 },
  "M4": { head_dia: 7.0, head_h: 4.0, through_hole: 4.5, cbore_dia: 8.0 },
  "M5": { head_dia: 8.5, head_h: 5.0, through_hole: 5.5, cbore_dia: 9.5 },
  "M6": { head_dia: 10.0, head_h: 6.0, through_hole: 6.6, cbore_dia: 11.0 },
  "M8": { head_dia: 13.0, head_h: 8.0, through_hole: 9.0, cbore_dia: 14.5 },
  "M10": { head_dia: 16.0, head_h: 10.0, through_hole: 11.0, cbore_dia: 17.5 },
  "M12": { head_dia: 18.0, head_h: 12.0, through_hole: 13.5, cbore_dia: 20.0 },
  "M16": { head_dia: 24.0, head_h: 16.0, through_hole: 17.5, cbore_dia: 26.0 },
  "M20": { head_dia: 30.0, head_h: 20.0, through_hole: 22.0, cbore_dia: 33.0 },
  "#6": { head_dia: 5.8, head_h: 3.5, through_hole: 3.6, cbore_dia: 6.9 },
  "#8": { head_dia: 7.0, head_h: 4.4, through_hole: 4.4, cbore_dia: 8.2 },
  "#10": { head_dia: 8.4, head_h: 5.1, through_hole: 5.1, cbore_dia: 9.6 },
  "1/4": { head_dia: 9.5, head_h: 6.4, through_hole: 6.9, cbore_dia: 11.1 },
  "5/16": { head_dia: 12.0, head_h: 7.9, through_hole: 8.5, cbore_dia: 13.5 },
  "3/8": { head_dia: 14.3, head_h: 9.5, through_hole: 10.3, cbore_dia: 16.0 },
  "1/2": { head_dia: 19.1, head_h: 12.7, through_hole: 13.5, cbore_dia: 21.4 },
};

const DEFAULT_VC: Record<string, number> = {
  steel: 30,
  aluminum: 80,
  titanium: 15,
  stainless: 22,
  cast_iron: 35,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CounterboringEngine {
  calculate(input: CounterboringInput): CounterboringResult {
    const warnings: string[] = [];
    const mat = input.material_type ?? "steel";
    const method = input.method ?? "counterbore_tool";
    const clearance = input.clearance_mm ?? 0.5;

    // Look up standard dimensions
    let cboreDia: number;
    let cboreDepth: number;
    let throughHole: number;
    let headDia: number;

    if (input.screw_size && SHCS_TABLE[input.screw_size]) {
      const std = SHCS_TABLE[input.screw_size];
      headDia = std.head_dia;
      cboreDia = std.cbore_dia;
      cboreDepth = std.head_h + clearance;
      throughHole = input.through_hole_diameter_mm ?? std.through_hole;
    } else if (input.screw_head_diameter_mm) {
      headDia = input.screw_head_diameter_mm;
      cboreDia = headDia + 1.5;
      cboreDepth = (input.screw_head_height_mm ?? headDia * 0.6)
        + clearance;
      throughHole = input.through_hole_diameter_mm
        ?? headDia * 0.55;
    } else {
      headDia = 10;
      cboreDia = 11.5;
      cboreDepth = 6.5;
      throughHole = input.through_hole_diameter_mm ?? 6.6;
      warnings.push(
        "No screw size specified — using estimated dimensions"
      );
    }

    // Tool diameter depends on method
    let toolDia: number;
    if (method === "counterbore_tool") {
      toolDia = cboreDia; // fixed tool matches cbore
    } else if (method === "end_mill") {
      // Use end mill slightly smaller, plunge to depth
      toolDia = cboreDia - 0.5;
    } else {
      // Interpolation: smaller tool, circular path
      toolDia = Math.min(cboreDia * 0.6, throughHole - 0.5);
      if (toolDia < 3) {
        toolDia = 3;
        warnings.push(
          "Interpolation tool very small — slow cycle time"
        );
      }
    }

    // Cutting parameters
    const Vc = DEFAULT_VC[mat] ?? 30;
    const rpm = r0((Vc * 1000) / (Math.PI * toolDia));
    const fr = mat === "aluminum" ? 0.08
      : mat === "titanium" ? 0.03 : 0.05;
    const feedRate = r1(fr * rpm);

    // Cycle time
    let cycleTime: number;
    if (method === "interpolation") {
      // Circular path length per depth pass
      const helixDia = cboreDia - toolDia;
      const pathLen = Math.PI * helixDia;
      const nRevs = Math.ceil(cboreDepth / 0.5); // 0.5mm per rev
      cycleTime = feedRate > 0
        ? (pathLen * nRevs) / feedRate + 0.03
        : 0;
    } else {
      // Direct plunge
      cycleTime = feedRate > 0
        ? cboreDepth / (feedRate * 0.5) + 0.02 // 50% feed for plunge
        : 0;
    }

    // Flatness tolerance (better with interpolation)
    const flatness = method === "interpolation" ? 0.01
      : method === "end_mill" ? 0.02 : 0.03;

    // Warnings
    if (method === "counterbore_tool" && cboreDia > 30) {
      warnings.push(
        "Large counterbore tool — high torque, " +
        "consider interpolation"
      );
    }
    if (method === "end_mill" && throughHole > toolDia) {
      warnings.push(
        "Through hole larger than end mill — " +
        "tool will fall through, use interpolation"
      );
    }
    if (cboreDepth > cboreDia * 0.8) {
      warnings.push(
        "Deep counterbore — check for chatter and chip evacuation"
      );
    }

    return {
      counterbore_diameter: av(r2(cboreDia), "mm", 0.05,
        input.screw_size
          ? `Standard for ${input.screw_size} SHCS`
          : "Head dia + 1.5mm"),
      counterbore_depth: av(r2(cboreDepth), "mm", 0.05,
        `Head height + ${clearance}mm clearance`),
      through_hole_diameter: av(r2(throughHole), "mm", 0.05,
        input.screw_size
          ? `Standard for ${input.screw_size}`
          : "Estimated"),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Ø${r1(toolDia)}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fr=${fr} × ${rpm}rpm`),
      tool_diameter: av(r2(toolDia), "mm", 0,
        method === "counterbore_tool"
          ? "Fixed tool = cbore dia"
          : method === "end_mill"
            ? "End mill = cbore - 0.5"
            : "60% of cbore for interpolation"),
      cycle_time_per_hole: av(r3(cycleTime), "min", 0.01,
        method === "interpolation"
          ? "Helical interpolation"
          : "Direct plunge"),
      flatness_tolerance: av(flatness, "mm", 0.005,
        method === "interpolation"
          ? "Best — tool interpolates flat"
          : "Standard counterbore tool"),
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

export const counterboringEngine = new CounterboringEngine();
