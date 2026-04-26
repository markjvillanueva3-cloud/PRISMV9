// WIRE-EXEMPT: Middleware engine called by PPG engines internally, not exposed via dispatcher
/**
 * PPGRAGDialectMatchEngine — U-PPG-SFC-08
 * =========================================
 *
 * Index dialect catalog + 22k JM Die programs by controller fingerprint. On new
 * (controller, machine, material) request, serve nearest-prior post template.
 * Wires tribalRAGEngine for dialect-folklore tips (e.g., 'Okuma OSP requires
 * explicit M9 before tool change on this machine vintage').
 *
 * Design invariants:
 *   1. FAST. <300ms latency target (RAG + dialect lookup combined).
 *   2. DIALECT-AWARE. Controller fingerprint drives primary matching.
 *   3. FOLKLORE-ENRICHED. Every match includes applicable tribal tips.
 *   4. CITABLE. All retrievals attach to provenance with source_id + score.
 *   5. GRACEFUL. Empty index or no matches returns empty results, never errors.
 *
 * Integration points:
 *   - Input: Controller, machine, material context
 *   - Calls: JMDieProgramRAGEngine.findSimilarPrograms()
 *   - Calls: TribalRAGEngine.query() for dialect folklore
 *   - Calls: ControllerDialectEngine.getDialect() for dialect rules
 *   - Output: Nearest-prior post templates + tribal tips + citations
 *   - Consumer: PostProcessorEngine uses priors for baseline selection
 *
 * @module engines/PPGRAGDialectMatchEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-08
 */

import { z } from "zod";
import { JMDieProgramRAGEngine } from "./JMDieProgramRAGEngine.js";
import { TribalRAGEngine } from "./TribalRAGEngine.js";
import { controllerDialectEngine, type ControllerFamily } from "./ControllerDialectEngine.js";
import { CitationSchema, type Citation } from "../schemas/citationSchema.js";

// ─── Controller Normalization ───────────────────────────────────────────

const CONTROLLER_ALIASES: Record<string, string> = {
  fanuc: "fanuc",
  ge_fanuc: "fanuc",
  "fanuc_0i": "fanuc",
  "fanuc_16i": "fanuc",
  "fanuc_18i": "fanuc",
  "fanuc_30i": "fanuc",
  "fanuc_31i": "fanuc",
  okuma: "okuma",
  osp: "okuma",
  "osp_p300": "okuma",
  "osp_p500": "okuma",
  siemens: "siemens",
  sinumerik: "siemens",
  "840d": "siemens",
  "828d": "siemens",
  haas: "haas",
  haas_ngc: "haas",
  heidenhain: "heidenhain",
  tnc: "heidenhain",
  tnc640: "heidenhain",
  mazak: "mazak",
  mazatrol: "mazak",
  smooth: "mazak",
  hurco: "hurco",
  winmax: "hurco",
  fadal: "fadal",
  brother: "brother",
  doosan: "doosan",
  dmg_mori: "dmg_mori",
  dmg: "dmg_mori",
  mori: "dmg_mori",
  mitsubishi: "mitsubishi",
  m80: "mitsubishi",
  fagor: "fagor",
  citizen: "citizen",
  star: "star",
};

function normalizeController(controller: string): string {
  const lower = controller.toLowerCase().replace(/[-\s]/g, "_");
  return CONTROLLER_ALIASES[lower] ?? lower;
}

// ─── Input Schema ───────────────────────────────────────────────────────

export const PPGRAGDialectMatchInputSchema = z.object({
  controller: z.string().min(1).describe("Controller family or variant (e.g., 'Fanuc 31i', 'Okuma OSP-P300', 'Siemens 840D')"),
  machine_type: z.enum(["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "mill_turn", "swiss", "5axis", "unknown"]).optional()
    .describe("Machine type for filtering"),
  machine_id: z.string().optional().describe("Specific machine ID (e.g., 'Okuma-LB45', 'DMG-DMU50')"),
  material: z.string().optional().describe("Material name or grade (e.g., 'D2', '4140', 'Aluminum 6061')"),
  operation: z.string().optional().describe("Operation type (e.g., 'rough', 'finish', 'drill', 'thread')"),
  customer: z.string().optional().describe("Customer name filter (e.g., 'ALCOA')"),
  top_k_programs: z.number().int().min(1).max(10).optional().default(5).describe("Number of program priors to retrieve"),
  top_k_tips: z.number().int().min(1).max(10).optional().default(5).describe("Number of tribal tips to retrieve"),
  min_score: z.number().min(0).max(1).optional().default(0.2).describe("Minimum similarity threshold"),
}).describe("PPG RAG dialect match query input");
export type PPGRAGDialectMatchInput = z.infer<typeof PPGRAGDialectMatchInputSchema>;

// ─── Output Schema ──────────────────────────────────────────────────────

export const ProgramPriorSchema = z.object({
  program_id: z.string().describe("JM Die program path"),
  program_number: z.string().nullable().describe("G-code program number if extracted"),
  similarity: z.number().min(0).max(1).describe("Normalized similarity score"),
  raw_score: z.number().describe("Raw BM25 score"),
  controller_match: z.boolean().describe("True if controller family matched"),
  machine_match: z.boolean().describe("True if machine type matched"),
  material_match: z.boolean().describe("True if material matched"),
  customer: z.string().describe("Customer name from program"),
  operation_types: z.array(z.string()).describe("Operations in this program"),
  tool_count: z.number().int().describe("Number of tools used"),
  excerpt: z.string().nullable().describe("Relevant code excerpt"),
}).describe("Single program prior");
export type ProgramPrior = z.infer<typeof ProgramPriorSchema>;

export const DialectTipSchema = z.object({
  tip_id: z.string().describe("Tribal tip ID"),
  title: z.string().describe("Tip title"),
  body: z.string().describe("Tip content"),
  severity: z.enum(["info", "warning", "critical"]).describe("Tip severity"),
  similarity: z.number().min(0).max(1).describe("Relevance score"),
  controller_specific: z.boolean().describe("True if tip mentions this controller"),
  tags: z.array(z.string()).describe("Associated tags"),
}).describe("Single dialect folklore tip");
export type DialectTip = z.infer<typeof DialectTipSchema>;

export const DialectInfoSchema = z.object({
  controller_family: z.string().describe("Normalized controller family"),
  dialect_found: z.boolean().describe("True if dialect rules exist"),
  arc_format: z.string().nullable().describe("Arc format (ijk_incremental, r_word, etc.)"),
  comment_style: z.string().nullable().describe("Comment syntax style"),
  canned_cycles_supported: z.boolean().describe("Whether canned cycles available"),
  hsc_mode_available: z.boolean().describe("High-speed machining mode available"),
  tcpc_available: z.boolean().describe("TCPC/RTCP for 5-axis available"),
}).describe("Dialect information");
export type DialectInfo = z.infer<typeof DialectInfoSchema>;

export const PPGRAGDialectMatchOutputSchema = z.object({
  ok: z.boolean().describe("Whether retrieval succeeded"),
  controller_normalized: z.string().describe("Normalized controller family"),
  dialect_info: DialectInfoSchema.describe("Controller dialect information"),
  program_priors: z.array(ProgramPriorSchema).describe("Top-k historical program priors"),
  dialect_tips: z.array(DialectTipSchema).describe("Relevant dialect folklore tips"),
  citations: z.array(CitationSchema).describe("Citations for provenance"),
  total_programs_searched: z.number().int().describe("Total programs in index"),
  total_tips_searched: z.number().int().describe("Total tips in index"),
  search_time_ms: z.number().describe("Combined search latency in milliseconds"),
  warnings: z.array(z.string()).describe("Any warnings during retrieval"),
}).describe("PPG RAG dialect match output");
export type PPGRAGDialectMatchOutput = z.infer<typeof PPGRAGDialectMatchOutputSchema>;

// ─── Constants ──────────────────────────────────────────────────────────

const ENGINE_NAME = "PPGRAGDialectMatchEngine";
const LATENCY_TARGET_MS = 300;

// ─── Engine ─────────────────────────────────────────────────────────────

export class PPGRAGDialectMatchEngine {
  /**
   * Match controller context against historical programs and dialect tips.
   *
   * @param input - Controller, machine, material context
   * @returns Nearest-prior programs + dialect tips + citations
   */
  static match(input: PPGRAGDialectMatchInput): PPGRAGDialectMatchOutput {
    const start = performance.now();
    const warnings: string[] = [];
    const parsed = PPGRAGDialectMatchInputSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        controller_normalized: "",
        dialect_info: this.emptyDialectInfo(),
        program_priors: [],
        dialect_tips: [],
        citations: [],
        total_programs_searched: 0,
        total_tips_searched: 0,
        search_time_ms: performance.now() - start,
        warnings: [`Invalid input: ${parsed.error.message}`],
      };
    }

    const data = parsed.data;
    const controllerNormalized = normalizeController(data.controller);

    // Get dialect info from ControllerDialectEngine
    const dialectInfo = this.getDialectInfo(controllerNormalized);

    // Build query for JMDieProgramRAGEngine
    const query = this.buildProgramQuery(data, controllerNormalized);

    // Search historical programs
    const programResult = JMDieProgramRAGEngine.findSimilarPrograms({
      query,
      material: data.material,
      machine_type: data.machine_type === "5axis" ? "mill" : data.machine_type,
      operation_types: data.operation ? [data.operation] : undefined,
      customer: data.customer,
      top_k: data.top_k_programs,
      min_score: 0, // We'll filter by normalized score later
    });

    // Search tribal tips for dialect folklore
    const tipQuery = this.buildTipQuery(data, controllerNormalized);
    const tipResult = TribalRAGEngine.search({
      query: tipQuery,
      machine: data.machine_id ?? controllerNormalized,
      material: data.material,
      operation: data.operation,
      top_k: data.top_k_tips,
      min_score: 0,
    });

    // Process program results
    const maxProgramScore = Math.max(...programResult.results.map(r => r.score), 1);
    const programPriors: ProgramPrior[] = [];
    const citations: Citation[] = [];

    for (const result of programResult.results) {
      const normalizedSimilarity = result.score / maxProgramScore;
      if (normalizedSimilarity < data.min_score) continue;

      const metadata = result.metadata ?? {};
      const programController = normalizeController((metadata.controller as string) ?? "");
      const controllerMatch = programController === controllerNormalized;
      const materialMatch = this.checkMaterialMatch(
        data.material,
        metadata.material as string | undefined
      );
      const machineMatch = this.checkMachineMatch(
        data.machine_type,
        metadata.machine_type as string | undefined
      );

      programPriors.push({
        program_id: result.id,
        program_number: result.title,
        similarity: normalizedSimilarity,
        raw_score: result.score,
        controller_match: controllerMatch,
        machine_match: machineMatch,
        material_match: materialMatch,
        customer: (metadata.customer as string) ?? "unknown",
        operation_types: (metadata.operation_types as string[]) ?? [],
        tool_count: (metadata.tool_count as number) ?? 0,
        excerpt: result.excerpt,
      });

      citations.push({
        source_type: "program",
        source_id: result.id,
        corpus: "jm_die_programs",
        engine: ENGINE_NAME,
        excerpt: result.excerpt,
        confidence: normalizedSimilarity,
        retrieval_score: result.score,
      });
    }

    // Process tip results
    const maxTipScore = Math.max(...tipResult.results.map(r => r.score), 1);
    const dialectTips: DialectTip[] = [];

    for (const result of tipResult.results) {
      const normalizedSimilarity = result.score / maxTipScore;
      if (normalizedSimilarity < data.min_score) continue;

      const metadata = result.metadata ?? {};
      const controllerSpecific = this.checkControllerMentioned(
        result.excerpt ?? "",
        controllerNormalized,
        data.controller
      );

      dialectTips.push({
        tip_id: result.id,
        title: result.title ?? "",
        body: result.excerpt ?? "",
        severity: (metadata.severity as "info" | "warning" | "critical") ?? "info",
        similarity: normalizedSimilarity,
        controller_specific: controllerSpecific,
        tags: (metadata.tags as string[]) ?? [],
      });

      citations.push({
        source_type: "tribal_tip",
        source_id: result.id,
        corpus: "tribal_tips",
        engine: ENGINE_NAME,
        excerpt: result.excerpt,
        confidence: normalizedSimilarity,
        retrieval_score: result.score,
      });
    }

    const searchTime = performance.now() - start;

    // Check latency target
    if (searchTime > LATENCY_TARGET_MS) {
      warnings.push(`Search latency ${searchTime.toFixed(1)}ms exceeds ${LATENCY_TARGET_MS}ms target`);
    }

    // Warn if no controller-specific tips found
    const controllerSpecificTips = dialectTips.filter(t => t.controller_specific).length;
    if (dialectTips.length > 0 && controllerSpecificTips === 0) {
      warnings.push(`No controller-specific tips found for ${controllerNormalized}`);
    }

    return {
      ok: true,
      controller_normalized: controllerNormalized,
      dialect_info: dialectInfo,
      program_priors: programPriors,
      dialect_tips: dialectTips,
      citations,
      total_programs_searched: programResult.total_candidates,
      total_tips_searched: tipResult.total_candidates,
      search_time_ms: searchTime,
      warnings,
    };
  }

  /**
   * Build a query string optimized for program retrieval.
   */
  private static buildProgramQuery(input: PPGRAGDialectMatchInput, controllerNormalized: string): string {
    const parts: string[] = [controllerNormalized];

    if (input.machine_type && input.machine_type !== "unknown") {
      parts.push(input.machine_type);
    }
    if (input.machine_id) {
      parts.push(input.machine_id);
    }
    if (input.material) {
      parts.push(input.material);
    }
    if (input.operation) {
      parts.push(input.operation);
    }

    return parts.join(" ");
  }

  /**
   * Build a query string optimized for tribal tip retrieval.
   */
  private static buildTipQuery(input: PPGRAGDialectMatchInput, controllerNormalized: string): string {
    const parts: string[] = [
      controllerNormalized,
      input.controller, // Include original controller name for alias matching
      "post processor",
      "dialect",
    ];

    if (input.machine_type && input.machine_type !== "unknown") {
      parts.push(input.machine_type);
    }
    if (input.operation) {
      parts.push(input.operation);
    }

    return parts.join(" ");
  }

  /**
   * Get dialect information from ControllerDialectEngine.
   */
  private static getDialectInfo(controllerNormalized: string): DialectInfo {
    try {
      const dialect = controllerDialectEngine.getDialect(controllerNormalized as ControllerFamily);
      if (!dialect) {
        return {
          controller_family: controllerNormalized,
          dialect_found: false,
          arc_format: null,
          comment_style: null,
          canned_cycles_supported: false,
          hsc_mode_available: false,
          tcpc_available: false,
        };
      }

      return {
        controller_family: controllerNormalized,
        dialect_found: true,
        arc_format: dialect.arc_format ?? null,
        comment_style: dialect.comment_style ?? null,
        canned_cycles_supported: !!dialect.canned_cycles,
        hsc_mode_available: !!dialect.features?.hsc_mode,
        tcpc_available: !!dialect.features?.tcpc,
      };
    } catch {
      return this.emptyDialectInfo(controllerNormalized);
    }
  }

  /**
   * Empty dialect info for error cases.
   */
  private static emptyDialectInfo(controllerNormalized = ""): DialectInfo {
    return {
      controller_family: controllerNormalized,
      dialect_found: false,
      arc_format: null,
      comment_style: null,
      canned_cycles_supported: false,
      hsc_mode_available: false,
      tcpc_available: false,
    };
  }

  /**
   * Check if materials match (case-insensitive, partial match allowed).
   */
  private static checkMaterialMatch(
    queryMaterial: string | undefined,
    programMaterial: string | undefined
  ): boolean {
    if (!queryMaterial || !programMaterial) return false;
    const qLower = queryMaterial.toLowerCase();
    const pLower = programMaterial.toLowerCase();
    return pLower.includes(qLower) || qLower.includes(pLower);
  }

  /**
   * Check if machine type matches.
   */
  private static checkMachineMatch(
    queryMachine: string | undefined,
    programMachine: string | undefined
  ): boolean {
    if (!queryMachine || !programMachine) return false;
    // Map 5axis to mill for comparison
    const qNorm = queryMachine === "5axis" ? "mill" : queryMachine.toLowerCase();
    return qNorm === programMachine.toLowerCase();
  }

  /**
   * Check if a tip mentions the controller family.
   */
  private static checkControllerMentioned(
    text: string,
    controllerNormalized: string,
    originalController: string
  ): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes(controllerNormalized) ||
      lower.includes(originalController.toLowerCase()) ||
      // Check common aliases
      (controllerNormalized === "fanuc" && (lower.includes("fanuc") || lower.includes("ge fanuc"))) ||
      (controllerNormalized === "okuma" && (lower.includes("okuma") || lower.includes("osp"))) ||
      (controllerNormalized === "siemens" && (lower.includes("siemens") || lower.includes("sinumerik"))) ||
      (controllerNormalized === "heidenhain" && (lower.includes("heidenhain") || lower.includes("tnc"))) ||
      (controllerNormalized === "mazak" && (lower.includes("mazak") || lower.includes("mazatrol")))
    );
  }

  /**
   * Check if the RAG indexes are loaded and ready.
   */
  static areIndexesReady(): { programs: boolean; tips: boolean } {
    const programStats = JMDieProgramRAGEngine.getIndexStats();
    const tipStats = TribalRAGEngine.getIndexStats();
    return {
      programs: programStats !== null && programStats.total_programs > 0,
      tips: tipStats !== null && tipStats.total_tips > 0,
    };
  }

  /**
   * Get combined index statistics.
   */
  static getIndexStats(): {
    programs: { total: number; per_controller: Record<string, number> } | null;
    tips: { total: number; per_domain: Record<string, number> } | null;
  } {
    const programStats = JMDieProgramRAGEngine.getIndexStats();
    const tipStats = TribalRAGEngine.getIndexStats();

    return {
      programs: programStats
        ? {
            total: programStats.total_programs,
            per_controller: programStats.per_machine_count, // Using machine as proxy for controller
          }
        : null,
      tips: tipStats
        ? {
            total: tipStats.total_tips,
            per_domain: tipStats.per_domain_count,
          }
        : null,
    };
  }

  /**
   * Engine self-awareness metadata.
   */
  static getSelfAwareness() {
    return {
      name: ENGINE_NAME,
      version: "1.0.0",
      milestone: "PSAU-PPG-SFC U-PPG-SFC-08",
      capabilities: [
        "match",
        "areIndexesReady",
        "getIndexStats",
      ],
      dependencies: [
        "JMDieProgramRAGEngine",
        "TribalRAGEngine",
        "ControllerDialectEngine",
        "citationSchema (Citation)",
      ],
      surfaces_into: [
        "PostProcessorEngine.baseline_selection",
        "PPGProvenanceWireEngine.citations",
      ],
      latency_target_ms: LATENCY_TARGET_MS,
      description:
        "Index dialect catalog + 22k JM Die programs by controller fingerprint. " +
        "On (controller, machine, material) request, serves nearest-prior post " +
        "templates + dialect-folklore tips from TribalRAGEngine.",
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────

export const ppgRAGDialectMatchEngine = PPGRAGDialectMatchEngine;
