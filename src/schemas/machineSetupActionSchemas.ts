/**
 * Machine Setup Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for prism_machine_setup actions.
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optNum = z.number().optional();
const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();

const machineBaseParams = {
  machine_id: optStr,
  spindle_rpm: optPosNum,
  max_rpm: optPosNum,
};

const simpleCalc = z.object({ ...machineBaseParams }).passthrough();

export const MACHINE_SETUP_ACTION_SCHEMAS: ActionSchemaMap = {
  balancing_machine_calculate: simpleCalc,
  cnc_maintenance_calculate: simpleCalc,
  critical_speed_calculate: z.object({
    shaft_diameter_mm: optPosNum,
    shaft_length_mm: optPosNum,
    bearing_span_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  dynamic_balance_calculate: z.object({
    rotor_mass_kg: optPosNum,
    rotor_diameter_mm: optPosNum,
    speed_rpm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  machine_kinematics_calculate: simpleCalc,
  machine_leveling_calculate: simpleCalc,
  machine_warmup_calculate: z.object({
    warmup_duration_min: optPosNum,
    ambient_temp_c: optNum,
    ...machineBaseParams,
  }).passthrough(),
  rtcp_compensation_calculate: simpleCalc,
  spindle_load_monitor: z.object({
    current_load_pct: optNum,
    threshold_pct: optNum,
    ...machineBaseParams,
  }).passthrough(),
  spindle_runout_calculate: z.object({
    measured_runout_um: optPosNum,
    tool_diameter_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  spindle_speed_variation: simpleCalc,
  work_envelope_calculate: z.object({
    x_travel_mm: optPosNum,
    y_travel_mm: optPosNum,
    z_travel_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  tool_magazine_optimize: z.object({
    tool_count: z.number().int().positive().optional(),
    magazine_capacity: z.number().int().positive().optional(),
    ...machineBaseParams,
  }).passthrough(),
  tool_balancing_calculate: z.object({
    tool_diameter_mm: optPosNum,
    tool_length_mm: optPosNum,
    speed_rpm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  fixture_plate_calculate: simpleCalc,
  magnetic_bearing_calculate: simpleCalc,
  press_fit_calculate: z.object({
    shaft_diameter_mm: optPosNum,
    hole_diameter_mm: optPosNum,
    interference_mm: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  shrink_fit_calculate: z.object({
    shaft_diameter_mm: optPosNum,
    bore_diameter_mm: optPosNum,
    temperature_delta_c: optNum,
    ...machineBaseParams,
  }).passthrough(),
  gauging_calculate: simpleCalc,
  parallelism_calculate: simpleCalc,
  surface_integrity_assess: simpleCalc,
  thread_gage_calculate: z.object({
    thread_size: optStr,
    pitch_mm: optPosNum,
    class: optStr,
    ...machineBaseParams,
  }).passthrough(),
  tolerance_stackup_calculate: z.object({
    dimensions: z.array(z.object({
      nominal: z.number(),
      tolerance: z.number(),
    })).optional(),
    ...machineBaseParams,
  }).passthrough(),
  stepover_optimize: z.object({
    tool_diameter_mm: optPosNum,
    target_roughness_ra: optPosNum,
    ...machineBaseParams,
  }).passthrough(),
  statistical_process_calculate: simpleCalc,
  // Hobby CNC
  hobby_cnc_get: z.object({ machine_id: z.string() }).passthrough(),
  hobby_cnc_search: z.object({
    controller: optStr,
    min_travel_x: optPosNum,
    min_travel_y: optPosNum,
    min_travel_z: optPosNum,
    max_price: optPosNum,
    min_price: optPosNum,
    spindle_power_min: optPosNum,
    material: optStr,
    manufacturer: optStr,
    min_axes: z.number().int().positive().optional(),
  }).passthrough(),
  hobby_cnc_controller: z.object({ controller: z.string() }).passthrough(),
  hobby_cnc_compatibility: z.object({
    machine_id: z.string(),
    gcode: z.string(),
  }).passthrough(),
  hobby_cnc_recommend: z.object({
    budget: optPosNum,
    material: optStr,
    work_area_needed: z.object({
      x: z.number(), y: z.number(), z: z.number(),
    }).optional(),
    features_needed: z.array(z.string()).optional(),
  }).passthrough(),
  // Cobot Machining
  cobot_assess_safety: z.object({
    cobot_model: z.string(),
    operation: z.string(),
    tool_rpm: z.number(),
    cutting_force_N: z.number(),
    operator_distance_m: z.number(),
  }).passthrough(),
  cobot_plan_task: z.object({
    cobot_payload_kg: z.number().positive(),
    spindle_weight_kg: z.number().positive(),
    part_material: z.string(),
    operation: z.string(),
    reach_mm: z.number().positive(),
  }).passthrough(),
  cobot_select: z.object({
    application: z.string(),
    payload_needed_kg: z.number().positive(),
    reach_needed_mm: z.number().positive(),
    budget: optPosNum,
  }).passthrough(),
  // OPC-UA Connector
  opcua_connect: z.object({
    endpoint: z.string(),
    securityMode: z.enum(["None", "Sign", "SignAndEncrypt"]).optional(),
    credentials: z.object({ username: z.string(), password: z.string() }).optional(),
    controllerFamily: optStr,
    applicationName: optStr,
    reconnectIntervalMs: z.number().positive().optional(),
    heartbeatIntervalMs: z.number().positive().optional(),
  }).passthrough(),
  opcua_disconnect: z.object({ sessionId: z.string() }).passthrough(),
  opcua_read: z.object({ sessionId: z.string(), nodeId: z.string() }).passthrough(),
  opcua_read_batch: z.object({ sessionId: z.string(), nodeIds: z.array(z.string()) }).passthrough(),
  opcua_subscribe: z.object({
    sessionId: z.string(),
    nodeIds: z.array(z.string()),
    interval: z.number().positive().optional(),
    queueSize: z.number().positive().optional(),
  }).passthrough(),
  opcua_unsubscribe: z.object({ sessionId: z.string(), subscriptionId: z.string() }).passthrough(),
  opcua_browse: z.object({ sessionId: z.string(), parentNodeId: optStr }).passthrough(),
  opcua_controller_profile: z.object({ controllerFamily: z.string() }).passthrough(),
  opcua_machine_status: z.object({ sessionId: z.string(), controllerFamily: optStr }).passthrough(),
  opcua_monitor_alarms: z.object({ sessionId: z.string(), interval: z.number().positive().optional() }).passthrough(),
  // Machine Strategy Constraint (CAMX-MS2/U02)
  machine_strategy_validate: z.object({
    strategy: z.string(),
    machine: z.union([z.string(), z.object({}).passthrough()]),
    part_envelope_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    tool_count: z.number().int().positive().optional(),
    coolant_type: optStr,
  }).passthrough(),
  machine_strategy_find_best: z.object({
    strategy: z.string(),
    part_envelope_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    tool_count: z.number().int().positive().optional(),
    coolant_type: optStr,
    top_n: z.number().int().positive().optional(),
  }).passthrough(),
  machine_strategy_requirements: z.object({
    strategy: z.string(),
    part_envelope_mm: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    tool_count: z.number().int().positive().optional(),
    coolant_type: optStr,
  }).passthrough(),
  // FixtureAwareStrategyEngine (E1101) — CAMX-MS12/U07
  fixture_strategy_adjust: z.object({
    strategy: z.string(),
    fixture_type: z.enum([
      "vise", "vacuum", "magnetic", "soft_jaws", "fixture_plate",
      "tombstone", "pallet", "chuck_3jaw", "chuck_4jaw", "chuck_6jaw", "collet",
    ]),
    fixture_params: z.object({
      jaw_grip_force_n: optPosNum,
      vacuum_contact_area_cm2: optPosNum,
      vacuum_seal_efficiency: z.number().min(0).max(1).optional(),
      magnetic_flux_density_t: z.number().positive().optional(),
      tombstone_non_top_face: z.boolean().optional(),
      chuck_grip_force_n: optPosNum,
      chuck_spindle_rpm: optPosNum,
      collet_grip_force_n: optPosNum,
      min_wall_thickness_mm: optPosNum,
      estimated_cutting_force_n: optPosNum,
      tool_diameter_mm: optPosNum,
      ae_mm: optPosNum,
      ap_mm: optPosNum,
    }).optional(),
  }).passthrough(),
  fixture_strategy_validate: z.object({
    strategy: z.string(),
    fixture_type: z.enum([
      "vise", "vacuum", "magnetic", "soft_jaws", "fixture_plate",
      "tombstone", "pallet", "chuck_3jaw", "chuck_4jaw", "chuck_6jaw", "collet",
    ]),
    ae_mm: optPosNum,
    tool_diameter_mm: optPosNum,
    ap_mm: optPosNum,
    estimated_cutting_force_n: optPosNum,
    fixture_params: z.object({
      vacuum_contact_area_cm2: optPosNum,
      vacuum_seal_efficiency: z.number().min(0).max(1).optional(),
      magnetic_flux_density_t: z.number().positive().optional(),
      tombstone_non_top_face: z.boolean().optional(),
      min_wall_thickness_mm: optPosNum,
    }).optional(),
  }).passthrough(),
  fixture_recommend: z.object({
    feature: z.object({
      type: z.string(),
      material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
      part_shape: z.enum(["prismatic", "cylindrical", "irregular"]).optional(),
      min_wall_thickness_mm: optPosNum,
      mass_kg: optPosNum,
      requires_finishing: z.boolean().optional(),
      production_volume: z.enum(["single", "small_batch", "high_volume"]).optional(),
      setup_count: z.number().int().positive().optional(),
      ferrous: z.boolean().optional(),
    }),
    strategies: z.array(z.string()).min(1),
  }).passthrough(),

  // ── HBK: Machine Handbook Registry actions ──
  handbook_get: z.object({
    id: z.string().optional().describe("Handbook ID"),
    machine_id: z.string().optional().describe("Machine ID to look up handbook"),
  }).passthrough(),
  handbook_search: z.object({
    manufacturer: z.string().optional().describe("Filter by manufacturer name"),
    model: z.string().optional().describe("Filter by model name"),
    has_section: z.string().optional().describe("Filter to handbooks containing this section"),
    query: z.string().optional().describe("Full-text search query"),
    limit: z.number().int().positive().optional().describe("Max results"),
  }).passthrough(),
  handbook_list: z.object({}).passthrough(),
  handbook_stats: z.object({}).passthrough(),
  handbook_extract: z.object({
    rawText: z.string().min(10).max(5_000_000).describe("Raw handbook text content (PDF text, OCR output)"),
    machineId: z.string().optional().describe("Machine ID to associate extracted data with"),
    manufacturer: z.string().optional().describe("Machine manufacturer name"),
    model: z.string().optional().describe("Machine model name"),
    extractionMethod: z.enum(["manual", "ocr", "table_parse", "api", "web_scrape"]).optional().describe("How the text was obtained"),
    handbookTitle: z.string().optional().describe("Title of the source handbook"),
  }).passthrough(),
  handbook_acquire: z.object({
    rawText: z.string().min(10).max(5_000_000).describe("Raw handbook text (PDF text, OCR output)"),
    machineId: z.string().describe("Machine ID to associate extracted data with"),
    manufacturer: z.string().describe("Machine manufacturer name"),
    model: z.string().describe("Machine model name"),
    extractionMethod: z.enum(["manual", "ocr", "table_parse", "api", "web_scrape"]).optional().describe("How the text was obtained"),
    handbookTitle: z.string().optional().describe("Title of the source handbook"),
    firmwareVersion: z.string().optional().describe("Controller firmware version if known"),
    pageRange: z.string().optional().describe("Page range from source document (e.g. '15-42')"),
    sourceDocumentHash: z.string().optional().describe("SHA-256 hash of source document for dedup"),
    dryRun: z.boolean().optional().describe("If true, extract but do not commit to registry"),
    forceOverwrite: z.boolean().optional().describe("If true, overwrite even higher-confidence data"),
  }).passthrough(),
  handbook_batch_acquire: z.object({
    intakes: z.array(z.object({
      rawText: z.string().min(10).max(5_000_000),
      machineId: z.string(),
      manufacturer: z.string(),
      model: z.string(),
      extractionMethod: z.enum(["manual", "ocr", "table_parse", "api", "web_scrape"]).optional(),
      handbookTitle: z.string().optional(),
      firmwareVersion: z.string().optional(),
      pageRange: z.string().optional(),
      sourceDocumentHash: z.string().optional(),
    })).min(1).max(50).describe("Array of handbook intake requests"),
    dryRun: z.boolean().optional().describe("If true, extract but do not commit to registry"),
    forceOverwrite: z.boolean().optional().describe("If true, overwrite even higher-confidence data"),
  }).passthrough(),

  // ── HBK-MS3: Alarm Intelligence ──
  alarm_intelligence_lookup: z.object({
    alarm_code: z.string().min(1).describe("Alarm code to look up (e.g. '108', 'SERVO FAULT X')"),
    machine_id: z.string().optional().describe("Machine ID for handbook-specific alarm data"),
    controller: z.string().optional().describe("Controller family (e.g. 'HAAS', 'FANUC') for database lookup"),
    include_tribal: z.boolean().optional().describe("Include tribal knowledge tips (default true)"),
    max_tribal_tips: z.number().min(0).max(20).optional().describe("Max tribal tips to return (default 5)"),
  }).passthrough(),
  alarm_intelligence_search: z.object({
    query: z.string().describe("Free-text search across alarm descriptions, causes, and fixes"),
    machine_id: z.string().optional().describe("Filter by machine ID"),
    limit: z.number().min(1).max(50).optional().describe("Max results (default 10)"),
  }).passthrough(),
  alarm_intelligence_index: z.object({
    machine_id: z.string().optional().describe("Filter by machine ID"),
    manufacturer: z.string().optional().describe("Filter by manufacturer name"),
    severity: z.enum(["info", "warning", "error", "critical", "emergency"]).optional().describe("Filter by severity"),
    category: z.string().optional().describe("Filter by alarm category"),
    query: z.string().optional().describe("Free-text search within index"),
    limit: z.number().min(1).max(500).optional().describe("Max results (default 50)"),
  }).passthrough(),
  alarm_intelligence_stats: z.object({}).passthrough(),

  // HBK-MS4: Machine Capability Intelligence
  machine_capability_lookup: z.object({
    machine_id: z.string().describe("Machine ID to look up capability profile"),
    include_torque_curve: z.boolean().optional().describe("Include full torque curve points (default true)"),
  }).passthrough(),
  machine_capability_query: z.object({
    machine_id: z.string().optional().describe("Filter by machine ID"),
    manufacturer: z.string().optional().describe("Filter by manufacturer name"),
    min_spindle_rpm: z.number().optional().describe("Minimum spindle RPM requirement"),
    min_power_kw: z.number().optional().describe("Minimum spindle power in kW"),
    min_torque_nm: z.number().optional().describe("Minimum spindle torque in Nm"),
    min_axis_travel_mm: z.number().optional().describe("Minimum axis travel in mm"),
    simultaneous_axes: z.number().min(3).max(5).optional().describe("Required simultaneous axes (3-5)"),
    limit: z.number().min(1).max(100).optional().describe("Max results (default 20)"),
  }).passthrough(),
  machine_capability_reconcile: z.object({
    machine_id: z.string().describe("Machine ID to reconcile"),
    tolerance_pct: z.number().min(0).max(100).optional().describe("Tolerance percentage for discrepancy detection (default 5%)"),
  }).passthrough(),
  machine_capability_stats: z.object({}).passthrough(),
  // HBK-MS10: Handbook Intelligence Actions
  handbook_lookup: z.object({
    machine_id: z.string().describe("Machine ID to look up handbook for"),
    section: z.string().optional().describe("Specific section to retrieve (controller_features, alarm_codes, etc.)"),
  }).passthrough(),
  handbook_ingest: z.object({
    machine_id: z.string().describe("Machine ID to ingest handbook for"),
    source_url: z.string().optional().describe("URL or path to handbook source"),
    format: z.enum(["pdf", "html", "text", "manual"]).optional().describe("Source format"),
  }).passthrough(),
  handbook_coverage: z.object({}).passthrough(),
  handbook_compare: z.object({
    machine_ids: z.array(z.string()).min(2).describe("Machine IDs to compare (minimum 2)"),
  }).passthrough(),
  // HBK-MS6: Controller Programming Intelligence
  controller_programming_profile: z.object({
    machine_id: z.string().describe("Machine ID to get controller programming profile"),
    validate_dialect: z.boolean().optional().describe("Whether to validate against ControllerDialectEngine"),
  }).passthrough(),
  controller_custom_codes: z.object({
    machine_id: z.string().describe("Machine ID to get custom G/M codes"),
  }).passthrough(),
  controller_macro_variables: z.object({
    machine_id: z.string().describe("Machine ID to get macro variable map"),
  }).passthrough(),
  controller_validate_dialect: z.object({
    machine_id: z.string().describe("Machine ID to validate controller dialect"),
  }).passthrough(),
  controller_enrichment_patch: z.object({
    machine_id: z.string().describe("Machine ID to generate PostProcessor enrichment patch"),
  }).passthrough(),
};
