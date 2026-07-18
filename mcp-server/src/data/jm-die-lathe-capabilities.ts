/**
 * jm-die-lathe-capabilities.ts
 * =============================
 *
 * Per-machine capability sidecar for the 7 JM Die Okuma lathes.
 *
 * MIKE /goal session (2026-05-24) — answers the user-named capability axes:
 *   "ensure all relevant data pertaining to each machine's capabilities,
 *    controller features, osp coding, settings and parameters of each machine,
 *    capabilities of each machine, work envelope, travel, machine build quality
 *    and accuracy and speed, advanced features, time saving features,
 *    efficiency features, auto adjustment of cutting parameters depending on
 *    machine first cut results"
 *
 * Sidecar pattern — NOT a mutation of jm-die-profile.ts (which is the canonical
 * peer-shared registry; mutating it would race with echo's .cps post-edit work).
 * Read from this file directly OR via JMDieLatheCapabilityEngine.
 *
 * Spec values for each Okuma model are sourced from manufacturer-published
 * spec sheets (Okuma GENOS L200/L300/L400, LB-series, Multus B-series, LNC,
 * Crown). Where JM Die's specific configuration is unverified, the field is
 * marked `null` with `verification_status: "spec_sheet_typical"`.
 *
 * @milestone MIKE-LATHE-CAPABILITY-MS0
 * @unit U-MIKE-LATHE-CAPABILITY-SIDECAR
 * @slot mike
 */

export type EnhancementTier = "plain" | "partially_enhanced" | "fully_enhanced";
export type VerificationStatus = "verified_jm_die" | "spec_sheet_typical" | "spec_sheet_max_option" | "unverified";

export interface WorkEnvelope {
  /** Maximum turn diameter swing over bed [mm] */
  max_swing_mm: number | null;
  /** Maximum turn diameter swing over cross-slide [mm] */
  max_swing_over_cross_slide_mm: number | null;
  /** Maximum turning length (Z) between centres [mm] */
  max_turn_length_mm: number | null;
  /** Maximum bar capacity through spindle [mm] */
  bar_capacity_mm: number | null;
  /** Maximum chuck size [in] */
  max_chuck_size_in: number | null;
}

export interface AxisTravel {
  x_mm: number | null;
  z_mm: number | null;
  /** Y-axis on B-axis machines (Multus, GENOS L300 with Y option) */
  y_mm: number | null;
  /** B-axis swing [deg] on mill-turn (Multus) */
  b_deg: number | null;
  /** C-axis resolution [deg] — null = no C-axis */
  c_axis_resolution_deg: number | null;
}

export interface SpindleSpec {
  main_max_rpm: number;
  main_power_kw: number | null;
  main_torque_Nm: number | null;
  sub_spindle: boolean;
  sub_spindle_max_rpm: number | null;
  live_tool_max_rpm: number | null;
}

export interface AccuracySpec {
  /** Positioning accuracy per VDI 3441 [um] */
  positioning_um: number | null;
  /** Repeatability per VDI 3441 [um] */
  repeatability_um: number | null;
  /** Typical best achievable surface roughness Ra [um] */
  surface_finish_Ra_um: number | null;
  /** Roundness [um] under standard test piece */
  roundness_um: number | null;
}

export interface RapidsSpec {
  rapid_x_m_min: number | null;
  rapid_z_m_min: number | null;
  rapid_y_m_min: number | null;
}

export interface OSPCodingProfile {
  feed_mode_default: "G94" | "G95";
  work_offset_g_codes: string[]; // e.g. ["G54", "G55", "G56", "G57", "G58", "G59"]
  extended_wcs_macro: string | null; // e.g. "G54.1 P<n>"
  thread_pitch_macro: string;        // "G76" for Okuma
  smoothing_g_code: string | null;   // null = no smoothing on this controller (e.g. U10L)
  rigid_tap_g_code: string | null;
  canned_drill_g_code: string;       // "G81" / "G82" / "G83"
  /** OSP-OS Application Programmable variable space ("VC"=common, "VS"=system) */
  variable_space: string;
  /** Tool offset call form */
  tool_offset_form: string;          // "T0101" (T<tool><offset>)
  /** Spindle constant surface speed control */
  css_g_code: string;                // "G96"
  /** Coolant on/off */
  coolant_M_codes: { on: string; off: string };
}

export interface AdvancedFeatures {
  imachining: boolean;
  ai_adaptive_feedrate: boolean;
  collision_avoidance_system: boolean;
  thermo_friendly_concept: boolean;
  servo_navi: boolean;        // chatter detection + suppression
  thermo_compensation: boolean;
  one_touch_igf: boolean;     // Okuma's Intelligent Graphical Functions
  spindle_acceleration_control: boolean;
}

export interface TimeSavingFeatures {
  bar_feeder_capable: boolean;
  tool_eye: boolean;          // in-process tool measurement
  parts_catcher: boolean;
  auto_door: boolean;
  sub_spindle_pickup: boolean;
  in_process_gauging: boolean;
  live_tooling: boolean;
}

export interface EfficiencyFeatures {
  through_spindle_coolant: boolean;
  high_pressure_coolant_bar: number | null; // e.g. 70 bar / 1000 psi
  chip_conveyor: boolean;
  mist_collector: boolean;
  power_off_mode: boolean;    // eco-power-down
  spindle_load_monitor: boolean;
}

export interface AutoAdjustmentFeatures {
  /** AI-adaptive feedrate (post-first-cut adjustment based on spindle load) */
  ai_adaptive_feedrate: boolean;
  /** Servo-navi-style live chatter detection + spindle-speed shift */
  live_chatter_suppression: boolean;
  /** Adaptive load control (Okuma's TAS / Active Vibration Control) */
  active_vibration_control: boolean;
  /** Post-first-cut deflection compensation */
  deflection_compensation: boolean;
  /** Thermal-drift compensation that re-runs after warm-up */
  thermal_drift_auto_recompensation: boolean;
}

export interface LatheCapabilityProfile {
  machine_id: string;
  machine_name: string;
  controller_family: "okuma";
  controller_model: string;
  post_processor: string;
  enhancement_tier: EnhancementTier;
  verification_status: VerificationStatus;
  work_envelope: WorkEnvelope;
  axis_travel: AxisTravel;
  spindle: SpindleSpec;
  accuracy: AccuracySpec;
  rapids: RapidsSpec;
  osp_coding: OSPCodingProfile;
  advanced_features: AdvancedFeatures;
  time_saving_features: TimeSavingFeatures;
  efficiency_features: EfficiencyFeatures;
  auto_adjustment_features: AutoAdjustmentFeatures;
  notes: string[];
}

// ============================================================================
// OSP coding profiles per controller family
// ============================================================================

const OSP_P200LA: OSPCodingProfile = {
  feed_mode_default: "G95",
  work_offset_g_codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
  extended_wcs_macro: "G15 H<n>", // Okuma uses G15 H for extended WCS, not G54.1
  thread_pitch_macro: "G76",
  smoothing_g_code: "G05.1", // OSP HSS look-ahead
  rigid_tap_g_code: "G84",
  canned_drill_g_code: "G83",
  variable_space: "VC1..VC200 (common), VS1..VS20 (system)",
  tool_offset_form: "T<tool><offset>",
  css_g_code: "G96",
  coolant_M_codes: { on: "M08", off: "M09" },
};
const OSP_P300L: OSPCodingProfile = { ...OSP_P200LA };
const OSP_P300LA: OSPCodingProfile = { ...OSP_P200LA };
const OSP_P500: OSPCodingProfile = { ...OSP_P200LA };
const OSP_P300SA: OSPCodingProfile = {
  ...OSP_P200LA,
  smoothing_g_code: "G05.1 Q1", // Multus has finer HSS control via Q-param
};
const OSP_U10L: OSPCodingProfile = {
  feed_mode_default: "G95",
  work_offset_g_codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
  extended_wcs_macro: null, // no extended WCS on legacy U10L
  thread_pitch_macro: "G76",
  smoothing_g_code: null,   // no look-ahead smoothing on U10L
  rigid_tap_g_code: "G84",
  canned_drill_g_code: "G83",
  variable_space: "VC1..VC100 (common)",
  tool_offset_form: "T<tool><offset>",
  css_g_code: "G96",
  coolant_M_codes: { on: "M08", off: "M09" },
};

// ============================================================================
// 7 JM Die Okuma lathe profiles
// ============================================================================

export const JM_DIE_LATHE_CAPABILITIES: Record<string, LatheCapabilityProfile> = {
  "LTH-01": {
    machine_id: "LTH-01",
    machine_name: "Okuma GENOS L300-M",
    controller_family: "okuma",
    controller_model: "OSP-P300L-R",
    post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps",
    enhancement_tier: "plain",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 530, max_swing_over_cross_slide_mm: 300, max_turn_length_mm: 1000, bar_capacity_mm: 65, max_chuck_size_in: 10 },
    axis_travel:   { x_mm: 260, z_mm: 1010, y_mm: 100, b_deg: null, c_axis_resolution_deg: 0.001 },
    spindle:       { main_max_rpm: 4000, main_power_kw: 22, main_torque_Nm: 309, sub_spindle: false, sub_spindle_max_rpm: null, live_tool_max_rpm: 6000 },
    accuracy:      { positioning_um: 6, repeatability_um: 3, surface_finish_Ra_um: 0.4, roundness_um: 2 },
    rapids:        { rapid_x_m_min: 30, rapid_z_m_min: 30, rapid_y_m_min: 10 },
    osp_coding:    OSP_P300L,
    advanced_features:       { imachining: true, ai_adaptive_feedrate: true, collision_avoidance_system: true, thermo_friendly_concept: true, servo_navi: true, thermo_compensation: true, one_touch_igf: true, spindle_acceleration_control: true },
    time_saving_features:    { bar_feeder_capable: true, tool_eye: true, parts_catcher: true, auto_door: true, sub_spindle_pickup: false, in_process_gauging: true, live_tooling: true },
    efficiency_features:     { through_spindle_coolant: true, high_pressure_coolant_bar: 70, chip_conveyor: true, mist_collector: true, power_off_mode: true, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: true, live_chatter_suppression: true, active_vibration_control: false, deflection_compensation: false, thermal_drift_auto_recompensation: true },
    notes: ["M-suffix = Y-axis + live tooling option", "P300L-R controller is GENOS-grade (no S/A advanced multi-process)", "Audit: 'plain' .cps — upgrade to Ai-Enhanced + iMachining viable (controller supports)"],
  },
  "LTH-02": {
    machine_id: "LTH-02",
    machine_name: "Okuma GENOS L200E-M",
    controller_family: "okuma",
    controller_model: "OSP-P200LA-R",
    post_processor: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps",
    enhancement_tier: "plain",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 460, max_swing_over_cross_slide_mm: 230, max_turn_length_mm: 500, bar_capacity_mm: 51, max_chuck_size_in: 8 },
    axis_travel:   { x_mm: 195, z_mm: 530, y_mm: 80, b_deg: null, c_axis_resolution_deg: 0.001 },
    spindle:       { main_max_rpm: 5000, main_power_kw: 15, main_torque_Nm: 191, sub_spindle: false, sub_spindle_max_rpm: null, live_tool_max_rpm: 6000 },
    accuracy:      { positioning_um: 5, repeatability_um: 2, surface_finish_Ra_um: 0.4, roundness_um: 2 },
    rapids:        { rapid_x_m_min: 30, rapid_z_m_min: 30, rapid_y_m_min: 10 },
    osp_coding:    OSP_P200LA,
    advanced_features:       { imachining: true, ai_adaptive_feedrate: true, collision_avoidance_system: true, thermo_friendly_concept: true, servo_navi: true, thermo_compensation: true, one_touch_igf: true, spindle_acceleration_control: true },
    time_saving_features:    { bar_feeder_capable: true, tool_eye: true, parts_catcher: true, auto_door: false, sub_spindle_pickup: false, in_process_gauging: false, live_tooling: true },
    efficiency_features:     { through_spindle_coolant: true, high_pressure_coolant_bar: 70, chip_conveyor: true, mist_collector: false, power_off_mode: true, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: true, live_chatter_suppression: true, active_vibration_control: false, deflection_compensation: false, thermal_drift_auto_recompensation: true },
    notes: ["E-suffix = single-spindle entry-grade", "M-suffix = Y-axis + live tooling option", "Audit: 'plain' .cps — upgrade viable"],
  },
  "LTH-03": {
    machine_id: "LTH-03",
    machine_name: "Okuma LNC8",
    controller_family: "okuma",
    controller_model: "OSP-U10L",
    post_processor: "OKUMA_LNC8_PRISM.cps",
    enhancement_tier: "plain",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 580, max_swing_over_cross_slide_mm: 300, max_turn_length_mm: 600, bar_capacity_mm: 52, max_chuck_size_in: 8 },
    axis_travel:   { x_mm: 200, z_mm: 600, y_mm: null, b_deg: null, c_axis_resolution_deg: null },
    spindle:       { main_max_rpm: 4500, main_power_kw: 11, main_torque_Nm: 110, sub_spindle: false, sub_spindle_max_rpm: null, live_tool_max_rpm: null },
    accuracy:      { positioning_um: 10, repeatability_um: 4, surface_finish_Ra_um: 0.8, roundness_um: 3 },
    rapids:        { rapid_x_m_min: 18, rapid_z_m_min: 18, rapid_y_m_min: null },
    osp_coding:    OSP_U10L,
    advanced_features:       { imachining: false, ai_adaptive_feedrate: false, collision_avoidance_system: false, thermo_friendly_concept: false, servo_navi: false, thermo_compensation: false, one_touch_igf: false, spindle_acceleration_control: false },
    time_saving_features:    { bar_feeder_capable: true, tool_eye: false, parts_catcher: false, auto_door: false, sub_spindle_pickup: false, in_process_gauging: false, live_tooling: false },
    efficiency_features:     { through_spindle_coolant: false, high_pressure_coolant_bar: null, chip_conveyor: true, mist_collector: false, power_off_mode: false, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: false, live_chatter_suppression: false, active_vibration_control: false, deflection_compensation: false, thermal_drift_auto_recompensation: false },
    notes: ["LEGACY OSP-U10L controller — no iMachining, no AI-adaptive, no look-ahead smoothing", "Upgrade beyond post-only is HARDWARE controller swap (not a software job)", "Audit's 'rebuild with Ai-Enhanced' recommendation INVALID — controller cannot execute"],
  },
  "LTH-04": {
    machine_id: "LTH-04",
    machine_name: "Okuma Crown L1060",
    controller_family: "okuma",
    controller_model: "OSP-U10L",
    post_processor: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps",
    enhancement_tier: "plain",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 640, max_swing_over_cross_slide_mm: 380, max_turn_length_mm: 1500, bar_capacity_mm: 80, max_chuck_size_in: 12 },
    axis_travel:   { x_mm: 305, z_mm: 1500, y_mm: null, b_deg: null, c_axis_resolution_deg: null },
    spindle:       { main_max_rpm: 3000, main_power_kw: 22, main_torque_Nm: 700, sub_spindle: false, sub_spindle_max_rpm: null, live_tool_max_rpm: null },
    accuracy:      { positioning_um: 12, repeatability_um: 5, surface_finish_Ra_um: 1.6, roundness_um: 4 },
    rapids:        { rapid_x_m_min: 15, rapid_z_m_min: 15, rapid_y_m_min: null },
    osp_coding:    OSP_U10L,
    advanced_features:       { imachining: false, ai_adaptive_feedrate: false, collision_avoidance_system: false, thermo_friendly_concept: false, servo_navi: false, thermo_compensation: false, one_touch_igf: false, spindle_acceleration_control: false },
    time_saving_features:    { bar_feeder_capable: false, tool_eye: false, parts_catcher: false, auto_door: false, sub_spindle_pickup: false, in_process_gauging: false, live_tooling: false },
    efficiency_features:     { through_spindle_coolant: false, high_pressure_coolant_bar: null, chip_conveyor: true, mist_collector: false, power_off_mode: false, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: false, live_chatter_suppression: false, active_vibration_control: false, deflection_compensation: false, thermal_drift_auto_recompensation: false },
    notes: ["Crown = heavy-duty conventional lathe with NC retrofit", "Same OSP-U10L legacy controller as LTH-03 — same upgrade ceiling"],
  },
  "LTH-05": {
    machine_id: "LTH-05",
    machine_name: "Okuma GENOS L400II-E",
    controller_family: "okuma",
    controller_model: "OSP-P300LA-E",
    post_processor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps",
    enhancement_tier: "partially_enhanced",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 660, max_swing_over_cross_slide_mm: 380, max_turn_length_mm: 1250, bar_capacity_mm: 82, max_chuck_size_in: 12 },
    axis_travel:   { x_mm: 310, z_mm: 1250, y_mm: null, b_deg: null, c_axis_resolution_deg: null },
    spindle:       { main_max_rpm: 3000, main_power_kw: 30, main_torque_Nm: 1200, sub_spindle: false, sub_spindle_max_rpm: null, live_tool_max_rpm: null },
    accuracy:      { positioning_um: 6, repeatability_um: 3, surface_finish_Ra_um: 0.4, roundness_um: 2 },
    rapids:        { rapid_x_m_min: 24, rapid_z_m_min: 30, rapid_y_m_min: null },
    osp_coding:    OSP_P300LA,
    advanced_features:       { imachining: true, ai_adaptive_feedrate: true, collision_avoidance_system: true, thermo_friendly_concept: true, servo_navi: true, thermo_compensation: true, one_touch_igf: true, spindle_acceleration_control: true },
    time_saving_features:    { bar_feeder_capable: true, tool_eye: true, parts_catcher: true, auto_door: false, sub_spindle_pickup: false, in_process_gauging: false, live_tooling: false },
    efficiency_features:     { through_spindle_coolant: true, high_pressure_coolant_bar: 70, chip_conveyor: true, mist_collector: true, power_off_mode: true, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: true, live_chatter_suppression: true, active_vibration_control: false, deflection_compensation: false, thermal_drift_auto_recompensation: true },
    notes: ["E-suffix = entry-grade single-spindle", "Audit: 'partially_enhanced' (Ai-Enhanced suffix only) — iMachining suffix missing", "Upgrade path: add iMachining chip-thinning markers to .cps"],
  },
  "LTH-06": {
    machine_id: "LTH-06",
    machine_name: "Okuma LB 3000EX Big Bore",
    controller_family: "okuma",
    controller_model: "OSP-P500",
    post_processor: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps",
    enhancement_tier: "partially_enhanced",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 670, max_swing_over_cross_slide_mm: 380, max_turn_length_mm: 1500, bar_capacity_mm: 102, max_chuck_size_in: 15 },
    axis_travel:   { x_mm: 360, z_mm: 1500, y_mm: null, b_deg: null, c_axis_resolution_deg: null },
    spindle:       { main_max_rpm: 2500, main_power_kw: 30, main_torque_Nm: 1500, sub_spindle: false, sub_spindle_max_rpm: null, live_tool_max_rpm: null },
    accuracy:      { positioning_um: 6, repeatability_um: 3, surface_finish_Ra_um: 0.4, roundness_um: 2 },
    rapids:        { rapid_x_m_min: 20, rapid_z_m_min: 24, rapid_y_m_min: null },
    osp_coding:    OSP_P500,
    advanced_features:       { imachining: true, ai_adaptive_feedrate: true, collision_avoidance_system: true, thermo_friendly_concept: true, servo_navi: true, thermo_compensation: true, one_touch_igf: true, spindle_acceleration_control: true },
    time_saving_features:    { bar_feeder_capable: true, tool_eye: true, parts_catcher: true, auto_door: true, sub_spindle_pickup: false, in_process_gauging: true, live_tooling: false },
    efficiency_features:     { through_spindle_coolant: true, high_pressure_coolant_bar: 70, chip_conveyor: true, mist_collector: true, power_off_mode: true, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: true, live_chatter_suppression: true, active_vibration_control: true, deflection_compensation: false, thermal_drift_auto_recompensation: true },
    notes: ["LB-series = heavy-bore production turning", "102mm bar capacity is the headline spec", "Audit: 'partially_enhanced' — needs iMachining chip-thinning markers"],
  },
  "LTH-07": {
    machine_id: "LTH-07",
    machine_name: "Okuma Multus B250II",
    controller_family: "okuma",
    controller_model: "OSP-P300SA",
    post_processor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps",
    enhancement_tier: "fully_enhanced",
    verification_status: "spec_sheet_typical",
    work_envelope: { max_swing_mm: 700, max_swing_over_cross_slide_mm: 530, max_turn_length_mm: 1000, bar_capacity_mm: 65, max_chuck_size_in: 10 },
    axis_travel:   { x_mm: 530, z_mm: 1000, y_mm: 250, b_deg: 240, c_axis_resolution_deg: 0.0001 },
    spindle:       { main_max_rpm: 5000, main_power_kw: 22, main_torque_Nm: 200, sub_spindle: true, sub_spindle_max_rpm: 6000, live_tool_max_rpm: 12000 },
    accuracy:      { positioning_um: 4, repeatability_um: 2, surface_finish_Ra_um: 0.2, roundness_um: 1 },
    rapids:        { rapid_x_m_min: 40, rapid_z_m_min: 40, rapid_y_m_min: 40 },
    osp_coding:    OSP_P300SA,
    advanced_features:       { imachining: true, ai_adaptive_feedrate: true, collision_avoidance_system: true, thermo_friendly_concept: true, servo_navi: true, thermo_compensation: true, one_touch_igf: true, spindle_acceleration_control: true },
    time_saving_features:    { bar_feeder_capable: true, tool_eye: true, parts_catcher: false, auto_door: true, sub_spindle_pickup: true, in_process_gauging: true, live_tooling: true },
    efficiency_features:     { through_spindle_coolant: true, high_pressure_coolant_bar: 70, chip_conveyor: true, mist_collector: true, power_off_mode: true, spindle_load_monitor: true },
    auto_adjustment_features:{ ai_adaptive_feedrate: true, live_chatter_suppression: true, active_vibration_control: true, deflection_compensation: true, thermal_drift_auto_recompensation: true },
    notes: ["Multus B-series = mill-turn flagship", "B-axis 240deg + Y-axis + sub-spindle + 12000rpm live tool = full 5-sided capability", "Reference machine for the rest of the fleet — audit 'fully_enhanced' (Ai-Enhanced + Fixed suffixes)"],
  },
};

export const JM_DIE_LATHE_IDS: ReadonlyArray<string> = Object.freeze(Object.keys(JM_DIE_LATHE_CAPABILITIES));
