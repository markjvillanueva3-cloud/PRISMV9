/**
 * Mechanical Design Calculator Types
 * Types for prism_mechanical dispatcher actions
 */

// Common result structure
export interface MechanicalResult<T = unknown> {
  result: T;
  safety?: {
    score: number;
    warnings: string[];
  };
  meta?: {
    formula_used: string;
    uncertainty?: number;
  };
}

// ─── Gear Calculations ─────────────────────────────────────────────────────

export interface GearParams {
  gear_type: 'spur' | 'bevel' | 'worm' | 'planetary' | 'hypoid' | 'rack_pinion' | 'harmonic';
  module?: number;
  teeth_pinion?: number;
  teeth_gear?: number;
  pressure_angle?: number;
  helix_angle?: number;
  face_width?: number;
  power_kw?: number;
  rpm?: number;
  material?: string;
}

export interface GearResult {
  pitch_diameter: number;
  center_distance: number;
  gear_ratio: number;
  contact_ratio: number;
  tooth_forces: {
    tangential: number;
    radial: number;
    axial: number;
  };
  stress: {
    bending: number;
    contact: number;
  };
  safety_factors: {
    bending: number;
    pitting: number;
  };
  efficiency: number;
  warnings: string[];
}

// ─── Bearing Calculations ──────────────────────────────────────────────────

export interface BearingParams {
  bearing_type: 'ball' | 'roller' | 'needle' | 'thrust' | 'journal';
  bore_diameter?: number;
  radial_load?: number;
  axial_load?: number;
  rpm?: number;
  life_hours?: number;
  lubrication?: string;
  temperature?: number;
}

export interface BearingResult {
  selected_bearing?: string;
  dynamic_capacity: number;
  static_capacity: number;
  calculated_life_hours: number;
  reliability: number;
  friction_torque: number;
  power_loss: number;
  temperature_rise: number;
  warnings: string[];
}

// ─── Spring Calculations ───────────────────────────────────────────────────

export interface SpringParams {
  spring_type: 'compression' | 'extension' | 'torsion' | 'leaf';
  wire_diameter?: number;
  mean_diameter?: number;
  free_length?: number;
  active_coils?: number;
  material?: string;
  load?: number;
  deflection?: number;
}

export interface SpringResult {
  spring_rate: number;
  stress: number;
  deflection: number;
  solid_length: number;
  buckling_check: boolean;
  fatigue_life: number;
  natural_frequency: number;
  safety_factor: number;
  warnings: string[];
}

// ─── Shaft Calculations ────────────────────────────────────────────────────

export interface ShaftParams {
  diameter?: number;
  length?: number;
  material?: string;
  torque?: number;
  bending_moment?: number;
  axial_load?: number;
  rpm?: number;
  keyway?: boolean;
  spline?: boolean;
}

export interface ShaftResult {
  von_mises_stress: number;
  shear_stress: number;
  deflection: number;
  critical_speed: number;
  safety_factor: number;
  fatigue_safety_factor: number;
  keyway_stress?: number;
  warnings: string[];
}

// ─── Fastener Calculations ─────────────────────────────────────────────────

export interface FastenerParams {
  fastener_type: 'bolt' | 'rivet' | 'screw';
  size?: string;
  grade?: string;
  clamped_length?: number;
  preload?: number;
  external_load?: number;
  joint_stiffness?: number;
  friction_coefficient?: number;
}

export interface FastenerResult {
  proof_load: number;
  tensile_strength: number;
  required_torque: number;
  bolt_stress: number;
  joint_separation_load: number;
  fatigue_safety_factor: number;
  safety_factor: number;
  warnings: string[];
}

// ─── Coupling Calculations ─────────────────────────────────────────────────

export interface CouplingParams {
  coupling_type: 'rigid' | 'flexible' | 'universal' | 'fluid';
  torque?: number;
  rpm?: number;
  misalignment_angular?: number;
  misalignment_parallel?: number;
  shaft_diameter?: number;
}

export interface CouplingResult {
  selected_coupling?: string;
  rated_torque: number;
  max_rpm: number;
  service_factor: number;
  allowable_misalignment: {
    angular: number;
    parallel: number;
    axial: number;
  };
  warnings: string[];
}

// ─── Brake Calculations ────────────────────────────────────────────────────

export interface BrakeParams {
  brake_type: 'disk' | 'drum' | 'band';
  torque_required?: number;
  rpm?: number;
  coefficient_friction?: number;
  disk_diameter?: number;
  pad_area?: number;
  cooling?: 'air' | 'oil' | 'water';
}

export interface BrakeResult {
  braking_torque: number;
  clamping_force: number;
  pad_pressure: number;
  heat_generated: number;
  temperature_rise: number;
  fade_margin: number;
  wear_life: number;
  warnings: string[];
}

// ─── Drivetrain Calculations ───────────────────────────────────────────────

export interface DrivetrainParams {
  component_type: 'belt' | 'chain' | 'cam' | 'leadscrew' | 'ballscrew' | 'linear_guide';
  power?: number;
  rpm_input?: number;
  ratio?: number;
  center_distance?: number;
  load?: number;
  speed?: number;
}

export interface DrivetrainResult {
  selected_size?: string;
  efficiency: number;
  service_life: number;
  safety_factor: number;
  positioning_accuracy?: number;
  backlash?: number;
  warnings: string[];
}

// ─── Category groupings for UI ─────────────────────────────────────────────

export interface MechanicalCategory {
  path: string;
  name: string;
  description: string;
  actions: string[];
}

export const MECHANICAL_CATEGORIES: MechanicalCategory[] = [
  { path: '/gear', name: 'Gears', description: 'Spur, bevel, worm, planetary, and more', actions: ['bevel_gear_calculate', 'worm_gear_calculate', 'planetary_gear_calculate', 'gear_train_calculate', 'hypoid_gear_calculate', 'rack_pinion_calculate', 'harmonic_drive_calculate'] },
  { path: '/bearing', name: 'Bearings', description: 'Ball, roller, journal, and rolling contact', actions: ['bearing_select', 'rolling_bearing_calculate', 'journal_bearing_calculate', 'rolling_contact_calculate'] },
  { path: '/spring', name: 'Springs', description: 'Compression, extension, torsion, and leaf', actions: ['spring_calculate', 'spring_design', 'leaf_spring_calculate', 'torsion_bar_calculate'] },
  { path: '/shaft', name: 'Shafts', description: 'Alignment, keyways, splines, and crankshafts', actions: ['shaft_alignment_calculate', 'keyway_design_calculate', 'keyway_stress_calculate', 'spline_joint_calculate', 'spline_stress_calculate', 'crankshaft_design'] },
  { path: '/fastener', name: 'Fasteners', description: 'Bolts, rivets, and flange connections', actions: ['bolt_torque_calculate', 'bolted_joint_calculate', 'rivet_joint_calculate', 'flange_bolt_calculate'] },
  { path: '/coupling', name: 'Couplings', description: 'Couplings, clutches, and power transmission', actions: ['coupling_calculate', 'coupling_select', 'clutch_design_calculate', 'clutch_brake_calculate'] },
  { path: '/brake', name: 'Brakes', description: 'Disk brakes, drum brakes, shock absorbers', actions: ['disk_brake_calculate', 'drum_brake_calculate', 'shock_absorber_calculate'] },
  { path: '/drivetrain', name: 'Drivetrain', description: 'Belts, chains, cams, screws, linear motion', actions: ['belt_drive_calculate', 'chain_drive_calculate', 'cam_design_calculate', 'cam_profile_calculate', 'lead_screw_calculate', 'ball_screw_calculate', 'ball_screw_select', 'linear_guide_calculate', 'linear_motion_calculate', 'cycloid_drive_calculate', 'screw_jack_calculate', 'gear_pump_calculate'] },
  { path: '/structural', name: 'Structural', description: 'Flywheels, gaskets, seals, contact mechanics', actions: ['flywheel_calculate', 'gasket_design_calculate', 'seal_select', 'connecting_rod_calculate', 'piston_design_calculate', 'hertz_contact_calculate', 'column_buckling_calculate'] },
];
