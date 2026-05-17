/**
 * QueueProcessorEngine
 * ====================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B3/U-QUEUE-PROCESSOR
 *
 * Watches `knowledge/memories/queue/` for operator-submitted request files
 * matching `RESEARCH-*.md`, `SYNTHESIZE-*.md`, or `DRAFT-*.md`, classifies
 * each by size, and routes:
 *
 *   * `<= tokenCapBytes` (8 KiB default) -> Ollama qwen2.5-coder, write the
 *     response to `${queueRoot}/../generated/OUT-<basename>.md`, rename the
 *     source into `${queueRoot}/.processed/<basename>`.
 *   * `> tokenCapBytes` and `<= maxFileBytes` (64 KiB default) -> flag for
 *     Claude review: write a stub at
 *     `${queueRoot}/.claude-queue/<basename>.flag.json` carrying the source
 *     path + size + prefix, leave the source in place so a human / Claude
 *     session can pull it up.
 *   * `> maxFileBytes` -> rejected; written into the result manifest with a
 *     warning, source left in place.
 *
 * Two-phase design (mirrors DailyContextWorkflowEngine):
 *   1. scanQueue() — pure deterministic filesystem read.
 *   2. processQueue() — composes routing + side-effecting writes.
 *
 * Per-entry failures are caught and tagged route="rejected" + error; the loop
 * keeps going so one bad file can't stall the cron. Ollama null/throw
 * degrades to the claude route (R12 fail-loud).
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/B3/U-QUEUE-PROCESSOR
 * @module engines/QueueProcessorEngine
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  lstatSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";

// ---------- Public types -----------------------------------------------------

export type QueuePrefix = "RESEARCH" | "SYNTHESIZE" | "DRAFT";

export type QueueRoute = "ollama" | "claude" | "rejected" | "skipped";

export interface QueueEntry {
  path: string;
  filename: string;
  label: string;
  prefix: QueuePrefix;
  mtime: string;
  mtimeMs: number;
  sizeBytes: number;
  excerpt: string;
  truncated: boolean;
}

export interface QueueScan {
  queueRoot: string;
  generatedRoot: string;
  processedRoot: string;
  claudeQueueRoot: string;
  entries: QueueEntry[];
  availability: {
    queueExists: boolean;
    candidateFilesFound: number;
    skippedFilenames: string[];
  };
  caps: {
    maxFilesPerPass: number;
    tokenCapBytes: number;
    maxFileBytes: number;
    excerptBytes: number;
  };
  generatedAt: string;
}

export interface ProcessedEntry {
  entry: QueueEntry;
  route: QueueRoute;
  output: string | null;
  outputPath: string | null;
  archivePath: string | null;
  error: string | null;
  durationMs: number;
}

export interface QueueProcessResult {
  scan: QueueScan;
  processed: ProcessedEntry[];
  summary: {
    ollama: number;
    claude: number;
    rejected: number;
    skipped: number;
    failed: number;
  };
  warnings: string[];
  meetsProcessingFloor: boolean;
  durationMs: { scan: number; process: number; total: number };
  synthesizer: "ollama" | "literal";
  generatedAt: string;
}

export interface OllamaQueueClient {
  /**
   * One-shot generate call. Must return the model response as a string or
   * null on failure. The engine treats null / throw / empty as
   * route-downgrade-to-claude — never propagates the error up.
   */
  generate(input: { model: string; system: string; prompt: string }): Promise<string | null>;
}

export interface QueueProcessorOptions {
  queueRoot?: string;
  generatedRoot?: string;
  processedRoot?: string;
  claudeQueueRoot?: string;
  now?: number;
  maxFilesPerPass?: number;
  tokenCapBytes?: number;
  maxFileBytes?: number;
  excerptBytes?: number;
  ollamaClient?: OllamaQueueClient;
  ollamaModel?: string;
  dryRun?: boolean;
  mkdirIfMissing?: boolean;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_QUEUE_SUBDIR = "queue";
const DEFAULT_GENERATED_SUBDIR = "generated";
const DEFAULT_PROCESSED_SUBDIR = ".processed";
const DEFAULT_CLAUDE_QUEUE_SUBDIR = ".claude-queue";
const DEFAULT_MAX_FILES_PER_PASS = 20;
const DEFAULT_TOKEN_CAP_BYTES = 8 * 1024;
const DEFAULT_MAX_FILE_BYTES = 64 * 1024;
const DEFAULT_EXCERPT_BYTES = 8 * 1024;
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder";

const MAX_FILES_PER_PASS_MIN = 1;
const MAX_FILES_PER_PASS_MAX = 200;
const TOKEN_CAP_BYTES_MIN = 256;
const TOKEN_CAP_BYTES_MAX = 1024 * 1024;
const MAX_FILE_BYTES_MIN = 512;
const MAX_FILE_BYTES_MAX = 4 * 1024 * 1024;
const EXCERPT_BYTES_MIN = 256;
const EXCERPT_BYTES_MAX = 1024 * 1024;

/** Queue filename pattern — prefix + dash + label + .md (case-insensitive). */
const QUEUE_PATTERN = /^(RESEARCH|SYNTHESIZE|DRAFT)-([A-Za-z0-9._-]+)\.md$/i;

const PREFIX_CANONICAL: Record<string, QueuePrefix> = {
  RESEARCH: "RESEARCH",
  SYNTHESIZE: "SYNTHESIZE",
  DRAFT: "DRAFT",
};

export const QueueProcessorOptionsSchema = z.object({
  queueRoot: z.string().min(1).optional(),
  generatedRoot: z.string().min(1).optional(),
  processedRoot: z.string().min(1).optional(),
  claudeQueueRoot: z.string().min(1).optional(),
  now: z.number().finite().optional(),
  maxFilesPerPass: z.number().int().min(MAX_FILES_PER_PASS_MIN).max(MAX_FILES_PER_PASS_MAX).optional(),
  tokenCapBytes: z.number().int().min(TOKEN_CAP_BYTES_MIN).max(TOKEN_CAP_BYTES_MAX).optional(),
  maxFileBytes: z.number().int().min(MAX_FILE_BYTES_MIN).max(MAX_FILE_BYTES_MAX).optional(),
  excerptBytes: z.number().int().min(EXCERPT_BYTES_MIN).max(EXCERPT_BYTES_MAX).optional(),
  ollamaClient: z.unknown().optional(),
  ollamaModel: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  mkdirIfMissing: z.boolean().optional(),
}).passthrough();

function validateOptions(opts: QueueProcessorOptions): QueueProcessorOptions {
  QueueProcessorOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers (pure) ---------------------------------------------------

function resolveRoot(p: string): string {
  if (!p || typeof p !== "string") throw new Error("root path required");
  return resolve(p);
}

function clampInt(v: number | undefined, lo: number, hi: number, dflt: number): number {
  if (v === undefined || v === null) return dflt;
  if (!Number.isFinite(v)) return dflt;
  const n = Math.floor(v);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/**
 * Safe directory listing — never follows symlinks, never returns dotfiles,
 * never returns entries whose name contains `..` `/` `\`. Restricted to
 * regular files matching QUEUE_PATTERN. Mirrors DailyContextWorkflowEngine
 * for the same defense-in-depth + reviewer-tested behavior.
 */
function listQueueCandidates(
  dir: string,
): { entries: Array<{ path: string; mtimeMs: number; name: string; sizeBytes: number }>; skipped: string[] } {
  if (!existsSync(dir)) return { entries: [], skipped: [] };
  let dirents;
  try {
    dirents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return { entries: [], skipped: [] };
  }
  const out: Array<{ path: string; mtimeMs: number; name: string; sizeBytes: number }> = [];
  const skipped: string[] = [];
  for (const ent of dirents) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.includes("..") || ent.name.includes("/") || ent.name.includes("\\")) {
      skipped.push(ent.name);
      continue;
    }
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
    if (!QUEUE_PATTERN.test(ent.name)) {
      skipped.push(ent.name);
      continue;
    }
    const full = join(dir, ent.name);
    let lst;
    try { lst = lstatSync(full); } catch { skipped.push(ent.name); continue; }
    if (lst.isSymbolicLink()) { skipped.push(ent.name); continue; }
    let st;
    try { st = statSync(full); } catch { skipped.push(ent.name); continue; }
    if (!st.isFile()) { skipped.push(ent.name); continue; }
    out.push({ path: full, mtimeMs: st.mtimeMs, name: ent.name, sizeBytes: st.size });
  }
  return { entries: out, skipped };
}

function readExcerpt(absPath: string, cap: number): { excerpt: string; truncated: boolean } {
  try {
    const buf = readFileSync(absPath);
    if (buf.length <= cap) return { excerpt: buf.toString("utf8"), truncated: false };
    return { excerpt: buf.subarray(0, cap).toString("utf8"), truncated: true };
  } catch {
    return { excerpt: "", truncated: false };
  }
}

function toQueueEntry(
  file: { path: string; mtimeMs: number; name: string; sizeBytes: number },
  excerptBytes: number,
  maxFileBytes: number,
): QueueEntry | null {
  const m = QUEUE_PATTERN.exec(file.name);
  if (!m) return null;
  const prefixRaw = m[1].toUpperCase();
  const prefix = PREFIX_CANONICAL[prefixRaw];
  if (!prefix) return null;
  const label = m[2];
  // P1#5: skip readFileSync when file is oversize. The routing decision will
  // reject it anyway; reading a 4 GB buffer just to throw it away is an OOM
  // risk on a queue that's operator-facing. Excerpt is non-empty placeholder
  // so downstream code can still log a label, but truncated:true signals it.
  let excerpt: string;
  let truncated: boolean;
  if (file.sizeBytes > maxFileBytes) {
    excerpt = "(file exceeds maxFileBytes; body not read)";
    truncated = true;
  } else {
    const r = readExcerpt(file.path, excerptBytes);
    excerpt = r.excerpt;
    truncated = r.truncated;
  }
  return {
    path: file.path,
    filename: file.name,
    label,
    prefix,
    mtime: new Date(file.mtimeMs).toISOString(),
    mtimeMs: file.mtimeMs,
    sizeBytes: file.sizeBytes,
    excerpt,
    truncated,
  };
}

/**
 * Convert an absolute path under `queueRoot` to a relative path. Used for the
 * flag.json `sourcePath` so absolute filesystem paths don't leak across the
 * MCP boundary (per the D4 action-traces lesson). Falls back to the absolute
 * path when the source isn't under queueRoot (defensive; shouldn't happen).
 */
function toRelativeUnder(absPath: string, root: string): string {
  const normRoot = root.endsWith("/") || root.endsWith("\\") ? root : root + (absPath.includes("\\") ? "\\" : "/");
  if (absPath.startsWith(normRoot)) return absPath.slice(normRoot.length);
  return absPath;
}

/**
 * Pure routing decision by size. Per the B3 spec:
 *   * `<= tokenCapBytes` -> ollama
 *   * `<= maxFileBytes`  -> claude
 *   * else               -> rejected
 */
function decideRoute(
  sizeBytes: number,
  tokenCapBytes: number,
  maxFileBytes: number,
): Exclude<QueueRoute, "skipped"> {
  if (sizeBytes <= tokenCapBytes) return "ollama";
  if (sizeBytes <= maxFileBytes) return "claude";
  return "rejected";
}

function systemPromptForPrefix(prefix: QueuePrefix): string {
  switch (prefix) {
    case "RESEARCH":
      return "You are a research assistant for the PRISM manufacturing platform. The user has submitted a research request. Answer in 2-4 paragraphs of markdown. Cite concrete sources (filenames, URLs, doc names) when known. If you don't have enough information, say so explicitly rather than fabricate.";
    case "SYNTHESIZE":
      return "You are a synthesis assistant for the PRISM manufacturing platform. The user has submitted a body of notes. Produce a one-page markdown synthesis: ## Summary (2-3 sentences) + ## Key Points (bulleted) + ## Open Questions (bulleted). Preserve concrete numbers and proper nouns verbatim.";
    case "DRAFT":
      return "You are a drafting assistant for the PRISM manufacturing platform. The user has submitted rough notes to be turned into prose. Produce a polished markdown draft (2-5 paragraphs). Preserve the operator's voice, technical terms, and stated conclusions. Do not introduce claims not supported by the source.";
  }
}

// ---------- Engine -----------------------------------------------------------

export class QueueProcessorEngine {
  readonly name = "QueueProcessorEngine";

  /**
   * Phase 1 — deterministic queue scan. Pure-functional given the filesystem
   * state. No network, no LLM.
   *
   * @param opts  Optional overrides (queueRoot, caps).
   * @returns     QueueScan manifest sorted FIFO (mtime asc).
   */
  scanQueue(opts: QueueProcessorOptions = {}): QueueScan {
    validateOptions(opts);
    const vaultRoot = DEFAULT_VAULT_ROOT;
    const queueRoot = resolveRoot(opts.queueRoot ?? join(vaultRoot, DEFAULT_QUEUE_SUBDIR));
    const generatedRoot = resolveRoot(opts.generatedRoot ?? join(vaultRoot, DEFAULT_GENERATED_SUBDIR));
    const processedRoot = resolveRoot(opts.processedRoot ?? join(queueRoot, DEFAULT_PROCESSED_SUBDIR));
    const claudeQueueRoot = resolveRoot(opts.claudeQueueRoot ?? join(queueRoot, DEFAULT_CLAUDE_QUEUE_SUBDIR));
    const now = opts.now ?? Date.now();
    const maxFilesPerPass = clampInt(
      opts.maxFilesPerPass, MAX_FILES_PER_PASS_MIN, MAX_FILES_PER_PASS_MAX, DEFAULT_MAX_FILES_PER_PASS,
    );
    const tokenCapBytes = clampInt(
      opts.tokenCapBytes, TOKEN_CAP_BYTES_MIN, TOKEN_CAP_BYTES_MAX, DEFAULT_TOKEN_CAP_BYTES,
    );
    const maxFileBytes = clampInt(
      opts.maxFileBytes, MAX_FILE_BYTES_MIN, MAX_FILE_BYTES_MAX, DEFAULT_MAX_FILE_BYTES,
    );
    const excerptBytes = clampInt(
      opts.excerptBytes, EXCERPT_BYTES_MIN, EXCERPT_BYTES_MAX, DEFAULT_EXCERPT_BYTES,
    );
    // tokenCap must not exceed maxFile (else the route table is unreachable
    // for sizes between the two). Clamp tokenCap down rather than throw.
    const effectiveTokenCap = Math.min(tokenCapBytes, maxFileBytes);
    const queueExists = existsSync(queueRoot);
    const { entries: candidates, skipped } = listQueueCandidates(queueRoot);
    const candidateFilesFound = candidates.length;
    // FIFO order — operators expect oldest-first processing. Name tie-break
    // gives cross-platform determinism when mtime resolution collides.
    const ordered = [...candidates].sort(
      (a, b) => (a.mtimeMs - b.mtimeMs) || a.name.localeCompare(b.name),
    );
    const capped = ordered.slice(0, maxFilesPerPass);
    const entries: QueueEntry[] = [];
    for (const f of capped) {
      const entry = toQueueEntry(f, excerptBytes, maxFileBytes);
      if (entry) entries.push(entry);
    }
    return {
      queueRoot, generatedRoot, processedRoot, claudeQueueRoot,
      entries,
      availability: { queueExists, candidateFilesFound, skippedFilenames: skipped },
      caps: { maxFilesPerPass, tokenCapBytes: effectiveTokenCap, maxFileBytes, excerptBytes },
      generatedAt: new Date(now).toISOString(),
    };
  }

  /**
   * Phase 2 — drive routing + side effects. For each entry in the scan:
   *   * decide route by size,
   *   * if `ollama` and a client is supplied, attempt the call; null result
   *     downgrades to `claude` (flagged for next-pass review),
   *   * if `dryRun` is true, no writes happen,
   *   * else write the output / flag file, then rename the source into
   *     `processedRoot` (Ollama success only).
   *
   * Per-entry failures are caught and surfaced as `error` + `route="rejected"`.
   *
   * @param opts  Options including optional `ollamaClient`, `dryRun`.
   * @returns     Full QueueProcessResult with per-entry traces + summary.
   */
  async processQueue(opts: QueueProcessorOptions = {}): Promise<QueueProcessResult> {
    validateOptions(opts);
    const tStart = Date.now();
    // P1#4: capture a single "frozen now" for ALL output stamps so given
    // identical inputs the engine produces byte-equal flag.json / OUT-X.md /
    // generatedAt. When opts.now is supplied tests can pin every stamp.
    const nowMs = opts.now ?? tStart;
    const nowIso = new Date(nowMs).toISOString();
    const scan = this.scanQueue(opts);
    const tScanDone = Date.now();
    const model = opts.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    const client = opts.ollamaClient;
    const dryRun = opts.dryRun === true;
    const mkdirIfMissing = opts.mkdirIfMissing !== false;

    // Pre-create output dirs once per pass (idempotent). Failure here is
    // loud — without these dirs we can't write anything. EEXIST is the
    // only swallowable error code.
    if (!dryRun && mkdirIfMissing) {
      for (const dir of [scan.generatedRoot, scan.processedRoot, scan.claudeQueueRoot]) {
        try {
          mkdirSync(dir, { recursive: true });
        } catch (e) {
          const code = (e as NodeJS.ErrnoException).code;
          if (code !== "EEXIST") throw e;
        }
      }
    }

    const processed: ProcessedEntry[] = [];
    const warnings: string[] = [];

    for (const entry of scan.entries) {
      const tEntry = Date.now();
      const intended = decideRoute(entry.sizeBytes, scan.caps.tokenCapBytes, scan.caps.maxFileBytes);

      if (dryRun) {
        processed.push({
          entry, route: "skipped",
          output: null, outputPath: null, archivePath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }

      if (intended === "rejected") {
        // P0#2: oversize-by-design is NOT a processing failure. The warning
        // captures the human reason; the result's `error` field stays null
        // so meetsProcessingFloor remains true on a clean pass with one
        // 100KiB legit-reject entry. summary.failed counts only actual
        // exceptions out of the catch-block below.
        warnings.push(
          `rejected oversize entry ${entry.filename} (${entry.sizeBytes} > ${scan.caps.maxFileBytes})`,
        );
        processed.push({
          entry, route: "rejected",
          output: null, outputPath: null, archivePath: null,
          error: null,
          durationMs: Date.now() - tEntry,
        });
        continue;
      }

      try {
        let route: QueueRoute = intended;
        let output: string | null = null;
        let outputPath: string | null = null;
        let archivePath: string | null = null;
        // Track why a claude-route happened so the flag.json `reason` field
        // distinguishes "no client supplied" from "client tried and failed".
        // Tests pin these strings; ops triage relies on them.
        let degradedReason: "ollama-degraded" | "no-ollama-client" | "oversize-for-ollama" =
          entry.sizeBytes > scan.caps.tokenCapBytes ? "oversize-for-ollama" : "no-ollama-client";

        if (intended === "ollama") {
          if (!client) {
            route = "claude";
            degradedReason = "no-ollama-client";
          } else {
            const result = await safeGenerate(client, model, {
              system: systemPromptForPrefix(entry.prefix),
              prompt: entry.excerpt,
            });
            const trimmed = result ? result.trim() : "";
            if (trimmed.length > 0) {
              const outPath = join(scan.generatedRoot, `OUT-${entry.filename}`);
              const tmpPath = outPath + ".tmp";
              const archive = join(scan.processedRoot, entry.filename);
              // P0#1: atomic-ish two-stage write. Sequence is:
              //   1. write OUT.tmp
              //   2. rename source → archive
              //   3. rename OUT.tmp → OUT
              // If step 2 fails (ENOENT race-loss, EACCES, EBUSY), step 3
              // never runs and the .tmp is cleaned up — no orphan OUT.md
              // claiming success when the source is still in the queue.
              writeFileSync(tmpPath, renderOllamaOutput(entry, trimmed, nowIso), "utf8");
              try {
                renameSync(entry.path, archive);
              } catch (e) {
                // Cleanup .tmp before propagating. Best-effort — if cleanup
                // itself fails, the original rename error is still surfaced.
                try { renameSync(tmpPath, tmpPath + ".orphan"); } catch { /* swallow */ }
                const code = (e as NodeJS.ErrnoException).code;
                if (code === "ENOENT") {
                  // P1#6: another daemon / a manual move beat us to this
                  // source. Not a processing failure — surface as skipped
                  // with a race-loss tag so the cron log shows the truth.
                  processed.push({
                    entry, route: "skipped",
                    output: null, outputPath: null, archivePath: null,
                    error: "race-loss: source vanished between scan and rename (ENOENT)",
                    durationMs: Date.now() - tEntry,
                  });
                  warnings.push(`race-loss for ${entry.filename}: source vanished between scan and rename`);
                  continue;
                }
                throw e;
              }
              // Source archived; promote tmp to final output. If THIS rename
              // fails (rare — same directory, file just written), surface as
              // a real failure since the source is no longer in the queue.
              renameSync(tmpPath, outPath);
              output = trimmed;
              outputPath = outPath;
              archivePath = archive;
              processed.push({
                entry, route: "ollama",
                output, outputPath, archivePath,
                error: null, durationMs: Date.now() - tEntry,
              });
              continue;
            }
            // safeGenerate returned null / empty — client was tried but failed.
            route = "claude";
            degradedReason = "ollama-degraded";
          }
        }

        // route === "claude" by now (intended-claude or downgraded-from-ollama).
        const flagPath = join(scan.claudeQueueRoot, `${entry.filename}.flag.json`);
        // P0#3: idempotent flag write. If the flag already exists for this
        // source, leave it alone — preserves the original `flaggedAt` so
        // operators can see when the file first entered review. Re-route
        // surfaces as `route: "skipped"` (already-flagged) so summary counts
        // don't inflate over repeated passes.
        if (existsSync(flagPath)) {
          processed.push({
            entry, route: "skipped",
            output: null, outputPath: flagPath, archivePath: null,
            error: null, durationMs: Date.now() - tEntry,
          });
          continue;
        }
        const flag = {
          schemaVersion: "1.0.0",
          // P1#7: relative-to-queueRoot — do not leak absolute paths across
          // the MCP boundary (D4 action-traces lesson).
          sourcePath: toRelativeUnder(entry.path, scan.queueRoot),
          sourceFilename: entry.filename,
          prefix: entry.prefix,
          sizeBytes: entry.sizeBytes,
          mtime: entry.mtime,
          flaggedAt: nowIso,
          reason: degradedReason,
        };
        writeFileSync(flagPath, JSON.stringify(flag, null, 2) + "\n", "utf8");
        outputPath = flagPath;
        processed.push({
          entry, route: "claude",
          output: null, outputPath, archivePath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        processed.push({
          entry, route: "rejected",
          output: null, outputPath: null, archivePath: null,
          error: msg, durationMs: Date.now() - tEntry,
        });
        warnings.push(`processing failed for ${entry.filename}: ${msg}`);
      }
    }

    const summary = {
      ollama: processed.filter((p) => p.route === "ollama").length,
      claude: processed.filter((p) => p.route === "claude").length,
      rejected: processed.filter((p) => p.route === "rejected").length,
      skipped: processed.filter((p) => p.route === "skipped").length,
      // P0#2 follow-up: `failed` counts ONLY entries that hit the catch-block
      // (route="rejected" AND error!==null). Oversize-by-design has error=null
      // and route="rejected" — excluded. Race-loss has error!==null and
      // route="skipped" — excluded. Both are benign per spec.
      failed: processed.filter((p) => p.route === "rejected" && p.error !== null).length,
    };

    const meetsProcessingFloor = summary.failed === 0;

    if (scan.entries.length === 0) warnings.push("queue empty (no entries this pass)");
    if (scan.availability.candidateFilesFound > scan.entries.length) {
      warnings.push(
        `pass cap applied: ${scan.entries.length}/${scan.availability.candidateFilesFound} processed`,
      );
    }
    if (
      opts.tokenCapBytes !== undefined &&
      Number.isFinite(opts.tokenCapBytes) &&
      scan.caps.tokenCapBytes < opts.tokenCapBytes
    ) {
      warnings.push(`tokenCapBytes clamped down to maxFileBytes (${scan.caps.tokenCapBytes})`);
    }
    if (scan.availability.skippedFilenames.length > 0) {
      const head = scan.availability.skippedFilenames.slice(0, 5).join(", ");
      const tail = scan.availability.skippedFilenames.length > 5 ? "..." : "";
      warnings.push(
        `skipped ${scan.availability.skippedFilenames.length} non-conforming filename(s): ${head}${tail}`,
      );
    }
    if (!meetsProcessingFloor) {
      warnings.push(`processing floor unmet: ${summary.failed} entry/entries failed`);
    }

    const tEnd = Date.now();
    const synthesizer: "ollama" | "literal" = summary.ollama > 0 ? "ollama" : "literal";

    return {
      scan, processed, summary, warnings, meetsProcessingFloor,
      durationMs: { scan: tScanDone - tStart, process: tEnd - tScanDone, total: tEnd - tStart },
      synthesizer,
      // P1#4: top-level stamp uses the frozen nowMs so tests can pin
      // byte-equality on the full result envelope.
      generatedAt: nowIso,
    };
  }
}

// ---------- Renderers + safe wrappers ----------------------------------------

function renderOllamaOutput(entry: QueueEntry, body: string, nowIso: string): string {
  return [
    `# ${entry.prefix} — ${entry.label}`,
    `_Generated ${nowIso} from ${entry.filename} (Ollama qwen2.5-coder)._`,
    "",
    body.trim(),
    "",
    "## Source",
    `- ${entry.path} (${entry.mtime}, ${entry.sizeBytes} bytes)`,
    "",
  ].join("\n");
}

async function safeGenerate(
  client: OllamaQueueClient,
  model: string,
  input: { system: string; prompt: string },
): Promise<string | null> {
  try {
    const out = await client.generate({ model, system: input.system, prompt: input.prompt });
    if (out === null || out === undefined) return null;
    if (typeof out !== "string") return null;
    return out;
  } catch {
    return null;
  }
}

// ---------- Helpers exported for tests --------------------------------------

/** @internal — exported for the test suite only; do NOT depend on from prod code. */
export const _internals = {
  clampInt,
  QUEUE_PATTERN,
  PREFIX_CANONICAL,
  decideRoute,
  systemPromptForPrefix,
  renderOllamaOutput,
  toRelativeUnder,
  toQueueEntry,
  DEFAULT_TOKEN_CAP_BYTES,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_FILES_PER_PASS,
};

// ---------- Singleton --------------------------------------------------------

export const queueProcessorEngine = new QueueProcessorEngine();

export default QueueProcessorEngine;

export async function runQueueProcessor(
  opts: QueueProcessorOptions = {},
): Promise<QueueProcessResult> {
  validateOptions(opts);
  return queueProcessorEngine.processQueue(opts);
}
