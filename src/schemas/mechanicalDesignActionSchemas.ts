/**
 * Mechanical Design Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const simpleCalc = z.object({ material: optStr }).passthrough();

export const MECHANICAL_DESIGN_ACTION_SCHEMAS: ActionSchemaMap = {
  ball_screw_calculate: z.object({ lead_mm: optPosNum, shaft_diameter_mm: optPosNum, load_n: optPosNum, speed_rpm: optPosNum }).passthrough(),
  ball_screw_select: z.object({ axial_load_n: optPosNum, speed_rpm: optPosNum, stroke_mm: optPosNum, accuracy_class: optStr }).passthrough(),
  bearing_select: z.object({ radial_load_n: optPosNum, axial_load_n: optPosNum, speed_rpm: optPosNum, bearing_type: optStr, life_hours: optPosNum }).passthrough(),
  belt_drive_calculate: z.object({ power_kw: optPosNum, driver_rpm: optPosNum, driven_rpm: optPosNum, belt_type: optStr }).passthrough(),
  bevel_gear_calculate: z.object({ module: optPosNum, teeth_pinion: z.number().int().optional(), teeth_gear: z.number().int().optional(), shaft_angle_deg: optNum }).passthrough(),
  bolt_torque_calculate: z.object({ bolt_size: optStr, grade: optStr, lubricated: z.boolean().optional(), clamp_load_n: optPosNum }).passthrough(),
  bolted_joint_calculate: z.object({ bolt_size: optStr, num_bolts: z.number().int().optional(), applied_load_n: optPosNum }).passthrough(),
  cam_design_calculate: z.object({ cam_type: optStr, follower_type: optStr, rise_mm: optPosNum, angle_deg: optNum }).passthrough(),
  cam_profile_calculate: z.object({ base_radius_mm: optPosNum, lift_mm: optPosNum, dwell_angle_deg: optNum }).passthrough(),
  chain_drive_calculate: z.object({ power_kw: optPosNum, driver_rpm: optPosNum, driven_rpm: optPosNum, chain_type: optStr }).passthrough(),
  clutch_design_calculate: z.object({ torque_nm: optPosNum, speed_rpm: optPosNum, clutch_type: optStr }).passthrough(),
  coupling_calculate: z.object({ torque_nm: optPosNum, shaft_diameter_mm: optPosNum, misalignment_deg: optNum }).passthrough(),
  coupling_select: z.object({ torque_nm: optPosNum, speed_rpm: optPosNum, coupling_type: optStr }).passthrough(),
  crankshaft_design: simpleCalc,
  flywheel_calculate: z.object({ energy_j: optPosNum, speed_rpm: optPosNum, speed_fluctuation_pct: optNum }).passthrough(),
  gasket_design_calculate: z.object({ bore_diameter_mm: optPosNum, bolt_circle_mm: optPosNum, pressure_mpa: optPosNum, gasket_type: optStr }).passthrough(),
  gear_train_calculate: z.object({ input_rpm: optPosNum, output_rpm: optPosNum, stages: z.number().int().optional() }).passthrough(),
  harmonic_drive_calculate: z.object({ gear_ratio: optPosNum, input_speed_rpm: optPosNum, torque_nm: optPosNum }).passthrough(),
  hypoid_gear_calculate: z.object({ module: optPosNum, teeth_pinion: z.number().int().optional(), offset_mm: optPosNum }).passthrough(),
  journal_bearing_calculate: z.object({ shaft_diameter_mm: optPosNum, bearing_length_mm: optPosNum, load_n: optPosNum, speed_rpm: optPosNum, oil_viscosity: optPosNum }).passthrough(),
  keyway_design_calculate: z.object({ shaft_diameter_mm: optPosNum, torque_nm: optPosNum }).passthrough(),
  keyway_stress_calculate: z.object({ shaft_diameter_mm: optPosNum, key_width_mm: optPosNum, key_height_mm: optPosNum, torque_nm: optPosNum }).passthrough(),
  lead_screw_calculate: z.object({ lead_mm: optPosNum, diameter_mm: optPosNum, load_n: optPosNum }).passthrough(),
  leaf_spring_calculate: z.object({ load_n: optPosNum, span_mm: optPosNum, width_mm: optPosNum, thickness_mm: optPosNum, num_leaves: z.number().int().optional() }).passthrough(),
  linear_guide_calculate: z.object({ load_n: optPosNum, speed_mpm: optPosNum, stroke_mm: optPosNum }).passthrough(),
  linear_motion_calculate: z.object({ mass_kg: optPosNum, acceleration_mps2: optPosNum, friction_coeff: optNum }).passthrough(),
  planetary_gear_calculate: z.object({ sun_teeth: z.number().int().optional(), ring_teeth: z.number().int().optional(), planet_teeth: z.number().int().optional() }).passthrough(),
  rack_pinion_calculate: z.object({ module: optPosNum, pinion_teeth: z.number().int().optional(), force_n: optPosNum }).passthrough(),
  rolling_bearing_calculate: z.object({ bearing_type: optStr, load_n: optPosNum, speed_rpm: optPosNum }).passthrough(),
  rolling_contact_calculate: z.object({ contact_force_n: optPosNum, radius1_mm: optPosNum, radius2_mm: optPosNum }).passthrough(),
  seal_select: z.object({ shaft_diameter_mm: optPosNum, speed_rpm: optPosNum, pressure_mpa: optPosNum, fluid_type: optStr }).passthrough(),
  shaft_alignment_calculate: z.object({ coupling_type: optStr, distance_mm: optPosNum }).passthrough(),
  shock_absorber_calculate: z.object({ mass_kg: optPosNum, velocity_mps: optPosNum, stroke_mm: optPosNum }).passthrough(),
  spline_joint_calculate: z.object({ shaft_diameter_mm: optPosNum, num_splines: z.number().int().optional(), torque_nm: optPosNum }).passthrough(),
  spline_stress_calculate: z.object({ shaft_diameter_mm: optPosNum, torque_nm: optPosNum, length_mm: optPosNum }).passthrough(),
  spring_calculate: z.object({ spring_type: optStr, load_n: optPosNum, deflection_mm: optPosNum, wire_diameter_mm: optPosNum }).passthrough(),
  spring_design: z.object({ load_n: optPosNum, deflection_mm: optPosNum, material: optStr, spring_type: optStr }).passthrough(),
  torsion_bar_calculate: z.object({ diameter_mm: optPosNum, length_mm: optPosNum, torque_nm: optPosNum, material: optStr }).passthrough(),
  worm_gear_calculate: z.object({ module: optPosNum, worm_starts: z.number().int().optional(), gear_teeth: z.number().int().optional(), lead_angle_deg: optNum }).passthrough(),
  disk_brake_calculate: z.object({ torque_nm: optPosNum, rotor_diameter_mm: optPosNum, pad_area_mm2: optPosNum }).passthrough(),
  drum_brake_calculate: z.object({ torque_nm: optPosNum, drum_diameter_mm: optPosNum }).passthrough(),
  rivet_joint_calculate: z.object({ rivet_diameter_mm: optPosNum, num_rivets: z.number().int().optional(), load_n: optPosNum }).passthrough(),
  flange_bolt_calculate: z.object({ flange_diameter_mm: optPosNum, pressure_mpa: optPosNum, num_bolts: z.number().int().optional() }).passthrough(),
  cycloid_drive_calculate: z.object({ gear_ratio: optPosNum, input_speed_rpm: optPosNum }).passthrough(),
  connecting_rod_calculate: simpleCalc,
  piston_design_calculate: simpleCalc,
  screw_jack_calculate: z.object({ load_n: optPosNum, lead_mm: optPosNum, handle_length_mm: optPosNum }).passthrough(),
  gear_pump_calculate: z.object({ displacement_cc: optPosNum, speed_rpm: optPosNum, pressure_bar: optPosNum }).passthrough(),
  clutch_brake_calculate: z.object({ torque_nm: optPosNum, speed_rpm: optPosNum }).passthrough(),
  hertz_contact_calculate: z.object({ force_n: optPosNum, radius1_mm: optPosNum, radius2_mm: optPosNum, e1_gpa: optPosNum, e2_gpa: optPosNum }).passthrough(),
  column_buckling_calculate: z.object({ length_mm: optPosNum, cross_section_mm2: optPosNum, moment_of_inertia_mm4: optPosNum, material: optStr, end_condition: optStr }).passthrough(),
};
