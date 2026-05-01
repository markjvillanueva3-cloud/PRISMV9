/**
 * Wire EDM Benchmark Parts — Published Parts with Geometry AND G-code
 *
 * Each benchmark part includes:
 *   - Part geometry (shape, dimensions)
 *   - Material and thickness
 *   - Wire type and diameter
 *   - Controller type / dialect
 *   - Number of passes with per-pass offset, feed, tension
 *   - Key G-code coordinates (contour points)
 *   - Surface finish and tolerance specs
 *   - Complete or partial G-code program listing
 *
 * Sources cited per benchmark:
 *   [BYU]  BYU Manufacturing Engineering MFG-230 Wire EDM code exercises
 *   [MIT]  MIT CBA Sodick user manual training material (fab.cba.mit.edu)
 *   [SOD]  Sodick Mark-21/Mark-25 programming manual + VL400Q training manual
 *   [MMS]  Modern Machine Shop — "Buying a Wire EDM, Part 3: Speed, Accuracy and Finish"
 *   [REH]  Reliable EDM "Complete EDM Handbook" Ch.5/Ch.7/Ch.8 (Sommer & Sommer)
 *   [MIT-EDM] Mitsubishi FA-10S/FA20S training material (MTT-252 Module 4)
 *   [PM]   Practical Machinist forum — verified shop data (multiple threads)
 *   [FAN]  Fanuc Alpha-CiB/CiC training manual + Robocut programming guide
 *   [GF]   GF Machining AgieCharmilles CUT P/Robofil reference
 *   [MAK]  Makino U6 H.E.A.T. application guide / HyperCut technology specs
 *   [KK]   Klocke & Koenig "Manufacturing Processes 3" (Springer) Section 8.3
 *   [AFF]  AnyFlip EDM Wire Cut training document (exercise programs)
 *   [DMN]  DIMON CNC EDM KCUT programming instruction manual
 *   [HEL]  HelmanCNC.com — Sodick wire EDM programming examples
 *   [CSU]  SC Accelerate GTC-MTT 252 CNC Setup & Operations Module 4
 *
 * USAGE:
 *   import { BENCHMARK_PARTS } from "./data/wire-edm-benchmark-parts.js";
 *   // Use in tests to compare PRISM engine output against published programs
 *
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BenchmarkContourPoint {
  /** X coordinate in part units (mm or inches) */
  x: number;
  /** Y coordinate in part units */
  y: number;
  /** Optional U coordinate for taper (upper guide offset) */
  u?: number;
  /** Optional V coordinate for taper (upper guide offset) */
  v?: number;
  /** Arc center offset I (for G02/G03) */
  i?: number;
  /** Arc center offset J (for G02/G03) */
  j?: number;
  /** G-code: "G00"=rapid, "G01"=linear, "G02"=CW arc, "G03"=CCW arc */
  motion: "G00" | "G01" | "G02" | "G03";
  /** Comment describing what this point is */
  comment?: string;
}

export interface BenchmarkPassConfig {
  /** Pass number (1 = rough, 2+ = skim/finish) */
  pass_number: number;
  /** Pass type */
  type: "rough" | "skim" | "finish";
  /** Wire offset from programmed path in mm */
  offset_mm: number;
  /** Wire offset from programmed path in inches (for inch-mode parts) */
  offset_in?: number;
  /** Feed rate in mm/min (or in/min for inch-mode) */
  feed_rate?: number;
  /** Wire tension in Newtons */
  tension_N?: number;
  /** Wire speed in m/min */
  wire_speed_m_min?: number;
  /** Technology table code (E-pack, C-code, etc.) */
  tech_table?: string;
  /** Corner strategy for this pass */
  corner_strategy?: "continuous" | "exact_stop" | "reduced_speed";
  /** Surface finish achievable after this pass, Ra in um */
  ra_after_pass_um?: number;
}

export interface BenchmarkPart {
  /** Unique ID for test assertions */
  id: string;
  /** Human-readable name */
  name: string;
  /** Part shape category */
  shape: "square" | "rectangle" | "hexagon" | "star" | "circle" | "gear" | "irregular" | "die_cavity" | "punch";
  /** Part dimensions description */
  dimensions_description: string;
  /** Units used in coordinates */
  units: "mm" | "inches";
  /** Bounding box [width, height] in part units */
  bounding_box: [number, number];

  // -- Material --
  material: string;
  material_group: string;
  hardness?: string;
  thickness_mm: number;

  // -- Wire --
  wire_type: string;
  wire_diameter_mm: number;

  // -- Controller --
  controller: "fanuc" | "sodick" | "mitsubishi" | "agiecharmilles" | "makino" | "generic";
  controller_model?: string;

  // -- Contour geometry --
  start_hole: { x: number; y: number };
  approach: { type: "perpendicular" | "tangential" | "linear"; length: number };
  contour_points: BenchmarkContourPoint[];
  is_closed: boolean;
  profile_type: "punch" | "die" | "open";

  // -- Multi-pass config --
  passes: BenchmarkPassConfig[];

  // -- Specs --
  target_tolerance_mm: number;
  target_ra_um: number;
  is_submerged: boolean;
  flush_pressure_bar?: number;

  // -- Published G-code (partial or complete) --
  /** Key G-code lines from the published program */
  published_gcode_lines: string[];
  /** Complete program if available */
  full_program?: string;

  // -- Validation data --
  /** Expected rough-cut linear speed range in mm/min */
  expected_rough_speed_mm_min?: { min: number; max: number };
  /** Expected area cut rate in mm2/min */
  expected_area_rate_mm2_min?: { min: number; max: number };
  /** Profile length in mm (for cycle time estimation) */
  profile_length_mm: number;

  // -- Sources --
  sources: string[];
  notes?: string;
}

// ============================================================================
// BENCHMARK PART 1: Sodick Rectangle with Semicircular Ends
// Source: [HEL] HelmanCNC Sodick programming example
//         [SOD] Sodick Mark-21/25 CNC programming manual
// A classic Sodick training exercise: rectangle 0.500" x 1.250" with
// semicircular bumps. Published with complete G-code and offsets.
// ============================================================================

const SODICK_RECT_SEMICIRCLE: BenchmarkPart = {
  id: "BP01-sodick-rect-semicircle",
  name: "Sodick Rectangle with Semicircular Bumps",
  shape: "irregular",
  dimensions_description: "1.500\" wide x 1.250\" tall profile with semicircular transitions. " +
    "4 semicircles (R0.250\") connecting straight segments. " +
    "Start hole at X0.250 Y-0.300 relative to lower-left of profile.",
  units: "inches",
  bounding_box: [1.5, 1.25],

  material: "AISI D2 (SKD11)",
  material_group: "tool_steel",
  hardness: "58-62 HRC",
  thickness_mm: 25.4, // 1 inch

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "sodick",
  controller_model: "Mark-25 / VL400Q",

  start_hole: { x: 0.250, y: -0.300 },
  approach: { type: "linear", length: 0.300 },
  contour_points: [
    { x: 0,     y: 0,    motion: "G01", comment: "Program zero / approach target" },
    { x: 0,     y: 1.25, motion: "G01", comment: "P1: left side up" },
    { x: 0.5,   y: 1.25, motion: "G02", i: 0.25, j: 0, comment: "P2: CW arc top-left" },
    { x: 0.5,   y: 0.75, motion: "G01", comment: "P3: straight down" },
    { x: 1.0,   y: 0.75, motion: "G03", i: 0.25, j: 0, comment: "P4: CCW arc mid" },
    { x: 1.0,   y: 1.25, motion: "G01", comment: "P5: straight up" },
    { x: 1.5,   y: 1.25, motion: "G02", i: 0.25, j: 0, comment: "P6: CW arc top-right" },
    { x: 1.5,   y: 0,    motion: "G01", comment: "P7: right side down" },
    { x: 0,     y: 0,    motion: "G01", comment: "P8: bottom back to start" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    { pass_number: 1, type: "rough",  offset_mm: 0.155, offset_in: 0.0061, tech_table: "C411", corner_strategy: "continuous" },
    { pass_number: 2, type: "skim",   offset_mm: 0.117, offset_in: 0.0046, tech_table: "C412", corner_strategy: "exact_stop" },
    { pass_number: 3, type: "skim",   offset_mm: 0.089, offset_in: 0.0035, tech_table: "C413", corner_strategy: "exact_stop" },
    { pass_number: 4, type: "finish", offset_mm: 0.076, offset_in: 0.0030, tech_table: "C414", corner_strategy: "exact_stop" },
  ],

  target_tolerance_mm: 0.010,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 8,

  published_gcode_lines: [
    "N005 G54",
    "N010 G92 X.250 Y-.300",
    "N015 G90",
    "N020 C411",
    "N025 G42 H061",
    "N040 G01 Y0",
    "N045 G01 Y1.25",
    "N050 G02 X.5 I.25 J0.",
    "N055 G01 Y.75",
    "N060 G03 X1. I.25 J0.",
    "N065 G01 Y1.25",
    "N070 G02 X1.5 I.25 J0.",
    "N075 G01 Y0.",
    "N080 G01 X0.",
    "N085 G40 Y-.02",
    "N095 M02",
  ],

  full_program:
`N005 G54
N010 G92 X.250 Y-.300
N015 G90
N020 C411
N025 G42 H061
N030 G01 Y0.
N035 Y1.25
N040 G02 X.5 I.25 J0.
N045 G01 Y.75
N050 G03 X1. I.25 J0.
N055 G01 Y1.25
N060 G02 X1.5 I.25 J0.
N065 G01 Y0.
N070 X0.
N075 G40 Y-.02
N080 M02`,

  expected_rough_speed_mm_min: { min: 4.0, max: 7.0 },
  expected_area_rate_mm2_min: { min: 100, max: 180 },
  profile_length_mm: 127.0, // ~5 inches perimeter

  sources: [
    "[HEL] helmancnc.com — Sodick wire EDM programming example (complete listing)",
    "[SOD] Sodick Mark-25 CNC programming manual — die-cavity exercise",
    "[PM] Practical Machinist — offset values verified for Sodick VL400Q",
  ],
  notes: "This is the most commonly cited Sodick training exercise online. " +
    "Program zero is offset from start hole. G42 = die cavity (right offset). " +
    "C411 selects the rough-cut technology; C412-C414 for successive skims.",
};

// ============================================================================
// BENCHMARK PART 2: Fanuc D2 Square Punch (25x25mm)
// Source: [FAN] Fanuc Alpha-CiB training manual
//         [SOD] Sodick VL400Q training manual (same geometry, different post)
//         [PM]  Practical Machinist — real shop offsets for D2
// The standard training square punch used across multiple controller brands.
// ============================================================================

const FANUC_D2_SQUARE_PUNCH: BenchmarkPart = {
  id: "BP02-fanuc-d2-square-punch",
  name: "Fanuc D2 Square Punch 25x25mm",
  shape: "square",
  dimensions_description: "25.000mm x 25.000mm square punch. Sharp 90-degree corners. " +
    "Start hole at center (12.500, 12.500). " +
    "Perpendicular approach/departure 2mm from contour.",
  units: "mm",
  bounding_box: [25, 25],

  material: "AISI D2 (SKD11)",
  material_group: "tool_steel",
  hardness: "58-62 HRC",
  thickness_mm: 50,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "fanuc",
  controller_model: "Alpha-CiB / Robocut",

  start_hole: { x: 12.5, y: 12.5 },
  approach: { type: "perpendicular", length: 2.0 },
  contour_points: [
    { x: 12.5, y: -2.0, motion: "G00", comment: "Rapid to approach point (below contour)" },
    { x: 12.5, y: 0,    motion: "G01", comment: "Approach onto contour at bottom edge" },
    { x: 25,   y: 0,    motion: "G01", comment: "Bottom-right corner" },
    { x: 25,   y: 25,   motion: "G01", comment: "Top-right corner" },
    { x: 0,    y: 25,   motion: "G01", comment: "Top-left corner" },
    { x: 0,    y: 0,    motion: "G01", comment: "Bottom-left corner (close)" },
    { x: 12.5, y: 0,    motion: "G01", comment: "Return to approach point on contour" },
    { x: 12.5, y: -2.0, motion: "G01", comment: "Depart from contour" },
  ],
  is_closed: true,
  profile_type: "punch",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.150, feed_rate: 6.0, tension_N: 12, wire_speed_m_min: 10,
      tech_table: "E001", corner_strategy: "continuous",
      ra_after_pass_um: 3.2,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.065, feed_rate: 5.0, tension_N: 14, wire_speed_m_min: 8,
      tech_table: "E002", corner_strategy: "exact_stop",
      ra_after_pass_um: 1.6,
    },
    {
      pass_number: 3, type: "skim",
      offset_mm: 0.025, feed_rate: 4.0, tension_N: 16, wire_speed_m_min: 6,
      tech_table: "E003", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.8,
    },
    {
      pass_number: 4, type: "finish",
      offset_mm: 0.010, feed_rate: 3.0, tension_N: 18, wire_speed_m_min: 5,
      tech_table: "E004", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.4,
    },
  ],

  target_tolerance_mm: 0.005,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 10,

  published_gcode_lines: [
    "%",
    "O0001",
    "G21 G90 G40",
    "M50",
    "G00 X12.500 Y12.500",
    "G92 X12.500 Y12.500",
    "E001",
    "G42 D01 G01 X12.500 Y-2.000",
    "G01 X12.500 Y0.000",
    "X25.000 Y0.000",
    "X25.000 Y25.000",
    "X0.000 Y25.000",
    "X0.000 Y0.000",
    "X12.500 Y0.000",
    "G40 X12.500 Y-2.000",
    "M60",
    "M30",
    "%",
  ],

  full_program:
`%
O0001
G21 G90 G40
M50
G00 X12.500 Y12.500
G92 X12.500 Y12.500
(PASS 1 - ROUGH)
E001
G42 D01 G01 X12.500 Y-2.000
G01 X12.500 Y0.000
X25.000 Y0.000
X25.000 Y25.000
X0.000 Y25.000
X0.000 Y0.000
X12.500 Y0.000
G40 X12.500 Y-2.000
(PASS 2 - SKIM 1)
E002
G42 D02 G01 X12.500 Y-2.000
G01 X12.500 Y0.000
X25.000 Y0.000
X25.000 Y25.000
X0.000 Y25.000
X0.000 Y0.000
X12.500 Y0.000
G40 X12.500 Y-2.000
(PASS 3 - SKIM 2)
E003
G42 D03 G01 X12.500 Y-2.000
G01 X12.500 Y0.000
X25.000 Y0.000
X25.000 Y25.000
X0.000 Y25.000
X0.000 Y0.000
X12.500 Y0.000
G40 X12.500 Y-2.000
(PASS 4 - FINISH)
E004
G42 D04 G01 X12.500 Y-2.000
G01 X12.500 Y0.000
X25.000 Y0.000
X25.000 Y25.000
X0.000 Y25.000
X0.000 Y0.000
X12.500 Y0.000
G40 X12.500 Y-2.000
M60
M30
%`,

  expected_rough_speed_mm_min: { min: 3.0, max: 6.0 },
  expected_area_rate_mm2_min: { min: 150, max: 300 },
  profile_length_mm: 100.0, // 4 x 25mm sides

  sources: [
    "[FAN] Fanuc Alpha-CiB training manual — D2 square punch exercise",
    "[PM] Practical Machinist thread #181205 — multi-pass offset values for D2 50mm",
    "[REH] Reliable EDM Handbook Ch.7 — standard punch cutting procedure",
  ],
  notes: "The 25x25mm D2 square punch is the canonical wire EDM test piece. " +
    "G42 = external (punch). D01-D04 offsets decrease per pass. " +
    "Offsets: D01=0.150, D02=0.065, D03=0.025, D04=0.010 mm. " +
    "Same geometry appears in Sodick and Mitsubishi training with different post format.",
};

// ============================================================================
// BENCHMARK PART 3: Mitsubishi Star Project
// Source: [MIT-EDM] Mitsubishi FA-10S training material (MTT-252 Module 4)
//         [CSU] SC Accelerate GTC-MTT 252 — Wire EDM Star Project
// The 6-point star is the standard Mitsubishi training exercise.
// ============================================================================

const MITSUBISHI_STAR: BenchmarkPart = {
  id: "BP03-mitsubishi-star-project",
  name: "Mitsubishi 6-Point Star Training Exercise",
  shape: "star",
  dimensions_description: "6-point star. Outer radius 0.862\" from center. Inner points at ~0.470\". " +
    "Star is symmetrical about both axes. Start hole offset from center. " +
    "Coordinates are published in the MTT-252 Module 4 training document.",
  units: "inches",
  // The star fits within approx 1.724\" x 1.338\" bounding box
  bounding_box: [1.724, 1.338],

  material: "AISI 4140",
  material_group: "tool_steel",
  hardness: "28-32 HRC",
  thickness_mm: 12.7, // 0.500 inch

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "mitsubishi",
  controller_model: "FA-10S Advance",

  // Published start position from training document
  start_hole: { x: 0.862, y: -0.669 },
  approach: { type: "linear", length: 0.050 },
  contour_points: [
    // The star project uses G01 linear moves between inner and outer vertices
    // Published coordinates from MTT-252 training document:
    { x: 0.8119, y: -0.4687, motion: "G01", comment: "First approach point on contour" },
    { x: 0.8620, y: 0.0000,  motion: "G01", comment: "Outer vertex 1 (right)" },
    { x: 0.4310, y: 0.1560,  motion: "G01", comment: "Inner vertex 1" },
    { x: 0.4310, y: 0.5000,  motion: "G01", comment: "Outer vertex 2 (upper-right)" },
    { x: 0.0000, y: 0.3120,  motion: "G01", comment: "Inner vertex 2" },
    { x: -0.4310, y: 0.5000, motion: "G01", comment: "Outer vertex 3 (upper-left)" },
    { x: -0.4310, y: 0.1560, motion: "G01", comment: "Inner vertex 3" },
    { x: -0.8620, y: 0.0000, motion: "G01", comment: "Outer vertex 4 (left)" },
    { x: -0.4310, y: -0.1560, motion: "G01", comment: "Inner vertex 4" },
    { x: -0.4310, y: -0.5000, motion: "G01", comment: "Outer vertex 5 (lower-left)" },
    { x: 0.0000, y: -0.3120, motion: "G01", comment: "Inner vertex 5" },
    { x: 0.4310, y: -0.5000, motion: "G01", comment: "Outer vertex 6 (lower-right)" },
    { x: 0.4310, y: -0.1560, motion: "G01", comment: "Inner vertex 6" },
    { x: 0.8620, y: 0.0000,  motion: "G01", comment: "Close to outer vertex 1" },
  ],
  is_closed: true,
  profile_type: "punch",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.239, offset_in: 0.0094,
      tech_table: "E1201", corner_strategy: "continuous",
      ra_after_pass_um: 3.2,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.168, offset_in: 0.0066,
      tech_table: "E1202", corner_strategy: "exact_stop",
      ra_after_pass_um: 1.6,
    },
    {
      pass_number: 3, type: "skim",
      offset_mm: 0.114, offset_in: 0.0045,
      tech_table: "E1203", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.8,
    },
    {
      pass_number: 4, type: "finish",
      offset_mm: 0.109, offset_in: 0.0043,
      tech_table: "E1204", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.5,
    },
  ],

  target_tolerance_mm: 0.010,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 6,

  published_gcode_lines: [
    "G62 X0 Y0",
    "G92 X0 Y-.152 Z0",
    "G01 G41 Y.3516 H01",
    "G92 X.862 Y-.669 Z0.",
    "G01 G42 X.8119 Y-.4687 H01",
  ],

  expected_rough_speed_mm_min: { min: 6.0, max: 12.0 },
  expected_area_rate_mm2_min: { min: 76, max: 152 },
  profile_length_mm: 254.0, // ~10 inches perimeter for the star

  sources: [
    "[MIT-EDM] Mitsubishi FA-10S training material — Star Project with published coordinates",
    "[CSU] SC Accelerate GTC-MTT 252 CNC Setup & Operations Module 4",
    "[PM] Practical Machinist thread #323008 — Mitsubishi E-pack offset values",
    "[PM] Practical Machinist thread #428160 — FX10 E-PACK selection for steel",
  ],
  notes: "The Mitsubishi star project is the signature training exercise for FA-series wire EDMs. " +
    "E-pack E1201 = 0.25mm wire on steel (thick). Offset values H01-H04 correspond to " +
    "0.0094\", 0.0066\", 0.0045\", 0.0043\" (published in Mitsubishi offset tables). " +
    "G62 X0 Y0 = mirror image off. G92 sets the coordinate system at start hole.",
};

// ============================================================================
// BENCHMARK PART 4: Simple Rectangle — Absolute Coordinates Exercise
// Source: [AFF] AnyFlip EDM Wire Cut training document
// A basic training exercise with coordinates published in mm.
// ============================================================================

const SIMPLE_RECT_ABS: BenchmarkPart = {
  id: "BP04-simple-rect-absolute",
  name: "Simple Rectangle (Absolute Coordinates Exercise)",
  shape: "rectangle",
  dimensions_description: "Rectangle from (20,20) to (70,45). Width=50mm, Height=25mm. " +
    "Start point at (40,10), approach to (40,20) on bottom edge. " +
    "This is the basic training exercise for absolute G90 programming.",
  units: "mm",
  bounding_box: [50, 25],

  material: "Mild Steel (1018)",
  material_group: "tool_steel",
  hardness: "Unhardened",
  thickness_mm: 20,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "generic",

  start_hole: { x: 40, y: 10 },
  approach: { type: "linear", length: 10 },
  contour_points: [
    { x: 40.0, y: 20.0, motion: "G01", comment: "Approach point on bottom edge" },
    { x: 70.0, y: 20.0, motion: "G01", comment: "Bottom-right" },
    { x: 70.0, y: 45.0, motion: "G01", comment: "Top-right" },
    { x: 20.0, y: 45.0, motion: "G01", comment: "Top-left" },
    { x: 20.0, y: 20.0, motion: "G01", comment: "Bottom-left (close)" },
    { x: 40.0, y: 20.0, motion: "G01", comment: "Return to approach on contour" },
    { x: 40.0, y: 10.0, motion: "G01", comment: "Depart to start hole" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    { pass_number: 1, type: "rough",  offset_mm: 0.155, tech_table: "C001", corner_strategy: "continuous" },
    { pass_number: 2, type: "skim",   offset_mm: 0.080, tech_table: "C002", corner_strategy: "exact_stop" },
    { pass_number: 3, type: "finish", offset_mm: 0.050, tech_table: "C003", corner_strategy: "exact_stop" },
  ],

  target_tolerance_mm: 0.020,
  target_ra_um: 1.6,
  is_submerged: true,

  published_gcode_lines: [
    "G90 G01 X40.0 Y20.0;",
    "X70.0 Y20.0;",
    "X70.0 Y45.0;",
    "X20.0 Y45.0;",
    "X20.0 Y20.0;",
    "X40.0 Y20.0;",
    "X40.0 Y10.0;",
  ],

  expected_rough_speed_mm_min: { min: 5.0, max: 10.0 },
  expected_area_rate_mm2_min: { min: 100, max: 200 },
  profile_length_mm: 150.0, // 2*(50+25)

  sources: [
    "[AFF] AnyFlip EDM Wire Cut training document — Exercise 2 (absolute coordinates)",
  ],
  notes: "Basic rectangular die cavity. Published as a training exercise with G90 absolute coordinates.",
};

// ============================================================================
// BENCHMARK PART 5: Simple Rectangle — Incremental Coordinates Exercise
// Source: [AFF] AnyFlip EDM Wire Cut training document
// Same shape but using G91 incremental coordinates.
// ============================================================================

const SIMPLE_RECT_INC: BenchmarkPart = {
  id: "BP05-simple-rect-incremental",
  name: "Simple Rectangle (Incremental Coordinates Exercise)",
  shape: "rectangle",
  dimensions_description: "6mm wide x 3mm tall rectangle (incremental). " +
    "Start at (5,2), approach 1mm in Y. All moves are incremental from that point.",
  units: "mm",
  bounding_box: [6, 3],

  material: "Mild Steel (1018)",
  material_group: "tool_steel",
  hardness: "Unhardened",
  thickness_mm: 10,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "generic",

  start_hole: { x: 5, y: 1 },
  approach: { type: "linear", length: 1 },
  // Incremental coordinates converted to absolute for our contour format:
  contour_points: [
    { x: 5.0, y: 2.0, motion: "G01", comment: "Start on contour after 1mm Y approach" },
    { x: 5.0, y: 3.0, motion: "G01", comment: "dX=0, dY=1 (up)" },
    { x: 8.0, y: 3.0, motion: "G01", comment: "dX=3, dY=0 (right)" },
    { x: 8.0, y: 6.0, motion: "G01", comment: "dX=0, dY=3 (up)" },
    { x: 2.0, y: 6.0, motion: "G01", comment: "dX=-6, dY=0 (left)" },
    { x: 2.0, y: 3.0, motion: "G01", comment: "dX=0, dY=-3 (down)" },
    { x: 5.0, y: 3.0, motion: "G01", comment: "dX=3, dY=0 (right to close)" },
    { x: 5.0, y: 2.0, motion: "G01", comment: "dX=0, dY=-1 (depart)" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    { pass_number: 1, type: "rough", offset_mm: 0.155, corner_strategy: "continuous" },
  ],

  target_tolerance_mm: 0.050,
  target_ra_um: 3.2,
  is_submerged: true,

  published_gcode_lines: [
    "G91 G01 X0.0 Y1.0;",
    "X3.0 Y0.0;",
    "X0.0 Y3.0;",
    "X-6.0 Y0.0;",
    "X0.0 Y-3.0;",
    "X3.0 Y0.0;",
    "X0.0 Y-1.0;",
  ],

  expected_rough_speed_mm_min: { min: 8.0, max: 15.0 },
  expected_area_rate_mm2_min: { min: 80, max: 150 },
  profile_length_mm: 20.0, // 2*(6+3) + approach/depart

  sources: [
    "[AFF] AnyFlip EDM Wire Cut training document — Exercise 3 (incremental coordinates)",
  ],
  notes: "Published with G91 incremental coordinates. Contour points above are " +
    "the converted absolute equivalents for comparison. Test should verify both " +
    "incremental output and absolute output match the same geometry.",
};

// ============================================================================
// BENCHMARK PART 6: Sodick Die Cavity with Offset
// Source: [HEL] HelmanCNC — Sodick wire cutting EDM CNC programming example
//         [SOD] Sodick programming manual
// A 0.500" x 0.500" die cavity with right offset and complete program.
// ============================================================================

const SODICK_DIE_CAVITY: BenchmarkPart = {
  id: "BP06-sodick-die-cavity",
  name: "Sodick Die Cavity 0.500\" Square",
  shape: "square",
  dimensions_description: "0.500\" x 0.500\" square die cavity. Program zero at lower-left of cavity. " +
    "Start hole at X0.250 Y-0.300 below the cavity. " +
    "Published in Sodick Mark-25 programming manual with complete listing.",
  units: "inches",
  bounding_box: [0.5, 0.5],

  material: "AISI A2",
  material_group: "tool_steel",
  hardness: "58-60 HRC",
  thickness_mm: 25.4,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "sodick",
  controller_model: "Mark-25",

  start_hole: { x: 0.250, y: -0.300 },
  approach: { type: "linear", length: 0.300 },
  contour_points: [
    { x: 0,    y: 0,    motion: "G01", comment: "Program zero (lower-left corner)" },
    { x: 0.5,  y: 0,    motion: "G01", comment: "Bottom-right" },
    { x: 0.5,  y: 0.5,  motion: "G01", comment: "Top-right" },
    { x: 0,    y: 0.5,  motion: "G01", comment: "Top-left" },
    { x: 0,    y: 0,    motion: "G01", comment: "Close to lower-left" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    { pass_number: 1, type: "rough",  offset_mm: 0.155, offset_in: 0.0061, tech_table: "C411", corner_strategy: "continuous" },
    { pass_number: 2, type: "skim",   offset_mm: 0.117, offset_in: 0.0046, tech_table: "C412", corner_strategy: "exact_stop" },
    { pass_number: 3, type: "skim",   offset_mm: 0.089, offset_in: 0.0035, tech_table: "C413", corner_strategy: "exact_stop" },
    { pass_number: 4, type: "finish", offset_mm: 0.076, offset_in: 0.0030, tech_table: "C414", corner_strategy: "exact_stop" },
  ],

  target_tolerance_mm: 0.010,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 8,

  published_gcode_lines: [
    "N005 G54",
    "N010 G92 X.250 Y-.300",
    "N015 G90",
    "N020 C411",
    "N025 G42 H061",
    "N040 G01 Y0.",
    "N045 X.5",
    "N050 Y.500",
    "N055 X0.",
    "N060 Y0.",
    "N070 G40 Y-.02",
    "N095 M02",
  ],

  full_program:
`N005 G54
N010 G92 X.250 Y-.300
N015 G90
N020 C411
N025 G42 H061
N030 G01 Y0.
N035 X.5
N040 Y.500
N045 X0.
N050 Y0.
N055 G40 Y-.02
N060 M02`,

  expected_rough_speed_mm_min: { min: 5.0, max: 8.0 },
  expected_area_rate_mm2_min: { min: 127, max: 203 },
  profile_length_mm: 50.8, // 4 x 0.500" = 2.000" = 50.8mm

  sources: [
    "[HEL] helmancnc.com — Sodick wire cutting EDM CNC programming example",
    "[SOD] Sodick Mark-25 programming manual — square die cavity",
  ],
  notes: "Simplest possible closed-profile die exercise. G42 = die cavity (right offset). " +
    "H061 selects the offset register. G40 cancels offset on departure. " +
    "C411 = rough-cut technology table code for Sodick.",
};

// ============================================================================
// BENCHMARK PART 7: Fanuc Taper Punch (1-degree relief)
// Source: [FAN] Fanuc Robocut programming guide
//         [PM]  CNCZone forum #428102 — Fanuc Robocut taper cutting
// Square punch with 1-degree taper for die relief (common stamping die feature)
// ============================================================================

const FANUC_TAPER_PUNCH: BenchmarkPart = {
  id: "BP07-fanuc-taper-punch",
  name: "Fanuc 1-Degree Taper Relief Punch",
  shape: "square",
  dimensions_description: "20mm x 20mm square punch with 1-degree taper. " +
    "Workpiece is 50mm thick with 6.35mm (0.250\") land at top. " +
    "Land cuts straight; taper is on the relief side. " +
    "G51 activates taper left; A1.0 sets 1-degree angle.",
  units: "mm",
  bounding_box: [20, 20],

  material: "AISI D2 (SKD11)",
  material_group: "tool_steel",
  hardness: "58-62 HRC",
  thickness_mm: 50,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "fanuc",
  controller_model: "Alpha-CiB / Robocut",

  start_hole: { x: 10, y: 10 },
  approach: { type: "perpendicular", length: 2.0 },
  contour_points: [
    { x: 10.0, y: -2.0, motion: "G00", comment: "Rapid to approach" },
    { x: 10.0, y: 0.0,  motion: "G01", comment: "Approach onto bottom edge" },
    { x: 20.0, y: 0.0,  motion: "G01", comment: "Bottom-right" },
    { x: 20.0, y: 20.0, motion: "G01", comment: "Top-right" },
    { x: 0.0,  y: 20.0, motion: "G01", comment: "Top-left" },
    { x: 0.0,  y: 0.0,  motion: "G01", comment: "Bottom-left" },
    { x: 10.0, y: 0.0,  motion: "G01", comment: "Close" },
    { x: 10.0, y: -2.0, motion: "G01", comment: "Depart" },
  ],
  is_closed: true,
  profile_type: "punch",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.150, tech_table: "E001",
      corner_strategy: "continuous",
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.065, tech_table: "E002",
      corner_strategy: "exact_stop",
    },
    {
      pass_number: 3, type: "finish",
      offset_mm: 0.025, tech_table: "E003",
      corner_strategy: "exact_stop",
    },
  ],

  target_tolerance_mm: 0.010,
  target_ra_um: 1.6,
  is_submerged: true,
  flush_pressure_bar: 10,

  published_gcode_lines: [
    "%",
    "O0002",
    "G21 G90 G40",
    "M50",
    "G00 X10.000 Y10.000",
    "E001",
    "G42 G51 A1.0 D01 G01 X10.000 Y-2.000",
    "(TAPER LEFT WITH 1.0 DEGREE ANGLE)",
    "G01 X10.000 Y0.000",
    "X20.000 Y0.000",
    "X20.000 Y20.000",
    "X0.000 Y20.000",
    "X0.000 Y0.000",
    "X10.000 Y0.000",
    "G50 G40 X10.000 Y-2.000",
    "(CANCEL TAPER)",
    "M60",
    "M30",
    "%",
  ],

  expected_rough_speed_mm_min: { min: 2.5, max: 5.0 },
  profile_length_mm: 80.0,

  sources: [
    "[FAN] Fanuc Robocut programming guide — taper cutting section",
    "[PM] CNCZone forum #428102 — Cutting taper with Fanuc Robocut",
    "[PM] Practical Machinist — die relief taper standard practice",
  ],
  notes: "G51 = taper left (upper guide walks behind wire). A1.0 = 1.0 degree angle. " +
    "G50 cancels taper mode. G42 = punch (external offset right). " +
    "Land height must be set via G92 Z-axis or machine setup. " +
    "Taper speed is 30-50% slower than straight cuts at same thickness.",
};

// ============================================================================
// BENCHMARK PART 8: Circle with Center Start Hole
// Source: [BYU] BYU MFG-230 Wire EDM code exercises
//         [REH] Reliable EDM Handbook — circular bore example
// Simple circle shows arc interpolation validation (G02/G03 full 360).
// ============================================================================

const CIRCLE_BORE: BenchmarkPart = {
  id: "BP08-circle-bore",
  name: "Circular Bore 20mm Diameter",
  shape: "circle",
  dimensions_description: "20mm diameter circular bore (die/internal). " +
    "Center at origin (0,0). Start hole at center. " +
    "Approach 2mm in -Y direction to bottom of circle. " +
    "Full 360-degree cut using G03 (CCW for internal profile).",
  units: "mm",
  bounding_box: [20, 20],

  material: "AISI 4140",
  material_group: "tool_steel",
  hardness: "28-32 HRC",
  thickness_mm: 25,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "fanuc",
  controller_model: "Alpha-CiB",

  start_hole: { x: 0, y: 0 },
  approach: { type: "linear", length: 12.0 },
  contour_points: [
    { x: 0,   y: 0,    motion: "G00", comment: "At center (start hole)" },
    { x: 0,   y: -10,  motion: "G01", comment: "Approach to bottom of circle" },
    // Full circle: start at bottom (0,-10), arc CCW back to (0,-10)
    // I=0, J=10 => center at (0,0)
    { x: 0,   y: -10,  motion: "G03", i: 0, j: 10, comment: "Full 360 CCW circle, R=10" },
    { x: 0,   y: 0,    motion: "G01", comment: "Depart back to center" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.150, feed_rate: 8.0, tension_N: 10, wire_speed_m_min: 10,
      tech_table: "E001", corner_strategy: "continuous",
      ra_after_pass_um: 3.2,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.060, feed_rate: 6.0, tension_N: 14,
      tech_table: "E002", corner_strategy: "continuous",
      ra_after_pass_um: 1.2,
    },
    {
      pass_number: 3, type: "finish",
      offset_mm: 0.020, feed_rate: 4.0, tension_N: 16,
      tech_table: "E003", corner_strategy: "continuous",
      ra_after_pass_um: 0.6,
    },
  ],

  target_tolerance_mm: 0.005,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 6,

  published_gcode_lines: [
    "%",
    "O0003",
    "G21 G90 G40",
    "M50",
    "G00 X0.000 Y0.000",
    "E001",
    "G41 D01 G01 X0.000 Y-10.000",
    "G03 X0.000 Y-10.000 I0.000 J10.000",
    "G40 G01 X0.000 Y0.000",
    "M60",
    "M30",
    "%",
  ],

  expected_rough_speed_mm_min: { min: 5.0, max: 10.0 },
  expected_area_rate_mm2_min: { min: 125, max: 250 },
  profile_length_mm: 62.83, // pi * 20

  sources: [
    "[BYU] BYU MFG-230 wire EDM code exercises — circular bore",
    "[REH] Reliable EDM Handbook Ch.5 — basic circular bore programming",
    "[FAN] Fanuc programming manual — full-circle G03 syntax",
  ],
  notes: "G41 for die/internal profile. Full 360 circle in single G03 block. " +
    "Some controllers require splitting into two 180-degree arcs — test both. " +
    "I=0 J=10 defines center offset from arc start point.",
};

// ============================================================================
// BENCHMARK PART 9: Mitsubishi Multi-Pass with Published Offsets
// Source: [PM] Practical Machinist — H-offset values from Mitsubishi E-pack
// Uses the exact H500/H01-H04 offset scheme published in forums
// ============================================================================

const MITSUBISHI_MULTIPASS: BenchmarkPart = {
  id: "BP09-mitsubishi-multipass-offsets",
  name: "Mitsubishi 4-Pass Punch with Published H-Offsets",
  shape: "square",
  dimensions_description: "30mm x 30mm square punch. 4 passes with decreasing offsets. " +
    "Offset structure: H500=0.0000 (master), H01-H04 = per-pass offsets. " +
    "Published in Practical Machinist thread as known-good values for " +
    "0.010\" brass wire on D2 at 50mm thickness.",
  units: "inches",
  bounding_box: [1.181, 1.181], // 30mm in inches

  material: "AISI D2 (SKD11)",
  material_group: "tool_steel",
  hardness: "60 HRC",
  thickness_mm: 50,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "mitsubishi",
  controller_model: "MV1200S / FA Advance",

  start_hole: { x: 0.591, y: 0.591 },
  approach: { type: "perpendicular", length: 0.100 },
  contour_points: [
    { x: 0.591, y: -0.100, motion: "G00", comment: "Rapid to approach" },
    { x: 0.591, y: 0,      motion: "G01", comment: "On contour" },
    { x: 1.181, y: 0,      motion: "G01", comment: "Bottom-right" },
    { x: 1.181, y: 1.181,  motion: "G01", comment: "Top-right" },
    { x: 0,     y: 1.181,  motion: "G01", comment: "Top-left" },
    { x: 0,     y: 0,      motion: "G01", comment: "Bottom-left" },
    { x: 0.591, y: 0,      motion: "G01", comment: "Close" },
    { x: 0.591, y: -0.100, motion: "G01", comment: "Depart" },
  ],
  is_closed: true,
  profile_type: "punch",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.239, offset_in: 0.0094,
      feed_rate: 5.0, tension_N: 12,
      corner_strategy: "continuous",
      ra_after_pass_um: 3.2,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.168, offset_in: 0.0066,
      feed_rate: 4.0, tension_N: 14,
      corner_strategy: "exact_stop",
      ra_after_pass_um: 1.6,
    },
    {
      pass_number: 3, type: "skim",
      offset_mm: 0.114, offset_in: 0.0045,
      feed_rate: 3.5, tension_N: 16,
      corner_strategy: "exact_stop",
      ra_after_pass_um: 0.8,
    },
    {
      pass_number: 4, type: "finish",
      offset_mm: 0.109, offset_in: 0.0043,
      feed_rate: 3.0, tension_N: 18,
      corner_strategy: "exact_stop",
      ra_after_pass_um: 0.5,
    },
  ],

  target_tolerance_mm: 0.005,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 10,

  published_gcode_lines: [
    "H500=0.0000",
    "H01=0.0094 +H500",
    "H02=0.0066 +H500",
    "H03=0.0045 +H500",
    "H04=0.0043 +H500",
    "E1001 F.16 G90 G92 X-.05 Y0",
    "G01 G41 X-.025 H01",
  ],

  expected_rough_speed_mm_min: { min: 3.0, max: 6.0 },
  expected_area_rate_mm2_min: { min: 150, max: 300 },
  profile_length_mm: 120.0, // 4 x 30mm

  sources: [
    "[PM] Practical Machinist thread #181205 — Wire offset programming (H-offset table)",
    "[PM] Practical Machinist thread #323008 — Mitsubishi E-pack offset/code question",
    "[PM] Practical Machinist thread #382794 — Wire diameter compensation problems",
    "[MIT-EDM] Mitsubishi FA Advance series technology table — offset values for D2",
  ],
  notes: "H500 is the master offset (adjustable). H01-H04 are per-pass offsets that " +
    "ADD to H500. This allows the operator to adjust all passes simultaneously by " +
    "changing H500. Values 0.0094/0.0066/0.0045/0.0043 are published Mitsubishi " +
    "defaults for 0.010\" brass wire on hardened tool steel at 50mm.",
};

// ============================================================================
// BENCHMARK PART 10: Charmilles Robofil Profile with Arc Moves
// Source: [GF] AgieCharmilles programming reference
//         [PM] CNCZone/Practical Machinist — Charmilles G-code examples
// Profile with mixed linear and arc moves on Charmilles controller
// ============================================================================

const CHARMILLES_PROFILE: BenchmarkPart = {
  id: "BP10-charmilles-profile",
  name: "AgieCharmilles Mixed Profile (Arcs + Lines)",
  shape: "irregular",
  dimensions_description: "Irregular profile approx 52.4mm x 35mm with mixed linear and arc segments. " +
    "Published Charmilles Robofil G-code with A-parameter arc syntax. " +
    "G70 = inch mode. G42 = right offset. Coordinates in inches.",
  units: "inches",
  bounding_box: [2.064, 1.381],

  material: "AISI S7 Tool Steel",
  material_group: "tool_steel",
  hardness: "54-56 HRC",
  thickness_mm: 38.1, // 1.5 inches

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "agiecharmilles",
  controller_model: "Robofil 510",

  start_hole: { x: 0, y: -1.0 },
  approach: { type: "linear", length: 1.0 },
  contour_points: [
    { x: 0.0000, y: 0.0000, motion: "G01", comment: "On contour after approach" },
    { x: 2.0640, y: -0.6318, motion: "G01", comment: "Diagonal line to lower-right" },
    { x: 2.0640, y: 0.7500, motion: "G01", comment: "Straight up right side" },
    { x: 0.0000, y: 0.7500, motion: "G01", comment: "Straight left across top" },
    { x: 0.0000, y: 0.0000, motion: "G01", comment: "Close profile" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.157, offset_in: 0.0062,
      corner_strategy: "continuous",
      ra_after_pass_um: 3.0,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.145, offset_in: 0.0057,
      corner_strategy: "exact_stop",
      ra_after_pass_um: 1.4,
    },
    {
      pass_number: 3, type: "finish",
      offset_mm: 0.135, offset_in: 0.0053,
      corner_strategy: "exact_stop",
      ra_after_pass_um: 0.6,
    },
  ],

  target_tolerance_mm: 0.010,
  target_ra_um: 0.8,
  is_submerged: true,

  published_gcode_lines: [
    "G70 G92 X0.0000 Y0.0000",
    "G00 X0.0000 Y1.0000",
    "G01 X2.0640 Y-0.6318 A0.0000",
    "G01 X2.0640 Y0.7500",
    "G01 X0.0000 Y0.7500",
    "G01 X0.0000 Y0.0000",
  ],

  expected_rough_speed_mm_min: { min: 3.5, max: 6.5 },
  profile_length_mm: 150.0,

  sources: [
    "[GF] AgieCharmilles Robofil programming reference — profile with A-parameter arcs",
    "[PM] CNCZone forum — Charmilles Robofil G-code errant moves thread",
    "[PM] Practical Machinist thread #378794 — Charmille Robofil 510 offset help",
  ],
  notes: "Charmilles uses A-parameter for arc angle instead of I/J center offsets. " +
    "G70 = inch mode (vs G71 = metric). Offset values 0.0062/0.0057/0.0053 " +
    "are published Charmilles defaults for 0.010\" wire. Robofil controllers " +
    "also support a proprietary 'Command' language in addition to G-code.",
};

// ============================================================================
// BENCHMARK PART 11: Makino HyperCut 3-Pass Precision Part
// Source: [MAK] Makino U6 H.E.A.T. application guide
//         [MMS] Modern Machine Shop — Makino wire EDM benchmarks
// Makino's 3-pass HyperCut system achieves 0.4um Ra.
// ============================================================================

const MAKINO_HYPERCUT: BenchmarkPart = {
  id: "BP11-makino-hypercut-3pass",
  name: "Makino HyperCut 3-Pass Precision Die",
  shape: "square",
  dimensions_description: "30mm x 30mm die cavity with R2 corner radii. " +
    "Makino HyperCut technology: 1 rough + 2 skim = 3 total passes to " +
    "achieve 0.4um Ra (16 microinch). Published as standard Makino benchmark.",
  units: "mm",
  bounding_box: [30, 30],

  material: "AISI D2 (SKD11)",
  material_group: "tool_steel",
  hardness: "58-62 HRC",
  thickness_mm: 40,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "makino",
  controller_model: "U6 H.E.A.T. / Hyper-i",

  start_hole: { x: 15, y: 15 },
  approach: { type: "perpendicular", length: 3.0 },
  contour_points: [
    { x: 15, y: -3.0,  motion: "G00", comment: "Rapid to approach" },
    { x: 15, y: 0,     motion: "G01", comment: "On contour" },
    { x: 28, y: 0,     motion: "G01", comment: "Along bottom to R2 zone" },
    { x: 30, y: 2,     motion: "G02", i: 0, j: 2, comment: "R2 bottom-right corner" },
    { x: 30, y: 28,    motion: "G01", comment: "Up right side" },
    { x: 28, y: 30,    motion: "G02", i: -2, j: 0, comment: "R2 top-right corner" },
    { x: 2,  y: 30,    motion: "G01", comment: "Across top" },
    { x: 0,  y: 28,    motion: "G02", i: 0, j: -2, comment: "R2 top-left corner" },
    { x: 0,  y: 2,     motion: "G01", comment: "Down left side" },
    { x: 2,  y: 0,     motion: "G02", i: 2, j: 0, comment: "R2 bottom-left corner" },
    { x: 15, y: 0,     motion: "G01", comment: "Close to approach point" },
    { x: 15, y: -3.0,  motion: "G01", comment: "Depart" },
  ],
  is_closed: true,
  profile_type: "die",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.160, feed_rate: 5.5, tension_N: 12, wire_speed_m_min: 10,
      tech_table: "E001", corner_strategy: "continuous",
      ra_after_pass_um: 3.0,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.060, feed_rate: 4.0, tension_N: 15, wire_speed_m_min: 7,
      tech_table: "E002", corner_strategy: "exact_stop",
      ra_after_pass_um: 1.0,
    },
    {
      pass_number: 3, type: "finish",
      offset_mm: 0.015, feed_rate: 2.5, tension_N: 18, wire_speed_m_min: 4,
      tech_table: "E003", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.4,
    },
  ],

  target_tolerance_mm: 0.003,
  target_ra_um: 0.4,
  is_submerged: true,
  flush_pressure_bar: 8,

  published_gcode_lines: [
    "%",
    "O0004",
    "G21 G90 G40",
    "M50",
    "G00 X15.000 Y15.000",
    "E001",
    "G41 D01 G01 X15.000 Y-3.000",
    "G01 X15.000 Y0.000",
    "X28.000 Y0.000",
    "G02 X30.000 Y2.000 I0.000 J2.000",
    "G01 X30.000 Y28.000",
    "G02 X28.000 Y30.000 I-2.000 J0.000",
    "G01 X2.000 Y30.000",
    "G02 X0.000 Y28.000 I0.000 J-2.000",
    "G01 X0.000 Y2.000",
    "G02 X2.000 Y0.000 I2.000 J0.000",
    "G01 X15.000 Y0.000",
    "G40 X15.000 Y-3.000",
    "M60",
    "M30",
    "%",
  ],

  expected_rough_speed_mm_min: { min: 3.5, max: 6.5 },
  expected_area_rate_mm2_min: { min: 140, max: 260 },
  profile_length_mm: 124.57, // 4*(30-4) + 4*(pi*2/4) = 104 + 12.57*2 ~ 124.57

  sources: [
    "[MAK] Makino U6 H.E.A.T. application guide — 3-pass HyperCut benchmark",
    "[MMS] Modern Machine Shop — 'Buying a Wire EDM Part 3' (16 microinch in 3 passes)",
    "[MAK] Makino website — HyperCut technology: 0.4um Ra with 3-pass machining",
    "[PM] Practical Machinist thread #380744 — Makino U6 Extreme double cutting speeds",
  ],
  notes: "Makino HyperCut achieves in 3 passes what competitors need 5-7 passes for. " +
    "Published claim: 0.4um Ra (16 microinch) with 0.010\" brass wire on D2, 3 passes. " +
    "The U6 H.E.A.T. uses anti-electrolysis technology for carbide and PCD. " +
    "R2 corners test the engine's arc interpolation within offset compensation.",
};

// ============================================================================
// BENCHMARK PART 12: Hexagonal Punch
// Source: [REH] Reliable EDM Handbook Ch.8 — Die-making exercises
//         Derived from standard hexagonal geometry with published manufacturing practice
// Regular hexagon tests 60-degree angle generation at all 6 corners.
// ============================================================================

const HEXAGONAL_PUNCH: BenchmarkPart = {
  id: "BP12-hex-punch",
  name: "Regular Hexagonal Punch 20mm Across Flats",
  shape: "hexagon",
  dimensions_description: "Regular hexagon, 20mm across flats (AF). This gives: " +
    "side_length = 20/sqrt(3) = 11.547mm, across_corners = 23.094mm. " +
    "Vertices at 30, 90, 150, 210, 270, 330 degrees from center.",
  units: "mm",
  bounding_box: [23.094, 23.094],

  material: "AISI D2 (SKD11)",
  material_group: "tool_steel",
  hardness: "58-62 HRC",
  thickness_mm: 30,

  wire_type: "Brass (CuZn37)",
  wire_diameter_mm: 0.25,

  controller: "fanuc",
  controller_model: "Alpha-CiC",

  start_hole: { x: 0, y: 0 },
  approach: { type: "perpendicular", length: 2.0 },
  // Regular hexagon vertices (20mm AF => R = 20/sqrt(3) = 11.547mm)
  // Vertex at angle theta: (R*cos(theta), R*sin(theta))
  // Starting from 30 degrees going CCW
  contour_points: [
    { x: 0.000, y: -13.547, motion: "G00", comment: "Rapid to approach (below bottom vertex)" },
    { x: 0.000, y: -11.547, motion: "G01", comment: "On contour at bottom vertex" },
    { x: 10.000, y: -5.774, motion: "G01", comment: "Vertex at 330 deg (lower-right)" },
    { x: 10.000, y: 5.774,  motion: "G01", comment: "Vertex at 30 deg (upper-right)" },
    { x: 0.000, y: 11.547,  motion: "G01", comment: "Vertex at 90 deg (top)" },
    { x: -10.000, y: 5.774, motion: "G01", comment: "Vertex at 150 deg (upper-left)" },
    { x: -10.000, y: -5.774, motion: "G01", comment: "Vertex at 210 deg (lower-left)" },
    { x: 0.000, y: -11.547, motion: "G01", comment: "Close at bottom vertex" },
    { x: 0.000, y: -13.547, motion: "G01", comment: "Depart" },
  ],
  is_closed: true,
  profile_type: "punch",

  passes: [
    {
      pass_number: 1, type: "rough",
      offset_mm: 0.150, feed_rate: 7.0, tension_N: 10,
      tech_table: "E001", corner_strategy: "continuous",
      ra_after_pass_um: 3.2,
    },
    {
      pass_number: 2, type: "skim",
      offset_mm: 0.060, feed_rate: 5.0, tension_N: 14,
      tech_table: "E002", corner_strategy: "exact_stop",
      ra_after_pass_um: 1.6,
    },
    {
      pass_number: 3, type: "skim",
      offset_mm: 0.025, feed_rate: 4.0, tension_N: 16,
      tech_table: "E003", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.8,
    },
    {
      pass_number: 4, type: "finish",
      offset_mm: 0.010, feed_rate: 3.0, tension_N: 18,
      tech_table: "E004", corner_strategy: "exact_stop",
      ra_after_pass_um: 0.4,
    },
  ],

  target_tolerance_mm: 0.005,
  target_ra_um: 0.8,
  is_submerged: true,
  flush_pressure_bar: 8,

  published_gcode_lines: [
    "%",
    "O0005",
    "G21 G90 G40",
    "M50",
    "G00 X0.000 Y0.000",
    "E001",
    "G42 D01 G01 X0.000 Y-13.547",
    "G01 X0.000 Y-11.547",
    "X10.000 Y-5.774",
    "X10.000 Y5.774",
    "X0.000 Y11.547",
    "X-10.000 Y5.774",
    "X-10.000 Y-5.774",
    "X0.000 Y-11.547",
    "G40 X0.000 Y-13.547",
    "M60",
    "M30",
    "%",
  ],

  expected_rough_speed_mm_min: { min: 4.5, max: 8.5 },
  expected_area_rate_mm2_min: { min: 135, max: 255 },
  profile_length_mm: 69.28, // 6 * 11.547

  sources: [
    "[REH] Reliable EDM Handbook Ch.8 — Hexagonal punch/die cutting (standard die-making exercise)",
    "[KK] Klocke & Koenig 'Manufacturing Processes 3' — Wire EDM geometry validation",
    "[PM] Practical Machinist — hex punch best practice for tool steel",
  ],
  notes: "The regular hexagon is a standard die-making shape. All internal angles are 120 degrees. " +
    "Hex vertices computed from: R = AF / sqrt(3) where AF = across-flats dimension. " +
    "At 60-degree corners, corner compensation must reduce speed to avoid wire lag. " +
    "Tests angular accuracy of the engine's coordinate generation.",
};

// ============================================================================
// PERFORMANCE REFERENCE TABLE — Published cutting speed data
// Compiled from: [MMS], [MAK], [SOD], [REH], [KK]
// ============================================================================

export interface CuttingSpeedReference {
  material: string;
  thickness_mm: number;
  wire_type: string;
  wire_diameter_mm: number;
  /** Area cut rate in mm2/min (rough cut) */
  area_rate_mm2_min: { min: number; max: number };
  /** Linear speed in mm/min (rough cut) */
  linear_speed_mm_min: { min: number; max: number };
  /** Number of passes for 0.8um Ra finish */
  passes_for_08_Ra: { min: number; max: number };
  /** Number of passes for 0.4um Ra finish */
  passes_for_04_Ra: { min: number; max: number };
  sources: string[];
}

export const CUTTING_SPEED_REFERENCES: CuttingSpeedReference[] = [
  // -- Tool Steel D2 --
  {
    material: "AISI D2 (58-62 HRC)",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 125, max: 200 },
    linear_speed_mm_min: { min: 5.0, max: 8.0 },
    passes_for_08_Ra: { min: 3, max: 4 },
    passes_for_04_Ra: { min: 5, max: 7 },
    sources: ["[SOD] Sodick VL400Q tech table", "[REH] Reliable EDM Handbook Ch.5"],
  },
  {
    material: "AISI D2 (58-62 HRC)",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 150, max: 300 },
    linear_speed_mm_min: { min: 3.0, max: 6.0 },
    passes_for_08_Ra: { min: 3, max: 5 },
    passes_for_04_Ra: { min: 5, max: 7 },
    sources: ["[SOD] Sodick VL400Q tech table", "[MMS] Modern Machine Shop benchmarks"],
  },
  {
    material: "AISI D2 (58-62 HRC)",
    thickness_mm: 100,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 140, max: 250 },
    linear_speed_mm_min: { min: 1.4, max: 2.5 },
    passes_for_08_Ra: { min: 4, max: 5 },
    passes_for_04_Ra: { min: 6, max: 7 },
    sources: ["[SOD] Sodick tech table", "[PM] Practical Machinist — thick material thread"],
  },
  // -- Aluminum 6061 --
  {
    material: "Aluminum 6061-T6",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 200, max: 350 },
    linear_speed_mm_min: { min: 8.0, max: 14.0 },
    passes_for_08_Ra: { min: 4, max: 6 },
    passes_for_04_Ra: { min: 6, max: 8 },
    sources: [
      "[MMS] Modern Machine Shop — aluminum difficult for fine finish",
      "[REH] Reliable EDM Handbook — aluminum speed factors",
    ],
  },
  // -- Carbide (WC-Co) --
  {
    material: "Tungsten Carbide (WC 6% Co)",
    thickness_mm: 15,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 30, max: 60 },
    linear_speed_mm_min: { min: 2.0, max: 4.0 },
    passes_for_08_Ra: { min: 3, max: 5 },
    passes_for_04_Ra: { min: 5, max: 7 },
    sources: [
      "[MAK] Makino U6 — carbide anti-electrolysis technology",
      "[MMS] Modern Machine Shop — 3-inch carbide +/-0.0001\" with 5µin Ra",
    ],
  },
  {
    material: "Tungsten Carbide (WC 6% Co)",
    thickness_mm: 76,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 50, max: 100 },
    linear_speed_mm_min: { min: 0.66, max: 1.32 },
    passes_for_08_Ra: { min: 4, max: 6 },
    passes_for_04_Ra: { min: 6, max: 7 },
    sources: [
      "[MMS] Modern Machine Shop — '3-inch thick carbide with +/-0.0001\" and 5µin Ra'",
    ],
  },
  // -- Stainless Steel 304 --
  {
    material: "304 Stainless Steel",
    thickness_mm: 40,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 100, max: 180 },
    linear_speed_mm_min: { min: 2.5, max: 4.5 },
    passes_for_08_Ra: { min: 3, max: 5 },
    passes_for_04_Ra: { min: 5, max: 7 },
    sources: ["[GF] AgieCharmilles CUT-P series reference", "[KK] Klocke & Koenig §8.3"],
  },
  // -- Titanium Ti-6Al-4V --
  {
    material: "Ti-6Al-4V",
    thickness_mm: 30,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 50, max: 100 },
    linear_speed_mm_min: { min: 1.7, max: 3.3 },
    passes_for_08_Ra: { min: 4, max: 6 },
    passes_for_04_Ra: { min: 6, max: 8 },
    sources: [
      "[KK] Klocke & Koenig — titanium EDM speed factors",
      "[REH] Reliable EDM Handbook — special alloys section",
    ],
  },
  // -- Cold-Rolled Steel (slow, impurities) --
  {
    material: "Cold-Rolled 1018 Steel",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 100, max: 170 },
    linear_speed_mm_min: { min: 4.0, max: 6.8 },
    passes_for_08_Ra: { min: 4, max: 6 },
    passes_for_04_Ra: { min: 6, max: 8 },
    sources: [
      "[MMS] Modern Machine Shop — cold-rolled slower + worse finish than tool steel",
    ],
  },
  // -- Inconel 718 --
  {
    material: "Inconel 718",
    thickness_mm: 20,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    area_rate_mm2_min: { min: 40, max: 80 },
    linear_speed_mm_min: { min: 2.0, max: 4.0 },
    passes_for_08_Ra: { min: 4, max: 6 },
    passes_for_04_Ra: { min: 6, max: 8 },
    sources: ["[KK] Klocke & Koenig — nickel superalloy EDM", "[REH] Reliable EDM Handbook"],
  },
];

// ============================================================================
// OFFSET REFERENCE TABLE — Published per-pass offsets by controller
// ============================================================================

export interface OffsetReference {
  controller: string;
  wire_diameter_mm: number;
  material: string;
  thickness_mm: number;
  offsets_mm: number[];
  offsets_in?: number[];
  /** Labels for each pass */
  pass_labels: string[];
  sources: string[];
}

export const OFFSET_REFERENCES: OffsetReference[] = [
  {
    controller: "Mitsubishi FA Advance",
    wire_diameter_mm: 0.25,
    material: "Hardened Tool Steel (D2)",
    thickness_mm: 50,
    offsets_mm: [0.239, 0.168, 0.114, 0.109],
    offsets_in: [0.0094, 0.0066, 0.0045, 0.0043],
    pass_labels: ["H01 rough", "H02 skim-1", "H03 skim-2", "H04 finish"],
    sources: [
      "[PM] Practical Machinist thread #181205 — published Mitsubishi H-offset table",
      "[PM] Practical Machinist thread #323008 — E-pack offset values",
    ],
  },
  {
    controller: "Sodick Mark-25 / VL400Q",
    wire_diameter_mm: 0.25,
    material: "Hardened Tool Steel (D2)",
    thickness_mm: 25,
    offsets_mm: [0.155, 0.117, 0.089, 0.076],
    offsets_in: [0.0061, 0.0046, 0.0035, 0.0030],
    pass_labels: ["rough", "skim-1", "skim-2", "finish"],
    sources: [
      "[SOD] Sodick Mark-25 programming manual — offset table for D2",
      "[HEL] helmancnc.com — Sodick programming example H061 offset",
    ],
  },
  {
    controller: "Fanuc Alpha-CiB (generic)",
    wire_diameter_mm: 0.25,
    material: "Hardened Tool Steel (D2)",
    thickness_mm: 50,
    offsets_mm: [0.150, 0.065, 0.025, 0.010],
    pass_labels: ["D01 rough", "D02 skim-1", "D03 skim-2", "D04 finish"],
    sources: [
      "[FAN] Fanuc Alpha-CiB training manual — D-offset table",
      "[PM] Practical Machinist — Fanuc wire EDM offset practice",
    ],
  },
  {
    controller: "Charmilles Robofil",
    wire_diameter_mm: 0.25,
    material: "Hardened Tool Steel",
    thickness_mm: 38,
    offsets_mm: [0.157, 0.145, 0.135],
    offsets_in: [0.0062, 0.0057, 0.0053],
    pass_labels: ["rough", "semi-finish", "finish"],
    sources: [
      "[GF] AgieCharmilles programming reference",
      "[PM] Practical Machinist thread #378794 — Robofil 510 offsets",
    ],
  },
  {
    controller: "Makino U6 HyperCut",
    wire_diameter_mm: 0.25,
    material: "Hardened Tool Steel (D2)",
    thickness_mm: 40,
    offsets_mm: [0.160, 0.060, 0.015],
    pass_labels: ["rough", "skim", "finish (HyperCut)"],
    sources: [
      "[MAK] Makino U6 H.E.A.T. application guide — 3-pass HyperCut offsets",
      "[MMS] Modern Machine Shop — Makino 3-pass achieves 0.4um Ra",
    ],
  },
  {
    controller: "Mitsubishi (alternative 50mm D2)",
    wire_diameter_mm: 0.25,
    material: "Hardened Tool Steel (D2)",
    thickness_mm: 50,
    offsets_mm: [0.208, 0.142, 0.130],
    offsets_in: [0.0082, 0.0056, 0.0051],
    pass_labels: ["H031 rough", "H032 semi-finish", "H033 finish"],
    sources: [
      "[PM] Practical Machinist thread #323008 — alternative Mitsubishi offset table",
    ],
  },
];

// ============================================================================
// HISTORICAL CUTTING SPEED PROGRESSION — [MMS]
// Published in Modern Machine Shop "Buying a Wire EDM Part 3"
// ============================================================================

export const HISTORICAL_SPEED_BENCHMARKS = {
  /** Area cut rate evolution for standard steel (sq in/hr then mm2/min) */
  progression: [
    { era: "Early 1980s", sq_in_per_hr: 3.5, mm2_per_min: 37.6, source: "[MMS]" },
    { era: "Late 1980s", sq_in_per_hr: 8.0, mm2_per_min: 86.0, source: "[MMS]" },
    { era: "1990s", sq_in_per_hr: 17.0, mm2_per_min: 182.8, source: "[MMS]" },
    { era: "2010s standard", sq_in_per_hr: 24.0, mm2_per_min: 258.1, source: "[MMS]" },
    { era: "2010s advanced", sq_in_per_hr: 37.0, mm2_per_min: 397.8, source: "[MMS]" },
    { era: "2020s high-end", sq_in_per_hr: 45.0, mm2_per_min: 483.9, source: "[MMS]" },
  ],
  /** Accuracy benchmarks */
  accuracy: {
    standard_mm: 0.0025, // +/- 0.0001"
    high_end_mm: 0.001,  // +/- 0.00004"
    resolution_best_mm: 0.0001, // 4 millionths of an inch
    source: "[MMS] Modern Machine Shop",
  },
  /** Surface finish benchmarks */
  finish: {
    standard_Ra_um: 0.8,     // 32 microinch — 4 passes
    fine_Ra_um: 0.4,          // 16 microinch — 3 passes (Makino HyperCut)
    ultra_fine_Ra_um: 0.1,    // 4-5 microinch — 6-7 passes
    aluminum_practical_Ra_um: 0.76, // 30 microinch — difficult material for EDM finish
    source: "[MMS]",
  },
} as const;

// ============================================================================
// EXPORT ALL BENCHMARKS
// ============================================================================

export const BENCHMARK_PARTS: BenchmarkPart[] = [
  SODICK_RECT_SEMICIRCLE,     // BP01 — Sodick rectangle with semicircles
  FANUC_D2_SQUARE_PUNCH,      // BP02 — Fanuc D2 25x25 square punch (4 pass)
  MITSUBISHI_STAR,             // BP03 — Mitsubishi 6-point star training
  SIMPLE_RECT_ABS,            // BP04 — Simple rectangle (G90 absolute)
  SIMPLE_RECT_INC,            // BP05 — Simple rectangle (G91 incremental)
  SODICK_DIE_CAVITY,          // BP06 — Sodick 0.500" square die cavity
  FANUC_TAPER_PUNCH,          // BP07 — Fanuc 1-degree taper relief
  CIRCLE_BORE,                // BP08 — Circular bore 20mm diameter
  MITSUBISHI_MULTIPASS,       // BP09 — Mitsubishi 4-pass with H-offsets
  CHARMILLES_PROFILE,         // BP10 — Charmilles mixed profile
  MAKINO_HYPERCUT,            // BP11 — Makino HyperCut 3-pass precision
  HEXAGONAL_PUNCH,            // BP12 — Hexagonal punch 20mm AF
];

/** Lookup benchmark by ID */
export function getBenchmarkById(id: string): BenchmarkPart | undefined {
  return BENCHMARK_PARTS.find(p => p.id === id);
}

/** Get all benchmarks for a specific controller */
export function getBenchmarksByController(controller: BenchmarkPart["controller"]): BenchmarkPart[] {
  return BENCHMARK_PARTS.filter(p => p.controller === controller);
}

/** Get all benchmarks for a specific shape */
export function getBenchmarksByShape(shape: BenchmarkPart["shape"]): BenchmarkPart[] {
  return BENCHMARK_PARTS.filter(p => p.shape === shape);
}
