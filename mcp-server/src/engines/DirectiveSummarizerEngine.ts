/**
 * DirectiveSummarizerEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P4-U02
 *
 * Reads `state/shared/CLAUDE-CODEX-*.md` shared directives and produces a
 * compact 5-line summary per file, persisting them all to a single
 * cache at `knowledge/directives/SUMMARIES.md`.
 *
 * Two summarization modes:
 *   - Ollama (preferred): qwen2.5-coder:7b @ http://localhost:11434
 *   - Heuristic fallback: rank-based extraction (frontmatter title +
 *     top-N highest-priority sentences/bullets — never throws, no network)
 *
 * The heuristic fallback is the contract floor: every test runs without
 * Ollama and must produce a stable, deterministic 5-line summary. Ollama
 * is an optional quality enhancement for production callers.
 *
 * Persistence:
 *   knowledge/directives/SUMMARIES.md            ← human-readable
 *   knowledge/directives/SUMMARIES.json          ← machine-readable cache
 *
 * Pure functions exported for tests:
 *   - extractTitle(md)
 *   - rankLines(md)
 *   - heuristicSummarize(md, lineLimit)
 *   - renderSummariesMarkdown(summaries[])
 */
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const DIRECTIVES_GLOB_DIR = path.join(REPO_ROOT, "state", "shared");
const DIRECTIVES_PREFIX = "CLAUDE-CODEX-";
const DIRECTIVES_SUFFIX = ".md";
const CACHE_DIR = path.join(REPO_ROOT, "knowledge", "directives");
const CACHE_MD_PATH = path.join(CACHE_DIR, "SUMMARIES.md");
const CACHE_JSON_PATH = path.join(CACHE_DIR, "SUMMARIES.json");

const SUMMARY_LINE_LIMIT = 5;
const SCHEMA_VERSION = "1.0.0";

// Tuning for heuristic ranking
const PRIORITY_KEYWORDS_HIGH = ["must", "always", "never", "do not", "required", "mandatory", "block", "fail"];
const PRIORITY_KEYWORDS_MEDIUM = ["should", "prefer", "avoid", "ensure", "verify", "check"];
const ACTION_VERBS = ["use", "run", "call", "read", "write", "claim", "release", "post"];

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface DirectiveSummary {
  /** File name without path: "CLAUDE-CODEX-MCP-DIRECTIVE.md" */
  file_name: string;
  /** Absolute or repo-relative path used to build this summary */
  source_path: string;
  /** Title extracted from frontmatter / H1 / file name */
  title: string;
  /** Up to 5 short summary lines (the contract). */
  summary_lines: string[];
  /** Source text byte length — used for staleness checks */
  source_bytes: number;
  /** mtime of the source file when this summary was built */
  source_mtime: string;
  /** "ollama" | "heuristic" */
  mode: "ollama" | "heuristic";
  /** Build timestamp */
  built_at: string;
}

export interface SummariesCache {
  schemaVersion: typeof SCHEMA_VERSION;
  built_at: string;
  total_files: number;
  ollama_used: number;
  heuristic_used: number;
  summaries: DirectiveSummary[];
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers — pure parsing
// ──────────────────────────────────────────────────────────────────────────

/** Strip frontmatter, leaving the markdown body. */
function stripFrontmatter(md: string): { body: string; frontmatter: Record<string, string> } {
  const fm: Record<string, string> = {};
  if (!md.startsWith("---")) return { body: md, frontmatter: fm };
  const end = md.indexOf("\n---", 4);
  if (end < 0) return { body: md, frontmatter: fm };
  const block = md.slice(4, end);
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.+?)\s*$/);
    if (m) fm[m[1]] = m[2];
  }
  // Skip the closing --- and any trailing newline
  let cursor = end + 4;
  if (md[cursor] === "\n") cursor++;
  return { body: md.slice(cursor), frontmatter: fm };
}

/**
 * Pull a human-readable title from the directive in priority order:
 *   1. frontmatter `title:`
 *   2. first H1 (# ...)
 *   3. first H2 (## ...) when no H1 exists
 *   4. file name with prefix stripped + Title-Case
 */
export function extractTitle(md: string, fileName?: string): string {
  const { body, frontmatter } = stripFrontmatter(md);
  if (frontmatter.title && frontmatter.title.length > 0) return frontmatter.title;

  const h1 = body.match(/^#\s+(.+?)\s*$/m);
  if (h1) return h1[1].trim();

  const h2 = body.match(/^##\s+(.+?)\s*$/m);
  if (h2) return h2[1].trim();

  if (fileName) {
    const base = fileName.replace(DIRECTIVES_SUFFIX, "").replace(DIRECTIVES_PREFIX, "");
    return base.replace(/-/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Untitled directive";
}

/**
 * Rank candidate summary lines from the markdown body. Returns lines sorted
 * by descending priority. Only considers content lines (skips headings, code
 * fences, blockquotes, and trivially short lines).
 */
export function rankLines(md: string): Array<{ text: string; score: number }> {
  const { body } = stripFrontmatter(md);
  const lines = body.split(/\r?\n/);

  const candidates: Array<{ text: string; score: number; index: number }> = [];
  let inCode = false;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (line.startsWith("```")) { inCode = !inCode; return; }
    if (inCode) return;
    if (line.length === 0) return;
    if (line.startsWith("#")) return;          // skip headings
    if (line.startsWith(">")) return;          // skip blockquotes
    if (line.startsWith("---")) return;        // skip rule
    if (line.length < 20) return;              // skip trivially short

    // Extract bullet text where applicable
    const bulletText = line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "");
    if (bulletText.length < 20) return;

    const lc = bulletText.toLowerCase();
    let score = 0;

    // Priority keywords
    for (const kw of PRIORITY_KEYWORDS_HIGH) if (lc.includes(kw)) score += 3;
    for (const kw of PRIORITY_KEYWORDS_MEDIUM) if (lc.includes(kw)) score += 2;
    for (const kw of ACTION_VERBS) if (lc.match(new RegExp(`\\b${kw}\\b`))) score += 1;

    // Bullet/numbered items get a slight boost (often the actionable items)
    if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) score += 1;

    // Inline code (referenced engines/paths) is informative
    if (bulletText.includes("`")) score += 1;

    // Penalize over-long sentences slightly to avoid bloat
    if (bulletText.length > 250) score -= 1;

    // Position bonus: earlier lines score higher (max +2 in first 20 lines)
    if (idx < 20) score += 2 - Math.floor(idx / 10);

    candidates.push({ text: bulletText, score, index: idx });
  });

  // Sort by score desc, then by original position asc
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates.map((c) => ({ text: c.text, score: c.score }));
}

/**
 * Trim a summary line to a hard token budget (~140 chars ≈ 35 tokens).
 * Cuts on the nearest sentence/period boundary when possible.
 */
function trimLine(line: string, maxChars = 200): string {
  if (line.length <= maxChars) return line;
  const slice = line.slice(0, maxChars);
  const lastDot = slice.lastIndexOf(". ");
  if (lastDot > 60) return slice.slice(0, lastDot + 1);
  return slice.replace(/\s+\S*$/, "") + "...";
}

/** Heuristic fallback: take the top-N ranked lines after dedup. */
export function heuristicSummarize(md: string, lineLimit = SUMMARY_LINE_LIMIT): string[] {
  const ranked = rankLines(md);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { text } of ranked) {
    const key = text.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimLine(text));
    if (out.length >= lineLimit) break;
  }
  return out;
}

/** Render the multi-directive cache as a single markdown document. */
export function renderSummariesMarkdown(summaries: DirectiveSummary[]): string {
  const lines: string[] = [
    "# Shared Directive Summaries",
    "",
    `_Auto-generated by DirectiveSummarizerEngine. Last build: ${new Date().toISOString()}._`,
    `_${summaries.length} files indexed. Refresh on demand via \`npm run summarize:directives\`._`,
    "",
    "Each entry: 5-line distilled summary. Read the source file when full context is required.",
    "",
  ];
  for (const s of summaries) {
    lines.push(`## ${s.title}`);
    lines.push(`_Source: \`${s.file_name}\` · mode: ${s.mode} · built: ${s.built_at}_`);
    lines.push("");
    for (const ln of s.summary_lines) lines.push(`- ${ln}`);
    lines.push("");
  }
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────────
// Engine
// ──────────────────────────────────────────────────────────────────────────

export class DirectiveSummarizerEngine {
  /** List the absolute paths of all CLAUDE-CODEX-*.md files in state/shared/. */
  listDirectiveFiles(): string[] {
    if (!fs.existsSync(DIRECTIVES_GLOB_DIR)) return [];
    return fs.readdirSync(DIRECTIVES_GLOB_DIR)
      .filter((f) => f.startsWith(DIRECTIVES_PREFIX) && f.endsWith(DIRECTIVES_SUFFIX))
      .sort()
      .map((f) => path.join(DIRECTIVES_GLOB_DIR, f));
  }

  /** Summarize one file via heuristic (no network). */
  summarizeFileHeuristic(filePath: string): DirectiveSummary {
    const md = fs.readFileSync(filePath, "utf-8");
    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const title = extractTitle(md, fileName);
    const summary_lines = heuristicSummarize(md);
    return {
      file_name: fileName,
      source_path: filePath,
      title,
      summary_lines,
      source_bytes: md.length,
      source_mtime: stat.mtime.toISOString(),
      mode: "heuristic",
      built_at: new Date().toISOString(),
    };
  }

  /** Summarize one file via Ollama; degrade to heuristic on any failure. */
  async summarizeFileViaOllama(filePath: string, opts: { model?: string; timeoutMs?: number } = {}): Promise<DirectiveSummary> {
    const heur = this.summarizeFileHeuristic(filePath);
    try {
      const { ollamaClientEngine } = await import("./OllamaClientEngine.js");
      if (!ollamaClientEngine.isConnected()) {
        const conn = await ollamaClientEngine.connect();
        if (!conn.ok) return heur; // fall back silently
      }
      const md = fs.readFileSync(filePath, "utf-8");
      // Cap input size (qwen2.5-coder:7b context: ~32K tokens; we send <8K chars)
      const trimmed = md.slice(0, 8000);
      const prompt = `Summarize the following PRISM shared directive into exactly ${SUMMARY_LINE_LIMIT} short bullet lines. Each line must be a single declarative sentence (no preamble, no headings). Focus on rules, gates, and actionable behavior. Do NOT repeat the title.\n\n---\n${trimmed}\n---\n\nReturn ${SUMMARY_LINE_LIMIT} bullet lines starting with "- ".`;

      const generated = await ollamaClientEngine.generate({
        model: opts.model ?? "qwen2.5-coder:7b",
        prompt,
        temperature: 0.2,
      });
      if (!generated.ok || !generated.value) return heur;

      const lines = generated.value
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => l.replace(/^[-*+]\s+/, ""))
        .slice(0, SUMMARY_LINE_LIMIT);

      if (lines.length < 1) return heur;

      return {
        ...heur,
        summary_lines: lines.map((l) => trimLine(l)),
        mode: "ollama",
      };
    } catch {
      return heur;
    }
  }

  /** Summarize all directives. Use Ollama if `useOllama=true` (default false for tests). */
  async summarizeAll(opts: { useOllama?: boolean; model?: string } = {}): Promise<SummariesCache> {
    const files = this.listDirectiveFiles();
    const summaries: DirectiveSummary[] = [];
    let ollamaUsed = 0;
    let heuristicUsed = 0;

    for (const file of files) {
      const s = opts.useOllama
        ? await this.summarizeFileViaOllama(file, { model: opts.model })
        : this.summarizeFileHeuristic(file);
      summaries.push(s);
      if (s.mode === "ollama") ollamaUsed++; else heuristicUsed++;
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      built_at: new Date().toISOString(),
      total_files: summaries.length,
      ollama_used: ollamaUsed,
      heuristic_used: heuristicUsed,
      summaries,
    };
  }

  /** Build all summaries and persist both .md (human) and .json (cache). */
  async buildAndPersist(opts: { useOllama?: boolean; model?: string } = {}): Promise<{ ok: boolean; cache: SummariesCache; md_path: string; json_path: string; error?: string }> {
    const cache = await this.summarizeAll(opts);
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_MD_PATH, renderSummariesMarkdown(cache.summaries));
      fs.writeFileSync(CACHE_JSON_PATH, JSON.stringify(cache, null, 2));
      return { ok: true, cache, md_path: CACHE_MD_PATH, json_path: CACHE_JSON_PATH };
    } catch (e) {
      return {
        ok: false,
        cache,
        md_path: CACHE_MD_PATH,
        json_path: CACHE_JSON_PATH,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /** Read the cached summaries from disk if available. */
  read(): SummariesCache | null {
    if (!fs.existsSync(CACHE_JSON_PATH)) return null;
    try {
      return JSON.parse(fs.readFileSync(CACHE_JSON_PATH, "utf-8")) as SummariesCache;
    } catch {
      return null;
    }
  }

  /**
   * Detect whether a write to `filePath` is one of the watched directive files.
   * Used by the PostToolUse hook to decide whether to refresh.
   */
  isDirectiveFile(filePath: string): boolean {
    const norm = filePath.replace(/\\/g, "/").toLowerCase();
    return norm.includes("/state/shared/") &&
      norm.includes("claude-codex-") &&
      norm.endsWith(".md");
  }
}

// Singleton + path constants
export const directiveSummarizerEngine = new DirectiveSummarizerEngine();
export const PATHS = {
  REPO_ROOT,
  DIRECTIVES_GLOB_DIR,
  CACHE_DIR,
  CACHE_MD_PATH,
  CACHE_JSON_PATH,
};
export const CONSTANTS = {
  SUMMARY_LINE_LIMIT,
  DIRECTIVES_PREFIX,
  DIRECTIVES_SUFFIX,
};
