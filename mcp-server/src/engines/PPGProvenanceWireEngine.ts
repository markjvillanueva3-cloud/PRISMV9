// WIRE-EXEMPT: Middleware engine called by PPG engines internally, not exposed via dispatcher
/**
 * PPGProvenanceWireEngine — U-PPG-SFC-04
 * =======================================
 *
 * Wire layer that attaches provenance citations to every PPG (Post Processor Generator) output.
 * Every emitted G-code program gets full provenance showing:
 *   - dialect_source: where the controller dialect definition came from
 *   - post_template: which post processor template was used
 *   - run_log_evidence: historical program matches if RAG-augmented
 *   - tribal_tips: shop floor knowledge applied
 *   - citations: full provenance citations array
 *
 * Design invariants:
 *   1. NEVER RETURN WITHOUT PROVENANCE. Even template-only outputs get citations.
 *   2. CITE THE ACTUAL SOURCE. If dialect came from okuma-lb45.cps, cite that exactly.
 *   3. HASH FOR AUDIT. Every provenance record gets SHA-256 audit hash.
 *   4. TRACE REASONING. Brief explanation of how sources combined.
 *
 * @module engines/PPGProvenanceWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-04
 */

import { createHash } from "node:crypto";
import type { Citation } from "../schemas/citationSchema.js";
import {
  type PPGProvenance,
  type PPGProvenanceWireInput,
  type PPGProvenanceWireOutput,
  type DialectSource,
  type PostTemplateSource,
  type RunLogEvidence,
  type TribalTipReference,
  type PPGSourceType,
  type ControllerDialect,
  PPGProvenanceSchema,
  ControllerDialectSchema,
} from "../schemas/ppgProvenanceSchema.js";

// ─── ID Generation ──────────────────────────────────────────────────────

let counter = 0;

function generateEmissionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  counter = (counter + 1) % 1000000;
  return `ppg-${ts}-${rand}-${counter.toString(36).padStart(4, "0")}`;
}

// ─── Audit Hash ─────────────────────────────────────────────────────────

function computeAuditHash(prov: Partial<PPGProvenance>): string {
  const data = JSON.stringify({
    emission_id: prov.emission_id,
    timestamp: prov.timestamp,
    engine: prov.engine,
    ppg_source: prov.ppg_source,
    dialect_source: prov.dialect_source,
    post_template: prov.post_template,
    citations: prov.citations?.map(c => ({
      source_type: c.source_type,
      source_id: c.source_id,
      confidence: c.confidence,
    })),
  });
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

// ─── Controller Dialect Normalization ───────────────────────────────────

const DIALECT_ALIASES: Record<string, ControllerDialect> = {
  "fanuc": "fanuc",
  "fanuc_31i": "fanuc",
  "fanuc_0i": "fanuc",
  "okuma": "okuma",
  "osp": "okuma",
  "osp-p": "okuma",
  "siemens": "siemens",
  "sinumerik": "siemens",
  "840d": "siemens",
  "haas": "haas",
  "heidenhain": "heidenhain",
  "itnc": "heidenhain",
  "tnc": "heidenhain",
  "mazak": "mazak",
  "mazatrol": "mazak",
  "hurco": "hurco",
  "winmax": "hurco",
  "fadal": "fadal",
  "brother": "brother",
  "doosan": "doosan",
  "dmg_mori": "dmg_mori",
  "dmg": "dmg_mori",
  "mori": "dmg_mori",
  "makino": "makino",
  "mitsubishi": "mitsubishi",
  "meldas": "mitsubishi",
  "generic": "generic",
};

function normalizeController(raw: string | undefined): ControllerDialect {
  if (!raw) return "generic";
  const key = raw.toLowerCase().replace(/[\s_-]+/g, "_");

  // Direct match
  const parsed = ControllerDialectSchema.safeParse(key);
  if (parsed.success) return parsed.data;

  // Alias match
  for (const [alias, canonical] of Object.entries(DIALECT_ALIASES)) {
    if (key.includes(alias)) return canonical;
  }

  return "generic";
}

// ─── Dialect Source Builder ─────────────────────────────────────────────

function buildDialectSource(input: PPGProvenanceWireInput): {
  source: DialectSource;
  citation: Citation;
} {
  const controller = normalizeController(input.controller);

  const source: DialectSource = {
    controller,
    version: input.controller_version ?? null,
    dialect_family: inferDialectFamily(controller, input.controller_version),
    ref: input.post_template_ref ?? `post-processors/${controller}-default.cps`,
    machine_id: input.machine_id ?? null,
  };

  const citation: Citation = {
    source_type: "manual",
    source_id: `dialect-${controller}`,
    corpus: "post-processors",
    engine: input.engine,
    excerpt: `Controller dialect: ${controller}${input.controller_version ? ` (${input.controller_version})` : ""}`,
    confidence: 1.0,
    retrieval_score: null,
    metadata: { controller, version: input.controller_version },
  };

  return { source, citation };
}

function inferDialectFamily(controller: ControllerDialect, version: string | undefined): string | null {
  if (!version) return null;

  const familyMap: Record<string, string[]> = {
    "okuma": ["OSP-P200", "OSP-P300", "OSP-P500"],
    "siemens": ["Sinumerik 828D", "Sinumerik 840D", "Sinumerik ONE"],
    "fanuc": ["0i-MF", "0i-TF", "30i", "31i-A", "31i-B"],
    "heidenhain": ["iTNC 530", "TNC 640", "TNC7"],
    "mazak": ["Mazatrol Matrix", "Mazatrol SmoothX", "Mazatrol SmoothG"],
  };

  const families = familyMap[controller];
  if (!families) return null;

  const vUpper = version.toUpperCase();
  for (const family of families) {
    if (vUpper.includes(family.toUpperCase().replace(/[^A-Z0-9]/g, ""))) {
      return family;
    }
  }

  return null;
}

// ─── Post Template Source Builder ───────────────────────────────────────

function buildPostTemplateSource(input: PPGProvenanceWireInput): {
  source: PostTemplateSource;
  citation: Citation;
} {
  const templateId = input.post_template_id ?? `${normalizeController(input.controller)}-default`;

  const source: PostTemplateSource = {
    template_id: templateId,
    template_name: input.post_template_name ?? null,
    version: null,
    ref: input.post_template_ref ?? `post-processors/${templateId}.cps`,
    customizations: input.customizations ?? [],
    tribal_tip_ids: input.tribal_tips?.map(t => t.tip_id) ?? [],
  };

  const citation: Citation = {
    source_type: "manual",
    source_id: templateId,
    corpus: "post-processors",
    engine: input.engine,
    excerpt: `Post template: ${input.post_template_name ?? templateId}`,
    confidence: 1.0,
    retrieval_score: null,
    metadata: {
      template_id: templateId,
      customizations: input.customizations?.length ?? 0,
    },
  };

  return { source, citation };
}

// ─── Run Log Evidence Builder ───────────────────────────────────────────

function buildRunLogEvidence(input: PPGProvenanceWireInput): {
  evidence: RunLogEvidence[];
  citations: Citation[];
} {
  if (!input.rag_hits || input.rag_hits.length === 0) {
    return { evidence: [], citations: [] };
  }

  const evidence: RunLogEvidence[] = [];
  const citations: Citation[] = [];

  for (const hit of input.rag_hits.slice(0, 5)) {
    const outcome = hit.outcome as RunLogEvidence["outcome"] | undefined;

    evidence.push({
      program_id: hit.program_id,
      similarity: hit.similarity,
      machine_match: hit.machine_match ?? false,
      controller_match: hit.controller_match ?? false,
      material_match: hit.material_match ?? false,
      outcome: outcome ?? "unknown",
    });

    citations.push({
      source_type: "program",
      source_id: hit.program_id,
      corpus: "jm_die_programs",
      engine: input.engine,
      excerpt: null,
      confidence: hit.similarity,
      retrieval_score: hit.similarity,
      metadata: {
        machine_match: hit.machine_match,
        controller_match: hit.controller_match,
        material_match: hit.material_match,
        outcome: hit.outcome,
      },
    });
  }

  return { evidence, citations };
}

// ─── Tribal Tip Builder ─────────────────────────────────────────────────

function buildTribalTips(input: PPGProvenanceWireInput): {
  tips: TribalTipReference[];
  citations: Citation[];
} {
  if (!input.tribal_tips || input.tribal_tips.length === 0) {
    return { tips: [], citations: [] };
  }

  const tips: TribalTipReference[] = [];
  const citations: Citation[] = [];

  for (const tip of input.tribal_tips) {
    tips.push({
      tip_id: tip.tip_id,
      category: tip.category ?? "general",
      applied_to: tip.applied_to ?? null,
      confidence: tip.confidence ?? 0.8,
    });

    citations.push({
      source_type: "tribal_tip",
      source_id: tip.tip_id,
      corpus: "tribal-knowledge",
      engine: input.engine,
      excerpt: `Tribal tip: ${tip.category ?? "general"}`,
      confidence: tip.confidence ?? 0.8,
      retrieval_score: null,
      metadata: { category: tip.category, applied_to: tip.applied_to },
    });
  }

  return { tips, citations };
}

// ─── PPG Source Type Determination ──────────────────────────────────────

function determinePPGSource(input: PPGProvenanceWireInput): PPGSourceType {
  const hasAdapter = !!input.adapter_id;
  const hasRAG = input.rag_hits && input.rag_hits.length > 0;
  const hasTribal = input.tribal_tips && input.tribal_tips.length > 0;
  const hasCustomizations = input.customizations && input.customizations.length > 0;

  if (hasAdapter && (hasRAG || hasTribal)) return "hybrid";
  if (hasAdapter) return "adapter";
  if (hasRAG) return "rag";
  if (hasCustomizations) return "custom";
  return "template";
}

// ─── Reasoning Trace Builder ────────────────────────────────────────────

function buildReasoningTrace(
  input: PPGProvenanceWireInput,
  ppgSource: PPGSourceType,
): string {
  const parts: string[] = [];

  const controller = normalizeController(input.controller);
  parts.push(`Controller dialect: ${controller}${input.controller_version ? ` (${input.controller_version})` : ""}`);

  switch (ppgSource) {
    case "template":
      parts.push("Pure post processor template applied");
      break;
    case "rag":
      parts.push(`RAG-augmented with ${input.rag_hits?.length ?? 0} historical program matches`);
      break;
    case "adapter":
      parts.push(`LoRA adapter '${input.adapter_id}' inference applied`);
      break;
    case "hybrid":
      parts.push(`Hybrid: adapter + ${input.rag_hits?.length ?? 0} RAG matches + ${input.tribal_tips?.length ?? 0} tribal tips`);
      break;
    case "custom":
      parts.push(`Custom post processor with ${input.customizations?.length ?? 0} customizations`);
      break;
  }

  if (input.tribal_tips && input.tribal_tips.length > 0) {
    parts.push(`${input.tribal_tips.length} tribal tips applied`);
  }

  if (input.machine_id) {
    parts.push(`Machine-specific: ${input.machine_id}`);
  }

  return parts.join("; ");
}

// ─── G-code Analysis ────────────────────────────────────────────────────

function analyzeGcode(gcode: string | undefined): {
  block_count: number;
  tool_changes: number;
  has_subprograms: boolean;
  estimated_cycle_sec: number | null;
} {
  if (!gcode) {
    return { block_count: 0, tool_changes: 0, has_subprograms: false, estimated_cycle_sec: null };
  }

  const lines = gcode.split(/\r?\n/).filter(l => l.trim().length > 0);
  const block_count = lines.length;

  // Count unique tool codes
  const toolPattern = /\bT\d+/gi;
  const toolMatches = gcode.match(toolPattern);
  const toolSet = new Set(toolMatches?.map(t => t.toUpperCase()) ?? []);
  const tool_changes = toolSet.size;

  // Detect subprograms (M98/M99 calls, CALL statements, G65/G66 macro calls)
  // Note: O#### at line start is program number, not subprogram - check for M98 P#### instead
  const subprogramPattern = /\bM9[89]\b|CALL\s|G65\s|G66\s|M98\s*P/i;
  const has_subprograms = subprogramPattern.test(gcode);

  // Rough cycle time estimate based on motion blocks
  // ~0.5 sec per motion block (very rough heuristic)
  const motionPattern = /\b[GXYZABC]\s*-?\d+\.?\d*/gi;
  const motionMatches = gcode.match(motionPattern);
  const estimated_cycle_sec = motionMatches ? Math.round(motionMatches.length * 0.3) : null;

  return { block_count, tool_changes, has_subprograms, estimated_cycle_sec };
}

// ─── Main Engine Class ──────────────────────────────────────────────────

export class PPGProvenanceWireEngine {
  /**
   * Attach provenance to a PPG output.
   * Every G-code emission gets full provenance with citations.
   *
   * @param input - PPG emission with context
   * @returns Provenance record with audit hash
   */
  static cite(input: PPGProvenanceWireInput): PPGProvenanceWireOutput {
    const now = new Date().toISOString();
    const emissionId = generateEmissionId();

    // Build sources
    const { source: dialectSource, citation: dialectCitation } = buildDialectSource(input);
    const { source: postTemplate, citation: postCitation } = buildPostTemplateSource(input);
    const { evidence: ragEvidence, citations: ragCitations } = buildRunLogEvidence(input);
    const { tips: tribalTips, citations: tribalCitations } = buildTribalTips(input);

    // Analyze G-code if provided
    const gcodeAnalysis = analyzeGcode(input.gcode);

    // Determine primary source
    const ppgSource = determinePPGSource(input);

    // Collect all citations
    const citations: Citation[] = [dialectCitation, postCitation, ...ragCitations, ...tribalCitations];

    // Build reasoning trace
    const reasoningTrace = buildReasoningTrace(input, ppgSource);

    // Build provenance
    const provenance: PPGProvenance = {
      emission_id: emissionId,
      timestamp: now,
      engine: input.engine,
      dialect_source: dialectSource,
      post_template: postTemplate,
      ppg_source: ppgSource,
      output_metrics: {
        block_count: input.block_count ?? gcodeAnalysis.block_count,
        tool_changes: input.tool_changes ?? gcodeAnalysis.tool_changes,
        estimated_cycle_sec: input.estimated_cycle_sec ?? gcodeAnalysis.estimated_cycle_sec,
        has_subprograms: input.has_subprograms ?? gcodeAnalysis.has_subprograms,
      },
      run_log_evidence: ragEvidence,
      tribal_tips: tribalTips,
      citations,
      reasoning_trace: reasoningTrace,
      audit_hash: null,
      inline_comment_format: input.inline_comments ?? "minimal",
    };

    // Compute audit hash
    provenance.audit_hash = computeAuditHash(provenance);

    // Validate
    const validated = PPGProvenanceSchema.safeParse(provenance);
    if (!validated.success) {
      return {
        ok: false,
        provenance,
        warning: `Schema validation failed: ${validated.error.message}`,
      };
    }

    // Generate G-code with inline provenance comments if requested
    let gcodeWithProvenance: string | undefined;
    if (input.gcode && input.inline_comments !== "none") {
      gcodeWithProvenance = addInlineProvenance(input.gcode, validated.data, input.inline_comments ?? "minimal");
    }

    return {
      ok: true,
      provenance: validated.data,
      gcode_with_provenance: gcodeWithProvenance,
    };
  }

  /**
   * Validate that a PPG provenance record is complete.
   * Used by ppg-provenance-guard hook.
   *
   * @param provenance - Provenance to validate
   * @returns Validation result
   */
  static validate(provenance: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provenance || typeof provenance !== "object") {
      return { valid: false, errors: ["Provenance is null or not an object"] };
    }

    const prov = provenance as Partial<PPGProvenance>;

    // Required fields
    if (!prov.emission_id) errors.push("Missing emission_id");
    if (!prov.timestamp) errors.push("Missing timestamp");
    if (!prov.engine) errors.push("Missing engine");
    if (!prov.ppg_source) errors.push("Missing ppg_source");
    if (!prov.dialect_source) errors.push("Missing dialect_source");
    if (!prov.post_template) errors.push("Missing post_template");

    // Validate ppg_source value
    const validSources: PPGSourceType[] = ["template", "rag", "adapter", "hybrid", "custom"];
    if (prov.ppg_source && !validSources.includes(prov.ppg_source)) {
      errors.push(`Invalid ppg_source: ${prov.ppg_source}`);
    }

    // Must have at least one citation
    if (!prov.citations || prov.citations.length === 0) {
      errors.push("No citations provided - G-code source unknown");
    }

    // Audit hash verification
    if (prov.audit_hash) {
      const expected = computeAuditHash(prov);
      if (prov.audit_hash !== expected) {
        errors.push("Audit hash mismatch - provenance may have been tampered");
      }
    } else {
      errors.push("Missing audit_hash - tamper detection disabled");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Summarize provenance for human-readable output.
   *
   * @param provenance - Provenance to summarize
   * @returns Summary string
   */
  static summarize(provenance: PPGProvenance): string {
    const parts: string[] = [];

    parts.push(`PPG Emission ${provenance.emission_id}`);
    parts.push(`Engine: ${provenance.engine}`);
    parts.push(`Source: ${provenance.ppg_source.toUpperCase()}`);

    if (provenance.dialect_source) {
      const ds = provenance.dialect_source;
      parts.push(`Controller: ${ds.controller}${ds.version ? ` (${ds.version})` : ""}`);
      if (ds.machine_id) parts.push(`  Machine: ${ds.machine_id}`);
    }

    if (provenance.post_template) {
      const pt = provenance.post_template;
      parts.push(`Template: ${pt.template_name ?? pt.template_id}`);
      if (pt.customizations.length > 0) {
        parts.push(`  Customizations: ${pt.customizations.join(", ")}`);
      }
    }

    if (provenance.output_metrics) {
      const om = provenance.output_metrics;
      parts.push(`Output: ${om.block_count} blocks, ${om.tool_changes} tools`);
      if (om.estimated_cycle_sec) {
        parts.push(`  Est. cycle: ${formatDuration(om.estimated_cycle_sec)}`);
      }
    }

    if (provenance.run_log_evidence.length > 0) {
      parts.push(`RAG matches: ${provenance.run_log_evidence.length}`);
      for (const ev of provenance.run_log_evidence.slice(0, 3)) {
        parts.push(`  - ${ev.program_id} (${(ev.similarity * 100).toFixed(0)}%) [${ev.outcome}]`);
      }
    }

    if (provenance.tribal_tips.length > 0) {
      parts.push(`Tribal tips: ${provenance.tribal_tips.length}`);
      for (const tip of provenance.tribal_tips.slice(0, 3)) {
        parts.push(`  - ${tip.tip_id} (${tip.category})`);
      }
    }

    parts.push(`Citations: ${provenance.citations.length}`);
    if (provenance.reasoning_trace) {
      parts.push(`Reasoning: ${provenance.reasoning_trace}`);
    }

    return parts.join("\n");
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function addInlineProvenance(
  gcode: string,
  prov: PPGProvenance,
  level: "minimal" | "full",
): string {
  const lines = gcode.split(/\r?\n/);
  const header: string[] = [];

  // Add provenance header
  header.push(`( PRISM PROVENANCE - ${prov.emission_id} )`);
  header.push(`( Generated: ${prov.timestamp} )`);
  header.push(`( Engine: ${prov.engine} )`);
  header.push(`( Source: ${prov.ppg_source.toUpperCase()} )`);
  header.push(`( Controller: ${prov.dialect_source.controller} )`);

  if (level === "full") {
    header.push(`( Template: ${prov.post_template.template_id} )`);
    if (prov.run_log_evidence.length > 0) {
      header.push(`( RAG matches: ${prov.run_log_evidence.length} )`);
    }
    if (prov.tribal_tips.length > 0) {
      header.push(`( Tribal tips: ${prov.tribal_tips.length} )`);
    }
    header.push(`( Audit hash: ${prov.audit_hash} )`);
  }

  header.push(`( --- )`);

  // Find insertion point (after any existing header comments)
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("(") || line.startsWith("%") || line.startsWith("O") || line === "") {
      insertIndex = i + 1;
    } else {
      break;
    }
  }

  // Insert provenance header
  lines.splice(insertIndex, 0, ...header);

  return lines.join("\n");
}

export const ppgProvenanceWireEngine = new PPGProvenanceWireEngine();
