/**
 * Fluid & Thermal Dispatcher Action Schemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const simpleCalc = z.object({}).passthrough();

export const FLUID_THERMAL_ACTION_SCHEMAS: ActionSchemaMap = {
  heat_exchanger_calculate: z.object({ type: z.enum(["shell_tube", "plate", "double_pipe", "finned_tube"]).optional(), hot_inlet_c: optNum, hot_outlet_c: optNum, cold_inlet_c: optNum, flow_rate_kgps: optPosNum }).passthrough(),
  heat_exchanger_plate_calculate: simpleCalc,
  pump_select: z.object({ flow_rate_lpm: optPosNum, head_m: optPosNum, fluid: optStr, pump_type: optStr }).passthrough(),
  centrifugal_pump_calculate: z.object({ flow_rate_lpm: optPosNum, head_m: optPosNum, speed_rpm: optPosNum, impeller_diameter_mm: optPosNum }).passthrough(),
  pipe_sizing_calculate: z.object({ flow_rate_lpm: optPosNum, fluid: optStr, velocity_mps: optPosNum, pipe_material: optStr }).passthrough(),
  pipe_stress_calculate: z.object({ pipe_od_mm: optPosNum, wall_thickness_mm: optPosNum, pressure_mpa: optPosNum, temperature_c: optNum }).passthrough(),
  piping_pressure_calculate: z.object({ pipe_length_m: optPosNum, pipe_diameter_mm: optPosNum, flow_rate_lpm: optPosNum, fluid: optStr }).passthrough(),
  hydraulic_cylinder_calculate: z.object({ bore_diameter_mm: optPosNum, rod_diameter_mm: optPosNum, stroke_mm: optPosNum, pressure_bar: optPosNum }).passthrough(),
  hydraulic_motor_calculate: z.object({ displacement_cc: optPosNum, pressure_bar: optPosNum, speed_rpm: optPosNum }).passthrough(),
  hydraulic_press_calculate: z.object({ force_kn: optPosNum, cylinder_diameter_mm: optPosNum, pressure_bar: optPosNum }).passthrough(),
  pneumatic_cylinder_calculate: z.object({ bore_diameter_mm: optPosNum, stroke_mm: optPosNum, pressure_bar: optPosNum, load_n: optPosNum }).passthrough(),
  valve_design_calculate: z.object({ valve_type: optStr, flow_rate_lpm: optPosNum, pressure_bar: optPosNum }).passthrough(),
  valve_sizing_calculate: z.object({ cv_required: optPosNum, pressure_drop_bar: optPosNum, fluid: optStr }).passthrough(),
  compressor_design_calculate: simpleCalc,
  fan_select: z.object({ flow_rate_cmh: optPosNum, static_pressure_pa: optPosNum, fan_type: optStr }).passthrough(),
  nozzle_calculate: z.object({ flow_rate_lpm: optPosNum, pressure_bar: optPosNum, orifice_diameter_mm: optPosNum }).passthrough(),
  cooling_tower_calculate: simpleCalc,
  condenser_calculate: simpleCalc,
  evaporator_calculate: simpleCalc,
  venturi_calculate: z.object({ pipe_diameter_mm: optPosNum, throat_diameter_mm: optPosNum, flow_rate_lpm: optPosNum }).passthrough(),
  orifice_flowmeter_calculate: z.object({ pipe_diameter_mm: optPosNum, orifice_diameter_mm: optPosNum, differential_pressure_pa: optPosNum }).passthrough(),
  air_compressor_calculate: z.object({ flow_rate_cmm: optPosNum, pressure_bar: optPosNum, compressor_type: optStr }).passthrough(),
  air_duct_calculate: z.object({ flow_rate_cmh: optPosNum, duct_width_mm: optPosNum, duct_height_mm: optPosNum, length_m: optPosNum }).passthrough(),
  blower_calculate: simpleCalc,
  tank_design_calculate: z.object({ volume_liters: optPosNum, pressure_bar: optPosNum, material: optStr }).passthrough(),
  water_hammer_calculate: z.object({ pipe_length_m: optPosNum, flow_velocity_mps: optPosNum, pipe_diameter_mm: optPosNum }).passthrough(),
  furnace_heating_calculate: z.object({ target_temp_c: optPosNum, mass_kg: optPosNum, material: optStr }).passthrough(),
  absorption_chiller_calculate: simpleCalc,
  accumulator_calculate: z.object({ gas_precharge_bar: optPosNum, max_pressure_bar: optPosNum, volume_liters: optPosNum }).passthrough(),
  boiler_tube_calculate: simpleCalc,
  thermal_expansion_joint_calculate: z.object({ pipe_length_m: optPosNum, temperature_change_c: optNum, pipe_material: optStr }).passthrough(),
  thermal_fatigue_calculate: z.object({ temperature_range_c: optNum, cycles: z.number().int().optional(), material: optStr }).passthrough(),
  corrosion_rate_calculate: z.object({ material: optStr, environment: optStr, temperature_c: optNum }).passthrough(),
  creep_life_calculate: z.object({ stress_mpa: optPosNum, temperature_c: optPosNum, material: optStr }).passthrough(),
  fracture_toughness_calculate: z.object({ crack_length_mm: optPosNum, stress_mpa: optPosNum, geometry: optStr }).passthrough(),
  coriolis_flowmeter_calculate: z.object({ flow_rate_kg_h: optPosNum, pipe_diameter_mm: optPosNum, fluid_density_kg_m3: optPosNum, tube_config: optStr }).passthrough(),
  diaphragm_pump_calculate: z.object({ diaphragm_diameter_mm: optPosNum, stroke_mm: optPosNum, speed_spm: optPosNum, diaphragm_type: optStr }).passthrough(),
  diffuser_calculate: z.object({ inlet_diameter_mm: optPosNum, outlet_diameter_mm: optPosNum, length_mm: optPosNum, inlet_velocity_m_s: optPosNum }).passthrough(),
  ejector_calculate: z.object({ motive_pressure_bar: optPosNum, suction_pressure_bar: optPosNum, discharge_pressure_bar: optPosNum }).passthrough(),
  impeller_calculate: z.object({ flow_rate_m3_s: optPosNum, speed_rpm: optPosNum, impeller_type: optStr, blade_count: z.number().int().optional() }).passthrough(),
  reciprocating_compressor_calculate: z.object({ bore_mm: optPosNum, stroke_mm: optPosNum, speed_rpm: optPosNum, num_stages: z.number().int().optional() }).passthrough(),
  rtd_calculate: z.object({ element: optStr, measured_resistance_ohm: optPosNum, measured_temperature_C: optNum, wire_config: optStr }).passthrough(),
  screw_compressor_calculate: z.object({ flow_rate_m3_min: optPosNum, discharge_pressure_bar: optPosNum, cooling_type: optStr }).passthrough(),
  scroll_compressor_calculate: z.object({ suction_pressure_bar: optPosNum, discharge_pressure_bar: optPosNum, displacement_cc: optPosNum, refrigerant: optStr }).passthrough(),
  spray_dryer_calculate: z.object({ feed_rate_kg_h: optPosNum, feed_solids_pct: optPosNum, inlet_air_temp_C: optPosNum, atomizer_type: optStr }).passthrough(),
  thermocouple_calculate: z.object({ tc_type: optStr, measured_voltage_mV: optNum, measured_temperature_C: optNum, cold_junction_temp_C: optNum }).passthrough(),
  ultrasonic_flowmeter_calculate: z.object({ pipe_diameter_mm: optPosNum, flow_velocity_m_s: optPosNum, mode: optStr, mount_type: optStr }).passthrough(),
  vane_pump_calculate: z.object({ rotor_diameter_mm: optPosNum, cam_ring_diameter_mm: optPosNum, vane_width_mm: optPosNum, speed_rpm: optPosNum }).passthrough(),
};
