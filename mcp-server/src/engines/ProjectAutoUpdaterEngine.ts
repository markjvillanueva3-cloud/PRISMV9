/**
 * ProjectAutoUpdaterEngine
 * ========================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B5/U-PROJECT-AUTO-UPDATER
 *
 * Watches the project subfolders under `${vaultRoot}/project/` and keeps each
 * project's `overview.md` current by prepending a one-line change summary to
 * its `## Recent Changes` section whenever a non-overview note inside that
 * project folder is modified.
 *
 *   * For each `${vaultRoot}/project/<name>/` subfolder, find the most-recent
 *     `.md` file that is NOT `overview.md`.
 *   * Compute a deterministic change signature `<filename>:<mtimeMs>`.
 *   * If that signature is already recorded in the project's `overview.md`
 *     (embedded as an HTML-comment marker), the project is up-to-date — skip.
 *   * Otherwise generate a one-line summary (Ollama qwen2.5-coder when a
 *     client is supplied AND the source is within tokenCapBytes; literal
 *     first-meaningful-line otherwise) and prepend it under
 *     `## Recent Changes` with the signature marker so the next pass is
 *     idempotent.
 *
 * Two-phase design (mirrors DailyContextWorkflowEngine / QueueProcessorEngine):
 *   1. scanProjects()    — pure-determinist filesystem read. No network/LLM.
 *   2. processProjects() — composes the summary + the atomic overview patch.
 *
 * Atomicity: the patched overview is written to `overview.md.tmp` first, then
 * renamed over the original. Idempotency: the signature marker means a re-run
 * is a no-op. Ollama failure degrades to the literal renderer (R12 fail-loud
 * via the result's synthesizer field).
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/B5/U-PROJECT-AUTO-UPDATER
 * @module engines/ProjectAutoUpdaterEngine
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

export type ProjectUpdateRoute = "ollama" | "literal" | "skipped" | "rejected";

export interface ProjectChange {
  project: string;
  projectDir: string;
  overviewPath: string;
  newestFile: string | null;
  newestPath: string | null;
  newestMtime: string | null;
  newestMtimeMs: number;
  newestSizeBytes: number;
  signature: string | null;
  alreadyRecorded: boolean;
  overviewExists: boolean;
  /**
   * True when the EXISTING overview.md exceeded the read cap and was
   * truncated on read. Patching a truncated body would destroy everything
   * past the cap on write-back — processProjects refuses to patch when this
   * is set (R12 fail-loud over silent data loss).
   */
  overviewTruncated: boolean;
  excerpt: string;
  truncated: boolean;
}

export interface ProjectScan {
  vaultRoot: string;
  projectRoot: string;
  changes: ProjectChange[];
  availability: {
    projectRootExists: boolean;
    projectFoldersFound: number;
    skippedNames: string[];
  };
  caps: {
    maxProjectsPerPass: number;
    tokenCapBytes: number;
    maxFileBytes: number;
    excerptBytes: number;
  };
  generatedAt: string;
}

export interface ProcessedProject {
  change: ProjectChange;
  route: ProjectUpdateRoute;
  summary: string | null;
  overviewPath: string | null;
  error: string | null;
  durationMs: number;
}

export interface ProjectUpdateResult {
  scan: ProjectScan;
  processed: ProcessedProject[];
  summary: {
    ollama: number;
    literal: number;
    skipped: number;
    rejected: number;
    failed: number;
  };
  warnings: string[];
  meetsProcessingFloor: boolean;
  durationMs: { scan: number; process: number; total: number };
  synthesizer: "ollama" | "literal";
  generatedAt: string;
}

export interface OllamaProjectClient {
  /**
   * One-shot summarise call. Returns the model response as a string or null
   * on failure. Engine treats null / throw / empty as degrade-to-literal —
   * never propagates the error up.
   */
  summarise(input: { model: string; system: string; prompt: string }): Promise<string | null>;
}

export interface ProjectAutoUpdaterOptions {
  vaultRoot?: string;
  projectRoot?: string;
  now?: number;
  maxProjectsPerPass?: number;
  tokenCapBytes?: number;
  maxFileBytes?: number;
  excerptBytes?: number;
  ollamaClient?: OllamaProjectClient;
  ollamaModel?: string;
  dryRun?: boolean;
  mkdirIfMissing?: boolean;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_PROJECT_SUBDIR = "project";
const OVERVIEW_FILENAME = "overview.md";
const RECENT_CHANGES_HEADING = "## Recent Changes";
const DEFAULT_MAX_PROJECTS_PER_PASS = 25;
const DEFAULT_TOKEN_CAP_BYTES = 8 * 1024;
const DEFAULT_MAX_FILE_BYTES = 64 * 1024;
const DEFAULT_EXCERPT_BYTES = 8 * 1024;
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder";
const FIRST_LINE_LENGTH_CAP = 200;
/** Cap on retained `## Recent Changes` lines so overview.md can't grow unbounded. */
const MAX_RECENT_LINES = 50;

const MAX_PROJECTS_PER_PASS_MIN = 1;
const MAX_PROJECTS_PER_PASS_MAX = 200;
const TOKEN_CAP_BYTES_MIN = 256;
const TOKEN_CAP_BYTES_MAX = 1024 * 1024;
const MAX_FILE_BYTES_MIN = 512;
const MAX_FILE_BYTES_MAX = 4 * 1024 * 1024;
const EXCERPT_BYTES_MIN = 256;
const EXCERPT_BYTES_MAX = 1024 * 1024;

/** Signature marker embedded in overview.md so re-runs are idempotent. */
const SIG_MARKER_RE = /<!--\s*pau-sig:\s*([^>]+?)\s*-->/g;

export const ProjectAutoUpdaterOptionsSchema = z.object({
  vaultRoot: z.string().min(1).optional(),
  projectRoot: z.string().min(1).optional(),
  now: z.number().finite().optional(),
  maxProjectsPerPass: z.number().int().min(MAX_PROJECTS_PER_PASS_MIN).max(MAX_PROJECTS_PER_PASS_MAX).optional(),
  tokenCapBytes: z.number().int().min(TOKEN_CAP_BYTES_MIN).max(TOKEN_CAP_BYTES_MAX).optional(),
  maxFileBytes: z.number().int().min(MAX_FILE_BYTES_MIN).max(MAX_FILE_BYTES_MAX).optional(),
  excerptBytes: z.number().int().min(EXCERPT_BYTES_MIN).max(EXCERPT_BYTES_MAX).optional(),
  ollamaClient: z.unknown().optional(),
  ollamaModel: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  mkdirIfMissing: z.boolean().optional(),
}).passthrough();

function validateOptions(opts: ProjectAutoUpdaterOptions): ProjectAutoUpdaterOptions {
  ProjectAutoUpdaterOptionsSchema.parse(opts);
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
 * Safe subdirectory listing — never follows symlinks, never returns dotfiles,
 * never returns names with `..` `/` `\`. Restricted to directories.
 */
function listProjectFolders(
  dir: string,
): { folders: Array<{ path: string; name: string }>; skipped: string[] } {
  if (!existsSync(dir)) return { folders: [], skipped: [] };
  let dirents;
  try {
    dirents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return { folders: [], skipped: [] };
  }
  const folders: Array<{ path: string; name: string }> = [];
  const skipped: string[] = [];
  for (const ent of dirents) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.includes("..") || ent.name.includes("/") || ent.name.includes("\\")) {
      skipped.push(ent.name);
      continue;
    }
    if (!ent.isDirectory()) continue;
    const full = join(dir, ent.name);
    let lst;
    try { lst = lstatSync(full); } catch { skipped.push(ent.name); continue; }
    if (lst.isSymbolicLink()) { skipped.push(ent.name); continue; }
    let st;
    try { st = statSync(full); } catch { skipped.push(ent.name); continue; }
    if (!st.isDirectory()) { skipped.push(ent.name); continue; }
    folders.push({ path: full, name: ent.name });
  }
  return { folders, skipped };
}

/**
 * Newest non-overview `.md` file inside a project folder. Symlink-safe.
 * Returns null when the folder has no qualifying file.
 */
function newestNonOverview(
  projectDir: string,
): { path: string; name: string; mtimeMs: number; sizeBytes: number } | null {
  let dirents;
  try {
    dirents = readdirSync(projectDir, { withFileTypes: true });
  } catch {
    return null;
  }
  let best: { path: string; name: string; mtimeMs: number; sizeBytes: number } | null = null;
  for (const ent of dirents) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.includes("..") || ent.name.includes("/") || ent.name.includes("\\")) continue;
    if (!ent.isFile()) continue;
    const lower = ent.name.toLowerCase();
    if (lower === OVERVIEW_FILENAME) continue;
    if (!lower.endsWith(".md")) continue;
    const full = join(projectDir, ent.name);
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isSymbolicLink()) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    // Newest wins; name tie-break for cross-platform determinism on equal mtime.
    if (
      best === null ||
      st.mtimeMs > best.mtimeMs ||
      (st.mtimeMs === best.mtimeMs && ent.name.localeCompare(best.name) < 0)
    ) {
      best = { path: full, name: ent.name, mtimeMs: st.mtimeMs, sizeBytes: st.size };
    }
  }
  return best;
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

function firstMeaningfulLine(text: string): string {
  const lines = text.split(/\r?\n/);
  let i = 0;
  let firstNonEmpty = -1;
  for (let k = 0; k < lines.length; k++) {
    if (lines[k].trim().length > 0) { firstNonEmpty = k; break; }
  }
  if (firstNonEmpty !== -1 && lines[firstNonEmpty].trim() === "---") {
    let close = -1;
    for (let k = firstNonEmpty + 1; k < lines.length; k++) {
      if (lines[k].trim() === "---") { close = k; break; }
    }
    if (close !== -1) i = close + 1;
  }
  for (; i < lines.length; i++) {
    const line = lines[i].replace(/^#+\s*/, "").trim();
    if (line.length === 0) continue;
    if (line.startsWith("---")) continue;
    const cleaned = line.replace(/^[-*]\s+/, "").trim();
    if (cleaned.length === 0) continue;
    return cleaned.length > FIRST_LINE_LENGTH_CAP
      ? cleaned.slice(0, FIRST_LINE_LENGTH_CAP - 3) + "..."
      : cleaned;
  }
  return "(empty file)";
}

/**
 * Neutralize HTML-comment + pau-sig marker sequences in untrusted summary
 * text so a crafted note / LLM echo can't inject a fake signature marker
 * that poisons recordedSignatures(). Zero-width-space breaks the literal
 * token without visibly changing the rendered text. Also collapses any
 * embedded newlines (a summary must stay a single bullet line).
 */
function neutralizeMarkers(s: string): string {
  return s
    .replace(/\r?\n/g, " ")
    .replace(/<!--/g, "<​!--")
    .replace(/-->/g, "--​>")
    .replace(/pau-sig:/gi, "pau​-sig:")
    .trim();
}

/** Extract every recorded signature from an overview.md body. */
function recordedSignatures(overviewBody: string): Set<string> {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  SIG_MARKER_RE.lastIndex = 0;
  while ((m = SIG_MARKER_RE.exec(overviewBody)) !== null) {
    out.add(m[1].trim());
  }
  return out;
}

/**
 * Prepend a one-line change entry under `## Recent Changes`, creating the
 * section if absent. Caps retained bullet lines at MAX_RECENT_LINES. Pure —
 * returns the new full overview body; caller owns the atomic write.
 */
function patchOverview(existingBody: string, entryLine: string): string {
  // P1 (data-mutation guard): preserve the original line ending. Splitting on
  // /\r?\n/ and rejoining with "\n" would silently rewrite a CRLF-authored
  // overview to LF on every pass (churns git, mutates user content). Detect
  // the dominant EOL and keep it. `before`/`after` regions are otherwise
  // returned byte-faithful (no per-line trim, no global blank-collapse).
  const eol = existingBody.includes("\r\n") ? "\r\n" : "\n";
  const lines = existingBody.length > 0 ? existingBody.split(/\r?\n/) : [];
  const headingIdx = lines.findIndex((l) => l.trim() === RECENT_CHANGES_HEADING);
  if (headingIdx === -1) {
    const prefix = existingBody.replace(/\s+$/, "");
    const block = `${RECENT_CHANGES_HEADING}${eol}${eol}${entryLine}${eol}`;
    return prefix.length > 0 ? `${prefix}${eol}${eol}${block}` : block;
  }
  let sectionEnd = lines.length;
  for (let k = headingIdx + 1; k < lines.length; k++) {
    if (/^##\s/.test(lines[k]) && lines[k].trim() !== RECENT_CHANGES_HEADING) {
      sectionEnd = k;
      break;
    }
  }
  const before = lines.slice(0, headingIdx + 1);
  const sectionLines = lines.slice(headingIdx + 1, sectionEnd);
  const after = lines.slice(sectionEnd);
  // Only the engine-owned `## Recent Changes` section is reformatted; the
  // bullet filter is intentional (the section is engine-owned — manual prose
  // inside it is not preserved; documented in the engine JSDoc). before/after
  // are emitted exactly as read (byte-faithful given EOL preservation).
  const existingBullets = sectionLines.filter((l) => l.trim().startsWith("-"));
  const newBullets = [entryLine, ...existingBullets].slice(0, MAX_RECENT_LINES);
  const sectionBlock = ["", ...newBullets, ""];
  const rebuilt = [...before, ...sectionBlock, ...after];
  return rebuilt.join(eol).replace(/\s+$/, "") + eol;
}

// ---------- Engine -----------------------------------------------------------

export class ProjectAutoUpdaterEngine {
  readonly name = "ProjectAutoUpdaterEngine";

  /**
   * Phase 1 — deterministic project scan. Pure-functional given the
   * filesystem state. No network, no LLM.
   *
   * @param opts  Optional overrides (vaultRoot/projectRoot, caps).
   * @returns     ProjectScan manifest (folders sorted by name asc).
   */
  scanProjects(opts: ProjectAutoUpdaterOptions = {}): ProjectScan {
    validateOptions(opts);
    const vaultRoot = resolveRoot(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const projectRoot = resolveRoot(opts.projectRoot ?? join(vaultRoot, DEFAULT_PROJECT_SUBDIR));
    const now = opts.now ?? Date.now();
    const maxProjectsPerPass = clampInt(
      opts.maxProjectsPerPass, MAX_PROJECTS_PER_PASS_MIN, MAX_PROJECTS_PER_PASS_MAX, DEFAULT_MAX_PROJECTS_PER_PASS,
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
    const effectiveTokenCap = Math.min(tokenCapBytes, maxFileBytes);
    const projectRootExists = existsSync(projectRoot);
    const { folders, skipped } = listProjectFolders(projectRoot);
    const projectFoldersFound = folders.length;
    const ordered = [...folders].sort((a, b) => a.name.localeCompare(b.name));
    const capped = ordered.slice(0, maxProjectsPerPass);

    const changes: ProjectChange[] = [];
    for (const folder of capped) {
      const overviewPath = join(folder.path, OVERVIEW_FILENAME);
      const overviewExists = existsSync(overviewPath);
      let overviewBody = "";
      let overviewTruncated = false;
      if (overviewExists) {
        const r = readExcerpt(overviewPath, EXCERPT_BYTES_MAX);
        overviewBody = r.excerpt;
        overviewTruncated = r.truncated;
      }
      const sigs = recordedSignatures(overviewBody);
      const newest = newestNonOverview(folder.path);
      if (newest === null) {
        changes.push({
          project: folder.name,
          projectDir: folder.path,
          overviewPath,
          newestFile: null,
          newestPath: null,
          newestMtime: null,
          newestMtimeMs: 0,
          newestSizeBytes: 0,
          signature: null,
          alreadyRecorded: false,
          overviewExists,
          overviewTruncated,
          excerpt: "",
          truncated: false,
        });
        continue;
      }
      const signature = `${newest.name}:${newest.mtimeMs}`;
      let excerpt: string;
      let truncated: boolean;
      if (newest.sizeBytes > maxFileBytes) {
        excerpt = "(file exceeds maxFileBytes; body not read)";
        truncated = true;
      } else {
        const r = readExcerpt(newest.path, excerptBytes);
        excerpt = r.excerpt;
        truncated = r.truncated;
      }
      changes.push({
        project: folder.name,
        projectDir: folder.path,
        overviewPath,
        newestFile: newest.name,
        newestPath: newest.path,
        newestMtime: new Date(newest.mtimeMs).toISOString(),
        newestMtimeMs: newest.mtimeMs,
        newestSizeBytes: newest.sizeBytes,
        signature,
        alreadyRecorded: sigs.has(signature),
        overviewExists,
        overviewTruncated,
        excerpt,
        truncated,
      });
    }

    return {
      vaultRoot,
      projectRoot,
      changes,
      availability: {
        projectRootExists,
        projectFoldersFound,
        skippedNames: skipped,
      },
      caps: {
        maxProjectsPerPass,
        tokenCapBytes: effectiveTokenCap,
        maxFileBytes,
        excerptBytes,
      },
      generatedAt: new Date(now).toISOString(),
    };
  }

  /**
   * Phase 2 — generate the one-line summary + atomically patch overview.md.
   *
   * Per project: no-newest → skipped; signature recorded → skipped
   * (idempotent); newest > maxFileBytes → rejected; dryRun → skipped; else
   * summarise (Ollama when client + size ≤ tokenCap; literal otherwise) and
   * atomically patch overview.md. Per-project failures degrade to
   * route "rejected" + error so the loop keeps going.
   *
   * @param opts  Options including optional `ollamaClient`, `dryRun`.
   * @returns     Full ProjectUpdateResult with per-project traces + summary.
   */
  async processProjects(opts: ProjectAutoUpdaterOptions = {}): Promise<ProjectUpdateResult> {
    validateOptions(opts);
    const tStart = Date.now();
    const nowMs = opts.now ?? tStart;
    const nowIso = new Date(nowMs).toISOString();
    const scan = this.scanProjects(opts);
    const tScanDone = Date.now();
    const model = opts.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    const client = opts.ollamaClient;
    const dryRun = opts.dryRun === true;

    const processed: ProcessedProject[] = [];
    const warnings: string[] = [];

    for (const change of scan.changes) {
      const tEntry = Date.now();

      if (change.newestFile === null) {
        processed.push({
          change, route: "skipped", summary: null, overviewPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }
      if (change.alreadyRecorded) {
        processed.push({
          change, route: "skipped", summary: null, overviewPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }
      if (change.newestSizeBytes > scan.caps.maxFileBytes) {
        warnings.push(
          `rejected oversize source ${change.project}/${change.newestFile} (${change.newestSizeBytes} > ${scan.caps.maxFileBytes})`,
        );
        processed.push({
          change, route: "rejected", summary: null, overviewPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }
      // P0 (data-loss guard): the existing overview.md was larger than the
      // read cap and got truncated on read. Patching the truncated body and
      // writing it back would PERMANENTLY destroy every byte past the cap.
      // Refuse — fail loud (R12), error non-null so floor goes false.
      if (change.overviewTruncated) {
        const msg = `overview.md exceeds read cap (${EXCERPT_BYTES_MAX} bytes); refusing to patch (would truncate user content)`;
        warnings.push(`${change.project}: ${msg}`);
        processed.push({
          change, route: "rejected", summary: null, overviewPath: null,
          error: msg, durationMs: Date.now() - tEntry,
        });
        continue;
      }
      if (dryRun) {
        processed.push({
          change, route: "skipped", summary: null, overviewPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }

      try {
        let summary: string | null = null;
        let route: ProjectUpdateRoute = "literal";

        if (client && change.newestSizeBytes <= scan.caps.tokenCapBytes) {
          const out = await safeSummarise(client, model, {
            system: "You are a project-tracking assistant for the PRISM platform. Given the newest note in a project folder, write ONE concise sentence (<160 chars) describing what changed. Preserve concrete artifacts (file names, unit ids, commit shas). No preamble — just the sentence.",
            prompt: change.excerpt,
          });
          const trimmed = out ? out.trim() : "";
          if (trimmed.length > 0) {
            summary = trimmed.split(/\r?\n/)[0].slice(0, FIRST_LINE_LENGTH_CAP);
            route = "ollama";
          }
        }
        if (summary === null) {
          summary = firstMeaningfulLine(change.excerpt);
          route = "literal";
        }
        // P0 (security): the summary is untrusted (note content OR LLM echo).
        // Neutralize HTML-comment + signature-marker sequences so a crafted
        // summary can't inject a `<!-- pau-sig: X -->` marker that poisons
        // recordedSignatures() and silently suppresses future tracking. The
        // engine's own trailing marker is appended AFTER, so neutralizing the
        // summary body alone is safe.
        const safeSummary = neutralizeMarkers(summary);
        const safeFile = neutralizeMarkers(change.newestFile);

        const entryLine =
          `- ${nowIso} — **${safeFile}**: ${safeSummary} <!-- pau-sig: ${change.signature} -->`;
        const existingBody = change.overviewExists
          ? readExcerpt(change.overviewPath, EXCERPT_BYTES_MAX).excerpt
          : "";
        const patched = patchOverview(existingBody, entryLine);

        const tmpPath = change.overviewPath + ".tmp";
        if (opts.mkdirIfMissing !== false) {
          try {
            mkdirSync(change.projectDir, { recursive: true });
          } catch (e) {
            const code = (e as NodeJS.ErrnoException).code;
            if (code !== "EEXIST") throw e;
          }
        }
        // Atomic-ish: write tmp then rename over the original. If the rename
        // fails (EBUSY/EACCES/EPERM — overview open in an editor, concurrent
        // pass), clean the orphan .tmp so it can't be mis-picked as the
        // "newest note" next pass (B3 QueueProcessorEngine parity — that
        // cleanup was dropped in the first B5 cut; restored here).
        writeFileSync(tmpPath, patched, "utf8");
        try {
          renameSync(tmpPath, change.overviewPath);
        } catch (renameErr) {
          try { renameSync(tmpPath, tmpPath + ".orphan"); } catch { /* best-effort */ }
          throw renameErr;
        }

        processed.push({
          change, route, summary: safeSummary, overviewPath: change.overviewPath,
          error: null, durationMs: Date.now() - tEntry,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        processed.push({
          change, route: "rejected", summary: null, overviewPath: null,
          error: msg, durationMs: Date.now() - tEntry,
        });
        warnings.push(`processing failed for ${change.project}: ${msg}`);
      }
    }

    const summary = {
      ollama: processed.filter((p) => p.route === "ollama").length,
      literal: processed.filter((p) => p.route === "literal").length,
      skipped: processed.filter((p) => p.route === "skipped").length,
      rejected: processed.filter((p) => p.route === "rejected").length,
      // failed counts ONLY catch-block exceptions (route=rejected AND error!=null);
      // oversize-rejected has error=null so it is excluded (benign by-design).
      failed: processed.filter((p) => p.route === "rejected" && p.error !== null).length,
    };
    const meetsProcessingFloor = summary.failed === 0;

    if (scan.changes.length === 0) warnings.push("no project folders this pass");
    if (scan.availability.projectFoldersFound > scan.changes.length) {
      warnings.push(
        `pass cap applied: ${scan.changes.length}/${scan.availability.projectFoldersFound} projects scanned`,
      );
    }
    if (
      opts.tokenCapBytes !== undefined &&
      Number.isFinite(opts.tokenCapBytes) &&
      scan.caps.tokenCapBytes < opts.tokenCapBytes
    ) {
      warnings.push(`tokenCapBytes clamped down to maxFileBytes (${scan.caps.tokenCapBytes})`);
    }
    if (scan.availability.skippedNames.length > 0) {
      const head = scan.availability.skippedNames.slice(0, 5).join(", ");
      const tail = scan.availability.skippedNames.length > 5 ? "..." : "";
      warnings.push(
        `skipped ${scan.availability.skippedNames.length} non-conforming folder(s): ${head}${tail}`,
      );
    }
    if (!meetsProcessingFloor) {
      warnings.push(`processing floor unmet: ${summary.failed} project(s) failed`);
    }

    const tEnd = Date.now();
    const synthesizer: "ollama" | "literal" = summary.ollama > 0 ? "ollama" : "literal";

    return {
      scan, processed, summary, warnings, meetsProcessingFloor,
      durationMs: { scan: tScanDone - tStart, process: tEnd - tScanDone, total: tEnd - tStart },
      synthesizer,
      generatedAt: nowIso,
    };
  }
}

// ---------- Safe wrappers ----------------------------------------------------

async function safeSummarise(
  client: OllamaProjectClient,
  model: string,
  input: { system: string; prompt: string },
): Promise<string | null> {
  try {
    const out = await client.summarise({ model, system: input.system, prompt: input.prompt });
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
  firstMeaningfulLine,
  recordedSignatures,
  patchOverview,
  neutralizeMarkers,
  SIG_MARKER_RE,
  MAX_RECENT_LINES,
  EXCERPT_BYTES_MAX,
  DEFAULT_TOKEN_CAP_BYTES,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_PROJECTS_PER_PASS,
};

// ---------- Singleton --------------------------------------------------------

export const projectAutoUpdaterEngine = new ProjectAutoUpdaterEngine();

export default ProjectAutoUpdaterEngine;

export async function runProjectAutoUpdater(
  opts: ProjectAutoUpdaterOptions = {},
): Promise<ProjectUpdateResult> {
  validateOptions(opts);
  return projectAutoUpdaterEngine.processProjects(opts);
}
