/**
 * HobbyCNCProfileEngine — Hobby/Desktop CNC Machine Database
 *
 * Embedded database of hobby/desktop CNC machines and their controllers.
 * Covers GRBL, LinuxCNC, Mach3/4, PathPilot, Marlin, FluidNC, buildbotics.
 * Machine search, controller profiles, G-code compatibility checking,
 * and budget-based recommendation.
 *
 * @engine HobbyCNCProfileEngine
 * @dispatcher machineSetupDispatcher
 * @actions hobby_cnc_get, hobby_cnc_search, hobby_cnc_controller, hobby_cnc_compatibility, hobby_cnc_recommend
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface HobbyMachineTravel {
  x: number; // mm
  y: number;
  z: number;
}

export interface HobbyMachine {
  id: string;
  name: string;
  manufacturer: string;
  controller: string;
  travel: HobbyMachineTravel;
  spindle_rpm: [number, number]; // [min, max]
  spindle_power_w: number;
  rapids_mm_min: number;
  weight_kg: number;
  price_range: string;
  price_min_usd: number; // parsed numeric for filtering
  price_max_usd: number;
  frame_type: 'aluminum_extrusion' | 'steel_plate' | 'cast_iron' | 'steel_tube' | 'hybrid';
  suitable_materials: string[];
  max_axes: number;
  notes?: string;
}

export interface ControllerProfile {
  gcode_dialect: string;
  max_axes: number;
  supports_arcs: boolean;
  supports_canned_cycles: boolean;
  max_feed_override_pct: number;
  probe_support: boolean;
  tool_change: boolean;
  max_program_size_kb: number | null; // null = unlimited
  homing: boolean;
  soft_limits: boolean;
  supported_gcodes: string[];
  unsupported_gcodes: string[];
  notes: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  machine_name: string;
  controller: string;
  unsupported_codes: string[];
  warnings: string[];
  suggested_replacements: Array<{ original: string; replacement: string; reason: string }>;
}

export interface MachineRecommendation {
  machine: HobbyMachine;
  score: number;
  reasons: string[];
  limitations: string[];
}

// ── Embedded Database ──────────────────────────────────────────────────────

const HOBBY_MACHINES: HobbyMachine[] = [
  // GRBL-based
  { id: 'shapeoko-4', name: 'Carbide3D Shapeoko 4', manufacturer: 'Carbide3D', controller: 'GRBL', travel: { x: 838, y: 838, z: 102 }, spindle_rpm: [10000, 27000], spindle_power_w: 800, rapids_mm_min: 5000, weight_kg: 45, price_range: '$2000-3000', price_min_usd: 2000, price_max_usd: 3000, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass'], max_axes: 3 },
  { id: 'shapeoko-5-pro', name: 'Carbide3D Shapeoko 5 Pro', manufacturer: 'Carbide3D', controller: 'GRBL', travel: { x: 838, y: 838, z: 102 }, spindle_rpm: [10000, 27000], spindle_power_w: 800, rapids_mm_min: 5000, weight_kg: 50, price_range: '$2500-3500', price_min_usd: 2500, price_max_usd: 3500, frame_type: 'hybrid', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass', 'mild_steel'], max_axes: 3 },
  { id: 'x-carve', name: 'Inventables X-Carve', manufacturer: 'Inventables', controller: 'GRBL', travel: { x: 750, y: 750, z: 65 }, spindle_rpm: [8000, 30000], spindle_power_w: 600, rapids_mm_min: 4000, weight_kg: 35, price_range: '$1500-2500', price_min_usd: 1500, price_max_usd: 2500, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'soft_metal'], max_axes: 3 },
  { id: 'nomad-3', name: 'Carbide3D Nomad 3', manufacturer: 'Carbide3D', controller: 'GRBL', travel: { x: 203, y: 203, z: 76 }, spindle_rpm: [2000, 10000], spindle_power_w: 70, rapids_mm_min: 2500, weight_kg: 28, price_range: '$2800', price_min_usd: 2800, price_max_usd: 2800, frame_type: 'cast_iron', suitable_materials: ['wood', 'plastic', 'wax', 'aluminum'], max_axes: 3, notes: 'Enclosed, quiet, ideal for jewelry/small parts' },
  { id: 'sainsmart-3018-prover', name: 'SainSmart Genmitsu 3018-PROVer', manufacturer: 'SainSmart', controller: 'GRBL', travel: { x: 300, y: 180, z: 45 }, spindle_rpm: [5000, 12000], spindle_power_w: 120, rapids_mm_min: 2000, weight_kg: 8, price_range: '$200-300', price_min_usd: 200, price_max_usd: 300, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'pcb', 'acrylic'], max_axes: 3, notes: 'Entry-level, engraving/PCB' },
  { id: 'foxalien-4040-xe', name: 'FoxAlien Masuter 4040-XE', manufacturer: 'FoxAlien', controller: 'GRBL', travel: { x: 400, y: 400, z: 80 }, spindle_rpm: [8000, 24000], spindle_power_w: 300, rapids_mm_min: 3000, weight_kg: 18, price_range: '$500-700', price_min_usd: 500, price_max_usd: 700, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'acrylic', 'soft_metal'], max_axes: 3 },
  // Buildbotics / Onefinity
  { id: 'onefinity-woodworker', name: 'Onefinity Woodworker', manufacturer: 'Onefinity', controller: 'buildbotics', travel: { x: 816, y: 816, z: 133 }, spindle_rpm: [10000, 24000], spindle_power_w: 1500, rapids_mm_min: 6000, weight_kg: 50, price_range: '$2000-3500', price_min_usd: 2000, price_max_usd: 3500, frame_type: 'steel_plate', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass'], max_axes: 3 },
  { id: 'onefinity-machinist', name: 'Onefinity Machinist', manufacturer: 'Onefinity', controller: 'buildbotics', travel: { x: 406, y: 406, z: 133 }, spindle_rpm: [10000, 24000], spindle_power_w: 1500, rapids_mm_min: 6000, weight_kg: 40, price_range: '$2000-3000', price_min_usd: 2000, price_max_usd: 3000, frame_type: 'steel_plate', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass'], max_axes: 3 },
  { id: 'onefinity-foreman-pro', name: 'Onefinity Foreman Pro', manufacturer: 'Onefinity', controller: 'buildbotics', travel: { x: 1270, y: 1270, z: 133 }, spindle_rpm: [10000, 24000], spindle_power_w: 2200, rapids_mm_min: 6000, weight_kg: 75, price_range: '$4000-6000', price_min_usd: 4000, price_max_usd: 6000, frame_type: 'steel_plate', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass'], max_axes: 3 },
  // Mach3/Mach4-based
  { id: 'avid-cnc-4848', name: 'Avid CNC 4848', manufacturer: 'Avid CNC', controller: 'Mach4', travel: { x: 1219, y: 1219, z: 152 }, spindle_rpm: [6000, 24000], spindle_power_w: 2200, rapids_mm_min: 12000, weight_kg: 200, price_range: '$6000-10000', price_min_usd: 6000, price_max_usd: 10000, frame_type: 'steel_tube', suitable_materials: ['wood', 'plastic', 'aluminum', 'mild_steel'], max_axes: 3 },
  { id: 'avid-cnc-2448', name: 'Avid CNC 2448', manufacturer: 'Avid CNC', controller: 'Mach4', travel: { x: 610, y: 1219, z: 152 }, spindle_rpm: [6000, 24000], spindle_power_w: 2200, rapids_mm_min: 12000, weight_kg: 160, price_range: '$5000-8000', price_min_usd: 5000, price_max_usd: 8000, frame_type: 'steel_tube', suitable_materials: ['wood', 'plastic', 'aluminum', 'mild_steel'], max_axes: 3 },
  { id: 'cnc4newbie-newcarve', name: 'CNC4Newbie NewCarve', manufacturer: 'CNC4Newbie', controller: 'Mach3', travel: { x: 610, y: 610, z: 114 }, spindle_rpm: [8000, 24000], spindle_power_w: 1500, rapids_mm_min: 5000, weight_kg: 80, price_range: '$3000-5000', price_min_usd: 3000, price_max_usd: 5000, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum'], max_axes: 3 },
  // LinuxCNC-based
  { id: 'centroid-acorn', name: 'Centroid Acorn CNC', manufacturer: 'Centroid', controller: 'LinuxCNC', travel: { x: 600, y: 400, z: 200 }, spindle_rpm: [0, 10000], spindle_power_w: 2200, rapids_mm_min: 10000, weight_kg: 300, price_range: '$5000-15000', price_min_usd: 5000, price_max_usd: 15000, frame_type: 'cast_iron', suitable_materials: ['wood', 'plastic', 'aluminum', 'steel', 'cast_iron'], max_axes: 4, notes: 'Retrofit controller for manual mills' },
  { id: 'mesa-7i96s-build', name: 'Mesa 7i96S LinuxCNC Build', manufacturer: 'Mesa Electronics', controller: 'LinuxCNC', travel: { x: 500, y: 300, z: 150 }, spindle_rpm: [0, 8000], spindle_power_w: 1500, rapids_mm_min: 8000, weight_kg: 250, price_range: '$3000-8000', price_min_usd: 3000, price_max_usd: 8000, frame_type: 'cast_iron', suitable_materials: ['wood', 'plastic', 'aluminum', 'steel'], max_axes: 6, notes: 'DIY retrofit with Mesa FPGA boards' },
  // PathPilot (Tormach)
  { id: 'tormach-440', name: 'Tormach PCNC 440', manufacturer: 'Tormach', controller: 'PathPilot', travel: { x: 254, y: 152, z: 254 }, spindle_rpm: [100, 10000], spindle_power_w: 750, rapids_mm_min: 4572, weight_kg: 195, price_range: '$5000', price_min_usd: 5000, price_max_usd: 5000, frame_type: 'cast_iron', suitable_materials: ['wood', 'plastic', 'aluminum', 'steel', 'brass'], max_axes: 3 },
  { id: 'tormach-770mx', name: 'Tormach 770MX', manufacturer: 'Tormach', controller: 'PathPilot', travel: { x: 381, y: 203, z: 292 }, spindle_rpm: [100, 10000], spindle_power_w: 1100, rapids_mm_min: 6350, weight_kg: 408, price_range: '$9000', price_min_usd: 9000, price_max_usd: 9000, frame_type: 'cast_iron', suitable_materials: ['wood', 'plastic', 'aluminum', 'steel', 'brass', 'cast_iron'], max_axes: 3 },
  { id: 'tormach-1100mx', name: 'Tormach 1100MX', manufacturer: 'Tormach', controller: 'PathPilot', travel: { x: 457, y: 254, z: 406 }, spindle_rpm: [100, 10000], spindle_power_w: 1500, rapids_mm_min: 7620, weight_kg: 544, price_range: '$12000', price_min_usd: 12000, price_max_usd: 12000, frame_type: 'cast_iron', suitable_materials: ['wood', 'plastic', 'aluminum', 'steel', 'brass', 'cast_iron', 'titanium'], max_axes: 3 },
  // Marlin / 3D printer conversions
  { id: 'printmill-cnc', name: 'PrintMill CNC Conversion', manufacturer: 'Generic', controller: 'Marlin', travel: { x: 200, y: 200, z: 60 }, spindle_rpm: [5000, 20000], spindle_power_w: 300, rapids_mm_min: 3000, weight_kg: 15, price_range: '$500-1000', price_min_usd: 500, price_max_usd: 1000, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'pcb', 'wax'], max_axes: 3, notes: 'Converted 3D printer, low rigidity' },
  { id: 'ender-3-cnc', name: 'Ender 3 CNC Conversion', manufacturer: 'Generic', controller: 'Marlin', travel: { x: 235, y: 235, z: 50 }, spindle_rpm: [5000, 15000], spindle_power_w: 200, rapids_mm_min: 2500, weight_kg: 12, price_range: '$300-600', price_min_usd: 300, price_max_usd: 600, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'pcb', 'foam'], max_axes: 3, notes: 'Very low rigidity, engraving only for metals' },
  // FluidNC (ESP32-based, GRBL successor)
  { id: 'fluidnc-custom', name: 'FluidNC Custom Build', manufacturer: 'Generic', controller: 'FluidNC', travel: { x: 500, y: 500, z: 100 }, spindle_rpm: [5000, 24000], spindle_power_w: 800, rapids_mm_min: 5000, weight_kg: 30, price_range: '$800-2000', price_min_usd: 800, price_max_usd: 2000, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum'], max_axes: 6, notes: 'ESP32-based GRBL fork, WiFi, YAML config' },
  // Stepcraft
  { id: 'stepcraft-d840', name: 'Stepcraft D.840', manufacturer: 'Stepcraft', controller: 'GRBL', travel: { x: 600, y: 840, z: 140 }, spindle_rpm: [5000, 20000], spindle_power_w: 600, rapids_mm_min: 4000, weight_kg: 40, price_range: '$3000-4500', price_min_usd: 3000, price_max_usd: 4500, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass'], max_axes: 3, notes: 'Modular, swappable tool heads (mill/laser/3D print)' },
  { id: 'stepcraft-m1000', name: 'Stepcraft M.1000', manufacturer: 'Stepcraft', controller: 'UCCNC', travel: { x: 710, y: 1000, z: 155 }, spindle_rpm: [6000, 24000], spindle_power_w: 1100, rapids_mm_min: 6000, weight_kg: 75, price_range: '$5000-7000', price_min_usd: 5000, price_max_usd: 7000, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum', 'brass', 'mild_steel'], max_axes: 3 },
  // MillRight
  { id: 'millright-mega-v-xl', name: 'MillRight Mega V XL', manufacturer: 'MillRight', controller: 'GRBL', travel: { x: 900, y: 900, z: 114 }, spindle_rpm: [8000, 24000], spindle_power_w: 800, rapids_mm_min: 4000, weight_kg: 45, price_range: '$1500-2500', price_min_usd: 1500, price_max_usd: 2500, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum'], max_axes: 3 },
  { id: 'millright-power-route', name: 'MillRight Power Route', manufacturer: 'MillRight', controller: 'GRBL', travel: { x: 610, y: 610, z: 114 }, spindle_rpm: [8000, 24000], spindle_power_w: 1500, rapids_mm_min: 5000, weight_kg: 55, price_range: '$2500-4000', price_min_usd: 2500, price_max_usd: 4000, frame_type: 'steel_plate', suitable_materials: ['wood', 'plastic', 'aluminum', 'mild_steel'], max_axes: 3 },
  // PocketNC
  { id: 'pocketnc-v2-50', name: 'PocketNC V2-50', manufacturer: 'PocketNC', controller: 'LinuxCNC', travel: { x: 127, y: 76, z: 89 }, spindle_rpm: [1000, 10000], spindle_power_w: 150, rapids_mm_min: 3000, weight_kg: 27, price_range: '$5000-6000', price_min_usd: 5000, price_max_usd: 6000, frame_type: 'aluminum_extrusion', suitable_materials: ['aluminum', 'brass', 'plastic', 'wax'], max_axes: 5, notes: '5-axis desktop mill, A+B rotary' },
  // PrintNC (open-source steel frame)
  { id: 'printnc', name: 'PrintNC', manufacturer: 'Open Source', controller: 'LinuxCNC', travel: { x: 600, y: 400, z: 130 }, spindle_rpm: [6000, 24000], spindle_power_w: 2200, rapids_mm_min: 8000, weight_kg: 120, price_range: '$2000-4000', price_min_usd: 2000, price_max_usd: 4000, frame_type: 'steel_tube', suitable_materials: ['wood', 'plastic', 'aluminum', 'mild_steel', 'steel'], max_axes: 3, notes: 'Open-source design, very rigid for the price' },
  // WorkBee / Bulkman3D
  { id: 'workbee-1510', name: 'OpenBuilds WorkBee 1510', manufacturer: 'OpenBuilds', controller: 'GRBL', travel: { x: 1500, y: 1000, z: 100 }, spindle_rpm: [8000, 24000], spindle_power_w: 800, rapids_mm_min: 4000, weight_kg: 50, price_range: '$2000-3500', price_min_usd: 2000, price_max_usd: 3500, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'foam', 'aluminum'], max_axes: 3, notes: 'Large format, V-slot extrusion, sign-making' },
  // LongMill
  { id: 'longmill-mk2-30x30', name: 'Sienci LongMill MK2 30x30', manufacturer: 'Sienci Labs', controller: 'GRBL', travel: { x: 770, y: 770, z: 114 }, spindle_rpm: [10000, 24000], spindle_power_w: 800, rapids_mm_min: 4000, weight_kg: 35, price_range: '$1500-2200', price_min_usd: 1500, price_max_usd: 2200, frame_type: 'aluminum_extrusion', suitable_materials: ['wood', 'plastic', 'aluminum', 'soft_metal'], max_axes: 3 },
];

const CONTROLLER_PROFILES: Record<string, ControllerProfile> = {
  'GRBL': {
    gcode_dialect: 'grbl',
    max_axes: 3,
    supports_arcs: true,
    supports_canned_cycles: false,
    max_feed_override_pct: 200,
    probe_support: true,
    tool_change: false,
    max_program_size_kb: 64,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G43.1', 'G49', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G91', 'G92', 'G93', 'G94', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M9', 'M30'],
    unsupported_gcodes: ['G41', 'G42', 'G43', 'G71', 'G72', 'G73', 'G76', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G96', 'G97', 'M6', 'M19', 'M48', 'M49', 'M98', 'M99'],
    notes: 'No canned cycles, no cutter compensation, no subroutines. 3-axis limit. Tool length offset via G43.1 only.'
  },
  'FluidNC': {
    gcode_dialect: 'fluidnc',
    max_axes: 6,
    supports_arcs: true,
    supports_canned_cycles: false,
    max_feed_override_pct: 200,
    probe_support: true,
    tool_change: false,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G43.1', 'G49', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G91', 'G92', 'G93', 'G94', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M9', 'M30', 'M62', 'M63', 'M64', 'M65', 'M67'],
    unsupported_gcodes: ['G41', 'G42', 'G43', 'G71', 'G72', 'G73', 'G76', 'G81', 'G82', 'G83', 'G84', 'G96', 'G97', 'M6', 'M19', 'M98', 'M99'],
    notes: 'ESP32-based GRBL fork. YAML config, WiFi/Bluetooth. Up to 6 axes. SD card streaming.'
  },
  'LinuxCNC': {
    gcode_dialect: 'linuxcnc',
    max_axes: 9,
    supports_arcs: true,
    supports_canned_cycles: true,
    max_feed_override_pct: 300,
    probe_support: true,
    tool_change: true,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G5.1', 'G5.2', 'G7', 'G8', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G33', 'G33.1', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G40', 'G41', 'G41.1', 'G42', 'G42.1', 'G43', 'G43.1', 'G43.2', 'G49', 'G52', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G59.1', 'G59.2', 'G59.3', 'G61', 'G61.1', 'G64', 'G73', 'G76', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G90', 'G91', 'G92', 'G93', 'G94', 'G95', 'G96', 'G97', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M19', 'M30', 'M48', 'M49', 'M52', 'M53', 'M61', 'M62', 'M63', 'M64', 'M65', 'M66', 'M67', 'M68', 'M98', 'M99', 'O'],
    unsupported_gcodes: [],
    notes: 'Full RS274NGC + extensions. Subroutines, cutter comp, rigid tapping, CSS, up to 9 axes. HAL real-time kernel.'
  },
  'Mach3': {
    gcode_dialect: 'mach3',
    max_axes: 6,
    supports_arcs: true,
    supports_canned_cycles: true,
    max_feed_override_pct: 200,
    probe_support: true,
    tool_change: true,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G31', 'G40', 'G41', 'G42', 'G43', 'G49', 'G52', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G73', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G90', 'G91', 'G92', 'G93', 'G94', 'G95', 'G96', 'G97', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M30', 'M48', 'M49', 'M98', 'M99'],
    unsupported_gcodes: ['G5', 'G5.1', 'G33', 'G33.1', 'G76'],
    notes: 'Windows-based, parallel port or USB motion controller. Widely used for hobby retrofits. No rigid tapping.'
  },
  'Mach4': {
    gcode_dialect: 'mach4',
    max_axes: 6,
    supports_arcs: true,
    supports_canned_cycles: true,
    max_feed_override_pct: 300,
    probe_support: true,
    tool_change: true,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G31', 'G33', 'G33.1', 'G40', 'G41', 'G42', 'G43', 'G49', 'G52', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G73', 'G76', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G90', 'G91', 'G92', 'G93', 'G94', 'G95', 'G96', 'G97', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M19', 'M30', 'M48', 'M49', 'M98', 'M99'],
    unsupported_gcodes: [],
    notes: 'Modern replacement for Mach3. Lua scripting, plugin architecture. Requires external motion controller (ESS, PMDX, etc.).'
  },
  'PathPilot': {
    gcode_dialect: 'pathpilot',
    max_axes: 4,
    supports_arcs: true,
    supports_canned_cycles: true,
    max_feed_override_pct: 200,
    probe_support: true,
    tool_change: true,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G33', 'G33.1', 'G38.2', 'G40', 'G41', 'G42', 'G43', 'G49', 'G52', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G61', 'G64', 'G73', 'G76', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G90', 'G91', 'G92', 'G93', 'G94', 'G95', 'G96', 'G97', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M19', 'M30', 'M48', 'M49', 'M98', 'M99'],
    unsupported_gcodes: [],
    notes: 'Tormach-specific LinuxCNC fork. Integrated conversational programming, probing, tool table, ATC support.'
  },
  'Marlin': {
    gcode_dialect: 'marlin',
    max_axes: 6,
    supports_arcs: true,
    supports_canned_cycles: false,
    max_feed_override_pct: 100,
    probe_support: true,
    tool_change: false,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G21', 'G28', 'G29', 'G38.2', 'G38.3', 'G90', 'G91', 'G92', 'M0', 'M1', 'M3', 'M4', 'M5', 'M17', 'M18', 'M84', 'M104', 'M106', 'M107', 'M109', 'M140', 'M190', 'M220', 'M221'],
    unsupported_gcodes: ['G17', 'G18', 'G19', 'G20', 'G33', 'G40', 'G41', 'G42', 'G43', 'G52', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G61', 'G64', 'G73', 'G76', 'G80', 'G81', 'G82', 'G83', 'G84', 'G93', 'G94', 'G95', 'G96', 'G97', 'M6', 'M7', 'M8', 'M9', 'M19', 'M48', 'M49', 'M98', 'M99'],
    notes: '3D-printer firmware repurposed for CNC. No work offsets, no canned cycles, no cutter comp. Very limited CNC use.'
  },
  'buildbotics': {
    gcode_dialect: 'buildbotics',
    max_axes: 4,
    supports_arcs: true,
    supports_canned_cycles: false,
    max_feed_override_pct: 200,
    probe_support: true,
    tool_change: false,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G40', 'G43.1', 'G49', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G80', 'G90', 'G91', 'G92', 'G93', 'G94', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M9', 'M30'],
    unsupported_gcodes: ['G41', 'G42', 'G43', 'G73', 'G76', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G96', 'G97', 'M6', 'M19', 'M48', 'M49', 'M98', 'M99'],
    notes: 'Onefinity / Buildbotics controller. Web-based UI, Raspberry Pi. No canned cycles or subroutines.'
  },
  'UCCNC': {
    gcode_dialect: 'uccnc',
    max_axes: 6,
    supports_arcs: true,
    supports_canned_cycles: true,
    max_feed_override_pct: 300,
    probe_support: true,
    tool_change: true,
    max_program_size_kb: null,
    homing: true,
    soft_limits: true,
    supported_gcodes: ['G0', 'G1', 'G2', 'G3', 'G4', 'G10', 'G17', 'G18', 'G19', 'G20', 'G21', 'G28', 'G30', 'G31', 'G40', 'G41', 'G42', 'G43', 'G49', 'G52', 'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G73', 'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G90', 'G91', 'G92', 'G93', 'G94', 'G95', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M30', 'M48', 'M49', 'M98', 'M99'],
    unsupported_gcodes: ['G5', 'G33', 'G33.1', 'G76', 'G96', 'G97'],
    notes: 'Stepcraft default controller. UC100/UC300 motion controller required. Windows-based, Mach3-like interface.'
  },
};

// ── G-code replacement suggestions ─────────────────────────────────────────

const GCODE_REPLACEMENTS: Record<string, { replacement: string; reason: string }> = {
  'G81': { replacement: 'G0 Z[R] + G1 Z[depth] F[feed] + G0 Z[R]', reason: 'Replace canned drill cycle with explicit moves' },
  'G82': { replacement: 'G0 Z[R] + G1 Z[depth] F[feed] + G4 P[dwell] + G0 Z[R]', reason: 'Replace spot drill cycle with explicit moves + dwell' },
  'G83': { replacement: 'Peck drill macro: repeated G1 Z[peck] + G0 Z[R]', reason: 'Replace peck drill cycle with explicit pecking sequence' },
  'G84': { replacement: 'Not possible without spindle sync — use spiral interpolation or hand-tap', reason: 'Rigid tapping requires spindle encoder feedback' },
  'G85': { replacement: 'G1 Z[depth] F[feed] + G1 Z[R] F[retract_feed]', reason: 'Replace bore cycle with explicit feed-in and feed-out' },
  'G41': { replacement: 'Apply cutter comp in CAM software before post-processing', reason: 'Controller lacks cutter radius compensation — offset in CAM' },
  'G42': { replacement: 'Apply cutter comp in CAM software before post-processing', reason: 'Controller lacks cutter radius compensation — offset in CAM' },
  'G43': { replacement: 'G43.1 Z[offset] (if supported) or set Z zero per tool', reason: 'Use dynamic tool length offset or re-zero Z per tool' },
  'M6': { replacement: 'M5 + M0 (pause for manual tool change) + M3', reason: 'No automatic tool changer — pause for manual change' },
  'M98': { replacement: 'Inline the subroutine code directly', reason: 'Controller does not support subroutine calls' },
  'M99': { replacement: 'Remove (inline subroutine content)', reason: 'No subroutine return — inline all code' },
  'G96': { replacement: 'Calculate fixed RPM: S = (Vc * 1000) / (pi * D)', reason: 'No constant surface speed — use calculated fixed RPM' },
  'G97': { replacement: 'Already fixed RPM mode — no change needed if CSS not used', reason: 'Cancel CSS not needed if CSS was never active' },
  'G33': { replacement: 'Use single-point threading macro or avoid threading on this controller', reason: 'No spindle-synchronized motion' },
  'G76': { replacement: 'Use manual threading or thread milling', reason: 'No threading cycle support' },
};

// ── Material rigidity requirements ─────────────────────────────────────────

const MATERIAL_RIGIDITY: Record<string, { min_spindle_w: number; min_weight_kg: number; frame_types: string[] }> = {
  'wood': { min_spindle_w: 50, min_weight_kg: 5, frame_types: ['aluminum_extrusion', 'steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'plastic': { min_spindle_w: 50, min_weight_kg: 5, frame_types: ['aluminum_extrusion', 'steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'foam': { min_spindle_w: 30, min_weight_kg: 3, frame_types: ['aluminum_extrusion', 'steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'wax': { min_spindle_w: 30, min_weight_kg: 3, frame_types: ['aluminum_extrusion', 'steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'pcb': { min_spindle_w: 50, min_weight_kg: 5, frame_types: ['aluminum_extrusion', 'steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'acrylic': { min_spindle_w: 100, min_weight_kg: 10, frame_types: ['aluminum_extrusion', 'steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'aluminum': { min_spindle_w: 300, min_weight_kg: 25, frame_types: ['steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'brass': { min_spindle_w: 300, min_weight_kg: 25, frame_types: ['steel_plate', 'cast_iron', 'steel_tube', 'hybrid'] },
  'soft_metal': { min_spindle_w: 200, min_weight_kg: 20, frame_types: ['steel_plate', 'cast_iron', 'steel_tube', 'hybrid', 'aluminum_extrusion'] },
  'mild_steel': { min_spindle_w: 750, min_weight_kg: 80, frame_types: ['steel_plate', 'cast_iron', 'steel_tube'] },
  'steel': { min_spindle_w: 1000, min_weight_kg: 150, frame_types: ['cast_iron', 'steel_tube'] },
  'cast_iron': { min_spindle_w: 1000, min_weight_kg: 200, frame_types: ['cast_iron'] },
  'titanium': { min_spindle_w: 1500, min_weight_kg: 300, frame_types: ['cast_iron'] },
};

// ── Engine Class ───────────────────────────────────────────────────────────

class HobbyCNCProfileEngine {
  /**
   * Get a specific machine by ID.
   */
  getMachine(input: { machine_id: string }): HobbyMachine | { error: string } {
    const m = HOBBY_MACHINES.find(m => m.id === input.machine_id);
    if (!m) return { error: `Machine '${input.machine_id}' not found. Available: ${HOBBY_MACHINES.map(m => m.id).join(', ')}` };
    return m;
  }

  /**
   * Search machines by controller, travel, price, spindle power.
   */
  searchMachines(input: {
    controller?: string;
    min_travel_x?: number;
    min_travel_y?: number;
    min_travel_z?: number;
    max_price?: number;
    min_price?: number;
    spindle_power_min?: number;
    material?: string;
    manufacturer?: string;
    min_axes?: number;
  }): { machines: HobbyMachine[]; count: number } {
    let results = [...HOBBY_MACHINES];

    if (input.controller) {
      const ctrl = input.controller.toLowerCase();
      results = results.filter(m => m.controller.toLowerCase() === ctrl);
    }
    if (input.min_travel_x != null) results = results.filter(m => m.travel.x >= input.min_travel_x!);
    if (input.min_travel_y != null) results = results.filter(m => m.travel.y >= input.min_travel_y!);
    if (input.min_travel_z != null) results = results.filter(m => m.travel.z >= input.min_travel_z!);
    if (input.max_price != null) results = results.filter(m => m.price_min_usd <= input.max_price!);
    if (input.min_price != null) results = results.filter(m => m.price_max_usd >= input.min_price!);
    if (input.spindle_power_min != null) results = results.filter(m => m.spindle_power_w >= input.spindle_power_min!);
    if (input.material) {
      const mat = input.material.toLowerCase();
      results = results.filter(m => m.suitable_materials.includes(mat));
    }
    if (input.manufacturer) {
      const mfr = input.manufacturer.toLowerCase();
      results = results.filter(m => m.manufacturer.toLowerCase().includes(mfr));
    }
    if (input.min_axes != null) results = results.filter(m => m.max_axes >= input.min_axes!);

    return { machines: results, count: results.length };
  }

  /**
   * Get controller profile by name.
   */
  getControllerProfile(input: { controller: string }): ControllerProfile | { error: string } {
    const profile = CONTROLLER_PROFILES[input.controller];
    if (!profile) {
      return { error: `Controller '${input.controller}' not found. Available: ${Object.keys(CONTROLLER_PROFILES).join(', ')}` };
    }
    return profile;
  }

  /**
   * Check G-code compatibility with a specific machine's controller.
   */
  checkCompatibility(input: { machine_id: string; gcode: string }): CompatibilityResult {
    const machine = HOBBY_MACHINES.find(m => m.id === input.machine_id);
    if (!machine) {
      return { compatible: false, machine_name: 'unknown', controller: 'unknown', unsupported_codes: [], warnings: [`Machine '${input.machine_id}' not found`], suggested_replacements: [] };
    }

    const profile = CONTROLLER_PROFILES[machine.controller];
    if (!profile) {
      return { compatible: false, machine_name: machine.name, controller: machine.controller, unsupported_codes: [], warnings: [`No controller profile for '${machine.controller}'`], suggested_replacements: [] };
    }

    // Parse G-codes from input
    const codeRegex = /([GM]\d+(?:\.\d+)?)/gi;
    const foundCodes = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = codeRegex.exec(input.gcode)) !== null) {
      foundCodes.add(match[1].toUpperCase());
    }

    const unsupported: string[] = [];
    const warnings: string[] = [];
    const replacements: Array<{ original: string; replacement: string; reason: string }> = [];

    for (const code of foundCodes) {
      if (profile.unsupported_gcodes.includes(code)) {
        unsupported.push(code);
        const repl = GCODE_REPLACEMENTS[code];
        if (repl) {
          replacements.push({ original: code, ...repl });
        }
      }
    }

    // Check for specific issues
    if (foundCodes.has('M6') && !profile.tool_change) {
      if (!unsupported.includes('M6')) unsupported.push('M6');
      warnings.push('Machine does not support automatic tool changes. Use M0 for manual pause.');
    }

    // Check feed mode
    if (foundCodes.has('G95') && !profile.supported_gcodes.includes('G95')) {
      warnings.push('Feed per revolution (G95) not supported — use feed per minute (G94).');
    }

    // Check program size (rough estimate: 1 char ~ 1 byte)
    if (profile.max_program_size_kb != null) {
      const sizeKB = input.gcode.length / 1024;
      if (sizeKB > profile.max_program_size_kb) {
        warnings.push(`Program size (~${Math.round(sizeKB)}KB) may exceed controller limit (${profile.max_program_size_kb}KB). Consider streaming via SD card or sender.`);
      }
    }

    return {
      compatible: unsupported.length === 0,
      machine_name: machine.name,
      controller: machine.controller,
      unsupported_codes: unsupported,
      warnings,
      suggested_replacements: replacements,
    };
  }

  /**
   * Recommend machines based on budget, material, work area, and features.
   */
  recommendMachine(input: {
    budget?: number;
    material?: string;
    work_area_needed?: { x: number; y: number; z: number };
    features_needed?: string[];
  }): { recommendations: MachineRecommendation[] } {
    const scored: MachineRecommendation[] = [];

    for (const machine of HOBBY_MACHINES) {
      let score = 50; // base score
      const reasons: string[] = [];
      const limitations: string[] = [];

      // Budget filter
      if (input.budget != null) {
        if (machine.price_min_usd > input.budget) {
          continue; // skip machines above budget
        }
        // Score by value (lower price = better value)
        const budgetPct = machine.price_min_usd / input.budget;
        score += (1 - budgetPct) * 20;
        reasons.push(`Within budget at ${machine.price_range}`);
      }

      // Material suitability
      if (input.material) {
        const mat = input.material.toLowerCase();
        if (machine.suitable_materials.includes(mat)) {
          score += 25;
          reasons.push(`Suitable for ${input.material}`);
        } else {
          const req = MATERIAL_RIGIDITY[mat];
          if (req) {
            if (machine.spindle_power_w < req.min_spindle_w) {
              limitations.push(`Spindle power (${machine.spindle_power_w}W) below minimum ${req.min_spindle_w}W for ${mat}`);
              score -= 30;
            }
            if (machine.weight_kg < req.min_weight_kg) {
              limitations.push(`Machine weight (${machine.weight_kg}kg) below minimum ${req.min_weight_kg}kg rigidity for ${mat}`);
              score -= 20;
            }
          }
          limitations.push(`Not rated for ${input.material} by manufacturer`);
          score -= 15;
        }
      }

      // Work area
      if (input.work_area_needed) {
        const wa = input.work_area_needed;
        const xOk = machine.travel.x >= wa.x;
        const yOk = machine.travel.y >= wa.y;
        const zOk = machine.travel.z >= wa.z;
        if (xOk && yOk && zOk) {
          score += 20;
          reasons.push(`Travel ${machine.travel.x}x${machine.travel.y}x${machine.travel.z}mm meets requirements`);
        } else {
          const shortAxes: string[] = [];
          if (!xOk) shortAxes.push(`X: need ${wa.x}mm, have ${machine.travel.x}mm`);
          if (!yOk) shortAxes.push(`Y: need ${wa.y}mm, have ${machine.travel.y}mm`);
          if (!zOk) shortAxes.push(`Z: need ${wa.z}mm, have ${machine.travel.z}mm`);
          limitations.push(`Insufficient travel: ${shortAxes.join('; ')}`);
          score -= 25;
        }
      }

      // Feature matching
      if (input.features_needed) {
        const profile = CONTROLLER_PROFILES[machine.controller];
        for (const feat of input.features_needed) {
          const fl = feat.toLowerCase();
          if (fl === 'canned_cycles' || fl === 'canned cycles') {
            if (profile?.supports_canned_cycles) { score += 10; reasons.push('Supports canned cycles'); }
            else { score -= 10; limitations.push('No canned cycle support'); }
          } else if (fl === 'tool_change' || fl === 'tool change' || fl === 'atc') {
            if (profile?.tool_change) { score += 10; reasons.push('Supports tool changes'); }
            else { score -= 10; limitations.push('No automatic tool change'); }
          } else if (fl === 'probe' || fl === 'probing') {
            if (profile?.probe_support) { score += 5; reasons.push('Probe support'); }
            else { score -= 5; limitations.push('No probe support'); }
          } else if (fl === '5axis' || fl === '5-axis' || fl === 'multi-axis') {
            if (machine.max_axes >= 5) { score += 15; reasons.push(`${machine.max_axes}-axis capable`); }
            else { score -= 15; limitations.push(`Only ${machine.max_axes} axes`); }
          } else if (fl === 'enclosed') {
            if (machine.notes?.toLowerCase().includes('enclosed')) { score += 10; reasons.push('Enclosed design'); }
            else { limitations.push('Not enclosed'); }
          } else if (fl === 'cast_iron' || fl === 'cast iron' || fl === 'rigid') {
            if (machine.frame_type === 'cast_iron') { score += 15; reasons.push('Cast iron frame — high rigidity'); }
            else if (machine.frame_type === 'steel_plate' || machine.frame_type === 'steel_tube') { score += 5; reasons.push('Steel frame — moderate rigidity'); }
            else { limitations.push('Aluminum extrusion frame — lower rigidity'); }
          }
        }
      }

      // Bonus for cast iron frame (general rigidity)
      if (machine.frame_type === 'cast_iron') score += 5;
      if (machine.frame_type === 'steel_plate' || machine.frame_type === 'steel_tube') score += 3;

      scored.push({ machine, score: Math.max(0, Math.min(100, score)), reasons, limitations });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return { recommendations: scored.slice(0, 10) };
  }

  /**
   * List all available machines.
   */
  listMachines(): { machines: Array<{ id: string; name: string; controller: string; price_range: string }>; count: number } {
    return {
      machines: HOBBY_MACHINES.map(m => ({ id: m.id, name: m.name, controller: m.controller, price_range: m.price_range })),
      count: HOBBY_MACHINES.length,
    };
  }

  /**
   * List all available controllers.
   */
  listControllers(): { controllers: string[] } {
    return { controllers: Object.keys(CONTROLLER_PROFILES) };
  }

  /**
   * Generic calculate() entry point for dispatcher.
   */
  calculate(params: Record<string, any>): any {
    const method = params.method as string;
    switch (method) {
      case 'get': return this.getMachine(params as any);
      case 'search': return this.searchMachines(params as any);
      case 'controller': return this.getControllerProfile(params as any);
      case 'compatibility': return this.checkCompatibility(params as any);
      case 'recommend': return this.recommendMachine(params as any);
      case 'list': return this.listMachines();
      case 'list_controllers': return this.listControllers();
      default: return { error: `Unknown method '${method}'. Available: get, search, controller, compatibility, recommend, list, list_controllers` };
    }
  }
}

export const hobbyCNCProfileEngine = new HobbyCNCProfileEngine();
export { HobbyCNCProfileEngine };
