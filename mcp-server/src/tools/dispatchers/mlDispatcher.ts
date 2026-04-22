/**
 * prism_ml — ML Pipeline Dispatcher — U-LEARN-03
 * ================================================
 *
 * 7 actions for ML training data pipeline:
 * - corpus_crawl: Crawl JM Die archive, parse programs, produce training examples
 * - corpus_stats: Quick file count scan
 * - program_parse_min: Parse Okuma .MIN lathe program
 * - program_parse_nc: Parse standard .NC program
 * - run_log_parse: Parse controller run log
 * - training_assemble: Join programs + logs into training examples
 * - training_export: Export examples to JSONL
 *
 * Engine dependencies: MINFileParserEngine, NCFileParserEngine,
 *   OkumaRunLogParserEngine, TrainingExampleAssemblerEngine,
 *   JMDieTrainingCorpusEngine
 *
 * @module tools/dispatchers/mlDispatcher
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ML_ACTIONS, ACTION_ML_SCHEMAS } from "../../schemas/mlActionSchemas.js";

// Lazy-loaded engine singletons
let _minParser: typeof import("../../engines/MINFileParserEngine.js").minFileParserEngine | null = null;
let _ncParser: typeof import("../../engines/NCFileParserEngine.js").ncFileParserEngine | null = null;
let _runLogParser: typeof import("../../engines/OkumaRunLogParserEngine.js").okumaRunLogParserEngine | null = null;
let _assembler: typeof import("../../engines/TrainingExampleAssemblerEngine.js").trainingExampleAssemblerEngine | null = null;
let _corpus: typeof import("../../engines/JMDieTrainingCorpusEngine.js").jmDieTrainingCorpusEngine | null = null;
// U-LEARN-04 RAG engines
let _programRAG: typeof import("../../engines/JMDieProgramRAGEngine.js").jmDieProgramRAGEngine | null = null;
let _tribalRAG: typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine | null = null;
let _reranker: typeof import("../../engines/ReRankerEngine.js").reRankerEngine | null = null;
let _provenance: typeof import("../../engines/ProvenanceEngine.js").provenanceEngine | null = null;
// U-LEARN-05 LoRA composition engines
let _loraMoE: typeof import("../../engines/LoRAMoEGatingEngine.js").loraMoEGatingEngine | null = null;
let _doRA: typeof import("../../engines/DoRAAdapterEngine.js").doRAAdapterEngine | null = null;
let _adaLoRA: typeof import("../../engines/AdaLoRARankAllocatorEngine.js").adaLoRARankAllocatorEngine | null = null;
let _oLoRA: typeof import("../../engines/OrthogonalLoRAEngine.js").orthogonalLoRAEngine | null = null;
let _loraComposition: typeof import("../../engines/LoRACompositionEngine.js").loraCompositionEngine | null = null;

async function getEngine(name: string): Promise<unknown> {
  switch (name) {
    case "min":
      return _minParser ??= (await import("../../engines/MINFileParserEngine.js")).minFileParserEngine;
    case "nc":
      return _ncParser ??= (await import("../../engines/NCFileParserEngine.js")).ncFileParserEngine;
    case "runLog":
      return _runLogParser ??= (await import("../../engines/OkumaRunLogParserEngine.js")).okumaRunLogParserEngine;
    case "assembler":
      return _assembler ??= (await import("../../engines/TrainingExampleAssemblerEngine.js")).trainingExampleAssemblerEngine;
    case "corpus":
      return _corpus ??= (await import("../../engines/JMDieTrainingCorpusEngine.js")).jmDieTrainingCorpusEngine;
    case "programRAG":
      return _programRAG ??= (await import("../../engines/JMDieProgramRAGEngine.js")).jmDieProgramRAGEngine;
    case "tribalRAG":
      return _tribalRAG ??= (await import("../../engines/TribalRAGEngine.js")).tribalRAGEngine;
    case "reranker":
      return _reranker ??= (await import("../../engines/ReRankerEngine.js")).reRankerEngine;
    case "provenance":
      return _provenance ??= (await import("../../engines/ProvenanceEngine.js")).provenanceEngine;
    default:
      throw new Error(`Unknown engine: ${name}`);
  }
}

/**
 * Register the ML pipeline dispatcher.
 * @param server - MCP server instance
 */
export function registerMLDispatcher(server: unknown): void {
  const s = server as {
    tool: (
      name: string,
      desc: string,
      schema: Record<string, unknown>,
      handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>
    ) => void;
  };

  s.tool(
    "prism_ml",
    `ML training data pipeline. Actions: ${ML_ACTIONS.join(", ")}`,
    {
      action: z.enum(ML_ACTIONS).describe("ML pipeline action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async ({ action, params: rawParams = {} }) => {
      log.info(`[prism_ml] Action: ${action}`);

      // Normalize params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch {
        // normalizer not available
      }

      // Validate params against schema
      const validation = validateActionParams(action, params, ACTION_ML_SCHEMAS);
      if (validation && !validation.success) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Invalid params for ${action}`,
              details: validation.error.issues,
            }),
          }],
        };
      }

      let result: unknown;

      try {
        switch (action) {
          case "corpus_crawl": {
            const engine = await getEngine("corpus") as typeof import("../../engines/JMDieTrainingCorpusEngine.js").jmDieTrainingCorpusEngine;
            const crawlResult = engine.crawl({
              root_path: params.root_path as string,
              max_files: (params.max_files as number) ?? 50_000,
              file_types: (params.file_types as Array<".MIN" | ".NC" | ".nc" | ".log">) ?? [".MIN", ".NC", ".nc"],
              exclude_patterns: (params.exclude_patterns as string[]) ?? ["BACKUP", "OLD", "ARCHIVE", "TEMP"],
              parse_logs: (params.parse_logs as boolean) ?? true,
            });
            result = {
              success: true,
              stats: crawlResult.stats,
              example_count: crawlResult.examples.length,
              warnings_count: crawlResult.warnings.length,
              warnings_sample: crawlResult.warnings.slice(0, 5),
            };
            break;
          }

          case "corpus_stats": {
            const engine = await getEngine("corpus") as typeof import("../../engines/JMDieTrainingCorpusEngine.js").jmDieTrainingCorpusEngine;
            const counts = engine.quickScan(params.root_path as string);
            result = { success: true, file_counts: counts };
            break;
          }

          case "program_parse_min": {
            const engine = await getEngine("min") as typeof import("../../engines/MINFileParserEngine.js").minFileParserEngine;
            const parseResult = engine.parse({
              text: params.text as string,
              source_path: (params.source_path as string) ?? "<inline>",
              max_lines: (params.max_lines as number) ?? 200_000,
            });
            result = {
              success: parseResult.ok,
              program: parseResult.program,
              warnings: parseResult.warnings,
            };
            break;
          }

          case "program_parse_nc": {
            const engine = await getEngine("nc") as typeof import("../../engines/NCFileParserEngine.js").ncFileParserEngine;
            const parseResult = engine.parse({
              text: params.text as string,
              source_path: (params.source_path as string) ?? "<inline>",
              max_lines: (params.max_lines as number) ?? 500_000,
            });
            result = {
              success: parseResult.ok,
              program: parseResult.program,
              warnings: parseResult.warnings,
            };
            break;
          }

          case "run_log_parse": {
            const engine = await getEngine("runLog") as typeof import("../../engines/OkumaRunLogParserEngine.js").okumaRunLogParserEngine;
            const parseResult = engine.parse({
              text: params.text as string,
              source_path: (params.source_path as string) ?? "<inline>",
              machine_id: (params.machine_id as string) ?? "unknown",
              controller: (params.controller as "okuma" | "fanuc" | "mazak" | "haas" | "hurco" | "siemens" | "unknown") ?? "unknown",
              max_entries: (params.max_entries as number) ?? 1_000_000,
            });
            result = {
              success: parseResult.ok,
              log: parseResult.log,
              warnings: parseResult.warnings,
            };
            break;
          }

          case "training_assemble": {
            const engine = await getEngine("assembler") as typeof import("../../engines/TrainingExampleAssemblerEngine.js").trainingExampleAssemblerEngine;
            const assembleResult = engine.assemble({
              programs: params.programs as Array<{ type: "min" | "nc"; program: unknown }>,
              run_logs: (params.run_logs as unknown[]) ?? [],
              customer_name: (params.customer_name as string) ?? "unknown",
              machine_type: (params.machine_type as "lathe" | "mill" | "wire_edm" | "sinker_edm" | "grinder" | "unknown") ?? "unknown",
            });
            result = {
              success: true,
              examples: assembleResult.examples,
              stats: assembleResult.stats,
              warnings: assembleResult.warnings,
            };
            break;
          }

          case "training_export": {
            const engine = await getEngine("corpus") as typeof import("../../engines/JMDieTrainingCorpusEngine.js").jmDieTrainingCorpusEngine;
            const examples = params.examples as Array<import("../../engines/TrainingExampleAssemblerEngine.js").TrainingExample>;
            const outputPath = params.output_path as string;
            const count = engine.saveToJSONL(examples, outputPath);
            result = {
              success: true,
              examples_exported: count,
              output_path: outputPath,
            };
            break;
          }

          // ─── U-LEARN-04 RAG Actions ─────────────────────────────────────────

          case "rag_program_build": {
            const engine = await getEngine("programRAG") as typeof import("../../engines/JMDieProgramRAGEngine.js").jmDieProgramRAGEngine;
            const buildResult = engine.buildIndex({
              programs: params.programs as Array<{
                source_path: string;
                program_number: string | null;
                customer: string;
                material?: string;
                machine_type: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "grinder" | "unknown";
                controller: string;
                tools: Array<{ tool_number: number; tool_type?: string }>;
                operations: Array<{ kind: string; g_codes: string[] }>;
                total_lines: number;
                cycle_time_sec?: number;
              }>,
              index_path: params.index_path as string | undefined,
            });
            result = { success: buildResult.success, summary: buildResult.summary, warnings: buildResult.warnings };
            break;
          }

          case "rag_program_search": {
            const engine = await getEngine("programRAG") as typeof import("../../engines/JMDieProgramRAGEngine.js").jmDieProgramRAGEngine;
            const searchResult = engine.findSimilarPrograms({
              query: params.query as string,
              material: params.material as string | undefined,
              machine_type: params.machine_type as string | undefined,
              operation_types: params.operation_types as string[] | undefined,
              customer: params.customer as string | undefined,
              top_k: (params.top_k as number) ?? 10,
              min_score: (params.min_score as number) ?? 0,
            });
            result = { success: true, ...searchResult };
            break;
          }

          case "rag_tribal_build": {
            const engine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
            const buildResult = engine.buildIndex(
              params.tips as Array<{
                tip_id?: string;
                source: string;
                domain: "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder" | "general";
                title: string;
                body: string;
                tags?: string[];
                materials?: string[];
                operations?: string[];
                machines?: string[];
                symptoms?: string[];
                severity?: "info" | "warning" | "critical";
                confidence?: number;
              }>,
              params.index_path as string | undefined,
            );
            result = { success: buildResult.success, summary: buildResult.summary, warnings: buildResult.warnings };
            break;
          }

          case "rag_tribal_search": {
            const engine = await getEngine("tribalRAG") as typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine;
            const searchResult = engine.search({
              query: params.query as string,
              domain: params.domain as "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder" | "general" | undefined,
              material: params.material as string | undefined,
              operation: params.operation as string | undefined,
              machine: params.machine as string | undefined,
              symptom: params.symptom as string | undefined,
              severity: params.severity as "info" | "warning" | "critical" | undefined,
              top_k: (params.top_k as number) ?? 10,
              min_score: (params.min_score as number) ?? 0,
            });
            result = { success: true, ...searchResult };
            break;
          }

          case "rag_rerank": {
            const engine = await getEngine("reranker") as typeof import("../../engines/ReRankerEngine.js").reRankerEngine;
            const diversityWeight = params.diversity_weight as number | undefined;
            const rerankResult = diversityWeight !== undefined
              ? engine.diverseRerank({
                  query: params.query as string,
                  candidates: params.candidates as Array<{ id: string; score: number; source_type: string; title: string | null; excerpt: string | null; metadata?: Record<string, unknown> }>,
                  top_k: (params.top_k as number) ?? 3,
                }, diversityWeight)
              : engine.rerank({
                  query: params.query as string,
                  candidates: params.candidates as Array<{ id: string; score: number; source_type: string; title: string | null; excerpt: string | null; metadata?: Record<string, unknown> }>,
                  top_k: (params.top_k as number) ?? 3,
                });
            result = { success: true, ...rerankResult };
            break;
          }

          case "provenance_create": {
            const engine = await getEngine("provenance") as typeof import("../../engines/ProvenanceEngine.js").provenanceEngine;
            const citations = (params.citations as Array<{ source_type: string; source_id: string; corpus?: string; excerpt?: string; confidence: number; retrieval_score?: number }> | undefined)?.map(c =>
              engine.createCitation({
                source_type: c.source_type as import("../../schemas/citationSchema.js").CitationSourceType,
                source_id: c.source_id,
                corpus: c.corpus,
                engine: params.engine as string,
                excerpt: c.excerpt,
                confidence: c.confidence,
                retrieval_score: c.retrieval_score,
              })
            );
            const provenance = engine.createProvenance({
              engine: params.engine as string,
              citations,
              reasoning_trace: params.reasoning_trace as string | undefined,
            });
            result = { success: true, provenance };
            break;
          }

          case "provenance_validate": {
            const engine = await getEngine("provenance") as typeof import("../../engines/ProvenanceEngine.js").provenanceEngine;
            const validation = engine.validateProvenance(
              params.provenance as import("../../schemas/citationSchema.js").Provenance,
              (params.require_citations as boolean) ?? true,
            );
            result = { success: true, validation };
            break;
          }

          default:
            return { content: [{ type: "text" as const, text: JSON.stringify(dispatcherError(`Unknown action: ${action}`, action, "prism_ml")) }] };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`[prism_ml] ${action} failed: ${msg}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(dispatcherError(`${action} failed: ${msg}`, action, "prism_ml")) }] };
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
