/**
 * LiveToolingEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates parameters for live (driven) tooling on CNC lathes.
 * Models: milling on turret, cross-drilling, off-center operations,
 * Y-axis milling, and angular milling with C-axis interpolation.
 *
 * Actions: live_tool_calc, live_tool_power, live_tool_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type LiveToolOp = "cross_drill" | "axial_drill" | "cross_mill" | "axial_mill" | "polygon_turn" | "keyway" | "flat_mill";

export interface LiveToolInput {
  operation: LiveToolOp;
  tool_diameter_mm: number;
  num_flutes: number;
  live_tool_rpm: number;
  workpiece_diameter_mm: number;
  // Milling parameters
  depth_of_cut_mm: number;
  width_of_cut_mm?: number;
  feed_per_tooth_mm: number;
  // For cross operations
  c_axis_interpolation: boolean;      // using C-axis for contouring
  y_axis_available: boolean;
  // Machine limits
  max_live_tool_rpm: number;
  live_tool_power_kW: number;
}

export interface LiveToolResult {
  feed_rate_mm_per_min: number;
  material_removal_rate_mm3_per_min: number;
  required_power_kW: number;
  power_utilization_pct: number;
  cutting_speed_m_per_min: number;
  c_axis_feed_deg_per_min?: number;
  cycle_time_estimate_sec: number;
  torque_Nm: number;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LiveToolingEngine {
  calculate(input: LiveToolInput): LiveToolResult {
    const d = input.tool_diameter_mm;
    const Z = input.num_flutes;
    const rpm = input.live_tool_rpm;

    // Cutting speed
    const Vc = Math.PI * d * rpm / 1000;

    // Feed rate
    const feedRate = input.feed_per_tooth_mm * Z * rpm;

    // Width of cut (default to tool diameter for slotting)
    const ae = input.width_of_cut_mm || d;

    // MRR
    const mrr = input.depth_of_cut_mm * ae * feedRate;

    // Power estimate (using specific cutting energy ~1.5 N/mm² for steel)
    const kc = 1500; // N/mm²
    const power = (kc * mrr) / (60 * 1e6); // kW

    // Torque
    const torque = power > 0 && rpm > 0 ? (power * 1000 * 60) / (2 * Math.PI * rpm) : 0;

    // Power utilization
    const powerUtil = input.live_tool_power_kW > 0 ? (power / input.live_tool_power_kW) * 100 : 0;

    // C-axis feed for cross milling on diameter
    let cAxisFeed: number | undefined;
    if (input.c_axis_interpolation && input.workpiece_diameter_mm > 0) {
      // Linear feed on workpiece surface → angular C-axis feed
      const circumference = Math.PI * input.workpiece_diameter_mm;
      cAxisFeed = (feedRate / circumference) * 360;
    }

    // Cycle time estimate
    let cycleTime: number;
    if (input.operation === "cross_drill" || input.operation === "axial_drill") {
      // Drill: time = depth / (feed_per_rev * rpm)
      const feedPerRev = input.feed_per_tooth_mm * Z;
      cycleTime = input.depth_of_cut_mm / (feedPerRev * rpm / 60);
    } else if (input.operation === "polygon_turn") {
      // Polygon: one revolution of workpiece
      cycleTime = 60 / rpm * 2; // 2 revolutions typical
    } else {
      // Milling: length / feed rate
      const length = input.width_of_cut_mm || input.workpiece_diameter_mm;
      cycleTime = length / feedRate * 60;
    }

    // Recommendations
    const recs: string[] = [];
    if (powerUtil > 90) {
      recs.push("Live tool power >90% utilized — reduce depth of cut or feed");
    }
    if (powerUtil > 100) {
      recs.push(`OVERLOAD: Required ${power.toFixed(2)}kW exceeds live tool capacity ${input.live_tool_power_kW}kW`);
    }
    if (!input.y_axis_available && (input.operation === "flat_mill" || input.operation === "keyway")) {
      recs.push("Y-axis not available — flat milling requires C-axis interpolation (slower, less accurate)");
    }
    if (input.live_tool_rpm > input.max_live_tool_rpm) {
      recs.push(`Requested RPM ${input.live_tool_rpm} exceeds max ${input.max_live_tool_rpm}`);
    }
    if (rpm < 500 && d < 10) {
      recs.push("Low RPM for small tool — increase to improve surface finish");
    }
    if (recs.length === 0) {
      recs.push("Live tooling parameters acceptable — proceed");
    }

    return {
      feed_rate_mm_per_min: Math.round(feedRate * 10) / 10,
      material_removal_rate_mm3_per_min: Math.round(mrr * 10) / 10,
      required_power_kW: Math.round(power * 1000) / 1000,
      power_utilization_pct: Math.round(powerUtil * 10) / 10,
      cutting_speed_m_per_min: Math.round(Vc * 10) / 10,
      c_axis_feed_deg_per_min: cAxisFeed ? Math.round(cAxisFeed * 10) / 10 : undefined,
      cycle_time_estimate_sec: Math.round(cycleTime * 10) / 10,
      torque_Nm: Math.round(torque * 100) / 100,
      recommendations: recs,
    };
  }
}

export const liveToolingEngine = new LiveToolingEngine();
