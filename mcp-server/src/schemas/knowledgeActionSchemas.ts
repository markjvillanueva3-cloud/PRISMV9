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
// INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02 — wiki ingest (KIP)
// ============================================================================

const wiki_ingest_pdf = z.object({
  pdf_path: z.string().min(1).describe("Absolute path to a PDF on disk"),
  source: z.string().min(1).optional().describe("Stable id for the document; defaults to pdf_path"),
  title: optStr.describe("Human-readable catalog/manual title"),
  vendor: optStr.describe("Manufacturer/vendor tag (e.g. 'Iscar')"),
  category: optStr.describe("Category tag (e.g. 'insert-catalog')"),
  tags: z.array(z.string()).optional().describe("Free-form tags for retrieval filtering"),
  target_chars: z.number().int().positive().optional().describe("Chunker target chars (default 1500)"),
  overlap_chars: z.number().int().min(0).optional().describe("Chunker overlap chars (default 200)"),
  max_pages: z.number().int().positive().optional().describe("Cap on PDF pages read"),
  timeout_ms: z.number().int().positive().optional().describe("Per-PDF subprocess timeout"),
  dry_run: z.boolean().optional().describe("If true, extract+chunk only — skip Qdrant upsert"),
}).passthrough();

const wiki_ingest_dryrun = wiki_ingest_pdf;

// ============================================================================
// INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02 — vault RAG + Resources/ classification
// (wires ObsidianMemoryRagEngine + ResourcesClassifierEngine to knowledge dispatcher)
// ============================================================================

const wiki_rag_query = z.object({
  query: z.string().min(1).describe("User prompt or recall query string"),
  memories_dir: optStr.describe("Override memories dir (default H:/prism/knowledge/memories)"),
  tribal_dir: optStr.describe("Override tribal dir (default H:/prism/knowledge/tribal)"),
  top_k: z.number().int().positive().optional().describe("How many entries to return (default 5)"),
  max_body_chars: z.number().int().positive().optional().describe("Per-entry body cap (default 1500)"),
  force_search: z.boolean().optional().describe("Run RAG even without memory keywords"),
}).passthrough();

const wiki_rag_should_trigger = z.object({
  query: z.string().min(1),
  force_search: z.boolean().optional(),
}).passthrough();

const wiki_classify_file = z.object({
  rel_path: z.string().min(1).describe("Path relative to Resources/ root (forward slashes)"),
  ext: z.string().describe("Lowercased ext including dot, or empty string"),
  size: z.number().nonnegative().describe("File size in bytes"),
}).passthrough();

const wiki_summarize_dir = z.object({
  dir_rel_path: z.string().min(1).describe("Directory path relative to Resources/ root"),
  entries: z.array(z.object({
    rel_path: z.string(),
    ext: z.string(),
    size: z.number().nonnegative(),
  })).describe("FileEntry[] under this directory"),
}).passthrough();

// ============================================================================
// INTEL-OLLAMA-OBSIDIAN-MS0/P14-U03 — vault backlinks
// (wires VaultBacklinkEngine to knowledge dispatcher)
// ============================================================================

const _backlinkCandidate = z.object({
  id: z.string().min(1),
  kind: z.enum(["engine", "dispatcher_action", "skill"]),
  description: z.string().min(1),
});

const wiki_backlink_for_chunk = z.object({
  chunk_text: z.string().describe("Vault chunk text to score against PRISM corpora"),
  top_k: z.number().int().positive().optional().describe("Per-kind top-K (default 5)"),
  min_score: z.number().nonnegative().optional().describe("Score floor (default 0.05)"),
  candidates_engine: z.array(_backlinkCandidate).optional().describe("Engine corpus"),
  candidates_action: z.array(_backlinkCandidate).optional().describe("Dispatcher-action corpus"),
  candidates_skill: z.array(_backlinkCandidate).optional().describe("Skill corpus"),
}).passthrough();

const wiki_backlink_render = z.object({
  result: z.object({
    ok: z.boolean(),
    chunkText: z.string(),
    engines: z.array(z.object({
      id: z.string(), kind: z.literal("engine"), description: z.string(),
      score: z.number(), uniqueOverlap: z.number().int().nonnegative(),
    })),
    dispatcher_actions: z.array(z.object({
      id: z.string(), kind: z.literal("dispatcher_action"), description: z.string(),
      score: z.number(), uniqueOverlap: z.number().int().nonnegative(),
    })),
    skills: z.array(z.object({
      id: z.string(), kind: z.literal("skill"), description: z.string(),
      score: z.number(), uniqueOverlap: z.number().int().nonnegative(),
    })),
    totalScored: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  }).describe("BacklinkResult from a prior wiki_backlink_for_chunk call"),
}).passthrough();

const wiki_backlink_parse_digest = z.object({
  digest_text: z.string().describe("Raw digest text (one item per line, em-dash or colon separator)"),
  kind: z.enum(["engine", "dispatcher_action", "skill"]).describe("Tag to apply to parsed candidates"),
}).passthrough();

// ============================================================================
// INTEL-OLLAMA-OBSIDIAN-MS0/P14-U04 — wiki bootstrap from MIT registries
// (wires WikiBootstrapEngine to knowledge dispatcher)
// ============================================================================

const wiki_bootstrap_filter_courses = z.object({
  raw_index: z.unknown().describe("MIT_COURSE_INDEX.json contents (parsed object)"),
  allowed_categories: z.array(z.string()).optional().describe("Override the DEFAULT_GENERAL_CATEGORIES set"),
}).passthrough();

const wiki_bootstrap_filter_algorithms = z.object({
  raw_registry: z.unknown().describe("ALGORITHM_REGISTRY.json contents (parsed object)"),
  allowed_categories: z.array(z.string()).optional().describe("Override the DEFAULT_GENERAL_CATEGORIES set"),
}).passthrough();

const wiki_bootstrap_render_course = z.object({
  course: z.object({
    category: z.string(),
    priority: z.string(),
    course_id: z.string().min(1),
    course_name: z.string().min(1),
    course_file: z.string(),
    topics: z.array(z.string()),
  }).describe("MITCourseSource record"),
}).passthrough();

const wiki_bootstrap_render_algorithm = z.object({
  alg: z.object({
    category: z.string(),
    subcategory: z.string(),
    algorithm_name: z.string().min(1),
    course_id: z.string(),
    prism_engines: z.array(z.string()),
  }).describe("MITAlgorithmSource record"),
}).passthrough();

const wiki_bootstrap_build_index_line = z.object({
  entry: z.object({
    id: z.string().min(1),
    title: z.string(),
    kind: z.enum(["concept", "algorithm", "course"]),
    body: z.string(),
    citation: z.object({
      course_id: z.string(),
      course_name: z.string(),
      topic: z.string(),
    }),
    related_engines: z.array(z.string()),
  }).describe("WikiEntry from a render call"),
}).passthrough();

const wiki_bootstrap_insert_index = z.object({
  existing_index: z.string().describe("Current wiki/index.md text"),
  lines: z.array(z.string()).describe("New index lines to append (idempotent)"),
}).passthrough();

// ============================================================================
// INTEL-OLLAMA-OBSIDIAN-MS0/P15-U01 — CSM memory.db audit
// (wires CSMMemoryDBAuditEngine to knowledge dispatcher; memoryDispatcher is
//  locked at 14 actions by GsdRouterAndRetrieve.test.ts source-shape regex)
// ============================================================================

const _dbReport = z.object({
  path: z.string(),
  exists: z.boolean(),
  sizeBytes: z.number().nonnegative(),
  lastModifiedISO: z.string(),
  rowCount: z.number().nullable(),
  schemaFingerprint: z.string().nullable(),
  tableNames: z.array(z.string()),
  error: z.string(),
});

const csm_audit_classify_path = z.object({
  path: z.string().describe("Path to a memory.db file"),
}).passthrough();

const csm_audit_summarize = z.object({
  reports: z.array(_dbReport).describe("DBReport[] from disk inspection"),
}).passthrough();

const csm_audit_detect_variants = z.object({
  reports: z.array(_dbReport).describe("DBReport[] to group by schemaFingerprint"),
}).passthrough();

const csm_audit_format_report = z.object({
  reports: z.array(_dbReport),
  summary: z.object({
    totalDBs: z.number().int().nonnegative(),
    readableDBs: z.number().int().nonnegative(),
    totalSizeBytes: z.number().nonnegative(),
    totalRows: z.number().nonnegative(),
    byClass: z.record(z.string(), z.object({
      count: z.number().int().nonnegative(),
      sizeBytes: z.number().nonnegative(),
      rows: z.number().nonnegative(),
    })),
    schemaVariantCount: z.number().int().nonnegative(),
    oldestModifiedISO: z.string(),
    newestModifiedISO: z.string(),
  }),
}).passthrough();

const csm_audit_build_fingerprint = z.object({
  tables: z.array(z.object({
    name: z.string(),
    colCount: z.number().int().nonnegative(),
  })).describe("Table metadata as { name, colCount } pairs"),
}).passthrough();

// ============================================================================
// INTEL-OLLAMA-OBSIDIAN-MS0/P15-U03 — plan-trajectory extraction
// (wires PlanTrajectoryExtractorEngine to knowledge dispatcher)
// ============================================================================

const plan_trajectory_parse = z.object({
  raw_markdown: z.string().describe("Plan-file markdown content"),
  source_path: z.string().describe("Source file path (used for id derivation)"),
}).passthrough();

const plan_trajectory_summarize = z.object({
  trajectories: z.array(z.unknown()).describe("Array of PlanTrajectory records to aggregate"),
}).passthrough();

const plan_trajectory_derive_id = z.object({
  source_path: z.string().describe("Source file path to slugify into a stable id"),
}).passthrough();

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
  title: z.string().max(500).optional().describe("Tip title (default: 'Untitled Tip')"),
  body: z.string().max(10000).optional().describe("Tip body text (max 10,000 chars)"),
  content: z.string().max(10000).optional().describe("Alternative to body (max 10,000 chars)"),
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
// tribal_recategorize
// ============================================================================

const tribal_recategorize = z.object({
  force: z.boolean().optional().describe("Re-categorize even already-categorized tips (default: false)"),
}).passthrough();

// ============================================================================
// tribal_graph — TK-MS6 U-TK29
// ============================================================================

const tribal_graph = z.object({
  seed: z.boolean().optional().describe("Force-seed tribal tips into graph (returns tip/edge counts)"),
  material: optStr.describe("Filter by material (e.g., 'D2', 'inconel')"),
  material_iso: optStr.describe("Alternative to material"),
  machine: optStr.describe("Filter by machine"),
  machine_id: optStr.describe("Alternative to machine"),
  operation: optStr.describe("Filter by operation type"),
  operation_type: optStr.describe("Alternative to operation"),
}).passthrough();

// ============================================================================
// master_machinist_recommend — TK-MS6 U-TK30
// ============================================================================

const master_machinist_recommend = z.object({
  material: optStr.describe("Material to get recommendations for (e.g., 'D2', 'P')"),
  material_iso: optStr.describe("Alternative to material"),
  material_iso_group: optStr.describe("Alternative to material"),
  machine: optStr.describe("Machine to get recommendations for"),
  machine_id: optStr.describe("Alternative to machine"),
  operation: optStr.describe("Operation type (e.g., 'milling', 'turning')"),
  operation_type: optStr.describe("Alternative to operation"),
  tolerance: optStr.describe("Tolerance class (e.g., 'tight', 'medium')"),
  tolerance_class: optStr.describe("Alternative to tolerance"),
}).passthrough();

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
  // U-TK31: Domain-aware grouping
  groupBy: z.enum(["category", "domain", "domain_category"]).optional()
    .describe("Grouping mode: 'category' (default), 'domain', or 'domain_category'"),
  group_by: z.enum(["category", "domain", "domain_category"]).optional()
    .describe("Alternative snake_case for groupBy"),
  preferDomain: optStr.describe("Preferred domain for tip sorting (default: 'cam_software')"),
  prefer_domain: optStr.describe("Alternative snake_case for preferDomain"),
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
  // U-TK31: Domain-aware grouping
  group_by: z.enum(["category", "domain", "domain_category"]).optional()
    .describe("Grouping mode: 'category' (default), 'domain', or 'domain_category'"),
  groupBy: z.enum(["category", "domain", "domain_category"]).optional()
    .describe("Alias for group_by"),
  prefer_domain: optStr.describe("Preferred domain for tip sorting (default: 'cam_software')"),
  preferDomain: optStr.describe("Alias for prefer_domain"),
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

// ============================================================================
// PDF Extraction Pipeline (PDF-EXT-MS0)
// ============================================================================

const pdf_source_list = z.object({}).passthrough();

const pdf_source_stats = z.object({}).passthrough();

const pdf_source_discover = z.object({
  directory: optStr.describe("Directory to scan for PDFs"),
  path: optStr.describe("Alias for directory"),
}).passthrough();

const pdf_extract_tables = z.object({
  source_id: z.string().min(1).describe("PDF source ID from registry"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold (default: 0.7)"),
  validate_physics: z.boolean().optional().describe("Apply physics plausibility checks (default: true)"),
}).passthrough();

const pdf_extract_formulas = z.object({
  source_id: z.string().min(1).describe("PDF source ID"),
  text: z.string().optional().describe("Text content to extract formulas from"),
  content: z.string().optional().describe("Alias for text"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence (default: 0.7)"),
}).passthrough();

const pdf_extract_materials = z.object({
  source_id: z.string().min(1).describe("PDF source ID"),
  text: z.string().optional().describe("Text content to extract materials from"),
  content: z.string().optional().describe("Alias for text"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence (default: 0.6)"),
}).passthrough();

const pdf_batch_process = z.object({
  categories: z.array(z.enum(["handbook", "textbook", "catalog", "standard", "paper", "mit_course", "manual"])).optional()
    .describe("PDF categories to process (all if omitted)"),
  max_concurrent: z.number().int().positive().optional().describe("Max concurrent extractions (default: 3)"),
  extract_tables: z.boolean().optional().describe("Extract tables (default: true)"),
  extract_formulas: z.boolean().optional().describe("Extract formulas (default: true)"),
  extract_materials: z.boolean().optional().describe("Extract materials (default: true)"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence (default: 0.7)"),
}).passthrough();

const pdf_batch_priority = z.object({
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence (default: 0.7)"),
}).passthrough();

const pdf_batch_stats = z.object({}).passthrough();

// ============================================================================
// Catalog Extraction + Resource Tracking (PDF-EXT-MS1)
// ============================================================================

const resource_scan = z.object({
  directory: optStr.describe("Directory to scan for resources"),
  path: optStr.describe("Alias for directory"),
  recursive: z.boolean().optional().describe("Scan subdirectories (default: true)"),
  extensions: z.array(z.string()).optional().describe("File extensions to include"),
  max_files: z.number().int().positive().optional().describe("Max files to discover (default: 10000)"),
}).passthrough();

const resource_stats = z.object({}).passthrough();

const resource_pending = z.object({
  limit: z.number().int().positive().optional().describe("Max results to return (default: 50)"),
}).passthrough();

const resource_report = z.object({}).passthrough();

const catalog_extract = z.object({
  resource_id: optStr.describe("Resource ID from tracking system"),
  text: optStr.describe("Text content to extract from"),
  content: optStr.describe("Alias for text"),
  manufacturer: z.string().min(1).describe("Manufacturer name (sandvik, kennametal, etc.)"),
  catalog_path: optStr.describe("Original catalog file path"),
  merge_strategy: z.enum(["prefer_new", "prefer_existing", "prefer_manufacturer", "merge_all"]).optional()
    .describe("How to handle conflicts (default: prefer_manufacturer)"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence (default: 0.7)"),
  dry_run: z.boolean().optional().describe("Don't save, just preview (default: false)"),
}).passthrough();

const catalog_merge = z.object({
  manufacturer: z.string().min(1).describe("Manufacturer to merge"),
  strategy: z.enum(["prefer_new", "prefer_existing", "prefer_manufacturer", "merge_all"]).optional()
    .describe("Merge strategy (default: prefer_manufacturer)"),
}).passthrough();

const catalog_export = z.object({
  manufacturer: z.string().min(1).describe("Manufacturer to export"),
  preview: z.boolean().optional().describe("Truncate output for preview (default: false)"),
}).passthrough();

const catalog_stats = z.object({}).passthrough();

// ============================================================================
// PDF-EXT-MS2: MIT Academic Course Extraction
// ============================================================================

const mit_course_stats = z.object({}).passthrough();

const mit_course_algorithms = z.object({
  course_id: z.string().min(1).describe("MIT course ID (e.g., '2.810', '6.046J')"),
}).passthrough();

const mit_course_engine_map = z.object({
  engine_name: z.string().min(1).describe("PRISM engine name (e.g., 'PRISM_KIENZLE_FORCE')"),
}).passthrough();

const mit_course_search = z.object({
  pattern: z.string().min(1).describe("Algorithm name pattern to search"),
}).passthrough();

const mit_course_manufacturing = z.object({}).passthrough();

const mit_course_report = z.object({
  engine_name: z.string().min(1).describe("PRISM engine for knowledge report"),
}).passthrough();

const mit_course_data = z.object({
  course_id: z.string().min(1).describe("Course folder ID (e.g., '10.34-fall-2015')"),
}).passthrough();

const lecture_scan_course = z.object({
  course_id: z.string().min(1).describe("Course folder ID to scan"),
}).passthrough();

const lecture_extract_formulas = z.object({
  text: z.string().min(1).describe("Text to extract formulas from"),
  course_id: z.string().optional().describe("Course ID for attribution"),
  lecture_number: z.number().int().optional().describe("Lecture number"),
}).passthrough();

const lecture_get_formulas = z.object({
  category: z.enum([
    "cutting_mechanics", "dynamics", "thermal", "numerical",
    "optimization", "statistics", "machine_learning", "geometry",
    "control", "other"
  ]).optional().describe("Formula category filter"),
  engine: z.string().optional().describe("PRISM engine filter"),
}).passthrough();

const lecture_get_problems = z.object({
  course_id: z.string().optional().describe("Course ID filter"),
  min_relevance: z.number().min(0).max(1).optional().describe("Minimum PRISM relevance score"),
}).passthrough();

const lecture_stats = z.object({}).passthrough();

// ============================================================================
// PDF-EXT-MS2: Knowledge Ingestion Pipeline
// ============================================================================

const ingestion_discover = z.object({
  subdir: z.string().optional().describe("Subdirectory to scan (default: all)"),
  limit: z.number().int().positive().optional().describe("Max resources to return (default: 50)"),
}).passthrough();

const ingestion_pending = z.object({
  limit: z.number().int().positive().optional().describe("Max resources to return (default: 20)"),
}).passthrough();

const ingestion_run = z.object({
  max_resources: z.number().int().positive().optional().describe("Max resources to process (default: 10)"),
  categories: z.array(z.enum([
    "tool_catalog", "handbook", "mit_course", "academic_paper",
    "machine_manual", "standard"
  ])).optional().describe("Categories to process (default: all)"),
}).passthrough();

const ingestion_ingest_one = z.object({
  path: z.string().optional().describe("Full path to resource"),
  name: z.string().optional().describe("Resource filename"),
}).passthrough();

const ingestion_stats = z.object({}).passthrough();

// ── Workflow Template Actions ──
const workflow_suggest = z.object({
  process_type: z.enum([
    "2d_milling", "3d_milling", "5axis_milling",
    "turning", "mill_turn", "wire_edm", "sinker_edm", "grinding",
    "die_design", "mold_design", "fixture_design"
  ]).optional().describe("Process type for workflow suggestion"),
  part_complexity: z.enum(["simple", "moderate", "complex", "extreme"]).optional(),
  features: z.array(z.string()).optional(),
  material_group: z.string().optional(),
  machine_type: z.string().optional(),
}).passthrough();

const workflow_validate = z.object({
  process_type: z.enum([
    "2d_milling", "3d_milling", "5axis_milling",
    "turning", "mill_turn", "wire_edm", "sinker_edm", "grinding",
    "die_design", "mold_design", "fixture_design"
  ]).optional(),
  operations: z.array(z.string()).optional().describe("Operations to validate"),
}).passthrough();

const workflow_quick_ref = z.object({
  process_type: z.enum([
    "2d_milling", "3d_milling", "5axis_milling",
    "turning", "mill_turn", "wire_edm", "sinker_edm", "grinding",
    "die_design", "mold_design", "fixture_design"
  ]).optional(),
}).passthrough();

const workflow_order_of_ops = z.object({}).passthrough();

const workflow_search = z.object({
  query: z.string().optional().describe("Search query"),
  limit: z.number().optional().describe("Max results"),
}).passthrough();

const workflow_stats = z.object({}).passthrough();

// ============================================================================
// KAR-MS3: Knowledge-Augmented Reasoning Wiring Actions
// ============================================================================

// Lineage Tracking (U-KAR24)
const knowledge_lineage_trace = z.object({
  atom_id: z.string().describe("ID of atom to trace"),
}).passthrough();

const knowledge_lineage_report = z.object({
  atom_id: z.string().describe("ID of atom for lineage report"),
}).passthrough();

const knowledge_lineage_stats = z.object({}).passthrough();

// Wiring Routes (U-KAR25)
const knowledge_wiring_resolve = z.object({
  source_category: z.string().optional().describe("Source resource category (handbook, tool_catalog, etc.)"),
  knowledge_type: z.string().optional().describe("Knowledge type (tip, formula, tool, material, etc.)"),
  domain: z.string().optional().describe("Domain for routing (milling, turning, general, etc.)"),
}).passthrough();

const knowledge_wiring_manifest = z.object({}).passthrough();

const knowledge_wiring_consumers = z.object({
  knowledge_type: z.string().optional().describe("Knowledge type to find consumers for"),
  domain: z.string().optional().describe("Domain filter"),
}).passthrough();

// Atom Management (U-KAR26)
const knowledge_atom_validate = z.object({
  atom: z.record(z.any()).describe("Knowledge atom to validate"),
}).passthrough();

const knowledge_atom_create = z.object({
  title: z.string().describe("Atom title"),
  content: z.string().describe("Atom content"),
  type: z.string().optional().describe("Knowledge type (tip, formula, etc.) - default: tip"),
  category: z.string().optional().describe("Category - default: general"),
  source_path: z.string().optional().describe("Source path - default: manual_entry"),
  source_type: z.string().optional().describe("Source type - default: tribal"),
  authority: z.string().optional().describe("Authority level - default: operator"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence 0-1 - default: 0.7"),
  tags: z.array(z.string()).optional().describe("Tags for the atom"),
}).passthrough();

const knowledge_atom_batch = z.object({
  atoms: z.array(z.object({
    title: z.string(),
    content: z.string(),
    type: z.string().optional(),
    category: z.string().optional(),
    source_path: z.string().optional(),
    source_type: z.string().optional(),
    authority: z.string().optional(),
    confidence: z.number().optional(),
    tags: z.array(z.string()).optional(),
  })).describe("Array of atoms to create"),
}).passthrough();

// Conflict Resolution (U-KAR27)
const knowledge_conflict_detect = z.object({
  limit: z.number().int().positive().optional().describe("Max conflicts to return - default: 10"),
}).passthrough();

const knowledge_conflict_resolve_authority = z.object({
  conflict_id: z.string().describe("ID of conflict to resolve"),
}).passthrough();

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
  tribal_recategorize,
  tribal_graph,
  master_machinist_recommend,
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
  // PDF-EXT-MS0: PDF Extraction Pipeline
  pdf_source_list,
  pdf_source_stats,
  pdf_source_discover,
  pdf_extract_tables,
  pdf_extract_formulas,
  pdf_extract_materials,
  pdf_batch_process,
  pdf_batch_priority,
  pdf_batch_stats,
  // PDF-EXT-MS1: Catalog Extraction + Resource Tracking
  resource_scan,
  resource_stats,
  resource_pending,
  resource_report,
  catalog_extract,
  catalog_merge,
  catalog_export,
  catalog_stats,
  // PDF-EXT-MS2: MIT Academic Course Extraction
  mit_course_stats,
  mit_course_algorithms,
  mit_course_engine_map,
  mit_course_search,
  mit_course_manufacturing,
  mit_course_report,
  mit_course_data,
  lecture_scan_course,
  lecture_extract_formulas,
  lecture_get_formulas,
  lecture_get_problems,
  lecture_stats,
  // PDF-EXT-MS2: Knowledge Ingestion Pipeline
  ingestion_discover,
  ingestion_pending,
  ingestion_run,
  ingestion_ingest_one,
  ingestion_stats,
  // Workflow Template Actions
  workflow_suggest,
  workflow_validate,
  workflow_quick_ref,
  workflow_order_of_ops,
  workflow_search,
  workflow_stats,
  // KAR-MS3: Knowledge-Augmented Reasoning Wiring
  knowledge_lineage_trace,
  knowledge_lineage_report,
  knowledge_lineage_stats,
  knowledge_wiring_resolve,
  knowledge_wiring_manifest,
  knowledge_wiring_consumers,
  knowledge_atom_validate,
  knowledge_atom_create,
  knowledge_atom_batch,
  knowledge_conflict_detect,
  knowledge_conflict_resolve_authority,
  // INTEL-OLLAMA-OBSIDIAN-MS0/P14-U02: KIP ingestion
  wiki_ingest_pdf,
  wiki_ingest_dryrun,
  wiki_rag_query,
  wiki_rag_should_trigger,
  wiki_classify_file,
  wiki_summarize_dir,
  wiki_backlink_for_chunk,
  wiki_backlink_render,
  wiki_backlink_parse_digest,
  wiki_bootstrap_filter_courses,
  wiki_bootstrap_filter_algorithms,
  wiki_bootstrap_render_course,
  wiki_bootstrap_render_algorithm,
  wiki_bootstrap_build_index_line,
  wiki_bootstrap_insert_index,
  csm_audit_classify_path,
  csm_audit_summarize,
  csm_audit_detect_variants,
  csm_audit_format_report,
  csm_audit_build_fingerprint,
  plan_trajectory_parse,
  plan_trajectory_summarize,
  plan_trajectory_derive_id,
};
