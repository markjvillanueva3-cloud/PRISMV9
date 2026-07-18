/**
 * PDFHandbookBatchProcessorEngine.ts
 *
 * PDF-EXT-MS0 U-PDF05: Handbook Batch Processing
 *
 * Orchestrates batch processing of all PDF sources:
 * - Machinery's Handbook
 * - Manufacturing Engineering textbooks
 * - Vendor catalogs (Sandvik, Kennametal, etc.)
 * - MIT course materials
 * - Manufacturer handbooks
 *
 * Aggregates extracted data into registry-ready format.
 *
 * @module engines/PDFHandbookBatchProcessorEngine
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/Logger.js";
import {
  pdfSourceRegistryEngine,
  type PDFSource,
  type PDFSourceCategory,
} from "./PDFSourceRegistryEngine.js";
import {
  pdfTableExtractionEngine,
  type ExtractedTable,
} from "./PDFTableExtractionEngine.js";
import {
  pdfFormulaExtractionEngine,
  type ExtractedFormula,
} from "./PDFFormulaExtractionEngine.js";
import {
  pdfMaterialPropertyExtractionEngine,
  type ExtractedMaterialProperty,
} from "./PDFMaterialPropertyExtractionEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BatchProcessingOptions {
  categories?: PDFSourceCategory[];
  maxConcurrent: number;
  extractTables: boolean;
  extractFormulas: boolean;
  extractMaterials: boolean;
  minConfidence: number;
  saveIntermediateResults: boolean;
  generateReport: boolean;
}

export interface BatchProcessingResult {
  id: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  sourcesProcessed: number;
  sourcesSkipped: number;
  sourcesFailed: number;
  totals: {
    tables: number;
    formulas: number;
    materials: number;
  };
  bySource: Map<string, SourceProcessingResult>;
  registryExports: {
    formulaRegistry: object[];
    materialRegistry: object[];
    knowledgeBase: object[];
  };
  errors: Array<{ sourceId: string; error: string }>;
}

export interface SourceProcessingResult {
  sourceId: string;
  sourceName: string;
  category: PDFSourceCategory;
  status: "success" | "partial" | "failed" | "skipped";
  tables: ExtractedTable[];
  formulas: ExtractedFormula[];
  materials: ExtractedMaterialProperty[];
  processingTime: number;
  error?: string;
}

export interface BatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentSource?: string;
  startedAt: Date;
  estimatedTimeRemaining?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH PROCESSOR ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class PDFHandbookBatchProcessorEngine {
  private outputDir: string;
  private progressCallbacks: Array<(progress: BatchProgress) => void> = [];
  private defaultOptions: BatchProcessingOptions = {
    maxConcurrent: 3,
    extractTables: true,
    extractFormulas: true,
    extractMaterials: true,
    minConfidence: 0.7,
    saveIntermediateResults: true,
    generateReport: true,
  };

  constructor() {
    this.outputDir = path.join(process.cwd(), "data", "pdf-sources", "batch-results");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });

    // Initialize sub-engines
    await Promise.all([
      pdfSourceRegistryEngine.init(),
      pdfTableExtractionEngine.init(),
      pdfFormulaExtractionEngine.init(),
      pdfMaterialPropertyExtractionEngine.init(),
    ]);

    logger.info("[PDFHandbookBatchProcessor] Engine initialized");
  }

  // ─── Progress Tracking ─────────────────────────────────────────────────

  onProgress(callback: (progress: BatchProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  private emitProgress(progress: BatchProgress): void {
    for (const cb of this.progressCallbacks) {
      try {
        cb(progress);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ─── Main Batch Processing ─────────────────────────────────────────────

  async processBatch(
    options?: Partial<BatchProcessingOptions>
  ): Promise<BatchProcessingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const batchId = `batch-${Date.now()}`;
    const startTime = Date.now();

    logger.info(`[PDFHandbookBatchProcessor] Starting batch ${batchId}`);

    // Get sources to process
    let sources: PDFSource[];
    if (opts.categories && opts.categories.length > 0) {
      sources = [];
      for (const category of opts.categories) {
        sources.push(...pdfSourceRegistryEngine.getByCategory(category));
      }
    } else {
      sources = pdfSourceRegistryEngine.getAll();
    }

    // Filter to only downloaded sources
    const downloadedSources = sources.filter((s) => s.status === "downloaded");

    const result: BatchProcessingResult = {
      id: batchId,
      startedAt: new Date().toISOString(),
      completedAt: "",
      duration: 0,
      sourcesProcessed: 0,
      sourcesSkipped: sources.length - downloadedSources.length,
      sourcesFailed: 0,
      totals: { tables: 0, formulas: 0, materials: 0 },
      bySource: new Map(),
      registryExports: {
        formulaRegistry: [],
        materialRegistry: [],
        knowledgeBase: [],
      },
      errors: [],
    };

    const progress: BatchProgress = {
      total: downloadedSources.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      startedAt: new Date(),
    };

    // Process sources with concurrency limit
    const semaphore = new Semaphore(opts.maxConcurrent);

    const processingPromises = downloadedSources.map(async (source) => {
      await semaphore.acquire();
      try {
        progress.currentSource = source.title;
        this.emitProgress({ ...progress });

        const sourceResult = await this.processSource(source, opts);
        result.bySource.set(source.id, sourceResult);

        if (sourceResult.status === "success" || sourceResult.status === "partial") {
          result.sourcesProcessed++;
          progress.succeeded++;

          // Aggregate totals
          result.totals.tables += sourceResult.tables.length;
          result.totals.formulas += sourceResult.formulas.length;
          result.totals.materials += sourceResult.materials.length;

          // Add to registry exports
          const formulaExports = await pdfFormulaExtractionEngine.exportToFormulaRegistry(
            sourceResult.formulas
          );
          result.registryExports.formulaRegistry.push(...formulaExports);

          const materialExports =
            await pdfMaterialPropertyExtractionEngine.exportToMaterialRegistry(
              sourceResult.materials
            );
          result.registryExports.materialRegistry.push(...materialExports);

          // Add tables to knowledge base
          for (const table of sourceResult.tables) {
            result.registryExports.knowledgeBase.push({
              id: table.id,
              type: "extracted_table",
              source: source.id,
              page: table.page,
              title: table.title,
              rows: table.rows,
              columns: table.columns,
              confidence: table.confidence,
              targetRegistry: table.targetRegistry,
            });
          }

          // Save intermediate results
          if (opts.saveIntermediateResults) {
            await this.saveSourceResult(batchId, sourceResult);
          }
        } else {
          result.sourcesFailed++;
          progress.failed++;
          if (sourceResult.error) {
            result.errors.push({ sourceId: source.id, error: sourceResult.error });
          }
        }

        progress.processed++;

        // Estimate remaining time
        const elapsed = Date.now() - startTime;
        const avgTimePerSource = elapsed / progress.processed;
        progress.estimatedTimeRemaining =
          avgTimePerSource * (progress.total - progress.processed);

        this.emitProgress({ ...progress });
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(processingPromises);

    // Finalize
    result.completedAt = new Date().toISOString();
    result.duration = Date.now() - startTime;

    // Generate report
    if (opts.generateReport) {
      await this.generateReport(result);
    }

    // Save final results
    await this.saveBatchResult(result);

    logger.info(
      `[PDFHandbookBatchProcessor] Batch ${batchId} complete: ` +
        `${result.sourcesProcessed} processed, ${result.sourcesFailed} failed, ` +
        `${result.totals.tables} tables, ${result.totals.formulas} formulas, ` +
        `${result.totals.materials} materials`
    );

    return result;
  }

  // ─── Single Source Processing ──────────────────────────────────────────

  private async processSource(
    source: PDFSource,
    options: BatchProcessingOptions
  ): Promise<SourceProcessingResult> {
    const startTime = Date.now();
    const result: SourceProcessingResult = {
      sourceId: source.id,
      sourceName: source.title,
      category: source.category,
      status: "success",
      tables: [],
      formulas: [],
      materials: [],
      processingTime: 0,
    };

    try {
      // Read PDF content (stub - in production would use pdf-parse)
      const content = await this.readPDFContent(source);

      if (!content) {
        result.status = "skipped";
        result.error = "No content available";
        return result;
      }

      // Extract tables
      if (options.extractTables) {
        try {
          result.tables = await pdfTableExtractionEngine.extractTables(source, {
            minConfidence: options.minConfidence,
          });
        } catch (e) {
          logger.warn(`[PDFHandbookBatchProcessor] Table extraction failed for ${source.id}: ${e}`);
          result.status = "partial";
        }
      }

      // Extract formulas
      if (options.extractFormulas) {
        try {
          result.formulas = await pdfFormulaExtractionEngine.extractFormulas(
            source.id,
            content.text,
            { minConfidence: options.minConfidence }
          );
        } catch (e) {
          logger.warn(`[PDFHandbookBatchProcessor] Formula extraction failed for ${source.id}: ${e}`);
          result.status = "partial";
        }
      }

      // Extract materials
      if (options.extractMaterials) {
        try {
          result.materials = await pdfMaterialPropertyExtractionEngine.extractMaterials(
            source.id,
            content.text,
            { minConfidence: options.minConfidence }
          );
        } catch (e) {
          logger.warn(`[PDFHandbookBatchProcessor] Material extraction failed for ${source.id}: ${e}`);
          result.status = "partial";
        }
      }

      // Check if anything was extracted
      const totalExtracted =
        result.tables.length + result.formulas.length + result.materials.length;
      if (totalExtracted === 0) {
        result.status = "partial";
        result.error = "No data extracted";
      }
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      logger.error(`[PDFHandbookBatchProcessor] Failed to process ${source.id}: ${result.error}`);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  // ─── PDF Content Reading ───────────────────────────────────────────────

  private async readPDFContent(
    source: PDFSource
  ): Promise<{ text: string; pages: number } | null> {
    if (!source.path) return null;

    try {
      // Check if file exists
      await fs.access(source.path);

      // In production, use pdf-parse library
      // For now, return stub indicating file is accessible
      const stats = await fs.stat(source.path);

      // Estimate pages from file size (rough: ~50KB per page)
      const estimatedPages = Math.ceil(stats.size / (50 * 1024));

      return {
        text: "", // Would be populated by pdf-parse
        pages: estimatedPages,
      };
    } catch {
      return null;
    }
  }

  // ─── Priority Processing ───────────────────────────────────────────────

  async processPrioritySources(
    options?: Partial<BatchProcessingOptions>
  ): Promise<BatchProcessingResult> {
    // Get sources sorted by priority
    const allSources = pdfSourceRegistryEngine.getAll();
    const prioritized = allSources
      .filter((s) => s.status === "downloaded" && s.priority <= 3)
      .sort((a, b) => a.priority - b.priority);

    logger.info(
      `[PDFHandbookBatchProcessor] Processing ${prioritized.length} priority sources`
    );

    // Process only priority sources
    const opts: BatchProcessingOptions = {
      ...this.defaultOptions,
      ...options,
    };

    return this.processSpecificSources(prioritized, opts);
  }

  async processSpecificSources(
    sources: PDFSource[],
    options?: Partial<BatchProcessingOptions>
  ): Promise<BatchProcessingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const batchId = `batch-specific-${Date.now()}`;
    const startTime = Date.now();

    const result: BatchProcessingResult = {
      id: batchId,
      startedAt: new Date().toISOString(),
      completedAt: "",
      duration: 0,
      sourcesProcessed: 0,
      sourcesSkipped: 0,
      sourcesFailed: 0,
      totals: { tables: 0, formulas: 0, materials: 0 },
      bySource: new Map(),
      registryExports: {
        formulaRegistry: [],
        materialRegistry: [],
        knowledgeBase: [],
      },
      errors: [],
    };

    for (const source of sources) {
      if (source.status !== "downloaded") {
        result.sourcesSkipped++;
        continue;
      }

      const sourceResult = await this.processSource(source, opts);
      result.bySource.set(source.id, sourceResult);

      if (sourceResult.status === "success" || sourceResult.status === "partial") {
        result.sourcesProcessed++;
        result.totals.tables += sourceResult.tables.length;
        result.totals.formulas += sourceResult.formulas.length;
        result.totals.materials += sourceResult.materials.length;
      } else {
        result.sourcesFailed++;
        if (sourceResult.error) {
          result.errors.push({ sourceId: source.id, error: sourceResult.error });
        }
      }
    }

    result.completedAt = new Date().toISOString();
    result.duration = Date.now() - startTime;

    if (opts.generateReport) {
      await this.generateReport(result);
    }

    await this.saveBatchResult(result);

    return result;
  }

  // ─── Report Generation ─────────────────────────────────────────────────

  private async generateReport(result: BatchProcessingResult): Promise<void> {
    const reportPath = path.join(this.outputDir, `${result.id}-report.md`);

    const lines: string[] = [
      `# PDF Batch Processing Report`,
      ``,
      `**Batch ID:** ${result.id}`,
      `**Started:** ${result.startedAt}`,
      `**Completed:** ${result.completedAt}`,
      `**Duration:** ${(result.duration / 1000).toFixed(1)}s`,
      ``,
      `## Summary`,
      ``,
      `| Metric | Count |`,
      `|--------|-------|`,
      `| Sources Processed | ${result.sourcesProcessed} |`,
      `| Sources Skipped | ${result.sourcesSkipped} |`,
      `| Sources Failed | ${result.sourcesFailed} |`,
      `| Tables Extracted | ${result.totals.tables} |`,
      `| Formulas Extracted | ${result.totals.formulas} |`,
      `| Materials Extracted | ${result.totals.materials} |`,
      ``,
      `## Registry Exports`,
      ``,
      `- **Formula Registry:** ${result.registryExports.formulaRegistry.length} entries`,
      `- **Material Registry:** ${result.registryExports.materialRegistry.length} entries`,
      `- **Knowledge Base:** ${result.registryExports.knowledgeBase.length} entries`,
      ``,
    ];

    // Per-source breakdown
    if (result.bySource.size > 0) {
      lines.push(`## Source Details`);
      lines.push(``);
      lines.push(`| Source | Status | Tables | Formulas | Materials | Time |`);
      lines.push(`|--------|--------|--------|----------|-----------|------|`);

      for (const [_, sourceResult] of result.bySource) {
        lines.push(
          `| ${sourceResult.sourceName} | ${sourceResult.status} | ` +
            `${sourceResult.tables.length} | ${sourceResult.formulas.length} | ` +
            `${sourceResult.materials.length} | ${sourceResult.processingTime}ms |`
        );
      }
      lines.push(``);
    }

    // Errors
    if (result.errors.length > 0) {
      lines.push(`## Errors`);
      lines.push(``);
      for (const err of result.errors) {
        lines.push(`- **${err.sourceId}:** ${err.error}`);
      }
      lines.push(``);
    }

    await fs.writeFile(reportPath, lines.join("\n"));
    logger.info(`[PDFHandbookBatchProcessor] Report saved to ${reportPath}`);
  }

  // ─── Result Persistence ────────────────────────────────────────────────

  private async saveSourceResult(
    batchId: string,
    result: SourceProcessingResult
  ): Promise<void> {
    const dir = path.join(this.outputDir, batchId);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${result.sourceId}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          ...result,
          savedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  private async saveBatchResult(result: BatchProcessingResult): Promise<void> {
    // Convert Map to object for JSON serialization
    const serializable = {
      ...result,
      bySource: Object.fromEntries(result.bySource),
    };

    const filePath = path.join(this.outputDir, `${result.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(serializable, null, 2));

    // Also save registry exports as separate files
    const exportsDir = path.join(this.outputDir, result.id, "exports");
    await fs.mkdir(exportsDir, { recursive: true });

    await Promise.all([
      fs.writeFile(
        path.join(exportsDir, "formula-registry.json"),
        JSON.stringify(result.registryExports.formulaRegistry, null, 2)
      ),
      fs.writeFile(
        path.join(exportsDir, "material-registry.json"),
        JSON.stringify(result.registryExports.materialRegistry, null, 2)
      ),
      fs.writeFile(
        path.join(exportsDir, "knowledge-base.json"),
        JSON.stringify(result.registryExports.knowledgeBase, null, 2)
      ),
    ]);

    logger.info(`[PDFHandbookBatchProcessor] Batch result saved to ${filePath}`);
  }

  // ─── Statistics ────────────────────────────────────────────────────────

  async getHistoricalStats(): Promise<{
    totalBatches: number;
    totalSourcesProcessed: number;
    totalTablesExtracted: number;
    totalFormulasExtracted: number;
    totalMaterialsExtracted: number;
    averageDuration: number;
    successRate: number;
  }> {
    const stats = {
      totalBatches: 0,
      totalSourcesProcessed: 0,
      totalTablesExtracted: 0,
      totalFormulasExtracted: 0,
      totalMaterialsExtracted: 0,
      averageDuration: 0,
      successRate: 0,
    };

    try {
      const files = await fs.readdir(this.outputDir);
      const batchFiles = files.filter(
        (f) => f.startsWith("batch-") && f.endsWith(".json")
      );

      let totalDuration = 0;
      let totalProcessed = 0;
      let totalSucceeded = 0;

      for (const file of batchFiles) {
        const content = await fs.readFile(
          path.join(this.outputDir, file),
          "utf-8"
        );
        const batch = JSON.parse(content) as {
          sourcesProcessed: number;
          sourcesFailed: number;
          duration: number;
          totals: { tables: number; formulas: number; materials: number };
        };

        stats.totalBatches++;
        stats.totalSourcesProcessed += batch.sourcesProcessed;
        stats.totalTablesExtracted += batch.totals.tables;
        stats.totalFormulasExtracted += batch.totals.formulas;
        stats.totalMaterialsExtracted += batch.totals.materials;
        totalDuration += batch.duration;
        totalProcessed += batch.sourcesProcessed + batch.sourcesFailed;
        totalSucceeded += batch.sourcesProcessed;
      }

      if (stats.totalBatches > 0) {
        stats.averageDuration = totalDuration / stats.totalBatches;
      }
      if (totalProcessed > 0) {
        stats.successRate = totalSucceeded / totalProcessed;
      }
    } catch {
      // Directory may not exist yet
    }

    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMAPHORE (Concurrency Control)
// ═══════════════════════════════════════════════════════════════════════════

class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const pdfHandbookBatchProcessorEngine = new PDFHandbookBatchProcessorEngine();
