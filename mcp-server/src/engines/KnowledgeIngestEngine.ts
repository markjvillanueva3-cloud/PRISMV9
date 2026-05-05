/**
 * KnowledgeIngestEngine — orchestrator for the PDF batch worker.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02.
 *
 * Wiring overview
 * ---------------
 *
 *     PDF on disk                                      ┌──────────────────┐
 *  H:/prism/Resources/MANUFACTURER_CATALOGS/foo.pdf ─► │ extract-pdf-text │
 *                                                     │  .py (pypdf)     │
 *                                                     └────────┬─────────┘
 *                                                              │ JSON-lines
 *                                                              ▼
 *                                              ┌────────────────────────────┐
 *                                              │ PdfChunkExtractorEngine    │
 *                                              │ (paragraph→sentence→hard)  │
 *                                              └─────────────┬──────────────┘
 *                                                            │ PdfChunk[]
 *                                                            ▼
 *                                              ┌────────────────────────────┐
 *                                              │ Embedder (Ollama nomic)    │
 *                                              │ → 768-dim vector per chunk │
 *                                              └─────────────┬──────────────┘
 *                                                            │
 *                                                            ▼
 *                                              ┌────────────────────────────┐
 *                                              │ QdrantMemoryEngine.remember │
 *                                              │ kind='wiki', deterministic  │
 *                                              │ id = sha256(source|index)   │
 *                                              └────────────────────────────┘
 *
 * Why this is one engine, not three:
 *  - The chunker (PdfChunkExtractorEngine) is pure — already its own
 *    file with its own tests.
 *  - The embedder is created by OllamaEmbedderFactory.
 *  - The Qdrant client is QdrantMemoryEngine.
 *  - This engine is the *glue* — Python subprocess management, idempotent
 *    id generation, page→chunk page-hint propagation, retry/skip logic
 *    when a single PDF fails. None of that belongs in the chunker.
 *
 * Design properties (deliberate):
 *  - **Idempotent re-ingestion:** every chunk's vector id is
 *    `sha256(source|chunkIndex)` so re-running the worker upserts
 *    in place without duplicating points.
 *  - **Page hints survive chunking:** we feed the chunker page-by-page
 *    (rather than the whole document at once) so each chunk carries a
 *    `pageHint` from the source page it was sliced from. Cross-page
 *    chunks are not produced — by construction page boundaries pin the
 *    semantic boundary, which matches how an operator would cite "see
 *    page 47" anyway.
 *  - **Backpressure:** chunks are committed to Qdrant in batches via
 *    sequential await — one chunk fails ⇒ that chunk is skipped, the
 *    rest of the document still ingests. Failures are reported in the
 *    return value, not thrown.
 *  - **No I/O at module load:** the Python interpreter / pypdf path are
 *    resolved lazily on first call.
 *
 * @module engines/KnowledgeIngestEngine
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import * as path from "node:path";
import { pdfChunkExtractorEngine, type PdfChunk } from "./PdfChunkExtractorEngine.js";
import type {
  Embedder,
  MemoryResult,
  QdrantMemoryEngine,
  RememberInput,
} from "./QdrantMemoryEngine.js";

const DEFAULT_PYTHON = process.env.PRISM_PYTHON_BIN
  ?? process.env.PYTHON_BIN
  ?? (process.platform === "win32" ? "H:/Tools/python/python.exe" : "python3");

const DEFAULT_EXTRACTOR_SCRIPT = path.resolve(
  // mcp-server/dist/engines/KnowledgeIngestEngine.js → mcp-server/scripts/extract-pdf-text.py
  // mcp-server/src/engines/KnowledgeIngestEngine.ts → mcp-server/scripts/extract-pdf-text.py
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, "")),
  "..", "..", "scripts", "extract-pdf-text.py",
);

const DEFAULT_TARGET_CHARS = 1_500;
const DEFAULT_OVERLAP_CHARS = 200;
const DEFAULT_MAX_PAGES = 5_000;
const DEFAULT_PROCESS_TIMEOUT_MS = 5 * 60 * 1_000; // 5 min per PDF

export interface IngestSourceMeta {
  /** Stable identifier for the PDF — used as `source` in chunks. */
  source: string;
  /** Optional human-readable title (e.g. catalog name). */
  title?: string;
  /** Optional vendor/manufacturer tag (e.g. "Iscar", "Sandvik"). */
  vendor?: string;
  /** Optional category tag (e.g. "insert-catalog", "post-manual"). */
  category?: string;
  /** Optional free-form tags for retrieval filtering. */
  tags?: string[];
}

export interface IngestOptions {
  /** Override the chunker target chars. Default 1500. */
  targetChars?: number;
  /** Override the chunker overlap chars. Default 200. */
  overlapChars?: number;
  /** Cap on pages read per PDF (sentinel; default 5000). */
  maxPages?: number;
  /** Per-PDF Python subprocess timeout. Default 5min. */
  timeoutMs?: number;
  /** Override Python binary path. Default env or platform-default. */
  pythonBin?: string;
  /** Override the extractor script path. */
  extractorScript?: string;
  /** Optional dryRun — extract+chunk but skip Qdrant upsert. */
  dryRun?: boolean;
}

export interface IngestResult {
  /** Source identifier from input meta. */
  source: string;
  /** Number of pages read from the PDF. */
  pages: number;
  /** Total characters extracted. */
  chars: number;
  /** Number of chunks produced by the chunker. */
  chunks: number;
  /** Number of chunks successfully upserted into Qdrant (== chunks unless errors). */
  upserted: number;
  /** Per-chunk errors (one entry per failure). */
  errors: Array<{ chunkIndex: number; reason: string }>;
  /** Wall-clock duration in ms. */
  durationMs: number;
  /** True if extractor produced no extractable text. */
  empty: boolean;
}

export interface KnowledgeIngestDeps {
  /** Qdrant memory engine. Use the singleton in production. */
  memory: QdrantMemoryEngine;
  /** Embedder fn — typically the Ollama factory output. */
  embedder?: Embedder;
}

interface ExtractedPage {
  page: number;
  text: string;
}

interface ExtractorSummary {
  pages: number;
  chars: number;
  path: string;
  size: number;
}

interface ExtractorOutput {
  pages: ExtractedPage[];
  summary: ExtractorSummary;
}

export class KnowledgeIngestEngine {
  private deps: KnowledgeIngestDeps;

  constructor(deps: KnowledgeIngestDeps) {
    if (!deps?.memory) throw new Error("KnowledgeIngestEngine: memory dep required");
    this.deps = deps;
    if (deps.embedder) deps.memory.setEmbedder(deps.embedder);
  }

  /**
   * Ingest one PDF: extract → chunk → embed → upsert. Returns a structured
   * report; never throws on per-chunk failures (those go in `errors`).
   * Throws only on bad inputs or extractor process failure.
   */
  async ingestPdf(pdfPath: string, meta: IngestSourceMeta, opts: IngestOptions = {}): Promise<IngestResult> {
    if (typeof pdfPath !== "string" || pdfPath.length === 0) {
      throw new Error("ingestPdf: pdfPath required");
    }
    if (!meta || typeof meta.source !== "string" || meta.source.length === 0) {
      throw new Error("ingestPdf: meta.source required");
    }
    if (!existsSync(pdfPath) || !statSync(pdfPath).isFile()) {
      throw new Error(`ingestPdf: file not found: ${pdfPath}`);
    }

    const targetChars = opts.targetChars ?? DEFAULT_TARGET_CHARS;
    const overlapChars = opts.overlapChars ?? DEFAULT_OVERLAP_CHARS;
    const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS;
    const pythonBin = opts.pythonBin ?? DEFAULT_PYTHON;
    const extractorScript = opts.extractorScript ?? DEFAULT_EXTRACTOR_SCRIPT;

    const start = Date.now();

    // 1. Run the Python extractor
    const extracted = await this.runExtractor(pythonBin, extractorScript, pdfPath, maxPages, timeoutMs);

    // 2. Chunk page-by-page so pageHint survives
    const chunks: PdfChunk[] = [];
    let runningIndex = 0;
    for (const p of extracted.pages) {
      if (!p.text || p.text.trim().length === 0) continue;
      const pageChunks = pdfChunkExtractorEngine.chunk(p.text, {
        targetChars,
        overlapChars,
        source: meta.source,
        pageHint: p.page,
      });
      for (const c of pageChunks) {
        chunks.push({ ...c, index: runningIndex++ });
      }
    }

    const result: IngestResult = {
      source: meta.source,
      pages: extracted.summary.pages,
      chars: extracted.summary.chars,
      chunks: chunks.length,
      upserted: 0,
      errors: [],
      durationMs: 0,
      empty: extracted.summary.chars === 0 || chunks.length === 0,
    };

    if (opts.dryRun) {
      result.durationMs = Date.now() - start;
      return result;
    }
    if (result.empty) {
      result.durationMs = Date.now() - start;
      return result;
    }

    // 3. Embed + upsert each chunk into kind='wiki'
    for (const chunk of chunks) {
      const id = this.chunkId(meta.source, chunk.index);
      const metadata = this.metadataFor(chunk, meta);
      const upsertInput: RememberInput = {
        kind: "wiki",
        id,
        text: chunk.text,
        metadata,
      };
      let outcome: MemoryResult<void>;
      try {
        outcome = await this.deps.memory.remember(upsertInput);
      } catch (e) {
        result.errors.push({
          chunkIndex: chunk.index,
          reason: e instanceof Error ? e.message : String(e),
        });
        continue;
      }
      if (!outcome.ok) {
        result.errors.push({ chunkIndex: chunk.index, reason: outcome.error });
        continue;
      }
      result.upserted++;
    }

    result.durationMs = Date.now() - start;
    return result;
  }

  /**
   * Compute the deterministic Qdrant id for a chunk.
   *
   * Uses sha256(source|chunkIndex), truncated to a stable 64-bit-ish string.
   * Re-ingesting the same source produces the same ids ⇒ Qdrant upserts
   * in place rather than duplicating.
   */
  chunkId(source: string, chunkIndex: number): string {
    const h = createHash("sha256").update(`${source}|${chunkIndex}`).digest("hex");
    return h.slice(0, 32);
  }

  /**
   * Build the metadata record stored alongside each chunk vector.
   * Public for tests; same shape that goes into Qdrant payload.
   */
  metadataFor(chunk: PdfChunk, meta: IngestSourceMeta): Record<string, unknown> {
    return {
      source: meta.source,
      title: meta.title ?? null,
      vendor: meta.vendor ?? null,
      category: meta.category ?? null,
      tags: meta.tags ?? [],
      chunkIndex: chunk.index,
      pageHint: chunk.pageHint,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      ingestedAt: new Date().toISOString(),
    };
  }

  /**
   * Run the Python extractor as a subprocess; collect JSON-lines on stdout.
   * Public for tests with stub PYTHON_BIN.
   */
  async runExtractor(
    pythonBin: string,
    script: string,
    pdfPath: string,
    maxPages: number,
    timeoutMs: number,
  ): Promise<ExtractorOutput> {
    return new Promise<ExtractorOutput>((resolve, reject) => {
      const child = spawn(pythonBin, [script, pdfPath, String(maxPages)], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      const pages: ExtractedPage[] = [];
      let summary: ExtractorSummary | null = null;
      let stderrBuf = "";
      let stdoutTail = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdoutTail += chunk;
        // Process complete lines; keep partial in tail
        const newlineIdx = stdoutTail.lastIndexOf("\n");
        if (newlineIdx === -1) return;
        const ready = stdoutTail.slice(0, newlineIdx);
        stdoutTail = stdoutTail.slice(newlineIdx + 1);
        for (const line of ready.split("\n")) {
          if (!line) continue;
          try {
            const obj = JSON.parse(line) as { page?: number; text?: string; summary?: ExtractorSummary };
            if (obj.summary) {
              summary = obj.summary;
            } else if (typeof obj.page === "number" && typeof obj.text === "string") {
              pages.push({ page: obj.page, text: obj.text });
            }
          } catch {
            // skip malformed line — keep going
          }
        }
      });

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderrBuf += chunk;
        if (stderrBuf.length > 16_384) {
          stderrBuf = stderrBuf.slice(-8_192); // bounded ring
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`extractor spawn failed: ${err.message}`));
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error(`extractor timeout after ${timeoutMs}ms: ${pdfPath}`));
          return;
        }
        if (code !== 0) {
          reject(new Error(`extractor exit ${code}: ${stderrBuf.slice(0, 500)}`));
          return;
        }
        if (!summary) {
          reject(new Error(`extractor produced no summary: ${pdfPath}`));
          return;
        }
        resolve({ pages, summary });
      });
    });
  }
}

/**
 * Create an engine wired with the production Qdrant singleton + an embedder.
 * Caller is responsible for ensuring the singleton has a connected store
 * (call ensureQdrantEmbedder + a connection check upstream).
 */
export function createKnowledgeIngestEngine(deps: KnowledgeIngestDeps): KnowledgeIngestEngine {
  return new KnowledgeIngestEngine(deps);
}
