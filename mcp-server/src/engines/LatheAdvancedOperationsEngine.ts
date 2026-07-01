/**
 * LatheAdvancedOperationsEngine — Advanced Lathe Operations Intelligence
 * ========================================================================
 * Comprehensive coverage of specialized and advanced lathe operations:
 *
 *   Live Tooling Operations:
 *   - C-axis milling and contouring
 *   - Cross-drilling and cross-tapping
 *   - Polygon turning
 *   - Keyway milling
 *   - Hex/flat milling
 *
 *   Specialized Turning:
 *   - Eccentric turning
 *   - Contour turning
 *   - Form turning
 *   - Taper turning
 *   - Spherical turning
 *
 *   Advanced Threading:
 *   - Multi-start threads
 *   - Whirling threads
 *   - Thread chasing
 *   - Variable pitch threads
 *   - API/ACME/Buttress threads
 *
 *   Complex Grooving:
 *   - Multi-groove strategies
 *   - Face grooving
 *   - ID grooving
 *   - Seal grooves (O-ring)
 *   - Snap ring grooves
 *
 * @module engines/LatheAdvancedOperationsEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-14
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Live tooling operation types */
export type LiveToolingOperation =
  | "c_axis_milling"
  | "cross_drilling"
  | "cross_tapping"
  | "polygon_turning"
  | "keyway_milling"
  | "hex_milling"
  | "flat_milling"
  | "engraving"
  | "helical_interpolation";

/** Thread form types */
export type ThreadForm =
  | "unified"       // UN, UNC, UNF
  | "metric"        // M, MF
  | "acme"          // Power transmission
  | "buttress"      // One-sided load
  | "api"           // Oil/gas
  | "npt"           // Tapered pipe
  | "whitworth"     // BSW, BSF
  | "trapezoidal";  // Tr (DIN 103)

/** Groove type */
export type GrooveType =
  | "od_groove"
  | "id_groove"
  | "face_groove"
  | "o_ring"
  | "snap_ring"
  | "seal_groove"
  | "thread_relief"
  | "undercut";

/** Live tooling parameters */
export interface LiveToolingParams {
  operation: LiveToolingOperation;
  spindle_orientation_deg?: number;
  live_tool_rpm: number;
  feature_depth_mm: number;
  feature_width_mm?: number;
  number_of_features?: number;
  angular_spacing_deg?: number;
}

/** Live tooling result */
export interface LiveToolingResult {
  operation: LiveToolingOperation;
  machine_requirements: string[];
  spindle_mode: "index" | "interpolate" | "synchronized";
  recommended_parameters: {
    live_tool_rpm: number;
    feed_mm_rev: number;
    depth_per_pass_mm: number;
  };
  programming_notes: string[];
  tooling_recommendations: string[];
  cycle_considerations: string[];
  collision_warnings: string[];
}

/** Polygon turning parameters */
export interface PolygonTurningParams {
  number_of_flats: number;
  flat_width_mm: number;
  corner_radius_mm?: number;
  material: string;
  part_diameter_mm: number;
}

/** Polygon turning result */
export interface PolygonTurningResult {
  feasible: boolean;
  method: "synchronized" | "y_axis" | "special_tooling";
  speed_ratio: number;  // Tool RPM / Spindle RPM
  spindle_rpm: number;
  live_tool_rpm: number;
  feed_mm_rev: number;
  passes_required: number;
  programming_approach: string;
  special_considerations: string[];
  alternative_methods: string[];
}

/** Advanced threading parameters */
export interface AdvancedThreadParams {
  thread_form: ThreadForm;
  pitch_mm: number;
  diameter_mm: number;
  length_mm: number;
  starts?: number;      // Multi-start
  lead_mm?: number;     // For multi-start
  taper_deg?: number;   // For tapered threads
  depth_mm?: number;    // Thread depth
  class_fit?: string;   // 2A, 3A, etc.
}

/** Advanced threading result */
export interface AdvancedThreadResult {
  thread_form: ThreadForm;
  infeed_method: "radial" | "flank" | "modified_flank" | "incremental";
  total_passes: number;
  doc_per_pass: number[];
  spindle_rpm: number;
  pitch_mm: number;
  thread_depth_mm: number;
  entry_angle_deg?: number;
  programming_notes: string[];
  inspection_notes: string[];
  common_issues: string[];
  tool_selection: {
    insert_type: string;
    holder_type: string;
    grade_recommendation: string;
  };
}

/** Grooving parameters */
export interface GroovingParams {
  groove_type: GrooveType;
  width_mm: number;
  depth_mm: number;
  diameter_mm: number;
  material: string;
  quantity?: number;
  spacing_mm?: number;
}

/** Grooving result */
export interface GroovingResult {
  groove_type: GrooveType;
  plunge_method: "straight" | "oscillating" | "ramping";
  tool_width_mm: number;
  number_of_plunges: number;
  plunge_feed_mm_rev: number;
  pecking_recommended: boolean;
  peck_depth_mm?: number;
  coolant_strategy: string;
  chip_control_notes: string[];
  finish_considerations: string[];
  tool_recommendations: string[];
}

/** Eccentric turning parameters */
export interface EccentricParams {
  offset_mm: number;
  diameter_mm: number;
  length_mm: number;
  material: string;
  finish_ra?: number;
}

/** Eccentric turning result */
export interface EccentricResult {
  method: "offset_tailstock" | "four_jaw" | "eccentric_chuck" | "y_axis";
  setup_procedure: string[];
  balancing_required: boolean;
  max_safe_rpm: number;
  counterweight_notes: string[];
  programming_approach: string;
  tolerance_considerations: string[];
}

/** Contour turning parameters */
export interface ContourParams {
  profile_type: "convex" | "concave" | "complex" | "spherical";
  radius_mm?: number;
  roughing_allowance_mm: number;
  finish_allowance_mm: number;
  material: string;
}

/** Contour turning result */
export interface ContourResult {
  profile_type: string;
  roughing_strategy: string;
  finishing_strategy: string;
  tool_nose_radius_mm: number;
  constant_surface_speed: boolean;
  min_rpm: number;
  max_rpm: number;
  feed_mm_rev: number;
  stepover_mm: number;
  programming_notes: string[];
  surface_finish_tips: string[];
}

// ============================================================================
// OPERATION KNOWLEDGE BASES
// ============================================================================

/** Polygon configurations */
const POLYGON_RATIOS: Record<number, { ratio: number; method: string }> = {
  3: { ratio: 2 / 3, method: "synchronized" },
  4: { ratio: 3 / 4, method: "synchronized" },
  5: { ratio: 4 / 5, method: "synchronized" },
  6: { ratio: 5 / 6, method: "synchronized" },
  8: { ratio: 7 / 8, method: "synchronized" },
};

/** Thread form specifications */
const THREAD_SPECS: Record<ThreadForm, {
  included_angle_deg: number;
  depth_factor: number;
  typical_infeed: "radial" | "flank" | "modified_flank";
  notes: string[];
}> = {
  unified: {
    included_angle_deg: 60,
    depth_factor: 0.6134,
    typical_infeed: "modified_flank",
    notes: ["Use 29-30° flank angle", "Watch for burr formation on crest"],
  },
  metric: {
    included_angle_deg: 60,
    depth_factor: 0.6134,
    typical_infeed: "modified_flank",
    notes: ["Same geometry as Unified", "Pitch in mm"],
  },
  acme: {
    included_angle_deg: 29,
    depth_factor: 0.5,
    typical_infeed: "flank",
    notes: ["Power transmission thread", "Wide flat on crest and root", "Use ACME-specific insert"],
  },
  buttress: {
    included_angle_deg: 45,
    depth_factor: 0.6627,
    typical_infeed: "radial",
    notes: ["Load-bearing side is steep (7°)", "Pressure angle side is 45°", "Direction-specific"],
  },
  api: {
    included_angle_deg: 60,
    depth_factor: 0.866,
    typical_infeed: "modified_flank",
    notes: ["Oil/gas industry", "Tight tolerances", "Specific gauge requirements"],
  },
  npt: {
    included_angle_deg: 60,
    depth_factor: 0.8,
    typical_infeed: "modified_flank",
    notes: ["Tapered 1.79°", "Sealing thread", "Count threads past flush"],
  },
  whitworth: {
    included_angle_deg: 55,
    depth_factor: 0.6403,
    typical_infeed: "modified_flank",
    notes: ["British standard", "Rounded crests and roots", "Legacy applications"],
  },
  trapezoidal: {
    included_angle_deg: 30,
    depth_factor: 0.5,
    typical_infeed: "flank",
    notes: ["Lead screw thread", "30° included angle", "Similar to ACME but metric"],
  },
};

/** O-ring groove standards (AS568) */
const ORING_GROOVE_SPECS: Record<string, { gland_depth_mm: number; width_mm: number; bottom_radius_mm: number }> = {
  "static_face": { gland_depth_mm: 0.95, width_mm: 1.78, bottom_radius_mm: 0.25 },
  "static_axial": { gland_depth_mm: 1.07, width_mm: 1.78, bottom_radius_mm: 0.25 },
  "dynamic_piston": { gland_depth_mm: 1.27, width_mm: 2.29, bottom_radius_mm: 0.38 },
  "dynamic_rod": { gland_depth_mm: 1.27, width_mm: 2.29, bottom_radius_mm: 0.38 },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheAdvancedOperationsEngine {

  /**
   * Get parameters for live tooling operation.
   */
  getLiveToolingParams(params: LiveToolingParams): LiveToolingResult {
    log.info(`[LatheAdvancedOps] Live tooling: ${params.operation}`);

    const result: LiveToolingResult = {
      operation: params.operation,
      machine_requirements: [],
      spindle_mode: "index",
      recommended_parameters: {
        live_tool_rpm: params.live_tool_rpm,
        feed_mm_rev: 0.1,
        depth_per_pass_mm: params.feature_depth_mm < 3 ? params.feature_depth_mm : 1.5,
      },
      programming_notes: [],
      tooling_recommendations: [],
      cycle_considerations: [],
      collision_warnings: [],
    };

    switch (params.operation) {
      case "c_axis_milling":
        result.machine_requirements = ["C-axis", "Live tooling", "Spindle lock or servo"];
        result.spindle_mode = "interpolate";
        result.recommended_parameters.feed_mm_rev = 0.08;
        result.programming_notes.push(
          "Use G12.1 for polar interpolation",
          "Monitor surface speed at varying radii",
          "Consider climb vs conventional based on rigidity"
        );
        result.tooling_recommendations.push(
          "End mill with short stick-out",
          "Carbide with TiAlN coating",
          "Consider indexable for larger features"
        );
        break;

      case "cross_drilling":
        result.machine_requirements = ["Live tooling", "C-axis indexing"];
        result.spindle_mode = "index";
        result.recommended_parameters.feed_mm_rev = 0.12;
        result.programming_notes.push(
          "Ensure spindle is locked before drilling",
          "Use peck cycle for deep holes (> 3xD)",
          "Consider spot drill for accuracy"
        );
        result.tooling_recommendations.push(
          "Solid carbide drill",
          "Through-coolant for deep holes",
          "Stub length for rigidity when possible"
        );
        result.collision_warnings.push(
          "Check clearance to chuck jaws",
          "Verify turret won't hit tailstock"
        );
        break;

      case "cross_tapping":
        result.machine_requirements = ["Live tooling", "C-axis", "Rigid tapping or floating holder"];
        result.spindle_mode = "index";
        result.recommended_parameters.feed_mm_rev = params.feature_depth_mm;  // = pitch
        result.programming_notes.push(
          "Match feed to pitch exactly",
          "Use G84 with rigid tapping or G184 with floating",
          "Start speed low, increase as proven"
        );
        result.tooling_recommendations.push(
          "Spiral flute tap for blind holes",
          "Spiral point tap for through holes",
          "Form tap for ductile materials"
        );
        break;

      case "polygon_turning":
        result.machine_requirements = ["C-axis with interpolation", "Live tooling", "High spindle sync accuracy"];
        result.spindle_mode = "synchronized";
        result.programming_notes.push(
          "Speed ratio determines number of flats",
          "Both spindles must be servo-controlled",
          "Use manufacturer's polygon macro if available"
        );
        break;

      case "keyway_milling":
        result.machine_requirements = ["C-axis", "Live tooling", "Y-axis preferred"];
        result.spindle_mode = "index";
        result.recommended_parameters.feed_mm_rev = 0.05;
        result.recommended_parameters.depth_per_pass_mm = 0.5;
        result.programming_notes.push(
          "Mill full depth in multiple passes",
          "Use slot mill or end mill sized to keyway",
          "Consider pecking for deep keyways"
        );
        result.tooling_recommendations.push(
          "Slot mill matching keyway width",
          "Carbide with TiAlN for steel",
          "2-3 flute for chip evacuation"
        );
        break;

      case "hex_milling":
        result.machine_requirements = ["C-axis", "Live tooling"];
        result.spindle_mode = "index";
        result.recommended_parameters.depth_per_pass_mm = 1.0;
        result.programming_notes.push(
          "Mill each flat with C-axis indexed 60°",
          "Use facing approach or climb milling",
          "Deburr between flats if needed"
        );
        result.cycle_considerations.push(
          "6 index positions required",
          "Consider combined roughing/finishing cycle"
        );
        break;

      case "flat_milling":
        result.machine_requirements = ["C-axis", "Live tooling"];
        result.spindle_mode = "index";
        result.programming_notes.push(
          "Index to each flat position",
          "Use face mill or end mill",
          "Control depth for parallelism"
        );
        break;

      case "engraving":
        result.machine_requirements = ["C-axis", "Live tooling", "High RPM spindle preferred"];
        result.spindle_mode = "interpolate";
        result.recommended_parameters.live_tool_rpm = Math.max(params.live_tool_rpm, 8000);
        result.recommended_parameters.feed_mm_rev = 0.02;
        result.recommended_parameters.depth_per_pass_mm = 0.1;
        result.programming_notes.push(
          "Use spring-loaded or drag engraving tool",
          "Small step-down for clean lines",
          "Consider fill patterns for large text"
        );
        break;

      case "helical_interpolation":
        result.machine_requirements = ["C-axis", "Live tooling", "Z + C simultaneous"];
        result.spindle_mode = "interpolate";
        result.programming_notes.push(
          "Use G02/G03 with Z increment per revolution",
          "Monitor helix angle for chip formation",
          "Useful for thread milling or spiral grooves"
        );
        break;
    }

    return result;
  }

  /**
   * Calculate polygon turning parameters.
   */
  getPolygonTurningParams(params: PolygonTurningParams): PolygonTurningResult {
    log.info(`[LatheAdvancedOps] Polygon turning: ${params.number_of_flats} flats`);

    const polygonInfo = POLYGON_RATIOS[params.number_of_flats];

    if (!polygonInfo) {
      return {
        feasible: false,
        method: "y_axis",
        speed_ratio: 0,
        spindle_rpm: 0,
        live_tool_rpm: 0,
        feed_mm_rev: 0,
        passes_required: 0,
        programming_approach: "Synchronized polygon not available for this number of flats",
        special_considerations: ["Consider Y-axis milling each flat individually"],
        alternative_methods: ["Y-axis milling", "Special polygon attachment", "Rotary broaching"],
      };
    }

    // Calculate speeds based on material
    let baseSpindleRpm = 300;  // Default
    if (params.material.toLowerCase().includes("aluminum")) {
      baseSpindleRpm = 800;
    } else if (params.material.toLowerCase().includes("steel")) {
      baseSpindleRpm = 300;
    }

    const liveToolRpm = Math.round(baseSpindleRpm / polygonInfo.ratio);

    // Calculate passes based on depth
    const depthPerFlat = (params.part_diameter_mm - params.flat_width_mm) / 2;
    const passesRequired = Math.ceil(depthPerFlat / 0.5);  // 0.5mm per pass

    return {
      feasible: true,
      method: "synchronized",
      speed_ratio: polygonInfo.ratio,
      spindle_rpm: baseSpindleRpm,
      live_tool_rpm: liveToolRpm,
      feed_mm_rev: 0.15,
      passes_required: passesRequired,
      programming_approach: `Synchronized polygon cutting: Main spindle at ${baseSpindleRpm} RPM, ` +
        `live tool at ${liveToolRpm} RPM (ratio ${params.number_of_flats - 1}:${params.number_of_flats})`,
      special_considerations: [
        "Both spindles must have precise speed control",
        "Start conservative and increase speed as proven",
        "Tool must have clearance behind cutting edge",
        params.corner_radius_mm
          ? `Corner radius ${params.corner_radius_mm}mm will affect polygon accuracy`
          : "Sharp corners require sharp tool geometry",
      ],
      alternative_methods: [
        "Y-axis milling (more flexible but slower)",
        "Rotary broaching (for external polygons)",
        "Dedicated polygon attachment",
      ],
    };
  }

  /**
   * Get advanced threading parameters.
   */
  getAdvancedThreadingParams(params: AdvancedThreadParams): AdvancedThreadResult {
    log.info(`[LatheAdvancedOps] Threading: ${params.thread_form}, ${params.pitch_mm}mm pitch`);

    const spec = THREAD_SPECS[params.thread_form];

    // Calculate thread depth
    const threadDepth = params.depth_mm ?? (params.pitch_mm * spec.depth_factor);

    // Calculate number of passes using constant-area approach
    const areaPerPass = 0.15;  // mm² typical
    let remainingDepth = threadDepth;
    const docPerPass: number[] = [];
    let pass = 1;

    while (remainingDepth > 0.02) {
      const doc = Math.min(
        Math.sqrt(areaPerPass * 2 / Math.tan((spec.included_angle_deg / 2) * Math.PI / 180)),
        remainingDepth
      );
      docPerPass.push(Math.round(doc * 1000) / 1000);
      remainingDepth -= doc;
      pass++;
      if (pass > 20) break;  // Safety limit
    }

    // Calculate spindle RPM for reasonable feed
    const spindleRpm = Math.round(1000 / params.pitch_mm) * 60;  // Target ~60 IPM equivalent
    const clampedRpm = Math.min(Math.max(spindleRpm, 200), 1500);

    // Multi-start handling
    const starts = params.starts ?? 1;
    const lead = params.lead_mm ?? params.pitch_mm * starts;

    const result: AdvancedThreadResult = {
      thread_form: params.thread_form,
      infeed_method: spec.typical_infeed,
      total_passes: docPerPass.length * starts,  // Multiply by starts
      doc_per_pass: docPerPass,
      spindle_rpm: clampedRpm,
      pitch_mm: params.pitch_mm,
      thread_depth_mm: threadDepth,
      programming_notes: [],
      inspection_notes: [],
      common_issues: [],
      tool_selection: {
        insert_type: "",
        holder_type: "",
        grade_recommendation: "",
      },
    };

    // Thread form specific notes
    result.programming_notes.push(...spec.notes);

    if (starts > 1) {
      result.programming_notes.push(
        `Multi-start thread: ${starts} starts, lead = ${lead}mm`,
        "Index spindle between each start",
        "Program lead (not pitch) in threading cycle"
      );
    }

    if (params.taper_deg) {
      result.programming_notes.push(
        `Tapered thread: ${params.taper_deg}° (${Math.tan(params.taper_deg * Math.PI / 180) * 25.4} in/ft)`,
        "Use compound slide angle or programmed taper"
      );
    }

    // Infeed method notes
    switch (spec.typical_infeed) {
      case "radial":
        result.programming_notes.push("Radial infeed: simple but higher forces");
        break;
      case "flank":
        result.programming_notes.push("Flank infeed: better chip control, use 29-30° angle");
        break;
      case "modified_flank":
        result.programming_notes.push("Modified flank: 29.5° infeed for balanced load");
        break;
    }

    // Tool selection based on form
    switch (params.thread_form) {
      case "unified":
      case "metric":
        result.tool_selection = {
          insert_type: "60° V-profile (full/partial profile)",
          holder_type: "Internal or external holder to match",
          grade_recommendation: "Coated carbide (GC1020, GC1030)",
        };
        break;
      case "acme":
      case "trapezoidal":
        result.tool_selection = {
          insert_type: "29°/30° trapezoid profile",
          holder_type: "ACME/Tr specific holder",
          grade_recommendation: "Uncoated or TiN coated",
        };
        break;
      case "api":
        result.tool_selection = {
          insert_type: "API profile insert",
          holder_type: "API threading holder",
          grade_recommendation: "Premium grade for tight tolerances",
        };
        break;
      default:
        result.tool_selection = {
          insert_type: `${spec.included_angle_deg}° profile insert`,
          holder_type: "Standard threading holder",
          grade_recommendation: "Coated carbide",
        };
    }

    // Inspection notes
    result.inspection_notes = [
      "Check pitch diameter with thread micrometer or wires",
      "Verify thread profile with optical comparator",
      `Gauge with ${params.class_fit || "appropriate"} GO/NO-GO gauges`,
    ];

    // Common issues
    result.common_issues = [
      "Drunken thread from improper synchronization",
      "Torn threads from dull insert",
      "Depth variation from deflection",
    ];

    return result;
  }

  /**
   * Get grooving operation parameters.
   */
  getGroovingParams(params: GroovingParams): GroovingResult {
    log.info(`[LatheAdvancedOps] Grooving: ${params.groove_type}, ${params.width_mm}mm wide`);

    // Determine tool width (smaller than groove for multiple passes or exact for single)
    let toolWidth = params.width_mm;
    let numberOfPlunges = 1;

    if (params.width_mm > 4) {
      toolWidth = Math.min(3, params.width_mm / 2);
      numberOfPlunges = Math.ceil(params.width_mm / toolWidth);
    }

    const result: GroovingResult = {
      groove_type: params.groove_type,
      plunge_method: "straight",
      tool_width_mm: toolWidth,
      number_of_plunges: numberOfPlunges,
      plunge_feed_mm_rev: 0.05,
      pecking_recommended: params.depth_mm > params.width_mm * 2,
      coolant_strategy: "Flood coolant directly at groove",
      chip_control_notes: [],
      finish_considerations: [],
      tool_recommendations: [],
    };

    // Determine peck depth if pecking recommended
    if (result.pecking_recommended) {
      result.peck_depth_mm = params.depth_mm / 3;
    }

    // Groove type specific handling
    switch (params.groove_type) {
      case "o_ring":
        const oringSpec = ORING_GROOVE_SPECS["static_axial"];
        result.tool_width_mm = Math.min(toolWidth, oringSpec.width_mm);
        result.plunge_feed_mm_rev = 0.03;
        result.finish_considerations.push(
          `Gland depth: ${oringSpec.gland_depth_mm}mm ±0.05mm`,
          `Bottom radius: ${oringSpec.bottom_radius_mm}mm max`,
          "Surface finish Ra 1.6 or better for sealing",
          "No burrs or scratches in seal area"
        );
        result.tool_recommendations.push(
          "Ground precision grooving insert",
          "Full-radius bottom profile",
          "Sharp corners for clean shoulder"
        );
        break;

      case "snap_ring":
        result.finish_considerations.push(
          "Width tolerance typically ±0.05mm",
          "Square corners required",
          "Check snap ring catalog for exact dimensions"
        );
        break;

      case "thread_relief":
        result.finish_considerations.push(
          "Relief must clear thread root",
          "Width = 1-2 thread pitches",
          "Depth = thread depth + clearance"
        );
        break;

      case "face_groove":
        result.plunge_method = "ramping";
        result.plunge_feed_mm_rev = 0.04;
        result.chip_control_notes.push(
          "Chips tend to wrap - use high pressure coolant",
          "Consider intermittent cutting for chip breaking"
        );
        break;

      case "id_groove":
        result.plunge_feed_mm_rev = 0.03;
        result.chip_control_notes.push(
          "Chip evacuation critical in bore",
          "Use through-coolant boring bar",
          "May need pecking for deep grooves"
        );
        result.tool_recommendations.push(
          "Boring bar with internal coolant",
          "Anti-vibration bar for deep bores"
        );
        break;

      default:
        // Standard OD groove
        result.plunge_feed_mm_rev = 0.05;
    }

    // Material-specific chip control
    if (params.material.toLowerCase().includes("stainless")) {
      result.chip_control_notes.push(
        "Stainless tends to work-harden - avoid dwelling",
        "Use positive rake geometry",
        "High-pressure coolant helps break chips"
      );
      result.plunge_feed_mm_rev *= 0.8;  // Slightly slower
    } else if (params.material.toLowerCase().includes("aluminum")) {
      result.chip_control_notes.push(
        "Aluminum may stick to tool - use polished insert",
        "Increase speed for better finish"
      );
    }

    // General tool recommendations
    result.tool_recommendations.push(
      `Grooving insert ${toolWidth}mm width`,
      "Positive geometry for light cuts",
      "Check tool stick-out doesn't exceed groove depth"
    );

    return result;
  }

  /**
   * Get eccentric turning parameters.
   */
  getEccentricParams(params: EccentricParams): EccentricResult {
    log.info(`[LatheAdvancedOps] Eccentric turning: ${params.offset_mm}mm offset`);

    // Determine best method based on offset magnitude
    const selectEccentricMethod = (offsetMm: number, diameterMm: number): EccentricResult["method"] => {
      if (offsetMm > diameterMm / 4) return "four_jaw";
      if (offsetMm < 2) return "offset_tailstock";
      return "eccentric_chuck";  // Or Y-axis if available
    };
    const method = selectEccentricMethod(params.offset_mm, params.diameter_mm);

    // Calculate safe RPM based on unbalance
    const unbalanceMass = params.offset_mm * params.diameter_mm * 0.1;  // Rough estimate
    const maxSafeRpm = Math.min(2000, Math.round(3000 / Math.sqrt(unbalanceMass)));

    const setupProcedures: Record<EccentricResult["method"], string[]> = {
      offset_tailstock: [
        "Mount workpiece between centers",
        `Offset tailstock ${params.offset_mm}mm from centerline`,
        "Verify offset with dial indicator",
        "Use driving dog or face driver",
      ],
      four_jaw: [
        `Set up in 4-jaw independent chuck`,
        `Dial in eccentric offset ${params.offset_mm}mm`,
        "Verify runout at both ends",
        "Mark orientation for repeatability",
        "Consider counterweight for high RPM",
      ],
      eccentric_chuck: [
        "Mount eccentric chuck on spindle",
        `Set eccentricity to ${params.offset_mm}mm`,
        "Verify with dial indicator",
        "Lock eccentric adjustment",
      ],
      y_axis: [
        "Program Y-axis offset for turning",
        `Y = ${params.offset_mm}mm during cut`,
        "Return Y to 0 for tailstock support",
        "No mechanical setup change needed",
      ],
    };

    return {
      method,
      setup_procedure: setupProcedures[method],
      balancing_required: params.offset_mm > 5 || maxSafeRpm > 1000,
      max_safe_rpm: maxSafeRpm,
      counterweight_notes: params.offset_mm > 5
        ? [
            "Add counterweight opposite eccentric",
            `Counterweight mass ≈ ${Math.round(unbalanceMass * 10) / 10}g at ${params.diameter_mm}mm radius`,
            "Verify balance before full speed",
          ]
        : ["Minor offset - counterweight optional"],
      programming_approach: method === "y_axis"
        ? "Use Y-axis interpolation with turning cycle"
        : "Standard turning with offset center",
      tolerance_considerations: [
        "Check eccentricity with V-blocks and indicator",
        "Runout = 2x eccentricity when checking on centers",
        params.finish_ra
          ? `Target finish Ra ${params.finish_ra} may require multiple passes`
          : "Monitor finish during interrupted cut",
      ],
    };
  }

  /**
   * Get contour turning parameters.
   */
  getContourParams(params: ContourParams): ContourResult {
    log.info(`[LatheAdvancedOps] Contour turning: ${params.profile_type}`);

    // Determine tool nose radius based on profile
    let noseRadius = 0.8;  // Default
    if (params.profile_type === "concave" && params.radius_mm && params.radius_mm < 5) {
      noseRadius = Math.max(0.2, params.radius_mm / 4);
    } else if (params.profile_type === "spherical") {
      noseRadius = Math.min(1.2, (params.radius_mm || 10) / 8);
    }

    // Stepover calculation
    const stepover = noseRadius * 0.3;  // 30% of nose radius for good finish

    // Speed limits for constant surface speed
    const minRpm = 200;
    const maxRpm = params.material.toLowerCase().includes("aluminum") ? 4000 : 2500;

    return {
      profile_type: params.profile_type,
      roughing_strategy: params.profile_type === "complex"
        ? "Multi-pass with decreasing allowance"
        : "Single-direction passes parallel to profile",
      finishing_strategy: params.profile_type === "spherical"
        ? "Constant surface speed with small stepover"
        : "Single finishing pass with CSS",
      tool_nose_radius_mm: noseRadius,
      constant_surface_speed: true,
      min_rpm: minRpm,
      max_rpm: maxRpm,
      feed_mm_rev: params.profile_type === "spherical" ? 0.08 : 0.12,
      stepover_mm: stepover,
      programming_notes: [
        `Use G96 (CSS) with S${Math.round((minRpm + maxRpm) / 2)} surface speed`,
        `G50 S${maxRpm} to clamp maximum RPM`,
        "Use cutter compensation (G41/G42) for accuracy",
        params.profile_type === "concave"
          ? "Check tool clearance in concave regions"
          : "Approach from Z+ for visibility",
      ],
      surface_finish_tips: [
        `TNR ${noseRadius}mm gives cusps every ${Math.round(stepover * 1000)}μm`,
        "Increase speed for better finish",
        "Reduce feed for critical finishes",
        params.profile_type === "spherical"
          ? "Ball-nose or round insert for best spherical finish"
          : "Standard 55° or 80° insert adequate",
      ],
    };
  }

  /**
   * List all supported advanced operations.
   */
  listAdvancedOperations(): {
    live_tooling: LiveToolingOperation[];
    thread_forms: ThreadForm[];
    groove_types: GrooveType[];
    contour_types: string[];
  } {
    return {
      live_tooling: [
        "c_axis_milling",
        "cross_drilling",
        "cross_tapping",
        "polygon_turning",
        "keyway_milling",
        "hex_milling",
        "flat_milling",
        "engraving",
        "helical_interpolation",
      ],
      thread_forms: [
        "unified",
        "metric",
        "acme",
        "buttress",
        "api",
        "npt",
        "whitworth",
        "trapezoidal",
      ],
      groove_types: [
        "od_groove",
        "id_groove",
        "face_groove",
        "o_ring",
        "snap_ring",
        "seal_groove",
        "thread_relief",
        "undercut",
      ],
      contour_types: ["convex", "concave", "complex", "spherical"],
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAdvancedOperationsEngine = new LatheAdvancedOperationsEngine();
