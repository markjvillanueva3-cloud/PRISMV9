/**
 * GearHobbingEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates gear hobbing parameters for spur and helical gears.
 * Models: hob-gear kinematics, shift strategy, cycle time,
 * and surface finish prediction.
 *
 * Covers: conventional hobbing, climb hobbing, diagonal hobbing,
 * and multi-cut strategies (rough + finish).
 *
 * Actions: hobbing_calc, hobbing_shift, hobbing_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type HobbingMethod = "conventional" | "climb" | "diagonal";

export interface GearHobbingInput {
  num_teeth: number;
  module_mm: number;                  // metric module
  pressure_angle_deg: number;         // typically 20°
  helix_angle_deg: number;            // 0 for spur gears
  face_width_mm: number;
  hob_diameter_mm: number;
  hob_num_starts: number;             // 1-3
  hob_num_gashes: number;             // flute count
  hobbing_method: HobbingMethod;
  axial_feed_mm_per_rev: number;      // per workpiece revolution
  hob_rpm: number;
  num_cuts: number;                   // 1 = single cut, 2 = rough + finish
  stock_allowance_mm?: number;        // for finish cut
}

export interface GearHobbingResult {
  workpiece_rpm: number;
  gear_ratio: number;                 // hob:workpiece speed ratio
  cutting_speed_m_per_min: number;
  axial_feed_rate_mm_per_min: number;
  cycle_time_sec: number;
  total_hob_travel_mm: number;
  approach_distance_mm: number;
  overtravel_mm: number;
  scallop_height_um: number;          // theoretical surface roughness
  hob_shift_increment_mm: number;
  shifts_per_hob_life: number;
  recommendations: string[];
}

export interface HobbingShiftPlan {
  total_shift_range_mm: number;
  shift_per_part: number;
  parts_per_shift_position: number;
  total_parts_per_hob: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class GearHobbingEngine {
  calculate(input: GearHobbingInput): GearHobbingResult {
    // Gear ratio: hob starts / gear teeth
    const gearRatio = input.hob_num_starts / input.num_teeth;
    const workpieceRpm = input.hob_rpm * gearRatio;

    // Cutting speed
    const cuttingSpeed = Math.PI * input.hob_diameter_mm * input.hob_rpm / 1000;

    // Approach and overtravel
    // Approach = sqrt(hob_dia * DOC) where DOC = 2.25 * module for full depth
    const fullDepth = 2.25 * input.module_mm;
    const approach = Math.sqrt(input.hob_diameter_mm * fullDepth);
    const overtravel = approach * 0.5; // typically half of approach

    // Total axial travel
    // For helical gears, face width increases by helix correction
    const helixRad = input.helix_angle_deg * Math.PI / 180;
    const effectiveFaceWidth = input.face_width_mm + (helixRad > 0 ? input.hob_diameter_mm * Math.sin(helixRad) : 0);
    const totalTravel = approach + effectiveFaceWidth + overtravel;

    // Axial feed rate
    const axialFeedRate = input.axial_feed_mm_per_rev * workpieceRpm;

    // Cycle time
    const cycleTime = totalTravel / axialFeedRate * 60; // seconds
    const totalCycleTime = cycleTime * input.num_cuts;

    // Scallop height (theoretical surface roughness)
    // h = f^2 / (8 * R_hob) where f = axial feed per gash
    const feedPerGash = input.axial_feed_mm_per_rev / input.hob_num_gashes;
    const hobRadius = input.hob_diameter_mm / 2;
    const scallopHeight = (feedPerGash ** 2) / (8 * hobRadius) * 1000; // µm

    // Hob shift planning
    // Shift increment: typically 1-2 gashes worth of shift
    const shiftIncrement = input.hob_diameter_mm * Math.PI / input.hob_num_gashes * 0.8;
    const usableHobLength = input.hob_diameter_mm * Math.PI * 0.6; // ~60% of circumference usable
    const shiftsPerLife = Math.floor(usableHobLength / shiftIncrement);

    // Recommendations
    const recs: string[] = [];
    if (cuttingSpeed > 200) recs.push("High cutting speed — verify hob coating (TiAlN recommended)");
    if (cuttingSpeed < 30) recs.push("Low cutting speed — consider increasing hob RPM for productivity");
    if (scallopHeight > 10) recs.push(`Scallop height ${scallopHeight.toFixed(1)}µm — reduce axial feed or add finish pass`);
    if (input.hob_num_starts > 1 && input.num_teeth % input.hob_num_starts === 0) {
      recs.push("Gear teeth divisible by hob starts — all teeth cut by same gash (hunting tooth issue)");
    }
    if (input.hobbing_method === "conventional" && input.module_mm > 4) {
      recs.push("Climb hobbing recommended for module >4mm — better chip evacuation and tool life");
    }
    if (recs.length === 0) recs.push("Hobbing parameters acceptable — proceed");

    return {
      workpiece_rpm: Math.round(workpieceRpm * 100) / 100,
      gear_ratio: Math.round(gearRatio * 10000) / 10000,
      cutting_speed_m_per_min: Math.round(cuttingSpeed * 10) / 10,
      axial_feed_rate_mm_per_min: Math.round(axialFeedRate * 10) / 10,
      cycle_time_sec: Math.round(totalCycleTime * 10) / 10,
      total_hob_travel_mm: Math.round(totalTravel * 10) / 10,
      approach_distance_mm: Math.round(approach * 10) / 10,
      overtravel_mm: Math.round(overtravel * 10) / 10,
      scallop_height_um: Math.round(scallopHeight * 10) / 10,
      hob_shift_increment_mm: Math.round(shiftIncrement * 100) / 100,
      shifts_per_hob_life: shiftsPerLife,
      recommendations: recs,
    };
  }

  shiftPlan(input: GearHobbingInput, partsPerShift: number): HobbingShiftPlan {
    const result = this.calculate(input);
    const totalRange = result.hob_shift_increment_mm * result.shifts_per_hob_life;
    return {
      total_shift_range_mm: Math.round(totalRange * 10) / 10,
      shift_per_part: Math.round(result.hob_shift_increment_mm / partsPerShift * 1000) / 1000,
      parts_per_shift_position: partsPerShift,
      total_parts_per_hob: partsPerShift * result.shifts_per_hob_life,
    };
  }
}

export const gearHobbingEngine = new GearHobbingEngine();
