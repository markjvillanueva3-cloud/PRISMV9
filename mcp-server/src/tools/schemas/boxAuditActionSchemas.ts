/**
 * Zod schemas for BOX-MS5 dispatcher actions.
 * Validates input for program audit, validation, optimization, and controller queries.
 */
import { z } from "zod";

// ── Shared sub-schemas ────────────────────────────────────────

const ControllerFamily = z.enum(["okuma", "haas", "hurco", "roku_roku", "mitsubishi"])
  .describe("CNC controller family");

const UnitSystem = z.enum(["imperial", "metric"])
  .describe("Unit system for speeds/feeds/dimensions");

// ── BOX-MS5: Validation ──────────────────────────────────────

export const BoxValidateProgramSchema = z.object({
  content: z.string().min(1).describe("Raw G-code program content"),
  filename: z.string().optional().describe("Source filename (e.g., CASING.MIN)"),
  controller: ControllerFamily.default("okuma").describe("Controller dialect for validation"),
});

export const BoxExtractOperationsSchema = z.object({
  content: z.string().min(1).describe("Raw G-code program content"),
  filename: z.string().optional().describe("Source filename"),
  controller: ControllerFamily.default("okuma").describe("Controller dialect for parsing"),
});

// ── BOX-MS5: Controller Capability ───────────────────────────

export const BoxControllerCapabilitySchema = z.object({
  family: ControllerFamily.describe("Controller family to query capabilities for"),
});

export const BoxControllerSafetyCodesSchema = z.object({
  family: ControllerFamily.describe("Controller family to query safety codes for"),
});

// ── BOX-MS5: Calibration ────────────────────────────────────

export const BoxCalibrateFromShopSchema = z.object({
  speed_feed_data: z.any().optional().describe("SpeedFeedMineResult from box_mine_speed_feed"),
  tool_data: z.any().optional().describe("ToolMineResult from box_mine_tool_patterns"),
  sequence_data: z.any().optional().describe("SequenceMineResult from box_mine_operation_sequences"),
  macro_data: z.any().optional().describe("MacroMineResult from box_mine_macro_patterns"),
  safety_data: z.any().optional().describe("SafetyMineResult from box_mine_safety_patterns"),
});

// ── BOX-MS5: Full Program Audit ──────────────────────────────

export const BoxFullProgramAuditSchema = z.object({
  content: z.string().min(1).describe("Raw G-code program content"),
  filename: z.string().optional().describe("Source filename"),
  customer_name: z.string().optional().describe("Customer name for material inference"),
  unit_system: UnitSystem.default("imperial"),
  machine_max_power_kw: z.number().positive().optional()
    .describe("Machine max spindle power in kW (default: 15)"),
  machine_max_rpm: z.number().positive().optional()
    .describe("Machine max spindle RPM (default: 4200)"),
});

// ── BOX-MS3: Key existing action schemas ─────────────────────

export const BoxOptimizeProgramSchema = z.object({
  program: z.any().describe("Parsed OkumaProgram object from box_parse_okuma"),
  unit_system: UnitSystem.default("imperial"),
  machine_max_power_kw: z.number().positive().optional(),
  machine_max_rpm: z.number().positive().optional(),
  target_tool_life_min: z.number().positive().optional()
    .describe("Target tool life in minutes (default: 15)"),
  customer_name: z.string().optional(),
});

export const BoxSafetyCheckSchema = z.object({
  original_program: z.any().describe("Original parsed program"),
  optimized_program: z.any().describe("Optimized program to validate"),
  machine_max_power_kw: z.number().positive().optional(),
  machine_max_rpm: z.number().positive().optional(),
});

export const BoxBatchOptimizeSchema = z.object({
  programs: z.array(z.object({
    filename: z.string(),
    program: z.any(),
  })).min(1).describe("Array of parsed programs to optimize"),
  unit_system: UnitSystem.default("imperial"),
  machine_max_power_kw: z.number().positive().optional(),
  machine_max_rpm: z.number().positive().optional(),
  max_programs: z.number().positive().optional().describe("Limit number of programs to process"),
  sort_by: z.enum(["recent", "line_count"]).optional(),
});

export const BoxResolveMaterialSchema = z.object({
  program: z.any().describe("Parsed OkumaProgram object"),
  customer_name: z.string().optional(),
  unit_system: UnitSystem.default("imperial"),
});

export const BoxResolveToolsSchema = z.object({
  program: z.any().describe("Parsed OkumaProgram object"),
  unit_system: UnitSystem.default("imperial"),
});

// ── BOX-MS4: Controller Knowledge schemas ────────────────────

export const BoxControllerLookupSchema = z.object({
  code: z.string().min(1).describe("G-code or M-code to look up (e.g., G85, M110)"),
  family: ControllerFamily.optional().describe("Limit search to one controller family"),
});

export const BoxControllerCompareSchema = z.object({
  family_a: ControllerFamily.describe("First controller family"),
  family_b: ControllerFamily.describe("Second controller family"),
});

export const BoxPostTrainerSchema = z.object({
  reference_lines: z.array(z.string()).min(1).describe("Reference program lines (from shop)"),
  generated_lines: z.array(z.string()).min(1).describe("PRISM-generated program lines"),
  controller: ControllerFamily.default("okuma"),
});

export const BoxFusionPostSyncSchema = z.object({
  cps_content: z.string().min(1).describe("Content of the .cps file"),
  filename: z.string().describe("Filename of the .cps file"),
});

// ── BOX-MS6: Fusion 360 Cloud Extraction ────────────────────

export const BoxFusionConnectSchema = z.object({
  mode: z.enum(["auto", "live", "mock"]).default("auto")
    .describe("Connection mode: auto falls back to mock if Fusion isn't running"),
});

export const BoxFusionCrawlProjectSchema = z.object({
  project_index: z.number().int().min(0).default(0)
    .describe("Project index from box_fusion_list_projects"),
  max_depth: z.number().int().min(1).max(10).default(5),
  extract_metadata: z.boolean().default(true)
    .describe("Extract CAM metadata for each design (slower but richer data)"),
});

export const BoxFusionExtractCAMSchema = z.object({
  project_index: z.number().int().min(0).default(0),
  files: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1).describe("Files to extract CAM data from"),
});

export const BoxFusionExtractToolsSchema = z.object({
  cam_tools: z.array(z.object({
    tool: z.object({
      description: z.string(),
      type: z.string(),
      diameter_mm: z.number().positive(),
      flute_count: z.number().int().positive(),
    }),
    program: z.string(),
    speed_feed: z.object({
      rpm: z.number().positive(),
      feed_mm_min: z.number().positive(),
      stepdown_mm: z.number().optional(),
      stepover_mm: z.number().optional(),
    }).optional(),
  })).min(1),
  library_name: z.string().default("JM Die Shop Library"),
});

export const BoxFusionSetupDocSchema = z.object({
  extraction: z.any().describe("CAMExtractionResult from box_fusion_extract_cam"),
  render_text: z.boolean().default(true).describe("Include rendered text report"),
});

// ── BOX-MS7: Calculator Page — Program Upload + Tool Callout ─

export const BoxUploadAnalyzeSchema = z.object({
  content: z.string().min(1).describe("Raw CNC program content"),
  filename: z.string().optional().describe("Source filename for dialect detection"),
});

export const BoxToolCalloutsSchema = z.object({
  tools: z.array(z.any()).min(1).describe("AnalyzedTool[] from box_upload_analyze"),
  speed_feeds: z.array(z.any()).describe("SpeedFeedEntry[] from box_upload_analyze"),
  material: z.string().nullable().optional(),
  machine_type: z.string().nullable().optional(),
  unit_system: z.enum(["imperial", "metric"]).default("imperial"),
});

export const BoxProgramMemorySaveSchema = z.object({
  customer: z.string().min(1),
  part_number: z.string().min(1),
  filename: z.string().min(1),
  dialect: z.string().default("unknown"),
  assignments: z.array(z.object({
    station: z.number().int(),
    tool_id: z.string(),
    tool_description: z.string(),
    operation_type: z.string(),
    speed_rpm: z.number().nullable().optional(),
    feed_rate: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).min(1),
  // U-PPL-D2 — explicit/auto blueprint link
  linked_blueprint_path: z.string().min(1).optional().describe(
    "Optional explicit pointer to the linked blueprint. When omitted, the dispatcher attempts auto-resolution via ProgramPrintLinkIndexEngine.lookupPrintForProgram using the supplied filename."
  ),
  linked_blueprint_confidence: z.string().min(1).optional().describe(
    "Match confidence string from ProgramPrintLinkIndexEngine. Required when linked_blueprint_path is provided explicitly."
  ),
  linked_blueprint_page: z.number().int().positive().finite().optional().describe(
    "1-indexed PDF page for multi-page (Docustrata container) prints."
  ),
  // Auto-link controls
  program_path: z.string().min(1).optional().describe(
    "Absolute path to the source program file. When provided AND no explicit linked_blueprint_path is supplied, the dispatcher calls ProgramPrintLinkIndexEngine.lookupPrintForProgram(program_path) to auto-resolve a blueprint pointer."
  ),
  join_jsonl_path: z.string().optional().describe(
    "Optional override for the v6 join index source (delegates to BlueprintProgramJoinEngine.loadJoinIndex). Used only when program_path is set."
  ),
  input_program_paths: z.array(z.string()).optional().describe(
    "Optional program-side seed paths for ProgramPrintLinkIndexEngine.buildProgramSeedAugmentation. Used only when program_path is set."
  ),
  auto_link: z.boolean().optional().default(true).describe(
    "Set false to suppress auto-resolution entirely even when program_path is set (e.g. for a known-empty-archive test)."
  ),
});

export const BoxProgramMemoryRecallSchema = z.object({
  customer: z.string().min(1),
  part_number: z.string().min(1),
});

/**
 * U-PPL-D2 — explicit post-hoc / batch / clear-the-pointer surface.
 *
 *   - mode=`explicit`  → caller supplies linked_blueprint_path (+ confidence + optional page)
 *   - mode=`auto`      → caller supplies program_path, dispatcher resolves via the link index
 *   - mode=`clear`     → unconditionally strips any prior pointer
 *
 * Returns the updated ProgramRecord, or null when no record exists for the
 * customer/part (FAIL-LOUD on the dispatcher side, not silent create — use
 * `box_program_memory_save` to create+link in one call).
 */
export const BoxProgramMemoryLinkPrintSchema = z.object({
  customer: z.string().min(1),
  part_number: z.string().min(1),
  mode: z.enum(["explicit", "auto", "clear"]).default("auto").describe(
    "explicit = use the supplied linked_blueprint_path; auto = call ProgramPrintLinkIndexEngine.lookupPrintForProgram(program_path); clear = strip any prior pointer."
  ),
  // For mode=explicit
  linked_blueprint_path: z.string().min(1).optional(),
  linked_blueprint_confidence: z.string().min(1).optional(),
  linked_blueprint_page: z.number().int().positive().finite().optional(),
  // For mode=auto
  program_path: z.string().min(1).optional(),
  join_jsonl_path: z.string().optional(),
  input_program_paths: z.array(z.string()).optional(),
});

// ── BOX-MS8: Wire EDM Parsing + Mill Pattern Mining ─────────

export const BoxParseWEDMSchema = z.object({
  content: z.string().min(1).describe("Raw wire EDM G-code program content"),
  filename: z.string().optional().describe("Source filename (e.g., PUNCH.NC)"),
});

export const BoxMineMillPatternsSchema = z.object({
  programs: z.array(z.object({
    filename: z.string(),
    controller: z.enum(["haas", "hurco", "rokuroku"]),
    parsed: z.any().describe("Parsed program object from the appropriate parser"),
  })).min(1).describe("Array of parsed mill programs to mine"),
});

// ── Schema map for action routing ────────────────────────────

export const BOX_ACTION_SCHEMAS: Record<string, z.ZodType> = {
  box_validate_program: BoxValidateProgramSchema,
  box_extract_operations: BoxExtractOperationsSchema,
  box_controller_capability: BoxControllerCapabilitySchema,
  box_controller_safety_codes: BoxControllerSafetyCodesSchema,
  box_calibrate_from_shop: BoxCalibrateFromShopSchema,
  box_full_program_audit: BoxFullProgramAuditSchema,
  box_optimize_program: BoxOptimizeProgramSchema,
  box_safety_check: BoxSafetyCheckSchema,
  box_batch_optimize: BoxBatchOptimizeSchema,
  box_resolve_material: BoxResolveMaterialSchema,
  box_resolve_tools: BoxResolveToolsSchema,
  box_controller_lookup_gcode: BoxControllerLookupSchema,
  box_controller_lookup_mcode: BoxControllerLookupSchema,
  box_controller_compare_dialects: BoxControllerCompareSchema,
  box_post_trainer: BoxPostTrainerSchema,
  box_fusion_post_sync: BoxFusionPostSyncSchema,
  box_fusion_connect: BoxFusionConnectSchema,
  box_fusion_list_projects: z.object({}),
  box_fusion_crawl_project: BoxFusionCrawlProjectSchema,
  box_fusion_extract_cam: BoxFusionExtractCAMSchema,
  box_fusion_extract_tools: BoxFusionExtractToolsSchema,
  box_fusion_setup_doc: BoxFusionSetupDocSchema,
  box_upload_analyze: BoxUploadAnalyzeSchema,
  box_tool_callouts: BoxToolCalloutsSchema,
  box_program_memory_save: BoxProgramMemorySaveSchema,
  box_program_memory_recall: BoxProgramMemoryRecallSchema,
  box_program_memory_defaults: z.object({}),
  box_program_memory_stats: z.object({}),
  box_program_memory_link_print: BoxProgramMemoryLinkPrintSchema,
  box_parse_wedm: BoxParseWEDMSchema,
  box_mine_mill_patterns: BoxMineMillPatternsSchema,
};
