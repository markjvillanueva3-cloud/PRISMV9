/**
 * Knowledge Dispatcher Action Schemas
 * =====================================
 * Per-action Zod schemas for all 9 prism_knowledge actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/knowledgeActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();

// ============================================================================
// search
// ============================================================================

const search = z.object({
  query: z.string().describe("Search query string"),
  registries: z.array(z.string()).optional().describe("Registries to search (all if omitted)"),
  limit: z.number().int().positive().optional().describe("Max results (default: 20)"),
  min_score: z.number().min(0).max(1).optional().describe("Minimum relevance score (default: 0.2)"),
}).passthrough();

// ============================================================================
// cross_query
// ============================================================================

const cross_query = z.object({
  task: z.string().describe("Task description for cross-registry query"),
  context: optStr.describe("Additional context"),
  required_registries: z.array(z.string()).optional().describe("Registries that must be included"),
}).passthrough();

// ============================================================================
// formula
// ============================================================================

const formula = z.object({
  need: z.string().describe("Formula need description"),
  category: optStr.describe("Formula category filter"),
  material_id: optStr.describe("Material ID filter"),
  include_related: z.boolean().optional().describe("Include related formulas (default: true)"),
}).passthrough();

// ============================================================================
// relations
// ============================================================================

const relations = z.object({
  source_id: optStr.describe("Source node ID (alternative to node_id)"),
  node_id: optStr.describe("Node ID (alternative to source_id)"),
  edge_types: z.array(z.string()).optional().describe("Edge type filters"),
  depth: z.number().int().positive().optional().describe("Traversal depth (default: 2)"),
}).passthrough();

// ============================================================================
// stats — no params required
// ============================================================================

const stats = z.object({}).passthrough();

// ============================================================================
// tribal_capture
// ============================================================================

const tribal_capture = z.object({
  title: optStr.describe("Tip title (default: 'Untitled Tip')"),
  body: optStr.describe("Tip body text"),
  content: optStr.describe("Alternative to body"),
  category: optStr.describe("Category (default: 'general')"),
  source: optStr.describe("Source (default: 'operator')"),
  material_groups: z.array(z.string()).optional().describe("Material ISO groups"),
  material_iso: optStr.describe("Single material ISO (converted to material_groups)"),
  operation_types: z.array(z.string()).optional().describe("Operation types"),
  operation_type: optStr.describe("Single operation type (converted to operation_types)"),
  confidence: z.number().min(0).max(100).optional().describe("Confidence score (default: 70)"),
  tags: z.array(z.string()).optional().describe("Tags for the tip"),
}).passthrough();

// ============================================================================
// tribal_search
// ============================================================================

const tribal_search = z.object({
  query: z.string().describe("Search query"),
  category: optStr.describe("Filter by category"),
  material_iso_group: optStr.describe("Filter by material ISO group"),
  material_iso: optStr.describe("Alternative to material_iso_group"),
  operation_type: optStr.describe("Filter by operation type"),
  min_confidence: optNum.describe("Minimum confidence score"),
  limit: z.number().int().positive().optional().describe("Max results (default: 10)"),
}).passthrough();

// ============================================================================
// tribal_suggest
// ============================================================================

const tribal_suggest = z.object({
  material_iso_group: optStr.describe("Material ISO group (default: 'P')"),
  material_iso: optStr.describe("Alternative to material_iso_group"),
  operation_type: optStr.describe("Operation type (default: 'milling')"),
}).passthrough();

// ============================================================================
// tribal_stats — no params required
// ============================================================================

const tribal_stats = z.object({}).passthrough();

// ============================================================================
// course_build
// ============================================================================

const course_build = z.object({
  camSystem: optStr.describe("CAM system name (e.g. 'mastercam', 'fusion360')"),
  cam_system: optStr.describe("Alternative snake_case for camSystem"),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional()
    .describe("Course level (default: 'beginner')"),
  maxModules: z.number().int().positive().optional()
    .describe("Max modules (default: 10)"),
  max_modules: z.number().int().positive().optional()
    .describe("Alternative snake_case for maxModules"),
}).passthrough();

// ============================================================================
// course_build_from_rules
// ============================================================================

const course_build_from_rules = z.object({
  categories: z.array(z.string()).describe("Playbook rule categories"),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional()
    .describe("Course level (default: 'intermediate')"),
  maxModules: z.number().int().positive().optional()
    .describe("Max modules (default: 10)"),
  max_modules: z.number().int().positive().optional()
    .describe("Alternative snake_case for maxModules"),
}).passthrough();

// ============================================================================
// course_catalog — no params required
// ============================================================================

const course_catalog = z.object({}).passthrough();

// ============================================================================
// course_quiz_generate
// ============================================================================

const course_quiz_generate = z.object({
  ruleCategories: z.array(z.string()).optional()
    .describe("Rule categories to generate from (all if omitted)"),
  rule_categories: z.array(z.string()).optional()
    .describe("Alternative snake_case for ruleCategories"),
  count: z.number().int().positive().optional()
    .describe("Number of questions (default: 10)"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
    .describe("Quiz difficulty (default: 'medium')"),
}).passthrough();

// ============================================================================
// course_pricing — no params required
// ============================================================================

const course_pricing = z.object({}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

// ============================================================================
// Learn Pipeline (LEARN-MS0)
// ============================================================================

const learn_ingest_text = z.object({
  content: z.string().min(1).describe("Text content to ingest (CNC tip, technique, advice)"),
  text: z.string().optional().describe("Alias for content"),
  source: optStr.describe("Source attribution (e.g., 'Facebook/mr.cnc2', 'Haas YouTube')"),
  title: optStr.describe("Optional title for the tip"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional metadata"),
}).passthrough();

const learn_ingest_video = z.object({
  file_path: z.string().min(1).describe("Path to video file (MP4, MKV, MOV)"),
  content: z.string().optional().describe("Alias for file_path"),
  source: optStr.describe("Source attribution"),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

const learn_ingest_document = z.object({
  file_path: z.string().min(1).describe("Path to document file (PDF, TXT, MD)"),
  content: z.string().optional().describe("Alias for file_path"),
  source: optStr.describe("Source attribution"),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

const learn_ingest_url = z.object({
  url: z.string().min(1).describe("URL to fetch and ingest"),
  content: z.string().optional().describe("Alias for url"),
  source: optStr.describe("Source attribution"),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

const learn_auto_tag = z.object({
  text: z.string().min(1).describe("Text to extract manufacturing tags from"),
  content: z.string().optional().describe("Alias for text"),
}).passthrough();

const learn_dedup_check = z.object({
  text: z.string().min(1).describe("Text to check for duplicates"),
  content: z.string().optional().describe("Alias for text"),
  corpus_limit: z.number().int().positive().optional().describe("Max existing tips to compare against (default: 500)"),
  duplicate_threshold: z.number().min(0).max(1).optional().describe("Similarity threshold for duplicate (default: 0.85)"),
  related_threshold: z.number().min(0).max(1).optional().describe("Similarity threshold for related (default: 0.65)"),
}).passthrough();

const learn_search_knowledge = z.object({
  query: z.string().optional().describe("Search query"),
  category: optStr.describe("Filter by category (speeds_feeds, tooling, setup, etc.)"),
  material_iso_group: optStr.describe("Filter by ISO material group (P, M, K, N, S, H)"),
  operation_type: optStr.describe("Filter by operation type (milling, turning, drilling, etc.)"),
  min_confidence: optNum.describe("Minimum confidence score (0-100)"),
  limit: z.number().int().positive().optional().describe("Max results (default: 20)"),
}).passthrough();

const learn_get_stats = z.object({}).passthrough();

// ============================================================================
// Learn Video Pipeline (LEARN-MS1)
// ============================================================================

const learn_video_process = z.object({
  file_path: z.string().min(1).describe("Path to video file (MP4, MKV, MOV)"),
  output_dir: optStr.describe("Directory for extracted frames/audio (default: alongside video)"),
  domain: z.enum(["cad", "cam", "shop"]).optional().describe("Domain hint for better knowledge extraction"),
  max_keyframes: z.number().int().positive().optional().describe("Max keyframes to extract (default: 50)"),
  skip_transcription: z.boolean().optional().describe("Skip audio transcription (vision-only mode)"),
  skip_vision: z.boolean().optional().describe("Skip keyframe analysis (audio-only mode)"),
  scene_threshold: z.number().min(0).max(1).optional().describe("Scene change threshold (default: 0.3)"),
}).passthrough();

const learn_video_transcript = z.object({
  file_path: z.string().min(1).describe("Path to video file to transcribe"),
  whisper_model: optStr.describe("Whisper model to use (default: whisper-1)"),
}).passthrough();

const learn_video_keyframes = z.object({
  file_path: z.string().min(1).describe("Path to video file for keyframe extraction"),
  output_dir: optStr.describe("Directory for extracted frames"),
  max_keyframes: z.number().int().positive().optional().describe("Max keyframes (default: 50)"),
  use_scene_detection: z.boolean().optional().describe("Use scene detection vs fixed interval (default: true)"),
  scene_threshold: z.number().min(0).max(1).optional().describe("Scene change threshold (default: 0.3)"),
  interval: z.number().positive().optional().describe("Fixed interval in seconds (default: 5)"),
}).passthrough();

const learn_video_knowledge = z.object({
  file_path: z.string().min(1).describe("Path to video file for knowledge extraction"),
  domain: z.enum(["cad", "cam", "shop"]).optional().describe("Domain hint"),
  max_keyframes: z.number().int().positive().optional().describe("Max keyframes (default: 50)"),
}).passthrough();

// ============================================================================
// Interactive Learning Sessions (LEARN-MS1)
// ============================================================================

const learn_session_create = z.object({
  video_path: z.string().min(1).describe("Path to video file that was processed"),
  actions: z.array(z.object({
    action_type: z.string().describe("CAD action type (extrude, fillet, sketch_line, etc.)"),
    step_number: z.number().int().describe("Step number in sequence"),
    parameters: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    confidence: z.number().min(0).max(1).optional().describe("Extraction confidence (0-1)"),
  })).min(1).describe("Extracted actions from video to review"),
}).passthrough();

const learn_session_submit = z.object({
  session_id: z.string().min(1).describe("Session ID from learn_session_create"),
  step: z.number().int().positive().describe("Step number to submit action for"),
  action: z.enum(["confirm", "correct", "skip"]).describe("What to do with this step"),
  correction: z.object({
    action_type: z.string().optional().describe("Corrected action type"),
    parameters: z.record(z.string(), z.any()).optional().describe("Corrected parameters"),
    confidence: z.number().min(0).max(1).optional().describe("Corrected confidence"),
  }).optional().describe("Correction data (required when action=correct)"),
  reason: optStr.describe("Reason for skip or correction"),
}).passthrough();

const learn_session_clarify = z.object({
  session_id: z.string().min(1).describe("Session ID"),
  step: z.number().int().positive().describe("Step number to get clarification for"),
}).passthrough();

const learn_session_summary = z.object({
  session_id: z.string().min(1).describe("Session ID to summarize"),
}).passthrough();

// ============================================================================
// URL Content Extraction (LEARN-MS1-S2)
// ============================================================================

const learn_url_extract = z.object({
  url: z.string().min(1).describe("URL to extract content from"),
  html: z.string().optional().describe("Pre-fetched HTML content (skips fetch if provided)"),
}).passthrough();

const learn_url_detect = z.object({
  url: z.string().min(1).describe("URL to detect content type for"),
}).passthrough();

// ============================================================================
// Social Media Parsing (LEARN-MS1-S2)
// ============================================================================

const learn_social_parse = z.object({
  text: z.string().min(1).describe("Social media post text content"),
  platform: z.enum(["facebook", "instagram", "x_twitter", "linkedin", "reddit", "youtube", "tiktok", "forum", "unknown"]).optional().describe("Social media platform"),
  author: z.string().optional().describe("Post author (e.g., 'mr.cnc2')"),
  url: z.string().optional().describe("Original post URL"),
  images: z.array(z.string()).optional().describe("Image URLs from the post"),
}).passthrough();

const learn_social_batch = z.object({
  posts: z.array(z.object({
    text: z.string().min(1).describe("Post text content"),
    platform: z.enum(["facebook", "instagram", "x_twitter", "linkedin", "reddit", "youtube", "tiktok", "forum", "unknown"]).optional(),
    author: z.string().optional().describe("Post author"),
    url: z.string().optional(),
    images: z.array(z.string()).optional(),
  })).min(1).describe("Array of social media posts to parse"),
}).passthrough();

// ============================================================================
// Knowledge Graph Enrichment (LEARN-MS2)
// ============================================================================

const learn_auto_link = z.object({
  tip_id: z.string().min(1).describe("Tip ID to link in the knowledge graph"),
  text: z.string().min(1).describe("Tip text content for entity extraction"),
  tags: z.array(z.string()).optional().describe("Auto-tagger tags (e.g., 'material:P', 'operation:milling')"),
  source: optStr.describe("Source attribution (default: 'manual')"),
}).passthrough();

const learn_gap_detect = z.object({
  min_tips: z.number().int().positive().optional().describe("Minimum tips per combo to be covered (default: 3)"),
  max_gaps: z.number().int().positive().optional().describe("Maximum gaps to return (default: 50)"),
}).passthrough();

const learn_validate_physics = z.object({
  text: z.string().optional().describe("Tip text to validate against physics (single)"),
  texts: z.array(z.string()).optional().describe("Multiple tip texts to validate (batch)"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group hint"),
}).passthrough();

// ============================================================================
// Enhanced Knowledge Search + Context Recommendations (LEARN-MS2-S2)
// ============================================================================

const learn_search_enhanced = z.object({
  query: z.string().min(1).describe("Search query for unified knowledge search"),
  text: z.string().optional().describe("Alias for query"),
  sources: z.array(z.enum(["tribal", "playbook", "formula", "graph"])).optional()
    .describe("Knowledge sources to search (all if omitted)"),
  category: optStr.describe("Filter by category"),
  material_iso_group: optStr.describe("Filter by ISO material group (P, M, K, N, S, H)"),
  operation_type: optStr.describe("Filter by operation type"),
  min_confidence: optNum.describe("Minimum confidence score (0-100)"),
  min_score: z.number().min(0).max(1).optional().describe("Minimum relevance score (0-1, default: 0.1)"),
  limit: z.number().int().positive().optional().describe("Max results (default: 20)"),
  validate_physics: z.boolean().optional().describe("Validate results against physics (default: false)"),
}).passthrough();

const learn_context_recommend = z.object({
  material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional()
    .describe("ISO material group for job context"),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional()
    .describe("Alias for material_iso"),
  operation: optStr.describe("Operation type (e.g., 'milling', 'turning', 'drilling')"),
  operation_type: optStr.describe("Alias for operation"),
  machine_type: optStr.describe("Machine type (e.g., 'vmc', '5-axis', 'lathe')"),
  limit: z.number().int().positive().optional().describe("Max recommendations (default: 10)"),
  min_confidence: optNum.describe("Minimum confidence (default: 30)"),
  validate_physics: z.boolean().optional().describe("Validate with physics engine (default: true)"),
}).passthrough();

// ============================================================================
// Course Auto-Generation (LEARN-MS3)
// ============================================================================

const learn_course_build = z.object({
  cam_system: z.string().min(1).describe("CAM system name (e.g., 'mastercam', 'fusion360')"),
  camSystem: optStr.describe("Alias for cam_system"),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional()
    .describe("Course difficulty level (default: beginner)"),
  max_modules: z.number().int().positive().optional()
    .describe("Maximum number of modules (default: 10)"),
}).passthrough();

const learn_course_from_rules = z.object({
  categories: z.array(z.string()).min(1)
    .describe("Playbook rule categories to generate course from"),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional()
    .describe("Course difficulty level (default: intermediate)"),
  max_modules: z.number().int().positive().optional()
    .describe("Maximum number of modules (default: 10)"),
}).passthrough();

const learn_course_catalog = z.object({}).passthrough();

const learn_course_quiz = z.object({
  rule_categories: z.array(z.string()).optional()
    .describe("Playbook rule categories (all if omitted)"),
  count: z.number().int().positive().optional()
    .describe("Number of quiz questions (default: 10)"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
    .describe("Quiz difficulty (default: medium)"),
}).passthrough();

const learn_course_pricing = z.object({}).passthrough();

const learn_course_from_source = z.object({
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional()
    .describe("Filter by ISO material group"),
  material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional()
    .describe("Alias for material_iso_group"),
  operation_type: optStr.describe("Filter by operation type (e.g., 'milling', 'turning')"),
  operation: optStr.describe("Alias for operation_type"),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional()
    .describe("Course difficulty level (default: intermediate)"),
  max_modules: z.number().int().positive().optional()
    .describe("Maximum number of modules (default: 10)"),
  sources: z.array(z.enum(["tribal", "playbook", "formula", "graph"])).optional()
    .describe("Knowledge sources to pull from (all if omitted)"),
}).passthrough();

const learn_course_export = z.object({
  course_id: optStr.describe("Course ID to export (builds fresh if omitted)"),
  cam_system: optStr.describe("CAM system for course generation"),
  camSystem: optStr.describe("Alias for cam_system"),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional()
    .describe("Course level (default: intermediate)"),
  format: z.enum(["json", "markdown", "scorm"]).optional()
    .describe("Export format (default: json)"),
}).passthrough();

// ============================================================================
// Curriculum Bridge (LEARN-MS3)
// ============================================================================

const learn_curriculum_rpm = z.object({
  count: z.number().int().positive().optional()
    .describe("Number of RPM problems (default: 5)"),
  profile: z.object({
    studentId: z.string(),
    shopMachines: z.array(z.string()).optional(),
    primaryCamSystem: optStr,
    experienceLevel: z.enum(["none", "beginner", "intermediate", "advanced"]),
    preferredUnits: z.enum(["metric", "imperial"]),
    weakTopics: z.array(z.string()),
    strongTopics: z.array(z.string()),
  }).optional().describe("Student profile for personalized problems"),
}).passthrough();

const learn_curriculum_force = z.object({
  count: z.number().int().positive().optional()
    .describe("Number of cutting force problems (default: 5)"),
}).passthrough();

const learn_curriculum_toollife = z.object({
  count: z.number().int().positive().optional()
    .describe("Number of tool life problems (default: 3)"),
}).passthrough();

const learn_curriculum_material = z.object({}).passthrough();

const learn_curriculum_feedrate = z.object({
  count: z.number().int().positive().optional()
    .describe("Number of feed rate problems (default: 5)"),
}).passthrough();

const learn_curriculum_problemset = z.object({
  count: z.number().int().positive().optional()
    .describe("Total problems in set (default: 20)"),
  profile: z.object({
    studentId: z.string(),
    shopMachines: z.array(z.string()).optional(),
    primaryCamSystem: optStr,
    experienceLevel: z.enum(["none", "beginner", "intermediate", "advanced"]),
    preferredUnits: z.enum(["metric", "imperial"]),
    weakTopics: z.array(z.string()),
    strongTopics: z.array(z.string()),
  }).optional().describe("Student profile for adaptive difficulty"),
}).passthrough();

// ============================================================================
// Feedback Learning (LEARN-MS4)
// ============================================================================

const learn_feedback_record = z.object({
  machine_id: z.string().min(1).describe("Machine identifier"),
  machineId: optStr.describe("Alias for machine_id"),
  measurement_type: z.string().optional()
    .describe("Type: 'force', 'tool_life', 'surface_finish', 'dimension', etc. (default: dimension)"),
  measured: z.number().describe("Actual measured value"),
  predicted: optNum.describe("PRISM's predicted value (for residual calculation)"),
  unit: optStr.describe("Unit of measurement (default: mm)"),
  material: optStr.describe("Material being cut"),
  operation: optStr.describe("Operation type"),
  tool_id: optStr.describe("Tool identifier"),
  parameters: z.record(z.string(), z.number()).optional().describe("Cutting parameters (depth_mm, feed_mmrev, speed_mpm)"),
  part_id: optStr.describe("Part identifier"),
  batch_id: optStr.describe("Batch identifier"),
  notes: optStr.describe("Operator notes"),
}).passthrough();

const learn_feedback_profile = z.object({
  machine_id: z.string().min(1).describe("Machine identifier"),
  machineId: optStr.describe("Alias for machine_id"),
  measurement_type: optStr.describe("Filter by measurement type"),
}).passthrough();

const learn_feedback_calibrate = z.object({
  machine_id: z.string().min(1).describe("Machine to calibrate"),
  machineId: optStr.describe("Alias for machine_id"),
  measurement_type: optStr.describe("Calibrate specific type only"),
  min_samples: z.number().int().positive().optional()
    .describe("Minimum samples required (default: 5)"),
}).passthrough();

const learn_feedback_predict = z.object({
  machine_id: z.string().min(1).describe("Machine identifier"),
  machineId: optStr.describe("Alias for machine_id"),
  measurement_type: optStr.describe("Prediction type (default: dimension)"),
  base_value: z.number().describe("Base predicted value to correct"),
  material: optStr.describe("Material being cut"),
  operation: optStr.describe("Operation type"),
}).passthrough();

const learn_feedback_compare = z.object({
  machine_ids: z.array(z.string()).min(2).describe("Machine IDs to compare"),
  machineIds: z.array(z.string()).optional().describe("Alias for machine_ids"),
  measurement_type: optStr.describe("Filter comparison by measurement type"),
}).passthrough();

// ============================================================================
// Transfer Learning (LEARN-MS4)
// ============================================================================

const machineSpec = z.object({
  name: z.string(),
  power_kw: z.number(),
  max_rpm: z.number(),
  rigidity_n_per_um: z.number(),
  accuracy_mm: z.number(),
  axes: z.number(),
}).passthrough();

const learn_transfer_similarity = z.object({
  source: machineSpec.describe("Source machine specification"),
  target: machineSpec.describe("Target machine specification"),
  weights: z.object({
    rigidity: optNum,
    power: optNum,
    accuracy: optNum,
    rpm: optNum,
    axes: optNum,
  }).optional().describe("Custom feature weights"),
}).passthrough();

const learn_transfer_scale = z.object({
  source_params: z.object({
    Vc: z.number(), fz: z.number(), ap: z.number(), ae: z.number(),
  }).passthrough().describe("Source cutting parameters"),
  source_machine: machineSpec.describe("Source machine"),
  target_machine: machineSpec.describe("Target machine"),
  kc_n_per_mm2: optNum.describe("Specific cutting force N/mm² (default: 2000)"),
}).passthrough();

const learn_transfer_apply = z.object({
  source_data: z.array(z.object({ x: z.array(z.number()), y: z.number() }))
    .describe("GP training observations from source machine"),
  target_data: z.array(z.object({ x: z.array(z.number()), y: z.number() })).optional()
    .describe("Optional GP observations from target machine"),
  x_predict: z.array(z.array(z.number())).describe("Prediction points"),
  length_scale: optNum.describe("RBF kernel length scale (default: 1.0)"),
  noise_var: optNum.describe("Observation noise variance (default: 0.01)"),
}).passthrough();

const learn_transfer_validate = z.object({
  scaled_params: z.object({
    Vc: z.number(), fz: z.number(), ap: z.number(), ae: z.number(),
  }).passthrough().describe("Transferred cutting parameters to validate"),
  target_machine: machineSpec.describe("Target machine"),
  kc_n_per_mm2: optNum.describe("Specific cutting force N/mm²"),
  tool_diameter_mm: optNum.describe("Tool diameter mm"),
  tool_stickout_mm: optNum.describe("Tool stickout mm"),
  deflection_limit_mm: optNum.describe("Deflection limit mm (default: 0.05)"),
}).passthrough();

// ============================================================================
// Fleet Learning (LEARN-MS4)
// ============================================================================

const learn_fleet_status = z.object({}).passthrough();

const learn_fleet_plan = z.object({}).passthrough();

const learn_fleet_feedback = z.object({
  machine_serial: z.string().min(1).describe("Machine serial number"),
  program_id: optStr.describe("Program identifier"),
  date: optStr.describe("Date string (ISO 8601, defaults to now)"),
  feedback_type: z.enum(["cycle_time", "tool_life", "surface_finish", "operator_edit", "scrap", "rework"]).optional()
    .describe("Feedback type (default: cycle_time)"),
  type: optStr.describe("Alias for feedback_type"),
  predicted_value: optNum.describe("PRISM's predicted value"),
  actual_value: optNum.describe("Actual measured value"),
  delta_percent: optNum.describe("Percentage difference"),
  operator_notes: optStr.describe("Operator notes"),
  notes: optStr.describe("Alias for operator_notes"),
  changes_made: z.array(z.string()).optional().describe("Changes made by operator"),
}).passthrough();

const learn_fleet_summary = z.object({}).passthrough();

export const ACTION_KNOWLEDGE_SCHEMAS: ActionSchemaMap = {
  search,
  cross_query,
  formula,
  relations,
  stats,
  tribal_capture,
  tribal_search,
  tribal_suggest,
  tribal_stats,
  course_build,
  course_build_from_rules,
  course_catalog,
  course_quiz_generate,
  course_pricing,
  learn_ingest_text,
  learn_ingest_video,
  learn_ingest_document,
  learn_ingest_url,
  learn_auto_tag,
  learn_dedup_check,
  learn_search_knowledge,
  learn_get_stats,
  learn_video_process,
  learn_video_transcript,
  learn_video_keyframes,
  learn_video_knowledge,
  learn_session_create,
  learn_session_submit,
  learn_session_clarify,
  learn_session_summary,
  learn_url_extract,
  learn_url_detect,
  learn_social_parse,
  learn_social_batch,
  learn_auto_link,
  learn_gap_detect,
  learn_validate_physics,
  learn_search_enhanced,
  learn_context_recommend,
  // LEARN-MS3: Course Auto-Generation
  learn_course_build,
  learn_course_from_rules,
  learn_course_catalog,
  learn_course_quiz,
  learn_course_pricing,
  learn_course_from_source,
  learn_course_export,
  // LEARN-MS3: Curriculum Bridge
  learn_curriculum_rpm,
  learn_curriculum_force,
  learn_curriculum_toollife,
  learn_curriculum_material,
  learn_curriculum_feedrate,
  learn_curriculum_problemset,
  // LEARN-MS4: Feedback + Fleet Learning
  learn_feedback_record,
  learn_feedback_profile,
  learn_feedback_calibrate,
  learn_feedback_predict,
  learn_feedback_compare,
  learn_transfer_similarity,
  learn_transfer_scale,
  learn_transfer_apply,
  learn_transfer_validate,
  learn_fleet_status,
  learn_fleet_plan,
  learn_fleet_feedback,
  learn_fleet_summary,
};
