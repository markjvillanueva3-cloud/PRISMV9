export type MachineMode =
  | "mill" | "lathe" | "drilling" | "grinding" | "threading"
  | "honing" | "boring" | "broaching" | "plasma"
  | "wire_edm" | "sinker_edm" | "laser" | "waterjet";

export interface SubOperation {
  id: string;
  label: string;
}

export interface MachineModeConfig {
  id: MachineMode;
  label: string;
  icon: string;
  description: string;
  /** Visual grouping label for the tab bar */
  group: "chip_removal" | "finishing" | "non_traditional";
  /** Which stock shapes are available in this mode */
  stockShapes: string[];
  /** Which parameter sections to show */
  paramSections: string[];
  /** Whether tool holder panel is shown (false for EDM/Laser/Waterjet) */
  showToolHolder: boolean;
  /** Whether turret layout is shown (lathe only) */
  showTurret: boolean;
  /** Sub-operations available in this mode */
  subOperations: SubOperation[];
}

export const MACHINE_MODES: MachineModeConfig[] = [
  // ── Chip Removal ──────────────────────────────────────────
  {
    id: "mill",
    label: "Mill",
    icon: "\u{1F3ED}",
    description: "VMC / HMC / 5-Axis",
    group: "chip_removal",
    stockShapes: ["plate", "square", "round", "hex", "tube", "flat", "angle"],
    paramSections: ["speed", "feed", "doc", "woc", "coolant"],
    showToolHolder: true,
    showTurret: false,
    subOperations: [
      { id: "face_milling", label: "Face Milling" },
      { id: "slot_milling", label: "Slot Milling" },
      { id: "pocket_milling", label: "Pocket Milling" },
      { id: "profile_milling", label: "Profile / Contour" },
      { id: "semi-finishing", label: "Semi-Finishing" },
      { id: "finishing", label: "Finishing" },
    ],
  },
  {
    id: "lathe",
    label: "Lathe",
    icon: "\u{1F529}",
    description: "CNC Turning / Mill-Turn",
    group: "chip_removal",
    stockShapes: ["round", "tube", "hex"],
    paramSections: ["surface_speed", "feed_per_rev", "doc", "coolant"],
    showToolHolder: true,
    showTurret: true,
    subOperations: [
      { id: "rough_turning", label: "Rough Turning" },
      { id: "finish_turning", label: "Finish Turning" },
      { id: "boring_turn", label: "Boring" },
      { id: "parting", label: "Parting / Grooving" },
      { id: "facing", label: "Facing" },
    ],
  },
  {
    id: "drilling",
    label: "Drilling",
    icon: "\u{1F527}",
    description: "Drill / Ream / Tap",
    group: "chip_removal",
    stockShapes: ["plate", "round"],
    paramSections: ["speed", "feed", "depth", "coolant"],
    showToolHolder: true,
    showTurret: false,
    subOperations: [
      { id: "drilling", label: "Twist Drill" },
      { id: "reaming", label: "Reaming" },
      { id: "tapping", label: "Tapping" },
      { id: "center_drill", label: "Center Drill" },
      { id: "peck_drill", label: "Peck Drill" },
      { id: "gun_drill", label: "Gun Drill" },
    ],
  },
  {
    id: "boring",
    label: "Boring",
    icon: "\u2B55",
    description: "Line / Jig / Back Boring",
    group: "chip_removal",
    stockShapes: ["plate", "round"],
    paramSections: ["speed", "feed", "doc", "coolant"],
    showToolHolder: true,
    showTurret: false,
    subOperations: [
      { id: "line_boring", label: "Line Boring" },
      { id: "jig_boring", label: "Jig Boring" },
      { id: "back_boring", label: "Back Boring" },
      { id: "fine_boring", label: "Fine Boring" },
    ],
  },

  // ── Finishing ─────────────────────────────────────────────
  {
    id: "grinding",
    label: "Grinding",
    icon: "\u{1F518}",
    description: "Surface / Cylindrical / ID",
    group: "finishing",
    stockShapes: ["plate", "round"],
    paramSections: ["wheel_speed", "feed", "doc", "coolant"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "surface_grinding", label: "Surface Grinding" },
      { id: "cylindrical_grinding", label: "Cylindrical Grinding" },
      { id: "internal_grinding", label: "Internal Grinding" },
      { id: "centerless_grinding", label: "Centerless Grinding" },
      { id: "creep_feed", label: "Creep Feed" },
    ],
  },
  {
    id: "honing",
    label: "Honing",
    icon: "\u{1F48E}",
    description: "Bore / Surface Honing",
    group: "finishing",
    stockShapes: ["round", "tube"],
    paramSections: ["stone_speed", "stroke", "pressure", "coolant"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "bore_honing", label: "Bore Honing" },
      { id: "plateau_honing", label: "Plateau Honing" },
      { id: "cross_hatch", label: "Cross-Hatch" },
    ],
  },
  {
    id: "threading",
    label: "Threading",
    icon: "\u{1F9F5}",
    description: "Thread Mill / Single-Point",
    group: "finishing",
    stockShapes: ["round", "tube"],
    paramSections: ["pitch", "depth", "passes", "coolant"],
    showToolHolder: true,
    showTurret: false,
    subOperations: [
      { id: "thread_milling", label: "Thread Milling" },
      { id: "single_point_thread", label: "Single-Point Threading" },
      { id: "thread_tapping", label: "Thread Tapping" },
      { id: "thread_rolling", label: "Thread Rolling" },
    ],
  },
  {
    id: "broaching",
    label: "Broaching",
    icon: "\u{1F4D0}",
    description: "Internal / Surface",
    group: "finishing",
    stockShapes: ["plate", "round"],
    paramSections: ["cut_per_tooth", "speed", "coolant"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "internal_broaching", label: "Internal Broaching" },
      { id: "surface_broaching", label: "Surface Broaching" },
      { id: "pot_broaching", label: "Pot Broaching" },
    ],
  },

  // ── Non-Traditional ───────────────────────────────────────
  {
    id: "wire_edm",
    label: "Wire EDM",
    icon: "\u{1F9F5}",
    description: "Wire Cutting",
    group: "non_traditional",
    stockShapes: ["plate"],
    paramSections: ["wire_speed", "tension", "flushing", "taper"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "first_cut", label: "First Cut" },
      { id: "skim_cut", label: "Skim Cut" },
      { id: "taper_cut", label: "Taper Cut" },
    ],
  },
  {
    id: "sinker_edm",
    label: "Sinker EDM",
    icon: "\u26A1",
    description: "Spark Erosion",
    group: "non_traditional",
    stockShapes: ["plate"],
    paramSections: ["pulse_width", "voltage", "current", "wear_rate"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "rough_burn", label: "Rough Burn" },
      { id: "finish_burn", label: "Finish Burn" },
      { id: "micro_edm", label: "Micro EDM" },
      { id: "orbiting", label: "Orbiting" },
    ],
  },
  {
    id: "laser",
    label: "Laser",
    icon: "\u{1F4A0}",
    description: "Fiber / CO\u2082 / Disk",
    group: "non_traditional",
    stockShapes: ["plate"],
    paramSections: ["laser_power", "pulse_freq", "assist_gas", "cut_speed"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "fiber_laser", label: "Fiber Laser" },
      { id: "co2_laser", label: "CO\u2082 Laser" },
      { id: "disk_laser", label: "Disk Laser" },
      { id: "laser_engraving", label: "Laser Engraving" },
    ],
  },
  {
    id: "waterjet",
    label: "Waterjet",
    icon: "\u{1F4A7}",
    description: "Abrasive / Pure Water",
    group: "non_traditional",
    stockShapes: ["plate"],
    paramSections: ["pressure", "nozzle", "abrasive", "cut_speed"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "abrasive_waterjet", label: "Abrasive Waterjet" },
      { id: "pure_waterjet", label: "Pure Waterjet" },
      { id: "dynamic_waterjet", label: "Dynamic Waterjet" },
    ],
  },
  {
    id: "plasma",
    label: "Plasma",
    icon: "\u{1F525}",
    description: "HiDef / Conventional",
    group: "non_traditional",
    stockShapes: ["plate"],
    paramSections: ["amperage", "cut_speed", "pierce_height", "gas_type"],
    showToolHolder: false,
    showTurret: false,
    subOperations: [
      { id: "hidef_plasma", label: "HiDef Plasma" },
      { id: "conventional_plasma", label: "Conventional Plasma" },
      { id: "fine_plasma", label: "Fine Plasma" },
    ],
  },
];

/** Group labels for visual separation in the tab bar */
export const MODE_GROUPS: { id: MachineModeConfig["group"]; label: string }[] = [
  { id: "chip_removal", label: "Chip Removal" },
  { id: "finishing", label: "Finishing" },
  { id: "non_traditional", label: "Non-Traditional" },
];

export function getModeConfig(mode: MachineMode): MachineModeConfig {
  return MACHINE_MODES.find((m) => m.id === mode) ?? MACHINE_MODES[0];
}
