/**
 * PostProcessorMasterPostArchitectureEngine — PP-MASTER-POST-ARCH
 * ==================================================================
 * Master post architecture: one canonical post per machine TYPE,
 * with conversion rules to derive all specific machine variants.
 *
 * AUDIT DISCOVERY:
 *   H:/PRISM/resources/FUSION BASIC POSTS/ — 180 Autodesk-stock posts
 *   H:/PRISM/resources/FUSION POSTS/      — 3 PRISM-enhanced custom posts
 *   H:/PRISM/JM DIE/                      — 2 custom PRISM-enhanced posts
 *
 * MACHINE TYPE GROUPINGS (26 distinct types):
 *   VMC-3axis, VMC-4axis, VMC-5axis, HMC, gantry, large-format
 *   Lathe-2axis, lathe-y-axis, lathe-sub-spindle, mill-turn
 *   Swiss-type, Mitsubishi M80 EDM, VTL (vertical turret lathe)
 *   Laser, waterjet, robot, desktop-mill
 *
 * CURRENT STATE:
 *   - Hurco VM30i v11 → "production" status (needs fine-tuning per user)
 *   - Okuma Multus B250IIW v5.2.5 → production (fixed ALARM-D)
 *   - All others → use Fusion basic posts or custom hacks
 *
 * MASTER POST STRATEGY:
 *   Build ONE canonical master post per machine TYPE.
 *   Variants differ only in: controller dialect, travels, specific cycles.
 *   Conversion is rule-based, not per-machine re-work.
 *
 * HURCO V11 FINE-TUNING TRACKER:
 *   Known issues + improvement plan tracked here for systematic resolution.
 *
 * @module engines/PostProcessorMasterPostArchitectureEngine
 * @milestone PP-MASTER-POST-ARCH
 * @version 1.0.0
 */

// ============================================================================
// MACHINE TYPE TAXONOMY (26 types)
// ============================================================================

const MACHINE_TYPES: MachineType[] = [
  // VMC family
  { id: "vmc-3axis", name: "Vertical Machining Center (3-axis)", category: "mill", axes: 3, typical_brands: ["Haas", "Hurco", "Fadal", "Doosan", "Tormach"], masterPostStatus: "planned", priority: "high" },
  { id: "vmc-4axis", name: "VMC with 4th Axis (Trunnion/Rotary)", category: "mill", axes: 4, typical_brands: ["Haas", "Hurco", "DMG MORI"], masterPostStatus: "planned", priority: "high" },
  { id: "vmc-5axis-trunnion", name: "5-axis VMC (Trunnion Table)", category: "mill", axes: 5, typical_brands: ["Haas UMC", "DMG DMU", "Okuma M460V", "Mikron"], masterPostStatus: "planned", priority: "high" },
  { id: "vmc-5axis-swivel-head", name: "5-axis VMC (Swivel Head)", category: "mill", axes: 5, typical_brands: ["Hermle", "Grob", "DMG MORI", "Makino"], masterPostStatus: "planned", priority: "medium" },

  // HMC family
  { id: "hmc-3axis", name: "Horizontal Machining Center (3-axis)", category: "mill", axes: 3, typical_brands: ["Makino", "Kitamura", "Mazak"], masterPostStatus: "planned", priority: "medium" },
  { id: "hmc-4axis", name: "HMC with Pallet B-axis", category: "mill", axes: 4, typical_brands: ["Makino", "Mazak", "Okuma"], masterPostStatus: "planned", priority: "medium" },
  { id: "hmc-5axis", name: "5-axis HMC", category: "mill", axes: 5, typical_brands: ["DMG MORI", "Makino"], masterPostStatus: "planned", priority: "low" },

  // Lathe family
  { id: "lathe-2axis", name: "2-axis Lathe", category: "lathe", axes: 2, typical_brands: ["Haas ST", "Okuma LB", "Mazak QT", "Doosan"], masterPostStatus: "planned", priority: "high" },
  { id: "lathe-y-axis", name: "Lathe with Y-axis", category: "lathe", axes: 3, typical_brands: ["Haas ST-Y", "Okuma LB-Y", "Mazak QTU-Y"], masterPostStatus: "planned", priority: "medium" },
  { id: "lathe-sub-spindle", name: "Lathe with Sub-Spindle", category: "lathe", axes: 4, typical_brands: ["Haas ST-SS", "Mazak QT-SS", "Okuma LB-S"], masterPostStatus: "planned", priority: "medium" },
  { id: "lathe-sub-y", name: "Lathe with Sub-Spindle + Y-axis", category: "lathe", axes: 5, typical_brands: ["Haas ST-SSY", "Mazak QTU-MSY"], masterPostStatus: "planned", priority: "medium" },

  // Mill-Turn family
  { id: "mill-turn-b-axis", name: "Mill-Turn with B-axis", category: "mill-turn", axes: 5, typical_brands: ["Mazak Integrex", "Okuma Multus", "DMG NTX", "Nakamura"], masterPostStatus: "partial-okuma-multus", priority: "high" },
  { id: "swiss-type", name: "Swiss-type Sliding Headstock", category: "swiss", axes: 7, typical_brands: ["Citizen", "Star", "Tsugami", "Hanwha"], masterPostStatus: "planned", priority: "medium" },

  // Large format
  { id: "gantry-portal", name: "Gantry Portal Mill", category: "mill-large", axes: 5, typical_brands: ["Droop+Rein", "Zimmermann", "Fives"], masterPostStatus: "planned", priority: "low" },
  { id: "vtl", name: "Vertical Turret Lathe", category: "lathe-large", axes: 3, typical_brands: ["Toshiba", "OM", "You Ji"], masterPostStatus: "planned", priority: "low" },

  // Specialty
  { id: "wire-edm", name: "Wire EDM (4-axis UV taper)", category: "edm", axes: 4, typical_brands: ["Mitsubishi MV", "Sodick AP", "GF Cut", "Makino"], masterPostStatus: "planned", priority: "medium" },
  { id: "sinker-edm", name: "Sinker EDM", category: "edm", axes: 3, typical_brands: ["Mitsubishi EA", "GF Form", "Makino EDAC"], masterPostStatus: "planned", priority: "low" },
  { id: "waterjet", name: "Waterjet Cutting", category: "cutting", axes: 3, typical_brands: ["Omax", "Flow", "Techni"], masterPostStatus: "planned", priority: "low" },
  { id: "laser", name: "Laser Cutting", category: "cutting", axes: 3, typical_brands: ["Amada", "Mazak laser", "Trumpf"], masterPostStatus: "planned", priority: "low" },

  // Grinding
  { id: "surface-grinder", name: "Surface Grinder", category: "grinder", axes: 3, typical_brands: ["Okamoto", "Chevalier", "Kent"], masterPostStatus: "planned", priority: "low" },
  { id: "cylindrical-grinder", name: "Cylindrical Grinder", category: "grinder", axes: 3, typical_brands: ["Studer", "Okuma GI", "Tschudin"], masterPostStatus: "planned", priority: "low" },
  { id: "jig-grinder", name: "Jig Grinder (High-Precision)", category: "grinder", axes: 4, typical_brands: ["Moore", "Hauser"], masterPostStatus: "planned", priority: "low" },

  // Misc
  { id: "desktop-mill", name: "Desktop Mill (Tabletop)", category: "mill-small", axes: 3, typical_brands: ["Haas Desktop", "Tormach", "GRBL-based"], masterPostStatus: "planned", priority: "low" },
  { id: "robot-machining", name: "Robot Arm Machining", category: "robot", axes: 6, typical_brands: ["Fanuc Robotics", "ABB", "KUKA"], masterPostStatus: "planned", priority: "low" },
  { id: "5axis-head-table-mixed", name: "5-axis Mixed (Head B + Table A)", category: "mill", axes: 5, typical_brands: ["Mikron", "Haas", "Grob"], masterPostStatus: "planned", priority: "medium" },
  { id: "micro-precision", name: "Micro/Nano Precision", category: "mill-ultra", axes: 5, typical_brands: ["Kern", "Roku-Roku", "Fehlmann", "Röders"], masterPostStatus: "planned", priority: "medium" }
];

interface MachineType {
  id: string;
  name: string;
  category: "mill" | "lathe" | "mill-turn" | "swiss" | "mill-large" | "lathe-large" | "edm" | "cutting" | "grinder" | "mill-small" | "robot" | "mill-ultra";
  axes: number;
  typical_brands: string[];
  masterPostStatus: "missing" | "planned" | "partial" | "partial-okuma-multus" | "production" | "beta";
  priority: "critical" | "high" | "medium" | "low";
}

// ============================================================================
// FUSION BASIC POST INVENTORY (180 posts)
// ============================================================================

/**
 * Summary index of the 180 Fusion basic posts.
 * Groups by brand so the engine can suggest starting points for new masters.
 */
const FUSION_BASIC_POST_INVENTORY: FusionPostFamily[] = [
  { brand: "Amada", posts: ["amada laser.cps"], machineType: "laser", count: 1 },
  { brand: "Brother", posts: ["brother.cps", "brother speedio.cps", "brother speedio inspection.cps", "brother multi-tasking.cps"], machineType: "vmc-3axis", count: 4 },
  { brand: "Datron", posts: ["datron c5.cps", "datron iso.cps", "datron mcr.cps", "datron next.cps", "datron next inspection.cps"], machineType: "vmc-3axis", count: 5 },
  { brand: "Deckel", posts: ["deckel dialog 3.cps", "deckel dialog 4.cps", "deckel dialog 11.cps", "deckel dialog 12.cps"], machineType: "vmc-3axis", count: 4 },
  { brand: "DMG MORI", posts: ["dmg mori cmx fanuc.cps", "dmg mori nhx.cps", "dmg mori nlx mill-turn.cps"], machineType: "mixed", count: 3 },
  { brand: "Doosan", posts: ["doosan mill-turn fanuc.cps", "doosan turning.cps", "doosan vmc fanuc.cps"], machineType: "mixed", count: 3 },
  { brand: "Fadal", posts: ["fadal.cps"], machineType: "vmc-3axis", count: 1 },
  { brand: "Fanuc", posts: ["fanuc.cps", "fanuc compact.cps", "fanuc incremental.cps", "fanuc inspection.cps", "fanuc robotics.cps", "fanuc turning.cps"], machineType: "mixed", count: 6 },
  { brand: "Fidia", posts: ["fidia.cps"], machineType: "vmc-5axis-swivel-head", count: 1 },
  { brand: "GRBL", posts: ["grbl turning.cps"], machineType: "lathe-2axis", count: 1 },
  { brand: "Haas", posts: [
    "haas.cps", "haas cl-1.cps", "haas desktop mill.cps", "haas ec.cps", "haas gm2-5ax.cps",
    "haas umc-750.cps", "haas vr-8.cps", "haas vr-9.cps", "haas vr-11.cps", "haas vr-14.cps",
    "haas inspection.cps", "haas next generation.cps", "haas next generation inspection.cps",
    "haas turning.cps", "haas st-10.cps", "haas st-10l.cps", "haas st-10y.cps", "haas st-10ly.cps",
    "haas st-15.cps", "haas st-15l.cps", "haas st-15y.cps", "haas st-15ly.cps",
    "haas st-20.cps", "haas st-20l.cps", "haas st-20y.cps", "haas st-20ly.cps", "haas st-20ss.cps", "haas st-20ssy.cps",
    "haas st-25.cps", "haas st-25l.cps", "haas st-25y.cps", "haas st-25ly.cps",
    "haas st-28.cps", "haas st-28l.cps", "haas st-28y.cps", "haas st-28ly.cps",
    "haas st-30.cps", "haas st-30l.cps", "haas st-30y.cps", "haas st-30ly.cps", "haas st-30ss.cps", "haas st-30ssy.cps",
    "haas st-35.cps", "haas st-35l.cps", "haas st-35y.cps", "haas st-35ly.cps",
    "haas st-40.cps", "haas st-40l.cps", "haas st-45.cps", "haas st-45l.cps", "haas st-55.cps",
    "haas ds-30y.cps", "haas ds-30ssy.cps"
  ], machineType: "mixed", count: 57 },
  { brand: "Heidenhain", posts: ["heidenhain.cps", "heidenhain 145.cps", "heidenhain 155.cps", "heidenhain 407.cps", "heidenhain 426.cps", "heidenhain inspection.cps", "heidenhain iso.cps", "heidenhain turning.cps"], machineType: "mixed", count: 8 },
  { brand: "Hermle", posts: ["hermle heidenhain.cps"], machineType: "vmc-5axis-swivel-head", count: 1 },
  { brand: "Hurco", posts: ["hurco tmx8-my.cps", "hurco tmx8-mys.cps", "hurco tmx10-my.cps", "hurco tmx10-mys.cps", "hurco turning.cps", "hurco3d.cps"], machineType: "mixed", count: 6 },
  { brand: "Hwacheon", posts: ["hwacheon hi-tech 230al mill-turn fanuc.cps"], machineType: "mill-turn-b-axis", count: 1 },
  { brand: "Kern", posts: ["kern.cps"], machineType: "micro-precision", count: 1 },
  { brand: "Kitamura", posts: ["kitamura arumatik.cps"], machineType: "hmc-3axis", count: 1 },
  { brand: "Makino", posts: ["makino.cps", "makino a500z.cps", "makino d200z.cps", "makino d300.cps", "makino d500.cps", "makino slim3n.cps"], machineType: "mixed", count: 6 },
  { brand: "Mazak", posts: [
    "mazak.cps", "mazak turning.cps", "mazak laser.cps",
    "mazak ez 8m.cps", "mazak ez 8my.cps", "mazak ez 8msy.cps",
    "mazak ez 10m.cps", "mazak ez 10my.cps", "mazak ez 10msy.cps",
    "mazak ez 12m.cps", "mazak ez 12my.cps", "mazak ez 12msy.cps",
    "mazak integrex i-100.cps", "mazak integrex i-100s.cps",
    "mazak integrex i-200.cps", "mazak integrex i-200s.cps",
    "mazak integrex i-300.cps", "mazak integrex i-300s.cps",
    "mazak integrex i-400.cps", "mazak integrex i-400s.cps",
    "mazak qtu 200-m.cps", "mazak qtu 200-ms.cps", "mazak qtu 200-my.cps", "mazak qtu 200-msy.cps",
    "mazak qtu 250-m.cps", "mazak qtu 250-ms.cps", "mazak qtu 250-my.cps", "mazak qtu 250-msy.cps",
    "mazak qtu 350-m.cps", "mazak qtu 350-ms.cps", "mazak qtu 350-my.cps", "mazak qtu 350-msy.cps",
    "mazak quick turn 100-m.cps", "mazak quick turn 100-ms.cps", "mazak quick turn 100-my.cps", "mazak quick turn 100-msy.cps",
    "mazak quick turn 200-m.cps", "mazak quick turn 200-ms.cps", "mazak quick turn 200-my.cps", "mazak quick turn 200-msy.cps",
    "mazak quick turn 250-m.cps", "mazak quick turn 250-ms.cps", "mazak quick turn 250-my.cps", "mazak quick turn 250-msy.cps",
    "mazak quick turn 350-msy.cps", "mazak quick turn 400-m.cps",
    "mazak quick turn 450-m.cps", "mazak quick turn 450-my.cps"
  ], machineType: "mixed", count: 47 },
  { brand: "Milltronics", posts: ["milltronics.cps", "milltronics turning.cps"], machineType: "mixed", count: 2 },
  { brand: "Mitsubishi", posts: ["mitsubishi.cps", "mitsubishi turning.cps"], machineType: "mixed", count: 2 },
  { brand: "Mori APT", posts: ["mori-apt.cps"], machineType: "vmc-3axis", count: 1 },
  { brand: "Nakamura", posts: ["nakamura mill-turn fanuc.cps"], machineType: "mill-turn-b-axis", count: 1 },
  { brand: "Okuma", posts: ["okuma.cps", "okuma turning.cps", "okuma lb3000 mill-turn.cps"], machineType: "mixed", count: 3 },
  { brand: "Robodrill", posts: ["robodrill.cps"], machineType: "vmc-3axis", count: 1 },
  { brand: "Siemens", posts: ["siemens-802d.cps", "siemens-808d.cps", "siemens-810d.cps", "siemens-828d.cps", "siemens-840c.cps", "siemens-840d.cps", "siemens sinumerik one.cps", "siemens turning.cps", "siemens mill-turn.cps", "siemens-840c turning.cps", "siemens-840d inspection.cps"], machineType: "mixed", count: 11 },
  { brand: "Tormach", posts: ["tormach.cps", "tormach jet.cps", "tormach pathpilot turning.cps", "tormach 8l pathpilot turning.cps"], machineType: "mixed", count: 4 },
  { brand: "Toshiba", posts: ["toshiba vtl mill-turn fanuc.cps"], machineType: "vtl", count: 1 }
];

interface FusionPostFamily {
  brand: string;
  posts: string[];
  machineType: string;
  count: number;
}

// ============================================================================
// MASTER POST TEMPLATE STRUCTURE
// ============================================================================

/**
 * Canonical master post structure per machine TYPE.
 * Each variant-specific post converts from this template.
 */
const MASTER_POST_TEMPLATES: MasterPostTemplate[] = [
  {
    machineTypeId: "vmc-3axis",
    name: "VMC 3-axis Master Post Template",
    status: "planned",
    baselinePost: "haas.cps (well-documented Autodesk post)",

    requiredSections: [
      "onOpen() — program header, safety reset, absolute/metric",
      "onSection() — tool change, spindle on, coolant, WCS",
      "onLinear() — G01 feed motion with feed rate output",
      "onRapid() — G00 rapid positioning",
      "onCircular() — G02/G03 circular interpolation",
      "onDrill() — G81/G82/G83 canned cycles",
      "onDwell() — G04 dwell",
      "onClose() — program end, home, coolant off, M30"
    ],

    conversionRules: [
      "Controller dialect: Haas NGC vs Hurco WinMAX vs Fanuc 0i vs Siemens 840D → different G-code syntax",
      "Tool change: CAT40 vs BT40 vs HSK → different clearance + orient sequence",
      "Coolant: flood (M08) vs TSC (M88 P-pressure) vs mist (M07) → M-code mapping table",
      "Safety retract: G28/G53/G30 varies by controller",
      "Work offset: G54-G59 (universal) vs G54.1 Pn (Fanuc extended) vs G15 Hn (Okuma)",
      "Feed units: G94 mm/min vs G95 mm/rev (different for drilling cycles)",
      "HSM mode: G187 (Haas) vs G05.1 Q1 (Fanuc AICC) vs CYCLE832 (Siemens) vs UltiMotion (Hurco)"
    ],

    variants: [
      { variant: "Haas (NGC)", diff: "G187 HSM, M88 TSC, G53 safe retract" },
      { variant: "Fanuc (0i/30i)", diff: "G05.1 Q1 HSM, M08 coolant, G28 retract" },
      { variant: "Hurco (WinMAX)", diff: "UltiMotion HSM, M08 coolant, M140 Z retract" },
      { variant: "Siemens (840D)", diff: "CYCLE832 HSM, M8 coolant, SUPA retract" },
      { variant: "Mitsubishi (M80)", diff: "G05.1 Q1 HSM, M08 coolant, G28 retract" }
    ],

    fineTuningTracker: []
  },
  {
    machineTypeId: "vmc-5axis-trunnion",
    name: "5-axis Trunnion VMC Master Post Template",
    status: "planned",
    baselinePost: "haas umc-750.cps or okuma M460V",

    requiredSections: [
      "onOpen() — header + 5-axis capability declaration",
      "onSection() — tool change + work orientation probe",
      "onRotary() — A/C trunnion positioning",
      "onLinear5D() — 5-axis linear with RTCP/TCPM",
      "onCircular5D() — 5-axis circular (if supported)",
      "RTCP activation/deactivation sequence",
      "Safe retract from trunnion orientation",
      "onClose() — trunnion home before power-off"
    ],

    conversionRules: [
      "RTCP activation: G43.4 H# (Fanuc/Haas) vs TRAORI (Siemens) vs M128 (Heidenhain) vs G234 (Haas TCPC)",
      "Trunnion axis naming: A/C for table-table (Okuma/Haas), B/C for head-head (DMG/Hermle)",
      "Pivot point: tool tip vs tool base (G43.4 vs G43.5)",
      "Tilted work plane: G10.9 (Okuma), CYCLE800 (Siemens), PLANE SPATIAL (Heidenhain)",
      "Safe approach: withdraw tool before rotary move (critical for trunnion)"
    ],

    variants: [
      { variant: "Haas UMC-750", diff: "G234 TCPC, G90.1 incremental arc, trunnion home to (0,0)" },
      { variant: "Okuma M460V-5AX", diff: "G43.4 RTCP, G10.9 tilted plane, G06 Super-NURBS" },
      { variant: "DMG DMU", diff: "TRAORI, CYCLE800 tilted plane, HSK-A63 taper" },
      { variant: "Mikron HSM", diff: "Fanuc-compatible, linear motors (no accel limit), HSK-E40 taper" }
    ],

    fineTuningTracker: []
  },
  {
    machineTypeId: "lathe-2axis",
    name: "2-axis Lathe Master Post Template",
    status: "planned",
    baselinePost: "haas turning.cps or okuma turning.cps",

    requiredSections: [
      "onOpen() — G20/G21, G96/G97 CSS, home spindle",
      "onSection() — turret position, spindle direction, coolant",
      "onLinear() — X/Z feed with G96 CSS or G97 RPM",
      "onRapid() — X/Z rapid (respecting chuck clearance)",
      "onCircular() — G02/G03 for arcs (R or I/K)",
      "onDrill() — G81 drilling (Z-axis only)",
      "onThread() — G76 multi-pass threading or G32 single-pass",
      "onCanned() — G70/G71/G72/G73/G74/G75 cycles",
      "onClose() — turret home, coolant off, spindle stop, M30"
    ],

    conversionRules: [
      "Canned cycles: G70-G76 standard (Fanuc/Haas) vs G85/G87 (Okuma-specific)",
      "Threading: G76 multi-pass (Fanuc) vs G71/G72 Okuma variants",
      "Live tooling (if present): C-axis + rotary tool with separate spindle direction",
      "Chuck vs collet: different X retract clearance",
      "Bar feeder integration (if present): parts catcher + feeder signals",
      "CSS: G96 (constant surface speed) vs G97 (constant RPM) — threading always G97"
    ],

    variants: [
      { variant: "Haas ST-series", diff: "G84/G85/G90 cycles, M67/M68 barfeeder" },
      { variant: "Okuma LB-series", diff: "G85 external roughing, G87 back boring, G10 tool offset" },
      { variant: "Mazak QT-series", diff: "MAZATROL conversational or EIA, M204 bar advance" },
      { variant: "Doosan Puma", diff: "Fanuc-compatible with bar feeder macros" }
    ],

    fineTuningTracker: []
  },
  {
    machineTypeId: "mill-turn-b-axis",
    name: "Mill-Turn with B-axis Master Post Template",
    status: "partial-okuma-multus",
    baselinePost: "OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5.cps (production reference)",

    requiredSections: [
      "onOpen() — dual-spindle declaration, turret + B-head init",
      "onSection() — mode switch (turning vs milling vs live-tool)",
      "onRotary() — B-axis tilt, C-axis index",
      "onSubSpindleHandoff() — part transfer logic",
      "Polar interpolation (G12.1/G13.1)",
      "Cylindrical interpolation (G107)",
      "Tool turret positioning (B90 special handling)",
      "onClose() — turret home + B home + spindles stop"
    ],

    conversionRules: [
      "B-axis positioning: absolute tilt vs incremental from current",
      "Live tool vs turning tool: different spindle commands (M3/M4 vs M3.1/M4.1)",
      "Polar interpolation: G12.1/G13.1 (Fanuc) vs G96/G97 context-dependent (Okuma)",
      "Sub-spindle (G141) coordinate system shift",
      "C-axis clamp: M141 skip clamp for light drilling (Okuma)",
      "Y-axis availability in turning mode varies"
    ],

    variants: [
      { variant: "Mazak Integrex i-series", diff: "MAZATROL B-axis positioning, C-axis spindle mode" },
      { variant: "Okuma Multus B-series", diff: "G43.4 B-axis RTCP, M141 C-clamp skip" },
      { variant: "DMG NTX", diff: "Siemens 840D dialect, TRAORI B-axis" },
      { variant: "Nakamura Tome", diff: "Fanuc 31i, dual-turret coordination" }
    ],

    fineTuningTracker: [
      { issue: "4308-01 ALARM-D on Okuma Multus", status: "FIXED in v5.2.5 (use G20 HP=1)", priority: "critical" },
      { issue: "B90 turret positioning", status: "FIXED in v5 (auto TDS position 5)", priority: "high" },
      { issue: "Polar feed calculation", status: "FIXED in v4 (removed bad bypass)", priority: "high" }
    ]
  }
];

interface MasterPostTemplate {
  machineTypeId: string;
  name: string;
  status: "planned" | "partial" | "partial-okuma-multus" | "partial-hurco-v11" | "beta" | "production";
  baselinePost: string;
  requiredSections: string[];
  conversionRules: string[];
  variants: Array<{ variant: string; diff: string }>;
  fineTuningTracker: Array<{ issue: string; status: string; priority: "critical" | "high" | "medium" | "low" }>;
}

// ============================================================================
// HURCO V11 FINE-TUNING TRACKER
// ============================================================================

/**
 * Current known issues + improvement plan for Hurco VM30i v11 post.
 * Per user: "needs a ton of fine tuning."
 */
const HURCO_V11_FINE_TUNING: HurcoV11Issue[] = [
  // CATEGORY: KNOWN WORKING
  {
    category: "known-working",
    item: "Basic 3-axis linear/rapid/circular motion",
    status: "production",
    priority: "baseline",
    description: "Core G01/G00/G02/G03 output tested and working"
  },
  {
    category: "known-working",
    item: "Tool change sequence",
    status: "production",
    priority: "baseline",
    description: "Tn M06 with clearance retract"
  },
  {
    category: "known-working",
    item: "Coolant M08/M09",
    status: "production",
    priority: "baseline",
    description: "Standard flood coolant on/off"
  },

  // CATEGORY: NEEDS FINE TUNING
  {
    category: "needs-fine-tuning",
    item: "G05.3 HSM smoothing parameter selection",
    status: "needs-work",
    priority: "high",
    description: "Current implementation uses fixed P35 for rough, P10 for finish. Should adapt to operation type, stepover, feed rate."
  },
  {
    category: "needs-fine-tuning",
    item: "UltiMotion activation/deactivation sequence",
    status: "needs-work",
    priority: "high",
    description: "Hurco's UltiMotion mode needs proper sequencing with G05.3, currently may conflict"
  },
  {
    category: "needs-fine-tuning",
    item: "M16 buffering placement",
    status: "needs-work",
    priority: "medium",
    description: "M16 automatic buffering should wrap cutting moves but not tool changes; current implementation is inconsistent"
  },
  {
    category: "needs-fine-tuning",
    item: "Feed rate output precision",
    status: "needs-work",
    priority: "medium",
    description: "F values sometimes output as F123.456789, should round to 3 decimals"
  },
  {
    category: "needs-fine-tuning",
    item: "Drilling cycle selection (G81 vs G83 vs G73)",
    status: "partial",
    priority: "high",
    description: "Should auto-select based on depth ratio and material; currently always G81"
  },
  {
    category: "needs-fine-tuning",
    item: "Peck retract distance",
    status: "partial",
    priority: "medium",
    description: "Q parameter for G83 peck should adapt to material chip breaking characteristics"
  },
  {
    category: "needs-fine-tuning",
    item: "Canned cycle R-plane vs Z-plane initial",
    status: "partial",
    priority: "medium",
    description: "G98 vs G99 initial point return; should be contextual to operation"
  },

  // CATEGORY: MISSING FEATURES
  {
    category: "missing-feature",
    item: "Dynamic feed override on corner deceleration",
    status: "missing",
    priority: "high",
    description: "Physics-aware corner slowdown based on G-force limit"
  },
  {
    category: "missing-feature",
    item: "Chip thinning compensation for light radial engagement",
    status: "missing",
    priority: "high",
    description: "When Ae < 30% of tool diameter, feed should scale per Sarin formula"
  },
  {
    category: "missing-feature",
    item: "Tool stickout deflection compensation",
    status: "missing",
    priority: "medium",
    description: "Offset path to compensate for cantilever beam deflection on finishing passes"
  },
  {
    category: "missing-feature",
    item: "Subprogram (M98/M99) generation for repeated patterns",
    status: "missing",
    priority: "medium",
    description: "Detect repeated geometry and generate subprograms to shrink code"
  },
  {
    category: "missing-feature",
    item: "Probing cycle support (G65 P98xx)",
    status: "missing",
    priority: "medium",
    description: "Renishaw/Blum probe cycle macros for on-machine measurement"
  },
  {
    category: "missing-feature",
    item: "Spindle warmup macro",
    status: "missing",
    priority: "low",
    description: "Programmable spindle warmup at program start for thermal stability"
  },
  {
    category: "missing-feature",
    item: "Adaptive feedrate based on chip load history",
    status: "missing",
    priority: "medium",
    description: "Learn from prior runs to refine feedrates (ties to AGI learning engine)"
  },

  // CATEGORY: BUG FIXES NEEDED
  {
    category: "bug-fix",
    item: "Arc feed over-correction on tight radii",
    status: "known-issue",
    priority: "high",
    description: "Arc correction multiplies feed on radii <5x tool radius, causing chatter"
  },
  {
    category: "bug-fix",
    item: "Rapid retract Z direction inconsistent",
    status: "known-issue",
    priority: "medium",
    description: "Sometimes G0 Z up, sometimes M140 — should be consistent per job type"
  },
  {
    category: "bug-fix",
    item: "Cutter comp (G41/G42) cancel timing",
    status: "known-issue",
    priority: "medium",
    description: "G40 sometimes issued mid-cut instead of before retract"
  }
];

interface HurcoV11Issue {
  category: "known-working" | "needs-fine-tuning" | "missing-feature" | "bug-fix";
  item: string;
  status: "production" | "needs-work" | "partial" | "missing" | "known-issue";
  priority: "critical" | "high" | "medium" | "low" | "baseline";
  description: string;
}

// ============================================================================
// MASTER POST ARCHITECTURE ENGINE
// ============================================================================

class PostProcessorMasterPostArchitectureEngine {
  private readonly engineVersion = "1.0.0";

  /**
   * Get all machine types
   */
  public getMachineTypes(): MachineType[] {
    return MACHINE_TYPES;
  }

  /**
   * Get machine type by ID
   */
  public getMachineType(id: string): MachineType | undefined {
    return MACHINE_TYPES.find(m => m.id === id);
  }

  /**
   * Get machine types by category
   */
  public getMachineTypesByCategory(category: MachineType["category"]): MachineType[] {
    return MACHINE_TYPES.filter(m => m.category === category);
  }

  /**
   * Get machine types by master post status
   */
  public getMachineTypesByStatus(status: MachineType["masterPostStatus"]): MachineType[] {
    return MACHINE_TYPES.filter(m => m.masterPostStatus === status);
  }

  /**
   * Get high-priority planned masters
   */
  public getHighPriorityPlanned(): MachineType[] {
    return MACHINE_TYPES.filter(m =>
      (m.masterPostStatus === "planned" || m.masterPostStatus === "missing") &&
      (m.priority === "critical" || m.priority === "high")
    );
  }

  /**
   * Get Fusion post inventory
   */
  public getFusionPostInventory(): FusionPostFamily[] {
    return FUSION_BASIC_POST_INVENTORY;
  }

  /**
   * Get Fusion posts for a brand
   */
  public getFusionPostsForBrand(brand: string): FusionPostFamily | undefined {
    const lower = brand.toLowerCase();
    return FUSION_BASIC_POST_INVENTORY.find(f => f.brand.toLowerCase() === lower);
  }

  /**
   * Total Fusion basic post count
   */
  public getTotalFusionPosts(): number {
    return FUSION_BASIC_POST_INVENTORY.reduce((sum, f) => sum + f.count, 0);
  }

  /**
   * Find Fusion posts for machine type
   */
  public findFusionPostsForMachineType(machineTypeId: string): FusionPostFamily[] {
    return FUSION_BASIC_POST_INVENTORY.filter(f =>
      f.machineType === machineTypeId || f.machineType === "mixed"
    );
  }

  /**
   * Get all master post templates
   */
  public getMasterPostTemplates(): MasterPostTemplate[] {
    return MASTER_POST_TEMPLATES;
  }

  /**
   * Get master post template for machine type
   */
  public getMasterPostTemplate(machineTypeId: string): MasterPostTemplate | undefined {
    return MASTER_POST_TEMPLATES.find(t => t.machineTypeId === machineTypeId);
  }

  /**
   * Get conversion rules for converting master → variant
   */
  public getConversionRules(machineTypeId: string): string[] {
    const template = this.getMasterPostTemplate(machineTypeId);
    return template?.conversionRules || [];
  }

  /**
   * Get variants for a master post
   */
  public getVariants(machineTypeId: string): Array<{ variant: string; diff: string }> {
    const template = this.getMasterPostTemplate(machineTypeId);
    return template?.variants || [];
  }

  /**
   * Get Hurco v11 fine-tuning tracker
   */
  public getHurcoV11Issues(): HurcoV11Issue[] {
    return HURCO_V11_FINE_TUNING;
  }

  /**
   * Get Hurco v11 issues by category
   */
  public getHurcoV11ByCategory(category: HurcoV11Issue["category"]): HurcoV11Issue[] {
    return HURCO_V11_FINE_TUNING.filter(i => i.category === category);
  }

  /**
   * Get Hurco v11 issues by priority
   */
  public getHurcoV11ByPriority(priority: HurcoV11Issue["priority"]): HurcoV11Issue[] {
    return HURCO_V11_FINE_TUNING.filter(i => i.priority === priority);
  }

  /**
   * Get Hurco v11 high-priority open issues
   */
  public getHurcoV11OpenIssues(): HurcoV11Issue[] {
    return HURCO_V11_FINE_TUNING.filter(i =>
      i.status !== "production" &&
      (i.priority === "critical" || i.priority === "high")
    );
  }

  /**
   * Generate development roadmap
   */
  public generateMasterPostRoadmap(): {
    phase1_critical: MachineType[];
    phase2_highPriority: MachineType[];
    phase3_medium: MachineType[];
    phase4_low: MachineType[];
    estimatedOrder: string[];
  } {
    const phase1 = MACHINE_TYPES.filter(m => m.priority === "critical");
    const phase2 = MACHINE_TYPES.filter(m => m.priority === "high");
    const phase3 = MACHINE_TYPES.filter(m => m.priority === "medium");
    const phase4 = MACHINE_TYPES.filter(m => m.priority === "low");

    const estimatedOrder = [
      ...phase1.map(m => m.id),
      ...phase2.map(m => m.id),
      ...phase3.map(m => m.id),
      ...phase4.map(m => m.id)
    ];

    return {
      phase1_critical: phase1,
      phase2_highPriority: phase2,
      phase3_medium: phase3,
      phase4_low: phase4,
      estimatedOrder
    };
  }

  /**
   * Calculate master post coverage
   */
  public getCoverageStats(): {
    totalMachineTypes: number;
    production: number;
    partial: number;
    planned: number;
    missing: number;
    coveragePct: number;
  } {
    const total = MACHINE_TYPES.length;
    const production = MACHINE_TYPES.filter(m => m.masterPostStatus === "production").length;
    const partial = MACHINE_TYPES.filter(m => m.masterPostStatus.startsWith("partial")).length;
    const planned = MACHINE_TYPES.filter(m => m.masterPostStatus === "planned").length;
    const missing = MACHINE_TYPES.filter(m => m.masterPostStatus === "missing").length;

    // Production = 100%, partial = 50%
    const coverage = ((production + partial * 0.5) / total) * 100;

    return {
      totalMachineTypes: total,
      production,
      partial,
      planned,
      missing,
      coveragePct: coverage
    };
  }

  /**
   * Get recommended starting point for new master post
   */
  public getRecommendedStartingPoint(machineTypeId: string): {
    machineType: MachineType | undefined;
    fusionBaselines: FusionPostFamily[];
    template: MasterPostTemplate | undefined;
    suggestedApproach: string;
  } {
    const machineType = this.getMachineType(machineTypeId);
    const fusionBaselines = this.findFusionPostsForMachineType(machineTypeId);
    const template = this.getMasterPostTemplate(machineTypeId);

    const suggestedApproach = template
      ? `Use template "${template.name}" with baseline ${template.baselinePost}. Apply conversion rules for variant-specific differences.`
      : fusionBaselines.length > 0
      ? `Start from ${fusionBaselines[0].brand} Fusion basic post (${fusionBaselines[0].posts[0]}). Adapt using PRISM enhancement pattern (see Hurco VM30i PRISM as reference).`
      : `No baseline available — design from scratch using machine kinematics and controller reference.`;

    return { machineType, fusionBaselines, template, suggestedApproach };
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    version: string;
    machineTypes: number;
    fusionPostFamilies: number;
    fusionPostsTotal: number;
    masterPostTemplates: number;
    hurcoV11Issues: number;
    hurcoV11OpenIssues: number;
    coveragePct: number;
  } {
    const coverage = this.getCoverageStats();
    return {
      version: this.engineVersion,
      machineTypes: MACHINE_TYPES.length,
      fusionPostFamilies: FUSION_BASIC_POST_INVENTORY.length,
      fusionPostsTotal: this.getTotalFusionPosts(),
      masterPostTemplates: MASTER_POST_TEMPLATES.length,
      hurcoV11Issues: HURCO_V11_FINE_TUNING.length,
      hurcoV11OpenIssues: this.getHurcoV11OpenIssues().length,
      coveragePct: coverage.coveragePct
    };
  }

  /**
   * Get AI context
   */
  public getContextForAI(): string {
    const stats = this.getStatistics();
    const hurcoOpen = this.getHurcoV11OpenIssues();
    return `
POST PROCESSOR MASTER POST ARCHITECTURE (v${this.engineVersion})
=================================================================
MACHINE TYPE COVERAGE: ${stats.machineTypes} types tracked
  Production masters:  ${this.getCoverageStats().production}
  Partial masters:     ${this.getCoverageStats().partial}
  Planned masters:     ${this.getCoverageStats().planned}
  Overall coverage:    ${stats.coveragePct.toFixed(0)}%

FUSION POST INVENTORY: ${stats.fusionPostsTotal} posts across ${stats.fusionPostFamilies} brands
  Haas (57 posts) + Mazak (47) + Siemens (11) + Heidenhain (8) + others

MASTER POST TEMPLATES: ${stats.masterPostTemplates} defined
  - vmc-3axis (planned, baseline: haas.cps)
  - vmc-5axis-trunnion (planned, baseline: haas umc-750 or okuma M460V)
  - lathe-2axis (planned, baseline: haas turning or okuma)
  - mill-turn-b-axis (PARTIAL — Okuma Multus B250IIW v5.2.5 reference)

HURCO V11 FINE-TUNING STATUS:
  Total issues tracked: ${stats.hurcoV11Issues}
  Open high-priority:   ${stats.hurcoV11OpenIssues}
  Known working:        ${this.getHurcoV11ByCategory("known-working").length}
  Needs fine tuning:    ${this.getHurcoV11ByCategory("needs-fine-tuning").length}
  Missing features:     ${this.getHurcoV11ByCategory("missing-feature").length}
  Bug fixes needed:     ${this.getHurcoV11ByCategory("bug-fix").length}

PLANNED ROADMAP (priority order):
  Phase 1 (High): vmc-3axis, vmc-4axis, vmc-5axis-trunnion, lathe-2axis, mill-turn-b-axis
  Phase 2 (Medium): vmc-5axis-swivel, lathe-sub-spindle, swiss-type, wire-edm
  Phase 3 (Low): gantry, VTL, laser, grinders, robot

API METHODS:
  getMachineTypes() → 26 tracked types
  getMasterPostTemplate(id) → architecture for type
  getFusionPostsForBrand(brand) → available baselines
  getHurcoV11Issues() → fine-tuning tracker
  getHurcoV11OpenIssues() → high-priority open items
  getRecommendedStartingPoint(typeId) → dev starter kit
  generateMasterPostRoadmap() → phased plan
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorMasterPostArchitectureEngine = new PostProcessorMasterPostArchitectureEngine();

export {
  MACHINE_TYPES,
  FUSION_BASIC_POST_INVENTORY,
  MASTER_POST_TEMPLATES,
  HURCO_V11_FINE_TUNING,
  type MachineType,
  type FusionPostFamily,
  type MasterPostTemplate,
  type HurcoV11Issue
};
