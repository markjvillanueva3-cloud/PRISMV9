/**
 * ChamferEngine — Chamfer Machining Parameter Calculator
 *
 * Calculates chamfering parameters:
 * - Chamfer tool selection (angle, size)
 * - Depth and width from chamfer spec (C×45°, or angle+leg)
 * - Feed and speed for chamfer tools vs end mills
 * - Back-chamfer / deburring considerations
 * - Cycle time per feature
 *
 * Key physics: Chamfer cutting happens at the tool's angular
 * face. The effective cutting diameter varies with depth of
 * engagement. For single-point chamfer mills, the cutting
 * speed should be calculated at the effective diameter,
 * not the nominal. Multi-flute chamfer mills can run at
 * higher feeds. Back-chamfers require special tooling or
 * 5-axis access.
 *
 * Reference: Machinery's Handbook (Chamfers & Bevels),
 *            ASME Y14.5 (Edge callout interpretation),
 *            Harvey Tool Chamfer Mill Application Guide
 *
 * Actions: chamfer_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ChamferInput {
  chamfer_size_mm: number;
  chamfer_angle_deg?: number;
  hole_diameter_mm?: number;
  edge_type?: "hole" | "edge" | "slot" | "od";
  tool_type?: "chamfer_mill" | "spot_drill" | "end_mill" | "deburr";
  tool_diameter_mm?: number;
  flutes?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  edge_length_mm?: number;
  back_chamfer?: boolean;
}

export interface ChamferResult {
  chamfer_width: AtomicValue;
  chamfer_depth: AtomicValue;
  effective_cutting_diameter: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  plunge_depth: AtomicValue;
  tool_path_length: AtomicValue;
  cycle_time_per_feature: AtomicValue;
  recommended_tool_angle: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 80,
  aluminum: 200,
  titanium: 35,
  stainless: 60,
  cast_iron: 70,
  brass: 120,
};

const DEFAULT_FZ: Record<string, number> = {
  steel: 0.05,
  aluminum: 0.08,
  titanium: 0.03,
  stainless: 0.04,
  cast_iron: 0.06,
  brass: 0.07,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ChamferEngine {
  calculate(input: ChamferInput): ChamferResult {
    const warnings: string[] = [];
    const C = input.chamfer_size_mm;
    const angle = input.chamfer_angle_deg ?? 45;
    const mat = input.material_type ?? "steel";
    const toolType = input.tool_type ?? "chamfer_mill";
    const edgeType = input.edge_type ?? "hole";
    const flutes = input.flutes ?? (toolType === "spot_drill" ? 2 : 4);
    const backChamfer = input.back_chamfer ?? false;

    // Chamfer geometry
    // For C×angle: width = C, depth = C × tan(angle)
    const angleRad = (angle * Math.PI) / 180;
    const chamferWidth = C;
    const chamferDepth = C * Math.tan(angleRad);

    // Effective cutting diameter depends on edge type
    let Deff: number;
    if (edgeType === "hole" && input.hole_diameter_mm) {
      // Cutting happens at bore diameter + 2× chamfer width
      Deff = input.hole_diameter_mm + 2 * chamferWidth;
    } else if (input.tool_diameter_mm) {
      // For edge chamfering, effective = tool diameter at cutting depth
      Deff = input.tool_diameter_mm;
    } else {
      // Default: assume chamfer mill, effective dia at cutting point
      Deff = Math.max(chamferWidth * 3, 6);
    }

    const toolDia = input.tool_diameter_mm ?? Deff;

    // For spot drills and chamfer mills, effective diameter is smaller
    // at the cutting point: Deff = Dtool - 2 × depth × tan(90 - angle)
    if (toolType === "chamfer_mill" || toolType === "spot_drill") {
      const tipAngle = toolType === "spot_drill" ? 90 : angle;
      Deff = Math.min(Deff, toolDia);
    }

    // Cutting speed and RPM at effective diameter
    const Vc = DEFAULT_VC[mat] ?? 80;
    const rpm = Deff > 0 ? r0((Vc * 1000) / (Math.PI * Deff)) : 1000;

    // Feed
    const fz = DEFAULT_FZ[mat] ?? 0.05;
    const feedRate = r1(fz * flutes * rpm);

    // Plunge depth: distance the tool needs to travel down
    const plungeDepth = toolType === "spot_drill"
      ? chamferDepth
      : chamferDepth + 0.1; // small overcut for clean edge

    // Tool path length
    let pathLength: number;
    if (edgeType === "hole" && input.hole_diameter_mm) {
      pathLength = Math.PI * (input.hole_diameter_mm + chamferWidth);
    } else if (edgeType === "od" && input.hole_diameter_mm) {
      pathLength = Math.PI * (input.hole_diameter_mm - chamferWidth);
    } else if (input.edge_length_mm) {
      pathLength = input.edge_length_mm;
    } else {
      pathLength = Math.PI * Deff;
    }

    // Cycle time per feature
    // = approach + plunge + contour + retract
    const approachTime = 5 / (feedRate > 0 ? feedRate : 1); // 5mm approach
    const plungeTime = plungeDepth / (feedRate * 0.5); // plunge at 50% feed
    const contourTime = feedRate > 0 ? pathLength / feedRate : 0;
    const retractTime = 0.02; // rapid retract
    const cycleTime = approachTime + plungeTime + contourTime + retractTime;

    // Recommended tool angle
    const recAngle = angle <= 30 ? 30
      : angle <= 45 ? 45
      : angle <= 60 ? 60 : 90;

    // Warnings
    if (C > 3 && toolType === "spot_drill") {
      warnings.push(
        "Large chamfer with spot drill — consider chamfer mill for better finish"
      );
    }
    if (backChamfer) {
      warnings.push(
        "Back-chamfer requires back-spotface tool, lollipop cutter, or 5-axis access"
      );
    }
    if (angle !== 45 && angle !== 60 && angle !== 30 && angle !== 90) {
      warnings.push(
        `Non-standard chamfer angle ${angle}° — verify tool availability`
      );
    }
    if (C > 5 && mat === "titanium") {
      warnings.push(
        "Large chamfer in titanium — use multiple passes to avoid heat buildup"
      );
    }
    if (edgeType === "hole" && input.hole_diameter_mm
      && toolDia > input.hole_diameter_mm) {
      warnings.push(
        "Tool larger than hole — cannot enter for chamfering"
      );
    }

    return {
      chamfer_width: av(r3(chamferWidth), "mm", 0.02,
        `Specified chamfer size`),
      chamfer_depth: av(r3(chamferDepth), "mm", 0.02,
        `C × tan(${angle}°)`),
      effective_cutting_diameter: av(r2(Deff), "mm", 0.1,
        edgeType === "hole"
          ? "Bore dia + 2× chamfer width"
          : "Tool diameter at cut point"),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} m/min at Deff=${r2(Deff)}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fz=${fz} × ${flutes} fl × ${rpm} rpm`),
      plunge_depth: av(r3(plungeDepth), "mm", 0.05,
        "Chamfer depth + clearance"),
      tool_path_length: av(r1(pathLength), "mm", 1,
        edgeType === "hole"
          ? "π × (hole_dia + chamfer)"
          : "Edge contour length"),
      cycle_time_per_feature: av(r3(cycleTime), "min", 0.01,
        "Approach + plunge + contour + retract"),
      recommended_tool_angle: av(recAngle, "deg", 0,
        `Nearest standard to ${angle}°`),
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

export const chamferEngine = new ChamferEngine();
