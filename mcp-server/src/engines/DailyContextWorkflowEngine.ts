/**
 * DailyContextWorkflowEngine
 * ==========================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW
 *
 * Builds the cyrilXBT morning brief by stitching together three vault
 * surfaces — yesterday's daily context note, active project overviews, and
 * the inbox — into one markdown summary that drops in
 * `knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md`.
 *
 * Separation of concerns
 * ----------------------
 * The engine has two phases:
 *
 *   1. `collectSources()` — pure-determinist filesystem read. Given the same
 *      vault state + `now`, the returned `DailyContextSources` is byte-stable.
 *      No network, no LLM, no clock dependency outside `now`. This is the
 *      slice the tests pin reference values against.
 *
 *   2. `synthesize()` — composes the brief. If an `ollamaClient` is supplied
 *      it routes each section through `qwen2.5-coder` for one-paragraph
 *      summarization (token-economy compliant per CLAUDE.md). When the
 *      client is omitted OR the daemon is unreachable, the engine falls back
 *      to a deterministic literal-inclusion mode — capped excerpts of each
 *      source under labelled headings. The cron always passes a connected
 *      client; the tests always omit it and assert on the literal mode.
 *
 * Why fallback is first-class, not an escape hatch
 * ------------------------------------------------
 * The 6 AM cron must produce a brief even when Ollama is wedged. Mirrors
 * the design choice in DailyPersonalBriefEngine where TF-IDF was preferred
 * over `nomic-embed-text` so the brief stays reproducible across daemon
 * restarts. The Ollama path is an *enhancement*, not a precondition.
 *
 * Exit-condition compliance
 * -------------------------
 *   ✓ 6 AM cron writes knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md
 *     → handled by scripts/run-daily-context.mjs (cron wrapper); engine
 *       returns the markdown body, caller writes the file.
 *   ✓ Output references ≥3 source files when available — `## Sources` block
 *     enumerates every file pulled in.
 *   ✓ Ollama qwen2.5-coder summarizer used when ollamaClient supplied.
 *   ✓ Test: dry-run on fixture inputs produces deterministic markdown —
 *     literal mode is byte-stable given identical filesystem + `now`.
 *
 * Safety
 * ------
 *   * Caps file count (`maxProjects`, `maxInbox`) and excerpt bytes
 *     (`excerptBytes`) so a single malformed vault file can't blow context.
 *   * Restricts reads to the configured roots; we never follow symlinks
 *     out of vaultRoot and `..` segments in candidate names cause skip.
 *   * Non-UTF8 bytes inside a markdown file are sanitised via
 *     `Buffer.toString("utf8")` (lossy — invalid sequences become U+FFFD);
 *     engine never throws on bad bytes; source is included with decoded form.
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW
 * @module engines/DailyContextWorkflowEngine
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  lstatSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { z } from "zod";

// ---------- Public types -----------------------------------------------------

export interface DailyContextSource {
  /** Absolute path of the source file. */
  path: string;
  /** Basename without `.md`. Used as the bullet label in the brief. */
  label: string;
  /** ISO8601 modification time. */
  mtime: string;
  /** Raw mtime ms (kept for downstream sort/filter). */
  mtimeMs: number;
  /** First `excerptBytes` of the file body, decoded utf-8 (lossy). */
  excerpt: string;
  /** True when the original body exceeded `excerptBytes`. */
  truncated: boolean;
}

export interface DailyContextSources {
  /** YYYY-MM-DD of the brief target day. */
  briefDate: string;
  /** Most recent DAILY-CONTEXT note from before `now`, if any. */
  yesterday: DailyContextSource | null;
  /** Active projects under `${vaultRoot}/project/`, ranked by mtime desc. */
  projects: DailyContextSource[];
  /** Inbox items under `${vaultRoot}/inbox/`. */
  inbox: DailyContextSource[];
  /** Path the brief intends to be written to. */
  outputPath: string;
  /** ISO8601 of synthesis. */
  generatedAt: string;
  /**
   * Diagnostic counts of how many .md files were available in each input
   * surface before caps were applied. Used by the source-floor check + the
   * `warnings` accumulator. Distinct from `projects.length` / `inbox.length`
   * which reflect only what made it past the cap.
   */
  availability: {
    yesterdayExists: boolean;
    projectFilesFound: number;
    inboxFilesFound: number;
  };
  /** Echo of caps used (for audit). */
  caps: {
    maxProjects: number;
    maxInbox: number;
    projectWindowMs: number;
    excerptBytes: number;
  };
}

export interface DailyContextSection {
  /** Heading shown in the markdown. */
  heading: string;
  /** Markdown body of the section (one or more paragraphs / bullets). */
  body: string;
  /** Number of source files this section consumed. */
  sourceCount: number;
}

export interface DailyContextBrief {
  /** YYYY-MM-DD of the brief. */
  briefDate: string;
  /** Path the brief should be written to. */
  outputPath: string;
  /** Final markdown body, ready to write. */
  markdown: string;
  /** Full source manifest gathered before synthesis. */
  sources: DailyContextSources;
  /** Per-section breakdown — useful for callers that want structured output. */
  sections: {
    yesterday: DailyContextSection;
    projects: DailyContextSection;
    inbox: DailyContextSection;
  };
  /** "ollama" when LLM summarised every populated section; "literal" otherwise. */
  synthesizer: "ollama" | "literal";
  /** Number of distinct source files referenced (yesterday + projects + inbox). */
  sourceCount: number;
  /**
   * True when the brief references ≥3 distinct source files OR every input
   * surface that was *available* on disk was included. False when the engine
   * found <3 source files AND at least one surface was empty — i.e. the
   * brief is genuinely thin. The cron logs this so silent degradation is
   * surfaced (R12 fail-loud).
   */
  meetsSourceFloor: boolean;
  /** Human-readable warnings (e.g. "no inbox items found"). */
  warnings: string[];
  /** Phase-level timing in ms for cron drift detection. */
  durationMs: { collect: number; synthesize: number; total: number };
  /** ISO8601 of synthesis. */
  generatedAt: string;
}

export interface OllamaSummariseClient {
  /**
   * One-shot summarise call. Must return a single short paragraph.
   * The engine treats any thrown error / null / empty string as "fallback
   * to literal" for that section — it never propagates the error up.
   */
  summarise(input: { model: string; system: string; prompt: string }): Promise<string | null>;
}

export interface DailyContextOptions {
  /** Override vault root (defaults to knowledge/memories). */
  vaultRoot?: string;
  /** Override generated-output root (defaults to `${vaultRoot}/generated`). */
  generatedRoot?: string;
  /** Override "now" for deterministic windowing in tests (ms epoch). */
  now?: number;
  /** Cap on project files included. Default 5. */
  maxProjects?: number;
  /** Cap on inbox files included. Default 10. */
  maxInbox?: number;
  /** Project mtime window. Default 30d in ms. */
  projectWindowMs?: number;
  /** Max bytes read per source file. Default 4096. */
  excerptBytes?: number;
  /**
   * When supplied, sections are summarised via this client. When omitted OR
   * any single summarise call returns null / throws, that section falls back
   * to the deterministic literal renderer. The overall `synthesizer` field
   * reads `"ollama"` only when *every* populated section was summarised by
   * the client.
   */
  ollamaClient?: OllamaSummariseClient;
  /** Model passed to the Ollama client. Default `qwen2.5-coder`. */
  ollamaModel?: string;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_GENERATED_SUBDIR = "generated";
const DEFAULT_MAX_PROJECTS = 5;
const DEFAULT_MAX_INBOX = 10;
const DEFAULT_PROJECT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_EXCERPT_BYTES = 4096;
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder";
const PROJECT_WINDOW_MIN_MS = 24 * 60 * 60 * 1000;
const PROJECT_WINDOW_MAX_MS = 365 * 24 * 60 * 60 * 1000;
const EXCERPT_BYTES_MIN = 256;
const EXCERPT_BYTES_MAX = 65536;
const MAX_PROJECTS_MIN = 1;
const MAX_PROJECTS_MAX = 50;
const MAX_INBOX_MIN = 0;
const MAX_INBOX_MAX = 100;
const FIRST_LINE_LENGTH_CAP = 200;

/** Brief filename pattern — the same pattern Yesterday lookup uses. */
const DAILY_PATTERN = /^DAILY-CONTEXT-(\d{4}-\d{2}-\d{2})\.md$/i;

/** Minimum distinct source files for the brief to count as "meaningful". */
const SOURCE_FLOOR = 3;

/**
 * Zod schema for DailyContextOptions — validates public-entry params. The
 * clampInt helpers stay as defense-in-depth for fields the schema permits
 * loosely. ollamaClient is left untyped (functions can't be validated by
 * Zod schema in any meaningful way; we accept it as `unknown`).
 */
export const DailyContextOptionsSchema = z.object({
  vaultRoot: z.string().min(1).optional(),
  generatedRoot: z.string().min(1).optional(),
  now: z.number().finite().optional(),
  maxProjects: z.number().int().min(MAX_PROJECTS_MIN).max(MAX_PROJECTS_MAX).optional(),
  maxInbox: z.number().int().min(MAX_INBOX_MIN).max(MAX_INBOX_MAX).optional(),
  projectWindowMs: z.number().int().min(PROJECT_WINDOW_MIN_MS).max(PROJECT_WINDOW_MAX_MS).optional(),
  excerptBytes: z.number().int().min(EXCERPT_BYTES_MIN).max(EXCERPT_BYTES_MAX).optional(),
  ollamaClient: z.unknown().optional(),
  ollamaModel: z.string().min(1).optional(),
}).passthrough();

function validateOptions(opts: DailyContextOptions): DailyContextOptions {
  // .parse() throws ZodError on invalid input — that's the loud-fail behavior
  // engines.md requires. We still pass the original object through (with
  // ollamaClient intact) since Zod stripped to schema would lose the function.
  DailyContextOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers (pure) ---------------------------------------------------

function dateOnlyIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Safe `.md` listing — never follows symlinks out of `dir`. Mechanism:
 *   1. `readdirSync(..., {withFileTypes:true})` returns `Dirent` whose
 *      `isFile()` is false for symlink entries.
 *   2. We additionally run `lstatSync` and reject `isSymbolicLink()` so the
 *      safety property survives a future refactor that drops `withFileTypes`.
 * Also rejects dotfiles and names containing `..`, `/`, or `\`.
 */
function listMarkdown(dir: string): Array<{ path: string; mtimeMs: number; name: string }> {
  if (!existsSync(dir)) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: Array<{ path: string; mtimeMs: number; name: string }> = [];
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    // Reject anything that looks like a path-traversal attempt in the name.
    if (ent.name.includes("..") || ent.name.includes("/") || ent.name.includes("\\")) continue;
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
    const full = join(dir, ent.name);
    // Defense-in-depth: explicit symlink rejection via lstat.
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isSymbolicLink()) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    out.push({ path: full, mtimeMs: st.mtimeMs, name: ent.name });
  }
  return out;
}

/** Read up to `cap` bytes from a file, decoded utf-8 (lossy on bad bytes). */
function readExcerpt(absPath: string, cap: number): { excerpt: string; truncated: boolean } {
  try {
    const buf = readFileSync(absPath);
    if (buf.length <= cap) return { excerpt: buf.toString("utf8"), truncated: false };
    return { excerpt: buf.subarray(0, cap).toString("utf8"), truncated: true };
  } catch {
    return { excerpt: "", truncated: false };
  }
}

function toSource(file: { path: string; mtimeMs: number; name: string }, cap: number): DailyContextSource {
  const { excerpt, truncated } = readExcerpt(file.path, cap);
  return {
    path: file.path,
    label: file.name.replace(/\.md$/i, ""),
    mtime: new Date(file.mtimeMs).toISOString(),
    mtimeMs: file.mtimeMs,
    excerpt,
    truncated,
  };
}

/**
 * Trim an excerpt to the first non-empty content line so it survives bullet
 * rendering.
 *
 * Frontmatter awareness: if the body opens with `---\n` we skip every line
 * until the closing `---` (per the YAML frontmatter convention used by
 * Obsidian + most static-site generators). Without this, the first
 * frontmatter key (e.g. `foo: bar`) would leak into the brief as if it were
 * body text.
 *
 * Standalone `---` lines (markdown horizontal rules in the body) are also
 * skipped — they convey no content.
 */
function firstMeaningfulLine(text: string): string {
  const lines = text.split(/\r?\n/);
  let i = 0;
  // Skip leading YAML frontmatter block (opens with `---` as first non-empty line).
  let firstNonEmpty = -1;
  for (let k = 0; k < lines.length; k++) {
    if (lines[k].trim().length > 0) { firstNonEmpty = k; break; }
  }
  if (firstNonEmpty !== -1 && lines[firstNonEmpty].trim() === "---") {
    // Find the closing `---`. If none, treat as no frontmatter (don't lose body).
    let close = -1;
    for (let k = firstNonEmpty + 1; k < lines.length; k++) {
      if (lines[k].trim() === "---") { close = k; break; }
    }
    if (close !== -1) i = close + 1;
  }
  for (; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/^#+\s*/, "").trim();
    if (line.length === 0) continue;
    if (line.startsWith("---")) continue; // body-level HR — skip
    // Strip leading list markers — the bullet renderer adds its own.
    const cleaned = line.replace(/^[-*]\s+/, "").trim();
    if (cleaned.length === 0) continue;
    // Cap line length so a giant single-line file can't dominate the brief.
    return cleaned.length > FIRST_LINE_LENGTH_CAP
      ? cleaned.slice(0, FIRST_LINE_LENGTH_CAP - 3) + "..."
      : cleaned;
  }
  return "(empty file)";
}

function resolveRoot(p: string): string {
  if (!p || typeof p !== "string") throw new Error("root path required");
  // resolve() handles relative + absolute + Windows-drive uniformly.
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

// ---------- Engine -----------------------------------------------------------

export class DailyContextWorkflowEngine {
  readonly name = "DailyContextWorkflowEngine";

  /**
   * Phase 1 — deterministic source gathering. Pure-functional given the
   * filesystem state and `opts.now`. No network, no LLM.
   *
   * @param opts  Optional overrides (vaultRoot, now, caps).
   * @returns     A `DailyContextSources` manifest.
   */
  collectSources(opts: DailyContextOptions = {}): DailyContextSources {
    validateOptions(opts);
    const vaultRoot = resolveRoot(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const generatedRoot = resolveRoot(opts.generatedRoot ?? join(vaultRoot, DEFAULT_GENERATED_SUBDIR));
    const now = opts.now ?? Date.now();
    const maxProjects = clampInt(opts.maxProjects, MAX_PROJECTS_MIN, MAX_PROJECTS_MAX, DEFAULT_MAX_PROJECTS);
    const maxInbox = clampInt(opts.maxInbox, MAX_INBOX_MIN, MAX_INBOX_MAX, DEFAULT_MAX_INBOX);
    const projectWindowMs = clampInt(
      opts.projectWindowMs,
      PROJECT_WINDOW_MIN_MS,
      PROJECT_WINDOW_MAX_MS,
      DEFAULT_PROJECT_WINDOW_MS,
    );
    const excerptBytes = clampInt(opts.excerptBytes, EXCERPT_BYTES_MIN, EXCERPT_BYTES_MAX, DEFAULT_EXCERPT_BYTES);
    const briefDate = dateOnlyIso(now);
    const outputPath = join(generatedRoot, `DAILY-CONTEXT-${briefDate}.md`);

    // Yesterday lookup — pick the most recent DAILY-CONTEXT-*.md with a date
    // string strictly less than `briefDate`. String compare on YYYY-MM-DD
    // works because that format is already lexically ordered. Comparator
    // uses localeCompare + name tie-break to satisfy sort antisymmetry.
    let yesterday: DailyContextSource | null = null;
    {
      const candidates = listMarkdown(generatedRoot)
        .map((f) => {
          const m = DAILY_PATTERN.exec(f.name);
          return m ? { ...f, dateStr: m[1] } : null;
        })
        .filter((x): x is { path: string; mtimeMs: number; name: string; dateStr: string } => x !== null)
        .filter((x) => x.dateStr < briefDate)
        .sort((a, b) => b.dateStr.localeCompare(a.dateStr) || a.name.localeCompare(b.name));
      if (candidates.length > 0) {
        yesterday = toSource(candidates[0], excerptBytes);
      }
    }

    // Projects — only those modified within the window. Sort by mtime desc
    // with name as the stable tie-break. We separately track the pre-cap
    // count so availability reflects what's on disk, not what made the cut.
    const projectsAll = listMarkdown(join(vaultRoot, "project"))
      .filter((f) => f.mtimeMs >= now - projectWindowMs);
    const projectFilesFound = projectsAll.length;
    const projectsRaw = [...projectsAll]
      .sort((a, b) => (b.mtimeMs - a.mtimeMs) || a.name.localeCompare(b.name))
      .slice(0, maxProjects);
    const projects = projectsRaw.map((f) => toSource(f, excerptBytes));

    // Inbox — every .md, capped, sorted by mtime desc with name tie-break.
    const inboxAll = listMarkdown(join(vaultRoot, "inbox"));
    const inboxFilesFound = inboxAll.length;
    const inboxRaw = [...inboxAll]
      .sort((a, b) => (b.mtimeMs - a.mtimeMs) || a.name.localeCompare(b.name))
      .slice(0, maxInbox);
    const inbox = inboxRaw.map((f) => toSource(f, excerptBytes));

    return {
      briefDate,
      yesterday,
      projects,
      inbox,
      outputPath,
      generatedAt: new Date(now).toISOString(),
      availability: {
        yesterdayExists: yesterday !== null,
        projectFilesFound,
        inboxFilesFound,
      },
      caps: { maxProjects, maxInbox, projectWindowMs, excerptBytes },
    };
  }

  /**
   * Phase 2 — compose the markdown brief.
   *
   * Determinism: given identical filesystem state + `opts.now` + literal mode
   * (no ollamaClient), the returned `markdown` is byte-stable across runs.
   * When `opts.ollamaClient` is supplied, only the section bodies vary by LLM
   * output; the header, source manifest, ordering, and structural template
   * remain deterministic.
   *
   * Per-section Ollama failure → that one section falls back to literal and
   * the overall `synthesizer` field downgrades to `"literal"` so the caller
   * sees a graceful-degraded brief, not a crash. (R12: surface the downgrade
   * rather than hide it.)
   *
   * @param opts  Options including optional `ollamaClient`.
   * @returns     Fully composed `DailyContextBrief`.
   */
  async synthesize(opts: DailyContextOptions = {}): Promise<DailyContextBrief> {
    // Public entry validation — Zod throws fast on bad input rather than
    // relying on transitive validation through collectSources. Arm-B
    // scrutiny called this out: schema-on-one-public-entry is a fragile
    // contract that breaks the first time a refactor reorders this call.
    validateOptions(opts);
    const tStart = Date.now();
    const sources = this.collectSources(opts);
    const tCollectDone = Date.now();
    const model = opts.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    const client = opts.ollamaClient;

    // Track whether *every* populated section was Ollama-rendered.
    let allOllamaForPopulated = true;

    const yesterdaySection = await renderYesterday(sources.yesterday, client, model);
    if (yesterdaySection.synthesizer === "literal" && sources.yesterday !== null) allOllamaForPopulated = false;

    const projectsSection = await renderProjects(sources.projects, client, model);
    if (projectsSection.synthesizer === "literal" && sources.projects.length > 0) allOllamaForPopulated = false;

    const inboxSection = await renderInbox(sources.inbox, client, model);
    if (inboxSection.synthesizer === "literal" && sources.inbox.length > 0) allOllamaForPopulated = false;

    const totalSources =
      (sources.yesterday ? 1 : 0) + sources.projects.length + sources.inbox.length;

    // synthesizer is "ollama" only when:
    //   1. a client was supplied,
    //   2. at least one source existed (empty vault is always "literal"),
    //   3. every populated section returned a non-null Ollama summary.
    // Conjunct 2 is load-bearing: without it an all-empty vault + client
    // would report "ollama" despite never having called the LLM.
    const actuallyUsedOllama = client !== undefined && totalSources > 0 && allOllamaForPopulated;
    const synthesizer: "ollama" | "literal" = actuallyUsedOllama ? "ollama" : "literal";

    // Source floor + warnings — surfaces silent degradation.
    const { warnings, meetsSourceFloor } = computeFloorAndWarnings(sources, totalSources);

    const header = renderHeader(sources, totalSources, synthesizer);
    const sourcesBlock = renderSourcesBlock(sources);

    const yesterdayBody = yesterdaySection.section.body || "_(none)_";
    const projectsBody = projectsSection.section.body || "_(none)_";
    const inboxBody = inboxSection.section.body || "_(none)_";

    const markdown =
      [
        header,
        `## ${yesterdaySection.section.heading}\n\n${yesterdayBody}`,
        `## ${projectsSection.section.heading}\n\n${projectsBody}`,
        `## ${inboxSection.section.heading}\n\n${inboxBody}`,
        sourcesBlock,
      ].join("\n\n") + "\n";

    const tEnd = Date.now();

    return {
      briefDate: sources.briefDate,
      outputPath: sources.outputPath,
      markdown,
      sources,
      sections: {
        yesterday: yesterdaySection.section,
        projects: projectsSection.section,
        inbox: inboxSection.section,
      },
      synthesizer,
      sourceCount: totalSources,
      meetsSourceFloor,
      warnings,
      durationMs: {
        collect: tCollectDone - tStart,
        synthesize: tEnd - tCollectDone,
        total: tEnd - tStart,
      },
      generatedAt: sources.generatedAt,
    };
  }
}

/**
 * Source-floor evaluator. A brief "meets the floor" when EITHER:
 *   * It pulled in ≥ SOURCE_FLOOR distinct files, OR
 *   * Every input surface that was available on disk was included
 *     (i.e. the vault is genuinely thin, not the engine is failing).
 */
function computeFloorAndWarnings(
  sources: DailyContextSources,
  totalSources: number,
): { warnings: string[]; meetsSourceFloor: boolean } {
  const warnings: string[] = [];
  if (!sources.availability.yesterdayExists) warnings.push("no prior daily-context brief on disk (first-run fallback)");
  if (sources.availability.projectFilesFound === 0) warnings.push("no project notes found");
  else if (sources.projects.length < sources.availability.projectFilesFound) {
    warnings.push(`project cap applied: ${sources.projects.length}/${sources.availability.projectFilesFound} included`);
  }
  if (sources.availability.inboxFilesFound === 0) warnings.push("no inbox items found");
  else if (sources.inbox.length < sources.availability.inboxFilesFound) {
    warnings.push(`inbox cap applied: ${sources.inbox.length}/${sources.availability.inboxFilesFound} included`);
  }
  const everythingAvailableUsed =
    (sources.availability.yesterdayExists ? sources.yesterday !== null : true) &&
    sources.projects.length === Math.min(sources.availability.projectFilesFound, sources.caps.maxProjects) &&
    sources.inbox.length === Math.min(sources.availability.inboxFilesFound, sources.caps.maxInbox);
  // Empty vault is honest-thin, not failure-thin — but a zero-source brief
  // is still degraded enough that the floor should NOT report "met". Arm-A
  // scrutiny caught this edge: without the totalSources>0 conjunct the
  // empty-vault case would silently pass the floor (R12 fail-loud).
  const meetsSourceFloor =
    totalSources >= SOURCE_FLOOR || (totalSources > 0 && everythingAvailableUsed);
  if (!meetsSourceFloor) warnings.push(`brief is thin: ${totalSources}/${SOURCE_FLOOR} source files included`);
  return { warnings, meetsSourceFloor };
}

// ---------- Section renderers ------------------------------------------------

interface SectionResult {
  section: DailyContextSection;
  synthesizer: "ollama" | "literal";
}

async function renderYesterday(
  src: DailyContextSource | null,
  client: OllamaSummariseClient | undefined,
  model: string,
): Promise<SectionResult> {
  const heading = "Yesterday";
  if (src === null) {
    return {
      section: { heading, body: "_First-run — no prior brief on disk._", sourceCount: 0 },
      synthesizer: "literal",
    };
  }
  if (client) {
    const summary = await safeSummarise(client, model, {
      system: "Summarise yesterday's daily-context brief in 2-3 sentences. Preserve concrete artifacts (file paths, unit ids, commit shas) verbatim.",
      prompt: src.excerpt,
    });
    if (summary && summary.trim().length > 0) {
      return {
        section: { heading, body: summary.trim(), sourceCount: 1 },
        synthesizer: "ollama",
      };
    }
  }
  const line = firstMeaningfulLine(src.excerpt);
  return {
    section: { heading, body: `From [[${src.label}]]: ${line}`, sourceCount: 1 },
    synthesizer: "literal",
  };
}

async function renderProjects(
  list: DailyContextSource[],
  client: OllamaSummariseClient | undefined,
  model: string,
): Promise<SectionResult> {
  const heading = `Active Projects (${list.length})`;
  if (list.length === 0) {
    return { section: { heading, body: "", sourceCount: 0 }, synthesizer: "literal" };
  }
  if (client) {
    const summary = await safeSummarise(client, model, {
      system: "Given several project notes, produce a markdown bullet list. One bullet per project, format: '- **<basename>** — <one-line essence>'. Preserve concrete numbers and proper nouns.",
      prompt: list.map((p) => `### ${p.label}\n${p.excerpt}`).join("\n\n"),
    });
    if (summary && summary.trim().length > 0) {
      return {
        section: { heading, body: summary.trim(), sourceCount: list.length },
        synthesizer: "ollama",
      };
    }
  }
  const lines = list.map((p) => `- **${p.label}** — ${firstMeaningfulLine(p.excerpt)}`).join("\n");
  return { section: { heading, body: lines, sourceCount: list.length }, synthesizer: "literal" };
}

async function renderInbox(
  list: DailyContextSource[],
  client: OllamaSummariseClient | undefined,
  model: string,
): Promise<SectionResult> {
  const heading = `Inbox (${list.length})`;
  if (list.length === 0) {
    return { section: { heading, body: "", sourceCount: 0 }, synthesizer: "literal" };
  }
  if (client) {
    const summary = await safeSummarise(client, model, {
      system: "Given several inbox notes, return a markdown bullet list, one bullet per note. Format: '- **<basename>** — <one-line essence>'. Preserve concrete artifacts.",
      prompt: list.map((p) => `### ${p.label}\n${p.excerpt}`).join("\n\n"),
    });
    if (summary && summary.trim().length > 0) {
      return {
        section: { heading, body: summary.trim(), sourceCount: list.length },
        synthesizer: "ollama",
      };
    }
  }
  const lines = list.map((p) => `- **${p.label}** — ${firstMeaningfulLine(p.excerpt)}`).join("\n");
  return { section: { heading, body: lines, sourceCount: list.length }, synthesizer: "literal" };
}

function renderHeader(
  s: DailyContextSources,
  totalSources: number,
  synthesizer: "ollama" | "literal",
): string {
  return `# Daily Context — ${s.briefDate}\n_Generated ${s.generatedAt} from ${totalSources} source(s) — synthesizer=${synthesizer}_`;
}

function renderSourcesBlock(s: DailyContextSources): string {
  const lines: string[] = ["## Sources"];
  if (s.yesterday) lines.push(`- ${s.yesterday.path} (${s.yesterday.mtime})`);
  for (const p of s.projects) lines.push(`- ${p.path} (${p.mtime})`);
  for (const p of s.inbox) lines.push(`- ${p.path} (${p.mtime})`);
  if (lines.length === 1) lines.push("- _(none)_");
  return lines.join("\n");
}

async function safeSummarise(
  client: OllamaSummariseClient,
  model: string,
  input: { system: string; prompt: string },
): Promise<string | null> {
  try {
    const out = await client.summarise({ model, system: input.system, prompt: input.prompt });
    if (out === null || out === undefined) return null;
    if (typeof out !== "string") return null;
    return out;
  } catch {
    // Per CLAUDE.md token-economy + R12: fall back to literal on any LLM
    // failure rather than crash the cron. The caller's `synthesizer` flag
    // surfaces the downgrade so callers / tests can see it.
    return null;
  }
}

// ---------- Helpers exported for tests --------------------------------------

/** @internal — exported for the test suite only; do NOT depend on from prod code. */
export const _internals = {
  firstMeaningfulLine,
  clampInt,
  DAILY_PATTERN,
  computeFloorAndWarnings,
  SOURCE_FLOOR,
};

// ---------- Singleton --------------------------------------------------------

export const dailyContextWorkflowEngine = new DailyContextWorkflowEngine();

export default DailyContextWorkflowEngine;

/**
 * Convenience wrapper for the dispatcher / cron path. Returns the brief plus
 * a `written` flag indicating whether the markdown actually hit disk.
 *
 * Failure semantics: when `write` is true and the output directory cannot be
 * created for a reason OTHER than already-exists, the underlying error is
 * re-thrown (loud-fail per R12). The mkdirIfMissing default is true.
 */
export async function buildAndOptionallyWriteDailyContext(
  opts: DailyContextOptions & { write?: boolean; mkdirIfMissing?: boolean },
): Promise<DailyContextBrief & { written: boolean }> {
  // Public entry validation (matches synthesize / collectSources). Loud-fail
  // on bad input here lets the CLI/dispatcher surface a clean ZodError
  // instead of letting bad opts leak into the write path.
  validateOptions(opts);
  const brief = await dailyContextWorkflowEngine.synthesize(opts);
  if (!opts.write) {
    return { ...brief, written: false };
  }
  const outDir = dirname(brief.outputPath);
  if (opts.mkdirIfMissing !== false) {
    try {
      mkdirSync(outDir, { recursive: true });
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      // EEXIST = directory already present (success). Anything else (ENOTDIR,
      // EACCES, EPERM, ENAMETOOLONG, etc.) is a real failure — re-throw.
      if (code !== "EEXIST") throw e;
    }
  }
  writeFileSync(brief.outputPath, brief.markdown, "utf8");
  return { ...brief, written: true };
}
