/**
 * Shop Practice Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for all 12 prism_shop_practice actions.
 *
 * @module schemas/shopPracticeActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();

// ============================================================================
// PRACTICE KB (6 actions)
// ============================================================================

const practice_ingest = z.object({
  practices: z.array(z.object({
    practice_type: optStr,
    title: optStr,
    description: optStr,
    material: optStr,
    operation: optStr,
  }).passthrough()).min(1),
  video_id: optStr,
  channel: optStr,
  channel_subscribers: optNum,
  views: optNum,
  likes: optNum,
  confidence: z.number().min(0).max(1).optional(),
}).passthrough();

const practice_search = z.object({
  query: optStr,
  category: optStr,
  material: optStr,
  operation: optStr,
  min_confidence: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().optional(),
}).passthrough();

const practice_get = z.object({
  practice_id: z.string().min(1),
}).passthrough();

const practice_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const practice_audit = z.object({
  fix: optBool,
}).passthrough();

const practice_recommend = z.object({
  operation: optStr,
  material: optStr,
  machine: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// TROUBLE TREES (3 actions)
// ============================================================================

const tree_build = z.object({
  symptom: z.string().min(1),
  category: optStr,
  max_depth: z.number().int().positive().optional(),
}).passthrough();

const tree_navigate = z.object({
  tree_id: z.string().min(1),
  path: z.array(z.number().int().min(0)).optional(),
  child_index: z.number().int().min(0).optional(),
}).passthrough();

const tree_search = z.object({
  symptom: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// MATERIAL TIPS (3 actions)
// ============================================================================

const tips_add = z.object({
  material: z.string().min(1),
  tip: z.string().min(1),
  source: optStr,
  confidence: z.number().min(0).max(1).optional(),
  category: optStr,
}).passthrough();

const tips_get = z.object({
  material: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const tips_conflicts = z.object({
  material: z.string().min(1),
}).passthrough();

// ============================================================================
// EXPORT
// ============================================================================

// ============================================================================
// PLAYBOOK (6 actions)
// ============================================================================

const playbook_advise = z.object({
  material_iso: optStr,
  features: z.array(z.string()).optional(),
  tolerance_mm: optNum,
  wall_thickness_mm: optNum,
  surface_finish_Ra: optNum,
  batch_size: optNum,
  machine_axes: optNum,
  categories: z.array(z.string()).optional(),
  severity_min: z.enum(["critical", "important", "recommended", "tip"]).optional(),
}).passthrough();

const playbook_sequence = z.object({
  features: z.array(z.string()).min(1),
  material_iso: optStr,
}).passthrough();

const playbook_setup = z.object({
  features: z.array(z.string()).min(1),
  material_iso: optStr,
  tolerance_mm: optNum,
}).passthrough();

const playbook_antipatterns = z.object({
  material_iso: optStr,
  features: z.array(z.string()).optional(),
  wall_thickness_mm: optNum,
}).passthrough();

const playbook_lookup = z.object({
  category: z.string(),
}).passthrough();

const playbook_add_rule = z.object({
  id: z.string(),
  category: z.string(),
  severity: z.enum(["critical", "important", "recommended", "tip"]),
  title: z.string(),
  rule: z.string(),
  reasoning: z.string(),
  conditions: z.array(z.object({ type: z.string() }).passthrough()),
  exceptions: z.array(z.string()),
  source: z.string(),
  examples: z.array(z.string()).optional(),
  related_rules: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// TRIBAL KNOWLEDGE (5 actions)
// ============================================================================

const tribal_search = z.object({
  query: z.string().optional().describe("Free-text search across tip titles, bodies, and tags"),
  category: z.string().optional().describe("Filter by knowledge category (e.g. setup, tooling, speeds_feeds)"),
  material_iso_group: z.string().optional().describe("ISO material group code (P, M, K, N, S, H)"),
  operation_type: z.string().optional().describe("Operation type filter (e.g. pocket, profile, thread)"),
  min_confidence: z.number().min(0).max(100).optional().describe("Minimum confidence threshold (0-100)"),
  limit: z.number().int().positive().optional().describe("Max results to return (default 5)"),
}).passthrough();

const tribal_add = z.object({
  title: z.string().min(1).describe("Short descriptive title for the tip"),
  body: z.string().min(1).describe("Full tip text with machinist-level detail"),
  category: z.string().min(1).describe("Knowledge category (setup, tooling, speeds_feeds, fixturing, surface_finish, thread, safety, maintenance, material_handling, quality, troubleshooting)"),
  tags: z.array(z.string()).min(1).describe("Searchable tags (e.g. ['stainless', 'work-hardening'])"),
  source: z.string().min(1).describe("Provenance (e.g. 'operator:John', 'video:abc123')"),
  confidence: z.number().min(0).max(100).describe("Expert confidence rating 0-100"),
  material_groups: z.array(z.string()).optional().describe("ISO material groups this tip applies to"),
  operation_types: z.array(z.string()).optional().describe("Operation types this tip applies to"),
}).passthrough();

const tribal_get = z.object({
  tip_id: z.string().min(1).describe("Unique tip ID (e.g. 'tk-001')"),
}).passthrough();

const tribal_list = z.object({
  category: z.string().optional().describe("Filter by category"),
  offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
  limit: z.number().int().positive().optional().describe("Page size (default 20)"),
}).passthrough();

const tribal_categories = z.object({}).passthrough();

// ============================================================================
// TRIBAL ENRICHMENT COORDINATOR (5 actions)
// ============================================================================
// Wires TribalEnrichmentCoordinatorEngine — a unified coordinator that fetches
// tribal tips + playbook rules + controller-specific tips in one call for any
// P2P process pipeline. Enum values mirror the engine's ProcessType /
// ControllerType unions exactly so an out-of-range string is rejected at the
// Zod boundary rather than silently returning empty results.

const _processTypeEnum = z.enum([
  "wire_edm", "sinker_edm", "milling", "turning", "grinding", "multi_axis",
]);
const _controllerEnum = z.enum([
  "fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles",
  "siemens", "haas", "okuma", "mazak",
]);

// Shared enrichment input — process_type required, everything else optional.
// Physical quantities are constrained positive (a negative thickness/tolerance/
// hardness is nonsense and would only ever come from a caller bug).
const _enrichmentInputShape = {
  process_type: _processTypeEnum.describe("Manufacturing process: wire_edm, sinker_edm, milling, turning, grinding, or multi_axis"),
  material: optStr.describe("Workpiece material name (e.g. 'D2 tool steel', 'Inconel 718')"),
  controller: _controllerEnum.optional().describe("CNC/EDM controller family for controller-specific programming tips"),
  thickness_mm: optPosNum.describe("Stock or wall thickness in mm"),
  tolerance_mm: optPosNum.describe("Required tolerance in mm"),
  surface_finish_Ra_um: optPosNum.describe("Target surface finish Ra in micrometres"),
  is_thin_wall: optBool.describe("True if the part has thin-wall features"),
  hardness_hrc: optPosNum.describe("Material hardness in HRC"),
};

const tribal_enrich = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_check = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_tips_only = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_playbook_only = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_controller_only = z.object({
  controller: _controllerEnum.describe("CNC/EDM controller family to fetch programming tips for"),
}).passthrough();

// ============================================================================
// PLAYBOOK RULES ENGINE (4 actions) — U-BRIDGE-WIRE-TRIBAL
// ============================================================================
// Wires PlaybookRulesEngine — domain-classified machining rule corpus
// (lathe/mill/wedm/general) merged from MachiningPlaybookEngine + DOMAIN_RULES.

const playbook_rules_query = z.object({
  domain: z.enum(["lathe", "mill", "wedm", "general", "all"]).optional()
    .describe("Machine-domain filter; 'all' or omitted = every domain"),
  categories: z.array(z.string().min(1)).optional()
    .describe("RuleCategory filters (e.g. 'safety', 'roughing', 'anti_pattern')"),
  severity_min: z.enum(["critical", "important", "recommended", "tip"]).optional()
    .describe("Minimum severity to include — 'critical' is strictest, 'tip' returns all"),
}).passthrough();

const playbook_rules_search = z.object({
  keyword: z.string().min(1)
    .describe("Free-text keyword matched across rule title, body, reasoning, and category"),
}).passthrough();

const playbook_rules_safety = z.object({}).passthrough();

const playbook_rules_stats = z.object({}).passthrough();

// ============================================================================
// LATHE LoRA TRIBAL AUGMENTATION (3 actions) — U-BRIDGE-WIRE-TRIBAL
// ============================================================================
// Wires LatheLoRATribalAugmentationEngine — injects JM-Die / Okuma shop-floor
// tips and anti-pattern warnings into LatheLoRA model output.

const lathe_lora_tribal_augment = z.object({
  response: z.string().min(1)
    .describe("LatheLoRA model output text to augment with tribal knowledge"),
  query: z.string().min(1)
    .describe("Original user query / machining context driving tip relevance"),
}).passthrough();

const lathe_lora_tribal_find_tips = z.object({
  response: z.string().min(1)
    .describe("Response text to scan for relevant tribal tips"),
  query: z.string().min(1)
    .describe("Query context used for relevance scoring"),
}).passthrough();

const lathe_lora_tribal_aug_stats = z.object({}).passthrough();

// ============================================================================
// LATHE LoRA TRIBAL EXTRACTOR (3 actions) — U-BRIDGE-WIRE-TRIBAL
// ============================================================================
// Wires LatheLoRATribalExtractorEngine — parses operator free-text into
// structured tribal tips (condition / recommendation / category / confidence).

const lathe_lora_tribal_extract = z.object({
  text: z.string().min(1)
    .describe("Operator-provided raw text to extract one structured tribal tip from"),
  author: z.string().optional().describe("Tip author for provenance"),
  source: z.string().optional()
    .describe("Tip source for provenance (e.g. 'video:abc', 'operator:John')"),
}).passthrough();

const lathe_lora_tribal_extract_batch = z.object({
  texts: z.array(z.string().min(1)).min(1)
    .describe("Array of raw operator texts to batch-extract tribal tips from"),
}).passthrough();

const lathe_lora_tribal_extractor_stats = z.object({}).passthrough();

// ============================================================================
// TRIBAL KNOWLEDGE APPLICATOR (2 actions) — U-CAMAGI12 (CADCAM-DAGI-MS4)
// ============================================================================
// Wires TribalKnowledgeApplicatorEngine — scores strategy candidates against
// tribal constraints + MachiningPlaybook rules, ranks them, emits rationale.

const strategyCandidateSchema = z.object({
  id: z.string().min(1).describe("Unique strategy candidate identifier"),
  name: z.string().min(1).describe("Human-readable strategy name"),
  params: z.record(z.string(), z.number()).optional()
    .describe("Machining parameters keyed by name (e.g. feed_mm_rev, rpm, doc_mm)"),
  tags: z.array(z.string()).optional()
    .describe("Descriptive strategy tags (e.g. trochoidal, climb, flood-coolant)"),
  description: z.string().optional().describe("Optional free-text strategy description"),
  baseScore: z.number().optional()
    .describe("Upstream optimizer score in [0,1]; defaults to 0.5 when omitted"),
}).passthrough();

const tribalConstraintSchema = z.object({
  id: z.string().min(1).describe("Unique constraint identifier"),
  severity: z.enum(["critical", "important", "recommended", "tip"])
    .describe("Constraint severity — drives the tribalScore penalty weight"),
  description: z.string().describe("Human-readable constraint description"),
  appliesTo: z.string().optional().describe("Parameter key this constraint bounds"),
  min: z.number().optional().describe("Inclusive lower bound for the appliesTo parameter"),
  max: z.number().optional().describe("Inclusive upper bound for the appliesTo parameter"),
  forbiddenTag: z.string().optional().describe("Candidate is penalized if it carries this tag"),
  requiredTag: z.string().optional().describe("Candidate is penalized if it lacks this tag"),
}).passthrough();

const tribal_apply = z.object({
  candidates: z.array(strategyCandidateSchema).min(1)
    .describe("Strategy candidates to score against tribal knowledge"),
  constraints: z.array(tribalConstraintSchema).optional()
    .describe("Explicit tribal constraints (merged with any playbook-derived constraints)"),
  context: z.object({
    material: z.string().optional(),
    operation: z.string().optional(),
    feature: z.string().optional(),
  }).passthrough().optional()
    .describe("Machining context (material/operation/feature) for rationale synthesis"),
  playbook_category: z.string().optional()
    .describe("Optional MachiningPlaybook rule category folded into the constraint set"),
}).passthrough();

const tribal_apply_stats = z.object({}).passthrough();

// ============================================================================
// PLAYBOOK CAPABILITY EXTENSIONS (3 actions) — U-PB-EXPAND-CAPABILITIES
// ============================================================================
// Wires the new MachiningPlaybookEngine methods: explainRule, coverageReport,
// quantitativeGuidance. The coverage + quantitative actions share the
// PlaybookQuery shape used by `playbook_advise`.

const playbookQuerySchema = z.object({
  material_iso: z.string().optional().describe("ISO material group (P / M / K / N / S / H)"),
  features: z.array(z.string()).optional()
    .describe("Feature tokens present in the part (e.g. 'pocket', 'thread', 'thin_wall')"),
  tolerance_mm: z.number().optional().describe("Tightest tolerance on the part (mm)"),
  wall_thickness_mm: z.number().optional().describe("Thinnest wall on the part (mm)"),
  surface_finish_Ra: z.number().optional().describe("Required surface finish (Ra, micrometers)"),
  batch_size: z.number().optional().describe("Production batch size"),
  machine_axes: z.number().optional().describe("Machine axis count (3, 4, 5, ...)"),
  categories: z.array(z.string()).optional()
    .describe("Filter applicable rules to these category strings"),
  severity_min: z.enum(["critical", "important", "recommended", "tip"]).optional()
    .describe("Minimum severity to include in the applicable set"),
  operation_type: z.string().optional().describe("Operation type (e.g. 'roughing', 'finishing')"),
  hardness_hrc: z.number().optional().describe("Workpiece hardness (Rockwell C)"),
  aspect_ratio: z.number().optional().describe("Length-to-diameter aspect ratio for the part"),
  spindle_rpm: z.number().optional().describe("Spindle speed (rev/min)"),
}).passthrough();

const playbook_explain = z.object({
  rule_id: z.string().min(1).describe("Playbook rule ID to deeply explain (e.g. 'SEQ-001')"),
}).passthrough();

const playbook_coverage = playbookQuerySchema;
const playbook_quantitative = playbookQuerySchema;

// Playbook-corpus integrity audit — no input parameters.
const playbook_audit = z.object({}).passthrough();

// Playbook-corpus semantic conflict scan — no input parameters.
const playbook_conflicts = z.object({}).passthrough();

// Severity + evidence-based ranking of the conflict scan — no input parameters.
const playbook_conflicts_ranked = z.object({}).passthrough();

// Batch resolution proposals over the full conflict scan — no input parameters.
// Batch operates over the engine's full conflict scan; no caller-supplied data
// is read. Empty passthrough matches sibling batch actions (playbook_conflicts,
// playbook_conflicts_ranked).
const playbook_suggest_resolutions = z.object({}).passthrough();

// Single-pair resolution proposal. Strict per H:/.claude/rules/schemas.md
// ("never z.any()") — surface required fields in the MCP tool catalog so
// operators see what the handler actually requires (Reviewer B P1-2, iter9).
// CONFLICT_PARAMETER and DIRECTIVE_DIRECTION are mirrored from
// MachiningPlaybookEngine.ts unions; the dispatcher's exhaustiveness Records
// enforce sync at compile time.
const CONFLICT_PARAMETER_ENUM = z.enum([
  "feedrate",
  "spindle_speed",
  "depth_of_cut",
  "width_of_cut",
  "coolant",
]);
const DIRECTIVE_DIRECTION_ENUM = z.enum(["increase", "decrease"]);
const PLAYBOOK_CONFLICT_SHAPE = z.object({
  ruleIdA: z
    .string()
    .min(1)
    .max(256)
    .describe("First rule id participating in the conflict (≤256 chars, e.g. 'SEQ-001')."),
  ruleIdB: z
    .string()
    .min(1)
    .max(256)
    .describe("Second rule id participating in the conflict (≤256 chars)."),
  parameter: CONFLICT_PARAMETER_ENUM.describe(
    "Conflict axis. One of: feedrate, spindle_speed, depth_of_cut, width_of_cut, coolant.",
  ),
  directionA: DIRECTIVE_DIRECTION_ENUM.optional().describe(
    "Direction rule A pushes the parameter (increase|decrease). Defaults to 'increase'.",
  ),
  directionB: DIRECTIVE_DIRECTION_ENUM.optional().describe(
    "Direction rule B pushes the parameter (increase|decrease). Defaults to 'decrease' for synthetic opposition.",
  ),
  category: z
    .string()
    .max(256)
    .optional()
    .describe("Rule category tag (≤256 chars). Defaults to 'tactics'. Not load-bearing in resolution logic."),
  sharedContext: z
    .string()
    .max(4096)
    .optional()
    .describe("Free-text shared context (≤4096 chars). Defaults to 'operator-supplied conflict'."),
});
// Multi-hop BFS over related_rules. ruleId required (non-empty ≤256 chars);
// maxDepth optional integer 0-10, default 2.
const playbook_related_graph = z
  .object({
    ruleId: z
      .string()
      .min(1)
      .max(256)
      .describe("Root rule id for the BFS traversal (≤256 chars, e.g. 'SEQ-001')."),
    maxDepth: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .describe("Max BFS hop depth (0-10, default 2). 0 = root only; 1 = direct neighbors; etc."),
  })
  .passthrough();

// Corpus-wide health audit. No inputs (pure read-only audit). Strict schema
// (no fields) but .passthrough() preserves wire-format consistency with
// sibling playbook_* actions that accept optional flat aliases.
const playbook_validate_corpus = z.object({}).passthrough();

const playbook_suggest_resolution = z
  .object({
    // The dispatcher accepts either a flat payload (fields at the top level)
    // OR a nested {conflict: {...}} payload. Both legs are made-optional here
    // so the MCP catalog surfaces both shapes; the handler enforces the
    // required-field constraints at runtime via asBoundedString +
    // asConflictParameter.
    conflict: PLAYBOOK_CONFLICT_SHAPE.optional().describe(
      "Nested conflict payload. Use either this or the flat top-level fields.",
    ),
    ruleIdA: z.string().min(1).max(256).optional().describe("Flat-payload alias for conflict.ruleIdA."),
    ruleIdB: z.string().min(1).max(256).optional().describe("Flat-payload alias for conflict.ruleIdB."),
    parameter: CONFLICT_PARAMETER_ENUM.optional().describe("Flat-payload alias for conflict.parameter."),
    directionA: DIRECTIVE_DIRECTION_ENUM.optional().describe("Flat-payload alias for conflict.directionA."),
    directionB: DIRECTIVE_DIRECTION_ENUM.optional().describe("Flat-payload alias for conflict.directionB."),
    category: z.string().max(256).optional().describe("Flat-payload alias for conflict.category."),
    sharedContext: z.string().max(4096).optional().describe("Flat-payload alias for conflict.sharedContext."),
  })
  .passthrough();

// ============================================================================
// MILL-STUDIO AI-REACHABLE TRAINING INDEX (3 actions) — MILL-PDF-CORPUS-MS0
// ============================================================================
// Exposes the source-attributed milling tribal-tip corpus (24 PDFs + 52
// vendor-online URLs + 50 cited tips) to AI agents and training pipelines
// via MCP. Foxtrot-soul source attribution preserved through every node.

const mill_training_for_operation = z.object({
  operation: z.string().min(1).max(64)
    .describe("Milling operation key (face_milling, pocket_milling, slotting, contour_milling, thread_milling, drilling_strategies, adaptive_hsm, five_axis, workholding, tool_holders, cutter_compensation, program_recovery, ngc_control). Case-insensitive."),
}).passthrough();

const mill_training_search = z.object({
  query: z.string().min(1).max(1024)
    .describe("Free-text query for BM25-lite search across milling training nodes (headline + body + tags + operations + vendor). Corroborated-confidence hits are boosted."),
  topK: z.number().int().min(1).max(50).optional()
    .describe("Maximum number of results to return (default 5, max 50)"),
}).passthrough();

const mill_training_summary = z.object({}).passthrough();

export const ACTION_SHOP_PRACTICE_SCHEMAS: ActionSchemaMap = {
  practice_ingest,
  practice_search,
  practice_get,
  practice_list,
  practice_audit,
  practice_recommend,
  tree_build,
  tree_navigate,
  tree_search,
  tips_add,
  tips_get,
  tips_conflicts,
  playbook_advise,
  playbook_sequence,
  playbook_setup,
  playbook_antipatterns,
  playbook_lookup,
  playbook_add_rule,
  tribal_search,
  tribal_add,
  tribal_get,
  tribal_list,
  tribal_categories,
  tribal_enrich,
  tribal_enrich_check,
  tribal_enrich_tips_only,
  tribal_enrich_playbook_only,
  tribal_enrich_controller_only,
  playbook_rules_query,
  playbook_rules_search,
  playbook_rules_safety,
  playbook_rules_stats,
  lathe_lora_tribal_augment,
  lathe_lora_tribal_find_tips,
  lathe_lora_tribal_aug_stats,
  lathe_lora_tribal_extract,
  lathe_lora_tribal_extract_batch,
  lathe_lora_tribal_extractor_stats,
  tribal_apply,
  tribal_apply_stats,
  playbook_explain,
  playbook_coverage,
  playbook_quantitative,
  playbook_audit,
  playbook_conflicts,
  playbook_conflicts_ranked,
  playbook_suggest_resolutions,
  playbook_suggest_resolution,
  playbook_related_graph,
  mill_training_for_operation,
  mill_training_search,
  mill_training_summary,
  playbook_validate_corpus,
};
