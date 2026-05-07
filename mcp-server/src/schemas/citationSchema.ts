/**
 * Citation schema — U-LEARN-04
 * =============================
 *
 * Provenance citations for AI recommendations. Every recommendation must
 * include ≥1 citation showing where the value came from:
 * - formula (physics constant, Kienzle, Taylor)
 * - corpus (JM Die program, tribal tip, playbook rule)
 * - adapter (LoRA inference, ML model)
 * - expert (operator override, shop wisdom)
 *
 * This schema enables ITAR/AS9100 audit trails and operator trust.
 *
 * @module schemas/citationSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-04
 */

import { z } from "zod";

export const CitationSourceTypeSchema = z.enum([
  "formula",       // Physics formula (Kienzle, Taylor, deflection)
  "constant",      // Physics constant from constants.ts
  "tribal_tip",    // Shop floor tribal knowledge
  "playbook_rule", // Playbook machining rule
  "program",       // Historical JM Die program
  "run_log",       // Machine run log data
  "lora_adapter",  // LoRA inference result
  "ml_model",      // ML model prediction
  "operator",      // Operator override/feedback
  "manual",        // Manufacturer manual/spec
  "material_db",   // Material database entry
  "tool_db",       // Tool catalog entry
  "customer_spec", // Customer specification
  "unknown",       // Source unknown (legacy/fallback)
]);
export type CitationSourceType = z.infer<typeof CitationSourceTypeSchema>;

export const CitationSchema = z.object({
  source_type: CitationSourceTypeSchema.describe("Type of source"),
  source_id: z.string().describe("Unique identifier (tip_id, program_path, formula_name)"),
  corpus: z.string().nullable().describe("Corpus name (jm_die_programs, tribal_tips, playbook)"),
  engine: z.string().describe("Engine that produced this citation"),
  excerpt: z.string().nullable().describe("Relevant excerpt from source (≤200 chars)"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  retrieval_score: z.number().nullable().describe("Raw retrieval score if from RAG"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Additional source-specific metadata"),
}).describe("Single provenance citation");
export type Citation = z.infer<typeof CitationSchema>;

export const ProvenanceSchema = z.object({
  recommendation_id: z.string().describe("Unique ID for this recommendation"),
  timestamp: z.string().describe("ISO8601 timestamp"),
  engine: z.string().describe("Primary engine that produced the recommendation"),
  citations: z.array(CitationSchema).min(0).describe("All sources consulted"),
  primary_citation: CitationSchema.nullable().describe("Most influential source"),
  reasoning_trace: z.string().nullable().describe("Brief explanation of how sources combined"),
  audit_hash: z.string().nullable().describe("SHA-256 hash for audit trail"),
}).describe("Full provenance record for a recommendation");
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const RetrievalResultSchema = z.object({
  id: z.string().describe("Document ID"),
  score: z.number().describe("Retrieval score (higher = better)"),
  source_type: CitationSourceTypeSchema,
  title: z.string().nullable(),
  excerpt: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).describe("Single retrieval result");
export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;

export const RAGQueryInputSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  top_k: z.number().int().min(1).max(100).default(10).describe("Number of results"),
  source_types: z.array(CitationSourceTypeSchema).optional().describe("Filter by source type"),
  material: z.string().optional().describe("Filter by material"),
  operation: z.string().optional().describe("Filter by operation type"),
  machine_type: z.string().optional().describe("Filter by machine type"),
  min_score: z.number().min(0).default(0).describe("Minimum retrieval score threshold"),
}).describe("RAG query input");
export type RAGQueryInput = z.infer<typeof RAGQueryInputSchema>;

export const RAGQueryResultSchema = z.object({
  query: z.string(),
  results: z.array(RetrievalResultSchema),
  total_candidates: z.number().int(),
  search_time_ms: z.number(),
  index_version: z.string().nullable(),
}).describe("RAG query result");
export type RAGQueryResult = z.infer<typeof RAGQueryResultSchema>;
