/**
 * KnowledgeDistillationEngine
 * ===========================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B6/U-KNOWLEDGE-DISTILLATION
 *
 * Monthly pass that distills the last `windowDays` (default 30) of
 * `${vaultRoot}/resources/` + `${vaultRoot}/areas/` notes into canonical
 * per-topic reference files at
 * `${vaultRoot}/references/DISTILL-<topic>-YYYY-MM.md`.
 *
 *   * Walk resources/ + areas/ for `.md` files modified within the window.
 *   * Cluster by topic — frontmatter `topic:` wins; else first path segment
 *     under the corpus root; else basename.
 *   * For each cluster with >= minClusterSize notes, render a canonical
 *     reference (Ollama qwen2.5-coder when a client is supplied AND the
 *     joined cluster excerpt is within tokenCapBytes; literal
 *     bulleted-first-lines otherwise).
 *   * Write each DISTILL file atomically (tmp -> rename + orphan cleanup).
 *     Idempotent: a `<!-- kd-sig: <hash> -->` marker keyed on the cluster's
 *     sorted (file, mtime) set means an unchanged cluster is a no-op.
 *
 * Two-phase design (mirrors QueueProcessorEngine / ProjectAutoUpdaterEngine):
 *   1. scanCorpus() — pure-determinist filesystem read. No network, no LLM.
 *   2. distill()    — clustering + render + atomic per-topic write.
 *
 * B6 only ever CREATES new DISTILL-* files (never read-modify-writes an
 * existing user file), so it has none of B5's overwrite-data-loss surface.
 * It still inherits every B3/B5 hardening: Zod on every public entry,
 * lstat symlink rejection, frozen-now determinism, OOM-skip on oversize
 * sources, untrusted-summary marker neutralization, atomic tmp->rename with
 * .tmp.orphan cleanup, and a truncation guard on the existing-DISTILL read
 * used only for the idempotency skip decision.
 *
 * Ollama failure (throw/null/empty) degrades to the literal renderer; the
 * result's `synthesizer` field surfaces the downgrade (R12 fail-loud).
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/B6/U-KNOWLEDGE-DISTILLATION
 * @module engines/KnowledgeDistillationEngine
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
import { createHash } from "node:crypto";
import { z } from "zod";

// ---------- Public types -----------------------------------------------------

export type DistillRoute = "ollama" | "literal" | "skipped" | "rejected";

export interface DistillSourceNote {
  path: string;
  relPath: string;
  name: string;
  topic: string;
  mtimeMs: number;
  sizeBytes: number;
  excerpt: string;
  truncated: boolean;
}

export interface TopicCluster {
  topic: string;
  notes: DistillSourceNote[];
  signature: string;
  outputPath: string;
  alreadyRecorded: boolean;
}

export interface CorpusScan {
  vaultRoot: string;
  corpusRoots: string[];
  referencesRoot: string;
  clusters: TopicCluster[];
  availability: {
    corpusRootsExist: boolean[];
    notesFoundInWindow: number;
    skippedNames: string[];
  };
  caps: {
    windowDays: number;
    maxNotesPerCluster: number;
    minClusterSize: number;
    tokenCapBytes: number;
    maxFileBytes: number;
    excerptBytes: number;
  };
  generatedAt: string;
}

export interface DistilledCluster {
  cluster: TopicCluster;
  route: DistillRoute;
  body: string | null;
  outputPath: string | null;
  error: string | null;
  durationMs: number;
}

export interface DistillResult {
  scan: CorpusScan;
  distilled: DistilledCluster[];
  summary: {
    ollama: number;
    literal: number;
    skipped: number;
    rejected: number;
    failed: number;
  };
  warnings: string[];
  meetsProcessingFloor: boolean;
  durationMs: { scan: number; distill: number; total: number };
  synthesizer: "ollama" | "literal";
  generatedAt: string;
}

export interface OllamaDistillClient {
  /**
   * One-shot summarise call. Returns the model response as a string or null
   * on failure. Engine treats null/throw/empty as degrade-to-literal —
   * never propagates the error up.
   */
  summarise(input: { model: string; system: string; prompt: string }): Promise<string | null>;
}

export interface KnowledgeDistillationOptions {
  vaultRoot?: string;
  corpusRoots?: string[];
  referencesRoot?: string;
  now?: number;
  windowDays?: number;
  maxNotesPerCluster?: number;
  minClusterSize?: number;
  tokenCapBytes?: number;
  maxFileBytes?: number;
  excerptBytes?: number;
  ollamaClient?: OllamaDistillClient;
  ollamaModel?: string;
  dryRun?: boolean;
  mkdirIfMissing?: boolean;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_CORPUS_SUBDIRS = ["resources", "areas"];
const DEFAULT_REFERENCES_SUBDIR = "references";
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MAX_NOTES_PER_CLUSTER = 40;
const DEFAULT_MIN_CLUSTER_SIZE = 2;
const DEFAULT_TOKEN_CAP_BYTES = 16 * 1024;
const DEFAULT_MAX_FILE_BYTES = 64 * 1024;
const DEFAULT_EXCERPT_BYTES = 4 * 1024;
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder";
const FIRST_LINE_LENGTH_CAP = 200;
const EXISTING_DISTILL_READ_CAP = 256 * 1024;

const WINDOW_DAYS_MIN = 1;
const WINDOW_DAYS_MAX = 366;
const MAX_NOTES_MIN = 1;
const MAX_NOTES_MAX = 500;
const MIN_CLUSTER_MIN = 1;
const MIN_CLUSTER_MAX = 100;
const TOKEN_CAP_BYTES_MIN = 256;
const TOKEN_CAP_BYTES_MAX = 1024 * 1024;
const MAX_FILE_BYTES_MIN = 512;
const MAX_FILE_BYTES_MAX = 4 * 1024 * 1024;
const EXCERPT_BYTES_MIN = 256;
const EXCERPT_BYTES_MAX = 1024 * 1024;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WALK_MAX_DEPTH = 6;

/** Idempotency marker embedded in a DISTILL file. */
const KD_SIG_MARKER_RE = /<!--\s*kd-sig:\s*([0-9a-f]{8,64})\s*-->/i;

export const KnowledgeDistillationOptionsSchema = z.object({
  vaultRoot: z.string().min(1).optional(),
  corpusRoots: z.array(z.string().min(1)).optional(),
  referencesRoot: z.string().min(1).optional(),
  now: z.number().finite().optional(),
  windowDays: z.number().int().min(WINDOW_DAYS_MIN).max(WINDOW_DAYS_MAX).optional(),
  maxNotesPerCluster: z.number().int().min(MAX_NOTES_MIN).max(MAX_NOTES_MAX).optional(),
  minClusterSize: z.number().int().min(MIN_CLUSTER_MIN).max(MIN_CLUSTER_MAX).optional(),
  tokenCapBytes: z.number().int().min(TOKEN_CAP_BYTES_MIN).max(TOKEN_CAP_BYTES_MAX).optional(),
  maxFileBytes: z.number().int().min(MAX_FILE_BYTES_MIN).max(MAX_FILE_BYTES_MAX).optional(),
  excerptBytes: z.number().int().min(EXCERPT_BYTES_MIN).max(EXCERPT_BYTES_MAX).optional(),
  ollamaClient: z.unknown().optional(),
  ollamaModel: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  mkdirIfMissing: z.boolean().optional(),
}).passthrough();

function validateOptions(opts: KnowledgeDistillationOptions): KnowledgeDistillationOptions {
  KnowledgeDistillationOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers (pure) ---------------------------------------------------

function resolveRoot(p: string): string {
  if (!p || typeof p !== "string") throw new Error("root path required");
  return resolve(p);
}

/**
 * Path A contains (or equals) path B when, normalized + lowercased (NTFS is
 * case-insensitive; bare drive-letter normalize is insufficient — see the
 * git-add-lane-guard 2026-05-16 casing regression), B === A or B starts with
 * A + separator. Used for the corpus/output containment guard below.
 */
function pathContainsOrEquals(a: string, b: string): boolean {
  const na = (process.platform === "win32" ? a.toLowerCase() : a).replace(/[\\/]+$/, "");
  const nb = (process.platform === "win32" ? b.toLowerCase() : b).replace(/[\\/]+$/, "");
  if (na === nb) return true;
  return nb.startsWith(na + "/") || nb.startsWith(na + "\\");
}

/**
 * Reject a corpus/output topology where referencesRoot nests with any
 * corpusRoot (either direction). Without this, a written
 * DISTILL-<topic>-YYYY-MM.md becomes a corpus note on the next pass ->
 * deriveTopic re-clusters it -> clusterSignature churns every run ->
 * alreadyRecorded is never true -> the engine's headline idempotency
 * guarantee silently and permanently dies + unbounded self-feeding cluster
 * growth. Defaults (resources/+areas/ vs references/) are disjoint so the
 * monthly cron is safe; this guards the public dispatcher action whose
 * corpus_roots + references_root are operator-supplied (Arm-B P1, B6 scrutiny).
 * Fail loud (R12) rather than silently corrupt.
 */
function assertNoCorpusOutputOverlap(corpusRoots: string[], referencesRoot: string): void {
  for (const c of corpusRoots) {
    if (pathContainsOrEquals(c, referencesRoot) || pathContainsOrEquals(referencesRoot, c)) {
      throw new Error(
        `corpus/output overlap: referencesRoot (${referencesRoot}) nests with corpusRoot (${c}); ` +
          `this would make DISTILL files self-feed and permanently break idempotency`,
      );
    }
  }
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
 * Neutralize HTML-comment + kd-sig marker sequences in untrusted summary
 * text so a crafted note / LLM echo can't inject a fake signature marker
 * that poisons idempotency detection. Zero-width-space breaks the literal
 * token without visibly changing the rendered text. Collapses newlines
 * (single-line use).
 */
function neutralizeMarkers(s: string): string {
  return s
    .replace(/\r?\n/g, " ")
    .replace(/<!--/g, "<​!--")
    .replace(/-->/g, "--​>")
    .replace(/kd-sig:/gi, "kd​-sig:")
    .trim();
}

/**
 * Neutralize markers across a multiline body WITHOUT collapsing newlines
 * (the Ollama distillation is intentionally multi-section).
 */
function sanitizeMultiline(s: string): string {
  return s
    .replace(/<!--/g, "<​!--")
    .replace(/-->/g, "--​>")
    .replace(/kd-sig:/gi, "kd​-sig:");
}

/**
 * Recursive safe `.md` walk under a corpus root. Never follows symlinks
 * (lstat at every hop), skips dotfiles + names with `..` `/` `\`, bounded
 * depth to defend against pathological / cyclic trees.
 */
function walkMarkdown(
  root: string,
  maxDepth: number,
): { files: Array<{ path: string; relPath: string; name: string; mtimeMs: number; sizeBytes: number }>; skipped: string[] } {
  const files: Array<{ path: string; relPath: string; name: string; mtimeMs: number; sizeBytes: number }> = [];
  const skipped: string[] = [];
  if (!existsSync(root)) return { files, skipped };

  function rec(dir: string, rel: string, depth: number): void {
    if (depth > maxDepth) return;
    let dirents;
    try {
      dirents = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of dirents) {
      if (ent.name.startsWith(".")) continue;
      if (ent.name.includes("..") || ent.name.includes("/") || ent.name.includes("\\")) {
        skipped.push(ent.name);
        continue;
      }
      const full = join(dir, ent.name);
      const relNext = rel.length > 0 ? `${rel}/${ent.name}` : ent.name;
      let lst;
      try { lst = lstatSync(full); } catch { skipped.push(ent.name); continue; }
      if (lst.isSymbolicLink()) { skipped.push(ent.name); continue; }
      if (lst.isDirectory()) {
        rec(full, relNext, depth + 1);
        continue;
      }
      if (!lst.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
      let st;
      try { st = statSync(full); } catch { skipped.push(ent.name); continue; }
      if (!st.isFile()) continue;
      files.push({ path: full, relPath: relNext, name: ent.name, mtimeMs: st.mtimeMs, sizeBytes: st.size });
    }
  }
  rec(root, "", 0);
  return { files, skipped };
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

function slug(s: string): string {
  const out = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return out.length > 0 ? out : "untitled";
}

/**
 * Topic for a note: frontmatter `topic:` wins; else first path segment under
 * the corpus root; else basename. Slugged so clustering is stable and the
 * output filename is filesystem-safe.
 */
function deriveTopic(excerpt: string, relPath: string, name: string): string {
  const lines = excerpt.split(/\r?\n/);
  if (lines[0]?.trim() === "---") {
    for (let k = 1; k < lines.length; k++) {
      if (lines[k].trim() === "---") break;
      const m = /^topic:\s*(.+?)\s*$/i.exec(lines[k]);
      if (m && m[1].length > 0) return slug(m[1]);
    }
  }
  const seg = relPath.split("/");
  if (seg.length > 1 && seg[0].length > 0) return slug(seg[0]);
  return slug(name.replace(/\.md$/i, ""));
}

function clusterSignature(notes: Array<{ name: string; mtimeMs: number }>): string {
  const sorted = [...notes]
    .map((n) => `${n.name}:${n.mtimeMs}`)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}

function monthTag(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ---------- Engine -----------------------------------------------------------

export class KnowledgeDistillationEngine {
  readonly name = "KnowledgeDistillationEngine";

  /**
   * Phase 1 — deterministic corpus scan + topic clustering. Pure-functional
   * given the filesystem state and `opts.now`. No network, no LLM.
   *
   * @param opts  Optional overrides (vaultRoot/corpusRoots, window, caps).
   * @returns     CorpusScan manifest (clusters sorted by topic asc).
   */
  scanCorpus(opts: KnowledgeDistillationOptions = {}): CorpusScan {
    validateOptions(opts);
    const vaultRoot = resolveRoot(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const corpusRoots = (opts.corpusRoots ?? DEFAULT_CORPUS_SUBDIRS.map((s) => join(vaultRoot, s)))
      .map((p) => resolveRoot(p));
    const referencesRoot = resolveRoot(opts.referencesRoot ?? join(vaultRoot, DEFAULT_REFERENCES_SUBDIR));
    // Fail loud on a self-feeding topology BEFORE any filesystem work.
    assertNoCorpusOutputOverlap(corpusRoots, referencesRoot);
    const now = opts.now ?? Date.now();
    const windowDays = clampInt(opts.windowDays, WINDOW_DAYS_MIN, WINDOW_DAYS_MAX, DEFAULT_WINDOW_DAYS);
    const maxNotesPerCluster = clampInt(opts.maxNotesPerCluster, MAX_NOTES_MIN, MAX_NOTES_MAX, DEFAULT_MAX_NOTES_PER_CLUSTER);
    const minClusterSize = clampInt(opts.minClusterSize, MIN_CLUSTER_MIN, MIN_CLUSTER_MAX, DEFAULT_MIN_CLUSTER_SIZE);
    const tokenCapBytes = clampInt(opts.tokenCapBytes, TOKEN_CAP_BYTES_MIN, TOKEN_CAP_BYTES_MAX, DEFAULT_TOKEN_CAP_BYTES);
    const maxFileBytes = clampInt(opts.maxFileBytes, MAX_FILE_BYTES_MIN, MAX_FILE_BYTES_MAX, DEFAULT_MAX_FILE_BYTES);
    const excerptBytes = clampInt(opts.excerptBytes, EXCERPT_BYTES_MIN, EXCERPT_BYTES_MAX, DEFAULT_EXCERPT_BYTES);
    const effectiveTokenCap = Math.min(tokenCapBytes, maxFileBytes);
    const windowStart = now - windowDays * MS_PER_DAY;
    const mtag = monthTag(now);

    const corpusRootsExist = corpusRoots.map((r) => existsSync(r));
    const allSkipped: string[] = [];
    const byTopic = new Map<string, DistillSourceNote[]>();
    let notesFoundInWindow = 0;

    for (const root of corpusRoots) {
      const { files, skipped } = walkMarkdown(root, WALK_MAX_DEPTH);
      for (const s of skipped) allSkipped.push(s);
      for (const f of files) {
        if (f.mtimeMs < windowStart) continue;
        notesFoundInWindow++;
        let excerpt: string;
        let truncated: boolean;
        if (f.sizeBytes > maxFileBytes) {
          excerpt = "(file exceeds maxFileBytes; body not read)";
          truncated = true;
        } else {
          const r = readExcerpt(f.path, excerptBytes);
          excerpt = r.excerpt;
          truncated = r.truncated;
        }
        const topic = deriveTopic(excerpt, f.relPath, f.name);
        const note: DistillSourceNote = {
          path: f.path,
          relPath: f.relPath,
          name: f.name,
          topic,
          mtimeMs: f.mtimeMs,
          sizeBytes: f.sizeBytes,
          excerpt,
          truncated,
        };
        const arr = byTopic.get(topic);
        if (arr) arr.push(note);
        else byTopic.set(topic, [note]);
      }
    }

    const clusters: TopicCluster[] = [];
    for (const topic of [...byTopic.keys()].sort((a, b) => a.localeCompare(b))) {
      const all = byTopic.get(topic)!;
      const ordered = [...all]
        .sort((a, b) => (b.mtimeMs - a.mtimeMs) || a.name.localeCompare(b.name))
        .slice(0, maxNotesPerCluster);
      const signature = clusterSignature(ordered);
      const outputPath = join(referencesRoot, `DISTILL-${topic}-${mtag}.md`);
      let alreadyRecorded = false;
      if (existsSync(outputPath)) {
        const r = readExcerpt(outputPath, EXISTING_DISTILL_READ_CAP);
        // A truncated read can't be trusted for the negative ("sig absent")
        // case — treat truncated existing DISTILL as "not recorded" so we
        // re-derive rather than silently skip (R12: never trust a partial
        // read for a skip decision).
        if (!r.truncated) {
          const m = KD_SIG_MARKER_RE.exec(r.excerpt);
          alreadyRecorded = m !== null && m[1] === signature;
        }
      }
      clusters.push({ topic, notes: ordered, signature, outputPath, alreadyRecorded });
    }

    return {
      vaultRoot,
      corpusRoots,
      referencesRoot,
      clusters,
      availability: {
        corpusRootsExist,
        notesFoundInWindow,
        skippedNames: allSkipped,
      },
      caps: {
        windowDays,
        maxNotesPerCluster,
        minClusterSize,
        tokenCapBytes: effectiveTokenCap,
        maxFileBytes,
        excerptBytes,
      },
      generatedAt: new Date(now).toISOString(),
    };
  }

  /**
   * Phase 2 — render + atomically write one DISTILL file per qualifying
   * topic cluster.
   *
   * Per cluster: below minClusterSize -> skipped; signature already recorded
   * -> skipped (idempotent); dryRun -> skipped; else render (Ollama when
   * client + joined-excerpt <= tokenCap; literal otherwise) and atomically
   * write DISTILL-<topic>-YYYY-MM.md. Per-cluster failures degrade to route
   * "rejected" + error so the monthly cron keeps going.
   *
   * @param opts  Options including optional `ollamaClient`, `dryRun`.
   * @returns     Full DistillResult with per-cluster traces + summary.
   */
  async distill(opts: KnowledgeDistillationOptions = {}): Promise<DistillResult> {
    validateOptions(opts);
    const tStart = Date.now();
    const nowMs = opts.now ?? tStart;
    const nowIso = new Date(nowMs).toISOString();
    const scan = this.scanCorpus(opts);
    const tScanDone = Date.now();
    const model = opts.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    const client = opts.ollamaClient;
    const dryRun = opts.dryRun === true;
    const mkdirIfMissing = opts.mkdirIfMissing !== false;

    if (!dryRun && mkdirIfMissing) {
      try {
        mkdirSync(scan.referencesRoot, { recursive: true });
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") throw e;
      }
    }

    const distilled: DistilledCluster[] = [];
    const warnings: string[] = [];

    for (const cluster of scan.clusters) {
      const tEntry = Date.now();

      if (cluster.notes.length < scan.caps.minClusterSize) {
        distilled.push({
          cluster, route: "skipped", body: null, outputPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }
      if (cluster.alreadyRecorded) {
        distilled.push({
          cluster, route: "skipped", body: null, outputPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }
      if (dryRun) {
        distilled.push({
          cluster, route: "skipped", body: null, outputPath: null,
          error: null, durationMs: Date.now() - tEntry,
        });
        continue;
      }

      try {
        const joined = cluster.notes
          .map((n) => `### ${n.name}\n${n.excerpt}`)
          .join("\n\n");
        const joinedBytes = Buffer.byteLength(joined, "utf8");

        let bodyCore: string | null = null;
        let route: DistillRoute = "literal";

        if (client && joinedBytes <= scan.caps.tokenCapBytes) {
          const out = await safeSummarise(client, model, {
            system: "You are a knowledge-distillation assistant for the PRISM platform. Given several notes on ONE topic, produce a canonical reference: ## Summary (3-5 sentences) + ## Key Points (bulleted) + ## Open Questions (bulleted). Preserve concrete numbers, proper nouns, file names, and unit ids verbatim. No preamble.",
            prompt: joined,
          });
          const trimmed = out ? out.trim() : "";
          if (trimmed.length > 0) {
            bodyCore = sanitizeMultiline(trimmed);
            route = "ollama";
          }
        }
        if (bodyCore === null) {
          bodyCore = cluster.notes
            .map((n) => `- **${neutralizeMarkers(n.name)}** — ${neutralizeMarkers(firstMeaningfulLine(n.excerpt))}`)
            .join("\n");
          route = "literal";
        }

        const doc = renderDistill(cluster, bodyCore, nowIso, route);
        const tmpPath = cluster.outputPath + ".tmp";
        writeFileSync(tmpPath, doc, "utf8");
        try {
          renameSync(tmpPath, cluster.outputPath);
        } catch (renameErr) {
          try { renameSync(tmpPath, tmpPath + ".orphan"); } catch { /* best-effort */ }
          throw renameErr;
        }

        distilled.push({
          cluster, route, body: bodyCore, outputPath: cluster.outputPath,
          error: null, durationMs: Date.now() - tEntry,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        distilled.push({
          cluster, route: "rejected", body: null, outputPath: null,
          error: msg, durationMs: Date.now() - tEntry,
        });
        warnings.push(`distill failed for topic ${cluster.topic}: ${msg}`);
      }
    }

    const summary = {
      ollama: distilled.filter((d) => d.route === "ollama").length,
      literal: distilled.filter((d) => d.route === "literal").length,
      skipped: distilled.filter((d) => d.route === "skipped").length,
      rejected: distilled.filter((d) => d.route === "rejected").length,
      failed: distilled.filter((d) => d.route === "rejected" && d.error !== null).length,
    };
    const meetsProcessingFloor = summary.failed === 0;

    if (scan.clusters.length === 0) warnings.push("no topic clusters in window");
    if (scan.availability.notesFoundInWindow === 0) warnings.push("no notes modified within window");
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
        `skipped ${scan.availability.skippedNames.length} non-conforming name(s): ${head}${tail}`,
      );
    }
    if (!meetsProcessingFloor) {
      warnings.push(`processing floor unmet: ${summary.failed} cluster(s) failed`);
    }

    const tEnd = Date.now();
    const synthesizer: "ollama" | "literal" = summary.ollama > 0 ? "ollama" : "literal";

    return {
      scan, distilled, summary, warnings, meetsProcessingFloor,
      durationMs: { scan: tScanDone - tStart, distill: tEnd - tScanDone, total: tEnd - tStart },
      synthesizer,
      generatedAt: nowIso,
    };
  }
}

// ---------- Renderers + safe wrappers ----------------------------------------

function renderDistill(
  cluster: TopicCluster,
  bodyCore: string,
  nowIso: string,
  route: DistillRoute,
): string {
  const sourceList = cluster.notes
    .map((n) => `- ${n.relPath} (${new Date(n.mtimeMs).toISOString()}, ${n.sizeBytes} bytes)`)
    .join("\n");
  return [
    `# Distilled Reference — ${cluster.topic}`,
    `_Generated ${nowIso} from ${cluster.notes.length} note(s) — synthesizer=${route} <!-- kd-sig: ${cluster.signature} -->_`,
    "",
    bodyCore.trim(),
    "",
    "## Sources",
    sourceList,
    "",
  ].join("\n");
}

async function safeSummarise(
  client: OllamaDistillClient,
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
  neutralizeMarkers,
  sanitizeMultiline,
  firstMeaningfulLine,
  deriveTopic,
  slug,
  pathContainsOrEquals,
  assertNoCorpusOutputOverlap,
  clusterSignature,
  monthTag,
  renderDistill,
  KD_SIG_MARKER_RE,
  EXISTING_DISTILL_READ_CAP,
  DEFAULT_TOKEN_CAP_BYTES,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MIN_CLUSTER_SIZE,
};

// ---------- Singleton --------------------------------------------------------

export const knowledgeDistillationEngine = new KnowledgeDistillationEngine();

export default KnowledgeDistillationEngine;

export async function runKnowledgeDistillation(
  opts: KnowledgeDistillationOptions = {},
): Promise<DistillResult> {
  validateOptions(opts);
  return knowledgeDistillationEngine.distill(opts);
}
