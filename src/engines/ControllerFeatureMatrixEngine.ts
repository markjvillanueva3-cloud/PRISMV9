/**
 * ControllerFeatureMatrixEngine — Controller Feature Matrix for MS5 U01-U04
 *
 * Comprehensive hardcoded feature matrix covering 15+ controller variants
 * across four major CNC families:
 *   U01 — Fanuc (0i-F, 0i-TF, 16i, 18i, 30i, 31i)
 *   U02 — Siemens (808D, 810D, 828D, 840C, 840D, 840D sl, SINUMERIK ONE)
 *   U03 — Heidenhain (iTNC 530, TNC 620, TNC 640, TNC7)
 *   U04 — Mazak / Okuma (SmoothG, SmoothAi, SmoothX, OSP-P200, OSP-P300, OSP-P300A)
 *
 * Actions: get_controller, compare_controllers, get_feature_support,
 *          list_controllers, get_family_summary
 *
 * @module ControllerFeatureMatrixEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureSupportDetail {
  supported: boolean;
  code?: string;
  levels?: string[];
  variants?: string[];
  modes?: string[];
  type?: string;
  codes?: string[];
  name?: string;
  call_code?: string;
  max_nesting?: number;
}

export interface ControllerFeatureSet {
  controller: string;
  family: "fanuc" | "siemens" | "heidenhain" | "mazak" | "okuma";
  variant: string;
  year_introduced?: number;
  features: {
    // ── HSM ──────────────────────────────────────────────────────────────
    hsm_smoothing: { supported: boolean; code: string; levels?: string[] };
    ai_contour: { supported: boolean; code?: string };
    look_ahead_blocks: number;

    // ── 5-axis ───────────────────────────────────────────────────────────
    tcp_rtcp: { supported: boolean; code: string; variants?: string[] };
    tilted_workplane: { supported: boolean; code: string; modes?: string[] };

    // ── Canned cycles ────────────────────────────────────────────────────
    extended_cycles: boolean;
    rigid_tapping: { supported: boolean; code: string };
    deep_hole_drilling: { supported: boolean; codes: string[] };

    // ── Probing ──────────────────────────────────────────────────────────
    probing_cycles: { supported: boolean; type?: string; codes?: string[] };

    // ── Programming ──────────────────────────────────────────────────────
    macro_programming: { supported: boolean; type?: string };
    conversational: { supported: boolean; name?: string };
    subprograms: { supported: boolean; call_code: string; max_nesting?: number };

    // ── Motion ───────────────────────────────────────────────────────────
    nurbs: boolean;
    spline: boolean;
    helical: boolean;
    polar_interpolation: boolean;

    // ── System ───────────────────────────────────────────────────────────
    max_axes: number;
    max_channels: number;
    max_wcs: number;
    max_tools: number;
    max_program_size?: string;

    // ── Special ──────────────────────────────────────────────────────────
    ssv: { supported: boolean; code?: string };
    thermal_comp: { supported: boolean; code?: string };
    collision_avoidance: { supported: boolean; code?: string };
    adaptive_control: { supported: boolean; code?: string };
  };
  key_gcodes: Record<string, string>;
  notes: string[];
}

export interface FamilySummary {
  family: string;
  variant_count: number;
  variants: string[];
  common_features: string[];
  differentiating_features: string[];
  capability_range: string;
}

export interface ControllerComparison {
  controllers: string[];
  dimensions: Array<{
    dimension: string;
    values: Record<string, string | number | boolean>;
    winner?: string;
    notes?: string;
  }>;
  recommendation?: string;
}

export interface FeatureSupportResult {
  feature: string;
  results: Array<{
    controller: string;
    family: string;
    supported: boolean;
    detail: string;
  }>;
  summary: string;
}

// ============================================================================
// CONTROLLER DATA — HARDCODED MATRIX
// ============================================================================

const CONTROLLER_MATRIX: ControllerFeatureSet[] = [

  // ==========================================================================
  // U01 — FANUC
  // ==========================================================================

  {
    controller: "Fanuc 0i-F",
    family: "fanuc",
    variant: "0i-F",
    year_introduced: 2012,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G5.1 Q1",
        levels: ["Q0 (off)", "Q1 (on)"]
      },
      ai_contour: { supported: false },
      look_ahead_blocks: 40,
      tcp_rtcp: { supported: false, code: "N/A — no G43.4 on 0i-F" },
      tilted_workplane: { supported: false, code: "N/A" },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw/Marposs macro", codes: ["G31"] },
      macro_programming: { supported: true, type: "Macro B (G65/G66)" },
      conversational: { supported: false },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 4 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 4,
      max_channels: 1,
      max_wcs: 48,
      max_tools: 400,
      max_program_size: "1 MB",
      ssv: { supported: false },
      thermal_comp: { supported: true, code: "Integrated" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HSM on":            "G5.1 Q1",
      "HSM off":           "G5.1 Q0",
      "Drill":             "G81",
      "Peck drill":        "G83",
      "Tap":               "G84",
      "Rigid tap":         "G84.2",
      "Skip":              "G31",
      "Work offset":       "G54–G59",
      "Arc IJK":           "G2/G3 I_ J_ K_",
      "Cancel cycle":      "G80",
      "Tool length comp":  "G43 H_",
      "Cutter comp":       "G41/G42 D_"
    },
    notes: [
      "Nano smoothing G5.1 Q1 enables basic path smoothing only; no multi-level like 30i",
      "No G43.4 TCP — 5-axis positioning only via G43 with B/C axis offset",
      "Manual Guide i available as optional conversational overlay",
      "AICC (AI Contour Control) NOT available on 0i-F",
      "High-speed skip G31 P_ for measurement available"
    ]
  },

  {
    controller: "Fanuc 0i-TF",
    family: "fanuc",
    variant: "0i-TF",
    year_introduced: 2015,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G5.1 Q1",
        levels: ["Q0 (off)", "Q1 (on)"]
      },
      ai_contour: { supported: false },
      look_ahead_blocks: 40,
      tcp_rtcp: { supported: false, code: "N/A" },
      tilted_workplane: { supported: false, code: "N/A" },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw/Marposs macro", codes: ["G31"] },
      macro_programming: { supported: true, type: "Macro B (G65/G66)" },
      conversational: { supported: false },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 4 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 4,
      max_channels: 1,
      max_wcs: 48,
      max_tools: 400,
      max_program_size: "1 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Integrated" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HSM on":             "G5.1 Q1",
      "HSM off":            "G5.1 Q0",
      "Drill":              "G81",
      "Peck drill":         "G83",
      "Rigid tap":          "G84.2",
      "Skip":               "G31",
      "Work offset":        "G54–G59",
      "CSS on":             "G96 S_",
      "CSS off":            "G97 S_",
      "Tool length comp":   "G43 H_",
      "Cutter comp":        "G41/G42 D_",
      "Polar coord":        "G12.1/G13.1"
    },
    notes: [
      "Turning-focused variant of 0i-F; adds SSV (G96 with speed variation)",
      "Polar coordinate interpolation G12.1 for mill-turn operations",
      "No AICC, no G43.4 — turning/mill-turn centered controller",
      "C-axis milling available with G12.1 polar interpolation"
    ]
  },

  {
    controller: "Fanuc 16i",
    family: "fanuc",
    variant: "16i",
    year_introduced: 1994,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G5 P10000",
        levels: ["P0 (off)", "P10000 (HPCC on)"]
      },
      ai_contour: { supported: true, code: "G5.1 Q2" },
      look_ahead_blocks: 200,
      tcp_rtcp: { supported: true, code: "G43.4", variants: ["Type 1 (G43.4 H_)"] },
      tilted_workplane: { supported: true, code: "G68.2", modes: ["Euler angle", "projection"] },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Macro B with G31", codes: ["G31", "G37"] },
      macro_programming: { supported: true, type: "Macro B (G65/G66)" },
      conversational: { supported: false },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 8 },
      nurbs: true,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 8,
      max_channels: 2,
      max_wcs: 99,
      max_tools: 1000,
      max_program_size: "2 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Integrated" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HPCC on":           "G5 P10000",
      "HPCC off":          "G5 P0",
      "AICC on":           "G5.1 Q2",
      "AICC off":          "G5.1 Q0",
      "TCP on":            "G43.4 H_",
      "TCP off":           "G49",
      "Tilted plane":      "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":         "G84.2",
      "NURBS":             "G06.2 P_ X_ Y_ Z_ R_ K_",
      "Tool length comp":  "G43 H_"
    },
    notes: [
      "16i was the first Fanuc platform with AICC (AI Contour Control) via G5.1 Q2",
      "HPCC (High Precision Contour Control) via legacy G5 P10000",
      "G43.4 TCP supported — genuine 5-axis RTCP",
      "NURBS interpolation G6.2 available",
      "Maximum 8 axes, 2 channels — suitable for complex turn-mill centers"
    ]
  },

  {
    controller: "Fanuc 18i",
    family: "fanuc",
    variant: "18i",
    year_introduced: 1996,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G5 P10000",
        levels: ["P0 (off)", "P10000 (HPCC)"]
      },
      ai_contour: { supported: true, code: "G5.1 Q2" },
      look_ahead_blocks: 200,
      tcp_rtcp: { supported: true, code: "G43.4", variants: ["Type 1 (G43.4 H_)"] },
      tilted_workplane: { supported: true, code: "G68.2", modes: ["Euler angle"] },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Macro B with G31", codes: ["G31", "G37"] },
      macro_programming: { supported: true, type: "Macro B (G65/G66)" },
      conversational: { supported: false },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 8 },
      nurbs: true,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 8,
      max_channels: 2,
      max_wcs: 99,
      max_tools: 1000,
      max_program_size: "2 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Integrated" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HPCC on":          "G5 P10000",
      "AICC on":          "G5.1 Q2",
      "AICC off":         "G5.1 Q0",
      "TCP on":           "G43.4 H_",
      "TCP off":          "G49",
      "Tilted plane":     "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":        "G84.2",
      "NURBS":            "G06.2 P_ X_ Y_ Z_ R_ K_",
      "Work offset":      "G54–G59 / G54.1 P_"
    },
    notes: [
      "18i is functionally similar to 16i with same AICC and TCP capability",
      "Extended WCS via G54.1 P1–P48 (48 additional work offsets)",
      "Commonly used on horizontal machining centers",
      "18i-MB5 variant adds 5th axis and mill-turn capability"
    ]
  },

  {
    controller: "Fanuc 30i",
    family: "fanuc",
    variant: "30i",
    year_introduced: 2003,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G5.1 Q1",
        levels: ["Q0 (off)", "Q1 (nano smooth)", "Q2 (AICC)", "R1-R10 (tolerance levels)"]
      },
      ai_contour: { supported: true, code: "G5.1 Q2" },
      look_ahead_blocks: 1000,
      tcp_rtcp: {
        supported: true,
        code: "G43.4",
        variants: ["Type 1 (G43.4 H_)", "Type 2 (G43.5 H_ D_)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw", "projection angle", "two vectors"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Macro B with G31 P_ / G37", codes: ["G31", "G31.1", "G37"] },
      macro_programming: { supported: true, type: "Macro B (G65/G66) + Executors" },
      conversational: { supported: true, name: "Manual Guide i" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 15 },
      nurbs: true,
      spline: true,
      helical: true,
      polar_interpolation: true,
      max_axes: 10,
      max_channels: 4,
      max_wcs: 300,
      max_tools: 4000,
      max_program_size: "512 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Integrated multi-axis" },
      collision_avoidance: { supported: true, code: "iHMI + SERVO HRV4" },
      adaptive_control: { supported: true, code: "Learnable Macro B" }
    },
    key_gcodes: {
      "Nano smooth on":    "G5.1 Q1 R_",
      "AICC on":           "G5.1 Q2 R_",
      "HSM off":           "G5.1 Q0",
      "TCP Type1 on":      "G43.4 H_",
      "TCP Type2 on":      "G43.5 H_ D_",
      "TCP off":           "G49",
      "Tilted plane":      "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Cancel tilted":     "G69",
      "Rigid tap":         "G84.2",
      "NURBS":             "G06.2",
      "Work offset ext":   "G54.1 P1–P300",
      "Skip hi-speed":     "G31 P_ / G31.1 P_"
    },
    notes: [
      "30i-B5 is the gold-standard Fanuc 5-axis controller",
      "G5.1 Q2 AICC available — distinguishes 30i/31i from lower-tier",
      "G43.5 Type-2 TCP supports separate tool length and cutter radius comp in 5-axis",
      "Up to 300 work coordinate systems (G54.1 P1-P300)",
      "1000-block look-ahead for complex surface programs",
      "iHMI with 3D tool path display and collision avoidance optional",
      "Manual Guide i conversational available",
      "High-speed skip G31.1 P_ for in-process gauging"
    ]
  },

  {
    controller: "Fanuc 31i",
    family: "fanuc",
    variant: "31i",
    year_introduced: 2003,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G5.1 Q1",
        levels: ["Q0 (off)", "Q1 (nano smooth)", "Q2 (AICC)", "R1-R10 (tolerance levels)"]
      },
      ai_contour: { supported: true, code: "G5.1 Q2" },
      look_ahead_blocks: 1000,
      tcp_rtcp: {
        supported: true,
        code: "G43.4",
        variants: ["Type 1 (G43.4 H_)", "Type 2 (G43.5 H_ D_)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw", "projection angle", "two vectors"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2 / G84.3 (reverse)" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Macro B with G31 P_ / G37", codes: ["G31", "G31.1", "G37"] },
      macro_programming: { supported: true, type: "Macro B (G65/G66) + Executors" },
      conversational: { supported: true, name: "Manual Guide i" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 15 },
      nurbs: true,
      spline: true,
      helical: true,
      polar_interpolation: true,
      max_axes: 10,
      max_channels: 4,
      max_wcs: 300,
      max_tools: 4000,
      max_program_size: "512 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Integrated multi-axis" },
      collision_avoidance: { supported: true, code: "iHMI + SERVO HRV4" },
      adaptive_control: { supported: true, code: "Learnable Macro B" }
    },
    key_gcodes: {
      "Nano smooth on":    "G5.1 Q1 R_",
      "AICC on":           "G5.1 Q2 R_",
      "HSM off":           "G5.1 Q0",
      "TCP Type1 on":      "G43.4 H_",
      "TCP Type2 on":      "G43.5 H_ D_",
      "TCP off":           "G49",
      "Tilted plane":      "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Cancel tilted":     "G69",
      "Rigid tap CW":      "G84.2",
      "Rigid tap CCW":     "G84.3",
      "NURBS":             "G06.2",
      "Work offset ext":   "G54.1 P1–P300",
      "Skip hi-speed":     "G31 P_ / G31.1 P_"
    },
    notes: [
      "31i-B5 is functionally identical to 30i-B5 for 5-axis milling",
      "31i adds G84.3 for left-hand/reverse rigid tapping",
      "Commonly paired with FANUC ROBODRILL and premium machining centers",
      "AICC G5.1 Q2 supported — high-tolerance contouring",
      "Same extended WCS, look-ahead and channel count as 30i"
    ]
  },

  // ==========================================================================
  // U02 — SIEMENS
  // ==========================================================================

  {
    controller: "Siemens 808D",
    family: "siemens",
    variant: "808D",
    year_introduced: 2013,
    features: {
      hsm_smoothing: {
        supported: false,
        code: "N/A — no CYCLE832 on 808D"
      },
      ai_contour: { supported: false },
      look_ahead_blocks: 20,
      tcp_rtcp: { supported: false, code: "N/A — no TRAORI" },
      tilted_workplane: { supported: false, code: "N/A — no CYCLE800" },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE84" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE83"] },
      probing_cycles: { supported: false },
      macro_programming: { supported: false },
      conversational: { supported: true, name: "ShopMill / ShopTurn" },
      subprograms: { supported: true, call_code: "CALL", max_nesting: 8 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: false,
      max_axes: 4,
      max_channels: 1,
      max_wcs: 25,
      max_tools: 64,
      max_program_size: "32 MB",
      ssv: { supported: false },
      thermal_comp: { supported: false },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "Drill":          "CYCLE81",
      "Peck drill":     "CYCLE83",
      "Tap":            "CYCLE84",
      "Bore":           "CYCLE85",
      "Work offset":    "G54–G57",
      "Subprogram":     "CALL P_ L_"
    },
    notes: [
      "Entry-level Siemens controller for basic 3-axis milling and turning",
      "No CYCLE800 (tilted plane), no CYCLE832 (HSM), no TRAORI (5-axis)",
      "ShopMill/ShopTurn conversational programming built-in",
      "Maximum 25 zero offsets (G54–G57 + extensions)",
      "No TRANSMIT (polar) or TRACYL (cylindrical) transformations"
    ]
  },

  {
    controller: "Siemens 828D",
    family: "siemens",
    variant: "828D",
    year_introduced: 2009,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "CYCLE832",
        levels: ["ROUGH (_TOLM=0.1)", "MEDIUM (_TOLM=0.05)", "FINISH (_TOLM=0.01)", "PRECISION (_TOLM=0.005)"]
      },
      ai_contour: { supported: true, code: "CYCLE832(_TOLM, MODE)" },
      look_ahead_blocks: 500,
      tcp_rtcp: { supported: false, code: "N/A — no TRAORI; CYCLE800 only" },
      tilted_workplane: {
        supported: true,
        code: "CYCLE800",
        modes: ["Euler angle", "axis sequence", "direct (3 vectors)"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE84" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE83"] },
      probing_cycles: { supported: true, type: "Siemens integrated", codes: ["CYCLE977", "CYCLE978", "CYCLE979", "CYCLE971"] },
      macro_programming: { supported: true, type: "R-parameters + GUD/LUD variables" },
      conversational: { supported: true, name: "ShopMill / programGUIDE" },
      subprograms: { supported: true, call_code: "CALL", max_nesting: 16 },
      nurbs: true,
      spline: true,
      helical: true,
      polar_interpolation: true,
      max_axes: 6,
      max_channels: 2,
      max_wcs: 100,
      max_tools: 300,
      max_program_size: "512 MB",
      ssv: { supported: false },
      thermal_comp: { supported: true, code: "TEMP_COMP" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HSM on":          "CYCLE832(_TOLM, _MODE)",
      "HSM off":         "CYCLE832()",
      "TRANSMIT":        "TRANSMIT",
      "TRACYL":          "TRACYL(_R)",
      "Tilted plane":    "CYCLE800()",
      "NURBS":           "BSPLINE X_ Y_ Z_ PW_",
      "Spline":          "ASPLINE / BSPLINE / CSPLINE",
      "Tap":             "CYCLE84(_T, _D, _DP, _DPR, _DTB, _SDR, _SDAC, _ENC, _MPIT, _PIT)",
      "Probe bore":      "CYCLE977",
      "Probe web":       "CYCLE978",
      "Probe angle":     "CYCLE979",
      "Compressor":      "COMPON / COMPOF",
      "FFWON":           "FFWON"
    },
    notes: [
      "828D supports CYCLE832 with up to 4 tolerance levels for HSM",
      "TRANSMIT (polar interpolation) and TRACYL (cylindrical wrapping) supported",
      "CYCLE800 provides tilted-plane 3+2 but NOT continuous 5-axis (no TRAORI)",
      "programGUIDE/ShopMill conversational with step-by-step guidance",
      "COMPON compressor smooths small moves between blocks",
      "FFWON (feed forward) reduces following error at high feedrates"
    ]
  },

  {
    controller: "Siemens 840D sl",
    family: "siemens",
    variant: "840D sl",
    year_introduced: 2006,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "CYCLE832",
        levels: ["ROUGH (_TOLM=0.2)", "STANDARD (_TOLM=0.05)", "FINISH (_TOLM=0.01)", "PRECISION (_TOLM=0.002)", "ULTRA (_TOLM=0.0005)"]
      },
      ai_contour: { supported: true, code: "CYCLE832 MODE=5 (COMPCAD)" },
      look_ahead_blocks: 1500,
      tcp_rtcp: {
        supported: true,
        code: "TRAORI",
        variants: ["TRAORI(1)", "TRAORI(2)", "TRAFOOF to disable"]
      },
      tilted_workplane: {
        supported: true,
        code: "CYCLE800",
        modes: ["Euler angle", "axis sequence", "direct vectors", "PLANE SPATIAL (PLANE WORKPIECE)", "PLANE RELATIV"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE84" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE83"] },
      probing_cycles: { supported: true, type: "Siemens integrated + OEM", codes: ["CYCLE977", "CYCLE978", "CYCLE979", "CYCLE971", "CYCLE997"] },
      macro_programming: { supported: true, type: "R-param + GUD/LUD + compile cycles" },
      conversational: { supported: true, name: "programGUIDE / ShopMill" },
      subprograms: { supported: true, call_code: "CALL", max_nesting: 20 },
      nurbs: true,
      spline: true,
      helical: true,
      polar_interpolation: true,
      max_axes: 31,
      max_channels: 10,
      max_wcs: 300,
      max_tools: 32000,
      max_program_size: "2 GB",
      ssv: { supported: true, code: "TURNON / TURNOF (POSCTRL)" },
      thermal_comp: { supported: true, code: "TEMP_COMP + volumetric" },
      collision_avoidance: { supported: true, code: "Option: SINUMERIK Safety Integrated + OPM" },
      adaptive_control: { supported: true, code: "Compile cycles + OEM packages" }
    },
    key_gcodes: {
      "HSM on":           "CYCLE832(_TOLM, _MODE)",
      "COMPCAD":          "CYCLE832(_TOLM, 5)",
      "TRAORI on":        "TRAORI(1)",
      "TRAORI off":       "TRAFOOF",
      "TRANSMIT":         "TRANSMIT",
      "TRACYL":           "TRACYL(_R)",
      "Tilted plane":     "CYCLE800()",
      "ORIWKS":           "ORIWKS / ORIMKS",
      "Spline":           "ASPLINE / BSPLINE / CSPLINE",
      "NURBS":            "BSPLINE X_ Y_ Z_ PW_",
      "Compressor":       "COMPCURV / COMPON / COMPCAD",
      "Look-ahead":       "FGROUP / FNORM",
      "Probe 3D boss":    "CYCLE997",
      "FFWON":            "FFWON"
    },
    notes: [
      "840D sl (solution line) is the premium Siemens platform — PCU 50 + NCU",
      "TRAORI enables genuine continuous 5-axis RTCP (rotary tool center point)",
      "COMPCAD (CYCLE832 MODE=5) is highest-level surface quality optimizer",
      "Up to 31 axes and 10 channels for complex multi-spindle machines",
      "SINUMERIK Safety Integrated for functional safety (axis monitoring)",
      "Volumetric thermal compensation optional",
      "OEM compile cycles allow custom G-code creation (like CYCLE800 derivatives)"
    ]
  },

  {
    controller: "Siemens SINUMERIK ONE",
    family: "siemens",
    variant: "SINUMERIK ONE",
    year_introduced: 2019,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "CYCLE832",
        levels: ["ROUGH", "STANDARD", "FINISH", "PRECISION", "ULTRA", "ADVANCED (AI-assisted)"]
      },
      ai_contour: { supported: true, code: "CYCLE832 MODE=7 (AI-COMPCAD)" },
      look_ahead_blocks: 2000,
      tcp_rtcp: {
        supported: true,
        code: "TRAORI",
        variants: ["TRAORI(1)", "TRAORI(2)", "Digital Twin synchronized"]
      },
      tilted_workplane: {
        supported: true,
        code: "CYCLE800",
        modes: ["Euler angle", "axis sequence", "direct vectors", "PLANE SPATIAL", "PLANE RELATIV", "Digital Twin preview"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE84" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE83"] },
      probing_cycles: { supported: true, type: "Siemens integrated + OEM + inline measurement", codes: ["CYCLE977", "CYCLE978", "CYCLE979", "CYCLE971", "CYCLE997"] },
      macro_programming: { supported: true, type: "R-param + GUD + compile cycles + OEM" },
      conversational: { supported: true, name: "programGUIDE / ShopMill / NX CAM integration" },
      subprograms: { supported: true, call_code: "CALL", max_nesting: 20 },
      nurbs: true,
      spline: true,
      helical: true,
      polar_interpolation: true,
      max_axes: 64,
      max_channels: 31,
      max_wcs: 300,
      max_tools: 32000,
      max_program_size: "2 GB",
      ssv: { supported: true, code: "POSCTRL + AI speed variation" },
      thermal_comp: { supported: true, code: "Volumetric + AI-assisted" },
      collision_avoidance: { supported: true, code: "Integrated Digital Twin + real-time CAS" },
      adaptive_control: { supported: true, code: "AI-based adaptive feed + spindle load" }
    },
    key_gcodes: {
      "AI COMPCAD":       "CYCLE832(_TOLM, 7)",
      "TRAORI on":        "TRAORI(1)",
      "TRAORI off":       "TRAFOOF",
      "Tilted plane":     "CYCLE800()",
      "Digital Twin":     "Integrated (Siemens NX CAM link)",
      "TRANSMIT":         "TRANSMIT",
      "TRACYL":           "TRACYL(_R)",
      "Compressor":       "COMPCAD / COMPCURV",
      "NURBS":            "BSPLINE X_ Y_ Z_ PW_"
    },
    notes: [
      "SINUMERIK ONE is Siemens' next-gen controller with native Digital Twin",
      "AI-assisted COMPCAD for surface quality without manual tolerance tuning",
      "Up to 64 axes and 31 channels — hyperscale machine tool configuration",
      "NX CAM direct post integration for zero-post workflow",
      "Real-time collision avoidance via Digital Twin synchronized execution",
      "AI-based adaptive feed automatically adjusts based on spindle load history"
    ]
  },

  // ==========================================================================
  // U03 — HEIDENHAIN
  // ==========================================================================

  {
    controller: "Heidenhain iTNC 530",
    family: "heidenhain",
    variant: "iTNC 530",
    year_introduced: 2001,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "CYCLE 32 (HSC FINISHING)",
        levels: ["ROUGHING", "PRE-FINISHING", "FINISHING"]
      },
      ai_contour: { supported: false },
      look_ahead_blocks: 1024,
      tcp_rtcp: {
        supported: true,
        code: "M128 / M129",
        variants: ["M128 (TCPM on)", "M129 (TCPM off)", "PLANE SPATIAL (3D)"]
      },
      tilted_workplane: {
        supported: true,
        code: "PLANE SPATIAL / PLANE EULER",
        modes: ["PLANE SPATIAL SA_ SB_ SC_", "PLANE EULER", "PLANE VECTOR", "PLANE POINTS", "PLANE RELATIV"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE 17 / CYCLE 207" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE 200", "CYCLE 205", "CYCLE 240"] },
      probing_cycles: { supported: true, type: "Touch probe (CYCLE 400-series)", codes: ["CYCLE 400", "CYCLE 408", "CYCLE 410", "CYCLE 420"] },
      macro_programming: { supported: true, type: "Q-parameters (Q0–Q999)" },
      conversational: { supported: true, name: "Heidenhain conversational (Klartext)" },
      subprograms: { supported: true, call_code: "CALL LBL", max_nesting: 8 },
      nurbs: true,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 5,
      max_channels: 2,
      max_wcs: 99,
      max_tools: 9999,
      max_program_size: "2 GB",
      ssv: { supported: false },
      thermal_comp: { supported: true, code: "Machine-specific" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HSC mode":          "CYCL DEF 32.0 TOLERANCE  Q263=0.01",
      "TCPM on":           "M128",
      "TCPM off":          "M129",
      "Tilted plane":      "PLANE SPATIAL SA_ SB_ SC_ STAY",
      "Cancel plane":      "PLANE RESET STAY",
      "Drill":             "CYCL DEF 200 DRILLING",
      "Peck drill":        "CYCL DEF 203 UNIVERSAL DRILLING",
      "Deep hole":         "CYCL DEF 205 UNIVERSAL PECKING",
      "Rigid tap":         "CYCL DEF 207 RIGID TAPPING",
      "Probe circle":      "CYCL DEF 412 FIND CIRCLE CENTER",
      "Probe plane":       "CYCL DEF 0 PROBE PLANE",
      "Q-param":           "Q1 = 25 (parameter assignment)",
      "Subprogram":        "CALL LBL 1"
    },
    notes: [
      "iTNC 530 uses M128/M129 for TCPM (Tool Center Point Management) — legacy syntax",
      "Heidenhain conversational (Klartext) is human-readable plain-text format",
      "Cycles are 200-series (200–240) drilling, 300-series special, 400-series probing",
      "PLANE SPATIAL replaces older CYCLE 19 (tilted plane) — all modes supported",
      "Q-parameters (Q0–Q999) replace G65 macros; global, local, and string Q-params",
      "DNC (Direct Numerical Control) via LSV/2 protocol or TNCremoNT",
      "KinematicsOpt cycle (CYCLE 450/451) for rotary axis optimization"
    ]
  },

  {
    controller: "Heidenhain TNC 640",
    family: "heidenhain",
    variant: "TNC 640",
    year_introduced: 2012,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "CYCLE 32 (ADP — Advanced Dynamic Prediction)",
        levels: ["ROUGHING (T-ANGLE=0.5)", "PRE-FINISHING (T-ANGLE=0.2)", "FINISHING (T-ANGLE=0.05)"]
      },
      ai_contour: { supported: true, code: "ADP (Advanced Dynamic Prediction) built-in" },
      look_ahead_blocks: 2048,
      tcp_rtcp: {
        supported: true,
        code: "FUNCTION TCPM",
        variants: ["FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", "FUNCTION TCPM F CONT AXIS SPAT PATHCTRL VECTOR", "M128 (legacy compatibility)"]
      },
      tilted_workplane: {
        supported: true,
        code: "PLANE SPATIAL / PLANE EULER / PLANE VECTOR",
        modes: ["PLANE SPATIAL SA_ SB_ SC_", "PLANE EULER", "PLANE VECTOR", "PLANE POINTS", "PLANE RELATIV", "PLANE AXIAL"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE 17 / CYCLE 207 / CYCLE 840" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE 200", "CYCLE 203", "CYCLE 205", "CYCLE 208"] },
      probing_cycles: { supported: true, type: "Touch probe + KinematicsOpt", codes: ["CYCLE 400–499", "CYCLE 450", "CYCLE 451"] },
      macro_programming: { supported: true, type: "Q-parameters + QL (string) + QR (real-time)" },
      conversational: { supported: true, name: "Heidenhain Klartext + ISO G-code mode" },
      subprograms: { supported: true, call_code: "CALL LBL", max_nesting: 20 },
      nurbs: true,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 6,
      max_channels: 2,
      max_wcs: 99,
      max_tools: 9999,
      max_program_size: "2 GB",
      ssv: { supported: false },
      thermal_comp: { supported: true, code: "Volumetric + KinematicsOpt" },
      collision_avoidance: { supported: true, code: "Dynamic Collision Monitoring (DCM)" },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "ADP FINISHING":      "CYCL DEF 32.0 TOLERANCE  Q263=0.05",
      "TCPM on":            "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS",
      "TCPM off":           "FUNCTION TCPM F RESET",
      "M128 (legacy)":      "M128",
      "Tilted plane":       "PLANE SPATIAL SA_ SB_ SC_ STAY",
      "Plane reset":        "PLANE RESET STAY",
      "Tap":                "CYCL DEF 207 RIGID TAPPING",
      "Floating tap":       "CYCL DEF 840 TAPPING",
      "Probe bore":         "CYCL DEF 412 FIND CIRCLE CENTER",
      "KinematicsOpt":      "CYCL DEF 451 MEASURE KINEMATICS",
      "DCM enable":         "Machine-specific M-function",
      "Subprogram":         "CALL LBL _ REP _"
    },
    notes: [
      "TNC 640 introduces FUNCTION TCPM — more flexible than legacy M128/M129",
      "ADP (Advanced Dynamic Prediction) is Heidenhain's HSM look-ahead for finishing",
      "DCM (Dynamic Collision Monitoring) performs real-time 3D collision check",
      "ISO G-code mode available alongside Klartext for standard G-code programs",
      "KinematicsOpt CYCLE 451 auto-measures rotary axis geometry",
      "CYCLE 840 floating tapping with encoder synchronization",
      "Up to 6 simultaneous axes; mill-turn capable"
    ]
  },

  {
    controller: "Heidenhain TNC7",
    family: "heidenhain",
    variant: "TNC7",
    year_introduced: 2022,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "CYCLE 32 (ADP 2.0 + Machine Model)",
        levels: ["ROUGHING", "PRE-FINISHING", "FINISHING", "MIRROR SURFACE (new)"]
      },
      ai_contour: { supported: true, code: "ADP 2.0 + AI-learning vibration suppression" },
      look_ahead_blocks: 4096,
      tcp_rtcp: {
        supported: true,
        code: "FUNCTION TCPM",
        variants: ["FUNCTION TCPM F TCP", "FUNCTION TCPM F CONT", "FUNCTION TCPM F TCP AXIS SPAT", "M128 (compatibility)"]
      },
      tilted_workplane: {
        supported: true,
        code: "PLANE SPATIAL / PLANE EULER / PLANE VECTOR / PLANE INCREMENTAL",
        modes: ["PLANE SPATIAL", "PLANE EULER", "PLANE VECTOR", "PLANE POINTS", "PLANE RELATIV", "PLANE AXIAL", "PLANE INCREMENTAL"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "CYCLE 17 / CYCLE 207 / CYCLE 840" },
      deep_hole_drilling: { supported: true, codes: ["CYCLE 200", "CYCLE 203", "CYCLE 205", "CYCLE 208", "CYCLE 240"] },
      probing_cycles: { supported: true, type: "Touch probe + KinematicsOpt + automated WCS", codes: ["CYCLE 400–499", "CYCLE 450", "CYCLE 451", "CYCLE 460"] },
      macro_programming: { supported: true, type: "Q-parameters + QL + QR + OEM Functions" },
      conversational: { supported: true, name: "Heidenhain Klartext + ISO + graphical CAM link" },
      subprograms: { supported: true, call_code: "CALL LBL", max_nesting: 20 },
      nurbs: true,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 8,
      max_channels: 4,
      max_wcs: 999,
      max_tools: 9999,
      max_program_size: "4 GB",
      ssv: { supported: false },
      thermal_comp: { supported: true, code: "Volumetric + AI-assisted + real-time" },
      collision_avoidance: { supported: true, code: "DCM 2.0 with machine model" },
      adaptive_control: { supported: true, code: "AI vibration suppression + adaptive feed" }
    },
    key_gcodes: {
      "ADP 2.0 FINISHING":   "CYCL DEF 32.0 TOLERANCE Q263=0.05",
      "TCPM TCP":            "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS",
      "TCPM CONT":           "FUNCTION TCPM F CONT AXIS SPAT PATHCTRL VECTOR",
      "TCPM off":            "FUNCTION TCPM F RESET",
      "Tilted plane":        "PLANE SPATIAL SA_ SB_ SC_ STAY",
      "Plane reset":         "PLANE RESET STAY",
      "KinematicsOpt 2.0":   "CYCL DEF 451 MEASURE KINEMATICS",
      "Probe 3D surface":    "CYCL DEF 460 CALIBRATE TS ON SPHERE",
      "DCM 2.0":             "Machine-specific M-function",
      "Subprogram":          "CALL LBL _ REP _"
    },
    notes: [
      "TNC7 is Heidenhain's current flagship — touchscreen with gesture UI",
      "ADP 2.0 adds vibration learning and mirror-surface finishing mode",
      "Up to 8 axes and 4 channels — enables complex mill-turn and tandem axes",
      "DCM 2.0 uses full machine model for real-time collision avoidance",
      "Up to 999 work coordinate systems",
      "CAM link allows direct DXF/STEP import for conversational machining",
      "AI-based adaptive feed reduces cycle time while protecting tool life"
    ]
  },

  // ==========================================================================
  // U04 — MAZAK / OKUMA
  // ==========================================================================

  {
    controller: "Mazak SmoothG",
    family: "mazak",
    variant: "SmoothG",
    year_introduced: 2014,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G05.1 Q1 R_",
        levels: ["R1 (coarse)", "R3 (medium)", "R5 (fine)"]
      },
      ai_contour: { supported: false },
      look_ahead_blocks: 200,
      tcp_rtcp: {
        supported: true,
        code: "G43.4",
        variants: ["G43.4 H_ (Type 1 TCP)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw cycles via macro", codes: ["G31", "G37.1"] },
      macro_programming: { supported: true, type: "Macro B (G65) + MAZATROL variables" },
      conversational: { supported: true, name: "MAZATROL SmoothG" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 8 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 6,
      max_channels: 2,
      max_wcs: 99,
      max_tools: 2000,
      max_program_size: "2 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Mazak thermo-shield" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HSM on":            "G05.1 Q1 R_",
      "HSM off":           "G05.1 Q0",
      "TCP on":            "G43.4 H_",
      "TCP off":           "G49",
      "Tilted plane":      "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":         "G84.2",
      "MAZATROL mode":     "EIA/ISO or MAZATROL selectable at program start",
      "CSS on":            "G96 S_",
      "Work offset":       "G54–G59 / G54.1 P_"
    },
    notes: [
      "SmoothG is Mazak's mid-range CNC — EIA/ISO (G-code) + MAZATROL dual mode",
      "MAZATROL conversational allows feature-based programming without G-code",
      "G05.1 Q1 for HSM — same code as Fanuc 30i due to Fanuc kernel basis",
      "Thermo-shield thermal compensation using machine temperature sensors",
      "G43.4 TCP available — genuine 5-axis RTCP for tilted surfaces",
      "SSV (Spindle Speed Variation) via G96 with D-word amplitude"
    ]
  },

  {
    controller: "Mazak SmoothAi",
    family: "mazak",
    variant: "SmoothAi",
    year_introduced: 2020,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G05.1 Q1 R_",
        levels: ["R1 (coarse)", "R3 (medium)", "R5 (fine)", "AI-adaptive (auto-tune)"]
      },
      ai_contour: { supported: true, code: "G05.1 Q2 (MAZAK AI contour)" },
      look_ahead_blocks: 800,
      tcp_rtcp: {
        supported: true,
        code: "G43.4 / G43.5",
        variants: ["G43.4 H_ (Type 1 TCP)", "G43.5 H_ D_ (Type 2 TCP)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw", "feature coordinate"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw cycles via macro + SmoothAi inline", codes: ["G31", "G37.1", "G37.3"] },
      macro_programming: { supported: true, type: "Macro B (G65) + MAZATROL AI variables" },
      conversational: { supported: true, name: "MAZATROL SmoothAi with AI suggestions" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 12 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 8,
      max_channels: 4,
      max_wcs: 200,
      max_tools: 4000,
      max_program_size: "512 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "AI Thermal Shield (predictive ML)" },
      collision_avoidance: { supported: true, code: "Visual AI collision check" },
      adaptive_control: { supported: true, code: "AI Spindle Health + Voice Navigation" }
    },
    key_gcodes: {
      "AI contour on":       "G05.1 Q2 R_",
      "HSM on":              "G05.1 Q1 R_",
      "HSM off":             "G05.1 Q0",
      "TCP Type1 on":        "G43.4 H_",
      "TCP Type2 on":        "G43.5 H_ D_",
      "TCP off":             "G49",
      "Tilted plane":        "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":           "G84.2",
      "AI Thermal Shield":   "Automatic (ML model)",
      "Voice navigation":    "Integrated voice assistant",
      "Spindle health":      "Automatic (vibration + load analytics)"
    },
    notes: [
      "SmoothAi is Mazak's AI-flagship controller — ML-based optimization",
      "AI Thermal Shield uses machine-learning model to predict and compensate thermal growth",
      "Voice navigation allows verbal G-code lookup and parameter help",
      "Spindle Health Monitoring analyzes vibration signatures for predictive maintenance",
      "G43.5 Type-2 TCP adds separate cutter radius comp in 5-axis mode",
      "AI-adaptive HSM auto-tunes R-level based on spindle load feedback",
      "MAZATROL AI suggests optimal cutting conditions from part feature recognition"
    ]
  },

  {
    controller: "Mazak SmoothX",
    family: "mazak",
    variant: "SmoothX",
    year_introduced: 2016,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G05.1 Q1 R_",
        levels: ["R1 (coarse)", "R3 (medium)", "R5 (fine)"]
      },
      ai_contour: { supported: true, code: "G05.1 Q2" },
      look_ahead_blocks: 600,
      tcp_rtcp: {
        supported: true,
        code: "G43.4 / G43.5",
        variants: ["G43.4 H_ (Type 1 TCP)", "G43.5 H_ D_ (Type 2 TCP)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw cycles via macro", codes: ["G31", "G37.1"] },
      macro_programming: { supported: true, type: "Macro B (G65) + MAZATROL" },
      conversational: { supported: true, name: "MAZATROL SmoothX" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 10 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 8,
      max_channels: 4,
      max_wcs: 200,
      max_tools: 4000,
      max_program_size: "256 MB",
      ssv: { supported: true, code: "G96 S_ D_" },
      thermal_comp: { supported: true, code: "Mazak thermo-shield" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "AI contour on":   "G05.1 Q2 R_",
      "HSM on":          "G05.1 Q1 R_",
      "HSM off":         "G05.1 Q0",
      "TCP Type1 on":    "G43.4 H_",
      "TCP Type2 on":    "G43.5 H_ D_",
      "TCP off":         "G49",
      "Tilted plane":    "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":       "G84.2",
      "Work offset":     "G54–G59 / G54.1 P_"
    },
    notes: [
      "SmoothX bridges SmoothG and SmoothAi — multi-channel capable",
      "G05.1 Q2 AI contour control for improved surface finish",
      "Supports multi-spindle mill-turn configurations up to 4 channels",
      "MAZATROL SmoothX conversational supports compound machining strategies",
      "G43.5 Type-2 TCP for 5-axis machining with independent radius compensation"
    ]
  },

  {
    controller: "Okuma OSP-P200",
    family: "okuma",
    variant: "OSP-P200",
    year_introduced: 2008,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G08 P1 (HPCC)",
        levels: ["G08 P0 (off)", "G08 P1 (on, smoothing via parameter)"]
      },
      ai_contour: { supported: false },
      look_ahead_blocks: 200,
      tcp_rtcp: {
        supported: true,
        code: "G43.4",
        variants: ["G43.4 H_ (Type 1 TCP)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw cycles via macro", codes: ["G31"] },
      macro_programming: { supported: true, type: "User Task (Fanuc Macro B compatible)" },
      conversational: { supported: true, name: "Okuma navi-mill / navi-turn" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 8 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 6,
      max_channels: 2,
      max_wcs: 99,
      max_tools: 1000,
      max_program_size: "8 MB",
      ssv: { supported: true, code: "CSS (constant surface speed)" },
      thermal_comp: { supported: true, code: "Okuma TAS-C (thermo-active stabilizer)" },
      collision_avoidance: { supported: false },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HPCC on":         "G08 P1",
      "HPCC off":        "G08 P0",
      "TCP on":          "G43.4 H_",
      "TCP off":         "G49",
      "Tilted plane":    "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":       "G84.2",
      "CSS on":          "G96 S_",
      "CSS off":         "G97 S_",
      "Work offset":     "G54–G59",
      "navi-mill":       "Conversational cycle interface"
    },
    notes: [
      "OSP-P200 uses G08 P1 for HPCC (High Precision Contour Control) — Okuma's HSM code",
      "TAS-C (Thermo-Active Stabilizer Control) for geometric thermal compensation",
      "navi-mill / navi-turn conversational interface for shop-floor programming",
      "User Task is Okuma's name for Macro B compatible programming",
      "G43.4 TCP supported for 5-axis machining",
      "Okuma's OSP is a proprietary non-Fanuc kernel — similar G-code dialect"
    ]
  },

  {
    controller: "Okuma OSP-P300",
    family: "okuma",
    variant: "OSP-P300",
    year_introduced: 2015,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G08 P1 (HPCC)",
        levels: ["G08 P0 (off)", "G08 P1 (HPCC)", "HPCC-A (adaptive, parameter-based)"]
      },
      ai_contour: { supported: true, code: "G08 P1 + HPCC-A parameter" },
      look_ahead_blocks: 500,
      tcp_rtcp: {
        supported: true,
        code: "G43.4 / G43.5",
        variants: ["G43.4 H_ (Type 1 TCP)", "G43.5 H_ D_ (Type 2 TCP)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw cycles via macro + inline", codes: ["G31", "G37.1"] },
      macro_programming: { supported: true, type: "User Task (Macro B + SPEC variables)" },
      conversational: { supported: true, name: "navi-mill 3 / navi-turn 3" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 12 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 8,
      max_channels: 2,
      max_wcs: 200,
      max_tools: 2000,
      max_program_size: "64 MB",
      ssv: { supported: true, code: "CSS + SSV G96 S_ D_" },
      thermal_comp: { supported: true, code: "TAS-C + volumetric" },
      collision_avoidance: { supported: true, code: "3D Simulation (Okuma Virtual)" },
      adaptive_control: { supported: false }
    },
    key_gcodes: {
      "HPCC on":          "G08 P1",
      "HPCC-A on":        "G08 P1 (+ HPCC-A parameter block)",
      "HPCC off":         "G08 P0",
      "TCP Type1 on":     "G43.4 H_",
      "TCP Type2 on":     "G43.5 H_ D_",
      "TCP off":          "G49",
      "Tilted plane":     "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":        "G84.2",
      "CSS+SSV on":       "G96 S_ D_",
      "Work offset":      "G54–G59 / G54.1 P_",
      "3D sim":           "Okuma Virtual Machine (offline)"
    },
    notes: [
      "OSP-P300 is Okuma's high-end platform with HPCC-A adaptive contouring",
      "HPCC-A (Adaptive) automatically adjusts corner smoothing based on geometry",
      "G43.5 Type-2 TCP for 5-axis machining with cutter radius comp",
      "3D Virtual Machine simulation offline for dry-run collision checking",
      "TAS-C + volumetric compensation for complex multi-axis thermal error",
      "navi-mill 3 conversational with automatic 3D CAD model import (IGES/STEP)",
      "SSV (G96 with D-word) for chatter reduction in turning operations"
    ]
  },

  {
    controller: "Okuma OSP-P300A",
    family: "okuma",
    variant: "OSP-P300A",
    year_introduced: 2020,
    features: {
      hsm_smoothing: {
        supported: true,
        code: "G08 P1 (HPCC + AI smoothing)",
        levels: ["G08 P0 (off)", "G08 P1 (HPCC)", "G08 P1 + AI SMOOTH LEVEL (1-5)"]
      },
      ai_contour: { supported: true, code: "G08 P1 + AI Servo parameter" },
      look_ahead_blocks: 1000,
      tcp_rtcp: {
        supported: true,
        code: "G43.4 / G43.5",
        variants: ["G43.4 H_ (Type 1 TCP)", "G43.5 H_ D_ (Type 2 TCP)"]
      },
      tilted_workplane: {
        supported: true,
        code: "G68.2",
        modes: ["Euler angle", "roll-pitch-yaw", "two-point vector"]
      },
      extended_cycles: true,
      rigid_tapping: { supported: true, code: "G84.2" },
      deep_hole_drilling: { supported: true, codes: ["G73", "G83"] },
      probing_cycles: { supported: true, type: "Renishaw cycles via macro + AI inline gauging", codes: ["G31", "G37.1", "G37.3"] },
      macro_programming: { supported: true, type: "User Task (Macro B + AI optimization hooks)" },
      conversational: { supported: true, name: "navi-mill 3 AI + CAD import" },
      subprograms: { supported: true, call_code: "M98 P", max_nesting: 12 },
      nurbs: false,
      spline: false,
      helical: true,
      polar_interpolation: true,
      max_axes: 10,
      max_channels: 4,
      max_wcs: 300,
      max_tools: 4000,
      max_program_size: "512 MB",
      ssv: { supported: true, code: "CSS + AI-SSV (G96 S_ D_)" },
      thermal_comp: { supported: true, code: "TAS-C + AI volumetric (ML model)" },
      collision_avoidance: { supported: true, code: "3D Virtual Machine + real-time AI monitoring" },
      adaptive_control: { supported: true, code: "AI Servo + load-based feed adaptation" }
    },
    key_gcodes: {
      "AI HPCC on":          "G08 P1 (AI SMOOTH LEVEL parameter)",
      "HPCC off":            "G08 P0",
      "TCP Type1 on":        "G43.4 H_",
      "TCP Type2 on":        "G43.5 H_ D_",
      "TCP off":             "G49",
      "Tilted plane":        "G68.2 X_ Y_ Z_ I_ J_ K_",
      "Rigid tap":           "G84.2",
      "AI-SSV on":           "G96 S_ D_ (AI-enhanced)",
      "Work offset":         "G54–G59 / G54.1 P1–P300",
      "3D Real-time CAS":    "AI Collision Avoidance System (always-on)"
    },
    notes: [
      "OSP-P300A is Okuma's AI-flagship — equivalent to Mazak SmoothAi tier",
      "AI Servo optimizes servo gain in real-time based on spindle load and vibration",
      "AI-SSV learns optimal speed variation amplitude and frequency from cutting history",
      "Real-time AI collision avoidance runs continuously (not just in simulation)",
      "ML-based TAS-C predicts thermal growth patterns from historical runs",
      "Up to 10 axes and 4 channels for complex multi-pallet horizontal centers",
      "G54.1 P1-P300 extended work offsets for flexible automation cells"
    ]
  }
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class ControllerFeatureMatrixEngineImpl {

  // ── Internal lookup helpers ────────────────────────────────────────────────

  private normalize(name: string): string {
    return name.toLowerCase().replace(/[\s\-_]+/g, "");
  }

  private findController(query: string): ControllerFeatureSet | undefined {
    const q = this.normalize(query);
    return CONTROLLER_MATRIX.find(c =>
      this.normalize(c.controller) === q ||
      this.normalize(c.variant) === q ||
      this.normalize(c.controller).includes(q) ||
      this.normalize(c.variant).includes(q)
    );
  }

  private findControllers(queries: string[]): { found: ControllerFeatureSet[]; missing: string[] } {
    const found: ControllerFeatureSet[] = [];
    const missing: string[] = [];
    for (const q of queries) {
      const c = this.findController(q);
      if (c) found.push(c);
      else missing.push(q);
    }
    return { found, missing };
  }

  // ── Action: get_controller ─────────────────────────────────────────────────

  /**
   * Retrieve full feature set for a single controller variant.
   * @param controller - e.g. "Fanuc 30i", "840D sl", "TNC 640", "OSP-P300"
   */
  getController(controller: string): ControllerFeatureSet | { error: string; available: string[] } {
    const c = this.findController(controller);
    if (!c) {
      return {
        error: `Controller not found: "${controller}"`,
        available: CONTROLLER_MATRIX.map(x => x.controller)
      };
    }
    return c;
  }

  // ── Action: compare_controllers ────────────────────────────────────────────

  /**
   * Side-by-side comparison across named controllers on key dimensions.
   * @param controllers - Array of controller names, e.g. ["Fanuc 30i", "840D sl", "TNC 640"]
   */
  compareControllers(controllers: string[]): ControllerComparison {
    const { found, missing } = this.findControllers(controllers);

    const dimensions: ControllerComparison["dimensions"] = [];

    const dim = (
      label: string,
      extractor: (c: ControllerFeatureSet) => string | number | boolean,
      higherIsBetter?: boolean,
      notes?: string
    ) => {
      const values: Record<string, string | number | boolean> = {};
      for (const c of found) values[c.controller] = extractor(c);

      let winner: string | undefined;
      if (higherIsBetter !== undefined && found.length > 1) {
        let best: string | number | boolean | undefined;
        let bestName: string | undefined;
        for (const c of found) {
          const v = values[c.controller];
          if (typeof v === "number") {
            if (best === undefined || (higherIsBetter ? v > (best as number) : v < (best as number))) {
              best = v;
              bestName = c.controller;
            }
          } else if (typeof v === "boolean") {
            if (higherIsBetter && v === true && best !== true) { best = true; bestName = c.controller; }
          }
        }
        winner = bestName;
      }

      dimensions.push({ dimension: label, values, winner, notes });
    };

    dim("Family",             c => c.family);
    dim("Year Introduced",    c => c.year_introduced ?? 0, false);
    dim("Look-ahead Blocks",  c => c.features.look_ahead_blocks, true);
    dim("Max Axes",           c => c.features.max_axes, true);
    dim("Max Channels",       c => c.features.max_channels, true);
    dim("Max WCS",            c => c.features.max_wcs, true);
    dim("Max Tools",          c => c.features.max_tools, true);
    dim("HSM/Smoothing",      c => c.features.hsm_smoothing.supported ? `Yes — ${c.features.hsm_smoothing.code}` : "No");
    dim("AI Contour",         c => c.features.ai_contour.supported ? `Yes — ${c.features.ai_contour.code ?? ""}` : "No");
    dim("5-axis TCP",         c => c.features.tcp_rtcp.supported ? `Yes — ${c.features.tcp_rtcp.code}` : "No");
    dim("Tilted Workplane",   c => c.features.tilted_workplane.supported ? `Yes — ${c.features.tilted_workplane.code}` : "No");
    dim("Rigid Tapping",      c => c.features.rigid_tapping.supported ? c.features.rigid_tapping.code : "No");
    dim("Probing",            c => c.features.probing_cycles.supported ? (c.features.probing_cycles.type ?? "Yes") : "No");
    dim("Macro/Q-Param",      c => c.features.macro_programming.supported ? (c.features.macro_programming.type ?? "Yes") : "No");
    dim("Conversational",     c => c.features.conversational.supported ? (c.features.conversational.name ?? "Yes") : "No");
    dim("NURBS",              c => c.features.nurbs);
    dim("SSV",                c => c.features.ssv.supported ? (c.features.ssv.code ?? "Yes") : "No");
    dim("Thermal Comp",       c => c.features.thermal_comp.supported ? (c.features.thermal_comp.code ?? "Yes") : "No");
    dim("Collision Avoidance",c => c.features.collision_avoidance.supported ? (c.features.collision_avoidance.code ?? "Yes") : "No");
    dim("Adaptive Control",   c => c.features.adaptive_control.supported ? (c.features.adaptive_control.code ?? "Yes") : "No");
    dim("Max Program Size",   c => c.features.max_program_size ?? "Unknown");

    let recommendation: string | undefined;
    if (found.length >= 2) {
      const maxLookahead = found.reduce((a, b) =>
        a.features.look_ahead_blocks >= b.features.look_ahead_blocks ? a : b);
      const hasAICC = found.filter(c => c.features.ai_contour.supported);
      const has5Axis = found.filter(c => c.features.tcp_rtcp.supported);
      recommendation =
        `Best look-ahead: ${maxLookahead.controller} (${maxLookahead.features.look_ahead_blocks} blocks). ` +
        `AICC/AI-contour capable: ${hasAICC.map(c => c.controller).join(", ") || "none"}. ` +
        `5-axis TCP capable: ${has5Axis.map(c => c.controller).join(", ") || "none"}.` +
        (missing.length > 0 ? ` Note: could not find ${missing.join(", ")}.` : "");
    }

    return { controllers: found.map(c => c.controller), dimensions, recommendation };
  }

  // ── Action: get_feature_support ────────────────────────────────────────────

  /**
   * Query which controllers support a specific feature.
   * @param feature - Feature key, e.g. "tcp_rtcp", "ai_contour", "nurbs", "conversational"
   * @param family  - Optional filter by family: "fanuc" | "siemens" | "heidenhain" | "mazak" | "okuma"
   */
  getFeatureSupport(
    feature: string,
    family?: string
  ): FeatureSupportResult {
    const pool = family
      ? CONTROLLER_MATRIX.filter(c => c.family === family.toLowerCase())
      : CONTROLLER_MATRIX;

    const results: FeatureSupportResult["results"] = [];

    for (const c of pool) {
      const f = c.features as Record<string, unknown>;
      const val = f[feature];
      if (val === undefined) {
        results.push({
          controller: c.controller,
          family: c.family,
          supported: false,
          detail: "Feature key not recognized"
        });
        continue;
      }

      if (typeof val === "boolean") {
        results.push({ controller: c.controller, family: c.family, supported: val, detail: val ? "Yes" : "No" });
      } else if (typeof val === "object" && val !== null && "supported" in val) {
        const obj = val as { supported: boolean; code?: string; type?: string; name?: string; levels?: string[] };
        const detail = [
          obj.supported ? "Yes" : "No",
          obj.code ? `code: ${obj.code}` : "",
          obj.type ? `type: ${obj.type}` : "",
          obj.name ? `name: ${obj.name}` : "",
          obj.levels ? `levels: ${obj.levels.join(" / ")}` : ""
        ].filter(Boolean).join(" | ");
        results.push({ controller: c.controller, family: c.family, supported: obj.supported, detail });
      } else if (typeof val === "number") {
        results.push({ controller: c.controller, family: c.family, supported: val > 0, detail: String(val) });
      } else {
        results.push({ controller: c.controller, family: c.family, supported: false, detail: String(val) });
      }
    }

    const supportedCount = results.filter(r => r.supported).length;
    const summary =
      `${supportedCount}/${results.length} controllers support "${feature}"` +
      (family ? ` (filtered to family: ${family})` : "") + ".";

    return { feature, results, summary };
  }

  // ── Action: list_controllers ───────────────────────────────────────────────

  /**
   * List all available controller variants, optionally filtered by family.
   */
  listControllers(family?: string): {
    total: number;
    controllers: Array<{ controller: string; family: string; variant: string; year_introduced?: number }>;
  } {
    const pool = family
      ? CONTROLLER_MATRIX.filter(c => c.family === family.toLowerCase())
      : CONTROLLER_MATRIX;

    return {
      total: pool.length,
      controllers: pool.map(c => ({
        controller: c.controller,
        family: c.family,
        variant: c.variant,
        year_introduced: c.year_introduced
      }))
    };
  }

  // ── Action: get_family_summary ─────────────────────────────────────────────

  /**
   * Get a summary of capability range and differentiating features for a family.
   * @param family - "fanuc" | "siemens" | "heidenhain" | "mazak" | "okuma"
   */
  getFamilySummary(family: string): FamilySummary | { error: string } {
    const pool = CONTROLLER_MATRIX.filter(c => c.family === family.toLowerCase());
    if (pool.length === 0) {
      return { error: `No controllers found for family: "${family}". Valid: fanuc, siemens, heidenhain, mazak, okuma` };
    }

    const allHasAI   = pool.every(c => c.features.ai_contour.supported);
    const someHasAI  = pool.some(c => c.features.ai_contour.supported);
    const allHasTCP  = pool.every(c => c.features.tcp_rtcp.supported);
    const someHasTCP = pool.some(c => c.features.tcp_rtcp.supported);
    const allHasConv = pool.every(c => c.features.conversational.supported);

    const common_features: string[] = [];
    if (pool.every(c => c.features.rigid_tapping.supported)) common_features.push("Rigid tapping");
    if (pool.every(c => c.features.helical))                 common_features.push("Helical interpolation");
    if (pool.every(c => c.features.subprograms.supported))   common_features.push("Subprograms");
    if (pool.every(c => c.features.probing_cycles.supported)) common_features.push("Probing cycles");
    if (allHasTCP)  common_features.push("5-axis TCP");
    if (allHasAI)   common_features.push("AI contour control");
    if (allHasConv) common_features.push("Conversational programming");

    const differentiating_features: string[] = [];
    if (someHasAI && !allHasAI)  differentiating_features.push("AI contour control (select variants only)");
    if (someHasTCP && !allHasTCP) differentiating_features.push("5-axis TCP (select variants only)");

    const lookaheads = pool.map(c => c.features.look_ahead_blocks);
    const minLA = Math.min(...lookaheads);
    const maxLA = Math.max(...lookaheads);
    const years = pool.map(c => c.year_introduced).filter(Boolean) as number[];
    const yearRange = years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "various";

    const capability_range =
      `Look-ahead: ${minLA}–${maxLA} blocks | ` +
      `Max axes: ${Math.min(...pool.map(c => c.features.max_axes))}–${Math.max(...pool.map(c => c.features.max_axes))} | ` +
      `Max WCS: ${Math.min(...pool.map(c => c.features.max_wcs))}–${Math.max(...pool.map(c => c.features.max_wcs))} | ` +
      `Introduced: ${yearRange}`;

    return {
      family: family.toLowerCase(),
      variant_count: pool.length,
      variants: pool.map(c => c.controller),
      common_features,
      differentiating_features,
      capability_range
    };
  }

  // ── Convenience: list all families ────────────────────────────────────────

  listFamilies(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of CONTROLLER_MATRIX) {
      if (!seen.has(c.family)) { seen.add(c.family); result.push(c.family); }
    }
    return result;
  }

  // ── Convenience: total count ───────────────────────────────────────────────

  get count(): number {
    return CONTROLLER_MATRIX.length;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const controllerFeatureMatrixEngine = new ControllerFeatureMatrixEngineImpl();
export { ControllerFeatureMatrixEngineImpl };
