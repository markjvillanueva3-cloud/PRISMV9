/**
 * PostPropertyTaxonomyEngine — POST-ULT-MS2 Universal Property Taxonomy
 *
 * Consolidates MS2 U01-U04: PropertyCatalogBuilder, PropertyGroupNormalizer,
 * PurchaseOptionClassifier, and ControllerDialectMapper into a single engine.
 *
 * Takes parsed CPS data from CpsPostParserEngine (MS1) and builds a unified
 * taxonomy of all configurable properties across all controller families,
 * normalizing equivalent properties, classifying purchase dependencies,
 * and mapping controller dialect relationships.
 *
 * Actions: build_taxonomy, classify_property, map_dialect, list_purchase_options
 *
 * @module PostPropertyTaxonomyEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CanonicalProperty {
  canonical_name: string;
  display_name: string;
  category: "always_available" | "machine_config" | "purchase_dependent";
  purchase_option?: string;
  group: string;
  type: "boolean" | "enum" | "integer" | "spatial" | "string";
  controller_variants: ControllerVariant[];
  description: string;
  physics_impact?: string;
}

export interface ControllerVariant {
  controller_family: string;
  property_name: string;
  gcodes?: string[];
  mcodes?: string[];
  values?: Array<{ title: string; id: string }>;
  default_value: any;
  notes?: string;
}

export interface ControllerDialect {
  family: string;
  variants: string[];
  derived_controllers: string[];
  extension: string;
  program_format: string;
  key_differences: Record<string, string>;
}

export interface PropertyTaxonomy {
  canonical_properties: CanonicalProperty[];
  controller_dialects: ControllerDialect[];
  purchase_options: PurchaseOption[];
  total_unique_properties: number;
  total_canonical_groups: number;
}

export interface PurchaseOption {
  name: string;
  description: string;
  properties_enabled: string[];
  gcodes_enabled: string[];
  physics_impact: string;
  manufacturers: string[];
}

/** Catalog entry for a raw CPS property before normalization. */
export interface RawPropertyEntry {
  property_name: string;
  type: "boolean" | "enum" | "integer" | "spatial" | "string";
  group: string;
  default_value: any;
  values?: Array<{ title: string; id: string }>;
  posts_using: string[];
  count: number;
}

/** Result of classifying a single property. */
export interface PropertyClassification {
  property_name: string;
  canonical_name: string;
  category: "always_available" | "machine_config" | "purchase_dependent";
  purchase_option?: string;
  controller_family: string;
  confidence: number;
  reasoning: string;
}

/** Result of dialect mapping. */
export interface DialectMappingResult {
  query_controller: string;
  family: string;
  dialect: ControllerDialect;
  related_families: string[];
  property_translation: Array<{
    canonical: string;
    this_controller: string;
    gcodes: string[];
  }>;
}

// ============================================================================
// CONTROLLER DIALECT DATABASE (U04)
// ============================================================================

const CONTROLLER_DIALECTS: ControllerDialect[] = [
  {
    family: "fanuc",
    variants: ["0i-F", "0i-TF", "16i", "18i", "21i", "30i", "31i", "31i-B5", "32i", "35i"],
    derived_controllers: [
      "Haas", "Doosan", "Brother", "Robodrill", "Makino", "Fadal",
      "Kitamura", "Nakamura-Tome", "Toshiba", "Hwacheon", "Hyundai-Wia",
      "YCM", "Feeler", "Johnford", "Hartford", "Takisawa", "Tsugami",
      "Matsuura", "OKK", "Mori Seiki (older)", "Enshu", "Akira-Seiki",
      "Methods", "Toyoda", "Kira", "Roku-Roku"
    ],
    extension: ".nc",
    program_format: "O%05d",
    key_differences: {
      "0i vs 30i": "30i supports NURBS (G06.2), nano-smoothing (G05.1 Q2), and 5-axis TCP (G43.4/G43.5). 0i limited to basic contouring.",
      "31i vs 30i": "31i targets compact machines, fewer PMC axes, same CNC core as 30i. 31i-B5 adds 5-axis.",
      "16i/18i": "Legacy models, ISO-B compatible. No nano-smoothing. Limited macro variables.",
      "Haas dialect": "Fanuc-compatible with proprietary extensions: G187 smoothing, G234 DWO, G143 5-axis TCP, Setting 144/145.",
      "Brother dialect": "Fanuc-compatible, fast tapping via M19+G84.2, limited macro B. 30-tool ATC focus.",
      "Robodrill dialect": "Fanuc 31i core, fast ATC (0.7s), alpha series-specific. AICC-II standard."
    }
  },
  {
    family: "siemens",
    variants: ["802D", "808D", "810D", "828D", "840C", "840D", "840D sl", "840D sl (safety integrated)", "SINUMERIK ONE"],
    derived_controllers: [
      "DMG Mori (Siemens option)", "Spinner", "Emco", "Chiron (Siemens)",
      "Grob", "Hermle (Siemens option)", "Index", "Traub",
      "Deckel Maho", "Gildemeister", "SW (Schwäbische Werkzeugmaschinen)"
    ],
    extension: ".mpf",
    program_format: "_%_N_%_MPF",
    key_differences: {
      "802D vs 828D": "802D is basic turning/milling, no ShopMill/ShopTurn, limited channels. 828D adds SINUMERIK Operate.",
      "808D": "Entry-level, limited to 3+1 axes. No CYCLE832 high-speed. No compiled cycles.",
      "840D vs 840D sl": "840D sl uses solution line NCU with drive-integrated safety. Higher block rate (2000 blocks/sec vs 1000).",
      "SINUMERIK ONE": "Digital native. Runs VNCK for virtual NC kernel simulation. CREATE MyVirtualMachine. 32 axes, 10 channels.",
      "CYCLE832": "High-speed settings macro. Only 828D and above. Sets tolerance, compressor, jerk limits.",
      "TRAORI": "5-axis transform orient. 840D/sl and SINUMERIK ONE only. Requires 5-axis software option."
    }
  },
  {
    family: "heidenhain",
    variants: ["iTNC 145", "iTNC 155", "iTNC 407", "iTNC 426", "iTNC 530", "TNC 320", "TNC 620", "TNC 640", "TNC7"],
    derived_controllers: [
      "Hermle (Heidenhain option)", "DMG Mori (Heidenhain option)",
      "Mikron", "Röders", "Parpas", "Alzmetall", "Fooke", "Zimmermann",
      "Reichenbacher", "Handtmann", "FPT Industrie", "Breton"
    ],
    extension: ".h",
    program_format: "BEGIN PGM %name% MM",
    key_differences: {
      "iTNC 530 vs TNC 640": "TNC 640 adds Dynamic Precision/Efficiency/Accuracy packages. ADP (Advanced Dynamic Prediction). 6-axis simultaneous.",
      "TNC 320": "Compact control for 3-5 axis milling. No turning cycles. Limited to 18 axes.",
      "TNC7": "Latest generation. Touchscreen native. Klartext conversational + DIN/ISO. New graphical simulation. BIM (Batch Process Manager).",
      "PLANE SPATIAL": "5-axis tilted plane. TNC 530+ only. Replaces CYCLE19 on older controls.",
      "FUNCTION TCPM": "Tool Center Point Management. TNC 640/TNC7. Replaces M128 on older controls.",
      "Conversational": "Heidenhain Klartext is unique — not ISO G-code. Uses L, CC, C, CR, DR path commands."
    }
  },
  {
    family: "mazak",
    variants: ["MAZATROL T-1", "MAZATROL T-PLUS", "MAZATROL M-32", "MAZATROL MATRIX",
               "MAZATROL Smart", "MAZATROL SmoothG", "MAZATROL SmoothAi", "MAZATROL SmoothX",
               "MAZATROL SmoothEz"],
    derived_controllers: [],
    extension: ".eia",
    program_format: "O%04d (or MAZATROL program name)",
    key_differences: {
      "MATRIX vs SmoothG": "SmoothG adds SFF (Smooth Fine Feedrate), Smooth Ai Thermal Shield. 560 block look-ahead vs 200.",
      "SmoothAi": "AI-driven thermal compensation, vibration suppression, spindle health monitoring. SFF2 (2nd gen).",
      "SmoothX": "Top-tier. 5-axis DONE IN ONE. Smooth NAVI M-g (auto-generates machining programs).",
      "SmoothEz": "Entry-level Smooth platform. EIA/ISO only (no MAZATROL conversational). 3+1 axis max.",
      "EIA vs MAZATROL": "Dual programming: MAZATROL conversational (proprietary) or EIA/ISO (G-code). Most posts target EIA mode.",
      "G05.1": "High-speed machining on all Smooth controls. Q1=on. Similar to Fanuc nano-smoothing."
    }
  },
  {
    family: "okuma",
    variants: ["OSP-E100", "OSP-P200", "OSP-P300", "OSP-P300A", "OSP-P300S", "OSP-P500"],
    derived_controllers: [],
    extension: ".min",
    program_format: "O%04d",
    key_differences: {
      "P200 vs P300": "P300 adds Super-NURBS, 5-axis auto tuning, Machining Navi. Faster block processing (8000 blocks/sec).",
      "P300A": "Advanced 5-axis. Collision Avoidance System standard. Turn-Cut function.",
      "OSP-P500": "Latest. AI-based Hy-Therm (thermal stability). OSP-AI suite. IoT/MTConnect native.",
      "G08 P1": "High-speed smoothing. Okuma-specific. Enables ahead interpolation for smooth contouring.",
      "Thermo-Friendly": "Okuma-exclusive thermal compensation. Not a post property — hardware. Reduces thermal drift to <8 microns."
    }
  },
  {
    family: "datron",
    variants: ["Datron next"],
    derived_controllers: [],
    extension: ".nc",
    program_format: "O%05d",
    key_differences: {
      "next vs legacy": "Datron next uses ARM-based control with touchscreen. Integrated CAM (Datron next G-code). Macro support limited.",
      "Vacuum table": "Datron machines use vacuum fixturing — post must handle vacuum zone M-codes.",
      "Spindle": "Datron HSM spindles to 60,000+ RPM. Posts optimize for high RPM with light DOC."
    }
  },
  {
    family: "fidia",
    variants: ["Fidia C20", "Fidia nC15", "Fidia nC20"],
    derived_controllers: [],
    extension: ".nc",
    program_format: "%",
    key_differences: {
      "nC15 vs nC20": "nC20 adds 6-axis simultaneous, integrated HSM look-ahead. nC15 limited to 5 channels.",
      "RTCP": "Fidia uses native RTCP (Rotated Tool Center Point). G143 equivalent.",
      "HSM": "Fidia Look Ahead up to 10,000 blocks. HQM (High Quality Machining) modes."
    }
  },
  {
    family: "milltronics",
    variants: ["Centurion 7", "Centurion 8", "CNC9000"],
    derived_controllers: [],
    extension: ".nc",
    program_format: "O%04d",
    key_differences: {
      "Centurion 7 vs 8": "Centurion 8 adds conversational programming enhancements. Basic EIA/ISO. Limited macro support.",
      "CNC9000": "Enhanced line-by-line. Basic G-code. No high-speed smoothing. 3-axis focus."
    }
  },
  {
    family: "grbl",
    variants: ["GRBL 1.1", "GRBL 1.1f", "grblHAL"],
    derived_controllers: [
      "Carbide Motion", "OpenBuilds", "CNCjs", "UGS (Universal G-code Sender)",
      "CNCRT", "Onefinity", "Shapeoko", "X-Carve"
    ],
    extension: ".nc",
    program_format: "%",
    key_differences: {
      "GRBL vs grblHAL": "grblHAL adds tool length comp, canned cycles, spindle sync. GRBL 1.1 is basic 3-axis.",
      "Limitations": "No canned cycles in base GRBL. No rotary axes. No work offset beyond G54-G59. No macro variables.",
      "Motion": "Real-time motion planning. Jerk-limited acceleration. S-curve on grblHAL only."
    }
  },
  {
    family: "tormach",
    variants: ["PathPilot", "PathPilot 2.x"],
    derived_controllers: [],
    extension: ".nc",
    program_format: "O%05d",
    key_differences: {
      "PathPilot": "LinuxCNC-based. Full conversational + G-code. Integrated CAM with PathPilot HUB.",
      "ATC": "Tormach BT30 ATC on PCNC 1100/770M. M6 tool change with TTS or BT30.",
      "Probing": "Tormach Probe supported. G38.2 probing cycles. PathPilot-specific probe routines."
    }
  },
  {
    family: "centroid",
    variants: ["Acorn", "M400", "T400"],
    derived_controllers: [],
    extension: ".nc",
    program_format: "O%04d",
    key_differences: {
      "Acorn": "Entry-level CNC board. 4-axis. Open architecture. Basic G-code + conversational.",
      "M400/T400": "Full CNC control. Intercon conversational. Probing. Rigid tapping.",
      "DXF Import": "Centroid Intercon imports DXF directly — unique workflow for 2D parts."
    }
  }
];

// ============================================================================
// PURCHASE OPTIONS DATABASE (U03)
// ============================================================================

const PURCHASE_OPTIONS: PurchaseOption[] = [
  {
    name: "HSM Package",
    description: "High-Speed Machining software option. Enables advanced look-ahead, smoothing algorithms, and jerk-limited path planning for higher feedrates with better surface finish.",
    properties_enabled: ["hsm_smoothing", "corner_rounding", "tolerance_control"],
    gcodes_enabled: ["G05.1 Q1 (Fanuc)", "G187 P1/P2/P3 (Haas)", "CYCLE832 (Siemens)", "G08 P1 (Okuma)", "M120 (Heidenhain)"],
    physics_impact: "Reduces acceleration spikes, lowers jerk at direction changes, enables higher sustained feedrates on complex geometry. Affects vibration, surface finish, and tool life models.",
    manufacturers: ["Fanuc", "Haas", "Siemens", "Mazak", "Okuma", "Heidenhain", "DMG Mori"]
  },
  {
    name: "Through-Spindle Coolant (TSC)",
    description: "High-pressure coolant delivery through the spindle and tool. Requires hollow-taper toolholders and high-pressure coolant pump (70-1000 psi).",
    properties_enabled: ["through_spindle_coolant", "coolant_pressure"],
    gcodes_enabled: ["M88 (TSC on)", "M89 (TSC off)", "M51/M52 (Haas programmable coolant)"],
    physics_impact: "Dramatically improves chip evacuation in deep holes and pockets. Reduces heat at cut zone. Enables higher feeds in drilling operations. Affects thermal model and chip formation prediction.",
    manufacturers: ["Haas", "DMG Mori", "Mazak", "Okuma", "Makino", "Matsuura", "Hermle"]
  },
  {
    name: "Probing System",
    description: "Touch probe and tool setter hardware plus probing software cycles. Enables in-process measurement, work offset setting, and tool length measurement.",
    properties_enabled: ["probing", "probing_type", "probe_calibration", "tool_setter"],
    gcodes_enabled: ["G65 P9xxx (Renishaw)", "G65 P8xxx (Haas)", "CYCLE977/978/979 (Siemens)", "TOUCH PROBE (Heidenhain)", "G31 (skip)"],
    physics_impact: "Enables closed-loop manufacturing. Probing data feeds back into offset compensation, thermal drift correction, and quality prediction models.",
    manufacturers: ["Renishaw", "Blum", "Heidenhain", "Hexagon", "Marposs", "Haas (WIPS)"]
  },
  {
    name: "5-Axis Simultaneous Package",
    description: "Enables simultaneous 5-axis interpolation with TCP/RTCP compensation. Requires kinematic calibration and typically a rotary/tilt table or trunnion.",
    properties_enabled: ["tcp_rtcp", "use_multi_axis_features", "use_3d_arcs", "multi_axis_feeding"],
    gcodes_enabled: ["G43.4/G43.5 (Fanuc)", "G234 DWO (Haas)", "TRAORI (Siemens)", "PLANE SPATIAL + FUNCTION TCPM (Heidenhain)", "G43.4 (Mazak)"],
    physics_impact: "Enables tool vector changes during cutting. Affects cutter engagement angle, chip load distribution, and surface cusp height. Critical for impeller/blisk/turbine blade machining.",
    manufacturers: ["DMG Mori", "Hermle", "Matsuura", "Mazak", "Okuma", "Grob", "Chiron", "Haas (UMC series)"]
  },
  {
    name: "Spindle Speed Variation (SSV)",
    description: "Automatic spindle speed oscillation to break up chatter harmonics. The control varies RPM within a programmed band at a set frequency.",
    properties_enabled: ["ssv_enabled", "ssv_speed_range", "ssv_rate"],
    gcodes_enabled: ["G96.1 (some Fanuc)", "Setting 191/192 (Haas SSV)", "CYCLE795 (Siemens)", "M38/M39 (Okuma)"],
    physics_impact: "Disrupts regenerative chatter by shifting excitation frequency. Improves stability lobe diagram coverage. Enables heavier cuts in unstable setups. Affects vibration model predictions.",
    manufacturers: ["Haas", "Mazak", "Okuma", "DMG Mori", "Fanuc (30i)"]
  },
  {
    name: "Dynamic Work Offsets (DWO)",
    description: "Dynamic Work Offset / tilted work plane capability for indexed 5-axis. Allows programming in part coordinates while the control transforms to machine coordinates.",
    properties_enabled: ["dwo_enabled", "tilted_work_plane"],
    gcodes_enabled: ["G234/G254 (Haas DWO)", "CYCLE800 (Siemens TRAORI5)", "PLANE SPATIAL (Heidenhain)", "G68.2 (Fanuc)"],
    physics_impact: "Simplifies 3+2 programming but does not change physics. Reduces programming errors for indexed operations. Affects collision detection envelope calculations.",
    manufacturers: ["Haas", "Fanuc", "Siemens", "Heidenhain", "Mazak"]
  },
  {
    name: "Rigid Tapping",
    description: "Synchronized spindle and Z-axis motion for tapping without floating holders. Required for accurate thread depth and reversible tapping cycles.",
    properties_enabled: ["rigid_tapping", "tapping_speed_limit"],
    gcodes_enabled: ["G84 (rigid tapping mode)", "G84.2/G84.3 (Fanuc peck tap)", "M29 (rigid tap mode select)"],
    physics_impact: "Ensures thread depth accuracy. Eliminates need for tension/compression holders. Affects cycle time estimation for tapped holes. Impacts torque calculations.",
    manufacturers: ["Fanuc", "Haas", "Siemens", "Heidenhain", "Mazak", "Okuma", "Brother"]
  },
  {
    name: "Canned Drilling Cycles",
    description: "Built-in drilling cycle support including peck drill, chip break, bore, ream, and tap. Controllers vary in which cycles are standard vs optional.",
    properties_enabled: ["use_canned_cycles", "peck_drilling", "chip_break_drilling"],
    gcodes_enabled: ["G73 (chip break)", "G81 (drill)", "G82 (counterbore)", "G83 (peck drill)", "G84 (tap)", "G85/G86/G87/G88/G89 (bore variants)"],
    physics_impact: "Peck/chip-break cycles manage chip evacuation and heat. Affects drilling force models, chip formation prediction, and cycle time estimation.",
    manufacturers: ["Fanuc", "Haas", "Siemens", "Heidenhain", "Mazak", "Okuma", "All ISO-compliant controllers"]
  },
  {
    name: "NURBS Interpolation",
    description: "Native NURBS (Non-Uniform Rational B-Spline) interpolation. The control processes spline data directly instead of linearized segments, reducing file size and improving surface finish.",
    properties_enabled: ["nurbs_interpolation", "spline_mode"],
    gcodes_enabled: ["G06.2 (Fanuc NURBS)", "BSPLINE (Siemens)", "Spline Mode (Heidenhain FK)"],
    physics_impact: "Reduces block count by 10-100x for complex surfaces. Smoother velocity profile. Eliminates chord error from linearization. Dramatically affects surface finish prediction.",
    manufacturers: ["Fanuc (30i/31i)", "Siemens (840D)", "Heidenhain (TNC 640/TNC7)", "Okuma (P300+)"]
  },
  {
    name: "Chip Conveyor / Chip Management",
    description: "Automatic chip conveyor control from G-code. Enables programmable chip conveyor start/stop and flush cycles between operations.",
    properties_enabled: ["chip_conveyor", "chip_flush"],
    gcodes_enabled: ["M31/M32 (chip conveyor fwd/rev)", "M33 (chip conveyor stop)", "M64/M65 (Haas chip auger)"],
    physics_impact: "Manages chip build-up that affects coolant flow and re-cutting. Indirect impact on tool life and surface finish through chip management.",
    manufacturers: ["Haas", "Mazak", "DMG Mori", "Okuma", "Doosan"]
  },
  {
    name: "Programmable Coolant",
    description: "Ability to control coolant pressure, nozzle position, and coolant type from G-code. Beyond simple flood/mist on/off.",
    properties_enabled: ["programmable_coolant", "coolant_pressure_control", "coolant_nozzle_position"],
    gcodes_enabled: ["M7 (mist)", "M8 (flood)", "M50/M51 (Haas P-Cool)", "COOLNT (Mazak)", "M100-M109 (pressure levels)"],
    physics_impact: "Targeted coolant delivery affects heat transfer at cut zone, chip evacuation efficiency, and tool life. Impacts thermal model inputs.",
    manufacturers: ["Haas", "Mazak", "DMG Mori", "Okuma", "Makino"]
  },
  {
    name: "Automatic Door Control",
    description: "Programmable automatic door open/close for automated production cells. Enables lights-out manufacturing integration.",
    properties_enabled: ["auto_door", "door_interlock"],
    gcodes_enabled: ["M85/M86 (Haas auto door)", "M60 (pallet change + door)", "M143/M144 (Mazak door)"],
    physics_impact: "No direct physics impact. Enables automated production scheduling. Affects OEE calculations and batch cycle time estimation.",
    manufacturers: ["Haas", "Mazak", "DMG Mori", "Okuma", "Makino"]
  },
  {
    name: "Part Catcher / Parts Catcher",
    description: "Automatic part catching mechanism for bar-fed turning. Catches parts after cutoff to prevent damage and enable continuous production.",
    properties_enabled: ["part_catcher", "bar_feeder_interface"],
    gcodes_enabled: ["M36/M37 (Haas parts catcher)", "M24/M25 (generic)", "M243/M244 (Mazak)"],
    physics_impact: "No physics impact on cutting. Affects cycle time for turning operations and enables continuous bar-fed production scheduling.",
    manufacturers: ["Haas", "Mazak", "Okuma", "Nakamura-Tome", "Doosan"]
  },
  {
    name: "Rotary Table / Indexer",
    description: "4th axis rotary table or indexer. Enables indexed positioning (3+1) or simultaneous 4-axis machining. May include tailstock control.",
    properties_enabled: ["rotary_table", "rotary_axis_id", "indexing_angle", "tailstock"],
    gcodes_enabled: ["M10/M11 (rotary clamp/unclamp)", "G00 A/B (index)", "M14/M15 (Haas brake)", "B= (Siemens SPOS)"],
    physics_impact: "Adds rotary axis to kinematic model. Affects work envelope calculations, fixture design, and multi-face machining strategies.",
    manufacturers: ["Haas", "Fanuc", "Nikken", "Tsudakoma", "Kitagawa", "Peiseler"]
  },
  {
    name: "Tool Breakage Detection",
    description: "Automatic tool breakage detection between operations. Uses laser, contact, or air-blast measurement to verify tool integrity.",
    properties_enabled: ["tool_break_detection", "tool_measure_after_use"],
    gcodes_enabled: ["G65 P9023 (Renishaw TRS)", "G37 (tool measure)", "M36 (Haas tool probe)"],
    physics_impact: "Prevents machining with broken tools. Feeds tool wear model with actual wear data. Enables sister tooling strategies and predictive tool life models.",
    manufacturers: ["Haas", "DMG Mori", "Mazak", "Okuma", "Renishaw", "Blum"]
  }
];

// ============================================================================
// CANONICAL PROPERTY DATABASE (U01 + U02)
// ============================================================================

const CANONICAL_PROPERTIES: CanonicalProperty[] = [
  // ── Preferences Group ─────────────────────────────────────────────────
  {
    canonical_name: "hsm_smoothing",
    display_name: "High-Speed Machining Smoothing",
    category: "purchase_dependent",
    purchase_option: "HSM Package",
    group: "preferences",
    type: "boolean",
    description: "Enables controller-specific high-speed smoothing algorithms that optimize feedrate at direction changes, reduce jerk, and improve surface finish during high-speed contouring.",
    physics_impact: "Affects acceleration/deceleration profiles, jerk limits, and corner velocity. Reduces machining time on complex geometry by 8-25%. Improves surface finish by reducing vibration at direction changes.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useSmoothing",
        gcodes: ["G05.1 Q1 (on)", "G05.1 Q0 (off)"],
        values: [{ title: "Off", id: "0" }, { title: "On (G05.1 Q1)", id: "1" }],
        default_value: false,
        notes: "Fanuc 30i/31i nano-smoothing. Q1=standard, some support Q2 for enhanced. Requires AICC-II option on older controls."
      },
      {
        controller_family: "haas",
        property_name: "useSmoothing",
        gcodes: ["G187 P1 (rough)", "G187 P2 (medium)", "G187 P3 (finish)"],
        values: [
          { title: "Off", id: "0" },
          { title: "Rough (P1)", id: "1" },
          { title: "Medium (P2)", id: "2" },
          { title: "Finish (P3)", id: "3" }
        ],
        default_value: false,
        notes: "Haas NGC uses G187 with E tolerance parameter. P1=fastest/roughest, P3=smoothest/slowest. Setting 191 for global."
      },
      {
        controller_family: "siemens",
        property_name: "useSmoothing",
        gcodes: ["CYCLE832(<tolerance>, <mode>)"],
        values: [{ title: "Off", id: "0" }, { title: "On", id: "1" }],
        default_value: false,
        notes: "CYCLE832 macro sets compressor (COMPCAD/COMPCURV), tolerance (CTOL/OTOL), and jerk (SOFT). 840D sl and SINUMERIK ONE only."
      },
      {
        controller_family: "mazak",
        property_name: "useSmoothing",
        gcodes: ["G05.1 Q1 (on)", "G05.1 Q0 (off)"],
        values: [{ title: "Off", id: "0" }, { title: "On", id: "1" }],
        default_value: false,
        notes: "SmoothG/Ai/X controls. Similar to Fanuc G05.1. SFF (Smooth Fine Feedrate) enhances this on SmoothAi+."
      },
      {
        controller_family: "heidenhain",
        property_name: "useSmoothing",
        gcodes: ["M120 (look-ahead)", "CYCLE32 (<tolerance>)"],
        mcodes: ["M120"],
        values: [{ title: "Off", id: "0" }, { title: "On", id: "1" }],
        default_value: false,
        notes: "M120 L<n> enables look-ahead with n-block buffer. CYCLE32 sets tolerance. TNC 640+ adds Dynamic Precision/Efficiency/Accuracy modes."
      },
      {
        controller_family: "okuma",
        property_name: "useSmoothing",
        gcodes: ["G08 P1 (on)", "G08 P0 (off)"],
        values: [{ title: "Off", id: "0" }, { title: "On", id: "1" }],
        default_value: false,
        notes: "Okuma Super-NURBS / high-speed machining mode. OSP-P300+ adds enhanced look-ahead. G08 P1 activates ahead interpolation."
      }
    ]
  },
  {
    canonical_name: "tcp_rtcp",
    display_name: "Tool Center Point / RTCP Management",
    category: "purchase_dependent",
    purchase_option: "5-Axis Simultaneous Package",
    group: "multiAxis",
    type: "boolean",
    description: "Enables Tool Center Point (TCP) or Rotated Tool Center Point (RTCP) management for 5-axis simultaneous machining. The control compensates tool tip position as rotary axes move.",
    physics_impact: "Controls tool vector during multi-axis cutting. Affects cutter engagement angle, chip load distribution, scallop height, and tool deflection in 5-axis operations.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useTCP",
        gcodes: ["G43.4 (TCP on)", "G43.5 (TCP with tool vector)", "G49 (cancel)"],
        default_value: false,
        notes: "G43.4 requires 5-axis software option. G43.5 adds tool vector control on 30i/31i-B5. Requires kinematic parameter setup (M code or parameter)."
      },
      {
        controller_family: "haas",
        property_name: "useTCP",
        gcodes: ["G234 (DWO on)", "G235 (DWO off)", "G143 (5-axis TCP)"],
        default_value: false,
        notes: "Haas DWO (Dynamic Work Offset) via G234. G143 enables TCP on UMC models. Requires UMC-series or VR-series machine with 5-axis option."
      },
      {
        controller_family: "siemens",
        property_name: "useTiltedWorkplane",
        gcodes: ["TRAORI (5-axis transform)", "CYCLE800 (indexed swivel)"],
        default_value: false,
        notes: "TRAORI enables 5-axis transformation. CYCLE800 for 3+2 indexed. Requires 5-axis software option on 840D sl. SINUMERIK ONE includes by default."
      },
      {
        controller_family: "heidenhain",
        property_name: "useTCP",
        gcodes: ["FUNCTION TCPM", "M128 (legacy)"],
        mcodes: ["M128 (legacy TCP)", "M129 (TCP off)"],
        default_value: false,
        notes: "FUNCTION TCPM replaces M128 on TNC 640/TNC7. Adds AXIS POS/AXIS SPAT modes. PLANE SPATIAL defines tilted plane separately."
      },
      {
        controller_family: "mazak",
        property_name: "useTCP",
        gcodes: ["G43.4 (TCP)", "G68.2 (tilted plane)"],
        default_value: false,
        notes: "Mazak uses Fanuc-style G43.4 for TCP. G68.2 for tilted work plane (3+2). SmoothX adds DONE-IN-ONE optimization."
      },
      {
        controller_family: "okuma",
        property_name: "useTCP",
        gcodes: ["G43.4 (TCP)", "G43.5 (tool vector)"],
        default_value: false,
        notes: "Okuma OSP-P300A+ supports 5-axis TCP. Collision Avoidance System (CAS) integrates with TCP for safe multi-axis moves."
      }
    ]
  },
  {
    canonical_name: "safe_retract",
    display_name: "Safe Retract Method",
    category: "machine_config",
    group: "configuration",
    type: "enum",
    description: "Defines how the machine retracts to a safe position during tool changes and program end. Critical for crash prevention — wrong setting can cause machine damage.",
    physics_impact: "Affects tool change time and machine positioning. Wrong retract method with rotary axes in non-home position can cause collision. Impacts cycle time estimation.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "safePositionMethod",
        gcodes: ["G28 (machine home via intermediate)", "G53 (machine coordinate direct)"],
        values: [
          { title: "G28 — Return to Home", id: "G28" },
          { title: "G53 — Machine Coordinate", id: "G53" },
          { title: "Clearance Plane", id: "clearanceHeight" }
        ],
        default_value: "G28",
        notes: "G28 moves through intermediate point (potential collision). G53 moves directly in machine coords (safer). G30 P2/P3/P4 for alternate home positions."
      },
      {
        controller_family: "haas",
        property_name: "safePositionMethod",
        gcodes: ["G28 (home via intermediate)", "G53 (machine coord)", "G30 P2 (2nd home)"],
        values: [
          { title: "G28", id: "G28" },
          { title: "G53", id: "G53" },
          { title: "Clearance Plane", id: "clearanceHeight" }
        ],
        default_value: "G28",
        notes: "Haas recommends G53 for 5-axis machines to avoid intermediate point collision. Setting 142 (Z home position) affects G28."
      },
      {
        controller_family: "siemens",
        property_name: "safePositionMethod",
        gcodes: ["SUPA G0 Z (machine coord rapid)", "G53 (compatible mode)", "G75 (reference point)"],
        values: [
          { title: "SUPA — Suppress work offset", id: "supa" },
          { title: "G53", id: "G53" },
          { title: "Clearance Plane", id: "clearanceHeight" }
        ],
        default_value: "supa",
        notes: "SUPA suppresses all work offsets for one block — effectively G53. Some posts use SUPA D0 to also cancel tool comp. G75 triggers reference point approach."
      },
      {
        controller_family: "heidenhain",
        property_name: "safePositionMethod",
        gcodes: ["M91 (machine datum)", "M92 (datum preset position)"],
        mcodes: ["M91", "M92"],
        values: [
          { title: "M91 — Machine Datum", id: "M91" },
          { title: "M92 — Datum Preset", id: "M92" },
          { title: "Clearance Plane", id: "clearanceHeight" }
        ],
        default_value: "M91",
        notes: "Heidenhain M91 moves to machine datum (like G53). M92 moves to a preset position. Both can be used with L commands for axis-specific retract."
      },
      {
        controller_family: "mazak",
        property_name: "safePositionMethod",
        gcodes: ["G28 (home)", "G53 (machine coord)", "G30 (2nd reference)"],
        values: [
          { title: "G28", id: "G28" },
          { title: "G53", id: "G53" },
          { title: "Clearance Plane", id: "clearanceHeight" }
        ],
        default_value: "G28",
        notes: "Mazak Smooth controls support both G28 and G53. G30 for second reference point. MAZATROL programs handle retract internally."
      },
      {
        controller_family: "okuma",
        property_name: "safePositionMethod",
        gcodes: ["G28 (reference return)", "G53 (machine coordinate)"],
        values: [
          { title: "G28", id: "G28" },
          { title: "G53", id: "G53" },
          { title: "Clearance Plane", id: "clearanceHeight" }
        ],
        default_value: "G28",
        notes: "Okuma OSP uses G28 with axis word for selective return. G53 available on P200+. ZRN (Zero Return) equivalent."
      }
    ]
  },
  {
    canonical_name: "work_offsets",
    display_name: "Work Coordinate Offsets",
    category: "always_available",
    group: "configuration",
    type: "enum",
    description: "Selects the work coordinate system (fixture offset). Determines which stored offset the controller uses for part zero.",
    physics_impact: "No direct physics impact. Affects multi-fixture setups and pallet systems. Wrong offset selection causes parts out of position — tolerance/collision concern.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "workOffset",
        gcodes: ["G54-G59 (standard 6)", "G54.1 P1-P300 (extended)"],
        values: [
          { title: "G54", id: "1" }, { title: "G55", id: "2" }, { title: "G56", id: "3" },
          { title: "G57", id: "4" }, { title: "G58", id: "5" }, { title: "G59", id: "6" },
          { title: "G54.1 Pn (extended)", id: "extended" }
        ],
        default_value: "1",
        notes: "G54.1 P1-P48 standard, up to P300 on 30i. G10 L2 for programmatic offset setting."
      },
      {
        controller_family: "haas",
        property_name: "workOffset",
        gcodes: ["G54-G59", "G154 P1-P99 (extended offsets)"],
        values: [
          { title: "G54", id: "1" }, { title: "G55", id: "2" }, { title: "G56", id: "3" },
          { title: "G57", id: "4" }, { title: "G58", id: "5" }, { title: "G59", id: "6" },
          { title: "G154 Pn (extended)", id: "extended" }
        ],
        default_value: "1",
        notes: "Haas uses G154 Pn for extended offsets (not G54.1). Up to P99. G254 pairs with G234 DWO."
      },
      {
        controller_family: "siemens",
        property_name: "workOffset",
        gcodes: ["G54-G57 (standard 4)", "G505-G599 (extended)", "FRAMES"],
        values: [
          { title: "G54", id: "1" }, { title: "G55", id: "2" },
          { title: "G56", id: "3" }, { title: "G57", id: "4" },
          { title: "FRAMES (programmable)", id: "frames" }
        ],
        default_value: "1",
        notes: "Siemens uses FRAMES system for advanced offset management. TRANS, AROT, ASCALE, AMIRROR for transformations. $P_UIFR for settable frames."
      },
      {
        controller_family: "heidenhain",
        property_name: "workOffset",
        gcodes: ["Datum table (preset table rows)"],
        values: [{ title: "Datum table row", id: "datum" }],
        default_value: "datum",
        notes: "Heidenhain uses preset table (datum table) rows, not G54-G59. CYCL DEF 7.0 (datum shift) or TRANS DATUM for programmatic."
      },
      {
        controller_family: "mazak",
        property_name: "workOffset",
        gcodes: ["G54-G59", "G54.1 P1-P48 (extended)"],
        values: [
          { title: "G54", id: "1" }, { title: "G55", id: "2" }, { title: "G56", id: "3" },
          { title: "G57", id: "4" }, { title: "G58", id: "5" }, { title: "G59", id: "6" }
        ],
        default_value: "1",
        notes: "Standard Fanuc-compatible G54-G59. Extended offsets via G54.1 on SmoothG+."
      },
      {
        controller_family: "okuma",
        property_name: "workOffset",
        gcodes: ["G54-G59", "G15 H1-H48 (extended)"],
        values: [
          { title: "G54", id: "1" }, { title: "G55", id: "2" }, { title: "G56", id: "3" },
          { title: "G57", id: "4" }, { title: "G58", id: "5" }, { title: "G59", id: "6" }
        ],
        default_value: "1",
        notes: "Okuma OSP uses G15 H<n> for extended work coordinates beyond G54-G59."
      }
    ]
  },
  {
    canonical_name: "sequence_numbers",
    display_name: "Sequence (Line) Numbers",
    category: "always_available",
    group: "configuration",
    type: "boolean",
    description: "Adds N-word sequence numbers to each G-code line. Used for program organization, goto statements, and operator reference.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "showSequenceNumbers",
        default_value: true,
        notes: "N1, N2, N3... Standard increment of 1 or 10. Required for GOTO/IF statements."
      },
      {
        controller_family: "haas",
        property_name: "showSequenceNumbers",
        default_value: true,
        notes: "Same as Fanuc. Haas NGC uses N-words for subprogram calls and GOTO."
      },
      {
        controller_family: "siemens",
        property_name: "showSequenceNumbers",
        default_value: false,
        notes: "N-words optional in Siemens. SINUMERIK programs often omit line numbers. Labels (LABEL:) used instead of GOTO Nxxx."
      },
      {
        controller_family: "heidenhain",
        property_name: "showSequenceNumbers",
        default_value: true,
        notes: "Heidenhain always uses line numbers in Klartext. Auto-numbered. LBL for labels/loops."
      },
      {
        controller_family: "mazak",
        property_name: "showSequenceNumbers",
        default_value: true,
        notes: "Standard N-word numbering. EIA mode requires N-words for sequence."
      },
      {
        controller_family: "okuma",
        property_name: "showSequenceNumbers",
        default_value: true,
        notes: "Standard N-word numbering on OSP."
      }
    ]
  },
  {
    canonical_name: "preload_tool",
    display_name: "Preload Next Tool",
    category: "machine_config",
    group: "preferences",
    type: "boolean",
    description: "Commands the tool magazine to preload the next tool while the current tool is cutting. Reduces tool change time by having the next tool ready in the carousel.",
    physics_impact: "No physics impact on cutting. Reduces non-cutting time by 1-5 seconds per tool change. Significant for high-tool-count jobs.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "preloadTool",
        gcodes: ["T<next> (preload command)"],
        default_value: true,
        notes: "T-word preloads without changing. M6 executes change. Requires ATC with preload capability."
      },
      {
        controller_family: "haas",
        property_name: "preloadTool",
        gcodes: ["T<next> (preload)"],
        default_value: true,
        notes: "Haas side-mount and umbrella ATC support preload. T-word queues next tool. Not available on manual tool change machines."
      },
      {
        controller_family: "siemens",
        property_name: "preloadTool",
        gcodes: ["T=\"<next_tool>\" (preload by name or number)"],
        default_value: true,
        notes: "Siemens can preload by tool name. Magazine management handles preload automatically on some configurations."
      },
      {
        controller_family: "heidenhain",
        property_name: "preloadTool",
        gcodes: ["TOOL CALL <next> (preload)"],
        default_value: true,
        notes: "Heidenhain TOOL CALL with DL for preload. Magazine system handles queuing."
      },
      {
        controller_family: "mazak",
        property_name: "preloadTool",
        gcodes: ["T<next> (preload)"],
        default_value: true,
        notes: "Mazak magazine preload standard on all horizontal and most vertical machines."
      },
      {
        controller_family: "okuma",
        property_name: "preloadTool",
        default_value: true,
        notes: "Okuma ATC supports preload on most configurations."
      }
    ]
  },
  {
    canonical_name: "optional_stop",
    display_name: "Optional Stop Between Tools",
    category: "always_available",
    group: "preferences",
    type: "boolean",
    description: "Inserts M01 (optional stop) between tool changes. When the optional stop switch is ON at the machine, program execution pauses for operator inspection.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "optionalStop",
        mcodes: ["M01"],
        default_value: true,
        notes: "Universal M01. Machine-side switch enables/disables. Standard on all Fanuc controls."
      },
      {
        controller_family: "haas",
        property_name: "optionalStop",
        mcodes: ["M01"],
        default_value: true,
        notes: "M01 standard. Haas Setting 24 (Optional Stop) controls behavior."
      },
      {
        controller_family: "siemens",
        property_name: "optionalStop",
        mcodes: ["M01"],
        default_value: true,
        notes: "M01 standard. Operator panel has Optional Stop button/key."
      },
      {
        controller_family: "heidenhain",
        property_name: "optionalStop",
        mcodes: ["M01"],
        default_value: true,
        notes: "M01 standard. Some posts use STOP (mandatory) vs M01 (optional)."
      },
      {
        controller_family: "mazak",
        property_name: "optionalStop",
        mcodes: ["M01"],
        default_value: true,
        notes: "M01 standard on EIA mode. MAZATROL mode handles stops differently."
      },
      {
        controller_family: "okuma",
        property_name: "optionalStop",
        mcodes: ["M01"],
        default_value: true,
        notes: "M01 standard on OSP."
      }
    ]
  },
  {
    canonical_name: "separate_words",
    display_name: "Separate Words with Spaces",
    category: "always_available",
    group: "formats",
    type: "boolean",
    description: "Controls whether G-code words are separated by spaces. Some controllers require spaces between words (G0 X1.0 Y2.0), others accept compact format (G0X1.Y2.).",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "separateWordsWithSpace",
        default_value: true,
        notes: "Fanuc accepts both but spaces improve readability. Most posts output with spaces."
      },
      {
        controller_family: "haas",
        property_name: "separateWordsWithSpace",
        default_value: true,
        notes: "Haas requires spaces between words. Compact format may cause alarms."
      },
      {
        controller_family: "siemens",
        property_name: "separateWordsWithSpace",
        default_value: true,
        notes: "Siemens requires spaces. SINUMERIK parser expects whitespace-delimited tokens."
      },
      {
        controller_family: "heidenhain",
        property_name: "separateWordsWithSpace",
        default_value: true,
        notes: "Heidenhain Klartext always uses spaces. Format is inherently spaced."
      },
      {
        controller_family: "mazak",
        property_name: "separateWordsWithSpace",
        default_value: true,
        notes: "Spaces standard in EIA mode."
      },
      {
        controller_family: "okuma",
        property_name: "separateWordsWithSpace",
        default_value: true,
        notes: "OSP expects spaces between words."
      }
    ]
  },
  {
    canonical_name: "show_notes",
    display_name: "Show Operation Notes/Comments",
    category: "always_available",
    group: "preferences",
    type: "boolean",
    description: "Includes CAM operation notes and comments in the G-code output as comments. Helps operators understand program intent.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "showNotes",
        default_value: true,
        notes: "Comments in parentheses: (comment text). Some controls limit to uppercase ASCII."
      },
      {
        controller_family: "haas",
        property_name: "showNotes",
        default_value: true,
        notes: "Comments in parentheses. Haas NGC supports longer comments. Displayed on screen during run."
      },
      {
        controller_family: "siemens",
        property_name: "showNotes",
        default_value: true,
        notes: "Comments with semicolon: ; comment text. Inline and block comments supported."
      },
      {
        controller_family: "heidenhain",
        property_name: "showNotes",
        default_value: true,
        notes: "Comments on separate lines. No inline comments in Klartext."
      },
      {
        controller_family: "mazak",
        property_name: "showNotes",
        default_value: true,
        notes: "Comments in parentheses, EIA mode. MAZATROL mode has operation comments built in."
      },
      {
        controller_family: "okuma",
        property_name: "showNotes",
        default_value: true,
        notes: "Comments in parentheses on OSP."
      }
    ]
  },
  {
    canonical_name: "use_radius_arcs",
    display_name: "Use Radius (R) for Arc Commands",
    category: "always_available",
    group: "formats",
    type: "boolean",
    description: "Controls whether circular interpolation uses R-word (radius) or I/J/K (incremental center) format. R format is simpler but ambiguous for arcs > 180 degrees.",
    physics_impact: "No physics impact. Format choice affects post-processor accuracy for large arcs. IJK avoids ambiguity for arcs > 180 degrees.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useRadius",
        gcodes: ["G02/G03 R<radius> vs G02/G03 I<x> J<y>"],
        default_value: false,
        notes: "IJK (default) avoids ambiguity. R format limited to arcs <= 180 degrees. Fanuc supports both."
      },
      {
        controller_family: "haas",
        property_name: "useRadius",
        gcodes: ["G02/G03 R or I/J"],
        default_value: false,
        notes: "Both supported. IJK recommended. Setting 85 (Canned Cycle Arc Type) affects behavior."
      },
      {
        controller_family: "siemens",
        property_name: "useRadius",
        gcodes: ["G02/G03 CR= (radius) or I/J/K"],
        default_value: false,
        notes: "Siemens uses CR= for radius specification. CT for tangential arcs. RND for rounding."
      },
      {
        controller_family: "heidenhain",
        property_name: "useRadius",
        gcodes: ["CR (circle center radius) or CC+C (circle center + path)"],
        default_value: false,
        notes: "Heidenhain uses CC (circle center) + C/CR/CT path elements. Different from ISO G02/G03 format."
      },
      {
        controller_family: "mazak",
        property_name: "useRadius",
        gcodes: ["G02/G03 R or I/J"],
        default_value: false,
        notes: "Fanuc-compatible arc format. Both R and IJK supported."
      },
      {
        controller_family: "okuma",
        property_name: "useRadius",
        gcodes: ["G02/G03 R or I/J"],
        default_value: false,
        notes: "Both supported on OSP. IJK is default in most Okuma posts."
      }
    ]
  },
  {
    canonical_name: "tool_as_name",
    display_name: "Use Tool Name Instead of Number",
    category: "machine_config",
    group: "preferences",
    type: "boolean",
    description: "Outputs tool identifier as a name string rather than a number. Some controllers support tool management by name for flexible magazine assignment.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "toolAsName",
        default_value: false,
        notes: "Fanuc uses T<number>. Tool name in comments only. No native name-based tool management."
      },
      {
        controller_family: "haas",
        property_name: "toolAsName",
        default_value: false,
        notes: "Haas uses T<number>. Tool descriptions in offsets table but not in G-code. NGC supports tool descriptions."
      },
      {
        controller_family: "siemens",
        property_name: "toolAsName",
        gcodes: ["T=\"TOOL_NAME\""],
        default_value: false,
        notes: "Siemens supports tool call by name: T=\"ENDMILL_10\". Powerful tool management system."
      },
      {
        controller_family: "heidenhain",
        property_name: "toolAsName",
        gcodes: ["TOOL CALL \"TOOL_NAME\""],
        default_value: false,
        notes: "Heidenhain supports TOOL CALL by name. Tool table uses name + number. Common on large magazine machines."
      },
      {
        controller_family: "mazak",
        property_name: "toolAsName",
        default_value: false,
        notes: "Mazak EIA uses T<number>. MAZATROL mode uses tool names internally."
      },
      {
        controller_family: "okuma",
        property_name: "toolAsName",
        default_value: false,
        notes: "Okuma OSP uses T<number> in G-code."
      }
    ]
  },
  {
    canonical_name: "through_spindle_coolant",
    display_name: "Through-Spindle Coolant (TSC)",
    category: "purchase_dependent",
    purchase_option: "Through-Spindle Coolant (TSC)",
    group: "preferences",
    type: "boolean",
    description: "Enables high-pressure coolant delivery through the spindle bore and tool. Requires hollow toolholders and high-pressure pump (70-1000+ PSI).",
    physics_impact: "Dramatically improves chip evacuation in deep holes (3xD+). Reduces cutting temperature by 30-50%. Enables higher feeds in drilling. Affects thermal model, chip formation, and tool life prediction.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useTSC",
        mcodes: ["M88 (TSC on)", "M89 (TSC off)"],
        default_value: false,
        notes: "Standard M88/M89. Requires machine-specific TSC hardware option."
      },
      {
        controller_family: "haas",
        property_name: "useTSC",
        mcodes: ["M88 (TSC on)", "M89 (TSC off)"],
        default_value: false,
        notes: "Haas TSC option (70 or 1000 PSI). M88/M89. Setting 175 for coolant pressure. P-Cool (M51/M52) for programmable coolant."
      },
      {
        controller_family: "siemens",
        property_name: "useTSC",
        mcodes: ["M88", "M89"],
        default_value: false,
        notes: "Machine-specific M-codes. Some builders use M50/M51 instead of M88/M89."
      },
      {
        controller_family: "heidenhain",
        property_name: "useTSC",
        mcodes: ["M88", "M89"],
        default_value: false,
        notes: "Standard M88/M89. Some builders assign custom M-codes for TSC pressure levels."
      },
      {
        controller_family: "mazak",
        property_name: "useTSC",
        mcodes: ["M88 (TSC on)", "M89 (TSC off)", "M51 (programmable coolant)"],
        default_value: false,
        notes: "Mazak TSC option. M88/M89 standard. SmoothAi adds intelligent coolant flow control."
      },
      {
        controller_family: "okuma",
        property_name: "useTSC",
        mcodes: ["M88", "M89"],
        default_value: false,
        notes: "Okuma TSC option. Standard M88/M89 interface."
      }
    ]
  },
  {
    canonical_name: "probing",
    display_name: "In-Process Probing",
    category: "purchase_dependent",
    purchase_option: "Probing System",
    group: "probing",
    type: "boolean",
    description: "Enables touch-probe measurement cycles for work offset setting, part inspection, and tool measurement. Requires probe hardware and probing software license.",
    physics_impact: "Enables closed-loop manufacturing. Probe data feeds offset compensation, thermal drift correction. Reduces scrap rate. Affects quality prediction confidence.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useProbing",
        gcodes: ["G31 (skip function)", "G65 P9xxx (Renishaw macros)"],
        default_value: false,
        notes: "Fanuc uses G31 skip function as base. Renishaw Inspection Plus or Hexagon macros for high-level cycles."
      },
      {
        controller_family: "haas",
        property_name: "useProbing",
        gcodes: ["G65 P9xxx (WIPS)", "G65 P8xxx (Renishaw on Haas)"],
        default_value: false,
        notes: "Haas WIPS (Wireless Intuitive Probing System) or Renishaw probing. Built-in probing cycles on NGC."
      },
      {
        controller_family: "siemens",
        property_name: "useProbing",
        gcodes: ["CYCLE977 (measure pocket)", "CYCLE978 (measure shaft)", "CYCLE979 (measure plane)"],
        default_value: false,
        notes: "Siemens has built-in measuring cycles (CYCLE977-979). Also supports Renishaw Productivity+ and Hexagon."
      },
      {
        controller_family: "heidenhain",
        property_name: "useProbing",
        gcodes: ["TOUCH PROBE (built-in cycles)", "TCH PROBE 4xx (measurement cycles)"],
        default_value: false,
        notes: "Heidenhain has extensive built-in touch probe cycles (TCH PROBE 400-499). Supports TS 460/TS 760 probes."
      },
      {
        controller_family: "mazak",
        property_name: "useProbing",
        gcodes: ["G65 P9xxx (Renishaw)", "MAZATROL probe cycles"],
        default_value: false,
        notes: "Mazak supports Renishaw probing in EIA mode. MAZATROL has built-in measurement functions."
      },
      {
        controller_family: "okuma",
        property_name: "useProbing",
        gcodes: ["G31 (skip function)", "Custom probe macros"],
        default_value: false,
        notes: "Okuma OSP probing via G31 skip function. Renishaw or Blum probe support."
      }
    ]
  },
  {
    canonical_name: "tolerance_control",
    display_name: "Machining Tolerance / Chordal Deviation",
    category: "always_available",
    group: "preferences",
    type: "spatial",
    description: "Sets the contouring tolerance for the controller's path interpolation. Smaller values produce smoother surfaces but slower feedrates. Affects how tightly the tool follows programmed path.",
    physics_impact: "Directly controls chordal deviation from ideal surface. Affects surface finish (Ra), geometric accuracy, and feedrate. Smaller tolerance = better finish but longer cycle time.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "tolerance",
        gcodes: ["G05.1 Q1 tolerance parameter", "G64 P<tol> (cutting mode with tolerance)"],
        default_value: 0.01,
        notes: "G64 P<tolerance> sets contouring tolerance in mm. G61 = exact stop (no tolerance). G64 = continuous with P parameter."
      },
      {
        controller_family: "haas",
        property_name: "tolerance",
        gcodes: ["G187 E<tolerance>"],
        default_value: 0.01,
        notes: "G187 E value sets the smoothing tolerance in the current unit system. Higher E = more smoothing, less accuracy."
      },
      {
        controller_family: "siemens",
        property_name: "tolerance",
        gcodes: ["CTOL (contour tolerance)", "OTOL (orientation tolerance)"],
        default_value: 0.01,
        notes: "CYCLE832 sets CTOL and OTOL. CTOL controls path deviation. OTOL controls tool orientation deviation in 5-axis."
      },
      {
        controller_family: "heidenhain",
        property_name: "tolerance",
        gcodes: ["CYCLE32 <tolerance>"],
        default_value: 0.01,
        notes: "CYCLE32 sets contour tolerance. Dynamic modes (Precision/Efficiency/Accuracy) on TNC 640+ also set jerk limits."
      },
      {
        controller_family: "mazak",
        property_name: "tolerance",
        default_value: 0.01,
        notes: "Tolerance set in conjunction with G05.1 smoothing. SFF (Smooth Fine Feedrate) uses internal tolerance management."
      },
      {
        controller_family: "okuma",
        property_name: "tolerance",
        default_value: 0.01,
        notes: "Tolerance parameter with G08 smoothing. Super-NURBS mode manages tolerance internally."
      }
    ]
  },
  {
    canonical_name: "use_canned_cycles",
    display_name: "Use Canned Drilling Cycles",
    category: "always_available",
    group: "preferences",
    type: "boolean",
    description: "Enables use of canned drilling cycles (G73, G81-G89) instead of long-hand drilling code. Reduces program size and simplifies drilling operations.",
    physics_impact: "Canned peck cycles (G73/G83) manage chip evacuation and heat in deep holes. Affects drilling force models and cycle time calculations.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useCycles",
        gcodes: ["G73 (chip break)", "G81 (drill)", "G82 (dwell)", "G83 (peck)", "G84 (tap)", "G85-G89 (bore)"],
        default_value: true,
        notes: "Full ISO canned cycle support. G80 to cancel. G98/G99 for return plane control."
      },
      {
        controller_family: "haas",
        property_name: "useCycles",
        gcodes: ["G73", "G81-G89", "G84.2/G84.3 (rigid tap with peck)"],
        default_value: true,
        notes: "Full Fanuc-compatible cycles plus G84.2/G84.3 rigid tapping with peck capability."
      },
      {
        controller_family: "siemens",
        property_name: "useCycles",
        gcodes: ["CYCLE81 (drill)", "CYCLE82 (counterbore)", "CYCLE83 (deep drill)", "CYCLE84 (tap)", "CYCLE85-89 (bore)"],
        default_value: true,
        notes: "Siemens CYCLE81-89 compiled cycles. Different syntax from ISO G81-G89 but equivalent function. MCALL for modal cycles."
      },
      {
        controller_family: "heidenhain",
        property_name: "useCycles",
        gcodes: ["CYCL DEF 200 (drill)", "CYCL DEF 201 (ream)", "CYCL DEF 203 (countersink)", "CYCL DEF 205 (peck drill)", "CYCL DEF 206 (tap)"],
        default_value: true,
        notes: "Heidenhain uses CYCL DEF 200-series for hole operations. Different numbering from ISO. CYCL CALL to execute."
      },
      {
        controller_family: "mazak",
        property_name: "useCycles",
        gcodes: ["G73", "G81-G89"],
        default_value: true,
        notes: "Fanuc-compatible canned cycles in EIA mode. MAZATROL has built-in drilling patterns."
      },
      {
        controller_family: "okuma",
        property_name: "useCycles",
        gcodes: ["G73", "G81-G89"],
        default_value: true,
        notes: "Standard ISO canned cycles on OSP."
      }
    ]
  },
  {
    canonical_name: "use_multi_axis_features",
    display_name: "Multi-Axis Machining Mode",
    category: "purchase_dependent",
    purchase_option: "5-Axis Simultaneous Package",
    group: "multiAxis",
    type: "boolean",
    description: "Enables multi-axis simultaneous machining features. When disabled, rotary axes are treated as indexed positioning only (3+2).",
    physics_impact: "Simultaneous multi-axis motion changes cutter engagement geometry continuously. Affects chip load variation, tool deflection, and surface quality predictions across the entire toolpath.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useMultiAxisFeatures",
        default_value: false,
        notes: "Requires 5-axis software option on 30i/31i-B5."
      },
      {
        controller_family: "haas",
        property_name: "useMultiAxisFeatures",
        default_value: false,
        notes: "UMC-series machines. Requires TCPM option (Setting 356+)."
      },
      {
        controller_family: "siemens",
        property_name: "useMultiAxisFeatures",
        default_value: false,
        notes: "Requires TRAORI transformation orient option."
      },
      {
        controller_family: "heidenhain",
        property_name: "useMultiAxisFeatures",
        default_value: false,
        notes: "Requires 5-axis package. FUNCTION TCPM / M128 activation."
      },
      {
        controller_family: "mazak",
        property_name: "useMultiAxisFeatures",
        default_value: false,
        notes: "5-axis package on Smooth controls."
      },
      {
        controller_family: "okuma",
        property_name: "useMultiAxisFeatures",
        default_value: false,
        notes: "5-axis package on OSP-P300A+."
      }
    ]
  },
  {
    canonical_name: "multi_axis_feeding",
    display_name: "Multi-Axis Feed Mode",
    category: "machine_config",
    group: "multiAxis",
    type: "enum",
    description: "Controls how feedrate is interpreted during multi-axis moves — whether feed applies to tool tip (TCP), inverse time (G93), or machine axes.",
    physics_impact: "Feed mode affects actual tool-tip velocity and chip load consistency during multi-axis cuts. Inverse time ensures consistent tip speed but varies axis speeds.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "multiAxisFeedMode",
        gcodes: ["G93 (inverse time)", "G94 (per minute)", "G95 (per rev)"],
        values: [
          { title: "Inverse Time (G93)", id: "inverseTime" },
          { title: "Per Minute (G94)", id: "perMinute" }
        ],
        default_value: "inverseTime",
        notes: "G93 required for simultaneous 5-axis when TCP not active. G94 can be used with TCP active."
      },
      {
        controller_family: "haas",
        property_name: "multiAxisFeedMode",
        gcodes: ["G93 (inverse time)", "G94 (feed per min)"],
        values: [
          { title: "Inverse Time (G93)", id: "inverseTime" },
          { title: "Per Minute (G94)", id: "perMinute" }
        ],
        default_value: "inverseTime",
        notes: "Haas requires G93 for 5-axis simultaneous unless DWO/TCPM active."
      },
      {
        controller_family: "siemens",
        property_name: "multiAxisFeedMode",
        gcodes: ["FGROUP() (feed group)", "FGREF (feed reference)"],
        values: [
          { title: "Tool Center Point (FGROUP)", id: "tcp" },
          { title: "Inverse Time", id: "inverseTime" }
        ],
        default_value: "tcp",
        notes: "Siemens FGROUP defines which axes contribute to feed calculation. FGREF for reference length. More flexible than G93/G94."
      },
      {
        controller_family: "heidenhain",
        property_name: "multiAxisFeedMode",
        values: [
          { title: "Tool Center Point", id: "tcp" },
          { title: "Contour Feed", id: "contourFeed" }
        ],
        default_value: "tcp",
        notes: "Heidenhain FUNCTION TCPM handles feed automatically at TCP. No need for inverse time in most cases."
      },
      {
        controller_family: "mazak",
        property_name: "multiAxisFeedMode",
        gcodes: ["G93 (inverse time)", "G94 (per minute)"],
        values: [
          { title: "Inverse Time (G93)", id: "inverseTime" },
          { title: "Per Minute (G94)", id: "perMinute" }
        ],
        default_value: "inverseTime",
        notes: "Fanuc-compatible feed modes."
      },
      {
        controller_family: "okuma",
        property_name: "multiAxisFeedMode",
        gcodes: ["G93", "G94"],
        values: [
          { title: "Inverse Time (G93)", id: "inverseTime" },
          { title: "Per Minute (G94)", id: "perMinute" }
        ],
        default_value: "inverseTime",
        notes: "Standard G93/G94 on OSP."
      }
    ]
  },
  {
    canonical_name: "ssv_enabled",
    display_name: "Spindle Speed Variation (SSV)",
    category: "purchase_dependent",
    purchase_option: "Spindle Speed Variation (SSV)",
    group: "preferences",
    type: "boolean",
    description: "Enables automatic spindle speed oscillation to disrupt chatter harmonics. The spindle varies RPM within a programmed band around the target speed.",
    physics_impact: "Shifts excitation frequency to avoid stability lobe boundaries. Reduces chatter amplitude by 60-80%. Enables heavier cuts in previously unstable conditions. Directly affects vibration model.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useSSV",
        gcodes: ["G96.1 (SSV for turning)"],
        default_value: false,
        notes: "Limited SSV support on Fanuc. Primarily for turning (G96.1). Milling SSV via macro programs."
      },
      {
        controller_family: "haas",
        property_name: "useSSV",
        gcodes: ["Setting 191 (SSV speed variation %)", "Setting 192 (SSV rate Hz)"],
        default_value: false,
        notes: "Haas SSV via settings. Not G-code programmable directly. Typical variation 5-10% at 2-5 Hz."
      },
      {
        controller_family: "siemens",
        property_name: "useSSV",
        gcodes: ["CYCLE795 (SSV cycle)"],
        default_value: false,
        notes: "CYCLE795 on 840D sl / SINUMERIK ONE. Programmable amplitude and frequency."
      },
      {
        controller_family: "mazak",
        property_name: "useSSV",
        default_value: false,
        notes: "SmoothAi includes AI-based vibration suppression (MAZATROL SMOOTH Ai). Not traditional SSV."
      },
      {
        controller_family: "okuma",
        property_name: "useSSV",
        mcodes: ["M38 (SSV on)", "M39 (SSV off)"],
        default_value: false,
        notes: "Okuma Machining Navi includes SSV functionality. M38/M39 activation on P300+."
      }
    ]
  },
  {
    canonical_name: "program_comment_header",
    display_name: "Program Header Comments",
    category: "always_available",
    group: "configuration",
    type: "boolean",
    description: "Generates a program header with job information, tool list, setup notes, and timestamp at the beginning of the G-code file.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "writeProgramHeader",
        default_value: true,
        notes: "Header as parenthetical comments. Includes O-number, date, tool list."
      },
      {
        controller_family: "haas",
        property_name: "writeProgramHeader",
        default_value: true,
        notes: "Header with program name, tool list, estimated cycle time."
      },
      {
        controller_family: "siemens",
        property_name: "writeProgramHeader",
        default_value: true,
        notes: "Header with semicolon comments. Program name in first line."
      },
      {
        controller_family: "heidenhain",
        property_name: "writeProgramHeader",
        default_value: true,
        notes: "BEGIN PGM header with tool list and operation summary."
      },
      {
        controller_family: "mazak",
        property_name: "writeProgramHeader",
        default_value: true,
        notes: "Header comments in EIA mode."
      },
      {
        controller_family: "okuma",
        property_name: "writeProgramHeader",
        default_value: true,
        notes: "Header comments on OSP."
      }
    ]
  },
  {
    canonical_name: "corner_rounding",
    display_name: "Corner Rounding Tolerance",
    category: "purchase_dependent",
    purchase_option: "HSM Package",
    group: "preferences",
    type: "spatial",
    description: "Sets the allowable corner rounding distance. The control rounds sharp corners within this tolerance to maintain feedrate. Larger values = faster cycle, more rounding.",
    physics_impact: "Controls velocity through direction changes. Larger rounding tolerance maintains higher feedrate but deviates from programmed path. Affects geometric accuracy and cycle time.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "cornerRoundingTolerance",
        gcodes: ["G64 P<tol> Q<corner_tol>"],
        default_value: 0.0,
        notes: "G64 Q parameter sets corner rounding tolerance independently from contouring tolerance P."
      },
      {
        controller_family: "haas",
        property_name: "cornerRoundingTolerance",
        gcodes: ["G187 P<level> E<tolerance>"],
        default_value: 0.0,
        notes: "Haas G187 E parameter controls both smoothing tolerance and corner behavior."
      },
      {
        controller_family: "siemens",
        property_name: "cornerRoundingTolerance",
        gcodes: ["G642 (corner rounding)", "RNDM (rounding modal)"],
        default_value: 0.0,
        notes: "G642 with tolerance from CYCLE832 $MA_PATH_TRANS_CORNER_TOL. RNDM for explicit corner rounding radius."
      },
      {
        controller_family: "heidenhain",
        property_name: "cornerRoundingTolerance",
        gcodes: ["M90 (corner rounding mode)"],
        mcodes: ["M90"],
        default_value: 0.0,
        notes: "M90 activates corner rounding mode. Combined with CYCLE32 tolerance. TNC 640 Dynamic modes include automatic corner management."
      },
      {
        controller_family: "mazak",
        property_name: "cornerRoundingTolerance",
        default_value: 0.0,
        notes: "Managed by G05.1 smoothing on Smooth controls."
      },
      {
        controller_family: "okuma",
        property_name: "cornerRoundingTolerance",
        default_value: 0.0,
        notes: "Managed by G08 smoothing mode."
      }
    ]
  },
  {
    canonical_name: "home_position",
    display_name: "Machine Home Position Override",
    category: "machine_config",
    group: "homePositions",
    type: "spatial",
    description: "Overrides the default machine home position coordinates used for safe retract and program start/end positioning. Machine-specific based on travel limits.",
    physics_impact: "No cutting physics impact. Affects collision avoidance calculations and time-to-first-cut estimation. Wrong home position can cause crash on tool change.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "homePositionX",
        gcodes: ["G28 / G53"],
        default_value: 0,
        notes: "X/Y/Z home position. Used with G28 intermediate point or G53 absolute. Machine parameter 1240-1242."
      },
      {
        controller_family: "haas",
        property_name: "homePositionX",
        gcodes: ["G28 / G53"],
        default_value: 0,
        notes: "Haas uses Settings 142-144 for home position. G28 returns through intermediate, G53 goes direct."
      },
      {
        controller_family: "siemens",
        property_name: "homePositionX",
        gcodes: ["G75 (reference point)", "SUPA"],
        default_value: 0,
        notes: "Machine data MD30600 for reference point positions. SUPA for machine coordinate moves."
      },
      {
        controller_family: "heidenhain",
        property_name: "homePositionX",
        gcodes: ["M91 (machine datum)"],
        default_value: 0,
        notes: "M91 moves to machine datum. Positions defined in machine parameters."
      },
      {
        controller_family: "mazak",
        property_name: "homePositionX",
        gcodes: ["G28"],
        default_value: 0,
        notes: "Home position defined in machine parameters."
      },
      {
        controller_family: "okuma",
        property_name: "homePositionX",
        gcodes: ["G28"],
        default_value: 0,
        notes: "Reference point positions in OSP parameters."
      }
    ]
  },
  {
    canonical_name: "rigid_tapping",
    display_name: "Rigid Tapping Mode",
    category: "purchase_dependent",
    purchase_option: "Rigid Tapping",
    group: "preferences",
    type: "boolean",
    description: "Enables synchronized rigid tapping where spindle and Z-axis are electronically coupled. Eliminates need for tension/compression tap holders.",
    physics_impact: "Ensures thread depth accuracy and consistency. Affects torque calculations for tapping. Enables higher tapping speeds. Reduces tap breakage risk.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useRigidTapping",
        gcodes: ["G84 (rigid tap)", "M29 (rigid mode select)"],
        default_value: true,
        notes: "G84 in rigid mode (M29 prefix or parameter setting). G84.2/G84.3 for peck rigid tap on 30i."
      },
      {
        controller_family: "haas",
        property_name: "useRigidTapping",
        gcodes: ["G84 (rigid tap)"],
        default_value: true,
        notes: "Haas rigid tapping standard on all current models. Setting 130 for rigid tap pullout speed."
      },
      {
        controller_family: "siemens",
        property_name: "useRigidTapping",
        gcodes: ["CYCLE84 (tapping cycle)"],
        default_value: true,
        notes: "CYCLE84 with rigid tap mode. Synchronized spindle/axis. SPOS for spindle orient."
      },
      {
        controller_family: "heidenhain",
        property_name: "useRigidTapping",
        gcodes: ["CYCL DEF 206 (tapping)", "CYCL DEF 207 (rigid tap)"],
        default_value: true,
        notes: "CYCL DEF 207 for rigid tapping on TNC controls. Requires spindle encoder."
      },
      {
        controller_family: "mazak",
        property_name: "useRigidTapping",
        gcodes: ["G84 (rigid tap)"],
        default_value: true,
        notes: "Standard rigid tapping on all Smooth controls."
      },
      {
        controller_family: "okuma",
        property_name: "useRigidTapping",
        gcodes: ["G84 (rigid tap)"],
        default_value: true,
        notes: "Rigid tapping standard on OSP-P200+."
      }
    ]
  },
  {
    canonical_name: "chip_transport",
    display_name: "Chip Conveyor Control",
    category: "machine_config",
    group: "preferences",
    type: "boolean",
    description: "Enables G-code control of the chip conveyor. Allows automatic start/stop and reverse for chip management between operations.",
    physics_impact: "Manages chip accumulation that affects coolant flow, re-cutting, and workholding. Indirect impact on surface finish and tool life through chip management.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "useChipConveyor",
        mcodes: ["M31 (conveyor fwd)", "M32 (conveyor rev)", "M33 (stop)"],
        default_value: false,
        notes: "Machine-builder-specific M-codes. M31/M32/M33 common convention."
      },
      {
        controller_family: "haas",
        property_name: "useChipConveyor",
        mcodes: ["M31 (chip fwd)", "M33 (chip stop)", "M64 (auger on)", "M65 (auger off)"],
        default_value: false,
        notes: "Haas chip auger M64/M65. Chip conveyor M31/M33. Available on most VMC/HMC models."
      },
      {
        controller_family: "siemens",
        property_name: "useChipConveyor",
        mcodes: ["M31", "M32", "M33"],
        default_value: false,
        notes: "Machine-builder-specific. Typically M31/M32/M33."
      },
      {
        controller_family: "mazak",
        property_name: "useChipConveyor",
        mcodes: ["M31", "M33"],
        default_value: false,
        notes: "Standard chip conveyor control on production machines."
      },
      {
        controller_family: "okuma",
        property_name: "useChipConveyor",
        mcodes: ["M31", "M33"],
        default_value: false,
        notes: "Chip conveyor control on OSP."
      }
    ]
  },
  {
    canonical_name: "use_3d_arcs",
    display_name: "3D Circular Interpolation",
    category: "machine_config",
    group: "preferences",
    type: "boolean",
    description: "Enables 3D circular interpolation where arc planes are not limited to XY/XZ/YZ but can be in any arbitrary plane. Not all controllers support this.",
    physics_impact: "Enables smoother toolpaths on 3D surfaces. Reduces linearization. Affects surface finish prediction on non-planar surfaces.",
    controller_variants: [
      {
        controller_family: "fanuc",
        property_name: "allow3DArcs",
        gcodes: ["G02/G03 with I/J/K in 3D"],
        default_value: false,
        notes: "Limited 3D arc support on Fanuc. Most posts linearize non-planar arcs."
      },
      {
        controller_family: "haas",
        property_name: "allow3DArcs",
        default_value: false,
        notes: "Haas does not support true 3D arcs. Non-planar arcs must be linearized."
      },
      {
        controller_family: "siemens",
        property_name: "allow3DArcs",
        gcodes: ["G02/G03 with CIP (circle in plane)"],
        default_value: false,
        notes: "Siemens CIP (Circle In Plane) enables 3D arcs via 3 points. 840D sl and SINUMERIK ONE."
      },
      {
        controller_family: "heidenhain",
        property_name: "allow3DArcs",
        default_value: false,
        notes: "Heidenhain supports 3D arcs via path commands on TNC 640/TNC7."
      },
      {
        controller_family: "mazak",
        property_name: "allow3DArcs",
        default_value: false,
        notes: "Limited 3D arc support. Most posts linearize."
      },
      {
        controller_family: "okuma",
        property_name: "allow3DArcs",
        default_value: false,
        notes: "Limited 3D arc support on OSP."
      }
    ]
  }
];

// ============================================================================
// NORMALIZATION MAP — maps raw CPS property names to canonical names
// ============================================================================

const PROPERTY_NORMALIZATION_MAP: Record<string, string> = {
  // HSM Smoothing variants
  "useSmoothing": "hsm_smoothing",
  "useSmoothingMode": "hsm_smoothing",
  "smoothingMode": "hsm_smoothing",
  "highSpeedMode": "hsm_smoothing",
  "useHighSpeedMode": "hsm_smoothing",
  "hsmMode": "hsm_smoothing",

  // TCP/RTCP variants
  "useTCP": "tcp_rtcp",
  "useTCPM": "tcp_rtcp",
  "useRTCP": "tcp_rtcp",
  "useTiltedWorkplane": "tcp_rtcp",
  "use5AxisTCP": "tcp_rtcp",
  "useDWO": "tcp_rtcp",

  // Safe retract
  "safePositionMethod": "safe_retract",
  "safeRetractMethod": "safe_retract",
  "retractMethod": "safe_retract",
  "safeRetract": "safe_retract",

  // Work offsets
  "workOffset": "work_offsets",
  "workCoordinateSystem": "work_offsets",
  "fixtureOffset": "work_offsets",

  // Sequence numbers
  "showSequenceNumbers": "sequence_numbers",
  "useSequenceNumbers": "sequence_numbers",
  "sequenceNumbers": "sequence_numbers",
  "lineNumbers": "sequence_numbers",

  // Preload tool
  "preloadTool": "preload_tool",
  "usePreloadTool": "preload_tool",
  "toolPreload": "preload_tool",

  // Optional stop
  "optionalStop": "optional_stop",
  "useOptionalStop": "optional_stop",

  // Separate words
  "separateWordsWithSpace": "separate_words",
  "useSpaces": "separate_words",

  // Show notes
  "showNotes": "show_notes",
  "writeNotes": "show_notes",
  "useNotes": "show_notes",
  "showComments": "show_notes",

  // Radius arcs
  "useRadius": "use_radius_arcs",
  "useRadiusArcs": "use_radius_arcs",
  "arcRadius": "use_radius_arcs",

  // Tool as name
  "toolAsName": "tool_as_name",
  "useToolName": "tool_as_name",
  "toolByName": "tool_as_name",

  // TSC
  "useTSC": "through_spindle_coolant",
  "throughSpindleCoolant": "through_spindle_coolant",
  "useCoolantThroughSpindle": "through_spindle_coolant",

  // Probing
  "useProbing": "probing",
  "probingEnabled": "probing",
  "useInspection": "probing",

  // Tolerance
  "tolerance": "tolerance_control",
  "contourTolerance": "tolerance_control",
  "chordalTolerance": "tolerance_control",
  "smoothingTolerance": "tolerance_control",

  // Canned cycles
  "useCycles": "use_canned_cycles",
  "useCannedCycles": "use_canned_cycles",
  "cannedCycles": "use_canned_cycles",

  // Multi-axis features
  "useMultiAxisFeatures": "use_multi_axis_features",
  "multiAxisEnabled": "use_multi_axis_features",

  // Multi-axis feed mode
  "multiAxisFeedMode": "multi_axis_feeding",
  "feedMode5Axis": "multi_axis_feeding",
  "fiveAxisFeedMode": "multi_axis_feeding",

  // SSV
  "useSSV": "ssv_enabled",
  "ssvEnabled": "ssv_enabled",
  "spindleSpeedVariation": "ssv_enabled",

  // Program header
  "writeProgramHeader": "program_comment_header",
  "programHeader": "program_comment_header",
  "showHeader": "program_comment_header",

  // Corner rounding
  "cornerRoundingTolerance": "corner_rounding",
  "cornerRounding": "corner_rounding",
  "useCornerRounding": "corner_rounding",

  // Home position
  "homePositionX": "home_position",
  "homePositionY": "home_position",
  "homePositionZ": "home_position",
  "homePosition": "home_position",

  // Rigid tapping
  "useRigidTapping": "rigid_tapping",
  "rigidTapping": "rigid_tapping",

  // Chip transport
  "useChipConveyor": "chip_transport",
  "chipConveyor": "chip_transport",

  // 3D arcs
  "allow3DArcs": "use_3d_arcs",
  "use3DArcs": "use_3d_arcs",
  "allow3dArcs": "use_3d_arcs"
};

// ============================================================================
// CONTROLLER FAMILY DETECTION
// ============================================================================

/** Maps CPS file name patterns to controller families. */
const CPS_FAMILY_PATTERNS: Array<{ pattern: RegExp; family: string }> = [
  { pattern: /haas/i, family: "haas" },
  { pattern: /siemens|sinumerik|840d|828d/i, family: "siemens" },
  { pattern: /heidenhain|heid|tnc|itnc/i, family: "heidenhain" },
  { pattern: /mazak|mazatrol|smooth/i, family: "mazak" },
  { pattern: /okuma|osp/i, family: "okuma" },
  { pattern: /brother/i, family: "fanuc" },
  { pattern: /robodrill/i, family: "fanuc" },
  { pattern: /doosan/i, family: "fanuc" },
  { pattern: /makino/i, family: "fanuc" },
  { pattern: /fadal/i, family: "fanuc" },
  { pattern: /kitamura/i, family: "fanuc" },
  { pattern: /nakamura/i, family: "fanuc" },
  { pattern: /hwacheon/i, family: "fanuc" },
  { pattern: /hyundai|wia/i, family: "fanuc" },
  { pattern: /toshiba/i, family: "fanuc" },
  { pattern: /datron/i, family: "datron" },
  { pattern: /fidia/i, family: "fidia" },
  { pattern: /grbl/i, family: "grbl" },
  { pattern: /milltronics/i, family: "milltronics" },
  { pattern: /tormach|pathpilot/i, family: "tormach" },
  { pattern: /centroid/i, family: "centroid" },
  { pattern: /fanuc/i, family: "fanuc" },  // last: catch-all for generic fanuc
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class PostPropertyTaxonomyEngineImpl {

  // ── build_taxonomy ────────────────────────────────────────────────────
  /**
   * Builds the complete property taxonomy from canonical property database,
   * controller dialect mappings, and purchase option definitions.
   *
   * Consolidates U01-U04 into a single taxonomy structure.
   */
  buildTaxonomy(): PropertyTaxonomy {
    const canonicalMap = new Map<string, CanonicalProperty>();
    for (const prop of CANONICAL_PROPERTIES) {
      canonicalMap.set(prop.canonical_name, prop);
    }

    // Count unique raw property names across all variants
    const uniqueRawNames = new Set<string>();
    for (const prop of CANONICAL_PROPERTIES) {
      for (const variant of prop.controller_variants) {
        uniqueRawNames.add(`${variant.controller_family}:${variant.property_name}`);
      }
    }

    // Also count normalization map entries as unique properties
    for (const rawName of Object.keys(PROPERTY_NORMALIZATION_MAP)) {
      uniqueRawNames.add(`raw:${rawName}`);
    }

    return {
      canonical_properties: [...CANONICAL_PROPERTIES],
      controller_dialects: [...CONTROLLER_DIALECTS],
      purchase_options: [...PURCHASE_OPTIONS],
      total_unique_properties: uniqueRawNames.size,
      total_canonical_groups: CANONICAL_PROPERTIES.length
    };
  }

  // ── classify_property ─────────────────────────────────────────────────
  /**
   * Classifies a raw CPS property name into its canonical group with
   * availability category and optional purchase dependency.
   *
   * @param propertyName - Raw property name from CPS file (e.g. "useSmoothing")
   * @param cpsFileName - Optional CPS filename for controller family detection
   */
  classifyProperty(propertyName: string, cpsFileName?: string): PropertyClassification {
    // 1. Look up canonical name from normalization map
    const canonicalName = PROPERTY_NORMALIZATION_MAP[propertyName];

    if (!canonicalName) {
      // Try fuzzy match — check if any key is a substring
      const lowerProp = propertyName.toLowerCase();
      for (const [key, value] of Object.entries(PROPERTY_NORMALIZATION_MAP)) {
        if (key.toLowerCase() === lowerProp) {
          return this.buildClassification(propertyName, value, cpsFileName, 0.9, "Case-insensitive match");
        }
      }

      return {
        property_name: propertyName,
        canonical_name: "unknown",
        category: "always_available",
        controller_family: cpsFileName ? this.detectFamily(cpsFileName) : "unknown",
        confidence: 0,
        reasoning: `Property "${propertyName}" not found in normalization map. May be a controller-specific or CAM-specific property not yet cataloged.`
      };
    }

    return this.buildClassification(propertyName, canonicalName, cpsFileName, 1.0, "Exact match in normalization map");
  }

  /**
   * Builds a classification result from a matched canonical name.
   */
  private buildClassification(
    propertyName: string,
    canonicalName: string,
    cpsFileName: string | undefined,
    confidence: number,
    matchType: string
  ): PropertyClassification {
    const canonical = CANONICAL_PROPERTIES.find(p => p.canonical_name === canonicalName);
    const family = cpsFileName ? this.detectFamily(cpsFileName) : "unknown";

    if (!canonical) {
      return {
        property_name: propertyName,
        canonical_name: canonicalName,
        category: "always_available",
        controller_family: family,
        confidence: confidence * 0.5,
        reasoning: `${matchType}. Canonical name "${canonicalName}" found in map but no full definition available.`
      };
    }

    return {
      property_name: propertyName,
      canonical_name: canonicalName,
      category: canonical.category,
      purchase_option: canonical.purchase_option,
      controller_family: family,
      confidence,
      reasoning: `${matchType}. "${propertyName}" → "${canonical.display_name}" (${canonical.category}${canonical.purchase_option ? `, requires ${canonical.purchase_option}` : ""}).`
    };
  }

  // ── map_dialect ───────────────────────────────────────────────────────
  /**
   * Maps a controller name to its dialect family and provides property
   * translations for all canonical properties.
   *
   * @param controllerName - Controller name, brand, or CPS filename
   */
  mapDialect(controllerName: string): DialectMappingResult | null {
    // Guard: an empty string would match every dialect via .includes("") -- return null
    if (!controllerName || controllerName.trim().length === 0) {
      return null;
    }
    const family = this.detectFamily(controllerName);
    const dialect = CONTROLLER_DIALECTS.find(
      d => d.family === family ||
           d.variants.some(v => v.toLowerCase().includes(controllerName.toLowerCase())) ||
           d.derived_controllers.some(dc => dc.toLowerCase().includes(controllerName.toLowerCase()))
    );

    if (!dialect) {
      return null;
    }

    // Build property translations for this family
    const translations: DialectMappingResult["property_translation"] = [];
    for (const prop of CANONICAL_PROPERTIES) {
      const variant = prop.controller_variants.find(v => v.controller_family === family);
      if (variant) {
        translations.push({
          canonical: prop.canonical_name,
          this_controller: variant.property_name,
          gcodes: [...(variant.gcodes || []), ...(variant.mcodes || [])]
        });
      }
    }

    // Find related families (families that share the same dialect base)
    const relatedFamilies: string[] = [];
    if (family === "fanuc" || dialect.derived_controllers.length > 0) {
      // Fanuc-derived families
      for (const d of CONTROLLER_DIALECTS) {
        if (d.family !== family) {
          // Check if this dialect's derived controllers overlap with Fanuc
          const fanucDialect = CONTROLLER_DIALECTS.find(fd => fd.family === "fanuc");
          if (fanucDialect && fanucDialect.derived_controllers.some(
            dc => d.family.toLowerCase() === dc.toLowerCase() ||
                  d.derived_controllers.some(ddc => fanucDialect.derived_controllers.includes(ddc))
          )) {
            relatedFamilies.push(d.family);
          }
        }
      }
    }

    return {
      query_controller: controllerName,
      family: dialect.family,
      dialect,
      related_families: relatedFamilies,
      property_translation: translations
    };
  }

  // ── list_purchase_options ─────────────────────────────────────────────
  /**
   * Lists all purchase options with their enabled properties and affected G-codes.
   *
   * @param manufacturer - Optional filter by manufacturer name
   */
  listPurchaseOptions(manufacturer?: string): PurchaseOption[] {
    if (!manufacturer) {
      return [...PURCHASE_OPTIONS];
    }

    const lower = manufacturer.toLowerCase();
    return PURCHASE_OPTIONS.filter(
      opt => opt.manufacturers.some(m => m.toLowerCase().includes(lower))
    );
  }

  // ── getCanonicalProperty ──────────────────────────────────────────────
  /**
   * Gets full canonical property definition by canonical name.
   */
  getCanonicalProperty(canonicalName: string): CanonicalProperty | null {
    return CANONICAL_PROPERTIES.find(p => p.canonical_name === canonicalName) || null;
  }

  // ── getControllerDialect ──────────────────────────────────────────────
  /**
   * Gets controller dialect definition by family name.
   */
  getControllerDialect(family: string): ControllerDialect | null {
    const lower = family.toLowerCase();
    return CONTROLLER_DIALECTS.find(d => d.family.toLowerCase() === lower) || null;
  }

  // ── getPropertiesByCategory ───────────────────────────────────────────
  /**
   * Returns canonical properties filtered by availability category.
   */
  getPropertiesByCategory(category: CanonicalProperty["category"]): CanonicalProperty[] {
    return CANONICAL_PROPERTIES.filter(p => p.category === category);
  }

  // ── getPropertiesByGroup ──────────────────────────────────────────────
  /**
   * Returns canonical properties filtered by CPS group.
   */
  getPropertiesByGroup(group: string): CanonicalProperty[] {
    return CANONICAL_PROPERTIES.filter(p => p.group === group);
  }

  // ── getVariantForFamily ───────────────────────────────────────────────
  /**
   * Gets the controller-specific variant of a canonical property.
   */
  getVariantForFamily(canonicalName: string, family: string): ControllerVariant | null {
    const prop = this.getCanonicalProperty(canonicalName);
    if (!prop) return null;
    return prop.controller_variants.find(v => v.controller_family === family) || null;
  }

  // ── translateProperty ─────────────────────────────────────────────────
  /**
   * Translates a property from one controller family to another.
   * Returns the equivalent property name, G-codes, and any differences.
   */
  translateProperty(
    canonicalName: string,
    fromFamily: string,
    toFamily: string
  ): {
    from: ControllerVariant;
    to: ControllerVariant;
    differences: string[];
  } | null {
    const prop = this.getCanonicalProperty(canonicalName);
    if (!prop) return null;

    const from = prop.controller_variants.find(v => v.controller_family === fromFamily);
    const to = prop.controller_variants.find(v => v.controller_family === toFamily);
    if (!from || !to) return null;

    const differences: string[] = [];

    // Compare G-codes
    const fromCodes = [...(from.gcodes || []), ...(from.mcodes || [])].join(", ");
    const toCodes = [...(to.gcodes || []), ...(to.mcodes || [])].join(", ");
    if (fromCodes !== toCodes && fromCodes && toCodes) {
      differences.push(`G/M codes: ${fromCodes} → ${toCodes}`);
    }

    // Compare property names
    if (from.property_name !== to.property_name) {
      differences.push(`Property name: ${from.property_name} → ${to.property_name}`);
    }

    // Compare default values
    if (JSON.stringify(from.default_value) !== JSON.stringify(to.default_value)) {
      differences.push(`Default value: ${JSON.stringify(from.default_value)} → ${JSON.stringify(to.default_value)}`);
    }

    // Compare available values
    if (from.values && to.values) {
      const fromIds = from.values.map(v => v.id).sort().join(",");
      const toIds = to.values.map(v => v.id).sort().join(",");
      if (fromIds !== toIds) {
        differences.push(`Available values differ: [${from.values.map(v => v.title).join(", ")}] vs [${to.values.map(v => v.title).join(", ")}]`);
      }
    }

    // Add notes differences
    if (from.notes && to.notes && from.notes !== to.notes) {
      differences.push(`Implementation: ${from.notes} | vs | ${to.notes}`);
    }

    return { from, to, differences };
  }

  // ── getPurchaseDependentProperties ────────────────────────────────────
  /**
   * Returns all properties that require a purchase option, grouped by option.
   */
  getPurchaseDependentProperties(): Record<string, CanonicalProperty[]> {
    const result: Record<string, CanonicalProperty[]> = {};
    for (const prop of CANONICAL_PROPERTIES) {
      if (prop.category === "purchase_dependent" && prop.purchase_option) {
        if (!result[prop.purchase_option]) {
          result[prop.purchase_option] = [];
        }
        result[prop.purchase_option].push(prop);
      }
    }
    return result;
  }

  // ── buildRawCatalog ───────────────────────────────────────────────────
  /**
   * Builds a master catalog of raw property entries from all known
   * controller variants. This is the U01 PropertyCatalogBuilder output.
   */
  buildRawCatalog(): RawPropertyEntry[] {
    const catalog: RawPropertyEntry[] = [];
    const seen = new Set<string>();

    for (const prop of CANONICAL_PROPERTIES) {
      for (const variant of prop.controller_variants) {
        const key = `${variant.controller_family}:${variant.property_name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        catalog.push({
          property_name: variant.property_name,
          type: prop.type,
          group: prop.group,
          default_value: variant.default_value,
          values: variant.values,
          posts_using: [variant.controller_family],
          count: 1
        });
      }
    }

    return catalog;
  }

  // ── getSummary ────────────────────────────────────────────────────────
  /**
   * Quick stats for the taxonomy.
   */
  getSummary(): {
    totalCanonicalProperties: number;
    totalControllerDialects: number;
    totalPurchaseOptions: number;
    totalControllerVariants: number;
    categoryCounts: Record<string, number>;
    groupCounts: Record<string, number>;
    familiesWithVariants: string[];
  } {
    const categoryCounts: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};
    let totalVariants = 0;

    for (const prop of CANONICAL_PROPERTIES) {
      categoryCounts[prop.category] = (categoryCounts[prop.category] || 0) + 1;
      groupCounts[prop.group] = (groupCounts[prop.group] || 0) + 1;
      totalVariants += prop.controller_variants.length;
    }

    const familySet = new Set<string>();
    for (const prop of CANONICAL_PROPERTIES) {
      for (const v of prop.controller_variants) {
        familySet.add(v.controller_family);
      }
    }
    const familiesWithVariants = Array.from(familySet).sort();

    return {
      totalCanonicalProperties: CANONICAL_PROPERTIES.length,
      totalControllerDialects: CONTROLLER_DIALECTS.length,
      totalPurchaseOptions: PURCHASE_OPTIONS.length,
      totalControllerVariants: totalVariants,
      categoryCounts,
      groupCounts,
      familiesWithVariants
    };
  }

  // ── detectFamily (private) ────────────────────────────────────────────
  /**
   * Detects the controller family from a CPS filename or controller name.
   */
  private detectFamily(name: string): string {
    for (const { pattern, family } of CPS_FAMILY_PATTERNS) {
      if (pattern.test(name)) {
        return family;
      }
    }
    return "other";
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const postPropertyTaxonomyEngine = new PostPropertyTaxonomyEngineImpl();
