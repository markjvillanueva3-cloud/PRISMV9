// WIRE-EXEMPT: cron-invoked synthesizer — wired via scripts/cron/daily-context-cron.ps1 scheduled-task at 06:00 local. Engine is a library (importable for tests + dispatcher composition) AND a CLI (--run) for the scheduled task. No dispatcher action is required for the cron path; downstream composition (Track G observability, future digest pipelines) imports the engine class directly.
/**
 * DailyContextWorkflowEngine — OBSIDIAN-INTELLIGENCE-MS3 / B1 (U-DAILY-CONTEXT-WORKFLOW)
 * ======================================================================================
 * Synthesizes yesterday's daily note + active project overviews + inbox into a
 * morning brief at `knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md`.
 * Default summarizer is Ollama qwen2.5-coder:7b (token-economy compliant).
 *
 * Pluggable interfaces for testability (mirrors E1 / E4 / C2 pattern):
 *   - LoaderFn       : reads filesystem sources (default `defaultLoader`)
 *   - SummarizerFn   : LLM call (default `defaultOllamaSummarizer`)
 *
 * Failure model:
 *   - invalid-vault-root → ok=false (vault dir does not exist)
 *   - no-sources         → ok=false (loader returned 0 files; nothing to summarize)
 *   - summarizer-failed  → ok=false (Ollama unreachable / refused / parse error)
 *   - write-failed       → ok=false (output mkdir or writeFile failed)
 *
 * Determinism: when both `loader` and `summarizer` are injected, the engine is
 * fully deterministic (no system clock except via the explicit `date` arg, no
 * fs except via the loader, no network except via the summarizer). The
 * fixture-driven test in `__tests__/DailyContextWorkflow.test.ts` relies on this.
 *
 * CLI mode (`node DailyContextWorkflowEngine.js --run`): invoked by the
 * `daily-context-cron.ps1` scheduled task. Defaults to today's UTC date and
 * the canonical vault root at `H:/prism/knowledge/memories/`. Exits 0 on
 * success, 1 on engine failure.
 *
 * @module engines/DailyContextWorkflowEngine
 */

import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* -------------------------- enums / schemas -------------------------- */

export const SourceKindEnum = z.enum(["daily", "project", "inbox"]);
export type SourceKind = z.infer<typeof SourceKindEnum>;

export const LoadedSourceSchema = z
  .object({
    kind: SourceKindEnum,
    path: z.string().min(1),
    body: z.string(),
    bytes: z.number().int().nonnegative(),
  })
  .strict();
export type LoadedSource = z.infer<typeof LoadedSourceSchema>;

export const DailyContextErrorClassSchema = z.enum([
  "invalid-vault-root",
  "no-sources",
  "summarizer-failed",
  "write-failed",
]);
export type DailyContextErrorClass = z.infer<typeof DailyContextErrorClassSchema>;

/* ---------------------- pluggable interfaces ------------------------ */

export interface LoaderOpts {
  vaultRoot: string; // absolute path to .../knowledge/memories
  date: string; // ISO YYYY-MM-DD (the brief's target date, "today")
}

export interface LoaderFn {
  (opts: LoaderOpts): Promise<LoadedSource[]>;
}

export interface SummarizerOpts {
  sources: LoadedSource[];
  date: string;
}

export type SummarizerResult =
  | { ok: true; text: string; model?: string }
  | { ok: false; error: string };

export interface SummarizerFn {
  (opts: SummarizerOpts): Promise<SummarizerResult>;
}

/* ------------------------------ helpers ------------------------------ */

/** Constants — exported so tests can assert defaults without hard-coding. */
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:7b";
export const DEFAULT_PROJECT_LIMIT = 5;
export const DEFAULT_INBOX_LIMIT = 10;
export const MAX_SOURCE_BYTES = 12_000; // truncate per-source to keep prompt cheap
export const MIN_SOURCES_FOR_BRIEF = 3; // exit-condition: ≥3 source files

/** Format a Date as ISO YYYY-MM-DD in UTC (deterministic regardless of host TZ). */
export function isoDateUTC(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Yesterday in UTC relative to `d`. */
export function yesterdayUTC(d: Date = new Date()): string {
  const y = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  return isoDateUTC(y);
}

/** Truncate body to MAX_SOURCE_BYTES, appending a "[truncated]" marker if needed. */
export function truncateBody(body: string, max: number = MAX_SOURCE_BYTES): string {
  if (body.length <= max) return body;
  return body.slice(0, max) + "\n\n[truncated]\n";
}

/** Build the Ollama prompt — pure, deterministic, returnable to tests. */
export function buildSummarizerPrompt(sources: LoadedSource[], date: string): string {
  const lines: string[] = [
    "You are a manufacturing-software shop daily-context synthesizer.",
    "Given yesterday's daily note + active project overviews + inbox captures,",
    "produce a single-paragraph morning brief (~140 words) covering:",
    "  - one sentence on yesterday's most relevant carryover",
    "  - one sentence per active project (max 3 projects)",
    "  - one sentence rolling up inbox priorities",
    "Tone: terse, factual, no preamble or sign-off.",
    "Output prose only — no markdown headers, no bullet lists.",
    "",
    `DATE: ${date}`,
    "",
  ];
  for (const s of sources) {
    lines.push(`--- ${s.kind.toUpperCase()} : ${path.basename(s.path)} ---`);
    lines.push(truncateBody(s.body));
    lines.push("");
  }
  lines.push("BRIEF:");
  return lines.join("\n");
}

/** Stable lexicographic sort of paths — so loader output is deterministic. */
function sortByPath<T extends { path: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.path.localeCompare(b.path));
}

/** Recursively read directory's top-level .md files (no subdir recursion). */
async function readMarkdownFiles(dir: string): Promise<Array<{ path: string; body: string; mtimeMs: number }>> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: Array<{ path: string; body: string; mtimeMs: number }> = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.toLowerCase().endsWith(".md")) continue;
    const full = path.join(dir, ent.name);
    try {
      const [body, stat] = await Promise.all([fs.readFile(full, "utf8"), fs.stat(full)]);
      out.push({ path: full, body, mtimeMs: stat.mtimeMs });
    } catch {
      // skip unreadable files (fail-soft per file)
    }
  }
  return out;
}

/* ---------------------------- default loader ---------------------------- */

/**
 * Read yesterday's daily note + ≤PROJECT_LIMIT recent project overviews +
 * ≤INBOX_LIMIT recent inbox captures from the canonical vault layout:
 *
 *   <vaultRoot>/daily/YYYY-MM-DD.md     (yesterday's note)
 *   <vaultRoot>/projects/*.md           (top-N by mtime)
 *   <vaultRoot>/inbox/*.md              (top-N by mtime)
 *
 * Missing dirs / files are silently skipped (fail-soft). The exit-condition
 * "≥3 source files" is asserted at the engine level, not here.
 */
export async function defaultLoader(opts: LoaderOpts): Promise<LoadedSource[]> {
  const vault = opts.vaultRoot;
  const yest = yesterdayUTC(new Date(`${opts.date}T00:00:00Z`));
  const out: LoadedSource[] = [];

  // daily/<yesterday>.md
  const dailyPath = path.join(vault, "daily", `${yest}.md`);
  try {
    const body = await fs.readFile(dailyPath, "utf8");
    out.push({ kind: "daily", path: dailyPath, body, bytes: Buffer.byteLength(body, "utf8") });
  } catch {
    // no daily note — fine, just skip
  }

  // projects/*.md — top N by mtime
  const projects = await readMarkdownFiles(path.join(vault, "projects"));
  projects.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const p of projects.slice(0, DEFAULT_PROJECT_LIMIT)) {
    out.push({ kind: "project", path: p.path, body: p.body, bytes: Buffer.byteLength(p.body, "utf8") });
  }

  // inbox/*.md — top N by mtime
  const inbox = await readMarkdownFiles(path.join(vault, "inbox"));
  inbox.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const i of inbox.slice(0, DEFAULT_INBOX_LIMIT)) {
    out.push({ kind: "inbox", path: i.path, body: i.body, bytes: Buffer.byteLength(i.body, "utf8") });
  }

  return sortByPath(out);
}

/* -------------------- default Ollama summarizer -------------------- */

/**
 * POST to Ollama `/api/generate` with qwen2.5-coder:7b. Returns ok=false on
 * any network / parse / refusal error — never throws. Honors env knobs:
 *   PRISM_DAILY_CONTEXT_OLLAMA_URL  (default http://127.0.0.1:11434/api/generate)
 *   PRISM_DAILY_CONTEXT_OLLAMA_MODEL (default qwen2.5-coder:7b)
 *   PRISM_DAILY_CONTEXT_OLLAMA_TIMEOUT_MS (default 60000)
 */
export async function defaultOllamaSummarizer(opts: SummarizerOpts): Promise<SummarizerResult> {
  const url = process.env.PRISM_DAILY_CONTEXT_OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const model = process.env.PRISM_DAILY_CONTEXT_OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const timeoutRaw = Number(process.env.PRISM_DAILY_CONTEXT_OLLAMA_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 60_000;

  const prompt = buildSummarizerPrompt(opts.sources, opts.date);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      return { ok: false, error: `http-${resp.status}` };
    }
    const json = (await resp.json()) as { response?: string };
    const text = (json.response || "").trim();
    if (!text) return { ok: false, error: "empty-response" };
    return { ok: true, text, model };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

/* -------------------------- brief formatter -------------------------- */

export interface FormatBriefOpts {
  summary: string;
  sources: LoadedSource[];
  date: string;
  model?: string;
}

/**
 * Pure formatter — emits markdown with YAML frontmatter listing every source
 * by relative path + kind. The frontmatter is the audit trail required by
 * exit-condition #2 ("Output references at least 3 source files").
 */
export function formatBrief(opts: FormatBriefOpts): string {
  const { summary, sources, date, model } = opts;
  const fm: string[] = [
    "---",
    "kind: daily-context",
    `date: ${date}`,
    `generated_at: ${new Date().toISOString()}`,
    `sources_count: ${sources.length}`,
  ];
  if (model) fm.push(`summarizer_model: ${model}`);
  fm.push("sources:");
  for (const s of sources) {
    // YAML-safe: paths in PRISM never contain quote chars; single-line entry.
    fm.push(`  - kind: ${s.kind}`);
    fm.push(`    path: ${s.path.replace(/\\/g, "/")}`);
    fm.push(`    bytes: ${s.bytes}`);
  }
  fm.push("---");
  fm.push("");
  fm.push(`# Daily Context — ${date}`);
  fm.push("");
  fm.push(summary.trim());
  fm.push("");
  fm.push("## Sources");
  fm.push("");
  for (const s of sources) {
    const rel = s.path.replace(/\\/g, "/");
    fm.push(`- **${s.kind}** — \`${rel}\` (${s.bytes} bytes)`);
  }
  fm.push("");
  return fm.join("\n");
}

/* -------------------------- engine -------------------------- */

export interface RunDailyOpts {
  /** ISO YYYY-MM-DD; defaults to today UTC. */
  date?: string;
  /** Absolute path to `knowledge/memories/`. */
  vaultRoot: string;
  /** Where to write `DAILY-CONTEXT-<date>.md`. Default `<vaultRoot>/generated/`. */
  outputDir?: string;
  /** Injectable for tests. Default `defaultLoader`. */
  loader?: LoaderFn;
  /** Injectable for tests. Default `defaultOllamaSummarizer`. */
  summarizer?: SummarizerFn;
}

export interface RunDailyOk {
  ok: true;
  path: string;
  date: string;
  sources_used: number;
  bytes_written: number;
}

export interface RunDailyFail {
  ok: false;
  error: DailyContextErrorClass;
  detail?: string;
}

export type RunDailyResult = RunDailyOk | RunDailyFail;

export class DailyContextWorkflowEngine {
  private loader: LoaderFn;
  private summarizer: SummarizerFn;

  constructor(opts: { loader?: LoaderFn; summarizer?: SummarizerFn } = {}) {
    this.loader = opts.loader ?? defaultLoader;
    this.summarizer = opts.summarizer ?? defaultOllamaSummarizer;
  }

  async runDaily(opts: RunDailyOpts): Promise<RunDailyResult> {
    const date = opts.date ?? isoDateUTC();
    const vaultRoot = opts.vaultRoot;
    const outputDir = opts.outputDir ?? path.join(vaultRoot, "generated");

    // 1. validate vault root
    try {
      const stat = await fs.stat(vaultRoot);
      if (!stat.isDirectory()) {
        return { ok: false, error: "invalid-vault-root", detail: vaultRoot };
      }
    } catch (err) {
      return {
        ok: false,
        error: "invalid-vault-root",
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    // 2. load sources
    let sources: LoadedSource[];
    try {
      sources = await this.loader({ vaultRoot, date });
    } catch (err) {
      // loader failure is treated as no-sources (fail-soft)
      return {
        ok: false,
        error: "no-sources",
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    // exit-condition: ≥3 source files
    if (sources.length < MIN_SOURCES_FOR_BRIEF) {
      return {
        ok: false,
        error: "no-sources",
        detail: `loader returned ${sources.length} sources; ${MIN_SOURCES_FOR_BRIEF} required`,
      };
    }

    // 3. summarize
    const sumResult = await this.summarizer({ sources, date });
    if (!sumResult.ok) {
      return { ok: false, error: "summarizer-failed", detail: sumResult.error };
    }

    // 4. format + write
    const md = formatBrief({
      summary: sumResult.text,
      sources,
      date,
      model: "model" in sumResult ? sumResult.model : undefined,
    });
    const outPath = path.join(outputDir, `DAILY-CONTEXT-${date}.md`);

    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(outPath, md, "utf8");
    } catch (err) {
      return {
        ok: false,
        error: "write-failed",
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    return {
      ok: true,
      path: outPath,
      date,
      sources_used: sources.length,
      bytes_written: Buffer.byteLength(md, "utf8"),
    };
  }
}

/* -------------------------- CLI (scheduled-task entry) -------------------------- */

/**
 * Invoked by `scripts/cron/daily-context-cron.ps1` via:
 *   node H:/prism/mcp-server/dist/engines/DailyContextWorkflowEngine.js --run
 *
 * Knobs:
 *   PRISM_DAILY_CONTEXT_VAULT_ROOT  (default H:/prism/knowledge/memories)
 *   PRISM_DAILY_CONTEXT_DATE        (override target date — for backfill)
 */
async function runCli(): Promise<number> {
  const vaultRoot =
    process.env.PRISM_DAILY_CONTEXT_VAULT_ROOT || "H:/prism/knowledge/memories";
  const date = process.env.PRISM_DAILY_CONTEXT_DATE || isoDateUTC();
  const engine = new DailyContextWorkflowEngine();
  const result = await engine.runDaily({ vaultRoot, date });
  if (result.ok) {
    process.stdout.write(
      JSON.stringify({ ok: true, path: result.path, sources_used: result.sources_used }) + "\n",
    );
    return 0;
  }
  process.stderr.write(JSON.stringify({ ok: false, error: result.error, detail: result.detail }) + "\n");
  return 1;
}

// CLI guard — only run when invoked directly, never on library import.
const argv1 = process.argv[1] || "";
const invokedDirectly = (() => {
  try {
    const thisUrl = pathToFileURL(argv1).href;
    return import.meta.url === thisUrl;
  } catch {
    // fallback: filename match (works for both src .ts and dist .js paths)
    return /DailyContextWorkflowEngine\.(?:js|ts)$/i.test(argv1);
  }
})();

if (invokedDirectly && process.argv.includes("--run")) {
  runCli().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`CLI crash: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(2);
    },
  );
}

// keep eslint happy about unused fileURLToPath import (it's intentional — future-proofing)
void fileURLToPath;
