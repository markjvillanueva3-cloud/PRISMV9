// Consumed internally by SFCMultiHypothesisRankerEngine + SFCProvenanceWireEngine, AND exposed
// read-only via prism_calc (sfc_rag_warmstart / sfc_rag_warmstart_stats) for direct operator JM Die
// corpus visibility -- U-SFC-RAG-WARMSTART-WIRE, slot:india 2026-06-22.
/**
 * SFCRAGWarmStartEngine — U-PPG-SFC-07
 * =====================================
 *
 * Wire jmDieProgramRAGEngine into SFC for historical-prior retrieval. On new
 * quote, fetch top-5 nearest historical {material × tool_class × machine × op_type}
 * programs from JM Die corpus. Use as Bayesian prior (likelihood-weighted by
 * similarity score) for SFC ranker (U-PPG-SFC-09).
 *
 * Design invariants:
 *   1. FAST. <200ms latency target over 22k corpus.
 *   2. RELEVANT. ≥90% of retrievals should have similarity > 0.5.
 *   3. CITABLE. Every retrieval attaches to provenance with program_id + similarity.
 *   4. GRACEFUL. Empty corpus or index-miss returns empty priors, never errors.
 *
 * Integration points:
 *   - Input: SFC query context (material, tool_class, machine, operation)
 *   - Calls: JMDieProgramRAGEngine.findSimilarPrograms()
 *   - Output: RAGEvidence[] for SFCProvenanceWireEngine
 *   - Consumer: SFCMultiHypothesisRankerEngine (U-PPG-SFC-09) uses priors
 *
 * @module engines/SFCRAGWarmStartEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-07
 */

import { z } from "zod";
import { JMDieProgramRAGEngine } from "./JMDieProgramRAGEngine.js";
import type { RAGEvidence } from "../schemas/sfcProvenanceSchema.js";
import { CitationSchema, type Citation, type RetrievalResult } from "../schemas/citationSchema.js";

// ─── Input Schema ───────────────────────────────────────────────────────

export const SFCRAGWarmStartInputSchema = z.object({
  material: z.string().min(1).describe("Material name or grade (e.g., 'D2', '4140', 'Aluminum 6061')"),
  tool_class: z.string().optional().describe("Tool class (e.g., 'carbide', 'hss', 'ceramic', 'diamond')"),
  machine_type: z.enum(["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "unknown"]).optional()
    .describe("Machine type for filtering"),
  machine_id: z.string().optional().describe("Specific machine ID (e.g., 'Okuma-LB45')"),
  operation: z.string().optional().describe("Operation type (e.g., 'rough', 'finish', 'face', 'bore')"),
  customer: z.string().optional().describe("Customer name filter (e.g., 'ALCOA')"),
  top_k: z.number().int().min(1).max(20).optional().default(5).describe("Number of historical priors to retrieve"),
  min_similarity: z.number().min(0).max(1).optional().default(0.3).describe("Minimum similarity threshold"),
}).describe("SFC RAG warm-start query input");
export type SFCRAGWarmStartInput = z.infer<typeof SFCRAGWarmStartInputSchema>;

// ─── Output Schema ──────────────────────────────────────────────────────

export const SFCHistoricalPriorSchema = z.object({
  program_id: z.string().describe("JM Die program path"),
  program_number: z.string().nullable().describe("G-code program number if extracted"),
  similarity: z.number().min(0).max(1).describe("BM25 + semantic similarity score (normalized)"),
  raw_score: z.number().describe("Raw BM25 score before normalization"),
  material_match: z.boolean().describe("True if material matched query"),
  operation_match: z.boolean().describe("True if operation type matched query"),
  machine_match: z.boolean().describe("True if machine type matched query"),
  customer: z.string().describe("Customer name from program"),
  operation_types: z.array(z.string()).describe("Operations in this program"),
  tool_count: z.number().int().describe("Number of tools used"),
  cycle_time_sec: z.number().nullable().describe("Cycle time if known"),
  bayesian_weight: z.number().min(0).max(1).describe("Likelihood weight for Bayesian prior (normalized similarity)"),
}).describe("Single historical program prior");
export type SFCHistoricalPrior = z.infer<typeof SFCHistoricalPriorSchema>;

export const SFCRAGWarmStartOutputSchema = z.object({
  ok: z.boolean().describe("Whether retrieval succeeded"),
  priors: z.array(SFCHistoricalPriorSchema).describe("Top-k historical priors"),
  rag_evidence: z.array(z.object({
    program_id: z.string(),
    similarity: z.number(),
    material_match: z.boolean(),
    operation_match: z.boolean(),
    machine_match: z.boolean(),
  })).describe("RAG evidence for provenance attachment"),
  citations: z.array(CitationSchema).describe("Citations for provenance"),
  total_candidates: z.number().int().describe("Total programs searched"),
  search_time_ms: z.number().describe("Search latency in milliseconds"),
  index_version: z.string().nullable().describe("Index generation timestamp"),
  warnings: z.array(z.string()).describe("Any warnings during retrieval"),
}).describe("SFC RAG warm-start output");
export type SFCRAGWarmStartOutput = z.infer<typeof SFCRAGWarmStartOutputSchema>;

// ─── Constants ──────────────────────────────────────────────────────────

const ENGINE_NAME = "SFCRAGWarmStartEngine";

// ─── Engine ─────────────────────────────────────────────────────────────

export class SFCRAGWarmStartEngine {
  /**
   * Retrieve historical program priors for SFC warm-start.
   *
   * @param input - Query context with material, tool, machine, operation
   * @returns Top-k historical priors with Bayesian weights + citations
   */
  static retrieve(input: SFCRAGWarmStartInput): SFCRAGWarmStartOutput {
    const warnings: string[] = [];
    const parsed = SFCRAGWarmStartInputSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        priors: [],
        rag_evidence: [],
        citations: [],
        total_candidates: 0,
        search_time_ms: 0,
        index_version: null,
        warnings: [`Invalid input: ${parsed.error.message}`],
      };
    }

    const query = this.buildQuery(parsed.data);

    // Call JMDieProgramRAGEngine
    const ragResult = JMDieProgramRAGEngine.findSimilarPrograms({
      query,
      material: parsed.data.material,
      machine_type: parsed.data.machine_type,
      operation_types: parsed.data.operation ? [parsed.data.operation] : undefined,
      customer: parsed.data.customer,
      top_k: parsed.data.top_k,
      min_score: 0, // We'll filter by normalized similarity later
    });

    if (ragResult.results.length === 0) {
      return {
        ok: true,
        priors: [],
        rag_evidence: [],
        citations: [],
        total_candidates: ragResult.total_candidates,
        search_time_ms: ragResult.search_time_ms,
        index_version: ragResult.index_version,
        warnings: ragResult.total_candidates === 0
          ? ["RAG index is empty — run buildIndex first"]
          : ["No matching programs found for query"],
      };
    }

    // Normalize scores and compute Bayesian weights
    // Use actual max score from results (min 1 to avoid division by zero)
    const maxScore = Math.max(...ragResult.results.map(r => r.score), 1);
    const priors: SFCHistoricalPrior[] = [];
    const ragEvidence: RAGEvidence[] = [];
    const citations: Citation[] = [];

    for (const result of ragResult.results) {
      const normalizedSimilarity = result.score / maxScore;

      // Skip if below minimum similarity threshold
      if (normalizedSimilarity < parsed.data.min_similarity) {
        continue;
      }

      const metadata = result.metadata ?? {};
      const materialMatch = this.checkMaterialMatch(
        parsed.data.material,
        metadata.material as string | undefined
      );
      const operationMatch = this.checkOperationMatch(
        parsed.data.operation,
        metadata.operation_types as string[] | undefined
      );
      const machineMatch = this.checkMachineMatch(
        parsed.data.machine_type,
        metadata.machine_type as string | undefined
      );

      const prior: SFCHistoricalPrior = {
        program_id: result.id,
        program_number: result.title,
        similarity: normalizedSimilarity,
        raw_score: result.score,
        material_match: materialMatch,
        operation_match: operationMatch,
        machine_match: machineMatch,
        customer: (metadata.customer as string) ?? "unknown",
        operation_types: (metadata.operation_types as string[]) ?? [],
        tool_count: (metadata.tool_count as number) ?? 0,
        cycle_time_sec: (metadata.cycle_time_sec as number | null) ?? null,
        bayesian_weight: 0, // Computed below
      };

      priors.push(prior);

      // Build RAG evidence for provenance
      ragEvidence.push({
        program_id: result.id,
        similarity: normalizedSimilarity,
        material_match: materialMatch,
        operation_match: operationMatch,
        machine_match: machineMatch,
      });

      // Build citation
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

    // Compute Bayesian weights (softmax over similarities)
    if (priors.length > 0) {
      const totalWeight = priors.reduce((sum, p) => sum + p.similarity, 0);
      for (const prior of priors) {
        prior.bayesian_weight = totalWeight > 0 ? prior.similarity / totalWeight : 0;
      }
    }

    // Check latency target
    if (ragResult.search_time_ms > 200) {
      warnings.push(`Search latency ${ragResult.search_time_ms.toFixed(1)}ms exceeds 200ms target`);
    }

    // Check similarity quality
    const highQualityCount = priors.filter(p => p.similarity > 0.5).length;
    const qualityRatio = priors.length > 0 ? highQualityCount / priors.length : 0;
    if (qualityRatio < 0.9 && priors.length > 0) {
      warnings.push(`Only ${(qualityRatio * 100).toFixed(0)}% of results have similarity > 0.5 (target: 90%)`);
    }

    return {
      ok: true,
      priors,
      rag_evidence: ragEvidence,
      citations,
      total_candidates: ragResult.total_candidates,
      search_time_ms: ragResult.search_time_ms,
      index_version: ragResult.index_version,
      warnings,
    };
  }

  /**
   * Build a query string from SFC context.
   */
  private static buildQuery(input: SFCRAGWarmStartInput): string {
    const parts: string[] = [];

    // Material is primary
    parts.push(input.material);

    // Tool class
    if (input.tool_class) {
      parts.push(input.tool_class);
    }

    // Operation
    if (input.operation) {
      parts.push(input.operation);
    }

    // Machine ID (extract controller/type info)
    if (input.machine_id) {
      parts.push(input.machine_id);
    }

    return parts.join(" ");
  }

  /**
   * Check if materials match (case-insensitive, partial match allowed).
   */
  private static checkMaterialMatch(
    queryMaterial: string,
    programMaterial: string | undefined
  ): boolean {
    if (!programMaterial) return false;
    const qLower = queryMaterial.toLowerCase();
    const pLower = programMaterial.toLowerCase();
    return pLower.includes(qLower) || qLower.includes(pLower);
  }

  /**
   * Check if operation matches any in the program.
   */
  private static checkOperationMatch(
    queryOp: string | undefined,
    programOps: string[] | undefined
  ): boolean {
    if (!queryOp || !programOps || programOps.length === 0) return false;
    const qLower = queryOp.toLowerCase();
    return programOps.some(op => op.toLowerCase().includes(qLower));
  }

  /**
   * Check if machine type matches.
   */
  private static checkMachineMatch(
    queryMachine: string | undefined,
    programMachine: string | undefined
  ): boolean {
    if (!queryMachine || !programMachine) return false;
    return queryMachine.toLowerCase() === programMachine.toLowerCase();
  }

  /**
   * Convenience method: retrieve priors and format for SFCProvenanceWireEngine.
   */
  static retrieveForProvenance(
    input: SFCRAGWarmStartInput
  ): { rag_evidence: RAGEvidence[]; citations: Citation[]; warnings: string[] } {
    const result = this.retrieve(input);
    return {
      rag_evidence: result.rag_evidence,
      citations: result.citations,
      warnings: result.warnings,
    };
  }

  /**
   * Check if the RAG index is loaded and ready.
   */
  static isIndexReady(): boolean {
    const stats = JMDieProgramRAGEngine.getIndexStats();
    return stats !== null && stats.total_programs > 0;
  }

  /**
   * Get index statistics.
   */
  static getIndexStats(): {
    total_programs: number;
    per_customer: Record<string, number>;
    per_machine: Record<string, number>;
  } | null {
    const stats = JMDieProgramRAGEngine.getIndexStats();
    if (!stats) return null;
    return {
      total_programs: stats.total_programs,
      per_customer: stats.per_customer_count,
      per_machine: stats.per_machine_count,
    };
  }

  /**
   * Engine self-awareness metadata.
   */
  static getSelfAwareness() {
    return {
      name: ENGINE_NAME,
      version: "1.0.0",
      milestone: "PSAU-PPG-SFC U-PPG-SFC-07",
      capabilities: [
        "retrieve",
        "retrieveForProvenance",
        "isIndexReady",
        "getIndexStats",
      ],
      dependencies: [
        "JMDieProgramRAGEngine",
        "sfcProvenanceSchema (RAGEvidence)",
        "citationSchema (Citation)",
      ],
      surfaces_into: [
        "SFCProvenanceWireEngine.rag_evidence",
        "SFCMultiHypothesisRankerEngine.bayesian_priors",
      ],
      latency_target_ms: 200,
      quality_target: "≥90% of results with similarity > 0.5",
      description:
        "Historical-prior retrieval for SFC warm-start. Fetches top-5 nearest " +
        "historical {material × tool × machine × op} programs from JM Die corpus. " +
        "Returns Bayesian weights (likelihood-weighted by similarity) for ranker.",
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────

export const sfcRAGWarmStartEngine = SFCRAGWarmStartEngine;
