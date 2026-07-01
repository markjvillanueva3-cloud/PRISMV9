/**
 * PrintCorpusOrchestratorEngine — corpus-wide print scanner that walks a
 * filesystem root, computes per-file sha256, skips already-scanned prints
 * via the writer's index (idempotent + resumable), invokes an injectable
 * extract function for each unscanned print, and writes one PrintCorpusRow
 * per print via PrintCorpusTableWriter.
 *
 * PRINT-OCR-100PCT-MS0/U2 — composes U1's sink with BlueprintExtractionRAGEngine.
 *
 * Design properties:
 *   - Resumable: a re-run with the same root + writer skips every print
 *     whose sha256 is already in the writer's index (cheap O(1) lookup).
 *   - Idempotent: PrintCorpusTableWriter dedups by sha; calling scan() N
 *     times produces the same rows.jsonl as calling it once.
 *   - Concurrency-safe: bounded parallel workers (default 4) — each computes
 *     sha + extract + write; the writer's O_EXCL lock serialises index updates.
 *   - Failure-isolated: any single-print failure is recorded as a row with
 *     scanStatus="extraction_failed" and the run continues. No silent skip.
 *   - Injectable I/O: extractFn / shaFn / pageCountFn / customerInferFn are
 *     all overridable for tests AND for plugging in different backends
 *     (e.g. local OCR vs cloud vs vision-LLM).
 *
 * Used by scripts/scan-print-corpus.mjs (CLI runner). U3's 100% accuracy
 * proof harness reads the resulting rows.jsonl to compute coverage; U4's
 * wiki+tribal batch generator pattern-mines it.
 */

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {
  type PrintCorpusRow,
  type PrintSourceKind,
  type PrintSourceFormat,
  PRINT_SOURCE_FORMATS,
  computeWorstFloor,
  aggregateConfidence,
} from "../schemas/PrintCorpusRow.js";
import type { PrintCorpusTableWriter } from "./PrintCorpusTableWriter.js";
import type { BlueprintExtraction } from "./BlueprintExtractionRAGEngine.js";

export interface ScanProgress {
  filesDiscovered: number;
  filesScanned: number;
  filesSkipped: number;
  filesFailed: number;
  currentFile: string | null;
  elapsedMs: number;
}

export interface ScanFailure {
  path: string;
  error: string;
  sha256: string | null;
}

export interface ScanResult {
  totalDiscovered: number;
  totalScanned: number;
  totalSkipped: number;
  totalFailed: number;
  failures: ScanFailure[];
  elapsedMs: number;
  coverageBySha: Array<{ sha256: string; rowId: string; status: PrintCorpusRow["scanStatus"] }>;
}

export interface ScanRequest {
  rootDir: string;
  extractFn: (filePath: string, page: number, pageCount: number) => Promise<BlueprintExtraction>;
  pageCountFn?: (filePath: string) => Promise<number>;
  shaFn?: (filePath: string) => Promise<string>;
  customerInferFn?: (filePath: string) => { customer: string | null; partNumber: string | null; revision: string | null };
  concurrency?: number;
  fileLimit?: number;
  formats?: PrintSourceFormat[];
  sourceKind?: PrintSourceKind;
  progressFn?: (progress: ScanProgress) => void;
  /** Override the wall-clock for deterministic tests. */
  nowFn?: () => Date;
}

const DEFAULT_CONCURRENCY = 4;
const SHA_BUFFER_BYTES = 1 << 20; // 1 MB chunks for streaming sha256
const DEFAULT_FORMATS: PrintSourceFormat[] = ["pdf", "tif", "tiff", "png", "jpg", "jpeg"];

/** Compute a SHA-256 of a file by streaming 1 MB chunks (low memory). */
async function defaultShaFn(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  return await new Promise<string>((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { highWaterMark: SHA_BUFFER_BYTES });
    stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/** Default page-count: single page for non-PDF, otherwise 1 (delegate caller). */
async function defaultPageCountFn(_filePath: string): Promise<number> {
  // Non-PDF formats are typically single-image-per-file.
  // PDF page-count requires a parser the orchestrator doesn't ship — the
  // injectable seam lets the CLI wire in pdf-lib or similar.
  return 1;
}

/** Infer customer / part-number from a `JM DIE/<CUSTOMER>/<PART>/...` path. */
function defaultCustomerInfer(filePath: string): { customer: string | null; partNumber: string | null; revision: string | null } {
  // Look for `JM DIE/<CUSTOMER>/<PART>/...` pattern.
  // Case-insensitive marker match — Windows/Unix path-separator agnostic.
  const norm = filePath.replace(/\\/g, "/");
  const m = norm.match(/\/JM DIE\/([^/]+)\/([^/]+)\//i);
  if (m) {
    return { customer: m[1], partNumber: m[2], revision: null };
  }
  return { customer: null, partNumber: null, revision: null };
}

function detectFormat(filePath: string): PrintSourceFormat | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return (PRINT_SOURCE_FORMATS as readonly string[]).includes(ext)
    ? (ext as PrintSourceFormat)
    : null;
}

/** Walk a directory recursively, yielding file paths matching the allowed formats. */
function discoverFiles(
  rootDir: string,
  allowedFormats: PrintSourceFormat[],
  fileLimit?: number,
): string[] {
  const out: string[] = [];
  if (!fs.existsSync(rootDir)) return out;
  const entries = fs.readdirSync(rootDir, { recursive: true, withFileTypes: true }) as fs.Dirent[];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const fp = path.join((ent as fs.Dirent & { parentPath?: string }).parentPath ?? rootDir, ent.name);
    const fmt = detectFormat(fp);
    if (fmt && allowedFormats.includes(fmt)) {
      out.push(fp);
      if (fileLimit !== undefined && out.length >= fileLimit) break;
    }
  }
  return out;
}

/** Bounded-concurrency map (no external dep). */
async function pMap<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

export class PrintCorpusOrchestratorEngine {
  public readonly schemaVersion = "1.0.0" as const;

  constructor(private readonly writer: PrintCorpusTableWriter) {}

  async scan(req: ScanRequest): Promise<ScanResult> {
    const startedAt = Date.now();
    const now = req.nowFn ?? (() => new Date());
    const concurrency = req.concurrency ?? DEFAULT_CONCURRENCY;
    const formats = req.formats ?? DEFAULT_FORMATS;
    const sourceKind = req.sourceKind ?? "jm_die";
    const customerInfer = req.customerInferFn ?? defaultCustomerInfer;
    const shaFn = req.shaFn ?? defaultShaFn;
    const pageCountFn = req.pageCountFn ?? defaultPageCountFn;

    const files = discoverFiles(req.rootDir, formats, req.fileLimit);

    const progress: ScanProgress = {
      filesDiscovered: files.length,
      filesScanned: 0,
      filesSkipped: 0,
      filesFailed: 0,
      currentFile: null,
      elapsedMs: 0,
    };
    const failures: ScanFailure[] = [];
    const coverage: ScanResult["coverageBySha"] = [];

    await pMap(files, concurrency, async (filePath) => {
      progress.currentFile = filePath;
      let sha: string | null = null;
      try {
        sha = await shaFn(filePath);
        if (this.writer.has(sha)) {
          progress.filesSkipped++;
          progress.elapsedMs = Date.now() - startedAt;
          req.progressFn?.({ ...progress });
          return;
        }

        const pageCount = await pageCountFn(filePath);
        const pages: BlueprintExtraction[] = [];
        for (let p = 1; p <= pageCount; p++) {
          pages.push(await req.extractFn(filePath, p, pageCount));
        }

        const provenance = customerInfer(filePath);
        const format = detectFormat(filePath) ?? "pdf";
        const agg = aggregateConfidence(pages);
        const worstFloor = computeWorstFloor(pages);
        const row: PrintCorpusRow = {
          rowId: `${sourceKind}-${sha.slice(0, 12)}`,
          sourceSha256: sha,
          sourcePath: filePath,
          sourceKind,
          sourceFormat: format,
          pageCount,
          customer: provenance.customer,
          partNumber: provenance.partNumber,
          revision: provenance.revision,
          pages,
          worstConfidenceFloor: worstFloor,
          totalRegions: agg.totalRegions,
          weakestRegionConfidence: agg.weakestRegionConfidence,
          scanStatus: "extracted",
          scannedAt: now().toISOString(),
          scanLatencyMs: Date.now() - startedAt,
          groundTruthAvailable: false,
          groundTruthSource: "none",
          accuracyAgainstGroundTruth: null,
          accuracyVerifiedAt: null,
          requiresOperatorReview: worstFloor !== "normal" || agg.weakestRegionConfidence < 1,
          operatorReviewedBy: null,
          operatorReviewedAt: null,
          operatorVerdict: "pending",
          isAnonymizable: provenance.customer === null,
          anonymizationBlockedReason: provenance.customer
            ? `customer name '${provenance.customer}' present in path`
            : null,
        };
        const writeResult = this.writer.write(row);
        coverage.push({ sha256: sha, rowId: row.rowId, status: row.scanStatus });
        if (writeResult.status === "written") {
          progress.filesScanned++;
        } else {
          // Race: another worker won the dedup. Treat as skipped, not duplicated.
          progress.filesSkipped++;
        }
      } catch (e) {
        progress.filesFailed++;
        const err = e instanceof Error ? e.message : String(e);
        failures.push({ path: filePath, error: err, sha256: sha });
        // Record a failure row so coverage % is accurate (per R12 fail-loud).
        if (sha !== null && !this.writer.has(sha)) {
          try {
            const failureRow: PrintCorpusRow = {
              rowId: `failed-${sha.slice(0, 12)}`,
              sourceSha256: sha,
              sourcePath: filePath,
              sourceKind,
              sourceFormat: detectFormat(filePath) ?? "pdf",
              pageCount: 1,
              customer: null,
              partNumber: null,
              revision: null,
              pages: [
                {
                  extractionId: `failure-${sha.slice(0, 12)}`,
                  pdfPath: filePath,
                  page: 1,
                  familyMatchId: null,
                  regions: [],
                  sources: [],
                  confidenceFloor: "low_no_vision",
                  contradictionsDetected: [err],
                  extractedAt: now().toISOString(),
                  backendId: "orchestrator-failure",
                },
              ],
              worstConfidenceFloor: "low_no_vision",
              totalRegions: 0,
              weakestRegionConfidence: 0,
              scanStatus: "extraction_failed",
              scannedAt: now().toISOString(),
              scanLatencyMs: Date.now() - startedAt,
              groundTruthAvailable: false,
              groundTruthSource: "none",
              accuracyAgainstGroundTruth: null,
              accuracyVerifiedAt: null,
              requiresOperatorReview: true,
              operatorReviewedBy: null,
              operatorReviewedAt: null,
              operatorVerdict: "pending",
              isAnonymizable: true,
              anonymizationBlockedReason: null,
            };
            this.writer.write(failureRow);
            coverage.push({ sha256: sha, rowId: failureRow.rowId, status: failureRow.scanStatus });
          } catch {
            // If even the failure row can't be written, just log via failures[].
          }
        }
      } finally {
        progress.elapsedMs = Date.now() - startedAt;
        req.progressFn?.({ ...progress });
      }
    });

    return {
      totalDiscovered: files.length,
      totalScanned: progress.filesScanned,
      totalSkipped: progress.filesSkipped,
      totalFailed: progress.filesFailed,
      failures,
      elapsedMs: Date.now() - startedAt,
      coverageBySha: coverage,
    };
  }
}
