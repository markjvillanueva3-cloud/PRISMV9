/**
 * PRISM MCP Server - Toolpath & CAM Calculations
 * Toolpath strategy calculations for CNC machining
 * 
 * Models Implemented:
 * - Engagement Angle Calculations
 * - Trochoidal/Adaptive Clearing Parameters
 * - HSM (High-Speed Machining) Strategies
 * - Scallop Height Prediction
 * - Stepover Optimization
 * - Cycle Time Estimation
 * - Arc Fitting & Tolerance
 * - Toolpath Smoothing Parameters
 * 
 * Used for CAM programming and toolpath optimization
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EngagementResult {
  entry_angle: number;          // degrees
  exit_angle: number;           // degrees
  arc_of_engagement: number;    // degrees
  average_chip_thickness: number; // mm
  max_chip_thickness: number;   // mm
  radial_engagement_percent: number;
  is_climb_milling: boolean;
  effective_cutting_speed: number; // m/min (adjusted for engagement)
  warnings: string[];
}

export interface TrochoidalParams {
  trochoidal_width: number;     // mm (stepover in trochoidal)
  trochoidal_pitch: number;     // mm (forward step per loop)
  arc_radius: number;           // mm
  helix_angle: number;          // degrees
  optimal_feed_rate: number;    // mm/min
  optimal_spindle: number;      // rpm
  engagement_percent: number;   // %
  max_engagement_deg: number;   // degrees — max cutter engagement angle
  mrr: number;                  // cm³/min
  warnings: string[];
}

export interface HSMParams {
  corner_radius: number;        // mm (minimum corner radius)
  max_direction_change: number; // degrees
  smoothing_tolerance: number;  // mm
  arc_fitting_tolerance: number; // mm
  feed_rate_reduction: number;  // % at corners
  recommended_lead_in: string;  // arc/linear/helix
  chip_thinning_factor: number;
  warnings: string[];
}

export interface ScallopResult {
  scallop_height: number;       // mm (cusp height)
  stepover: number;             // mm
  theoretical_Ra: number;       // μm (surface roughness estimate)
  passes_required: number;      // number of passes
  total_toolpath_length: number; // mm
  machining_time: number;       // min
  warnings: string[];
}

export interface CycleTimeResult {
  cutting_time: number;         // min
  rapid_time: number;           // min
  tool_change_time: number;     // min
  total_time: number;           // min
  cutting_distance: number;     // mm
  rapid_distance: number;       // mm
  utilization_percent: number;  // % time actually cutting
  warnings: string[];
}

export interface StepoverResult {
  optimal_stepover: number;     // mm
  stepover_percent: number;     // % of tool diameter
  scallop_height: number;       // mm
  number_of_passes: number;
  overlap_percent: number;      // % overlap between passes
  strategy: string;             // recommended strategy
  warnings: string[];
}

export interface ArcFitResult {
  arc_segments: number;
  chord_error: number;          // mm
  effective_feedrate: number;   // mm/min (limited by controller)
  block_processing_time: number; // ms per block
  recommended_tolerance: number; // mm
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CAM_CONSTANTS = {
  // Engagement limits
  MAX_ENGAGEMENT_ROUGHING: 70,    // % for roughing
  MAX_ENGAGEMENT_FINISHING: 40,   // % for finishing
  OPTIMAL_ENGAGEMENT_HSM: 10,     // % for HSM
  
  // Trochoidal defaults
  TROCHOIDAL_ENGAGEMENT: 8,       // % typical
  TROCHOIDAL_WIDTH_FACTOR: 0.1,   // × tool diameter
  
  // HSM limits
  HSM_MIN_CORNER_RADIUS: 0.5,     // mm
  HSM_MAX_DIRECTION_CHANGE: 45,   // degrees
  
  // Controller limits
  BLOCK_PROCESSING_TIME: 1,       // ms typical
  MIN_SEGMENT_LENGTH: 0.01,       // mm
  
  // Rapid rates (typical)
  RAPID_RATE_XY: 30000,           // mm/min
  RAPID_RATE_Z: 15000             // mm/min
};

// ============================================================================
// TOOLPATH SOURCE FILE CATALOG (109 MEDIUM-priority extracted JS modules)
// Wired from MASTER_EXTRACTION_INDEX_V2.json — 70,908 total source lines
// Categories: algorithms (52), engines/cad_cam (55), engines (2)
// ============================================================================

export interface ToolpathSourceFileEntry {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "MEDIUM";
  description: string;
  toolpath_role: string;
}

export const TOOLPATH_SOURCE_FILE_CATALOG: Record<string, ToolpathSourceFileEntry> = {
  // --- Algorithms (52) ---
  "EXT-001": { filename: "ALGORITHM_LIBRARY.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 2213, safety_class: "MEDIUM", description: "Core algorithm library for manufacturing computations", toolpath_role: "algorithm" },
  "EXT-002": { filename: "COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 2213, safety_class: "MEDIUM", description: "Complete toolpath algorithm collection", toolpath_role: "algorithm" },
  "EXT-003": { filename: "PRISM_ACO_SEQUENCER.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 5383, safety_class: "MEDIUM", description: "Ant colony optimization for operation sequencing", toolpath_role: "algorithm" },
  "EXT-004": { filename: "PRISM_ADVANCED_INTERPOLATION.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 176, safety_class: "MEDIUM", description: "Advanced interpolation methods for toolpaths", toolpath_role: "algorithm" },
  "EXT-005": { filename: "PRISM_ALGORITHM_ENSEMBLER.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 182, safety_class: "MEDIUM", description: "Algorithm ensemble coordination and voting", toolpath_role: "algorithm" },
  "EXT-006": { filename: "PRISM_ALGORITHM_ORCHESTRATOR.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 225, safety_class: "MEDIUM", description: "Algorithm orchestration and pipeline management", toolpath_role: "algorithm" },
  "EXT-007": { filename: "PRISM_ALGORITHM_REGISTRY.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 3567, safety_class: "MEDIUM", description: "Algorithm registry and discovery service", toolpath_role: "algorithm" },
  "EXT-008": { filename: "PRISM_ALGORITHM_STRATEGIES.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 257, safety_class: "MEDIUM", description: "Strategic algorithm selection for machining", toolpath_role: "algorithm" },
  "EXT-009": { filename: "PRISM_BEZIER_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 111, safety_class: "MEDIUM", description: "Bezier curve evaluation and manipulation", toolpath_role: "algorithm" },
  "EXT-010": { filename: "PRISM_CONTROL_SYSTEMS_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 117, safety_class: "MEDIUM", description: "Control systems modeling for CNC machines", toolpath_role: "algorithm" },
  "EXT-011": { filename: "PRISM_CORE_ALGORITHMS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 616, safety_class: "MEDIUM", description: "Core algorithmic foundations for PRISM", toolpath_role: "algorithm" },
  "EXT-012": { filename: "PRISM_CRITICAL_ALGORITHM_INTEGRATION.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 188, safety_class: "MEDIUM", description: "Critical algorithm integration layer", toolpath_role: "algorithm" },
  "EXT-013": { filename: "PRISM_DFM_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 76, safety_class: "MEDIUM", description: "Design for manufacturability analysis", toolpath_role: "algorithm" },
  "EXT-014": { filename: "PRISM_DIGITAL_CONTROL_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 101, safety_class: "MEDIUM", description: "Digital control theory for CNC axes", toolpath_role: "algorithm" },
  "EXT-015": { filename: "PRISM_DS_SEARCH.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 102, safety_class: "MEDIUM", description: "Data structure-based search algorithms", toolpath_role: "algorithm" },
  "EXT-016": { filename: "PRISM_FFT_PREDICTIVE_CHATTER.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 330, safety_class: "MEDIUM", description: "FFT-based predictive chatter detection", toolpath_role: "algorithm" },
  "EXT-017": { filename: "PRISM_GRAPH.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 285, safety_class: "MEDIUM", description: "Graph data structures and traversal", toolpath_role: "algorithm" },
  "EXT-018": { filename: "PRISM_GRAPHICS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 660, safety_class: "MEDIUM", description: "Graphics rendering for toolpath visualization", toolpath_role: "algorithm" },
  "EXT-019": { filename: "PRISM_GRAPHICS_KERNEL_PASS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 171, safety_class: "MEDIUM", description: "Graphics kernel rendering pipeline pass", toolpath_role: "algorithm" },
  "EXT-020": { filename: "PRISM_GRAPHICS_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 276, safety_class: "MEDIUM", description: "MIT-licensed graphics utilities", toolpath_role: "algorithm" },
  "EXT-021": { filename: "PRISM_GRAPH_ALGORITHMS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 315, safety_class: "MEDIUM", description: "Graph algorithms for dependency resolution", toolpath_role: "algorithm" },
  "EXT-022": { filename: "PRISM_GRAPH_TOOLPATH.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 180, safety_class: "MEDIUM", description: "Graph-based toolpath sequencing and optimization", toolpath_role: "algorithm" },
  "EXT-023": { filename: "PRISM_JACOBIAN_ENGINE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 238, safety_class: "MEDIUM", description: "Jacobian computations for multi-axis kinematics", toolpath_role: "algorithm" },
  "EXT-024": { filename: "PRISM_JOHNSON_COOK_DATABASE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 158, safety_class: "MEDIUM", description: "Johnson-Cook material flow stress database", toolpath_role: "algorithm" },
  "EXT-025": { filename: "PRISM_KDTREE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 112, safety_class: "MEDIUM", description: "K-d tree spatial indexing for toolpath queries", toolpath_role: "algorithm" },
  "EXT-026": { filename: "PRISM_KNOWLEDGE_INTEGRATION_TESTS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 119, safety_class: "MEDIUM", description: "Knowledge base integration test suite", toolpath_role: "algorithm" },
  "EXT-027": { filename: "PRISM_LINALG_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 155, safety_class: "MEDIUM", description: "Linear algebra library for geometric transforms", toolpath_role: "algorithm" },
  "EXT-028": { filename: "PRISM_LOCAL_SEARCH.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 385, safety_class: "MEDIUM", description: "Local search optimization heuristics", toolpath_role: "algorithm" },
  "EXT-029": { filename: "PRISM_LP_SOLVERS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 131, safety_class: "MEDIUM", description: "Linear programming solvers for scheduling", toolpath_role: "algorithm" },
  "EXT-030": { filename: "PRISM_MANUFACTURING_ALGORITHMS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 101, safety_class: "MEDIUM", description: "Manufacturing-specific algorithm collection", toolpath_role: "algorithm" },
  "EXT-031": { filename: "PRISM_MANUFACTURING_SEARCH.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 141, safety_class: "MEDIUM", description: "Manufacturing knowledge search engine", toolpath_role: "algorithm" },
  "EXT-032": { filename: "PRISM_MANUFACTURING_SEARCH_ENGINE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 148, safety_class: "MEDIUM", description: "Enhanced manufacturing search with ranking", toolpath_role: "algorithm" },
  "EXT-033": { filename: "PRISM_MATH_FOUNDATIONS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 1730, safety_class: "MEDIUM", description: "Mathematical foundations for CAM computations", toolpath_role: "algorithm" },
  "EXT-034": { filename: "PRISM_MEMORY_EFFICIENT_SEARCH.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 160, safety_class: "MEDIUM", description: "Memory-efficient search for large datasets", toolpath_role: "algorithm" },
  "EXT-035": { filename: "PRISM_NUMERICAL.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 185, safety_class: "MEDIUM", description: "Numerical methods for engineering calculations", toolpath_role: "algorithm" },
  "EXT-036": { filename: "PRISM_NUMERICAL_METHODS_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 167, safety_class: "MEDIUM", description: "MIT-licensed numerical methods library", toolpath_role: "algorithm" },
  "EXT-037": { filename: "PRISM_NURBS_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 590, safety_class: "MEDIUM", description: "NURBS evaluation and refinement (MIT)", toolpath_role: "algorithm" },
  "EXT-038": { filename: "PRISM_OCTREE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 111, safety_class: "MEDIUM", description: "Octree spatial partitioning for 3D queries", toolpath_role: "algorithm" },
  "EXT-039": { filename: "PRISM_ODE_SOLVERS_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 6386, safety_class: "MEDIUM", description: "ODE solver suite for dynamic simulations", toolpath_role: "algorithm" },
  "EXT-040": { filename: "PRISM_OPTIMIZATION_ALGORITHMS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 195, safety_class: "MEDIUM", description: "Optimization algorithms for parameter tuning", toolpath_role: "algorithm" },
  "EXT-041": { filename: "PRISM_PHASE3_GRAPH_NEURAL.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 424, safety_class: "MEDIUM", description: "Graph neural network for feature recognition", toolpath_role: "algorithm" },
  "EXT-042": { filename: "PRISM_PHASE7_KNOWLEDGE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 2396, safety_class: "MEDIUM", description: "Phase 7 knowledge graph and reasoning", toolpath_role: "algorithm" },
  "EXT-043": { filename: "PRISM_POLICY_GRADIENT_ENGINE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 113, safety_class: "MEDIUM", description: "Policy gradient RL for adaptive machining", toolpath_role: "algorithm" },
  "EXT-044": { filename: "PRISM_RL_ALGORITHMS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 358, safety_class: "MEDIUM", description: "Reinforcement learning for process optimization", toolpath_role: "algorithm" },
  "EXT-045": { filename: "PRISM_SEARCH_ENHANCED.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 1961, safety_class: "MEDIUM", description: "Enhanced search with fuzzy matching", toolpath_role: "algorithm" },
  "EXT-046": { filename: "PRISM_SIGNAL_ALGORITHMS.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 375, safety_class: "MEDIUM", description: "Signal processing for sensor data analysis", toolpath_role: "algorithm" },
  "EXT-047": { filename: "PRISM_SORTING.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 122, safety_class: "MEDIUM", description: "Sorting algorithms for operation sequencing", toolpath_role: "algorithm" },
  "EXT-048": { filename: "PRISM_SPECTRAL_GRAPH_CAD.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 185, safety_class: "MEDIUM", description: "Spectral graph methods for CAD analysis", toolpath_role: "algorithm" },
  "EXT-049": { filename: "PRISM_SURFACE_GEOMETRY_MIT.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 173, safety_class: "MEDIUM", description: "Surface geometry computations (MIT)", toolpath_role: "algorithm" },
  "EXT-050": { filename: "PRISM_TAYLOR_ADVANCED.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 51, safety_class: "MEDIUM", description: "Advanced Taylor tool life modeling", toolpath_role: "algorithm" },
  "EXT-051": { filename: "PRISM_TAYLOR_LOOKUP.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 45, safety_class: "MEDIUM", description: "Taylor equation lookup tables", toolpath_role: "algorithm" },
  "EXT-052": { filename: "PRISM_TAYLOR_TOOL_LIFE.js", source_dir: "extracted/algorithms", category: "algorithms", lines: 98, safety_class: "MEDIUM", description: "Taylor tool life prediction engine", toolpath_role: "algorithm" },
  // --- CAD/CAM Engines (55) ---
  "EXT-176": { filename: "PRISM_ADAPTIVE_CLEARING_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 437, safety_class: "MEDIUM", description: "Adaptive clearing toolpath generation", toolpath_role: "cam-module" },
  "EXT-177": { filename: "PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 218, safety_class: "MEDIUM", description: "Adaptive mesh tessellation v2", toolpath_role: "cam-module" },
  "EXT-178": { filename: "PRISM_ADVANCED_BLADE_SURFACE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 484, safety_class: "MEDIUM", description: "Advanced blade and impeller surface machining", toolpath_role: "surface-machining" },
  "EXT-179": { filename: "PRISM_ADVANCED_SWEEP_LOFT_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 511, safety_class: "MEDIUM", description: "Sweep and loft surface generation", toolpath_role: "cam-module" },
  "EXT-180": { filename: "PRISM_BREP_CAD_GENERATOR_V2.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 1293, safety_class: "MEDIUM", description: "B-rep solid model generator v2", toolpath_role: "cam-module" },
  "EXT-181": { filename: "PRISM_BREP_TESSELLATOR.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 724, safety_class: "MEDIUM", description: "B-rep to mesh tessellation engine", toolpath_role: "cam-module" },
  "EXT-182": { filename: "PRISM_BSPLINE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 207, safety_class: "MEDIUM", description: "B-spline curve and surface evaluation", toolpath_role: "cam-module" },
  "EXT-183": { filename: "PRISM_BVH_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 6562, safety_class: "MEDIUM", description: "Bounding volume hierarchy for collision detection", toolpath_role: "cam-module" },
  "EXT-184": { filename: "PRISM_CAD_CAM_INTEGRATION_HUB.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 567, safety_class: "MEDIUM", description: "CAD/CAM data integration hub", toolpath_role: "cam-module" },
  "EXT-185": { filename: "PRISM_CAD_CONFIDENCE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 199, safety_class: "MEDIUM", description: "CAD model confidence scoring", toolpath_role: "cam-module" },
  "EXT-186": { filename: "PRISM_CAD_KERNEL_MIT.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 286, safety_class: "MEDIUM", description: "CAD geometric kernel (MIT)", toolpath_role: "cam-module" },
  "EXT-187": { filename: "PRISM_CAD_MATH.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 157, safety_class: "MEDIUM", description: "CAD mathematical utilities", toolpath_role: "cam-module" },
  "EXT-188": { filename: "PRISM_CAD_QUALITY_ASSURANCE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 335, safety_class: "MEDIUM", description: "CAD model quality assurance checks", toolpath_role: "cam-module" },
  "EXT-189": { filename: "PRISM_CAM_KERNEL_COMPLETE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 1237, safety_class: "MEDIUM", description: "Complete CAM processing kernel", toolpath_role: "cam-module" },
  "EXT-190": { filename: "PRISM_CAM_KERNEL_MIT.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 176, safety_class: "MEDIUM", description: "CAM kernel core functions (MIT)", toolpath_role: "cam-module" },
  "EXT-191": { filename: "PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 162, safety_class: "MEDIUM", description: "CAM toolpath parameter computation", toolpath_role: "toolpath-generation" },
  "EXT-192": { filename: "PRISM_CLIPPER2_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 1317, safety_class: "MEDIUM", description: "Clipper2 polygon boolean operations", toolpath_role: "cam-module" },
  "EXT-193": { filename: "PRISM_CONSTRUCTION_GEOMETRY_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 461, safety_class: "MEDIUM", description: "Construction geometry and datum management", toolpath_role: "cam-module" },
  "EXT-194": { filename: "PRISM_CURVATURE_ANALYSIS_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 319, safety_class: "MEDIUM", description: "Surface curvature analysis for machining", toolpath_role: "cam-module" },
  "EXT-195": { filename: "PRISM_ENHANCED_MILL_TURN_CAM_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 436, safety_class: "MEDIUM", description: "Enhanced mill-turn CAM operations", toolpath_role: "cam-module" },
  "EXT-196": { filename: "PRISM_ENHANCED_TOOLPATH_GENERATOR.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 390, safety_class: "MEDIUM", description: "Enhanced toolpath generation strategies", toolpath_role: "toolpath-generation" },
  "EXT-197": { filename: "PRISM_FEATURE_HISTORY_MANAGER.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 492, safety_class: "MEDIUM", description: "Feature tree history and rollback", toolpath_role: "cam-module" },
  "EXT-198": { filename: "PRISM_FEATURE_INTERACTION_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 879, safety_class: "MEDIUM", description: "Feature interaction detection and resolution", toolpath_role: "cam-module" },
  "EXT-199": { filename: "PRISM_FEATURE_RECOGNITION_ENHANCED.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 304, safety_class: "MEDIUM", description: "Enhanced manufacturing feature recognition", toolpath_role: "cam-module" },
  "EXT-200": { filename: "PRISM_FILLETING_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 408, safety_class: "MEDIUM", description: "Fillet and chamfer generation engine", toolpath_role: "cam-module" },
  "EXT-201": { filename: "PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 385, safety_class: "MEDIUM", description: "Sketch constraint solver engine", toolpath_role: "cam-module" },
  "EXT-202": { filename: "PRISM_GEODESIC_DISTANCE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 4050, safety_class: "MEDIUM", description: "Geodesic distance on mesh surfaces", toolpath_role: "cam-module" },
  "EXT-203": { filename: "PRISM_GEOMETRY_ALGORITHMS.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 386, safety_class: "MEDIUM", description: "Computational geometry algorithms", toolpath_role: "cam-module" },
  "EXT-204": { filename: "PRISM_INTELLIGENT_COLLISION_SYSTEM.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 153, safety_class: "MEDIUM", description: "Intelligent collision avoidance system", toolpath_role: "cam-module" },
  "EXT-205": { filename: "PRISM_ISOSURFACE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 227, safety_class: "MEDIUM", description: "Isosurface extraction (marching cubes)", toolpath_role: "surface-machining" },
  "EXT-206": { filename: "PRISM_LATHE_TOOLPATH_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 555, safety_class: "MEDIUM", description: "Lathe turning toolpath generation", toolpath_role: "toolpath-generation" },
  "EXT-207": { filename: "PRISM_MESH_DECIMATION_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 466, safety_class: "MEDIUM", description: "Mesh simplification and decimation", toolpath_role: "cam-module" },
  "EXT-208": { filename: "PRISM_MOTION_PLANNING_ENHANCED_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 344, safety_class: "MEDIUM", description: "Enhanced CNC motion planning", toolpath_role: "cam-module" },
  "EXT-209": { filename: "PRISM_MULTIAXIS_TOOLPATH_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 668, safety_class: "MEDIUM", description: "Multi-axis (3+2, 5-axis) toolpath engine", toolpath_role: "toolpath-generation" },
  "EXT-210": { filename: "PRISM_NURBS_ADVANCED_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 139, safety_class: "MEDIUM", description: "Advanced NURBS surface operations", toolpath_role: "cam-module" },
  "EXT-211": { filename: "PRISM_NURBS_LIBRARY.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 237, safety_class: "MEDIUM", description: "NURBS curve and surface library", toolpath_role: "cam-module" },
  "EXT-212": { filename: "PRISM_OFFSET_SURFACE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 121, safety_class: "MEDIUM", description: "Surface offset for tool compensation", toolpath_role: "surface-machining" },
  "EXT-213": { filename: "PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 266, safety_class: "MEDIUM", description: "Parametric CAD model enhancement", toolpath_role: "cam-module" },
  "EXT-214": { filename: "PRISM_REAL_CAD_PRIORITY_SYSTEM.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 80, safety_class: "MEDIUM", description: "CAD operation priority scheduler", toolpath_role: "cam-module" },
  "EXT-215": { filename: "PRISM_REAL_TOOLPATH_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 14, safety_class: "MEDIUM", description: "Real toolpath engine stub", toolpath_role: "toolpath-generation" },
  "EXT-216": { filename: "PRISM_REST_MACHINING_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 621, safety_class: "MEDIUM", description: "Rest machining and pencil finishing", toolpath_role: "cam-module" },
  "EXT-217": { filename: "PRISM_SIEMENS_5AXIS_CAM_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 295, safety_class: "MEDIUM", description: "Siemens 5-axis CAM post-processing", toolpath_role: "cam-module" },
  "EXT-218": { filename: "PRISM_SILHOUETTE_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 248, safety_class: "MEDIUM", description: "Silhouette curve extraction", toolpath_role: "cam-module" },
  "EXT-219": { filename: "PRISM_SKETCH_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 681, safety_class: "MEDIUM", description: "Parametric sketch engine", toolpath_role: "cam-module" },
  "EXT-220": { filename: "PRISM_SOLID_EDITING_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 550, safety_class: "MEDIUM", description: "Solid body editing operations", toolpath_role: "cam-module" },
  "EXT-221": { filename: "PRISM_SURFACE_INTERSECTION_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 126, safety_class: "MEDIUM", description: "Surface-surface intersection computation", toolpath_role: "surface-machining" },
  "EXT-222": { filename: "PRISM_SURFACE_RECONSTRUCTION_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 588, safety_class: "MEDIUM", description: "Surface reconstruction from point clouds", toolpath_role: "surface-machining" },
  "EXT-223": { filename: "PRISM_TOOLPATH_OPTIMIZATION.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 214, safety_class: "MEDIUM", description: "Toolpath optimization and smoothing", toolpath_role: "toolpath-generation" },
  "EXT-224": { filename: "PRISM_TOOLPATH_STRATEGIES_COMPLETE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 1048, safety_class: "MEDIUM", description: "Complete toolpath strategy library", toolpath_role: "toolpath-generation" },
  "EXT-225": { filename: "PRISM_TOPOLOGY_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 911, safety_class: "MEDIUM", description: "Topological operations for solid modeling", toolpath_role: "cam-module" },
  "EXT-226": { filename: "PRISM_UNIFIED_3D_VIEWPORT_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 935, safety_class: "MEDIUM", description: "Unified 3D viewport and scene management", toolpath_role: "cam-module" },
  "EXT-227": { filename: "PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 347, safety_class: "MEDIUM", description: "Unified toolpath strategy decision engine", toolpath_role: "toolpath-generation" },
  "EXT-228": { filename: "PRISM_V858_CAD_SYSTEM.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 66, safety_class: "MEDIUM", description: "V858 CAD system integration module", toolpath_role: "cam-module" },
  "EXT-229": { filename: "PRISM_VORONOI_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 119, safety_class: "MEDIUM", description: "Voronoi diagram generation", toolpath_role: "cam-module" },
  "EXT-230": { filename: "PRISM_VOXEL_STOCK_ENGINE.js", source_dir: "extracted/engines/cad_cam", category: "engines/cad_cam", lines: 495, safety_class: "MEDIUM", description: "Voxel-based stock material simulation", toolpath_role: "cam-module" },
  // --- Other Engines (2) ---
  "EXT-307": { filename: "PRISM_THERMAL_EXPANSION_ENGINE.js", source_dir: "extracted/engines", category: "engines", lines: 1563, safety_class: "MEDIUM", description: "Thermal expansion compensation engine", toolpath_role: "cam-module" },
  "EXT-308": { filename: "PRISM_THERMAL_MODELING.js", source_dir: "extracted/engines", category: "engines", lines: 192, safety_class: "MEDIUM", description: "Thermal modeling for cutting processes", toolpath_role: "cam-module" }
};

/**
 * Get the complete source file catalog for toolpath-related MEDIUM-priority modules.
 * Returns all 109 extracted JS source files wired to ToolpathCalculations.
 *
 * @param filter - Optional filter: "algorithm", "toolpath-generation", "surface-machining", "cam-module", or category string
 * @returns Filtered or complete catalog entries
 */
export function getSourceFileCatalog(filter?: string): Record<string, ToolpathSourceFileEntry> {
  if (!filter) return TOOLPATH_SOURCE_FILE_CATALOG;

  const result: Record<string, ToolpathSourceFileEntry> = {};
  for (const [id, entry] of Object.entries(TOOLPATH_SOURCE_FILE_CATALOG)) {
    if (entry.toolpath_role === filter || entry.category === filter || entry.category.startsWith(filter)) {
      result[id] = entry;
    }
  }
  return result;
}

// ============================================================================
// ENGAGEMENT ANGLE CALCULATIONS
// ============================================================================

/**
 * Calculate tool engagement angles for milling
 * 
 * Entry/exit angles determine chip formation and force variation.
 * Critical for understanding cutting dynamics and optimizing parameters.
 * 
 * @param tool_diameter - Tool diameter D [mm]
 * @param radial_depth - Radial depth of cut ae [mm]
 * @param feed_per_tooth - Feed per tooth fz [mm]
 * @param is_climb - True for climb milling, false for conventional
 * @param cutting_speed - Cutting speed Vc [m/min]
 * @returns Engagement analysis results
 */
export function calculateEngagementAngle(
  tool_diameter: number,
  radial_depth: number,
  feed_per_tooth: number,
  is_climb: boolean = true,
  cutting_speed?: number
): EngagementResult {
  const warnings: string[] = [];
  const radius = tool_diameter / 2;
  
  // Radial engagement percentage
  const radial_engagement_percent = (radial_depth / tool_diameter) * 100;
  
  // Calculate engagement angle using geometry
  // cos(θ) = (R - ae) / R = 1 - ae/R = 1 - 2×ae/D
  const cos_half_angle = 1 - (radial_depth / radius);
  const half_angle_rad = Math.acos(Math.max(-1, Math.min(1, cos_half_angle)));
  const arc_of_engagement = (half_angle_rad * 180 / Math.PI) * 2;
  
  // Entry and exit angles depend on climb vs conventional
  let entry_angle: number;
  let exit_angle: number;
  
  if (is_climb) {
    // Climb milling: tool enters at max chip, exits at zero
    entry_angle = 90 - (arc_of_engagement / 2);
    exit_angle = 90 + (arc_of_engagement / 2);
  } else {
    // Conventional: tool enters at zero chip, exits at max
    entry_angle = 90 + (arc_of_engagement / 2);
    exit_angle = 90 - (arc_of_engagement / 2);
  }
  
  // Chip thickness calculations
  // h_max = fz × sin(engagement_angle/2)
  const max_chip_thickness = feed_per_tooth * Math.sin(half_angle_rad);
  
  // Average chip thickness (simplified)
  // h_avg ≈ fz × (ae/D)^0.5 × (2/π) × arc_of_engagement
  const avg_factor = Math.sqrt(radial_depth / tool_diameter);
  const average_chip_thickness = feed_per_tooth * avg_factor * 0.637;
  
  // Effective cutting speed adjustment
  let effective_cutting_speed = cutting_speed || 0;
  if (cutting_speed && radial_engagement_percent < 50) {
    // Chip thinning compensation - can increase speed
    const compensation = 1 / avg_factor;
    effective_cutting_speed = cutting_speed * Math.min(compensation, 1.5);
  }
  
  // Warnings
  if (radial_engagement_percent > CAM_CONSTANTS.MAX_ENGAGEMENT_ROUGHING) {
    warnings.push(`Radial engagement ${radial_engagement_percent.toFixed(0)}% exceeds recommended ${CAM_CONSTANTS.MAX_ENGAGEMENT_ROUGHING}%`);
  }
  if (arc_of_engagement > 120) {
    warnings.push("High arc of engagement may cause excessive tool load variation");
  }
  if (average_chip_thickness < 0.01) {
    warnings.push("Chip thickness very thin - risk of rubbing instead of cutting");
  }
  
  log.debug(`[Engagement] D=${tool_diameter}, ae=${radial_depth}, arc=${arc_of_engagement.toFixed(1)}°`);
  
  return {
    entry_angle: Math.round(entry_angle * 10) / 10,
    exit_angle: Math.round(exit_angle * 10) / 10,
    arc_of_engagement: Math.round(arc_of_engagement * 10) / 10,
    average_chip_thickness: Math.round(average_chip_thickness * 10000) / 10000,
    max_chip_thickness: Math.round(max_chip_thickness * 10000) / 10000,
    radial_engagement_percent: Math.round(radial_engagement_percent * 10) / 10,
    is_climb_milling: is_climb,
    effective_cutting_speed: Math.round(effective_cutting_speed),
    warnings
  };
}

// ============================================================================
// TROCHOIDAL / ADAPTIVE CLEARING
// ============================================================================

/**
 * Calculate trochoidal (adaptive) milling parameters
 * 
 * Trochoidal milling uses circular arcs to maintain constant engagement,
 * allowing higher axial depth with lower radial engagement.
 * 
 * @param tool_diameter - Tool diameter [mm]
 * @param slot_width - Width of slot/pocket to clear [mm]
 * @param axial_depth - Axial depth of cut [mm]
 * @param cutting_speed - Target cutting speed [m/min]
 * @param feed_per_tooth - Feed per tooth [mm]
 * @param number_of_teeth - Number of cutting teeth
 * @returns Trochoidal parameters
 */
export function calculateTrochoidalParams(
  tool_diameter: number,
  slot_width: number,
  axial_depth: number,
  cutting_speed: number,
  feed_per_tooth: number,
  number_of_teeth: number,
  ae_max_mm?: number
): TrochoidalParams {
  const warnings: string[] = [];
  
  // Trochoidal width (stepover) - use ae_max if provided, else % of diameter
  const engagement_percent = CAM_CONSTANTS.TROCHOIDAL_ENGAGEMENT;
  const trochoidal_width = ae_max_mm ?? tool_diameter * (engagement_percent / 100);
  const actual_engagement_pct = (trochoidal_width / tool_diameter) * 100;
  
  // Arc radius - tool moves in circular arcs
  // Typically: arc_radius = (slot_width - tool_diameter) / 2 + small_offset
  const available_width = slot_width - tool_diameter;
  const arc_radius = Math.max(available_width / 2, trochoidal_width);
  
  // Trochoidal pitch - forward movement per circular loop
  // Pitch ≈ trochoidal_width × 0.8-1.0
  const trochoidal_pitch = trochoidal_width * 0.9;
  
  // Helix angle for entry (typically 2-5°)
  const helix_angle = 3;
  
  // Calculate spindle speed
  const spindle_speed = (1000 * cutting_speed) / (Math.PI * tool_diameter);
  
  // Feed rate for trochoidal - can be aggressive due to low engagement
  // Compensate for chip thinning
  const chip_thinning_factor = 1 / Math.sqrt(engagement_percent / 50);
  const compensated_feed = feed_per_tooth * chip_thinning_factor;
  const optimal_feed_rate = compensated_feed * number_of_teeth * spindle_speed;
  
  // Calculate MRR — in trochoidal, low ae means ~1 tooth engaged at a time
  // Effective MRR = RPM × fz × ap × ae / 1000 [cm³/min]
  // Ref: Sandvik Coromant "Modern Metal Cutting" Ch.9 — trochoidal strategies
  const mrr = (spindle_speed * feed_per_tooth * axial_depth * trochoidal_width) / 1000;
  
  // Maximum engagement angle from ae — corrected for trochoidal path curvature
  // In trochoidal milling, the tool follows a curved path which reduces effective engagement
  // φ_troch = φ_conv × r/(r + R_arc) where R_arc = (slot_width - D)/2
  // Ref: Rauch et al., "Dynamic toolpath for trochoidal milling" (2009)
  const ae_ratio = Math.min(trochoidal_width / tool_diameter, 1.0);
  const phi_conventional = Math.acos(Math.max(-1, 1 - 2 * ae_ratio)) * (180 / Math.PI);
  const r_tool = tool_diameter / 2;
  const curvature_correction = r_tool / (r_tool + arc_radius);
  const max_engagement_deg = phi_conventional * curvature_correction;
  
  // Warnings
  if (slot_width < tool_diameter * 1.2) {
    warnings.push("Slot too narrow for effective trochoidal milling");
  }
  if (trochoidal_width > tool_diameter * 0.2) {
    warnings.push("Consider reducing engagement for better tool life");
  }
  
  log.debug(`[Trochoidal] D=${tool_diameter}, width=${trochoidal_width.toFixed(2)}, pitch=${trochoidal_pitch.toFixed(2)}`);
  
  return {
    trochoidal_width: Math.round(trochoidal_width * 100) / 100,
    trochoidal_pitch: Math.round(trochoidal_pitch * 100) / 100,
    arc_radius: Math.round(arc_radius * 100) / 100,
    helix_angle,
    optimal_feed_rate: Math.round(optimal_feed_rate),
    optimal_spindle: Math.round(spindle_speed),
    engagement_percent: Math.round(actual_engagement_pct * 10) / 10,
    max_engagement_deg: Math.round(max_engagement_deg * 10) / 10,
    mrr: Math.round(mrr * 100) / 100,
    warnings
  };
}

// ============================================================================
// HSM (HIGH-SPEED MACHINING) PARAMETERS
// ============================================================================

/**
 * Calculate HSM strategy parameters
 * 
 * HSM requires smooth toolpaths with gradual direction changes
 * to maintain high feed rates without machine shock.
 * 
 * @param tool_diameter - Tool diameter [mm]
 * @param programmed_feedrate - Programmed feed rate [mm/min]
 * @param machine_max_accel - Machine max acceleration [m/s²]
 * @param tolerance - Part tolerance [mm]
 * @returns HSM parameters
 */
export function calculateHSMParams(
  tool_diameter: number,
  programmed_feedrate: number,
  machine_max_accel: number = 5,
  tolerance: number = 0.01
): HSMParams {
  const warnings: string[] = [];
  
  // Minimum corner radius to maintain feedrate
  // R_min = V² / a where V is feedrate, a is acceleration
  const feedrate_ms = programmed_feedrate / 60000; // m/s
  const accel_ms2 = machine_max_accel;
  const min_corner_radius = (feedrate_ms * feedrate_ms) / accel_ms2 * 1000; // mm
  
  const corner_radius = Math.max(min_corner_radius, CAM_CONSTANTS.HSM_MIN_CORNER_RADIUS);
  
  // Maximum direction change without significant slowdown
  const max_direction_change = CAM_CONSTANTS.HSM_MAX_DIRECTION_CHANGE;
  
  // Smoothing tolerance - balance between accuracy and smoothness
  const smoothing_tolerance = Math.min(tolerance * 0.5, 0.005);
  
  // Arc fitting tolerance
  const arc_fitting_tolerance = tolerance * 0.3;
  
  // Feed rate reduction at corners (simplified)
  // Reduction based on direction change angle
  const feed_rate_reduction = 15; // % typical at 90° corners
  
  // Recommended lead-in type
  const recommended_lead_in = corner_radius > 2 ? "arc" : "helix";
  
  // Chip thinning factor for light engagement
  const chip_thinning_factor = 1.4; // Typical for HSM
  
  // Warnings
  if (min_corner_radius > 5) {
    warnings.push(`High feedrate requires ${min_corner_radius.toFixed(1)}mm minimum corner radius`);
  }
  if (tolerance < 0.005) {
    warnings.push("Tight tolerance may limit HSM effectiveness");
  }
  
  log.debug(`[HSM] Vf=${programmed_feedrate}, R_min=${corner_radius.toFixed(2)}mm`);
  
  return {
    corner_radius: Math.round(corner_radius * 100) / 100,
    max_direction_change,
    smoothing_tolerance: Math.round(smoothing_tolerance * 10000) / 10000,
    arc_fitting_tolerance: Math.round(arc_fitting_tolerance * 10000) / 10000,
    feed_rate_reduction,
    recommended_lead_in,
    chip_thinning_factor,
    warnings
  };
}

// ============================================================================
// SCALLOP HEIGHT CALCULATION
// ============================================================================

/**
 * Calculate scallop height for 3D surface machining
 * 
 * Scallop (cusp) height determines surface quality in finishing.
 * h = R - √(R² - (s/2)²) ≈ s²/(8R) for small stepover
 * 
 * @param tool_radius - Tool/nose radius R [mm]
 * @param stepover - Stepover between passes [mm]
 * @param surface_width - Total width to machine [mm]
 * @param feed_rate - Feed rate [mm/min]
 * @param is_ball_nose - True for ball nose, false for flat/bull
 * @returns Scallop analysis
 */
export function calculateScallopHeight(
  tool_radius: number,
  stepover: number,
  surface_width: number,
  feed_rate: number,
  is_ball_nose: boolean = true
): ScallopResult {
  const warnings: string[] = [];
  
  // Calculate scallop height
  // h = R - √(R² - (s/2)²)
  const half_step = stepover / 2;
  let scallop_height: number;
  
  if (is_ball_nose) {
    if (half_step >= tool_radius) {
      scallop_height = tool_radius;
      warnings.push("Stepover exceeds tool radius - will leave material");
    } else {
      scallop_height = tool_radius - Math.sqrt(tool_radius * tool_radius - half_step * half_step);
    }
  } else {
    // Flat end mill - scallop only from surface curvature
    // Simplified: assume flat surface = no scallop
    scallop_height = 0;
    warnings.push("Flat end mill - scallop calculation assumes ball nose");
  }
  
  // Convert to theoretical surface roughness (approximate)
  // Ra ≈ scallop_height / 4 (simplified relationship)
  const theoretical_Ra = scallop_height * 1000 / 4; // μm
  
  // Number of passes required
  const passes_required = Math.ceil(surface_width / stepover);
  
  // Total toolpath length (simplified - assumes parallel passes)
  const pass_length = surface_width * 1.1; // 10% overlap
  const total_toolpath_length = passes_required * pass_length;
  
  // Machining time
  const machining_time = total_toolpath_length / feed_rate;
  
  // Warnings
  if (scallop_height > 0.05) {
    warnings.push(`Scallop height ${(scallop_height * 1000).toFixed(0)}μm may be visible`);
  }
  if (theoretical_Ra > 3.2) {
    warnings.push("Consider smaller stepover for better surface finish");
  }
  
  log.debug(`[Scallop] R=${tool_radius}, step=${stepover}, h=${scallop_height.toFixed(4)}mm`);
  
  return {
    scallop_height: Math.round(scallop_height * 10000) / 10000,
    stepover,
    theoretical_Ra: Math.round(theoretical_Ra * 100) / 100,
    passes_required,
    total_toolpath_length: Math.round(total_toolpath_length),
    machining_time: Math.round(machining_time * 10) / 10,
    warnings
  };
}

// ============================================================================
// STEPOVER OPTIMIZATION
// ============================================================================

/**
 * Calculate optimal stepover for given surface finish requirement
 * 
 * @param tool_diameter - Tool diameter [mm]
 * @param tool_corner_radius - Tool corner/nose radius [mm]
 * @param target_scallop - Target scallop height [mm]
 * @param operation - Operation type
 * @returns Stepover recommendations
 */
export function calculateOptimalStepover(
  tool_diameter: number,
  tool_corner_radius: number,
  target_scallop: number = 0.01,
  operation: "roughing" | "semi-finishing" | "finishing" = "finishing"
): StepoverResult {
  const warnings: string[] = [];
  
  // Use corner radius for scallop calculation
  const effective_radius = tool_corner_radius > 0 ? tool_corner_radius : tool_diameter / 2;
  
  // Calculate stepover from target scallop
  // s = 2 × √(2Rh - h²) ≈ 2√(2Rh) for small h
  const optimal_stepover = 2 * Math.sqrt(2 * effective_radius * target_scallop);
  
  // Stepover as percentage of tool diameter
  const stepover_percent = (optimal_stepover / tool_diameter) * 100;
  
  // Actual scallop height verification
  const half_step = optimal_stepover / 2;
  const actual_scallop = effective_radius - Math.sqrt(effective_radius * effective_radius - half_step * half_step);
  
  // Number of passes for 100mm width (reference)
  const reference_width = 100;
  const number_of_passes = Math.ceil(reference_width / optimal_stepover);
  
  // Overlap percentage
  const overlap_percent = 100 - stepover_percent;
  
  // Recommend strategy based on operation
  let strategy: string;
  let adjusted_stepover = optimal_stepover;
  
  switch (operation) {
    case "roughing":
      strategy = "Parallel/Zigzag with 50-70% stepover";
      adjusted_stepover = tool_diameter * 0.6;
      break;
    case "semi-finishing":
      strategy = "Parallel with 30-50% stepover";
      adjusted_stepover = tool_diameter * 0.4;
      break;
    case "finishing":
      strategy = "Parallel/Spiral with scallop-based stepover";
      // Keep calculated stepover
      break;
  }
  
  // Warnings
  if (stepover_percent > 70) {
    warnings.push("Stepover exceeds 70% - may leave uncut material in corners");
  }
  if (stepover_percent < 5) {
    warnings.push("Very small stepover - consider using smaller tool");
  }
  
  log.debug(`[Stepover] D=${tool_diameter}, r=${effective_radius}, step=${optimal_stepover.toFixed(3)}mm`);
  
  return {
    optimal_stepover: Math.round(optimal_stepover * 1000) / 1000,
    stepover_percent: Math.round(stepover_percent * 10) / 10,
    scallop_height: Math.round(actual_scallop * 10000) / 10000,
    number_of_passes,
    overlap_percent: Math.round(overlap_percent * 10) / 10,
    strategy,
    warnings
  };
}

// ============================================================================
// CYCLE TIME ESTIMATION
// ============================================================================

/**
 * Estimate machining cycle time
 * 
 * @param cutting_distance - Total cutting distance [mm]
 * @param cutting_feedrate - Cutting feed rate [mm/min]
 * @param rapid_distance - Total rapid distance [mm]
 * @param number_of_tools - Number of tool changes
 * @param tool_change_time - Time per tool change [min]
 * @param rapid_rate - Rapid traverse rate [mm/min]
 * @returns Cycle time breakdown
 */
export function estimateCycleTime(
  cutting_distance: number,
  cutting_feedrate: number,
  rapid_distance: number,
  number_of_tools: number = 1,
  tool_change_time: number = 0.5,
  rapid_rate: number = CAM_CONSTANTS.RAPID_RATE_XY
): CycleTimeResult {
  const warnings: string[] = [];
  
  // Cutting time
  const cutting_time = cutting_distance / cutting_feedrate;
  
  // Rapid time
  const rapid_time = rapid_distance / rapid_rate;
  
  // Tool change time
  const total_tool_change_time = (number_of_tools - 1) * tool_change_time;
  
  // Total time
  const total_time = cutting_time + rapid_time + total_tool_change_time;
  
  // Utilization (% time actually cutting)
  const utilization_percent = (cutting_time / total_time) * 100;
  
  // Warnings
  if (utilization_percent < 50) {
    warnings.push(`Low utilization ${utilization_percent.toFixed(0)}% - consider toolpath optimization`);
  }
  if (rapid_time > cutting_time) {
    warnings.push("More time in rapids than cutting - check toolpath efficiency");
  }
  
  log.debug(`[CycleTime] Cut=${cutting_time.toFixed(1)}min, Rapid=${rapid_time.toFixed(1)}min, Total=${total_time.toFixed(1)}min`);
  
  return {
    cutting_time: Math.round(cutting_time * 10) / 10,
    rapid_time: Math.round(rapid_time * 10) / 10,
    tool_change_time: Math.round(total_tool_change_time * 10) / 10,
    total_time: Math.round(total_time * 10) / 10,
    cutting_distance: Math.round(cutting_distance),
    rapid_distance: Math.round(rapid_distance),
    utilization_percent: Math.round(utilization_percent * 10) / 10,
    warnings
  };
}

// ============================================================================
// ARC FITTING & TOLERANCE
// ============================================================================

/**
 * Calculate arc fitting parameters for smooth toolpaths
 * 
 * @param chord_tolerance - Allowed chord error [mm]
 * @param arc_radius - Arc radius [mm]
 * @param feedrate - Programmed feedrate [mm/min]
 * @param block_time - Controller block processing time [ms]
 * @returns Arc fitting analysis
 */
export function calculateArcFitting(
  chord_tolerance: number,
  arc_radius: number,
  feedrate: number,
  block_time: number = CAM_CONSTANTS.BLOCK_PROCESSING_TIME
): ArcFitResult {
  const warnings: string[] = [];
  
  // Segment length from chord tolerance
  // chord_error = R - √(R² - (L/2)²) ≈ L²/(8R)
  // L = √(8 × R × chord_error)
  const segment_length = Math.sqrt(8 * arc_radius * chord_tolerance);
  
  // Number of segments for 90° arc
  const arc_length_90 = (Math.PI / 2) * arc_radius;
  const arc_segments = Math.ceil(arc_length_90 / segment_length);
  
  // Effective feedrate limited by block processing
  // V_max = segment_length / (block_time/1000)
  const max_feedrate_from_blocks = segment_length / (block_time / 1000) * 60; // mm/min
  const effective_feedrate = Math.min(feedrate, max_feedrate_from_blocks);
  
  // Block processing time per segment
  const block_processing_time = block_time;
  
  // Recommended tolerance for smooth motion
  let recommended_tolerance = chord_tolerance;
  if (effective_feedrate < feedrate * 0.8) {
    recommended_tolerance = chord_tolerance * 2;
    warnings.push(`Feedrate limited to ${effective_feedrate.toFixed(0)} mm/min by block processing`);
  }
  
  // Warnings
  if (segment_length < CAM_CONSTANTS.MIN_SEGMENT_LENGTH) {
    warnings.push("Segment length below controller minimum");
  }
  if (arc_segments > 100) {
    warnings.push("Many segments for arc - consider increasing tolerance");
  }
  
  log.debug(`[ArcFit] tol=${chord_tolerance}, R=${arc_radius}, segments=${arc_segments}`);
  
  return {
    arc_segments,
    chord_error: chord_tolerance,
    effective_feedrate: Math.round(effective_feedrate),
    block_processing_time,
    recommended_tolerance: Math.round(recommended_tolerance * 10000) / 10000,
    warnings
  };
}

// Export singleton
export const toolpathCalculations = {
  engagementAngle: calculateEngagementAngle,
  trochoidalParams: calculateTrochoidalParams,
  hsmParams: calculateHSMParams,
  scallopHeight: calculateScallopHeight,
  optimalStepover: calculateOptimalStepover,
  cycleTime: estimateCycleTime,
  arcFitting: calculateArcFitting,
  CAM_CONSTANTS,

  /** Return the full 109-entry source file catalog, optionally filtered by role or category */
  catalogSourceFiles(filter?: string): {
    total_files: number;
    total_lines: number;
    by_role: Record<string, number>;
    entries: Record<string, ToolpathSourceFileEntry>;
  } {
    const entries = getSourceFileCatalog(filter);
    const ids = Object.keys(entries);
    let totalLines = 0;
    const byRole: Record<string, number> = {};
    for (const entry of Object.values(entries)) {
      totalLines += entry.lines;
      byRole[entry.toolpath_role] = (byRole[entry.toolpath_role] || 0) + 1;
    }
    return {
      total_files: ids.length,
      total_lines: totalLines,
      by_role: byRole,
      entries
    };
  }
};

// ============================================================
// ADVANCED COMPETITIVE FEATURES
// ============================================================

/**
 * Chip Thinning Compensation
 * When ae < 50% of tool diameter, the actual chip thickness is less than fz.
 * Must increase programmed fz to maintain effective chip load.
 * This is what separates advanced from basic speed/feed calculators.
 */
export function calculateChipThinning(
  tool_diameter: number,
  radial_depth: number,
  programmed_fz: number,
  number_of_teeth: number,
  cutting_speed: number
): any {
  const ae_ratio = radial_depth / tool_diameter;
  
  // Engagement angle (radians)
  const engagement_angle = Math.acos(1 - (2 * radial_depth / tool_diameter));
  
  // Average chip thickness
  const hex = programmed_fz * Math.sin(engagement_angle) * (180 / Math.PI) / (engagement_angle * 180 / Math.PI);
  
  // True hex using radial chip thinning formula
  // hex = fz × (ae/D) when ae < D/2, simplified
  const hex_actual = programmed_fz * Math.sqrt(2 * radial_depth / tool_diameter - Math.pow(radial_depth / tool_diameter, 2));
  
  // Compensated fz to achieve target hex = programmed_fz
  const fz_compensated = ae_ratio < 0.5 
    ? programmed_fz / Math.sqrt(2 * ae_ratio - ae_ratio * ae_ratio)
    : programmed_fz;
  
  // Compensated feed rate
  const rpm = (cutting_speed * 1000) / (Math.PI * tool_diameter);
  const vf_original = rpm * number_of_teeth * programmed_fz;
  const vf_compensated = rpm * number_of_teeth * fz_compensated;
  
  const warnings: string[] = [];
  if (fz_compensated > programmed_fz * 3) warnings.push("Compensation >3x — check radial depth is not too small");
  if (ae_ratio < 0.05) warnings.push("Very light radial engagement — consider increasing ae for stability");
  
  return {
    input: { tool_diameter, radial_depth, programmed_fz, ae_ratio: Math.round(ae_ratio * 100) / 100 },
    chip_thinning: {
      engagement_angle_deg: Math.round(engagement_angle * 180 / Math.PI * 10) / 10,
      hex_without_compensation: Math.round(hex_actual * 10000) / 10000,
      hex_target: programmed_fz,
      fz_compensated: Math.round(fz_compensated * 10000) / 10000,
      compensation_factor: Math.round(fz_compensated / programmed_fz * 100) / 100,
      needs_compensation: ae_ratio < 0.5
    },
    feed_rates: {
      vf_original: Math.round(vf_original),
      vf_compensated: Math.round(vf_compensated),
      feed_increase_pct: Math.round((vf_compensated / vf_original - 1) * 100)
    },
    warnings
  };
}

/**
 * Multi-Pass Strategy Optimizer
 * Given total stock to remove, calculates optimal number of passes,
 * DOC per pass, and parameters for rough → semi → finish sequence.
 */
export function calculateMultiPassStrategy(
  total_stock: number,        // mm to remove
  tool_diameter: number,
  material_kc1_1: number,     // Kienzle specific force
  machine_power_kw: number,
  cutting_speed_rough: number,
  cutting_speed_finish: number,
  fz_rough: number,
  fz_finish: number,
  target_Ra?: number,         // target surface finish μm
  cut_length_mm?: number       // total cut distance per pass (for time estimation)
): any {
  const warnings: string[] = [];
  
  // Finish pass: fixed small DOC
  const finish_ap = target_Ra ? Math.min(0.5, total_stock * 0.1) : 0.3;
  const finish_ae = tool_diameter * 0.7; // 70% stepover for finish
  
  // Semi-finish: moderate DOC
  const semi_ap = Math.min(1.0, total_stock * 0.15);
  const semi_ae = tool_diameter * 0.5;
  
  // Remaining stock for roughing
  const rough_stock = total_stock - finish_ap - semi_ap;
  
  // Max roughing DOC based on power limit
  // P = kc1_1 × ap × ae × fz × z × n / (60000 × efficiency)
  const rough_ae = tool_diameter * 0.5;
  const rough_rpm = (cutting_speed_rough * 1000) / (Math.PI * tool_diameter);
  const efficiency = 0.8;
  // Solve for max ap: ap_max = P × 60000 × eff / (kc1_1 × ae × fz × z × n)
  const z = 4; // assume 4 flutes
  const ap_max_power = (machine_power_kw * 60000 * efficiency) / (material_kc1_1 * rough_ae * fz_rough * z * rough_rpm / 1000);
  const ap_max = Math.min(ap_max_power, tool_diameter * 1.5, rough_stock);
  
  // Number of roughing passes
  const rough_passes = rough_stock > 0 ? Math.ceil(rough_stock / ap_max) : 0;
  const actual_rough_ap = rough_stock > 0 ? rough_stock / rough_passes : 0;
  
  // MRR per phase
  const rough_vf = rough_rpm * z * fz_rough;
  const rough_mrr = actual_rough_ap * rough_ae * rough_vf / 1000;
  
  const semi_rpm = ((cutting_speed_rough + cutting_speed_finish) / 2 * 1000) / (Math.PI * tool_diameter);
  const semi_fz = (fz_rough + fz_finish) / 2;
  const semi_vf = semi_rpm * z * semi_fz;
  const semi_mrr = semi_ap * semi_ae * semi_vf / 1000;
  
  const finish_rpm = (cutting_speed_finish * 1000) / (Math.PI * tool_diameter);
  const finish_vf = finish_rpm * z * fz_finish;
  const finish_mrr = finish_ap * finish_ae * finish_vf / 1000;
  
  if (rough_stock < 0) warnings.push("Total stock too small for 3-pass strategy — consider 2-pass");
  if (actual_rough_ap > tool_diameter) warnings.push("Roughing DOC exceeds tool diameter — verify tool capability");
  
  return {
    strategy: {
      total_stock_mm: total_stock,
      total_passes: rough_passes + 2,
      phases: [
        {
          phase: "roughing",
          passes: rough_passes,
          ap_mm: Math.round(actual_rough_ap * 100) / 100,
          ae_mm: Math.round(rough_ae * 100) / 100,
          vc: cutting_speed_rough,
          fz: fz_rough,
          rpm: Math.round(rough_rpm),
          vf: Math.round(rough_vf),
          mrr_cm3_min: Math.round(rough_mrr * 10) / 10,
          ...(cut_length_mm ? { time_min: Math.round(rough_passes * cut_length_mm / rough_vf * 100) / 100 } : {})
        },
        {
          phase: "semi-finishing",
          passes: 1,
          ap_mm: Math.round(semi_ap * 100) / 100,
          ae_mm: Math.round(semi_ae * 100) / 100,
          vc: Math.round((cutting_speed_rough + cutting_speed_finish) / 2),
          fz: Math.round(semi_fz * 1000) / 1000,
          rpm: Math.round(semi_rpm),
          vf: Math.round(semi_vf),
          mrr_cm3_min: Math.round(semi_mrr * 10) / 10,
          ...(cut_length_mm ? { time_min: Math.round(1 * cut_length_mm / semi_vf * 100) / 100 } : {})
        },
        {
          phase: "finishing",
          passes: 1,
          ap_mm: Math.round(finish_ap * 100) / 100,
          ae_mm: Math.round(finish_ae * 100) / 100,
          vc: cutting_speed_finish,
          fz: fz_finish,
          rpm: Math.round(finish_rpm),
          vf: Math.round(finish_vf),
          mrr_cm3_min: Math.round(finish_mrr * 10) / 10,
          ...(cut_length_mm ? { time_min: Math.round(1 * cut_length_mm / finish_vf * 100) / 100 } : {})
        }
      ]
    },
    power_check: {
      max_rough_ap_by_power: Math.round(ap_max_power * 100) / 100,
      actual_rough_ap: Math.round(actual_rough_ap * 100) / 100,
      power_limited: actual_rough_ap >= ap_max_power * 0.95
    },
    warnings
  };
}

/**
 * Coolant Strategy Recommendation
 * Based on material, operation, speed, and tool — recommends optimal coolant approach.
 */
export function recommendCoolantStrategy(
  iso_group: string,
  operation: string,
  cutting_speed: number,
  tool_has_coolant_through: boolean,
  material_thermal_conductivity?: number,
  machine_has_tsc?: boolean,
  material_subtype?: string
): any {
  const op = operation.toLowerCase();
  const warnings: string[] = [];
  
  // Decision matrix
  let primary = "flood";
  let pressure_bar = 20;
  let concentration_pct = 8;
  let mql_flow_rate = 0; // ml/hr — set later if MQL selected
  let reasoning: string[] = [];
  
  // High-speed → MQL or dry
  if (cutting_speed > 300) {
    primary = "dry";
    reasoning.push("Speed >300 m/min — thermal shock risk with flood coolant");
    if (iso_group === "N") {
      primary = "mql"; // Aluminum needs lubrication even at high speed
      reasoning.push("Aluminum: MQL preferred for lubricity even at high speed");
    }
  }
  
  // Superalloys and titanium → high pressure / through-spindle coolant
  if (iso_group === "S" || (iso_group === "N" && (material_thermal_conductivity || 50) < 15)) {
    const isTitanium = material_subtype?.toLowerCase().includes("titanium") || material_subtype?.toLowerCase().includes("ti-");
    // Both titanium and nickel superalloys benefit from high-pressure coolant for chip breaking.
    // Titanium has low thermal conductivity (6.7 W/m·K) — TSC preferred when available.
    // Ref: Machining of Titanium Alloys (Davim, 2014), Ch.3: "High-pressure coolant delivery
    // through the spindle is the most effective method for titanium machining."
    if (isTitanium) {
      // Titanium: TSC preferred for chip breaking + heat extraction. MQL only if TSC unavailable.
      if (tool_has_coolant_through && machine_has_tsc === true) {
        primary = "through_spindle_coolant";
        pressure_bar = 70;
        reasoning.push("Titanium alloy: TSC preferred — critical for chip breaking and heat removal in low thermal conductivity material (6.7 W/m·K)");
      } else if (tool_has_coolant_through && machine_has_tsc === undefined) {
        primary = "through_spindle_coolant";
        pressure_bar = 70;
        reasoning.push("Titanium alloy: TSC recommended — verify machine has through-spindle coolant capability");
        warnings.push("UNVERIFIED: machine_has_tsc not specified — TSC recommended but machine capability must be confirmed before use");
      } else {
        primary = "high_pressure";
        pressure_bar = 50;
        reasoning.push("Titanium alloy: high-pressure external coolant as fallback — TSC unavailable");
        if (machine_has_tsc === false) warnings.push("Machine lacks TSC — using external high-pressure nozzle. Consider upgrading for titanium work.");
      }
    } else if (tool_has_coolant_through && machine_has_tsc === true) {
      primary = "through_spindle_coolant";
      pressure_bar = 70;
      reasoning.push("Low thermal conductivity material with through-spindle coolant — optimal for chip breaking and heat removal");
    } else if (tool_has_coolant_through && machine_has_tsc === undefined) {
      primary = "through_spindle_coolant";
      pressure_bar = 70;
      reasoning.push("Low thermal conductivity material — TSC recommended but machine capability not confirmed");
      warnings.push("UNVERIFIED: machine_has_tsc not specified — TSC recommended but machine capability must be confirmed before use");
    } else {
      primary = "high_pressure";
      pressure_bar = 70;
      reasoning.push("Low thermal conductivity material — high pressure coolant needed for chip breaking and heat removal");
      if (!tool_has_coolant_through) warnings.push("Tool lacks coolant-through channels — external high-pressure nozzle required");
      if (machine_has_tsc === false) warnings.push("Machine lacks TSC — using external high-pressure as fallback");
    }
  }
  
  // Hardened steel → dry or MQL
  if (iso_group === "H") {
    primary = cutting_speed > 150 ? "dry" : "mql";
    reasoning.push("Hardened steel: dry/MQL preferred to avoid thermal cracking of CBN/ceramic tools");
  }
  
  // Cast iron → dry preferred
  if (iso_group === "K") {
    primary = "dry";
    reasoning.push("Cast iron: dry cutting preferred — short chips, graphite provides natural lubrication");
    if (op.includes("drill")) {
      primary = "mql";
      reasoning.push("Drilling exception: MQL for chip evacuation in deep holes");
    }
  }
  
  // Drilling always needs coolant
  if (op.includes("drill") && primary === "dry") {
    primary = tool_has_coolant_through ? "high_pressure" : "flood";
    pressure_bar = tool_has_coolant_through ? 40 : 20;
    reasoning.push("Drilling requires coolant for chip evacuation regardless of material");
  }
  
  // Stainless → flood with high concentration
  if (iso_group === "M") {
    if (primary === "dry") primary = "flood";
    concentration_pct = 10;
    reasoning.push("Stainless steel: higher coolant concentration for anti-galling protection");
  }
  
  // MQL specifics
  if (primary === "mql" && mql_flow_rate === 0) mql_flow_rate = 50; // ml/hr default

  // Flow rate estimation (L/min) based on strategy and pressure
  const isHighPressure = primary === "high_pressure" || primary === "through_spindle_coolant";
  const effective_pressure = isHighPressure ? pressure_bar : (primary === "flood" ? 20 : 0);
  // Typical nozzle flow: Q ≈ k × √P, calibrated to ~15 LPM at 70 bar for TSC
  const flow_lpm = effective_pressure > 0
    ? Math.round(15 * Math.sqrt(effective_pressure / 70) * 10) / 10
    : 0;

  // Flow rate bounds validation for TSC (typical 10-20 L/min)
  if (primary === "through_spindle_coolant" && flow_lpm > 0) {
    if (flow_lpm < 10) warnings.push(`TSC flow rate ${flow_lpm} L/min below typical minimum (10 L/min) — may not provide adequate cooling`);
    if (flow_lpm > 20) warnings.push(`TSC flow rate ${flow_lpm} L/min above typical maximum (20 L/min) — verify machine pump capacity`);
  }

  return {
    recommendation: {
      strategy: primary,
      pressure_bar: isHighPressure ? pressure_bar : (primary === "flood" ? 20 : 0),
      flow_lpm: flow_lpm > 0 ? flow_lpm : undefined,
      concentration_pct: primary === "flood" || isHighPressure ? concentration_pct : 0,
      mql_flow_rate_ml_hr: mql_flow_rate,
      coolant_type: primary === "dry" ? "none" : (primary === "mql" ? "vegetable_ester" : "semi_synthetic")
    },
    alternatives: getAlternatives(primary, iso_group),
    reasoning,
    warnings
  };
}

function getAlternatives(primary: string, iso_group: string): any[] {
  const alts: any[] = [];
  if (primary !== "flood") alts.push({ strategy: "flood", note: "Safe fallback for any material" });
  if (primary !== "mql") alts.push({ strategy: "mql", note: "50-80 ml/hr, reduced mess, environmentally friendly" });
  if (primary !== "dry" && iso_group !== "S") alts.push({ strategy: "dry", note: "Fastest chip evacuation, no cleanup" });
  if (iso_group === "S" || iso_group === "N") alts.push({ strategy: "cryogenic_CO2", note: "Sub-zero cooling for heat-resistant alloys" });
  return alts;
}

/**
 * G-Code Snippet Generator
 * Generates ready-to-paste G-code for common operations across controller families.
 */
export function generateGCodeSnippet(
  controller: string,
  operation: string,
  params: {
    rpm: number;
    feed_rate: number;
    tool_number?: number;
    depth_of_cut?: number;
    x_start?: number;
    y_start?: number;
    z_safe?: number;
    z_depth?: number;
    coolant?: string;
  }
): any {
  const ctrl = controller.toLowerCase();
  const op = operation.toLowerCase();
  const T = params.tool_number || 1;
  const S = params.rpm;
  const F = params.feed_rate;
  const zSafe = params.z_safe || 5;
  const zDepth = params.z_depth || -(params.depth_of_cut || 3);
  const coolantCode = params.coolant === "mist" ? "M7" : "M8";
  
  let code = "";
  let notes: string[] = [];
  
  if (ctrl.includes("fanuc") || ctrl.includes("haas")) {
    // Fanuc/Haas G-code
    if (op.includes("face") || op.includes("mill")) {
      code = [
        `( ${operation.toUpperCase()} OPERATION )`,
        `( Generated by PRISM Manufacturing Intelligence )`,
        `G90 G54 G17`,
        `T${T} M6`,
        `G43 H${T} Z${zSafe}`,
        `S${S} M3`,
        coolantCode,
        `G0 X${params.x_start || 0} Y${params.y_start || 0}`,
        `G0 Z${zSafe}`,
        `G1 Z${zDepth} F${Math.round(F * 0.3)}`,
        `G1 X100. F${F}`,
        `G0 Z${zSafe}`,
        `M9`,
        `M5`,
        `G91 G28 Z0`,
        `M30`
      ].join("\n");
      notes = ["Modify X100. to match your part width", "Adjust Z depth per pass"];
    } else if (op.includes("drill")) {
      code = [
        `( DRILLING OPERATION )`,
        `G90 G54 G17`,
        `T${T} M6`,
        `G43 H${T} Z${zSafe}`,
        `S${S} M3`,
        coolantCode,
        `G0 X${params.x_start || 0} Y${params.y_start || 0}`,
        `G83 Z${zDepth} R${zSafe} Q${Math.abs(zDepth / 3).toFixed(1)} F${F}`,
        `G80`,
        `M9`,
        `M5`,
        `G91 G28 Z0`,
        `M30`
      ].join("\n");
      notes = ["G83 = peck drilling cycle", "Q = peck depth (set to 1/3 of total depth)"];
    }
  } else if (ctrl.includes("siemens") || ctrl.includes("sinumerik")) {
    if (op.includes("face") || op.includes("mill")) {
      code = [
        `; ${operation.toUpperCase()} OPERATION`,
        `; Generated by PRISM Manufacturing Intelligence`,
        `G90 G54 G17`,
        `T${T} D1`,
        `M6`,
        `G0 Z${zSafe}`,
        `S${S} M3`,
        coolantCode,
        `G0 X${params.x_start || 0} Y${params.y_start || 0}`,
        `G1 Z${zDepth} F${Math.round(F * 0.3)}`,
        `G1 X100. F${F}`,
        `G0 Z${zSafe}`,
        `M9`,
        `M5`,
        `G0 Z200 M30`
      ].join("\n");
      notes = ["Siemens uses D1 for tool offset", "Modify X100. to match part"];
    }
  } else if (ctrl.includes("heidenhain")) {
    if (op.includes("face") || op.includes("mill")) {
      code = [
        `; ${operation.toUpperCase()} OPERATION`,
        `; Generated by PRISM Manufacturing Intelligence`,
        `TOOL CALL ${T} Z S${S}`,
        `L Z+${zSafe} R0 FMAX M3 ${coolantCode}`,
        `L X+${params.x_start || 0} Y+${params.y_start || 0} R0 FMAX`,
        `L Z${zDepth} R0 F${Math.round(F * 0.3)}`,
        `L X+100 R0 F${F}`,
        `L Z+${zSafe} R0 FMAX`,
        `M9`,
        `M5`,
        `L Z+200 R0 FMAX M30`
      ].join("\n");
      notes = ["Heidenhain conversational format", "L = linear move, FMAX = rapid"];
    }
  }
  
  if (!code) {
    code = `( Unsupported controller: ${controller} )`;
    notes = ["Supported: Fanuc, Haas, Siemens/Sinumerik, Heidenhain"];
  }
  
  return {
    controller,
    operation,
    gcode: code,
    parameters_used: { S, F, T, Z: zDepth },
    notes
  };
}
