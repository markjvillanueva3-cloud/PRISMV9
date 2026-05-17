/**
 * prism_ml — ML Pipeline Dispatcher — U-LEARN-03 + U-LEARN-11
 * =============================================================
 *
 * ML training data pipeline + few-shot adaptation:
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
let _mcxParser: typeof import("../../engines/McxProgramParserEngine.js").mcxProgramParserEngine | null = null;
let _minBatch: typeof import("../../engines/MINBatchExtractorEngine.js").minBatchExtractorEngine | null = null;
let _mcxBatch: typeof import("../../engines/McxBatchExtractorEngine.js").mcxBatchExtractorEngine | null = null;
let _featureInfer: typeof import("../../engines/LatheProgramFeatureInferenceEngine.js").latheProgramFeatureInferenceEngine | null = null;
let _bueOnset: typeof import("../../engines/BUEOnsetThresholdEngine.js").bueOnsetThresholdEngine | null = null;
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
// U-LEARN-08 Offline RL engines
let _iql: typeof import("../../engines/IQLEngine.js").iqlEngine | null = null;
let _maxEntIRL: typeof import("../../engines/MaxEntIRLEngine.js").maxEntIRLEngine | null = null;
let _safetyShield: typeof import("../../engines/SafetyShieldEngine.js").safetyShieldEngine | null = null;
let _offlineRL: typeof import("../../engines/OfflineRLOrchestratorEngine.js").offlineRLOrchestratorEngine | null = null;
// U-ML-01 Physics gate
let _physicsGate: typeof import("../../engines/CADPhysicsConsistencyGateEngine.js").cadPhysicsConsistencyGateEngine | null = null;
// U-LEARN-10 Continual Learning engines
let _si: typeof import("../../engines/SynapticIntelligenceEngine.js").synapticIntelligenceEngine | null = null;
let _derPP: typeof import("../../engines/DERPlusPlusEngine.js").derPlusPlusEngine | null = null;
let _tta: typeof import("../../engines/TestTimeAdaptationEngine.js").testTimeAdaptationEngine | null = null;
let _cascade: typeof import("../../engines/LearningCascadeEngine.js").learningCascadeEngine | null = null;
let _fedLoRA: typeof import("../../engines/FederatedLoRAEngine.js").federatedLoRAEngine | null = null;
let _per: typeof import("../../engines/PrioritizedReplayBufferEngine.js").prioritizedReplayBufferEngine | null = null;
let _crossTransfer: typeof import("../../engines/CrossCustomerPolicyTransferEngine.js").crossCustomerPolicyTransferEngine | null = null;
let _continualLoRA: typeof import("../../engines/ContinualLoRAEngine.js").continualLoRAEngine | null = null;
// U-LEARN-11 ProtoMAML Few-Shot engines
let _protoNet: typeof import("../../engines/PrototypicalNetworkEngine.js").prototypicalNetworkEngine | null = null;
let _protoMAML: typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine | null = null;
// Ollama task offloading
let _offloader: typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine | null = null;
// OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-1
let _jmAnalyzer: typeof import("../../engines/JMDieProgramAnalyzerEngine.js").jmDieProgramAnalyzerEngine | null = null;
let _jmLearning: typeof import("../../engines/JMDieProgramLearningEngine.js").jmDieProgramLearningEngine | null = null;
let _jmRecipe: typeof import("../../engines/JMDieRecipeRetrieverEngine.js").jmDieRecipeRetrieverEngine | null = null;

async function getEngine(name: string): Promise<unknown> {
  switch (name) {
    case "min":
      return _minParser ??= (await import("../../engines/MINFileParserEngine.js")).minFileParserEngine;
    case "mcx":
      return _mcxParser ??= (await import("../../engines/McxProgramParserEngine.js")).mcxProgramParserEngine;
    case "minBatch":
      return _minBatch ??= (await import("../../engines/MINBatchExtractorEngine.js")).minBatchExtractorEngine;
    case "mcxBatch":
      return _mcxBatch ??= (await import("../../engines/McxBatchExtractorEngine.js")).mcxBatchExtractorEngine;
    case "featureInfer":
      return _featureInfer ??= (await import("../../engines/LatheProgramFeatureInferenceEngine.js")).latheProgramFeatureInferenceEngine;
    case "bueOnset":
      return _bueOnset ??= (await import("../../engines/BUEOnsetThresholdEngine.js")).bueOnsetThresholdEngine;
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
    case "loraMoE":
      return _loraMoE ??= (await import("../../engines/LoRAMoEGatingEngine.js")).loraMoEGatingEngine;
    case "doRA":
      return _doRA ??= (await import("../../engines/DoRAAdapterEngine.js")).doRAAdapterEngine;
    case "adaLoRA":
      return _adaLoRA ??= (await import("../../engines/AdaLoRARankAllocatorEngine.js")).adaLoRARankAllocatorEngine;
    case "oLoRA":
      return _oLoRA ??= (await import("../../engines/OrthogonalLoRAEngine.js")).orthogonalLoRAEngine;
    case "loraComposition":
      return _loraComposition ??= (await import("../../engines/LoRACompositionEngine.js")).loraCompositionEngine;
    case "iql":
      return _iql ??= (await import("../../engines/IQLEngine.js")).iqlEngine;
    case "maxEntIRL":
      return _maxEntIRL ??= (await import("../../engines/MaxEntIRLEngine.js")).maxEntIRLEngine;
    case "safetyShield":
      return _safetyShield ??= (await import("../../engines/SafetyShieldEngine.js")).safetyShieldEngine;
    case "offlineRL":
      return _offlineRL ??= (await import("../../engines/OfflineRLOrchestratorEngine.js")).offlineRLOrchestratorEngine;
    case "physicsGate":
      return _physicsGate ??= (await import("../../engines/CADPhysicsConsistencyGateEngine.js")).cadPhysicsConsistencyGateEngine;
    case "si":
      return _si ??= (await import("../../engines/SynapticIntelligenceEngine.js")).synapticIntelligenceEngine;
    case "derPP":
      return _derPP ??= (await import("../../engines/DERPlusPlusEngine.js")).derPlusPlusEngine;
    case "tta":
      return _tta ??= (await import("../../engines/TestTimeAdaptationEngine.js")).testTimeAdaptationEngine;
    case "cascade":
      return _cascade ??= (await import("../../engines/LearningCascadeEngine.js")).learningCascadeEngine;
    case "fedLoRA":
      return _fedLoRA ??= (await import("../../engines/FederatedLoRAEngine.js")).federatedLoRAEngine;
    case "per":
      return _per ??= (await import("../../engines/PrioritizedReplayBufferEngine.js")).prioritizedReplayBufferEngine;
    case "crossTransfer":
      return _crossTransfer ??= (await import("../../engines/CrossCustomerPolicyTransferEngine.js")).crossCustomerPolicyTransferEngine;
    case "continualLoRA":
      return _continualLoRA ??= (await import("../../engines/ContinualLoRAEngine.js")).continualLoRAEngine;
    case "protoNet":
      return _protoNet ??= (await import("../../engines/PrototypicalNetworkEngine.js")).prototypicalNetworkEngine;
    case "protoMAML":
      return _protoMAML ??= (await import("../../engines/ProtoMAMLFewShotEngine.js")).protoMAMLFewShotEngine;
    case "offloader":
      return _offloader ??= (await import("../../engines/OllamaTaskOffloaderEngine.js")).ollamaTaskOffloaderEngine;
    // OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-1
    case "jmAnalyzer":
      return _jmAnalyzer ??= (await import("../../engines/JMDieProgramAnalyzerEngine.js")).jmDieProgramAnalyzerEngine;
    case "jmLearning":
      return _jmLearning ??= (await import("../../engines/JMDieProgramLearningEngine.js")).jmDieProgramLearningEngine;
    case "jmRecipe":
      return _jmRecipe ??= (await import("../../engines/JMDieRecipeRetrieverEngine.js")).jmDieRecipeRetrieverEngine;
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
              details: validation.errors ?? validation.error?.issues ?? [],
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
              include_patterns: (params.include_patterns as string[]) ?? [],
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

          case "program_parse_mcx": {
            // U-LPR26: Mastercam binary metadata parser.
            const engine = await getEngine("mcx") as typeof import("../../engines/McxProgramParserEngine.js").mcxProgramParserEngine;
            const maxBytes = (params.max_bytes as number) ?? 64 * 1024 * 1024;
            const filePath = params.file_path as string | undefined;
            const contentB64 = params.content_base64 as string | undefined;
            const filename = (params.filename as string) ?? "inline.mcx-8";
            const metadata = filePath
              ? engine.parseFile(filePath, { maxBytes })
              : engine.parseBuffer(Buffer.from(contentB64 ?? "", "base64"), filename);
            result = {
              success: metadata.parse_ok,
              metadata,
              warnings: metadata.warnings,
              errors: metadata.errors,
            };
            break;
          }

          case "min_batch_extract": {
            // U-LPR27: bounded-concurrency .MIN corpus parser.
            const engine = await getEngine("minBatch") as typeof import("../../engines/MINBatchExtractorEngine.js").minBatchExtractorEngine;
            const batch = await engine.extractBatch({
              rootDir: params.root_dir as string,
              outputRoot: params.output_root as string,
              runId: params.run_id as string,
              maxFiles: params.max_files as number | undefined,
              maxConcurrency: params.max_concurrency as number | undefined,
              checkpointEvery: (params.checkpoint_every as number) ?? 250,
              maxBytesPerFile: (params.max_bytes_per_file as number) ?? 32 * 1024 * 1024,
              resume: (params.resume as boolean) ?? true,
            });
            result = { success: true, batch };
            break;
          }

          case "mcx_batch_extract": {
            // U-LPR28: bounded-concurrency Mastercam-binary corpus parser.
            const engine = await getEngine("mcxBatch") as typeof import("../../engines/McxBatchExtractorEngine.js").mcxBatchExtractorEngine;
            const batch = await engine.extractBatch({
              rootDir: params.root_dir as string,
              outputRoot: params.output_root as string,
              runId: params.run_id as string,
              maxFiles: params.max_files as number | undefined,
              maxConcurrency: params.max_concurrency as number | undefined,
              checkpointEvery: (params.checkpoint_every as number) ?? 250,
              maxBytesPerFile: (params.max_bytes_per_file as number) ?? 32 * 1024 * 1024,
              resume: (params.resume as boolean) ?? true,
            });
            result = { success: true, batch };
            break;
          }

          case "lathe_infer_features": {
            // U-LPR29: reverse-engineer turning features from MIN operations.
            const engine = await getEngine("featureInfer") as typeof import("../../engines/LatheProgramFeatureInferenceEngine.js").latheProgramFeatureInferenceEngine;
            const ops = (params.operations as Array<import("../../engines/LatheProgramFeatureInferenceEngine.js").InferenceOperationView>) ?? [];
            const inference = engine.inferFromOperations(ops);
            result = { success: true, inference };
            break;
          }

          case "bue_onset_check": {
            // U-LPR-BUE: built-up edge onset prediction.
            const engine = await getEngine("bueOnset") as typeof import("../../engines/BUEOnsetThresholdEngine.js").bueOnsetThresholdEngine;
            const r = engine.evaluate({
              cutting_speed_m_per_min: params.cutting_speed_m_per_min as number,
              iso_group: params.iso_group as import("../../engines/BUEOnsetThresholdEngine.js").IsoGroup,
              tool_material: params.tool_material as import("../../engines/BUEOnsetThresholdEngine.js").ToolMaterial,
              rake_angle_deg: (params.rake_angle_deg as number) ?? 0,
            });
            result = { success: true, bue: r };
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

          // ─── U-LEARN-05 LoRA Composition Actions ────────────────────────────

          case "lora_register_expert": {
            const engine = await getEngine("loraMoE") as typeof import("../../engines/LoRAMoEGatingEngine.js").loraMoEGatingEngine;
            const experts = params.experts as Array<import("../../schemas/loraCompositionSchema.js").Expert>;
            const registered = engine.registerExperts(experts);
            result = { success: true, ...registered, stats: engine.getStats() };
            break;
          }

          case "lora_gate": {
            const engine = await getEngine("loraMoE") as typeof import("../../engines/LoRAMoEGatingEngine.js").loraMoEGatingEngine;
            const gatingResult = engine.gate({
              domain: params.domain as import("../../schemas/outcomeEventSchema.js").OutcomeDomainT,
              material: params.material as string | undefined,
              machine: params.machine as string | undefined,
              operation: params.operation as string | undefined,
              quality_weights: params.quality_weights as number[] | undefined,
              top_k: (params.top_k as number) ?? 3,
              temperature: (params.temperature as number) ?? 1.0,
            });
            result = { success: true, ...gatingResult };
            break;
          }

          case "lora_compose": {
            const engine = await getEngine("loraComposition") as typeof import("../../engines/LoRACompositionEngine.js").loraCompositionEngine;
            const composeResult = engine.compose({
              domain: params.domain as import("../../schemas/outcomeEventSchema.js").OutcomeDomainT,
              context: params.context as { material?: string; machine?: string; operation?: string; customer?: string },
              base_values: params.base_values as Record<string, number>,
              composition_mode: (params.composition_mode as "weighted_sum" | "cascade" | "residual" | "attention") ?? "weighted_sum",
              max_experts: (params.max_experts as number) ?? 3,
            });
            result = { success: true, ...composeResult };
            break;
          }

          case "dora_create": {
            const engine = await getEngine("doRA") as typeof import("../../engines/DoRAAdapterEngine.js").doRAAdapterEngine;
            const created = engine.createAdapter({
              adapter_id: params.adapter_id as string,
              rank: params.rank as number,
              alpha: params.alpha as number,
              magnitude_lr_scale: (params.magnitude_lr_scale as number) ?? 1.0,
              direction_lr_scale: (params.direction_lr_scale as number) ?? 1.0,
              normalize_direction: (params.normalize_direction as boolean) ?? true,
            });
            result = { success: true, ...created };
            break;
          }

          case "dora_init_weights": {
            const engine = await getEngine("doRA") as typeof import("../../engines/DoRAAdapterEngine.js").doRAAdapterEngine;
            const weights = engine.initializeWeights(
              params.adapter_id as string,
              params.input_dim as number,
              params.output_dim as number,
              (params.init_scale as number) ?? 0.01,
            );
            result = { success: true, adapter_id: weights.adapter_id, magnitude_dim: weights.magnitude.length, rank: weights.direction_A.length };
            break;
          }

          case "dora_forward": {
            const engine = await getEngine("doRA") as typeof import("../../engines/DoRAAdapterEngine.js").doRAAdapterEngine;
            const outputs = engine.batchForward(params.adapter_id as string, params.inputs as number[][]);
            result = { success: outputs !== null, outputs, batch_size: (params.inputs as number[][]).length };
            break;
          }

          case "adalora_create": {
            const engine = await getEngine("adaLoRA") as typeof import("../../engines/AdaLoRARankAllocatorEngine.js").adaLoRARankAllocatorEngine;
            const allocation = engine.createAllocation(
              {
                adapter_id: params.adapter_id as string,
                total_rank_budget: params.total_rank_budget as number,
                min_rank: (params.min_rank as number) ?? 1,
                max_rank: (params.max_rank as number) ?? 64,
                importance_metric: (params.importance_metric as "svd" | "gradient" | "fisher") ?? "svd",
                reallocation_interval: (params.reallocation_interval as number) ?? 100,
              },
              params.layer_names as string[],
            );
            result = { success: true, allocation };
            break;
          }

          case "adalora_step": {
            const engine = await getEngine("adaLoRA") as typeof import("../../engines/AdaLoRARankAllocatorEngine.js").adaLoRARankAllocatorEngine;
            const allocation = engine.step(
              params.adapter_id as string,
              params.layer_data as Record<string, { weights?: number[][]; gradients?: number[] }>,
            );
            result = { success: allocation !== null, allocation, distribution: engine.getRankDistribution(params.adapter_id as string) };
            break;
          }

          case "olora_register": {
            const engine = await getEngine("oLoRA") as typeof import("../../engines/OrthogonalLoRAEngine.js").orthogonalLoRAEngine;
            const adapters = params.adapters as Array<{ adapter_id: string; direction: number[]; domain?: string }>;
            const registered = engine.registerDirections(adapters);
            result = { success: true, ...registered };
            break;
          }

          case "olora_check": {
            const engine = await getEngine("oLoRA") as typeof import("../../engines/OrthogonalLoRAEngine.js").orthogonalLoRAEngine;
            const threshold = (params.threshold as number) ?? 0.1;
            const violations = engine.getViolations(threshold);
            const domainStats = params.domain ? engine.getDomainOrthogonality(params.domain as string) : null;
            result = { success: true, violations, violation_count: violations.length, domain_stats: domainStats };
            break;
          }

          // ─── U-LEARN-08 Offline RL Actions ──────────────────────────────────

          case "iql_create": {
            const engine = await getEngine("iql") as typeof import("../../engines/IQLEngine.js").iqlEngine;
            const created = engine.createPolicy({
              policy_id: params.policy_id as string,
              state_dim: params.state_dim as number,
              action_dim: params.action_dim as number,
              hidden_dims: (params.hidden_dims as number[]) ?? [256, 256],
              expectile: (params.expectile as number) ?? 0.7,
              temperature: (params.temperature as number) ?? 3.0,
              discount: (params.discount as number) ?? 0.99,
              learning_rate: (params.learning_rate as number) ?? 3e-4,
              soft_target_tau: 0.005,
            });
            result = { success: true, ...created };
            break;
          }

          case "iql_train": {
            const engine = await getEngine("iql") as typeof import("../../engines/IQLEngine.js").iqlEngine;
            const trainResult = engine.train(params.policy_id as string, {
              states: params.states as number[][],
              actions: params.actions as number[][],
              rewards: params.rewards as number[],
              next_states: params.next_states as number[][],
              dones: params.dones as boolean[],
            });
            result = { success: true, ...trainResult };
            break;
          }

          case "iql_infer": {
            const engine = await getEngine("iql") as typeof import("../../engines/IQLEngine.js").iqlEngine;
            const inferResult = engine.infer({
              policy_id: params.policy_id as string,
              state: params.state as number[],
              return_distribution: (params.return_distribution as boolean) ?? false,
            });
            result = { success: true, ...inferResult };
            break;
          }

          case "maxent_irl_create": {
            const engine = await getEngine("maxEntIRL") as typeof import("../../engines/MaxEntIRLEngine.js").maxEntIRLEngine;
            const created = engine.createModel({
              reward_model_id: params.reward_model_id as string,
              state_dim: params.state_dim as number,
              action_dim: params.action_dim as number,
              hidden_dims: (params.hidden_dims as number[]) ?? [128, 128],
              learning_rate: (params.learning_rate as number) ?? 1e-3,
              entropy_weight: (params.entropy_weight as number) ?? 0.01,
              gradient_penalty: 0.0,
            });
            result = { success: true, ...created };
            break;
          }

          case "maxent_irl_train": {
            const engine = await getEngine("maxEntIRL") as typeof import("../../engines/MaxEntIRLEngine.js").maxEntIRLEngine;
            const trainResult = engine.train({
              reward_model_id: params.reward_model_id as string,
              demonstrations: params.demonstrations as Array<{
                demo_id: string;
                state: number[];
                action: number[];
                source: "operator_override" | "program_archive" | "expert_annotation" | "successful_job";
                confidence: number;
              }>,
              policy_samples: (params.policy_samples as Array<{ state: number[]; action: number[] }>) ?? [],
              epochs: (params.epochs as number) ?? 100,
            });
            result = { success: true, ...trainResult };
            break;
          }

          case "maxent_irl_reward": {
            const engine = await getEngine("maxEntIRL") as typeof import("../../engines/MaxEntIRLEngine.js").maxEntIRLEngine;
            const rewardResult = engine.getReward({
              reward_model_id: params.reward_model_id as string,
              state: params.state as number[],
              action: params.action as number[],
            });
            result = { success: true, ...rewardResult };
            break;
          }

          case "safety_shield_create": {
            const engine = await getEngine("safetyShield") as typeof import("../../engines/SafetyShieldEngine.js").safetyShieldEngine;
            const created = engine.createShield({
              shield_id: params.shield_id as string,
              constraints: (params.constraints as Array<{
                constraint_id: string;
                type: "force_limit" | "spindle_load" | "tool_deflection" | "thermal_limit" | "collision_margin" | "tool_life_reserve" | "vibration_limit" | "power_limit";
                parameter: string;
                limit_value: number;
                limit_type: "max" | "min";
                probability_threshold?: number;
                severity?: "soft" | "hard";
                physics_model?: "kienzle" | "taylor" | "thermal" | "deflection" | "none";
              }>).map(c => ({
                ...c,
                probability_threshold: c.probability_threshold ?? 1e-4,
                severity: c.severity ?? "hard",
                physics_model: c.physics_model ?? "none",
              })),
              cbf_gamma: (params.cbf_gamma as number) ?? 0.1,
              slack_penalty: 1000.0,
              uncertainty_model: "gaussian",
              uncertainty_scale: 1.0,
            });
            result = { success: true, ...created };
            break;
          }

          case "safety_shield_evaluate": {
            const engine = await getEngine("safetyShield") as typeof import("../../engines/SafetyShieldEngine.js").safetyShieldEngine;
            const evalResult = engine.evaluate({
              shield_id: params.shield_id as string,
              state: params.state as Record<string, number>,
              proposed_action: params.proposed_action as Record<string, number>,
              material_iso: params.material_iso as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
            });
            result = { success: true, ...evalResult };
            break;
          }

          case "offline_rl_train": {
            const engine = await getEngine("offlineRL") as typeof import("../../engines/OfflineRLOrchestratorEngine.js").offlineRLOrchestratorEngine;
            const trainResult = engine.train({
              policy_id: params.policy_id as string,
              domain: params.domain as "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder" | "general",
              epochs: (params.epochs as number) ?? 100,
              batch_size: (params.batch_size as number) ?? 256,
              eval_interval: (params.eval_interval as number) ?? 10,
              demonstration_source: (params.demonstration_source as "operator_overrides" | "program_archive" | "both") ?? "both",
            });
            result = { success: true, ...trainResult };
            break;
          }

          case "offline_rl_infer": {
            const engine = await getEngine("offlineRL") as typeof import("../../engines/OfflineRLOrchestratorEngine.js").offlineRLOrchestratorEngine;
            const inferResult = engine.infer({
              policy_id: params.policy_id as string,
              state: params.state as Record<string, number>,
              apply_safety_shield: (params.apply_safety_shield as boolean) ?? true,
              material_iso: params.material_iso as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
            });
            result = { success: true, ...inferResult };
            break;
          }

          // ─── U-ML-01 Physics Consistency Gate Actions ───────────────────────────

          case "physics_gate_validate": {
            const engine = await getEngine("physicsGate") as typeof import("../../engines/CADPhysicsConsistencyGateEngine.js").cadPhysicsConsistencyGateEngine;
            const validateResult = engine.validate({
              iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H",
              ap_mm: params.ap_mm as number,
              fz_mm: params.fz_mm as number,
              vc_m_min: params.vc_m_min as number,
              tool_diameter_mm: params.tool_diameter_mm as number,
              tool_stickout_mm: params.tool_stickout_mm as number,
              flute_count: params.flute_count as number,
              ae_mm: params.ae_mm as number | undefined,
              rpm: params.rpm as number | undefined,
              machine_limits: params.machine_limits as Record<string, number> | undefined,
              cad_app: params.cad_app as string | undefined,
              operation: params.operation as string | undefined,
            });
            result = { success: true, ...validateResult };
            break;
          }

          case "physics_gate_batch": {
            const engine = await getEngine("physicsGate") as typeof import("../../engines/CADPhysicsConsistencyGateEngine.js").cadPhysicsConsistencyGateEngine;
            const batchResult = engine.validateBatch({
              items: params.items as Array<{
                iso_group: "P" | "M" | "K" | "N" | "S" | "H";
                ap_mm: number;
                fz_mm: number;
                vc_m_min: number;
                tool_diameter_mm: number;
                tool_stickout_mm: number;
                flute_count: number;
                ae_mm?: number;
              }>,
              stop_on_first_failure: (params.stop_on_first_failure as boolean) ?? false,
            });
            result = { success: true, ...batchResult };
            break;
          }

          case "physics_gate_constants": {
            const engine = await getEngine("physicsGate") as typeof import("../../engines/CADPhysicsConsistencyGateEngine.js").cadPhysicsConsistencyGateEngine;
            const constants = engine.getPhysicsConstants(params.iso_group as "P" | "M" | "K" | "N" | "S" | "H");
            result = { success: true, iso_group: params.iso_group, ...constants };
            break;
          }

          // ─── U-LEARN-10 Synaptic Intelligence Actions ───────────────────────────

          case "si_register": {
            const engine = await getEngine("si") as typeof import("../../engines/SynapticIntelligenceEngine.js").synapticIntelligenceEngine;
            const registered = engine.register({
              model_id: params.model_id as string,
              parameter_count: params.parameter_count as number,
              importance_decay: (params.importance_decay as number) ?? 0.99,
              damping: (params.damping as number) ?? 0.1,
            });
            result = { success: true, ...registered };
            break;
          }

          case "si_update": {
            const engine = await getEngine("si") as typeof import("../../engines/SynapticIntelligenceEngine.js").synapticIntelligenceEngine;
            const updated = engine.update({
              model_id: params.model_id as string,
              gradients: params.gradients as number[],
              parameter_deltas: params.parameter_deltas as number[],
            });
            result = { success: true, ...updated };
            break;
          }

          case "si_consolidate": {
            const engine = await getEngine("si") as typeof import("../../engines/SynapticIntelligenceEngine.js").synapticIntelligenceEngine;
            const consolidated = engine.consolidate({
              model_id: params.model_id as string,
              task_id: params.task_id as string,
            });
            result = { success: true, ...consolidated };
            break;
          }

          case "si_loss": {
            const engine = await getEngine("si") as typeof import("../../engines/SynapticIntelligenceEngine.js").synapticIntelligenceEngine;
            const lossResult = engine.computeLoss({
              model_id: params.model_id as string,
              current_params: params.current_params as number[],
              lambda_si: (params.lambda_si as number) ?? 1.0,
            });
            result = { success: true, ...lossResult };
            break;
          }

          // ─── U-LEARN-10 DER++ Actions ───────────────────────────────────────────

          case "der_create": {
            const engine = await getEngine("derPP") as typeof import("../../engines/DERPlusPlusEngine.js").derPlusPlusEngine;
            const created = engine.createBuffer({
              buffer_id: params.buffer_id as string,
              max_size: (params.max_size as number) ?? 5000,
              alpha: (params.alpha as number) ?? 0.5,
              beta: (params.beta as number) ?? 0.5,
            });
            result = { success: true, ...created };
            break;
          }

          case "der_add": {
            const engine = await getEngine("derPP") as typeof import("../../engines/DERPlusPlusEngine.js").derPlusPlusEngine;
            const exp = params.experience as { experience_id: string; input: number[]; target: number[]; logits: number[]; task_id: string };
            const added = engine.addExperience(params.buffer_id as string, {
              experience_id: exp.experience_id,
              input: exp.input,
              target: exp.target,
              logits: exp.logits,
              task_id: exp.task_id,
            });
            result = { success: true, ...added };
            break;
          }

          case "der_sample": {
            const engine = await getEngine("derPP") as typeof import("../../engines/DERPlusPlusEngine.js").derPlusPlusEngine;
            const sampled = engine.sample({
              buffer_id: params.buffer_id as string,
              batch_size: (params.batch_size as number) ?? 32,
              task_id: params.task_id as string | undefined,
            });
            result = { success: true, ...sampled };
            break;
          }

          case "der_loss": {
            const engine = await getEngine("derPP") as typeof import("../../engines/DERPlusPlusEngine.js").derPlusPlusEngine;
            const lossResult = engine.computeLoss({
              buffer_id: params.buffer_id as string,
              current_logits: params.current_logits as number[][],
              sample_indices: params.sample_indices as number[],
            });
            result = { success: true, ...lossResult };
            break;
          }

          // ─── U-LEARN-10 TTA Actions ─────────────────────────────────────────────

          case "tta_configure": {
            const engine = await getEngine("tta") as typeof import("../../engines/TestTimeAdaptationEngine.js").testTimeAdaptationEngine;
            const configured = engine.configure({
              model_id: params.model_id as string,
              entropy_threshold: (params.entropy_threshold as number) ?? 0.4,
              diversity_threshold: (params.diversity_threshold as number) ?? 0.05,
              adaptation_lr: (params.adaptation_lr as number) ?? 1e-4,
              adapt_bn: (params.adapt_bn as boolean) ?? true,
              adapt_lora_a: (params.adapt_lora_a as boolean) ?? true,
              fisher_alpha: (params.fisher_alpha as number) ?? 2000,
            });
            result = { success: true, ...configured };
            break;
          }

          case "tta_adapt": {
            const engine = await getEngine("tta") as typeof import("../../engines/TestTimeAdaptationEngine.js").testTimeAdaptationEngine;
            const adaptResult = engine.adapt({
              model_id: params.model_id as string,
              sample_logits: params.sample_logits as number[],
              sample_features: params.sample_features as number[] | undefined,
            });
            result = { success: true, ...adaptResult };
            break;
          }

          case "tta_reset": {
            const engine = await getEngine("tta") as typeof import("../../engines/TestTimeAdaptationEngine.js").testTimeAdaptationEngine;
            const reset = engine.reset(params.model_id as string);
            result = { success: reset, model_id: params.model_id };
            break;
          }

          case "tta_stats": {
            const engine = await getEngine("tta") as typeof import("../../engines/TestTimeAdaptationEngine.js").testTimeAdaptationEngine;
            const stats = engine.getStats(params.model_id as string);
            result = { success: stats !== null, stats };
            break;
          }

          // ─── U-LEARN-10 Cascade Actions ─────────────────────────────────────────

          case "cascade_create": {
            const engine = await getEngine("cascade") as typeof import("../../engines/LearningCascadeEngine.js").learningCascadeEngine;
            const created = engine.createGraph({
              graph_id: params.graph_id as string,
              nodes: params.nodes as Array<{ node_id: string; node_type: "lora_finetune" | "tribal_kb" | "playbook_rule" | "feature_store"; threshold_count: number; auto_promote: boolean }>,
              edges: params.edges as Array<{ from: string; to: string; weight: number }>,
            });
            result = { success: true, ...created };
            break;
          }

          case "cascade_propagate": {
            const engine = await getEngine("cascade") as typeof import("../../engines/LearningCascadeEngine.js").learningCascadeEngine;
            const propagated = engine.propagate({
              graph_id: params.graph_id as string,
              outcome_id: params.outcome_id as string,
              domain: params.domain as string,
              material: params.material as string | undefined,
              machine: params.machine as string | undefined,
              delta: params.delta as Record<string, number>,
              confidence: params.confidence as number,
            });
            result = { success: true, ...propagated };
            break;
          }

          case "cascade_stats": {
            const engine = await getEngine("cascade") as typeof import("../../engines/LearningCascadeEngine.js").learningCascadeEngine;
            const stats = engine.getStats(params.graph_id as string);
            result = { success: stats !== null, stats };
            break;
          }

          case "cascade_pending": {
            const engine = await getEngine("cascade") as typeof import("../../engines/LearningCascadeEngine.js").learningCascadeEngine;
            const pending = engine.getPendingOutcomes(params.graph_id as string, params.node_id as string);
            result = { success: true, pending_outcomes: pending };
            break;
          }

          // ─── U-LEARN-10 FedLoRA Actions ─────────────────────────────────────────

          case "fedlora_aggregate": {
            const engine = await getEngine("fedLoRA") as typeof import("../../engines/FederatedLoRAEngine.js").federatedLoRAEngine;
            const aggregated = engine.aggregate({
              round_id: params.round_id as string,
              clients: params.clients as Array<{
                client_id: string;
                customer_id: string;
                material_class: string;
                operation_type: string;
                machine_class: string;
                lora_a_weights: number[][];
                sample_count: number;
              }>,
              aggregation_method: (params.aggregation_method as "fedavg" | "fedprox" | "scaffold") ?? "fedavg",
              mu: (params.mu as number) ?? 0.01,
            });
            result = { success: true, ...aggregated };
            break;
          }

          case "fedlora_weights": {
            const engine = await getEngine("fedLoRA") as typeof import("../../engines/FederatedLoRAEngine.js").federatedLoRAEngine;
            const weights = engine.getGlobalWeights(
              params.material_class as string,
              params.operation_type as string,
              params.machine_class as string,
            );
            result = { success: weights !== null, global_weights: weights };
            break;
          }

          case "fedlora_stats": {
            const engine = await getEngine("fedLoRA") as typeof import("../../engines/FederatedLoRAEngine.js").federatedLoRAEngine;
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          // ─── U-LEARN-10 PER Actions ─────────────────────────────────────────────

          case "per_create": {
            const engine = await getEngine("per") as typeof import("../../engines/PrioritizedReplayBufferEngine.js").prioritizedReplayBufferEngine;
            const created = engine.createBuffer({
              buffer_id: params.buffer_id as string,
              max_size: (params.max_size as number) ?? 10000,
              alpha: (params.alpha as number) ?? 0.6,
              beta_start: (params.beta_start as number) ?? 0.4,
              beta_end: (params.beta_end as number) ?? 1.0,
              beta_frames: (params.beta_frames as number) ?? 100000,
              epsilon: (params.epsilon as number) ?? 1e-6,
            });
            result = { success: true, ...created };
            break;
          }

          case "per_add": {
            const engine = await getEngine("per") as typeof import("../../engines/PrioritizedReplayBufferEngine.js").prioritizedReplayBufferEngine;
            const exp = params.experience as { experience_id: string; state: number[]; action: number[]; reward: number; next_state: number[]; done: boolean; td_error?: number };
            const added = engine.add(params.buffer_id as string, {
              experience_id: exp.experience_id,
              state: exp.state,
              action: exp.action,
              reward: exp.reward,
              next_state: exp.next_state,
              done: exp.done,
              td_error: exp.td_error,
            });
            result = { success: true, ...added };
            break;
          }

          case "per_sample": {
            const engine = await getEngine("per") as typeof import("../../engines/PrioritizedReplayBufferEngine.js").prioritizedReplayBufferEngine;
            const sampled = engine.sample(params.buffer_id as string, (params.batch_size as number) ?? 32);
            result = { success: true, ...sampled };
            break;
          }

          case "per_update_priorities": {
            const engine = await getEngine("per") as typeof import("../../engines/PrioritizedReplayBufferEngine.js").prioritizedReplayBufferEngine;
            const updated = engine.updatePriorities(
              params.buffer_id as string,
              params.indices as number[],
              params.td_errors as number[],
            );
            result = { success: true, ...updated };
            break;
          }

          case "per_stats": {
            const engine = await getEngine("per") as typeof import("../../engines/PrioritizedReplayBufferEngine.js").prioritizedReplayBufferEngine;
            const stats = engine.getStats(params.buffer_id as string);
            result = { success: stats !== null, stats };
            break;
          }

          // ─── U-LEARN-10 Transfer Actions ────────────────────────────────────────

          case "transfer_register": {
            const engine = await getEngine("crossTransfer") as typeof import("../../engines/CrossCustomerPolicyTransferEngine.js").crossCustomerPolicyTransferEngine;
            const registered = engine.registerSource({
              source_customer: params.source_customer as string,
              source_policy_id: params.source_policy_id as string,
              material_class: params.material_class as string,
              operation_type: params.operation_type as string,
              machine_class: params.machine_class as string,
              performance_score: params.performance_score as number,
              sample_count: params.sample_count as number,
            });
            result = { success: true, ...registered };
            break;
          }

          case "transfer_execute": {
            const engine = await getEngine("crossTransfer") as typeof import("../../engines/CrossCustomerPolicyTransferEngine.js").crossCustomerPolicyTransferEngine;
            const transferred = engine.transfer({
              target_customer: params.target_customer as string,
              material_class: params.material_class as string,
              operation_type: params.operation_type as string,
              machine_class: params.machine_class as string,
              min_similarity: (params.min_similarity as number) ?? 0.7,
              max_sources: (params.max_sources as number) ?? 5,
            });
            result = { success: true, ...transferred };
            break;
          }

          case "transfer_find": {
            const engine = await getEngine("crossTransfer") as typeof import("../../engines/CrossCustomerPolicyTransferEngine.js").crossCustomerPolicyTransferEngine;
            const similar = engine.findSimilar({
              target_customer: params.target_customer as string,
              material_class: params.material_class as string,
              operation_type: params.operation_type as string,
              machine_class: params.machine_class as string,
              min_similarity: (params.min_similarity as number) ?? 0.7,
              max_sources: (params.max_sources as number) ?? 5,
            });
            result = { success: true, similar_policies: similar };
            break;
          }

          case "transfer_history": {
            const engine = await getEngine("crossTransfer") as typeof import("../../engines/CrossCustomerPolicyTransferEngine.js").crossCustomerPolicyTransferEngine;
            const history = engine.getTransferHistory(params.target_customer as string | undefined);
            result = { success: true, transfer_history: history };
            break;
          }

          // ─── U-LEARN-10 ContinualLoRA Actions ───────────────────────────────────

          case "continual_lora_create": {
            const engine = await getEngine("continualLoRA") as typeof import("../../engines/ContinualLoRAEngine.js").continualLoRAEngine;
            const created = engine.createAdapter({
              adapter_id: params.adapter_id as string,
              domain: params.domain as "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder",
              rank: (params.rank as number) ?? 8,
              alpha: (params.alpha as number) ?? 16,
              ewc_lambda: (params.ewc_lambda as number) ?? 1000,
              si_damping: (params.si_damping as number) ?? 0.1,
              der_buffer_size: (params.der_buffer_size as number) ?? 5000,
              der_alpha: (params.der_alpha as number) ?? 0.5,
              der_beta: (params.der_beta as number) ?? 0.5,
            });
            result = { success: true, ...created };
            break;
          }

          case "continual_lora_train": {
            const engine = await getEngine("continualLoRA") as typeof import("../../engines/ContinualLoRAEngine.js").continualLoRAEngine;
            const trained = engine.train({
              adapter_id: params.adapter_id as string,
              task_id: params.task_id as string,
              experiences: params.experiences as Array<{ input: number[]; target: number[]; logits?: number[] }>,
              epochs: (params.epochs as number) ?? 10,
              batch_size: (params.batch_size as number) ?? 32,
              use_ewc: (params.use_ewc as boolean) ?? true,
              use_si: (params.use_si as boolean) ?? true,
              use_der: (params.use_der as boolean) ?? true,
            });
            result = { success: true, ...trained };
            break;
          }

          case "continual_lora_state": {
            const engine = await getEngine("continualLoRA") as typeof import("../../engines/ContinualLoRAEngine.js").continualLoRAEngine;
            const state = engine.getState(params.adapter_id as string);
            result = { success: state !== null, state };
            break;
          }

          case "continual_lora_list": {
            const engine = await getEngine("continualLoRA") as typeof import("../../engines/ContinualLoRAEngine.js").continualLoRAEngine;
            const adapters = engine.listAdapters();
            result = { success: true, adapters };
            break;
          }

          // ─── U-LEARN-11 Prototypical Network Actions ────────────────────────────

          case "proto_compute": {
            const engine = await getEngine("protoNet") as typeof import("../../engines/PrototypicalNetworkEngine.js").prototypicalNetworkEngine;
            const computed = engine.computePrototypes({
              task_id: params.task_id as string,
              domain: params.domain as "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder",
              examples: params.examples as Array<{ class_id: string; features: number[]; target: number }>,
            });
            result = { success: true, ...computed };
            break;
          }

          case "proto_predict": {
            const engine = await getEngine("protoNet") as typeof import("../../engines/PrototypicalNetworkEngine.js").prototypicalNetworkEngine;
            const predicted = engine.predict({
              task_id: params.task_id as string,
              query_features: params.query_features as number[],
            });
            result = { success: true, ...predicted };
            break;
          }

          case "proto_state": {
            const engine = await getEngine("protoNet") as typeof import("../../engines/PrototypicalNetworkEngine.js").prototypicalNetworkEngine;
            const state = engine.getTaskState(params.task_id as string);
            result = { success: state !== null, state };
            break;
          }

          case "proto_clear": {
            const engine = await getEngine("protoNet") as typeof import("../../engines/PrototypicalNetworkEngine.js").prototypicalNetworkEngine;
            const cleared = engine.clearTask(params.task_id as string);
            result = { success: cleared, task_id: params.task_id };
            break;
          }

          case "proto_list": {
            const engine = await getEngine("protoNet") as typeof import("../../engines/PrototypicalNetworkEngine.js").prototypicalNetworkEngine;
            const tasks = engine.listTasks();
            result = { success: true, tasks };
            break;
          }

          // ─── U-LEARN-11 ProtoMAML Few-Shot Actions ──────────────────────────────

          case "protomaml_register": {
            const engine = await getEngine("protoMAML") as typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine;
            const registered = engine.register({
              config_id: params.config_id as string,
              domain: params.domain as "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "welder",
              inner_lr: (params.inner_lr as number) ?? 0.01,
              inner_steps: (params.inner_steps as number) ?? 5,
              meta_lr: (params.meta_lr as number) ?? 0.001,
              feature_dim: params.feature_dim as number,
              hidden_dim: (params.hidden_dim as number) ?? 8,
              use_proto_init: (params.use_proto_init as boolean) ?? true,
              regularization_lambda: (params.regularization_lambda as number) ?? 0.01,
            });
            result = { success: true, ...registered };
            break;
          }

          case "protomaml_adapt": {
            const engine = await getEngine("protoMAML") as typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine;
            const adapted = engine.adapt({
              config_id: params.config_id as string,
              customer_id: params.customer_id as string,
              material_class: params.material_class as string,
              support_set: params.support_set as Array<{ features: number[]; target: number }>,
              cache_adapted: (params.cache_adapted as boolean) ?? true,
            });
            result = { success: true, ...adapted };
            break;
          }

          case "protomaml_predict": {
            const engine = await getEngine("protoMAML") as typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine;
            const predicted = engine.predict({
              config_id: params.config_id as string,
              customer_id: params.customer_id as string,
              material_class: params.material_class as string,
              query_features: params.query_features as number[],
              use_cached: (params.use_cached as boolean) ?? true,
            });
            result = { success: true, ...predicted };
            break;
          }

          case "protomaml_cache_stats": {
            const engine = await getEngine("protoMAML") as typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine;
            const stats = engine.getCacheStats();
            result = { success: true, ...stats };
            break;
          }

          case "protomaml_clear_cache": {
            const engine = await getEngine("protoMAML") as typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine;
            const cleared = engine.clearCustomerCache(params.customer_id as string);
            result = { success: true, cleared_count: cleared, customer_id: params.customer_id };
            break;
          }

          case "protomaml_list_configs": {
            const engine = await getEngine("protoMAML") as typeof import("../../engines/ProtoMAMLFewShotEngine.js").protoMAMLFewShotEngine;
            const configs = engine.listConfigs();
            result = { success: true, configs };
            break;
          }

          // Ollama task offloading
          case "offload_decide": {
            const engine = await getEngine("offloader") as typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine;
            const decision = await engine.decide(params.task as string);
            result = { success: true, ...decision };
            break;
          }

          case "offload_execute": {
            const engine = await getEngine("offloader") as typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine;
            const task = params.task as string;
            const systemPrompt = (params.system_prompt as string) || "You are a helpful assistant for a CNC manufacturing platform.";
            const decision = await engine.decide(task);
            if (!decision.offloadable || !decision.targetModel) {
              result = { success: false, reason: decision.reason, offloadable: false };
              break;
            }
            const model = (params.model as string) || decision.targetModel;
            const execResult = await engine.executeOffloaded(task, systemPrompt, model);
            result = { success: execResult.success, result: execResult.result, latencyMs: execResult.latencyMs, model };
            break;
          }

          case "offload_stats": {
            const engine = await getEngine("offloader") as typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine;
            const models = engine.getInstalledModels();
            const categories = engine.getSupportedCategories();
            const available = await engine.checkOllamaAvailable();
            result = { success: true, ollamaAvailable: available, installedModels: models, supportedCategories: categories };
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-1: surface JM Die analyzer + learning + recipe engines
          case "jm_program_analyze": {
            const engine = await getEngine("jmAnalyzer") as typeof import("../../engines/JMDieProgramAnalyzerEngine.js").jmDieProgramAnalyzerEngine;
            const analysis = engine.analyzeProgram(params.file_path as string);
            result = analysis === null
              ? { success: false, reason: "analyzer returned null (file unreadable or unsupported)" }
              : { success: true, analysis };
            break;
          }

          case "jm_pattern_query": {
            const engine = await getEngine("jmLearning") as typeof import("../../engines/JMDieProgramLearningEngine.js").jmDieProgramLearningEngine;
            const patterns = await engine.query({
              machineType: params.machineType as string | undefined,
              category: params.category as string | undefined,
              minFrequency: params.minFrequency as number | undefined,
              limit: (params.limit as number) ?? 20,
            });
            result = { success: true, count: patterns.length, patterns };
            break;
          }

          case "jm_recipe_retrieve": {
            const engine = await getEngine("jmRecipe") as typeof import("../../engines/JMDieRecipeRetrieverEngine.js").jmDieRecipeRetrieverEngine;
            const retrieved = engine.retrieve({
              material: params.material as string | undefined,
              iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
              operation: params.operation as
                | "roughing" | "finishing" | "semi_finishing" | "drilling" | "threading"
                | "grooving" | "parting" | "facing" | "boring" | "tapping"
                | undefined,
              machine_type: params.machine_type as
                | "lathe" | "mill" | "wire_edm" | "sinker_edm" | "grinder"
                | undefined,
              customer: params.customer as string | undefined,
              tool_type: params.tool_type as string | undefined,
              tool_diameter_mm: params.tool_diameter_mm as number | undefined,
              tolerance_mm: params.tolerance_mm as number | undefined,
            });
            result = { success: true, retrieved };
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
