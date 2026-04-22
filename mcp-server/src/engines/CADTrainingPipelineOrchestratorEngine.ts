/**
 * CADTrainingPipelineOrchestratorEngine — CAD-COMPLETE-MS0/U-CADC19
 *
 * End-to-end orchestration for CAD ML training pipeline.
 * Single entry point: scan → ingest → tokenize → embed → index → validate.
 *
 * Composes:
 *   - CADTrainingCorpusOrchestratorEngine (U-CADC17) for scanning
 *   - CADEmbeddingIndexOrchestratorEngine (U-CADC18) for embedding/indexing
 *   - Progress tracking with stage-by-stage timing
 *
 * Output: Ready-to-use index for similarity search + validation report.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  cadTrainingCorpusOrchestratorEngine,
  type OrchestrationResult as CorpusResult,
} from "./CADTrainingCorpusOrchestratorEngine.js";
import {
  cadEmbeddingIndexOrchestratorEngine,
  type CADIndexStats,
} from "./CADEmbeddingIndexOrchestratorEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PipelineConfig {
  rootPath: string;
  outputDir?: string;
  maxFiles?: number;
  excludePatterns?: string[];
  indexType?: "flat" | "vptree";
  validateSamples?: number;
  skipValidation?: boolean;
}

export interface PipelineStage {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  elapsedMs?: number;
  result?: unknown;
  error?: string;
}

export interface ValidationResult {
  sampleSize: number;
  avgSimilarity: number;
  minSimilarity: number;
  maxSimilarity: number;
  extensionCoverage: Record<string, number>;
  passed: boolean;
}

export interface PipelineResult {
  pipelineId: string;
  status: "completed" | "failed";
  stages: PipelineStage[];
  corpusPath: string;
  indexStats: CADIndexStats;
  validation?: ValidationResult;
  totalElapsedMs: number;
  startedAt: string;
  completedAt: string;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  rootPath: z.string().min(1).describe("Root directory to scan for CAD files"),
  outputDir: z.string().optional().describe("Output directory for corpus files"),
  maxFiles: z.number().int().positive().max(100_000).default(50_000),
  excludePatterns: z.array(z.string()).default(["BACKUP", "OLD", "ARCHIVE", "TEMP", "node_modules", ".git"]),
  indexType: z.enum(["flat", "vptree"]).default("vptree"),
  validateSamples: z.number().int().positive().max(100).default(10),
  skipValidation: z.boolean().default(false),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function generatePipelineId(): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `CADPIPE-${ts}-${rand}`;
}

function createStage(name: string): PipelineStage {
  return { name, status: "pending" };
}

function startStage(stage: PipelineStage): void {
  stage.status = "running";
  stage.startedAt = new Date().toISOString();
}

function completeStage(stage: PipelineStage, result?: unknown): void {
  stage.status = "completed";
  stage.completedAt = new Date().toISOString();
  stage.elapsedMs = Date.now() - new Date(stage.startedAt!).getTime();
  stage.result = result;
}

function failStage(stage: PipelineStage, error: string): void {
  stage.status = "failed";
  stage.completedAt = new Date().toISOString();
  stage.elapsedMs = stage.startedAt ? Date.now() - new Date(stage.startedAt).getTime() : 0;
  stage.error = error;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADTrainingPipelineOrchestratorEngine {
  private defaultOutputDir: string;

  constructor() {
    this.defaultOutputDir = path.resolve(process.cwd(), "mcp-server/data/state");
  }

  getInfo() {
    return {
      name: "CADTrainingPipelineOrchestratorEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "End-to-end orchestration for CAD ML training pipeline. " +
        "Scan → ingest → tokenize → embed → index → validate.",
    };
  }

  getCapabilities() {
    return [
      { name: "run", description: "Run full training pipeline", actions: ["cad_pipeline_run"] },
      { name: "validate", description: "Validate existing index", actions: ["cad_pipeline_validate"] },
      { name: "status", description: "Get pipeline status", actions: ["cad_pipeline_status"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const result = ConfigSchema.safeParse(input);
    if (!result.success) {
      return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    return null;
  }

  /**
   * Run the full training pipeline.
   */
  run(config: PipelineConfig): PipelineResult {
    const pipelineStart = Date.now();
    const startedAt = new Date().toISOString();
    const pipelineId = generatePipelineId();
    const validated = ConfigSchema.parse(config);
    const outputDir = validated.outputDir ?? this.defaultOutputDir;

    const stages: PipelineStage[] = [
      createStage("scan"),
      createStage("ingest"),
      createStage("embed"),
      createStage("index"),
      ...(validated.skipValidation ? [] : [createStage("validate")]),
    ];

    let corpusResult: CorpusResult | null = null;
    let indexStats: CADIndexStats = {
      totalEntries: 0,
      byExtension: {},
      indexType: "flat",
      embeddingDim: 384,
      cacheStats: { size: 0, memoryBytes: 0 },
    };
    let validationResult: ValidationResult | undefined;
    let corpusPath = "";

    try {
      // Stage 1: Scan & Ingest (combined in CADTrainingCorpusOrchestratorEngine)
      const scanStage = stages.find((s) => s.name === "scan")!;
      startStage(scanStage);
      const files = cadTrainingCorpusOrchestratorEngine.scanOnly({
        rootPath: validated.rootPath,
        maxFiles: validated.maxFiles,
        excludePatterns: validated.excludePatterns,
      });
      completeStage(scanStage, { filesFound: files.length });

      // Stage 2: Ingest to JSONL
      const ingestStage = stages.find((s) => s.name === "ingest")!;
      startStage(ingestStage);
      corpusPath = path.join(outputDir, `CAD_CORPUS_${pipelineId}.jsonl`);
      corpusResult = cadTrainingCorpusOrchestratorEngine.orchestrate({
        rootPath: validated.rootPath,
        maxFiles: validated.maxFiles,
        excludePatterns: validated.excludePatterns,
        outputPath: corpusPath,
      });
      completeStage(ingestStage, {
        filesScanned: corpusResult.filesScanned,
        entriesWritten: corpusResult.entriesWritten,
        duplicatesRemoved: corpusResult.duplicatesRemoved,
      });

      // Stage 3: Embed (builds embeddings from corpus)
      const embedStage = stages.find((s) => s.name === "embed")!;
      startStage(embedStage);
      // Embedding happens during index ingestion
      completeStage(embedStage, { corpusPath });

      // Stage 4: Index (VP-tree or flat)
      const indexStage = stages.find((s) => s.name === "index")!;
      startStage(indexStage);
      const indexResult = cadEmbeddingIndexOrchestratorEngine.ingest(corpusPath, {
        indexType: validated.indexType,
      });
      indexStats = cadEmbeddingIndexOrchestratorEngine.stats();
      completeStage(indexStage, {
        entriesIngested: indexResult.entriesIngested,
        indexType: indexResult.indexType,
      });

      // Stage 5: Validate (optional)
      if (!validated.skipValidation) {
        const validateStage = stages.find((s) => s.name === "validate")!;
        startStage(validateStage);
        validationResult = this.validateIndex(validated.validateSamples);
        completeStage(validateStage, validationResult);
      }

      return {
        pipelineId,
        status: "completed",
        stages,
        corpusPath,
        indexStats,
        validation: validationResult,
        totalElapsedMs: Date.now() - pipelineStart,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const runningStage = stages.find((s) => s.status === "running");
      if (runningStage) {
        failStage(runningStage, error instanceof Error ? error.message : String(error));
      }
      return {
        pipelineId,
        status: "failed",
        stages,
        corpusPath,
        indexStats,
        totalElapsedMs: Date.now() - pipelineStart,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate the current index by sampling similarity searches.
   */
  validateIndex(sampleSize: number = 10): ValidationResult {
    const stats = cadEmbeddingIndexOrchestratorEngine.stats();
    if (stats.totalEntries === 0) {
      return {
        sampleSize: 0,
        avgSimilarity: 0,
        minSimilarity: 0,
        maxSimilarity: 0,
        extensionCoverage: {},
        passed: false,
      };
    }

    const similarities: number[] = [];
    const extensionCoverage: Record<string, number> = {};

    // Sample random queries
    const queries = [
      "bracket mount assembly",
      "flange connector",
      "housing enclosure",
      "shaft coupling",
      "gear assembly",
      "plate fixture",
      "tube fitting",
      "valve body",
      "bearing support",
      "motor mount",
    ].slice(0, Math.min(sampleSize, 10));

    for (const query of queries) {
      const results = cadEmbeddingIndexOrchestratorEngine.query({ query, k: 3 });
      for (const r of results) {
        similarities.push(1 - r.distance); // Convert distance to similarity
        extensionCoverage[r.ext] = (extensionCoverage[r.ext] ?? 0) + 1;
      }
    }

    if (similarities.length === 0) {
      return {
        sampleSize,
        avgSimilarity: 0,
        minSimilarity: 0,
        maxSimilarity: 0,
        extensionCoverage,
        passed: false,
      };
    }

    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const minSimilarity = Math.min(...similarities);
    const maxSimilarity = Math.max(...similarities);

    return {
      sampleSize,
      avgSimilarity,
      minSimilarity,
      maxSimilarity,
      extensionCoverage,
      passed: avgSimilarity > 0 && stats.totalEntries > 0,
    };
  }

  /**
   * Get status of pipeline components.
   */
  status(): { corpus: boolean; index: boolean; stats: CADIndexStats } {
    const stats = cadEmbeddingIndexOrchestratorEngine.stats();
    return {
      corpus: stats.totalEntries > 0,
      index: stats.totalEntries > 0,
      stats,
    };
  }

  /**
   * Clear all pipeline state.
   */
  clear(): { entriesCleared: number; cacheCleared: number } {
    return cadEmbeddingIndexOrchestratorEngine.clear();
  }
}

export const cadTrainingPipelineOrchestratorEngine = new CADTrainingPipelineOrchestratorEngine();
