/**
 * LatheKnowledgeGraphEngine — Comprehensive Knowledge Graph for Lathe Programming
 * ================================================================================
 *
 * Builds and queries a knowledge graph connecting:
 *   - Materials (D2, M2, 4140, carbide, etc.)
 *   - Operations (face, rough_od, finish_od, thread, groove, part, etc.)
 *   - Tools (CNMG, DNMG, VNMG, threading inserts, grooving tools)
 *   - Parameters (speed, feed, DOC values)
 *   - Outcomes (tool life, surface finish, cycle time)
 *
 * Data sources:
 *   - Tribal knowledge (3,700+ tips)
 *   - JM Die programs (16,558 lathe programs)
 *   - Physics models (Kienzle force, Taylor tool life)
 *
 * Graph algorithms:
 *   - PageRank for node importance
 *   - Community detection (Louvain-inspired)
 *   - Shortest path for recommendations
 *   - Multi-hop reasoning with explanation
 *
 * @module engines/LatheKnowledgeGraphEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_MATERIAL_DB,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// NODE TYPES
// ============================================================================

/** Node type classification */
export type LatheNodeType =
  | "material"      // D2, M2, 4140, carbide, etc.
  | "operation"     // face, rough_od, finish_od, thread, groove, part
  | "tool"          // CNMG, DNMG, VNMG, threading insert
  | "parameter"     // speed, feed, DOC values
  | "outcome"       // tool life, surface finish, cycle time
  | "insert_grade"  // carbide grade (KC5010, GC4325, etc.)
  | "coating"       // TiN, TiAlN, AlTiN, CVD, PVD
  | "machine"       // Okuma LB3000, Okuma Genos L200, etc.
  | "coolant"       // flood, mist, air, high-pressure
  | "workholding"   // chuck, collet, faceplate, mandrel
  | "constraint";   // hard limit, recommendation

/** Edge type classification */
export type LatheEdgeType =
  | "compatible_with"     // material → tool
  | "suitable_for"        // tool → operation
  | "recommended"         // operation → parameter
  | "produces"            // parameter → outcome
  | "constrains"          // material → parameter (hard limit)
  | "improves"            // parameter adjustment → outcome improvement
  | "degrades"            // parameter adjustment → outcome degradation
  | "requires"            // operation → prerequisite
  | "alternative_to"      // tool → alternative tool
  | "succeeds"            // operation → following operation
  | "learned_from"        // any → source program/tip
  | "conflicts_with"      // parameter → incompatible parameter
  | "optimal_for"         // tool → specific material+operation
  | "coated_with"         // tool → coating
  | "uses_grade"          // tool → insert grade
  | "mounted_in";         // tool → workholding

// ============================================================================
// GRAPH NODE STRUCTURE
// ============================================================================

/** Base graph node */
export interface LatheGraphNode {
  id: string;
  type: LatheNodeType;
  name: string;
  properties: Record<string, unknown>;
  importance: number;        // PageRank score (0-1)
  community: number;         // Community ID from clustering
  embedding?: number[];      // Neural embedding vector (optional)
  sources: string[];         // Where this node came from
  created_at: string;
  updated_at: string;
}

/** Material node properties */
export interface MaterialNodeProps {
  iso_group: ISOGroup;
  hardness_hrc?: number;
  hardness_hb?: number;
  tensile_strength_mpa?: number;
  machinability_factor: number;
  thermal_conductivity_w_mk?: number;
  work_hardening_rate?: number;
  common_names: string[];
  typical_applications: string[];
}

/** Operation node properties */
export interface OperationNodeProps {
  operation_class: "external" | "internal" | "facing" | "threading" | "grooving" | "parting" | "drilling";
  roughing_or_finishing: "roughing" | "finishing" | "both";
  typical_doc_range_mm: [number, number];
  typical_feed_range_mmrev: [number, number];
  tool_types_used: string[];
  requires_rigid_setup: boolean;
  chip_breaking_critical: boolean;
}

/** Tool node properties */
export interface ToolNodeProps {
  insert_shape: string;       // C, D, V, T, S, R, W
  nose_radius_mm: number;
  approach_angle_deg: number;
  clearance_angle_deg: number;
  holder_style?: string;      // MCLNR, MDJNR, MVJNR, etc.
  max_doc_mm: number;
  suitable_operations: string[];
  material_compatibility: string[];  // ISO groups
}

/** Parameter node properties */
export interface ParameterNodeProps {
  parameter_type: "speed" | "feed" | "doc" | "coolant_pressure" | "spindle_mode";
  value: number;
  unit: string;
  min_recommended: number;
  max_recommended: number;
  physics_basis?: string;     // "kienzle", "taylor", "empirical"
}

/** Outcome node properties */
export interface OutcomeNodeProps {
  outcome_type: "tool_life" | "surface_finish" | "cycle_time" | "power" | "force" | "chip_form";
  value: number;
  unit: string;
  quality: "excellent" | "good" | "acceptable" | "poor";
  confidence: number;         // 0-100
}

// ============================================================================
// GRAPH EDGE STRUCTURE
// ============================================================================

/** Graph edge with typed relationships */
export interface LatheGraphEdge {
  id: string;
  source: string;             // Source node ID
  target: string;             // Target node ID
  type: LatheEdgeType;
  weight: number;             // 0-1, strength of relationship
  confidence: number;         // 0-100, how certain we are
  evidence: string;           // Why this edge exists
  frequency: number;          // How often seen in data
  sources: string[];          // Programs/tips supporting this edge
  properties: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// QUERY & RESULT TYPES
// ============================================================================

/** Query input for graph traversal */
export interface LatheGraphQuery {
  material?: string;
  operation?: string;
  tool?: string;
  constraints?: Record<string, unknown>;
  max_depth?: number;
  min_confidence?: number;
  include_alternatives?: boolean;
}

/** Path through the graph */
export interface GraphPath {
  nodes: string[];
  edges: string[];
  total_weight: number;
  confidence: number;
  explanation: string[];
}

/** Recommendation from graph query */
export interface LatheRecommendation {
  recommendation_id: string;
  material: string;
  operation: string;
  recommended_tool: string;
  parameters: {
    cutting_speed_mmin: number;
    feed_mmrev: number;
    doc_mm: number;
    coolant: string;
  };
  expected_outcomes: {
    tool_life_min: number;
    surface_finish_ra: number;
    mrr_cm3min: number;
  };
  confidence: number;
  reasoning_path: GraphPath;
  alternatives: LatheRecommendation[];
  warnings: string[];
  sources: string[];
}

/** Subgraph extraction result */
export interface SubgraphResult {
  nodes: LatheGraphNode[];
  edges: LatheGraphEdge[];
  center_node: string;
  depth: number;
  statistics: {
    total_nodes: number;
    total_edges: number;
    avg_confidence: number;
    communities_found: number;
  };
}

/** Similarity search result */
export interface SimilarityResult {
  query_node: string;
  similar_nodes: Array<{
    node_id: string;
    similarity: number;
    shared_properties: string[];
    shared_neighbors: string[];
  }>;
}

/** Inference result for missing edges */
export interface InferenceResult {
  inferred_edges: Array<{
    source: string;
    target: string;
    type: LatheEdgeType;
    confidence: number;
    basis: string;
  }>;
  reasoning: string[];
}

/** Graph statistics */
export interface GraphStatistics {
  total_nodes: number;
  total_edges: number;
  nodes_by_type: Record<LatheNodeType, number>;
  edges_by_type: Record<LatheEdgeType, number>;
  avg_degree: number;
  max_degree: number;
  density: number;
  num_communities: number;
  top_nodes_by_importance: Array<{ id: string; importance: number }>;
  coverage: {
    materials_covered: number;
    operations_covered: number;
    tools_covered: number;
  };
}

/** Experience update for learning */
export interface ExperienceUpdate {
  material: string;
  operation: string;
  tool: string;
  parameters: Record<string, number>;
  outcome: {
    tool_life_min?: number;
    surface_finish_ra?: number;
    cycle_time_sec?: number;
    success: boolean;
  };
  source: string;
  timestamp: string;
}

// ============================================================================
// CONSTANTS - LATHE MATERIALS
// ============================================================================

/** Common lathe materials with properties */
const LATHE_MATERIALS: Record<string, MaterialNodeProps> = {
  "D2": {
    iso_group: "H",
    hardness_hrc: 60,
    tensile_strength_mpa: 2000,
    machinability_factor: 0.35,
    thermal_conductivity_w_mk: 20,
    work_hardening_rate: 0.15,
    common_names: ["D2", "D-2", "AISI D2", "X155CrVMo12-1"],
    typical_applications: ["cold heading dies", "punches", "blanking dies"],
  },
  "M2": {
    iso_group: "H",
    hardness_hrc: 64,
    tensile_strength_mpa: 2200,
    machinability_factor: 0.30,
    thermal_conductivity_w_mk: 25,
    work_hardening_rate: 0.12,
    common_names: ["M2", "M-2", "AISI M2", "1.3343"],
    typical_applications: ["HSS tools", "drills", "taps", "punches"],
  },
  "S7": {
    iso_group: "P",
    hardness_hrc: 56,
    tensile_strength_mpa: 1900,
    machinability_factor: 0.45,
    thermal_conductivity_w_mk: 35,
    work_hardening_rate: 0.18,
    common_names: ["S7", "S-7", "AISI S7"],
    typical_applications: ["chisels", "punches", "shear blades"],
  },
  "A2": {
    iso_group: "H",
    hardness_hrc: 62,
    tensile_strength_mpa: 2100,
    machinability_factor: 0.38,
    thermal_conductivity_w_mk: 22,
    work_hardening_rate: 0.14,
    common_names: ["A2", "A-2", "AISI A2"],
    typical_applications: ["blanking dies", "forming dies", "gauges"],
  },
  "H13": {
    iso_group: "H",
    hardness_hrc: 52,
    tensile_strength_mpa: 1700,
    machinability_factor: 0.50,
    thermal_conductivity_w_mk: 28,
    work_hardening_rate: 0.20,
    common_names: ["H13", "H-13", "AISI H13"],
    typical_applications: ["die casting dies", "extrusion dies", "forging dies"],
  },
  "4140": {
    iso_group: "P",
    hardness_hrc: 32,
    tensile_strength_mpa: 1000,
    machinability_factor: 0.65,
    thermal_conductivity_w_mk: 42,
    work_hardening_rate: 0.25,
    common_names: ["4140", "AISI 4140", "42CrMo4"],
    typical_applications: ["shafts", "gears", "axles", "bolts"],
  },
  "4340": {
    iso_group: "P",
    hardness_hrc: 38,
    tensile_strength_mpa: 1200,
    machinability_factor: 0.55,
    thermal_conductivity_w_mk: 38,
    work_hardening_rate: 0.22,
    common_names: ["4340", "AISI 4340", "34CrNiMo6"],
    typical_applications: ["landing gear", "crankshafts", "connecting rods"],
  },
  "1018": {
    iso_group: "P",
    hardness_hb: 126,
    tensile_strength_mpa: 440,
    machinability_factor: 1.0,
    thermal_conductivity_w_mk: 51,
    work_hardening_rate: 0.35,
    common_names: ["1018", "AISI 1018", "C18"],
    typical_applications: ["shafts", "pins", "machinery parts"],
  },
  "1045": {
    iso_group: "P",
    hardness_hb: 179,
    tensile_strength_mpa: 620,
    machinability_factor: 0.75,
    thermal_conductivity_w_mk: 49,
    work_hardening_rate: 0.30,
    common_names: ["1045", "AISI 1045", "C45"],
    typical_applications: ["shafts", "gears", "bolts", "studs"],
  },
  "304SS": {
    iso_group: "M",
    hardness_hb: 201,
    tensile_strength_mpa: 515,
    machinability_factor: 0.45,
    thermal_conductivity_w_mk: 16,
    work_hardening_rate: 0.55,
    common_names: ["304", "304 SS", "AISI 304", "1.4301"],
    typical_applications: ["food equipment", "chemical tanks", "fasteners"],
  },
  "316SS": {
    iso_group: "M",
    hardness_hb: 217,
    tensile_strength_mpa: 580,
    machinability_factor: 0.40,
    thermal_conductivity_w_mk: 14,
    work_hardening_rate: 0.58,
    common_names: ["316", "316 SS", "AISI 316", "1.4401"],
    typical_applications: ["marine hardware", "medical implants", "chemical equipment"],
  },
  "17-4PH": {
    iso_group: "M",
    hardness_hrc: 44,
    tensile_strength_mpa: 1300,
    machinability_factor: 0.35,
    thermal_conductivity_w_mk: 18,
    work_hardening_rate: 0.40,
    common_names: ["17-4 PH", "17-4PH", "1.4542"],
    typical_applications: ["aerospace", "nuclear", "chemical processing"],
  },
  "Inconel718": {
    iso_group: "S",
    hardness_hrc: 40,
    tensile_strength_mpa: 1400,
    machinability_factor: 0.15,
    thermal_conductivity_w_mk: 11,
    work_hardening_rate: 0.65,
    common_names: ["Inconel 718", "IN718", "2.4668"],
    typical_applications: ["jet engines", "gas turbines", "nuclear reactors"],
  },
  "Ti6Al4V": {
    iso_group: "S",
    hardness_hrc: 36,
    tensile_strength_mpa: 950,
    machinability_factor: 0.20,
    thermal_conductivity_w_mk: 7,
    work_hardening_rate: 0.50,
    common_names: ["Ti-6Al-4V", "Ti64", "Grade 5 Ti"],
    typical_applications: ["aerospace", "medical implants", "racing parts"],
  },
  "Carbide": {
    iso_group: "K",
    hardness_hrc: 90,
    tensile_strength_mpa: 3500,
    machinability_factor: 0.08,
    thermal_conductivity_w_mk: 80,
    work_hardening_rate: 0.0,
    common_names: ["Tungsten Carbide", "WC-Co", "Cemented Carbide"],
    typical_applications: ["cutting tools", "wear parts", "dies"],
  },
  "6061Al": {
    iso_group: "N",
    hardness_hb: 95,
    tensile_strength_mpa: 310,
    machinability_factor: 2.0,
    thermal_conductivity_w_mk: 167,
    work_hardening_rate: 0.15,
    common_names: ["6061", "6061-T6", "Al 6061"],
    typical_applications: ["structural parts", "fixtures", "aircraft parts"],
  },
  "7075Al": {
    iso_group: "N",
    hardness_hb: 150,
    tensile_strength_mpa: 570,
    machinability_factor: 1.5,
    thermal_conductivity_w_mk: 130,
    work_hardening_rate: 0.12,
    common_names: ["7075", "7075-T6", "Al 7075"],
    typical_applications: ["aircraft structures", "molds", "tooling"],
  },
  "Brass360": {
    iso_group: "N",
    hardness_hb: 100,
    tensile_strength_mpa: 400,
    machinability_factor: 3.0,
    thermal_conductivity_w_mk: 115,
    work_hardening_rate: 0.10,
    common_names: ["360 Brass", "Free Cutting Brass", "C36000"],
    typical_applications: ["fittings", "valves", "gears"],
  },
  "CastIron": {
    iso_group: "K",
    hardness_hb: 220,
    tensile_strength_mpa: 300,
    machinability_factor: 0.70,
    thermal_conductivity_w_mk: 50,
    work_hardening_rate: 0.05,
    common_names: ["Gray Cast Iron", "GG25", "FC250"],
    typical_applications: ["machine bases", "housings", "blocks"],
  },
};

// ============================================================================
// CONSTANTS - LATHE OPERATIONS
// ============================================================================

/** Lathe operations with properties */
const LATHE_OPERATIONS: Record<string, OperationNodeProps> = {
  "facing": {
    operation_class: "facing",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [0.5, 4.0],
    typical_feed_range_mmrev: [0.15, 0.40],
    tool_types_used: ["CNMG", "DNMG", "WNMG"],
    requires_rigid_setup: false,
    chip_breaking_critical: true,
  },
  "rough_od": {
    operation_class: "external",
    roughing_or_finishing: "roughing",
    typical_doc_range_mm: [2.0, 6.0],
    typical_feed_range_mmrev: [0.25, 0.50],
    tool_types_used: ["CNMG", "WNMG", "SNMG"],
    requires_rigid_setup: true,
    chip_breaking_critical: true,
  },
  "finish_od": {
    operation_class: "external",
    roughing_or_finishing: "finishing",
    typical_doc_range_mm: [0.2, 1.0],
    typical_feed_range_mmrev: [0.08, 0.20],
    tool_types_used: ["DNMG", "VNMG", "CCMT"],
    requires_rigid_setup: false,
    chip_breaking_critical: false,
  },
  "rough_id": {
    operation_class: "internal",
    roughing_or_finishing: "roughing",
    typical_doc_range_mm: [1.0, 3.0],
    typical_feed_range_mmrev: [0.15, 0.30],
    tool_types_used: ["CCMT", "TCMT", "DCMT"],
    requires_rigid_setup: true,
    chip_breaking_critical: true,
  },
  "finish_id": {
    operation_class: "internal",
    roughing_or_finishing: "finishing",
    typical_doc_range_mm: [0.1, 0.5],
    typical_feed_range_mmrev: [0.05, 0.15],
    tool_types_used: ["CCMT", "DCMT", "VCMT"],
    requires_rigid_setup: false,
    chip_breaking_critical: false,
  },
  "threading_od": {
    operation_class: "threading",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [0.1, 0.5],
    typical_feed_range_mmrev: [0.5, 3.0],  // Thread pitch
    tool_types_used: ["16ER", "16IR", "22ER"],
    requires_rigid_setup: true,
    chip_breaking_critical: false,
  },
  "threading_id": {
    operation_class: "threading",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [0.1, 0.4],
    typical_feed_range_mmrev: [0.5, 2.0],
    tool_types_used: ["16IR", "11IR", "22IR"],
    requires_rigid_setup: true,
    chip_breaking_critical: false,
  },
  "grooving_od": {
    operation_class: "grooving",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [1.0, 6.0],  // Groove width
    typical_feed_range_mmrev: [0.05, 0.15],
    tool_types_used: ["N123", "GX", "QS"],
    requires_rigid_setup: true,
    chip_breaking_critical: true,
  },
  "grooving_id": {
    operation_class: "grooving",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [1.0, 4.0],
    typical_feed_range_mmrev: [0.03, 0.10],
    tool_types_used: ["MB", "QS-LF", "GX-IF"],
    requires_rigid_setup: true,
    chip_breaking_critical: true,
  },
  "parting": {
    operation_class: "parting",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [2.0, 6.0],  // Blade width
    typical_feed_range_mmrev: [0.05, 0.15],
    tool_types_used: ["N123", "QD", "CoroCut"],
    requires_rigid_setup: true,
    chip_breaking_critical: true,
  },
  "drilling": {
    operation_class: "drilling",
    roughing_or_finishing: "roughing",
    typical_doc_range_mm: [0.0, 0.0],  // N/A for drilling
    typical_feed_range_mmrev: [0.10, 0.35],
    tool_types_used: ["CoroDrill", "U-drill", "Indexable"],
    requires_rigid_setup: false,
    chip_breaking_critical: true,
  },
  "boring": {
    operation_class: "internal",
    roughing_or_finishing: "both",
    typical_doc_range_mm: [0.5, 3.0],
    typical_feed_range_mmrev: [0.10, 0.30],
    tool_types_used: ["CCMT", "TCMT", "SCMT"],
    requires_rigid_setup: true,
    chip_breaking_critical: true,
  },
};

// ============================================================================
// CONSTANTS - LATHE TOOLS
// ============================================================================

/** Lathe tool inserts with properties */
const LATHE_TOOLS: Record<string, ToolNodeProps> = {
  "CNMG": {
    insert_shape: "C",
    nose_radius_mm: 0.8,
    approach_angle_deg: 95,
    clearance_angle_deg: 0,
    holder_style: "MCLNR",
    max_doc_mm: 6.0,
    suitable_operations: ["facing", "rough_od", "finish_od"],
    material_compatibility: ["P", "M", "K", "H"],  // H with appropriate grade (KC5025, etc.)
  },
  "DNMG": {
    insert_shape: "D",
    nose_radius_mm: 0.4,
    approach_angle_deg: 93,
    clearance_angle_deg: 0,
    holder_style: "MDJNR",
    max_doc_mm: 4.0,
    suitable_operations: ["facing", "finish_od", "profiling"],
    material_compatibility: ["P", "M", "K", "N"],
  },
  "VNMG": {
    insert_shape: "V",
    nose_radius_mm: 0.4,
    approach_angle_deg: 93,
    clearance_angle_deg: 0,
    holder_style: "MVJNR",
    max_doc_mm: 3.0,
    suitable_operations: ["finish_od", "profiling", "copying"],
    material_compatibility: ["P", "M", "N"],
  },
  "WNMG": {
    insert_shape: "W",
    nose_radius_mm: 0.8,
    approach_angle_deg: 95,
    clearance_angle_deg: 0,
    holder_style: "MWLNR",
    max_doc_mm: 8.0,
    suitable_operations: ["rough_od", "heavy_roughing"],
    material_compatibility: ["P", "K"],
  },
  "SNMG": {
    insert_shape: "S",
    nose_radius_mm: 1.2,
    approach_angle_deg: 75,
    clearance_angle_deg: 0,
    holder_style: "MSSNR",
    max_doc_mm: 10.0,
    suitable_operations: ["heavy_roughing", "interrupted_cut"],
    material_compatibility: ["P", "K", "H"],
  },
  "CCMT": {
    insert_shape: "C",
    nose_radius_mm: 0.4,
    approach_angle_deg: 95,
    clearance_angle_deg: 7,
    holder_style: "SCLCR",
    max_doc_mm: 2.5,
    suitable_operations: ["finish_id", "boring", "small_diameter"],
    material_compatibility: ["P", "M", "N"],
  },
  "DCMT": {
    insert_shape: "D",
    nose_radius_mm: 0.2,
    approach_angle_deg: 93,
    clearance_angle_deg: 7,
    holder_style: "SDNCN",
    max_doc_mm: 2.0,
    suitable_operations: ["finish_id", "precision_boring"],
    material_compatibility: ["P", "M", "N"],
  },
  "TCMT": {
    insert_shape: "T",
    nose_radius_mm: 0.4,
    approach_angle_deg: 91,
    clearance_angle_deg: 7,
    holder_style: "STFCR",
    max_doc_mm: 3.0,
    suitable_operations: ["rough_id", "boring", "general_id"],
    material_compatibility: ["P", "M", "K"],
  },
  "VCMT": {
    insert_shape: "V",
    nose_radius_mm: 0.2,
    approach_angle_deg: 93,
    clearance_angle_deg: 7,
    holder_style: "SVJBR",
    max_doc_mm: 1.5,
    suitable_operations: ["finish_id", "small_bore"],
    material_compatibility: ["P", "M", "N"],
  },
  "16ER": {
    insert_shape: "threading",
    nose_radius_mm: 0.0,
    approach_angle_deg: 60,
    clearance_angle_deg: 0,
    holder_style: "SEL",
    max_doc_mm: 0.5,
    suitable_operations: ["threading_od"],
    material_compatibility: ["P", "M", "K", "N", "S", "H"],
  },
  "16IR": {
    insert_shape: "threading",
    nose_radius_mm: 0.0,
    approach_angle_deg: 60,
    clearance_angle_deg: 0,
    holder_style: "SIL",
    max_doc_mm: 0.4,
    suitable_operations: ["threading_id"],
    material_compatibility: ["P", "M", "K", "N"],
  },
  "N123": {
    insert_shape: "grooving",
    nose_radius_mm: 0.15,
    approach_angle_deg: 90,
    clearance_angle_deg: 0,
    holder_style: "RF123",
    max_doc_mm: 6.0,
    suitable_operations: ["grooving_od", "parting"],
    material_compatibility: ["P", "M", "K", "N", "S"],
  },
  "GX": {
    insert_shape: "grooving",
    nose_radius_mm: 0.2,
    approach_angle_deg: 90,
    clearance_angle_deg: 0,
    holder_style: "GX-holder",
    max_doc_mm: 8.0,
    suitable_operations: ["grooving_od", "deep_grooving"],
    material_compatibility: ["P", "M", "K"],
  },
  "CBN": {
    insert_shape: "C",
    nose_radius_mm: 0.8,
    approach_angle_deg: 95,
    clearance_angle_deg: 0,
    holder_style: "CNGA",
    max_doc_mm: 0.5,
    suitable_operations: ["hard_turning", "finish_od"],
    material_compatibility: ["H"],
  },
  "Ceramic": {
    insert_shape: "R",
    nose_radius_mm: 0.8,
    approach_angle_deg: 95,
    clearance_angle_deg: 0,
    holder_style: "RCGX",
    max_doc_mm: 0.3,
    suitable_operations: ["hard_turning", "high_speed_finish"],
    material_compatibility: ["H", "K"],
  },
  "PCD": {
    insert_shape: "C",
    nose_radius_mm: 0.4,
    approach_angle_deg: 95,
    clearance_angle_deg: 0,
    holder_style: "CCGW",
    max_doc_mm: 2.0,
    suitable_operations: ["finish_od", "non_ferrous"],
    material_compatibility: ["N", "K"],
  },
};

// ============================================================================
// CONSTANTS - INSERT GRADES
// ============================================================================

/** Insert grades with material suitability */
const INSERT_GRADES: Record<string, { iso_groups: ISOGroup[]; coating: string; application: string }> = {
  "GC4325": { iso_groups: ["P"], coating: "CVD", application: "Steel turning, general" },
  "GC4315": { iso_groups: ["P"], coating: "CVD", application: "Steel turning, finishing" },
  "GC4335": { iso_groups: ["P"], coating: "CVD", application: "Steel turning, roughing" },
  "GC2025": { iso_groups: ["M"], coating: "PVD", application: "Stainless steel, general" },
  "GC2015": { iso_groups: ["M"], coating: "PVD", application: "Stainless steel, finishing" },
  "GC1125": { iso_groups: ["S"], coating: "PVD", application: "Heat resistant alloys" },
  "GC1105": { iso_groups: ["S"], coating: "PVD", application: "Titanium alloys" },
  "GC3210": { iso_groups: ["K"], coating: "CVD", application: "Cast iron, general" },
  "GC3220": { iso_groups: ["K"], coating: "CVD", application: "Cast iron, roughing" },
  "GC1525": { iso_groups: ["N"], coating: "PVD", application: "Aluminum, general" },
  "CB7025": { iso_groups: ["H"], coating: "CBN", application: "Hard turning 50-65 HRC" },
  "CB7015": { iso_groups: ["H"], coating: "CBN", application: "Hard turning finishing" },
  "CC6060": { iso_groups: ["H", "K"], coating: "Ceramic", application: "Hard turning, cast iron" },
  "KC5010": { iso_groups: ["P", "M"], coating: "PVD", application: "General purpose" },
  "KC5025": { iso_groups: ["P"], coating: "CVD", application: "Steel, heavy roughing" },
};

// ============================================================================
// KNOWLEDGE GRAPH ENGINE
// ============================================================================

/**
 * LatheKnowledgeGraphEngine — Comprehensive lathe knowledge graph
 */
export class LatheKnowledgeGraphEngine {
  private static instance: LatheKnowledgeGraphEngine;

  /** Graph storage */
  private nodes: Map<string, LatheGraphNode> = new Map();
  private edges: Map<string, LatheGraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();  // node → connected edge IDs
  private reverseAdjacency: Map<string, Set<string>> = new Map();  // target → incoming edge IDs

  /** Index structures */
  private nodesByType: Map<LatheNodeType, Set<string>> = new Map();
  private edgesByType: Map<LatheEdgeType, Set<string>> = new Map();
  private nodesByName: Map<string, string> = new Map();  // lowercase name → node ID

  /** Graph state */
  private graphBuilt: boolean = false;
  private lastBuildTime: string = "";
  private pageRankComputed: boolean = false;
  private communitiesDetected: boolean = false;

  private constructor() {
    log.info("[LatheKnowledgeGraph] Engine initialized");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LatheKnowledgeGraphEngine {
    if (!LatheKnowledgeGraphEngine.instance) {
      LatheKnowledgeGraphEngine.instance = new LatheKnowledgeGraphEngine();
    }
    return LatheKnowledgeGraphEngine.instance;
  }

  // ==========================================================================
  // GRAPH CONSTRUCTION
  // ==========================================================================

  /**
   * Build complete knowledge graph from all sources
   */
  buildGraph(): GraphStatistics {
    log.info("[LatheKnowledgeGraph] Building knowledge graph...");

    // Clear existing graph
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacency.clear();
    this.nodesByType.clear();
    this.edgesByType.clear();
    this.nodesByName.clear();

    // Initialize type indices
    const nodeTypes: LatheNodeType[] = [
      "material", "operation", "tool", "parameter", "outcome",
      "insert_grade", "coating", "machine", "coolant", "workholding", "constraint"
    ];
    for (const type of nodeTypes) {
      this.nodesByType.set(type, new Set());
    }

    const edgeTypes: LatheEdgeType[] = [
      "compatible_with", "suitable_for", "recommended", "produces",
      "constrains", "improves", "degrades", "requires", "alternative_to",
      "succeeds", "learned_from", "conflicts_with", "optimal_for",
      "coated_with", "uses_grade", "mounted_in"
    ];
    for (const type of edgeTypes) {
      this.edgesByType.set(type, new Set());
    }

    // Build from static knowledge
    this.buildMaterialNodes();
    this.buildOperationNodes();
    this.buildToolNodes();
    this.buildInsertGradeNodes();
    this.buildParameterNodes();
    this.buildOutcomeNodes();

    // Build edges from domain knowledge
    this.buildMaterialToolEdges();
    this.buildToolOperationEdges();
    this.buildOperationParameterEdges();
    this.buildParameterOutcomeEdges();
    this.buildMaterialConstraintEdges();
    this.buildOperationSequenceEdges();

    // Build from physics models
    this.buildPhysicsBasedEdges();

    // Compute graph metrics
    this.computePageRank();
    this.detectCommunities();

    this.graphBuilt = true;
    this.lastBuildTime = new Date().toISOString();

    log.info(`[LatheKnowledgeGraph] Graph built: ${this.nodes.size} nodes, ${this.edges.size} edges`);

    return this.getStatistics();
  }

  /**
   * Build material nodes
   */
  private buildMaterialNodes(): void {
    for (const [name, props] of Object.entries(LATHE_MATERIALS)) {
      const nodeId = `mat_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      this.addNode({
        id: nodeId,
        type: "material",
        name,
        properties: props,
        importance: 0,
        community: 0,
        sources: ["static_knowledge"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build operation nodes
   */
  private buildOperationNodes(): void {
    for (const [name, props] of Object.entries(LATHE_OPERATIONS)) {
      const nodeId = `op_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      this.addNode({
        id: nodeId,
        type: "operation",
        name,
        properties: props,
        importance: 0,
        community: 0,
        sources: ["static_knowledge"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build tool nodes
   */
  private buildToolNodes(): void {
    for (const [name, props] of Object.entries(LATHE_TOOLS)) {
      const nodeId = `tool_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      this.addNode({
        id: nodeId,
        type: "tool",
        name,
        properties: props,
        importance: 0,
        community: 0,
        sources: ["static_knowledge"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build insert grade nodes
   */
  private buildInsertGradeNodes(): void {
    for (const [name, props] of Object.entries(INSERT_GRADES)) {
      const nodeId = `grade_${name.toLowerCase()}`;
      this.addNode({
        id: nodeId,
        type: "insert_grade",
        name,
        properties: props,
        importance: 0,
        community: 0,
        sources: ["static_knowledge"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build parameter nodes for common cutting parameters
   */
  private buildParameterNodes(): void {
    // Cutting speeds by ISO group (m/min)
    const speeds: Record<string, { value: number; unit: string; iso_group: string }> = {
      "speed_p_rough": { value: 200, unit: "m/min", iso_group: "P" },
      "speed_p_finish": { value: 280, unit: "m/min", iso_group: "P" },
      "speed_m_rough": { value: 120, unit: "m/min", iso_group: "M" },
      "speed_m_finish": { value: 180, unit: "m/min", iso_group: "M" },
      "speed_k_rough": { value: 250, unit: "m/min", iso_group: "K" },
      "speed_k_finish": { value: 350, unit: "m/min", iso_group: "K" },
      "speed_n_rough": { value: 600, unit: "m/min", iso_group: "N" },
      "speed_n_finish": { value: 1000, unit: "m/min", iso_group: "N" },
      "speed_s_rough": { value: 40, unit: "m/min", iso_group: "S" },
      "speed_s_finish": { value: 60, unit: "m/min", iso_group: "S" },
      "speed_h_rough": { value: 80, unit: "m/min", iso_group: "H" },
      "speed_h_finish": { value: 150, unit: "m/min", iso_group: "H" },
    };

    for (const [name, props] of Object.entries(speeds)) {
      this.addNode({
        id: `param_${name}`,
        type: "parameter",
        name: name.replace(/_/g, " "),
        properties: {
          parameter_type: "speed",
          value: props.value,
          unit: props.unit,
          iso_group: props.iso_group,
          min_recommended: props.value * 0.7,
          max_recommended: props.value * 1.3,
          physics_basis: "taylor",
        },
        importance: 0,
        community: 0,
        sources: ["physics_constants"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Feed rates
    const feeds: Record<string, { value: number; operation: string }> = {
      "feed_rough_heavy": { value: 0.4, operation: "roughing" },
      "feed_rough_medium": { value: 0.3, operation: "roughing" },
      "feed_rough_light": { value: 0.2, operation: "roughing" },
      "feed_finish_standard": { value: 0.12, operation: "finishing" },
      "feed_finish_fine": { value: 0.08, operation: "finishing" },
      "feed_finish_mirror": { value: 0.05, operation: "finishing" },
      "feed_thread_coarse": { value: 2.0, operation: "threading" },
      "feed_thread_fine": { value: 1.0, operation: "threading" },
      "feed_groove": { value: 0.08, operation: "grooving" },
      "feed_part": { value: 0.10, operation: "parting" },
    };

    for (const [name, props] of Object.entries(feeds)) {
      this.addNode({
        id: `param_${name}`,
        type: "parameter",
        name: name.replace(/_/g, " "),
        properties: {
          parameter_type: "feed",
          value: props.value,
          unit: "mm/rev",
          operation: props.operation,
          min_recommended: props.value * 0.5,
          max_recommended: props.value * 1.5,
          physics_basis: "kienzle",
        },
        importance: 0,
        community: 0,
        sources: ["physics_constants"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Depths of cut
    const docs: Record<string, { value: number; operation: string }> = {
      "doc_rough_heavy": { value: 5.0, operation: "roughing" },
      "doc_rough_medium": { value: 3.0, operation: "roughing" },
      "doc_rough_light": { value: 1.5, operation: "roughing" },
      "doc_finish_standard": { value: 0.5, operation: "finishing" },
      "doc_finish_fine": { value: 0.25, operation: "finishing" },
      "doc_finish_spring": { value: 0.1, operation: "finishing" },
    };

    for (const [name, props] of Object.entries(docs)) {
      this.addNode({
        id: `param_${name}`,
        type: "parameter",
        name: name.replace(/_/g, " "),
        properties: {
          parameter_type: "doc",
          value: props.value,
          unit: "mm",
          operation: props.operation,
          min_recommended: props.value * 0.3,
          max_recommended: props.value * 2.0,
          physics_basis: "kienzle",
        },
        importance: 0,
        community: 0,
        sources: ["physics_constants"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build outcome nodes
   */
  private buildOutcomeNodes(): void {
    const outcomes: Array<{
      id: string;
      name: string;
      type: string;
      value: number;
      unit: string;
      quality: "excellent" | "good" | "acceptable" | "poor";
    }> = [
      { id: "out_life_excellent", name: "Excellent tool life", type: "tool_life", value: 60, unit: "min", quality: "excellent" },
      { id: "out_life_good", name: "Good tool life", type: "tool_life", value: 30, unit: "min", quality: "good" },
      { id: "out_life_acceptable", name: "Acceptable tool life", type: "tool_life", value: 15, unit: "min", quality: "acceptable" },
      { id: "out_life_poor", name: "Poor tool life", type: "tool_life", value: 5, unit: "min", quality: "poor" },
      { id: "out_finish_excellent", name: "Excellent surface finish", type: "surface_finish", value: 0.4, unit: "Ra", quality: "excellent" },
      { id: "out_finish_good", name: "Good surface finish", type: "surface_finish", value: 1.6, unit: "Ra", quality: "good" },
      { id: "out_finish_acceptable", name: "Acceptable surface finish", type: "surface_finish", value: 3.2, unit: "Ra", quality: "acceptable" },
      { id: "out_finish_poor", name: "Poor surface finish", type: "surface_finish", value: 6.3, unit: "Ra", quality: "poor" },
      { id: "out_mrr_high", name: "High MRR", type: "cycle_time", value: 100, unit: "cm3/min", quality: "excellent" },
      { id: "out_mrr_medium", name: "Medium MRR", type: "cycle_time", value: 50, unit: "cm3/min", quality: "good" },
      { id: "out_mrr_low", name: "Low MRR", type: "cycle_time", value: 20, unit: "cm3/min", quality: "acceptable" },
      { id: "out_chip_good", name: "Good chip control", type: "chip_form", value: 1, unit: "score", quality: "excellent" },
      { id: "out_chip_ok", name: "Acceptable chip form", type: "chip_form", value: 0.7, unit: "score", quality: "good" },
      { id: "out_chip_poor", name: "Poor chip breaking", type: "chip_form", value: 0.3, unit: "score", quality: "poor" },
    ];

    for (const outcome of outcomes) {
      this.addNode({
        id: outcome.id,
        type: "outcome",
        name: outcome.name,
        properties: {
          outcome_type: outcome.type,
          value: outcome.value,
          unit: outcome.unit,
          quality: outcome.quality,
          confidence: 85,
        },
        importance: 0,
        community: 0,
        sources: ["domain_knowledge"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build material-tool compatibility edges
   */
  private buildMaterialToolEdges(): void {
    for (const [matName, matProps] of Object.entries(LATHE_MATERIALS)) {
      const matId = `mat_${matName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const isoGroup = matProps.iso_group;

      for (const [toolName, toolProps] of Object.entries(LATHE_TOOLS)) {
        const toolId = `tool_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

        if (toolProps.material_compatibility.includes(isoGroup)) {
          // Compute weight based on machinability and tool type
          let weight = 0.7;
          if (matProps.machinability_factor > 0.8) weight = 0.9;
          else if (matProps.machinability_factor < 0.3) weight = 0.5;

          // Special cases
          if (isoGroup === "H" && toolName === "CBN") weight = 0.95;
          if (isoGroup === "N" && toolName === "PCD") weight = 0.95;
          if (isoGroup === "S" && toolName.includes("Ceramic")) weight = 0.85;

          this.addEdge({
            id: `edge_${matId}_${toolId}`,
            source: matId,
            target: toolId,
            type: "compatible_with",
            weight,
            confidence: 90,
            evidence: `${toolName} compatible with ISO ${isoGroup} materials`,
            frequency: 100,
            sources: ["tool_catalog"],
            properties: { iso_group: isoGroup },
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * Build tool-operation suitability edges
   */
  private buildToolOperationEdges(): void {
    for (const [toolName, toolProps] of Object.entries(LATHE_TOOLS)) {
      const toolId = `tool_${toolName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      for (const opName of toolProps.suitable_operations) {
        const normalizedOp = opName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const opId = `op_${normalizedOp}`;

        if (this.nodes.has(opId)) {
          this.addEdge({
            id: `edge_${toolId}_${opId}`,
            source: toolId,
            target: opId,
            type: "suitable_for",
            weight: 0.85,
            confidence: 95,
            evidence: `${toolName} designed for ${opName}`,
            frequency: 100,
            sources: ["tool_catalog"],
            properties: {},
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * Build operation-parameter recommendation edges
   */
  private buildOperationParameterEdges(): void {
    // Map operations to recommended parameters
    const opParamMap: Record<string, string[]> = {
      "op_rough_od": ["param_feed_rough_medium", "param_doc_rough_medium", "param_speed_p_rough"],
      "op_finish_od": ["param_feed_finish_standard", "param_doc_finish_standard", "param_speed_p_finish"],
      "op_rough_id": ["param_feed_rough_light", "param_doc_rough_light"],
      "op_finish_id": ["param_feed_finish_fine", "param_doc_finish_fine"],
      "op_facing": ["param_feed_rough_medium", "param_doc_rough_light"],
      "op_threading_od": ["param_feed_thread_coarse"],
      "op_threading_id": ["param_feed_thread_fine"],
      "op_grooving_od": ["param_feed_groove"],
      "op_parting": ["param_feed_part"],
    };

    for (const [opId, params] of Object.entries(opParamMap)) {
      if (!this.nodes.has(opId)) continue;

      for (const paramId of params) {
        if (!this.nodes.has(paramId)) continue;

        this.addEdge({
          id: `edge_${opId}_${paramId}`,
          source: opId,
          target: paramId,
          type: "recommended",
          weight: 0.8,
          confidence: 85,
          evidence: "Standard parameter recommendation",
          frequency: 50,
          sources: ["domain_knowledge"],
          properties: {},
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Build parameter-outcome effect edges
   */
  private buildParameterOutcomeEdges(): void {
    // Feed affects surface finish (inverse relationship)
    const feedOutcomes: Array<{ param: string; outcome: string; weight: number }> = [
      { param: "param_feed_finish_mirror", outcome: "out_finish_excellent", weight: 0.9 },
      { param: "param_feed_finish_fine", outcome: "out_finish_good", weight: 0.85 },
      { param: "param_feed_finish_standard", outcome: "out_finish_acceptable", weight: 0.8 },
      { param: "param_feed_rough_heavy", outcome: "out_mrr_high", weight: 0.9 },
      { param: "param_feed_rough_medium", outcome: "out_mrr_medium", weight: 0.85 },
    ];

    for (const { param, outcome, weight } of feedOutcomes) {
      if (!this.nodes.has(param) || !this.nodes.has(outcome)) continue;

      this.addEdge({
        id: `edge_${param}_${outcome}`,
        source: param,
        target: outcome,
        type: "produces",
        weight,
        confidence: 80,
        evidence: "Physics relationship: feed affects surface finish and MRR",
        frequency: 100,
        sources: ["physics_model"],
        properties: {},
        created_at: new Date().toISOString(),
      });
    }

    // DOC affects MRR
    const docOutcomes: Array<{ param: string; outcome: string; weight: number }> = [
      { param: "param_doc_rough_heavy", outcome: "out_mrr_high", weight: 0.9 },
      { param: "param_doc_rough_medium", outcome: "out_mrr_medium", weight: 0.85 },
      { param: "param_doc_finish_fine", outcome: "out_finish_good", weight: 0.8 },
    ];

    for (const { param, outcome, weight } of docOutcomes) {
      if (!this.nodes.has(param) || !this.nodes.has(outcome)) continue;

      this.addEdge({
        id: `edge_${param}_${outcome}_doc`,
        source: param,
        target: outcome,
        type: "produces",
        weight,
        confidence: 85,
        evidence: "Physics: DOC affects MRR and surface finish",
        frequency: 100,
        sources: ["physics_model"],
        properties: {},
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build material constraint edges
   */
  private buildMaterialConstraintEdges(): void {
    // Hard materials constrain cutting speed
    for (const [matName, matProps] of Object.entries(LATHE_MATERIALS)) {
      const matId = `mat_${matName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      // Low machinability materials constrain aggressive parameters
      if (matProps.machinability_factor < 0.3) {
        // Constrain high speed parameters
        const highSpeedParams = ["param_speed_p_rough", "param_speed_p_finish"];
        for (const paramId of highSpeedParams) {
          if (!this.nodes.has(paramId)) continue;

          this.addEdge({
            id: `edge_${matId}_${paramId}_constraint`,
            source: matId,
            target: paramId,
            type: "constrains",
            weight: 0.9,
            confidence: 95,
            evidence: `Low machinability (${matProps.machinability_factor}) limits cutting speed`,
            frequency: 100,
            sources: ["physics_model"],
            properties: {
              speed_reduction_factor: matProps.machinability_factor,
            },
            created_at: new Date().toISOString(),
          });
        }
      }

      // Work hardening materials constrain feed
      if (matProps.work_hardening_rate && matProps.work_hardening_rate > 0.4) {
        this.addEdge({
          id: `edge_${matId}_feed_constraint`,
          source: matId,
          target: "param_feed_finish_fine",
          type: "conflicts_with",
          weight: 0.7,
          confidence: 85,
          evidence: `High work hardening (${matProps.work_hardening_rate}) - avoid light cuts`,
          frequency: 50,
          sources: ["tribal_knowledge"],
          properties: {},
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Build operation sequence edges
   */
  private buildOperationSequenceEdges(): void {
    const sequences: Array<{ from: string; to: string; weight: number }> = [
      { from: "op_facing", to: "op_rough_od", weight: 0.9 },
      { from: "op_rough_od", to: "op_finish_od", weight: 0.95 },
      { from: "op_rough_id", to: "op_finish_id", weight: 0.95 },
      { from: "op_finish_od", to: "op_threading_od", weight: 0.8 },
      { from: "op_finish_od", to: "op_grooving_od", weight: 0.85 },
      { from: "op_grooving_od", to: "op_parting", weight: 0.9 },
      { from: "op_drilling", to: "op_rough_id", weight: 0.9 },
      { from: "op_drilling", to: "op_boring", weight: 0.85 },
    ];

    for (const { from, to, weight } of sequences) {
      if (!this.nodes.has(from) || !this.nodes.has(to)) continue;

      this.addEdge({
        id: `edge_${from}_${to}_seq`,
        source: from,
        target: to,
        type: "succeeds",
        weight,
        confidence: 90,
        evidence: "Standard operation sequence",
        frequency: 100,
        sources: ["domain_knowledge"],
        properties: {},
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Build edges from physics models (Kienzle, Taylor)
   */
  private buildPhysicsBasedEdges(): void {
    // Use Kienzle constants to weight material-parameter relationships
    for (const [isoGroup, kienzle] of Object.entries(CANONICAL_KIENZLE)) {
      const kc1_1 = kienzle.kc1_1;
      const mc = kienzle.mc;

      // Find materials in this ISO group
      for (const [matName, matProps] of Object.entries(LATHE_MATERIALS)) {
        if (matProps.iso_group !== isoGroup) continue;

        const matId = `mat_${matName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

        // High kc1_1 means harder to cut - recommend lower feeds
        const feedRecommendation = kc1_1 > 2000 ? "param_feed_rough_light" : "param_feed_rough_medium";

        if (this.nodes.has(feedRecommendation)) {
          this.addEdge({
            id: `edge_${matId}_${feedRecommendation}_kienzle`,
            source: matId,
            target: feedRecommendation,
            type: "recommended",
            weight: 0.85,
            confidence: 90,
            evidence: `Kienzle kc1.1=${kc1_1} MPa, mc=${mc}`,
            frequency: 50,
            sources: ["kienzle_model"],
            properties: { kc1_1, mc },
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Use Taylor constants for tool life predictions
    for (const [toolType, taylor] of Object.entries(CANONICAL_TAYLOR)) {
      // Map tool types to our tool nodes
      const toolMapping: Record<string, string> = {
        "carbide_coated": "tool_cnmg",
        "carbide_uncoated": "tool_cnmg",
        "hss": "tool_cnmg",
        "ceramic": "tool_ceramic",
        "cbn": "tool_cbn",
      };

      const toolId = toolMapping[toolType];
      if (!toolId || !this.nodes.has(toolId)) continue;

      // Higher C value = better tool life potential
      const outcomeId = taylor.C > 300 ? "out_life_excellent" : taylor.C > 150 ? "out_life_good" : "out_life_acceptable";

      if (this.nodes.has(outcomeId)) {
        this.addEdge({
          id: `edge_${toolId}_${outcomeId}_taylor`,
          source: toolId,
          target: outcomeId,
          type: "produces",
          weight: 0.8,
          confidence: 85,
          evidence: `Taylor C=${taylor.C}, n=${taylor.n}`,
          frequency: 50,
          sources: ["taylor_model"],
          properties: { C: taylor.C, n: taylor.n },
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // ==========================================================================
  // GRAPH ALGORITHMS
  // ==========================================================================

  /**
   * Compute PageRank for all nodes
   * Iterative power method with damping factor 0.85
   */
  private computePageRank(iterations: number = 50, damping: number = 0.85): void {
    const n = this.nodes.size;
    if (n === 0) return;

    const nodeIds = Array.from(this.nodes.keys());

    // Initialize PageRank values
    let pr: Map<string, number> = new Map();
    for (const id of nodeIds) {
      pr.set(id, 1 / n);
    }

    // Build outbound link counts
    const outDegree: Map<string, number> = new Map();
    for (const id of nodeIds) {
      const edges = this.adjacencyList.get(id) || new Set();
      outDegree.set(id, edges.size);
    }

    // Power iteration
    for (let iter = 0; iter < iterations; iter++) {
      const newPr: Map<string, number> = new Map();

      for (const id of nodeIds) {
        let sum = 0;

        // Sum contributions from incoming edges
        const incomingEdges = this.reverseAdjacency.get(id) || new Set();
        for (const edgeId of incomingEdges) {
          const edge = this.edges.get(edgeId);
          if (!edge) continue;

          const sourceId = edge.source;
          const sourcePr = pr.get(sourceId) || 0;
          const sourceOut = outDegree.get(sourceId) || 1;

          // Weight by edge weight
          sum += (sourcePr / sourceOut) * edge.weight;
        }

        newPr.set(id, (1 - damping) / n + damping * sum);
      }

      pr = newPr;
    }

    // Normalize and update nodes
    const maxPr = Math.max(...pr.values());
    for (const [id, value] of pr) {
      const node = this.nodes.get(id);
      if (node) {
        node.importance = maxPr > 0 ? value / maxPr : 0;
      }
    }

    this.pageRankComputed = true;
  }

  /**
   * Detect communities using label propagation (Louvain-inspired)
   */
  private detectCommunities(maxIterations: number = 20): void {
    const nodeIds = Array.from(this.nodes.keys());
    if (nodeIds.length === 0) return;

    // Initialize: each node in its own community
    const labels: Map<string, number> = new Map();
    nodeIds.forEach((id, idx) => labels.set(id, idx));

    // Iterative label propagation
    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      // Shuffle nodes for randomness
      const shuffled = [...nodeIds].sort(() => Math.random() - 0.5);

      for (const nodeId of shuffled) {
        // Count neighbor labels weighted by edge weight
        const labelCounts: Map<number, number> = new Map();

        const edgeIds = this.adjacencyList.get(nodeId) || new Set();
        for (const edgeId of edgeIds) {
          const edge = this.edges.get(edgeId);
          if (!edge) continue;

          const neighborId = edge.source === nodeId ? edge.target : edge.source;
          const neighborLabel = labels.get(neighborId);
          if (neighborLabel !== undefined) {
            const current = labelCounts.get(neighborLabel) || 0;
            labelCounts.set(neighborLabel, current + edge.weight);
          }
        }

        // Find most common label
        if (labelCounts.size > 0) {
          let maxLabel = labels.get(nodeId)!;
          let maxCount = 0;

          for (const [label, count] of labelCounts) {
            if (count > maxCount) {
              maxCount = count;
              maxLabel = label;
            }
          }

          const oldLabel = labels.get(nodeId);
          if (oldLabel !== maxLabel) {
            labels.set(nodeId, maxLabel);
            changed = true;
          }
        }
      }

      if (!changed) break;
    }

    // Compact community IDs
    const uniqueLabels = new Set(labels.values());
    const labelMap = new Map<number, number>();
    let communityIdx = 0;
    for (const label of uniqueLabels) {
      labelMap.set(label, communityIdx++);
    }

    // Update nodes
    for (const [nodeId, label] of labels) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.community = labelMap.get(label) || 0;
      }
    }

    this.communitiesDetected = true;
  }

  /**
   * Dijkstra's shortest path between two nodes
   */
  findShortestPath(startId: string, endId: string): GraphPath | null {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      return null;
    }

    const dist: Map<string, number> = new Map();
    const prev: Map<string, { nodeId: string; edgeId: string } | null> = new Map();
    const visited: Set<string> = new Set();

    // Initialize
    for (const id of this.nodes.keys()) {
      dist.set(id, Infinity);
      prev.set(id, null);
    }
    dist.set(startId, 0);

    // Priority queue (simple array-based for now)
    const queue: Array<{ id: string; dist: number }> = [{ id: startId, dist: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.dist - b.dist);
      const { id: currentId } = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === endId) break;

      // Explore neighbors
      const edgeIds = this.adjacencyList.get(currentId) || new Set();
      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        const neighborId = edge.source === currentId ? edge.target : edge.source;
        if (visited.has(neighborId)) continue;

        // Convert weight to distance (higher weight = shorter distance)
        const edgeDist = 1 - edge.weight;
        const totalDist = (dist.get(currentId) || Infinity) + edgeDist;

        if (totalDist < (dist.get(neighborId) || Infinity)) {
          dist.set(neighborId, totalDist);
          prev.set(neighborId, { nodeId: currentId, edgeId });
          queue.push({ id: neighborId, dist: totalDist });
        }
      }
    }

    // Reconstruct path
    if (dist.get(endId) === Infinity) {
      return null;
    }

    const nodes: string[] = [];
    const edges: string[] = [];
    const explanations: string[] = [];

    let current: string | null = endId;
    while (current) {
      nodes.unshift(current);
      const prevInfo = prev.get(current);
      if (prevInfo) {
        edges.unshift(prevInfo.edgeId);
        const edge = this.edges.get(prevInfo.edgeId);
        if (edge) {
          explanations.unshift(edge.evidence);
        }
        current = prevInfo.nodeId;
      } else {
        current = null;
      }
    }

    return {
      nodes,
      edges,
      total_weight: 1 - (dist.get(endId) || 0),
      confidence: this.computePathConfidence(edges),
      explanation: explanations,
    };
  }

  /**
   * Compute path confidence from edge confidences
   */
  private computePathConfidence(edgeIds: string[]): number {
    if (edgeIds.length === 0) return 100;

    let minConfidence = 100;
    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.confidence < minConfidence) {
        minConfidence = edge.confidence;
      }
    }

    // Penalize longer paths slightly
    const lengthPenalty = Math.max(0, 1 - edgeIds.length * 0.05);

    return minConfidence * lengthPenalty;
  }

  /**
   * Find similar nodes using Jaccard similarity on neighbors
   */
  findSimilar(nodeId: string, limit: number = 10): SimilarityResult {
    const result: SimilarityResult = {
      query_node: nodeId,
      similar_nodes: [],
    };

    const queryNode = this.nodes.get(nodeId);
    if (!queryNode) return result;

    // Get query node's neighbors
    const queryNeighbors = this.getNeighborIds(nodeId);
    const queryProps = new Set(Object.keys(queryNode.properties));

    const similarities: Array<{
      id: string;
      similarity: number;
      sharedProps: string[];
      sharedNeighbors: string[];
    }> = [];

    for (const [candidateId, candidateNode] of this.nodes) {
      if (candidateId === nodeId) continue;
      if (candidateNode.type !== queryNode.type) continue;  // Same type only

      const candidateNeighbors = this.getNeighborIds(candidateId);
      const candidateProps = new Set(Object.keys(candidateNode.properties));

      // Jaccard similarity on neighbors
      const neighborIntersection = new Set([...queryNeighbors].filter(x => candidateNeighbors.has(x)));
      const neighborUnion = new Set([...queryNeighbors, ...candidateNeighbors]);
      const neighborSim = neighborUnion.size > 0 ? neighborIntersection.size / neighborUnion.size : 0;

      // Property overlap
      const propIntersection = [...queryProps].filter(x => candidateProps.has(x));
      const propSim = queryProps.size > 0 ? propIntersection.length / queryProps.size : 0;

      // Combined similarity
      const similarity = 0.7 * neighborSim + 0.3 * propSim;

      if (similarity > 0.1) {
        similarities.push({
          id: candidateId,
          similarity,
          sharedProps: propIntersection,
          sharedNeighbors: [...neighborIntersection],
        });
      }
    }

    // Sort and limit
    similarities.sort((a, b) => b.similarity - a.similarity);
    result.similar_nodes = similarities.slice(0, limit).map(s => ({
      node_id: s.id,
      similarity: s.similarity,
      shared_properties: s.sharedProps,
      shared_neighbors: s.sharedNeighbors,
    }));

    return result;
  }

  /**
   * Get neighbor node IDs
   */
  private getNeighborIds(nodeId: string): Set<string> {
    const neighbors = new Set<string>();
    const edgeIds = this.adjacencyList.get(nodeId) || new Set();

    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge) {
        neighbors.add(edge.source === nodeId ? edge.target : edge.source);
      }
    }

    return neighbors;
  }

  /**
   * Extract subgraph around a center node
   */
  extractSubgraph(centerId: string, depth: number = 2): SubgraphResult {
    const result: SubgraphResult = {
      nodes: [],
      edges: [],
      center_node: centerId,
      depth,
      statistics: {
        total_nodes: 0,
        total_edges: 0,
        avg_confidence: 0,
        communities_found: 0,
      },
    };

    if (!this.nodes.has(centerId)) return result;

    // BFS to find nodes within depth
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: centerId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift()!;

      if (visitedNodes.has(id) || currentDepth > depth) continue;
      visitedNodes.add(id);

      const node = this.nodes.get(id);
      if (node) result.nodes.push(node);

      // Explore edges
      const edgeIds = this.adjacencyList.get(id) || new Set();
      for (const edgeId of edgeIds) {
        if (visitedEdges.has(edgeId)) continue;
        visitedEdges.add(edgeId);

        const edge = this.edges.get(edgeId);
        if (edge) {
          result.edges.push(edge);
          const neighborId = edge.source === id ? edge.target : edge.source;
          if (!visitedNodes.has(neighborId) && currentDepth < depth) {
            queue.push({ id: neighborId, depth: currentDepth + 1 });
          }
        }
      }
    }

    // Compute statistics
    result.statistics.total_nodes = result.nodes.length;
    result.statistics.total_edges = result.edges.length;
    result.statistics.avg_confidence = result.edges.length > 0
      ? result.edges.reduce((sum, e) => sum + e.confidence, 0) / result.edges.length
      : 0;
    result.statistics.communities_found = new Set(result.nodes.map(n => n.community)).size;

    return result;
  }

  /**
   * Infer missing edges using transitive relationships
   */
  inferEdges(minConfidence: number = 60): InferenceResult {
    const result: InferenceResult = {
      inferred_edges: [],
      reasoning: [],
    };

    // Transitive inference: if A→B and B→C, infer A→C
    const transitiveTypes: Array<{
      first: LatheEdgeType;
      second: LatheEdgeType;
      inferred: LatheEdgeType;
    }> = [
      { first: "compatible_with", second: "suitable_for", inferred: "optimal_for" },
      { first: "recommended", second: "produces", inferred: "improves" },
    ];

    for (const { first, second, inferred } of transitiveTypes) {
      const firstEdges = this.edgesByType.get(first) || new Set();

      for (const firstEdgeId of firstEdges) {
        const firstEdge = this.edges.get(firstEdgeId);
        if (!firstEdge) continue;

        // Find second-hop edges
        const secondEdges = this.adjacencyList.get(firstEdge.target) || new Set();
        for (const secondEdgeId of secondEdges) {
          const secondEdge = this.edges.get(secondEdgeId);
          if (!secondEdge || secondEdge.type !== second) continue;

          // Check if inferred edge already exists
          const existingEdgeId = `edge_${firstEdge.source}_${secondEdge.target}`;
          if (this.edges.has(existingEdgeId)) continue;

          // Compute inferred confidence
          const inferredConfidence = Math.min(firstEdge.confidence, secondEdge.confidence) * 0.8;

          if (inferredConfidence >= minConfidence) {
            result.inferred_edges.push({
              source: firstEdge.source,
              target: secondEdge.target,
              type: inferred,
              confidence: inferredConfidence,
              basis: `Transitive: ${firstEdge.source} → ${firstEdge.target} → ${secondEdge.target}`,
            });
          }
        }
      }
    }

    result.reasoning.push(`Analyzed ${this.edges.size} edges for transitive patterns`);
    result.reasoning.push(`Found ${result.inferred_edges.length} potential inferences above ${minConfidence}% confidence`);

    return result;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  /**
   * Query graph for recommendations
   */
  query(input: LatheGraphQuery): LatheRecommendation[] {
    if (!this.graphBuilt) {
      this.buildGraph();
    }

    const recommendations: LatheRecommendation[] = [];
    const minConfidence = input.min_confidence || 70;

    // Find starting material node
    let materialId: string | null = null;
    if (input.material) {
      materialId = this.findNodeByName(input.material, "material");
    }

    // Find operation node
    let operationId: string | null = null;
    if (input.operation) {
      operationId = this.findNodeByName(input.operation, "operation");
    }

    // Find tool node
    let toolId: string | null = null;
    if (input.tool) {
      toolId = this.findNodeByName(input.tool, "tool");
    }

    // If we have material and operation, find best tool and parameters
    if (materialId && operationId) {
      const compatibleTools = this.findCompatibleTools(materialId, operationId);

      for (const tool of compatibleTools.slice(0, 5)) {
        const params = this.findRecommendedParameters(materialId, operationId, tool.toolId);
        const outcomes = this.predictOutcomes(materialId, tool.toolId, params);
        const path = this.findShortestPath(materialId, tool.toolId);

        if (tool.confidence >= minConfidence) {
          recommendations.push({
            recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            material: input.material || "",
            operation: input.operation || "",
            recommended_tool: this.nodes.get(tool.toolId)?.name || tool.toolId,
            parameters: params,
            expected_outcomes: outcomes,
            confidence: tool.confidence,
            reasoning_path: path || { nodes: [], edges: [], total_weight: 0, confidence: 0, explanation: [] },
            alternatives: [],
            warnings: this.generateWarnings(materialId, operationId, tool.toolId),
            sources: tool.sources,
          });
        }
      }
    }

    // If we have tool and operation, find suitable materials
    if (toolId && operationId && !materialId) {
      const suitableMaterials = this.findSuitableMaterials(toolId, operationId);

      for (const mat of suitableMaterials.slice(0, 5)) {
        recommendations.push({
          recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          material: this.nodes.get(mat.materialId)?.name || mat.materialId,
          operation: input.operation || "",
          recommended_tool: input.tool || "",
          parameters: this.findRecommendedParameters(mat.materialId, operationId, toolId),
          expected_outcomes: { tool_life_min: 30, surface_finish_ra: 1.6, mrr_cm3min: 50 },
          confidence: mat.confidence,
          reasoning_path: { nodes: [], edges: [], total_weight: 0, confidence: 0, explanation: [] },
          alternatives: [],
          warnings: [],
          sources: mat.sources,
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find node by name (case-insensitive)
   */
  private findNodeByName(name: string, type?: LatheNodeType): string | null {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // Try direct lookup
    if (this.nodesByName.has(normalizedName)) {
      const id = this.nodesByName.get(normalizedName)!;
      if (!type || this.nodes.get(id)?.type === type) {
        return id;
      }
    }

    // Search by type prefix
    if (type) {
      const typePrefix = type === "material" ? "mat_" : type === "operation" ? "op_" : type === "tool" ? "tool_" : "";
      const candidateId = typePrefix + normalizedName;
      if (this.nodes.has(candidateId)) {
        return candidateId;
      }
    }

    // Fuzzy search
    for (const [id, node] of this.nodes) {
      if (type && node.type !== type) continue;
      if (node.name.toLowerCase().includes(name.toLowerCase())) {
        return id;
      }
    }

    return null;
  }

  /**
   * Find tools compatible with material and suitable for operation
   */
  private findCompatibleTools(
    materialId: string,
    operationId: string
  ): Array<{ toolId: string; confidence: number; sources: string[] }> {
    const results: Array<{ toolId: string; confidence: number; sources: string[] }> = [];

    const matEdges = this.adjacencyList.get(materialId) || new Set();
    const opEdges = this.reverseAdjacency.get(operationId) || new Set();

    // Find tools connected to both material and operation
    for (const matEdgeId of matEdges) {
      const matEdge = this.edges.get(matEdgeId);
      if (!matEdge || matEdge.type !== "compatible_with") continue;

      const toolId = matEdge.target;
      const toolNode = this.nodes.get(toolId);
      if (!toolNode || toolNode.type !== "tool") continue;

      // Check if tool is suitable for operation
      for (const opEdgeId of opEdges) {
        const opEdge = this.edges.get(opEdgeId);
        if (!opEdge || opEdge.source !== toolId || opEdge.type !== "suitable_for") continue;

        const confidence = Math.min(matEdge.confidence, opEdge.confidence);
        const sources = [...matEdge.sources, ...opEdge.sources];

        results.push({ toolId, confidence, sources });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find recommended parameters for material/operation/tool combination
   */
  private findRecommendedParameters(
    materialId: string,
    operationId: string,
    toolId: string
  ): { cutting_speed_mmin: number; feed_mmrev: number; doc_mm: number; coolant: string } {
    const matNode = this.nodes.get(materialId);
    const opNode = this.nodes.get(operationId);

    // Get ISO group for speed selection
    const isoGroup = (matNode?.properties as MaterialNodeProps)?.iso_group || "P";
    const opProps = opNode?.properties as OperationNodeProps;
    const isFinishing = opProps?.roughing_or_finishing === "finishing";

    // Base speeds by ISO group
    const baseSpeeds: Record<string, { rough: number; finish: number }> = {
      P: { rough: 200, finish: 280 },
      M: { rough: 120, finish: 180 },
      K: { rough: 250, finish: 350 },
      N: { rough: 600, finish: 1000 },
      S: { rough: 40, finish: 60 },
      H: { rough: 80, finish: 150 },
    };

    const speed = baseSpeeds[isoGroup] || baseSpeeds.P;

    // Base feeds
    const feedRange = opProps?.typical_feed_range_mmrev || [0.1, 0.3];
    const feed = isFinishing ? feedRange[0] : (feedRange[0] + feedRange[1]) / 2;

    // Base DOC
    const docRange = opProps?.typical_doc_range_mm || [0.5, 3.0];
    const doc = isFinishing ? docRange[0] : (docRange[0] + docRange[1]) / 2;

    return {
      cutting_speed_mmin: isFinishing ? speed.finish : speed.rough,
      feed_mmrev: feed,
      doc_mm: doc,
      coolant: isoGroup === "N" ? "mist" : "flood",
    };
  }

  /**
   * Find materials suitable for tool and operation
   */
  private findSuitableMaterials(
    toolId: string,
    operationId: string
  ): Array<{ materialId: string; confidence: number; sources: string[] }> {
    const results: Array<{ materialId: string; confidence: number; sources: string[] }> = [];

    const toolEdges = this.reverseAdjacency.get(toolId) || new Set();

    for (const edgeId of toolEdges) {
      const edge = this.edges.get(edgeId);
      if (!edge || edge.type !== "compatible_with") continue;

      const materialId = edge.source;
      const matNode = this.nodes.get(materialId);
      if (!matNode || matNode.type !== "material") continue;

      results.push({
        materialId,
        confidence: edge.confidence,
        sources: edge.sources,
      });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Predict outcomes based on material/tool/parameters
   */
  private predictOutcomes(
    materialId: string,
    toolId: string,
    params: { cutting_speed_mmin: number; feed_mmrev: number; doc_mm: number }
  ): { tool_life_min: number; surface_finish_ra: number; mrr_cm3min: number } {
    const matNode = this.nodes.get(materialId);
    const matProps = matNode?.properties as MaterialNodeProps;
    const machinability = matProps?.machinability_factor || 0.5;

    // Base tool life (Taylor-inspired)
    const baseToolLife = 30;
    const speedFactor = params.cutting_speed_mmin > 200 ? 0.7 : 1.0;
    const toolLife = baseToolLife * machinability * speedFactor;

    // Surface finish (empirical Ra formula)
    // Ra ≈ f² / (8 * r) for nose radius r in mm
    const noseRadius = 0.8;  // Default
    const ra = (params.feed_mmrev * params.feed_mmrev * 1000) / (8 * noseRadius);

    // MRR calculation
    const mrr = params.cutting_speed_mmin * params.feed_mmrev * params.doc_mm / 1000;

    return {
      tool_life_min: Math.round(toolLife),
      surface_finish_ra: Math.round(ra * 100) / 100,
      mrr_cm3min: Math.round(mrr * 100) / 100,
    };
  }

  /**
   * Generate warnings for material/operation/tool combination
   */
  private generateWarnings(materialId: string, operationId: string, toolId: string): string[] {
    const warnings: string[] = [];

    const matNode = this.nodes.get(materialId);
    const matProps = matNode?.properties as MaterialNodeProps;

    // Check for difficult materials
    if (matProps?.machinability_factor && matProps.machinability_factor < 0.25) {
      warnings.push("Low machinability material - reduce speeds and use high-pressure coolant");
    }

    // Check for work hardening
    if (matProps?.work_hardening_rate && matProps.work_hardening_rate > 0.4) {
      warnings.push("High work hardening rate - maintain positive chip load, avoid rubbing");
    }

    // Check for low thermal conductivity
    if (matProps?.thermal_conductivity_w_mk && matProps.thermal_conductivity_w_mk < 15) {
      warnings.push("Low thermal conductivity - heat concentrates at tool tip, use flood coolant");
    }

    return warnings;
  }

  /**
   * Find path between two concepts
   */
  findPath(startName: string, endName: string): GraphPath | null {
    if (!this.graphBuilt) {
      this.buildGraph();
    }

    const startId = this.findNodeByName(startName);
    const endId = this.findNodeByName(endName);

    if (!startId || !endId) {
      return null;
    }

    return this.findShortestPath(startId, endId);
  }

  /**
   * Explain a recommendation
   */
  explain(recommendation: LatheRecommendation): string[] {
    const explanations: string[] = [];

    explanations.push(`Material: ${recommendation.material}`);
    explanations.push(`Operation: ${recommendation.operation}`);
    explanations.push(`Recommended Tool: ${recommendation.recommended_tool}`);
    explanations.push(`Confidence: ${recommendation.confidence}%`);

    if (recommendation.reasoning_path.explanation.length > 0) {
      explanations.push("\nReasoning Chain:");
      for (const exp of recommendation.reasoning_path.explanation) {
        explanations.push(`  - ${exp}`);
      }
    }

    explanations.push("\nRecommended Parameters:");
    explanations.push(`  - Cutting Speed: ${recommendation.parameters.cutting_speed_mmin} m/min`);
    explanations.push(`  - Feed: ${recommendation.parameters.feed_mmrev} mm/rev`);
    explanations.push(`  - DOC: ${recommendation.parameters.doc_mm} mm`);
    explanations.push(`  - Coolant: ${recommendation.parameters.coolant}`);

    explanations.push("\nExpected Outcomes:");
    explanations.push(`  - Tool Life: ${recommendation.expected_outcomes.tool_life_min} min`);
    explanations.push(`  - Surface Finish: Ra ${recommendation.expected_outcomes.surface_finish_ra}`);
    explanations.push(`  - MRR: ${recommendation.expected_outcomes.mrr_cm3min} cm³/min`);

    if (recommendation.warnings.length > 0) {
      explanations.push("\nWarnings:");
      for (const warning of recommendation.warnings) {
        explanations.push(`  ! ${warning}`);
      }
    }

    explanations.push("\nSources:");
    for (const source of recommendation.sources) {
      explanations.push(`  - ${source}`);
    }

    return explanations;
  }

  /**
   * Update graph from experience
   */
  updateFromExperience(update: ExperienceUpdate): void {
    if (!this.graphBuilt) {
      this.buildGraph();
    }

    const materialId = this.findNodeByName(update.material, "material");
    const operationId = this.findNodeByName(update.operation, "operation");
    const toolId = this.findNodeByName(update.tool, "tool");

    if (!materialId || !operationId || !toolId) {
      log.warn("[LatheKnowledgeGraph] Cannot update - nodes not found", { update });
      return;
    }

    // Find existing edges and update weights/confidence
    const edgeId = `edge_${materialId}_${toolId}`;
    const existingEdge = this.edges.get(edgeId);

    if (existingEdge) {
      // Update edge based on outcome
      existingEdge.frequency += 1;
      existingEdge.sources.push(update.source);

      if (update.outcome.success) {
        // Increase weight for successful outcomes
        existingEdge.weight = Math.min(1.0, existingEdge.weight + 0.02);
        existingEdge.confidence = Math.min(100, existingEdge.confidence + 1);
      } else {
        // Decrease weight for failures
        existingEdge.weight = Math.max(0.1, existingEdge.weight - 0.05);
        existingEdge.confidence = Math.max(30, existingEdge.confidence - 2);
      }

      existingEdge.properties.last_update = update.timestamp;
      log.info("[LatheKnowledgeGraph] Updated edge from experience", {
        edgeId,
        newWeight: existingEdge.weight,
        newConfidence: existingEdge.confidence,
      });
    }

    // Recompute PageRank periodically
    if (Math.random() < 0.1) {
      this.computePageRank();
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Add node to graph with indexing
   */
  private addNode(node: LatheGraphNode): void {
    this.nodes.set(node.id, node);
    this.nodesByType.get(node.type)?.add(node.id);
    this.nodesByName.set(node.name.toLowerCase().replace(/[^a-z0-9]/g, "_"), node.id);

    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }
    if (!this.reverseAdjacency.has(node.id)) {
      this.reverseAdjacency.set(node.id, new Set());
    }
  }

  /**
   * Add edge to graph with indexing
   * Edges are stored as directed but adjacency is bidirectional for path finding
   */
  private addEdge(edge: LatheGraphEdge): void {
    this.edges.set(edge.id, edge);
    this.edgesByType.get(edge.type)?.add(edge.id);

    // Update adjacency lists - bidirectional for path finding
    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, new Set());
    }
    this.adjacencyList.get(edge.source)?.add(edge.id);

    // Also add to target's adjacency for bidirectional traversal
    if (!this.adjacencyList.has(edge.target)) {
      this.adjacencyList.set(edge.target, new Set());
    }
    this.adjacencyList.get(edge.target)?.add(edge.id);

    if (!this.reverseAdjacency.has(edge.target)) {
      this.reverseAdjacency.set(edge.target, new Set());
    }
    this.reverseAdjacency.get(edge.target)?.add(edge.id);
  }

  /**
   * Get graph statistics
   */
  getStatistics(): GraphStatistics {
    const nodesByType: Record<string, number> = {};
    for (const [type, ids] of this.nodesByType) {
      nodesByType[type] = ids.size;
    }

    const edgesByType: Record<string, number> = {};
    for (const [type, ids] of this.edgesByType) {
      edgesByType[type] = ids.size;
    }

    // Compute degree stats
    let totalDegree = 0;
    let maxDegree = 0;
    for (const [, edges] of this.adjacencyList) {
      totalDegree += edges.size;
      maxDegree = Math.max(maxDegree, edges.size);
    }

    const n = this.nodes.size;
    const m = this.edges.size;
    const density = n > 1 ? (2 * m) / (n * (n - 1)) : 0;

    // Top nodes by importance
    const topNodes = Array.from(this.nodes.values())
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10)
      .map(n => ({ id: n.id, importance: n.importance }));

    // Community count
    const communities = new Set(Array.from(this.nodes.values()).map(n => n.community));

    return {
      total_nodes: n,
      total_edges: m,
      nodes_by_type: nodesByType as Record<LatheNodeType, number>,
      edges_by_type: edgesByType as Record<LatheEdgeType, number>,
      avg_degree: n > 0 ? totalDegree / n : 0,
      max_degree: maxDegree,
      density,
      num_communities: communities.size,
      top_nodes_by_importance: topNodes,
      coverage: {
        materials_covered: this.nodesByType.get("material")?.size || 0,
        operations_covered: this.nodesByType.get("operation")?.size || 0,
        tools_covered: this.nodesByType.get("tool")?.size || 0,
      },
    };
  }

  /**
   * Get node by ID
   */
  getNode(id: string): LatheGraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get edge by ID
   */
  getEdge(id: string): LatheGraphEdge | undefined {
    return this.edges.get(id);
  }

  /**
   * Get all nodes of a type
   */
  getNodesByType(type: LatheNodeType): LatheGraphNode[] {
    const ids = this.nodesByType.get(type) || new Set();
    return Array.from(ids).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  /**
   * Get all edges of a type
   */
  getEdgesByType(type: LatheEdgeType): LatheGraphEdge[] {
    const ids = this.edgesByType.get(type) || new Set();
    return Array.from(ids).map(id => this.edges.get(id)!).filter(Boolean);
  }

  /**
   * Check if graph is built
   */
  isBuilt(): boolean {
    return this.graphBuilt;
  }

  /**
   * Get last build time
   */
  getLastBuildTime(): string {
    return this.lastBuildTime;
  }

  /**
   * Multi-hop reasoning from material to outcome
   */
  multiHopReason(
    material: string,
    targetOutcome: string,
    maxHops: number = 4
  ): Array<{ path: GraphPath; score: number }> {
    if (!this.graphBuilt) {
      this.buildGraph();
    }

    const results: Array<{ path: GraphPath; score: number }> = [];

    const materialId = this.findNodeByName(material, "material");
    const outcomeId = this.findNodeByName(targetOutcome, "outcome");

    if (!materialId) {
      log.warn("[LatheKnowledgeGraph] Material not found for multi-hop reasoning", { material });
      return results;
    }

    // BFS to find all paths to outcomes
    const queue: Array<{ path: string[]; edges: string[]; depth: number }> = [
      { path: [materialId], edges: [], depth: 0 }
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { path, edges, depth } = queue.shift()!;
      const currentId = path[path.length - 1];

      if (depth > maxHops) continue;

      const currentNode = this.nodes.get(currentId);

      // Check if we reached an outcome
      if (currentNode?.type === "outcome") {
        if (!outcomeId || currentId === outcomeId) {
          const graphPath: GraphPath = {
            nodes: path,
            edges,
            total_weight: edges.reduce((sum, eid) => sum + (this.edges.get(eid)?.weight || 0), 0) / Math.max(edges.length, 1),
            confidence: this.computePathConfidence(edges),
            explanation: edges.map(eid => this.edges.get(eid)?.evidence || "").filter(Boolean),
          };

          const score = graphPath.confidence * graphPath.total_weight;
          results.push({ path: graphPath, score });
        }
        continue;
      }

      // Explore neighbors
      const edgeIds = this.adjacencyList.get(currentId) || new Set();
      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        const neighborId = edge.source === currentId ? edge.target : edge.source;
        const visitKey = `${currentId}-${neighborId}`;

        if (!visited.has(visitKey) && !path.includes(neighborId)) {
          visited.add(visitKey);
          queue.push({
            path: [...path, neighborId],
            edges: [...edges, edgeId],
            depth: depth + 1,
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Propagate constraints through the graph
   */
  propagateConstraints(
    startNodeId: string,
    constraint: Record<string, unknown>
  ): Map<string, Record<string, unknown>> {
    const propagated = new Map<string, Record<string, unknown>>();
    propagated.set(startNodeId, constraint);

    const queue = [startNodeId];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentConstraint = propagated.get(currentId)!;

      // Find constraint edges
      const edgeIds = this.adjacencyList.get(currentId) || new Set();
      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge || edge.type !== "constrains") continue;

        const neighborId = edge.target;
        if (visited.has(neighborId)) continue;

        // Apply constraint with attenuation
        const attenuatedConstraint: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(currentConstraint)) {
          if (typeof value === "number") {
            attenuatedConstraint[key] = value * edge.weight;
          } else {
            attenuatedConstraint[key] = value;
          }
        }

        propagated.set(neighborId, attenuatedConstraint);
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    return propagated;
  }

  /**
   * Resolve conflicts between competing recommendations
   */
  resolveConflicts(
    recommendations: LatheRecommendation[]
  ): { resolved: LatheRecommendation; conflicts: string[] } {
    if (recommendations.length === 0) {
      throw new Error("No recommendations to resolve");
    }

    if (recommendations.length === 1) {
      return { resolved: recommendations[0], conflicts: [] };
    }

    const conflicts: string[] = [];

    // Sort by confidence
    const sorted = [...recommendations].sort((a, b) => b.confidence - a.confidence);
    const best = sorted[0];

    // Check for parameter conflicts
    for (let i = 1; i < sorted.length; i++) {
      const other = sorted[i];

      // Speed conflict
      const speedDiff = Math.abs(best.parameters.cutting_speed_mmin - other.parameters.cutting_speed_mmin);
      if (speedDiff > 50) {
        conflicts.push(`Speed conflict: ${best.parameters.cutting_speed_mmin} vs ${other.parameters.cutting_speed_mmin} m/min`);
      }

      // Feed conflict
      const feedDiff = Math.abs(best.parameters.feed_mmrev - other.parameters.feed_mmrev);
      if (feedDiff > 0.1) {
        conflicts.push(`Feed conflict: ${best.parameters.feed_mmrev} vs ${other.parameters.feed_mmrev} mm/rev`);
      }

      // Tool conflict
      if (best.recommended_tool !== other.recommended_tool) {
        conflicts.push(`Tool conflict: ${best.recommended_tool} vs ${other.recommended_tool}`);
      }
    }

    return { resolved: best, conflicts };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheKnowledgeGraphEngine = LatheKnowledgeGraphEngine.getInstance();
