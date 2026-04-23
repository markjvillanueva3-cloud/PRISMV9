/**
 * MastercamControllerCatalogEngine - CNC Controller Family Reference for Mastercam
 *
 * Encodes 18 major controller families with 70+ post-processor variants
 * supported by Mastercam 2024/2025.
 *
 * Sources:
 *   - Mastercam Post Processor Library
 *   - Controller Manufacturer Documentation
 *   - Shop Floor Experience (JM Die, production shops)
 *
 * @engine MastercamControllerCatalogEngine
 * @shortcode E1204
 * @dispatcher camDispatcher
 * @actions mastercam_controller_list, mastercam_controller_lookup, mastercam_controller_search, mastercam_controller_dialect, mastercam_controller_stats
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP03
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MastercamControllerFamily {
  /** Controller family ID (e.g., "fanuc", "siemens") */
  id: string;
  /** Display name */
  name: string;
  /** Controller manufacturer */
  manufacturer: string;
  /** Post-processor variants */
  variants: MastercamControllerVariant[];
  /** Supported drilling/canned cycles */
  cycleSupport: string[];
  /** G-code dialect */
  gCodeDialect: string;
  /** Tribal tips for this controller family */
  tribalTips: string[];
}

export interface MastercamControllerVariant {
  /** Post file name or identifier */
  postFile: string;
  /** Description */
  description: string;
  /** Axis count (3, 4, or 5) */
  axisCount: number;
  /** Special capabilities */
  capabilities: string[];
  /** Compatible machines */
  compatibleMachines: string[];
}

export interface MastercamControllerMatch {
  /** The matched controller family */
  family: MastercamControllerFamily;
  /** The matched variant (if specific) */
  variant: MastercamControllerVariant;
  /** Match confidence (0-1) */
  confidence: number;
}

// ============================================================================
// CONTROLLER DATABASE (from Mastercam 2024/2025 Post Library)
// ============================================================================

const CONTROLLER_FAMILIES: MastercamControllerFamily[] = [
  {
    id: "fanuc",
    name: "Fanuc",
    manufacturer: "FANUC Corporation",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
    tribalTips: [
      "G43.4 for 5-axis RTCP on 30i/31i-B5 and newer",
      "AICC-II for high-speed machining above 10m/min",
      "Use G05.1 Q1 for high-speed nano-smoothing",
      "G68.2 tilted work plane simplifies 3+2 programming",
      "Alarm 360 = servo overload, check accel settings",
    ],
    variants: [
      { postFile: "Fanuc 3X Mill.mcpost", description: "Fanuc 3-Axis Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["VMC", "HMC"] },
      { postFile: "Fanuc 4X Mill.mcpost", description: "Fanuc 4-Axis Mill with Rotary", axisCount: 4, capabilities: ["mill", "rotary", "probing"], compatibleMachines: ["VMC", "HMC"] },
      { postFile: "Fanuc 5X Mill.mcpost", description: "Fanuc 5-Axis Mill (Generic)", axisCount: 5, capabilities: ["5axis", "RTCP", "TCPM"], compatibleMachines: ["5-Axis VMC"] },
      { postFile: "Fanuc 31i-B5.mcpost", description: "Fanuc 31i-B5 5-Axis (RTCP)", axisCount: 5, capabilities: ["5axis", "RTCP", "AICC", "nano_smoothing"], compatibleMachines: ["Premium 5-Axis"] },
      { postFile: "Fanuc 30i.mcpost", description: "Fanuc 30i High-End", axisCount: 5, capabilities: ["5axis", "RTCP", "high_speed"], compatibleMachines: ["High-End VMC/HMC"] },
      { postFile: "Fanuc Lathe 2X.mcpost", description: "Fanuc 2-Axis Lathe", axisCount: 2, capabilities: ["turning", "threading"], compatibleMachines: ["CNC Lathe"] },
      { postFile: "Fanuc Mill-Turn.mcpost", description: "Fanuc Mill-Turn", axisCount: 5, capabilities: ["turning", "milling", "live_tooling", "Y-axis"], compatibleMachines: ["Mill-Turn", "Turn-Mill"] },
      { postFile: "Fanuc Wire EDM.mcpost", description: "Fanuc Wire EDM", axisCount: 4, capabilities: ["wire_edm", "taper"], compatibleMachines: ["Wire EDM"] },
    ],
  },
  {
    id: "siemens",
    name: "Siemens SINUMERIK",
    manufacturer: "Siemens AG",
    gCodeDialect: "siemens",
    cycleSupport: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE87", "CYCLE88", "CYCLE89", "CYCLE800", "CYCLE832"],
    tribalTips: [
      "CYCLE832 enables high-speed machining mode",
      "TRAORI required for 5-axis continuous",
      "CYCLE800 for swivel plane (3+2 positioning)",
      "Use COMPRESSOR for smooth toolpath",
      "SOFT key SBL for look-ahead up to 250 blocks",
    ],
    variants: [
      { postFile: "Sinumerik 840D 3X.mcpost", description: "SINUMERIK 840D 3-Axis", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["VMC", "HMC"] },
      { postFile: "Sinumerik 840D 5X.mcpost", description: "SINUMERIK 840D 5-Axis", axisCount: 5, capabilities: ["5axis", "TRAORI", "high_speed"], compatibleMachines: ["5-Axis VMC"] },
      { postFile: "Sinumerik 840D sl.mcpost", description: "SINUMERIK 840D sl (Solution Line)", axisCount: 5, capabilities: ["5axis", "TRAORI", "CYCLE800", "CYCLE832"], compatibleMachines: ["5-Axis Centers"] },
      { postFile: "Sinumerik 828D.mcpost", description: "SINUMERIK 828D Compact", axisCount: 4, capabilities: ["mill", "turning"], compatibleMachines: ["Compact VMC", "Lathe"] },
      { postFile: "Sinumerik One.mcpost", description: "SINUMERIK ONE (Digital Native)", axisCount: 5, capabilities: ["5axis", "digital_twin", "AI_optimization"], compatibleMachines: ["Next-Gen Machines"] },
      { postFile: "Sinumerik Lathe.mcpost", description: "SINUMERIK Lathe", axisCount: 2, capabilities: ["turning", "threading", "grooving"], compatibleMachines: ["CNC Lathe"] },
    ],
  },
  {
    id: "haas",
    name: "Haas",
    manufacturer: "Haas Automation",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G150", "G154"],
    tribalTips: [
      "G187 P1/P2/P3 for smoothing (rough/medium/finish)",
      "G154 P20-99 for additional work coordinates",
      "Setting 85 controls TCPC (5-axis)",
      "Use M109 for through-spindle air blast",
      "G234 enables high-speed tool change",
    ],
    variants: [
      { postFile: "Haas Mill 3X.mcpost", description: "Haas 3-Axis Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["VF Series", "DT Series"] },
      { postFile: "Haas Mill 4X.mcpost", description: "Haas 4-Axis Mill", axisCount: 4, capabilities: ["mill", "rotary", "probing"], compatibleMachines: ["VF with 4th Axis"] },
      { postFile: "Haas UMC 5X.mcpost", description: "Haas UMC 5-Axis", axisCount: 5, capabilities: ["5axis", "TCPC", "dynamic_offsets"], compatibleMachines: ["UMC-500", "UMC-750", "UMC-1000", "UMC-1250"] },
      { postFile: "Haas NGC.mcpost", description: "Haas Next Generation Control", axisCount: 5, capabilities: ["5axis", "visual_programming", "wireless_probing"], compatibleMachines: ["Next Gen Haas"] },
      { postFile: "Haas Lathe ST.mcpost", description: "Haas ST-Series Lathe", axisCount: 2, capabilities: ["turning", "threading"], compatibleMachines: ["ST-10", "ST-20", "ST-30", "ST-40"] },
      { postFile: "Haas DS Lathe.mcpost", description: "Haas DS Dual-Spindle Lathe", axisCount: 2, capabilities: ["turning", "dual_spindle", "bar_feed"], compatibleMachines: ["DS-30"] },
    ],
  },
  {
    id: "heidenhain",
    name: "Heidenhain TNC",
    manufacturer: "DR. JOHANNES HEIDENHAIN GmbH",
    gCodeDialect: "heidenhain",
    cycleSupport: ["CYCL DEF 200", "CYCL DEF 201", "CYCL DEF 202", "CYCL DEF 203", "CYCL DEF 204", "CYCL DEF 205", "CYCL DEF 208", "CYCL DEF 220", "CYCL DEF 247"],
    tribalTips: [
      "PLANE SPATIAL for 3+2 machining",
      "M128/TCPM for tool center point control",
      "AFC (Adaptive Feed Control) optimizes feed in real-time",
      "KinematicsOpt compensates machine geometry errors",
      "Use PATTERN DEF for hole patterns",
    ],
    variants: [
      { postFile: "Heidenhain TNC 640.mcpost", description: "TNC 640 Premium Control", axisCount: 5, capabilities: ["5axis", "TCPM", "AFC", "DCM", "high_speed"], compatibleMachines: ["Hermle", "DMG MORI", "Matsuura"] },
      { postFile: "Heidenhain TNC 320.mcpost", description: "TNC 320 Compact", axisCount: 4, capabilities: ["mill", "rotary", "probing"], compatibleMachines: ["Compact VMC"] },
      { postFile: "Heidenhain TNC 128.mcpost", description: "TNC 128", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["Basic VMC"] },
      { postFile: "Heidenhain TNC7.mcpost", description: "TNC7 Next Generation", axisCount: 5, capabilities: ["5axis", "TCPM", "AI", "touchscreen"], compatibleMachines: ["Latest Generation"] },
    ],
  },
  {
    id: "okuma",
    name: "Okuma OSP",
    manufacturer: "Okuma Corporation",
    gCodeDialect: "okuma",
    cycleSupport: ["G71", "G72", "G73", "G74", "G75", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
    tribalTips: [
      "Thermo-Friendly Concept minimizes thermal drift",
      "Super-NURBS for smooth 5-axis motion",
      "Collision Avoidance System (CAS) prevents crashes",
      "NAVI for conversational programming at control",
      "Use variable VNPG for variable names",
    ],
    variants: [
      { postFile: "Okuma OSP-P300A Mill.mcpost", description: "OSP-P300A 5-Axis Mill", axisCount: 5, capabilities: ["5axis", "NURBS", "collision_avoidance"], compatibleMachines: ["MU-V", "MA-V", "GENOS M"] },
      { postFile: "Okuma OSP-P300M Mill.mcpost", description: "OSP-P300M Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["GENOS M", "MB-V"] },
      { postFile: "Okuma OSP-P300L Lathe.mcpost", description: "OSP-P300L Lathe", axisCount: 2, capabilities: ["turning", "threading", "grooving"], compatibleMachines: ["LB3000", "GENOS L"] },
      { postFile: "Okuma Multus.mcpost", description: "OSP-P300 Multus Mill-Turn", axisCount: 9, capabilities: ["turning", "milling", "5axis", "B-axis"], compatibleMachines: ["Multus B", "Multus U"] },
      { postFile: "Okuma OSP-P200.mcpost", description: "OSP-P200 (Legacy)", axisCount: 3, capabilities: ["mill", "turning"], compatibleMachines: ["Older Okuma"] },
    ],
  },
  {
    id: "mazak",
    name: "Mazak MAZATROL",
    manufacturer: "Yamazaki Mazak Corporation",
    gCodeDialect: "mazak",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G43.4", "G68.2"],
    tribalTips: [
      "MAZATROL SmoothAi uses AI for optimization",
      "Thermal Shield compensates for temperature changes",
      "Voice Advisor provides audio guidance",
      "Intelligent Pocket for automatic corner slowdown",
      "Use EIA/ISO mode for G-code, MAZATROL for conversational",
    ],
    variants: [
      { postFile: "Mazak SmoothX Mill.mcpost", description: "SmoothX 5-Axis Mill", axisCount: 5, capabilities: ["5axis", "RTCP", "AI", "high_speed"], compatibleMachines: ["VARIAXIS i", "INTEGREX e-V"] },
      { postFile: "Mazak SmoothG Mill.mcpost", description: "SmoothG Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["VCN", "VTC"] },
      { postFile: "Mazak SmoothAi.mcpost", description: "SmoothAi (AI-Powered)", axisCount: 5, capabilities: ["5axis", "AI_optimization", "predictive_maintenance"], compatibleMachines: ["Latest Mazak"] },
      { postFile: "Mazak Integrex.mcpost", description: "INTEGREX Mill-Turn", axisCount: 9, capabilities: ["turning", "milling", "5axis", "done_in_one"], compatibleMachines: ["INTEGREX i", "INTEGREX e"] },
      { postFile: "Mazak Lathe.mcpost", description: "Mazak 2-Axis Lathe", axisCount: 2, capabilities: ["turning", "threading"], compatibleMachines: ["Quick Turn", "Nexus"] },
    ],
  },
  {
    id: "hurco",
    name: "Hurco WinMax",
    manufacturer: "Hurco Companies",
    gCodeDialect: "hurco",
    cycleSupport: ["G73", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
    tribalTips: [
      "UltiMotion for smooth 5-axis motion",
      "DXF import at control for quick jobs",
      "Conversational + G-code mix in same program",
      "Use Transform Plane for 3+2 operations",
    ],
    variants: [
      { postFile: "Hurco WinMax Mill.mcpost", description: "Hurco WinMax Mill", axisCount: 5, capabilities: ["5axis", "UltiMotion", "conversational"], compatibleMachines: ["VMX", "DCX", "BX40"] },
      { postFile: "Hurco VMC 3X.mcpost", description: "Hurco 3-Axis VMC", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["VM Series"] },
    ],
  },
  {
    id: "mitsubishi",
    name: "Mitsubishi",
    manufacturer: "Mitsubishi Electric",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G43.4", "G43.5"],
    tribalTips: [
      "SSS (Super Smooth Surface) for superior finish",
      "OMR-FF for high-speed 5-axis motion",
      "M800V series supports 5-axis with RTCP",
      "Vibration suppression reduces chatter automatically",
    ],
    variants: [
      { postFile: "Mitsubishi M800V.mcpost", description: "M800V 5-Axis", axisCount: 5, capabilities: ["5axis", "SSS", "OMR_FF", "vibration_suppression"], compatibleMachines: ["5-Axis VMC"] },
      { postFile: "Mitsubishi M80.mcpost", description: "M80 Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["Standard VMC"] },
      { postFile: "Mitsubishi Wire EDM.mcpost", description: "Mitsubishi Wire EDM", axisCount: 4, capabilities: ["wire_edm", "taper", "auto_thread"], compatibleMachines: ["MV Series", "FA Series"] },
      { postFile: "Mitsubishi EDM.mcpost", description: "Mitsubishi Sinker EDM", axisCount: 3, capabilities: ["sinker_edm", "electrode"], compatibleMachines: ["EA Series"] },
    ],
  },
  {
    id: "dmg_mori",
    name: "DMG MORI CELOS",
    manufacturer: "DMG MORI",
    gCodeDialect: "siemens",
    cycleSupport: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE87", "CYCLE88", "CYCLE89", "CYCLE800", "TRAORI"],
    tribalTips: [
      "CELOS apps for setup optimization",
      "MPC (Machine Protection Control) prevents damage",
      "Integrated simulation before running",
      "Tool and workpiece monitoring built-in",
    ],
    variants: [
      { postFile: "DMG MORI CELOS.mcpost", description: "DMG MORI CELOS (Siemens)", axisCount: 5, capabilities: ["5axis", "CELOS", "simulation", "monitoring"], compatibleMachines: ["DMU", "NMV", "CMX"] },
      { postFile: "DMG MORI Fanuc.mcpost", description: "DMG MORI (Fanuc)", axisCount: 5, capabilities: ["5axis", "RTCP"], compatibleMachines: ["DMU with Fanuc"] },
      { postFile: "DMG MORI NLX.mcpost", description: "DMG MORI NLX Lathe", axisCount: 2, capabilities: ["turning", "Y-axis", "live_tooling"], compatibleMachines: ["NLX Series"] },
      { postFile: "DMG MORI CTX.mcpost", description: "DMG MORI CTX Mill-Turn", axisCount: 5, capabilities: ["turning", "milling", "5axis"], compatibleMachines: ["CTX Series"] },
    ],
  },
  {
    id: "brother",
    name: "Brother CNC",
    manufacturer: "Brother Industries",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G43.4"],
    tribalTips: [
      "Ultra-fast tool change (0.9s chip-to-chip)",
      "Overlap tapping increases productivity",
      "Compact footprint, high spindle speeds to 27k RPM",
    ],
    variants: [
      { postFile: "Brother Speedio.mcpost", description: "Brother Speedio", axisCount: 5, capabilities: ["5axis", "high_speed", "compact"], compatibleMachines: ["S300X", "S500X", "S700X", "R450X", "R650X"] },
      { postFile: "Brother TC-S2D.mcpost", description: "Brother TC-S2D", axisCount: 3, capabilities: ["mill", "tapping_center"], compatibleMachines: ["TC-S2D", "TC-32B"] },
    ],
  },
  {
    id: "makino",
    name: "Makino",
    manufacturer: "Makino Milling Machine Co.",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G43.4"],
    tribalTips: [
      "Super Geometric Intelligence (SGI) for accuracy",
      "Collision Safe Guard standard on many models",
      "MAS-A5 for 5-axis optimization",
      "Active damping reduces vibration",
    ],
    variants: [
      { postFile: "Makino 5X.mcpost", description: "Makino 5-Axis (SGI)", axisCount: 5, capabilities: ["5axis", "SGI", "high_precision"], compatibleMachines: ["a51nx", "a61nx", "D500", "DA300", "V80S"] },
      { postFile: "Makino 3X.mcpost", description: "Makino 3-Axis", axisCount: 3, capabilities: ["mill", "high_speed"], compatibleMachines: ["PS Series", "V-Series"] },
      { postFile: "Makino Wire EDM.mcpost", description: "Makino Wire EDM", axisCount: 4, capabilities: ["wire_edm", "HyperCut"], compatibleMachines: ["U3", "U6", "UP6"] },
      { postFile: "Makino EDM.mcpost", description: "Makino Sinker EDM", axisCount: 3, capabilities: ["sinker_edm", "HQSF"], compatibleMachines: ["EDAF", "EDNC"] },
    ],
  },
  {
    id: "doosan",
    name: "Doosan",
    manufacturer: "DN Solutions (Doosan)",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
    tribalTips: [
      "Available with Fanuc, Siemens, or Heidenhain",
      "Thermal compensation for stable accuracy",
      "MyCNC app for remote monitoring",
    ],
    variants: [
      { postFile: "Doosan DVF 5X.mcpost", description: "Doosan DVF 5-Axis", axisCount: 5, capabilities: ["5axis", "RTCP"], compatibleMachines: ["DVF 5000", "DVF 6500", "DVF 8000"] },
      { postFile: "Doosan DNM.mcpost", description: "Doosan DNM Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["DNM Series", "MYNX Series"] },
      { postFile: "Doosan Puma.mcpost", description: "Doosan Puma Lathe", axisCount: 2, capabilities: ["turning", "threading"], compatibleMachines: ["Puma Series", "Lynx"] },
    ],
  },
  {
    id: "matsuura",
    name: "Matsuura",
    manufacturer: "Matsuura Machinery",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G43.4"],
    tribalTips: [
      "Known for reliability and precision",
      "Available with Fanuc, Siemens, or Heidenhain",
      "MAM72-XXV for automated 5-axis with pallet",
    ],
    variants: [
      { postFile: "Matsuura 5X.mcpost", description: "Matsuura 5-Axis", axisCount: 5, capabilities: ["5axis", "pallet_changer", "automation"], compatibleMachines: ["MAM72-35V", "MAM72-52V", "MAM72-63V", "MX-330", "MX-520"] },
      { postFile: "Matsuura H-Plus.mcpost", description: "Matsuura H-Plus HMC", axisCount: 4, capabilities: ["HMC", "pallet_changer"], compatibleMachines: ["H.Plus Series"] },
    ],
  },
  {
    id: "nakamura",
    name: "Nakamura-Tome",
    manufacturer: "Nakamura-Tome Precision Industry",
    gCodeDialect: "fanuc",
    cycleSupport: ["G71", "G72", "G73", "G74", "G75", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
    tribalTips: [
      "Superimposition for synchronized machining",
      "Known for done-in-one multitasking lathes",
      "NT-Smart control for ease of use",
    ],
    variants: [
      { postFile: "Nakamura WT.mcpost", description: "Nakamura WT Mill-Turn", axisCount: 9, capabilities: ["turning", "milling", "dual_spindle", "done_in_one"], compatibleMachines: ["WT-150", "WT-250", "WT-300"] },
      { postFile: "Nakamura SC.mcpost", description: "Nakamura SC Lathe", axisCount: 2, capabilities: ["turning", "threading"], compatibleMachines: ["SC Series"] },
    ],
  },
  {
    id: "mori_seiki",
    name: "Mori Seiki (Legacy)",
    manufacturer: "DMG MORI (Legacy Mori Seiki)",
    gCodeDialect: "fanuc",
    cycleSupport: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
    tribalTips: [
      "Legacy controllers before DMG MORI merger",
      "MSC-5XX series common on older machines",
      "Standard Fanuc-compatible G-code",
    ],
    variants: [
      { postFile: "Mori Seiki NV.mcpost", description: "Mori Seiki NV Mill", axisCount: 3, capabilities: ["mill", "probing"], compatibleMachines: ["NV Series"] },
      { postFile: "Mori Seiki NL.mcpost", description: "Mori Seiki NL Lathe", axisCount: 2, capabilities: ["turning", "threading"], compatibleMachines: ["NL Series", "SL Series"] },
    ],
  },
  {
    id: "hardinge",
    name: "Hardinge",
    manufacturer: "Hardinge Inc.",
    gCodeDialect: "fanuc",
    cycleSupport: ["G71", "G72", "G73", "G74", "G75", "G76", "G80", "G81", "G82", "G83", "G84", "G85"],
    tribalTips: [
      "Exceptional precision for small parts",
      "Collet-ready spindles standard",
      "Gang-tooling for fast indexing",
    ],
    variants: [
      { postFile: "Hardinge Lathe.mcpost", description: "Hardinge Precision Lathe", axisCount: 2, capabilities: ["turning", "threading", "precision"], compatibleMachines: ["Quest", "Conquest", "Elite"] },
      { postFile: "Hardinge Mill.mcpost", description: "Hardinge Mill", axisCount: 3, capabilities: ["mill"], compatibleMachines: ["VMC Series"] },
    ],
  },
  {
    id: "agie_charmilles",
    name: "AgieCharmilles",
    manufacturer: "GF Machining Solutions",
    gCodeDialect: "fanuc",
    cycleSupport: [],
    tribalTips: [
      "World leader in EDM technology",
      "SMART wire technology for optimal surface finish",
      "IQ technology for process optimization",
    ],
    variants: [
      { postFile: "AgieCharmilles Wire EDM.mcpost", description: "AgieCharmilles Wire EDM", axisCount: 4, capabilities: ["wire_edm", "taper", "SMART_wire"], compatibleMachines: ["CUT E", "CUT P", "CUT S"] },
      { postFile: "AgieCharmilles Sinker.mcpost", description: "AgieCharmilles Sinker EDM", axisCount: 4, capabilities: ["sinker_edm", "iQ_technology"], compatibleMachines: ["FORM E", "FORM P", "FORM S"] },
    ],
  },
  {
    id: "sodick",
    name: "Sodick",
    manufacturer: "Sodick Co., Ltd.",
    gCodeDialect: "sodick",
    cycleSupport: [],
    tribalTips: [
      "Linear motor drives for high accuracy",
      "SPW (Spark Pulse Width) control",
      "Auto-threading with annealing",
      "No wear servo technology",
    ],
    variants: [
      { postFile: "Sodick Wire EDM.mcpost", description: "Sodick Wire EDM", axisCount: 4, capabilities: ["wire_edm", "linear_motor", "SPW"], compatibleMachines: ["VL", "AG", "AL", "ALC"] },
      { postFile: "Sodick Sinker.mcpost", description: "Sodick Sinker EDM", axisCount: 3, capabilities: ["sinker_edm", "linear_motor"], compatibleMachines: ["AG", "AQ"] },
    ],
  },
];

// ============================================================================
// G-CODE DIALECT FEATURES
// ============================================================================

const DIALECT_FEATURES: Record<string, {
  programStart: string;
  programEnd: string;
  absoluteMode: string;
  incrementalMode: string;
  toolChange: string;
  coolantOn: string;
  coolantOff: string;
  spindleCW: string;
  spindleCCW: string;
  spindleStop: string;
  safeRetract: string;
  workOffset: string;
}> = {
  fanuc: {
    programStart: "%\nO{n}",
    programEnd: "M30\n%",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 G91 Z0",
    workOffset: "G54-G59, G54.1 P1-P48",
  },
  siemens: {
    programStart: "; SINUMERIK\nN10",
    programEnd: "M30",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} D1\nM06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "SUPA G0 Z=IC(0)",
    workOffset: "G54-G57, G505-G599",
  },
  heidenhain: {
    programStart: "BEGIN PGM {name} MM",
    programEnd: "END PGM {name} MM",
    absoluteMode: "(absolute by default)",
    incrementalMode: "INC",
    toolChange: "TOOL CALL {n} Z S{rpm}",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "(set in TOOL CALL)",
    spindleCCW: "M04",
    spindleStop: "M05",
    safeRetract: "L Z+0 R0 FMAX M91",
    workOffset: "CYCL DEF 7.0/7.1",
  },
  mazak: {
    programStart: "%\nO{n}",
    programEnd: "M30\n%",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 G91 Z0",
    workOffset: "G54-G59, G54.1 P1-P300",
  },
  okuma: {
    programStart: "O{n}",
    programEnd: "M02",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n}01 M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 Z0",
    workOffset: "G15 H1-H48",
  },
  hurco: {
    programStart: "%\n{name}",
    programEnd: "M30\n%",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 G91 Z0",
    workOffset: "G54-G59",
  },
  sodick: {
    programStart: "%\nO{n}",
    programEnd: "M30",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "N/A",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "N/A",
    spindleCCW: "N/A",
    spindleStop: "N/A",
    safeRetract: "G28 Z0",
    workOffset: "G54-G59",
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class MastercamControllerCatalogEngine {
  /**
   * List all controller families with summary info.
   * @returns Array of controller family summaries
   */
  listFamilies(): Array<{
    id: string;
    name: string;
    manufacturer: string;
    variantCount: number;
    dialect: string;
  }> {
    return CONTROLLER_FAMILIES.map((f) => ({
      id: f.id,
      name: f.name,
      manufacturer: f.manufacturer,
      variantCount: f.variants.length,
      dialect: f.gCodeDialect,
    }));
  }

  /**
   * Get a controller family by ID.
   * @param id - The controller family ID (e.g., "fanuc", "siemens")
   * @returns The controller family or null if not found
   */
  getFamily(id: string): MastercamControllerFamily | null {
    return CONTROLLER_FAMILIES.find((f) => f.id === id) ?? null;
  }

  /**
   * Search controllers by name, manufacturer, or capability.
   * @param query - Search query string
   * @returns Array of matching controllers with confidence scores
   */
  search(query: string): MastercamControllerMatch[] {
    const q = query.toLowerCase();
    const results: MastercamControllerMatch[] = [];

    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        const score =
          (family.name.toLowerCase().includes(q) ? 0.4 : 0) +
          (family.manufacturer.toLowerCase().includes(q) ? 0.3 : 0) +
          (variant.description.toLowerCase().includes(q) ? 0.3 : 0) +
          (variant.capabilities.some((c) => c.toLowerCase().includes(q)) ? 0.2 : 0) +
          (variant.compatibleMachines.some((m) => m.toLowerCase().includes(q)) ? 0.2 : 0);

        if (score > 0) {
          results.push({ family, variant, confidence: Math.min(score, 1) });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find controllers by axis count.
   * @param axes - Minimum axis count (2, 3, 4, or 5)
   * @returns Array of matching controllers
   */
  byAxisCount(axes: number): MastercamControllerMatch[] {
    const results: MastercamControllerMatch[] = [];

    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        if (variant.axisCount >= axes) {
          results.push({
            family,
            variant,
            confidence: variant.axisCount === axes ? 1 : 0.8,
          });
        }
      }
    }

    return results;
  }

  /**
   * Find controllers with a specific capability.
   * @param capability - The capability to search for (e.g., "5axis", "wire_edm")
   * @returns Array of matching controllers
   */
  byCapability(capability: string): MastercamControllerMatch[] {
    const cap = capability.toLowerCase();
    const results: MastercamControllerMatch[] = [];

    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        if (variant.capabilities.some((c) => c.toLowerCase().includes(cap))) {
          results.push({ family, variant, confidence: 0.9 });
        }
      }
    }

    return results;
  }

  /**
   * Get G-code dialect features for a controller family.
   * @param familyId - The controller family ID
   * @returns The dialect features or null if not found
   */
  getDialect(familyId: string): (typeof DIALECT_FEATURES)[string] | null {
    const family = this.getFamily(familyId);
    if (!family) return null;
    return DIALECT_FEATURES[family.gCodeDialect] ?? DIALECT_FEATURES["fanuc"];
  }

  /**
   * Get tribal tips for a specific controller family.
   * @param familyId - The controller family ID
   * @returns Array of tribal tips or empty array if family not found
   */
  getTribalTips(familyId: string): string[] {
    const family = this.getFamily(familyId);
    return family?.tribalTips ?? [];
  }

  /**
   * Find the best controller match for a machine name.
   * @param machineName - The machine name to match
   * @returns The best matching controller or null
   */
  findForMachine(machineName: string): MastercamControllerMatch | null {
    const name = machineName.toLowerCase();
    let bestMatch: MastercamControllerMatch | null = null;

    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        for (const machine of variant.compatibleMachines) {
          if (name.includes(machine.toLowerCase()) || machine.toLowerCase().includes(name)) {
            const confidence = name === machine.toLowerCase() ? 1 : 0.85;
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { family, variant, confidence };
            }
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get statistics about the controller catalog.
   * @returns Statistics object
   */
  stats(): {
    families: number;
    totalVariants: number;
    dialects: number;
    byAxis: Record<number, number>;
    totalTribalTips: number;
  } {
    let totalVariants = 0;
    let tribalTipCount = 0;
    const byAxis: Record<number, number> = {};
    const dialects = new Set<string>();

    for (const f of CONTROLLER_FAMILIES) {
      totalVariants += f.variants.length;
      dialects.add(f.gCodeDialect);
      tribalTipCount += f.tribalTips.length;

      for (const v of f.variants) {
        byAxis[v.axisCount] = (byAxis[v.axisCount] ?? 0) + 1;
      }
    }

    return {
      families: CONTROLLER_FAMILIES.length,
      totalVariants,
      dialects: dialects.size,
      byAxis,
      totalTribalTips: tribalTipCount,
    };
  }
}

export const mastercamControllerCatalogEngine = new MastercamControllerCatalogEngine();
