/**
 * PPG Provenance Schema — U-PPG-SFC-04
 * =====================================
 *
 * Domain-specific provenance schema for Post Processor Generator outputs.
 * Every PPG emission must carry provenance showing:
 *   - dialect_source: where the controller dialect definition came from
 *   - post_template: which post processor template was used
 *   - run_log_evidence: historical program matches if RAG-augmented
 *   - tribal_tips: shop floor knowledge applied
 *   - citations: full provenance citations array
 *
 * Enables ITAR/AS9100 audit trails and operator trust in generated G-code.
 *
 * @module schemas/ppgProvenanceSchema
 * @milestone PSAU-PPG-SFC U-PPG-SFC-04
 */

import { z } from "zod";
import { CitationSchema, type Citation } from "./citationSchema.js";

// ─── Controller Dialect Source ──────────────────────────────────────────

export const ControllerDialectSchema = z.enum([
  "fanuc",
  "okuma",
  "siemens",
  "haas",
  "heidenhain",
  "mazak",
  "hurco",
  "fadal",
  "brother",
  "doosan",
  "dmg_mori",
  "makino",
  "mitsubishi",
  "generic",
]).describe("CNC controller dialect");
export type ControllerDialect = z.infer<typeof ControllerDialectSchema>;

export const DialectSourceSchema = z.object({
  controller: ControllerDialectSchema.describe("Controller manufacturer/type"),
  version: z.string().nullable().describe("Controller version if known (e.g., 'Fanuc 31i-B')"),
  dialect_family: z.string().nullable().describe("Dialect family (e.g., 'OSP-P300', 'Sinumerik 840D')"),
  ref: z.string().describe("Source reference (e.g., 'post-processors/okuma-lb45.cps')"),
  machine_id: z.string().nullable().describe("Specific machine identifier if customized"),
}).describe("Controller dialect source information");
export type DialectSource = z.infer<typeof DialectSourceSchema>;

// ─── Post Template Source ───────────────────────────────────────────────

export const PostTemplateSourceSchema = z.object({
  template_id: z.string().describe("Post processor template ID"),
  template_name: z.string().nullable().describe("Human-readable template name"),
  version: z.string().nullable().describe("Template version"),
  ref: z.string().describe("Source reference (e.g., 'post-processors/generic-mill.cps')"),
  customizations: z.array(z.string()).describe("List of customizations applied"),
  tribal_tip_ids: z.array(z.string()).describe("Tribal tip IDs that influenced output"),
}).describe("Post processor template source");
export type PostTemplateSource = z.infer<typeof PostTemplateSourceSchema>;

// ─── Run Log Evidence ───────────────────────────────────────────────────

export const RunLogEvidenceSchema = z.object({
  program_id: z.string().describe("Historical program path"),
  similarity: z.number().min(0).max(1).describe("Semantic similarity score"),
  machine_match: z.boolean().describe("True if machine type matched"),
  controller_match: z.boolean().describe("True if controller matched"),
  material_match: z.boolean().describe("True if material matched"),
  outcome: z.enum(["success", "alarm", "scrap", "adjusted", "unknown"]).describe("Historical outcome"),
}).describe("Run log evidence from historical programs");
export type RunLogEvidence = z.infer<typeof RunLogEvidenceSchema>;

// ─── Tribal Tip Reference ───────────────────────────────────────────────

export const TribalTipReferenceSchema = z.object({
  tip_id: z.string().describe("Tribal tip identifier"),
  category: z.string().describe("Tip category (e.g., 'tool_change', 'coolant', 'modal')"),
  applied_to: z.string().nullable().describe("Which G-code section this tip affected"),
  confidence: z.number().min(0).max(1).describe("Confidence that tip applies"),
}).describe("Tribal knowledge tip reference");
export type TribalTipReference = z.infer<typeof TribalTipReferenceSchema>;

// ─── PPG Source Type ────────────────────────────────────────────────────

export const PPGSourceTypeSchema = z.enum([
  "template",     // Pure post processor template
  "rag",          // RAG-augmented (historical programs, tribal tips)
  "adapter",      // LoRA adapter inference
  "hybrid",       // Multiple sources combined
  "custom",       // Fully custom post processor
]).describe("Primary source type for PPG output");
export type PPGSourceType = z.infer<typeof PPGSourceTypeSchema>;

// ─── G-code Block Provenance ────────────────────────────────────────────

export const GCodeBlockProvenanceSchema = z.object({
  block_range: z.object({
    start_line: z.number().int().min(0).describe("Starting line number"),
    end_line: z.number().int().min(0).describe("Ending line number"),
  }).describe("Line range this provenance covers"),
  section_type: z.enum([
    "header",
    "tool_change",
    "spindle",
    "coolant",
    "motion",
    "cycle",
    "subprogram",
    "footer",
    "comment",
    "other",
  ]).describe("Type of G-code section"),
  source_rule: z.string().nullable().describe("Post processor rule that generated this block"),
  tribal_tip_applied: z.string().nullable().describe("Tribal tip ID if applied to this block"),
}).describe("Provenance for a specific G-code block range");
export type GCodeBlockProvenance = z.infer<typeof GCodeBlockProvenanceSchema>;

// ─── PPG Provenance ─────────────────────────────────────────────────────

export const PPGProvenanceSchema = z.object({
  emission_id: z.string().describe("Unique emission ID"),
  timestamp: z.string().describe("ISO8601 timestamp"),
  engine: z.string().describe("PPG engine that produced output"),

  // Dialect source
  dialect_source: DialectSourceSchema.describe("Controller dialect source"),

  // Post template
  post_template: PostTemplateSourceSchema.describe("Post processor template source"),

  // Primary source type
  ppg_source: PPGSourceTypeSchema.describe("Primary source type"),

  // Output metrics
  output_metrics: z.object({
    block_count: z.number().int().min(0).describe("Total G-code lines"),
    tool_changes: z.number().int().min(0).describe("Number of tool changes"),
    estimated_cycle_sec: z.number().nullable().describe("Estimated cycle time in seconds"),
    has_subprograms: z.boolean().describe("Whether output uses subprograms"),
  }).describe("Output metrics"),

  // RAG evidence
  run_log_evidence: z.array(RunLogEvidenceSchema).describe("Run log evidence (top matches)"),

  // Tribal knowledge
  tribal_tips: z.array(TribalTipReferenceSchema).describe("Tribal tips applied"),

  // Block-level provenance (optional, for detailed audit)
  block_provenance: z.array(GCodeBlockProvenanceSchema).optional().describe("Per-block provenance"),

  // Full provenance
  citations: z.array(CitationSchema).describe("All provenance citations"),
  reasoning_trace: z.string().nullable().describe("Brief explanation of how sources combined"),
  audit_hash: z.string().nullable().describe("SHA-256 hash for audit trail"),

  // Inline comment format
  inline_comment_format: z.enum(["none", "minimal", "full"]).describe("Level of inline provenance comments in G-code"),
}).describe("Full PPG provenance record");
export type PPGProvenance = z.infer<typeof PPGProvenanceSchema>;

// ─── Wire Input ─────────────────────────────────────────────────────────

export const PPGProvenanceWireInputSchema = z.object({
  engine: z.string().describe("PPG engine name"),
  action: z.string().optional().describe("Dispatcher action"),

  // Context
  controller: z.string().optional().describe("Target controller (normalized to dialect)"),
  controller_version: z.string().optional().describe("Controller version"),
  machine_id: z.string().optional().describe("Machine identifier"),
  machine_class: z.string().optional().describe("Machine class (mill, lathe, etc.)"),
  material: z.string().optional().describe("Material being cut"),
  operation: z.string().optional().describe("Operation type"),

  // Post processor
  post_template_id: z.string().optional().describe("Post processor template ID"),
  post_template_name: z.string().optional().describe("Post processor template name"),
  post_template_ref: z.string().optional().describe("Post processor file reference"),
  customizations: z.array(z.string()).optional().describe("Applied customizations"),

  // Generated output
  gcode: z.string().optional().describe("Generated G-code string"),
  block_count: z.number().optional().describe("Total G-code lines"),
  tool_changes: z.number().optional().describe("Number of tool changes"),
  estimated_cycle_sec: z.number().optional().describe("Estimated cycle time"),
  has_subprograms: z.boolean().optional().describe("Whether output uses subprograms"),

  // RAG evidence
  rag_hits: z.array(z.object({
    program_id: z.string(),
    similarity: z.number(),
    machine_match: z.boolean().optional(),
    controller_match: z.boolean().optional(),
    material_match: z.boolean().optional(),
    outcome: z.string().optional(),
  })).optional().describe("RAG retrieval hits"),

  // Tribal tips
  tribal_tips: z.array(z.object({
    tip_id: z.string(),
    category: z.string().optional(),
    applied_to: z.string().optional(),
    confidence: z.number().optional(),
  })).optional().describe("Applied tribal tips"),

  // Adapter info
  adapter_id: z.string().optional().describe("LoRA adapter ID if used"),
  adapter_confidence: z.number().min(0).max(1).optional().describe("Adapter confidence"),

  // Inline comment preference
  inline_comments: z.enum(["none", "minimal", "full"]).optional().describe("Inline comment level"),

  // Lineage
  lineage_id: z.string().optional().describe("Upstream lineage ID"),
  agent_id: z.string().optional().describe("Agent ID for attribution"),
}).describe("Input to PPG provenance wire");
export type PPGProvenanceWireInput = z.infer<typeof PPGProvenanceWireInputSchema>;

// ─── Wire Output ────────────────────────────────────────────────────────

export const PPGProvenanceWireOutputSchema = z.object({
  ok: z.boolean().describe("Whether provenance was generated successfully"),
  provenance: PPGProvenanceSchema.describe("Generated provenance record"),
  gcode_with_provenance: z.string().optional().describe("G-code with inline provenance comments"),
  warning: z.string().optional().describe("Warning message if any"),
}).describe("Output from PPG provenance wire");
export type PPGProvenanceWireOutput = z.infer<typeof PPGProvenanceWireOutputSchema>;
