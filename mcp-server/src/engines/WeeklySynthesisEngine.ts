// WIRE-EXEMPT: cron-invoked synthesizer. The engine is a library (importable for tests + dispatcher composition) AND a CLI (--run). Its invocation path — a Sunday-evening scheduled task — ships as a sibling deliverable of this same unit (B4): scripts/cron/weekly-synthesis-cron.ps1. No dispatcher action is required for the cron path; downstream composition (Track G observability) imports the engine class directly.
/**
 * WeeklySynthesisEngine — OBSIDIAN-INTELLIGENCE-MS3 / B4 (U-WEEKLY-SYNTHESIS)
 * ===========================================================================
 * Sunday-8PM retro: reads the last 7 `DAILY-CONTEXT-YYYY-MM-DD.md` briefs that
 * B1 (DailyContextWorkflowEngine) emits into `knowledge/memories/generated/`
 * and synthesizes a 4-section weekly retro at
 * `knowledge/memories/generated/WEEKLY-YYYY-Www.md`:
 *
 *   ## Moved
 *   ## Didn't move
 *   ## Emerging patterns
 *   ## Top-3 next-week leverage
 *
 * Default summarizer is a host-resolved local Ollama model (the 'best'
 * search_synthesis tier -- gpt-oss:120b on Blackwell), with qwen2.5-coder:32b
 * as the fail-soft fallback. Token-economy compliant (local, $0-Claude).
 *
 * The 4-section check is a NECESSARY (not sufficient) gate: the synthesizer
 * output is validated to contain all four `## ` headers — at line start,
 * outside fenced code blocks — and a response missing any of them fails loud
 * as `incomplete-synthesis` rather than writing a partial retro (Karpathy
 * R12). It proves structure, not synthesis quality; an LLM that merely echoed
 * the headers would still pass. To make an echo materially harder, every
 * embedded daily-context body has its leading `#` characters escaped before
 * going into the prompt (see `neutralizeHeadings`), so an injected `## Moved`
 * in a source note is neither read as an instruction nor echoed as a header.
 *
 * Pluggable interfaces for testability (mirrors B1/B2/B3 pattern):
 *   - LoaderFn       : reads the daily-context lineage (default `defaultLoader`)
 *   - SummarizerFn   : LLM call (default `defaultOllamaSummarizer`)
 *
 * Failure model:
 *   - invalid-vault-root  -> ok=false (vault dir does not exist)
 *   - no-sources          -> ok=false (0 daily-context files; nothing to retro)
 *   - summarizer-failed   -> ok=false (Ollama unreachable / refused / parse error)
 *   - incomplete-synthesis-> ok=false (LLM replied but is missing >=1 section)
 *   - write-failed        -> ok=false (output mkdir or writeFile failed)
 *
 * Determinism: when both `loader` and `summarizer` are injected, the engine is
 * fully deterministic (no fs except via the loader, no network except via the
 * summarizer; the only clock use is the explicit `date` arg / its default).
 *
 * CLI mode (`node WeeklySynthesisEngine.js --run`): invoked by the
 * `weekly-synthesis-cron.ps1` scheduled task on Sunday evening. Defaults to
 * today's UTC date and the canonical vault root. Exits 0 on success, 1 on
 * engine failure.
 *
 * @module engines/WeeklySynthesisEngine
 */

import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// weekIsoUTC is reused from B2 (ConnectionFinderEngine) so the two engines —
// which both write `*-<weekIso>.md` into the same generated/ dir — can never
// drift on ISO-week boundaries. (B4's spec `dependencies` lists only B1; the
// B2 link is a pure-helper reuse — flagged for the envelope close-out.)
import { weekIsoUTC } from "./ConnectionFinderEngine.js";
// P5 last-mile wiring (U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER): the cron +
// singleton opt into the octopus consensus brief via the shared composer when
// PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1. Default-OFF → byte-identical prior behavior.
// The loader is a plain .mjs (resolved by vitest + esbuild the same as the
// existing OctopusWeeklySynthesisLoader test import).
// @ts-expect-error - scripts/lib .mjs has no .d.ts (outside src include); resolved at
// runtime by esbuild+vitest, typed `any`. Suppress the implicit-any TS7016 (U-WEEKLY-SYNTH-RESOLVER).
import { composeOctopusLoader, OCTOPUS_OUTCOMES_DIR } from "../../../scripts/lib/octopus-weekly-synthesis-loader.mjs";
// U-WEEKLY-SYNTH-RESOLVER (OLLAMA-SYNERGY): host-aware default model. REUSE the
// shared resolver (BLACKWELL-TOKEN-SYNERGY-MS0) instead of hardcoding a model:
// it routes category 'search_synthesis' to the host 'best' tier (live-validated
// gpt-oss:120b on home_blackwell, 2026-06-09); weaker hosts get the conservative
// installed model; Ollama-down -> the 32B fallback const. Same .mjs cross-boundary
// import style as the octopus loader at L64.
// @ts-expect-error - scripts/lib .mjs has no .d.ts; resolved at runtime, typed `any` (see above).
import { resolveSynthesisModel } from "../../../scripts/lib/host-aware-synthesis-model.mjs";

/* -------------------------- enums / schemas -------------------------- */

export const WeeklySourceSchema = z
  .object({
    /** ISO date parsed from the DAILY-CONTEXT-<date>.md filename. */
    date: z.string().min(1),
    path: z.string().min(1),
    body: z.string(),
    bytes: z.number().int().nonnegative(),
  })
  .strict();
export type WeeklySource = z.infer<typeof WeeklySourceSchema>;

export const WeeklySynthesisErrorClassSchema = z.enum([
  "invalid-vault-root",
  "invalid-date",
  "no-sources",
  "summarizer-failed",
  "incomplete-synthesis",
  "write-failed",
]);
export type WeeklySynthesisErrorClass = z.infer<typeof WeeklySynthesisErrorClassSchema>;

/* ---------------------- pluggable interfaces ------------------------ */

export interface LoaderOpts {
  vaultRoot: string; // absolute path to .../knowledge/memories
  date: string; // ISO YYYY-MM-DD — the retro's "as of" date (week anchor)
}

export interface LoaderFn {
  (opts: LoaderOpts): Promise<WeeklySource[]>;
}

export interface SummarizerOpts {
  sources: WeeklySource[];
  weekIso: string;
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
export const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:32b";
export const DAYS_PER_WEEK = 7;
export const MAX_SOURCE_BYTES = 6_000; // truncate per daily-context to keep prompt cheap
export const MIN_SOURCES_FOR_RETRO = 1; // <1 daily-context => nothing to retrospect
export const OLLAMA_NUM_CTX = 32_768; // 7 x 6KB sources + prompt > the 2048 default
export const DEFAULT_OLLAMA_TEMPERATURE = 0.3;
// 180s (was 90s): the host resolver can select a large reasoning model
// (live-validated gpt-oss:120b on Blackwell) for this non-interactive Sunday
// cron, which is far slower than the old hardcoded 32B. Latency is irrelevant
// for a background retro; a too-short timeout would lose the whole synthesis.
export const OLLAMA_TIMEOUT_MS = 180_000;
// -1 = generate until the model stops (bounded by OLLAMA_TIMEOUT_MS). Explicit
// because the host resolver can now select a harmony reasoning model
// (gpt-oss:120b on Blackwell) that emits a reasoning preamble BEFORE the answer;
// a low/defaulted cap could starve the 4-section retro into an empty `.response`
// (the harmony empty-output failure mode). -1 never truncates the retro.
export const OLLAMA_NUM_PREDICT = -1;

/** The 4 mandatory retro sections — order is the document order. */
export const WEEKLY_SECTIONS = [
  "Moved",
  "Didn't move",
  "Emerging patterns",
  "Top-3 next-week leverage",
] as const;
export type WeeklySection = (typeof WEEKLY_SECTIONS)[number];

/** Format a Date as ISO YYYY-MM-DD in UTC (deterministic regardless of host TZ). */
export function isoDateUTC(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Truncate body to MAX_SOURCE_BYTES of UTF-8, appending a marker if needed. */
export function truncateBody(body: string, max: number = MAX_SOURCE_BYTES): string {
  const buf = Buffer.from(body, "utf8");
  if (buf.length <= max) return body;
  // � = U+FFFD replacement char left when toString cuts mid-codepoint.
  return buf.toString("utf8", 0, max).replace(/�+$/, "") + "\n\n[truncated]\n";
}

/**
 * Extract the YYYY-MM-DD from a `DAILY-CONTEXT-YYYY-MM-DD.md` filename.
 * Returns null for any name that does not match — so the loader silently
 * skips foreign files in generated/ (e.g. WEEKLY-*, CONNECTIONS-*).
 */
export function parseDailyContextDate(filename: string): string | null {
  const m = /^DAILY-CONTEXT-(\d{4}-\d{2}-\d{2})\.md$/i.exec(filename);
  return m ? m[1] : null;
}

/**
 * Remove fenced code blocks (``` … ```) from `text` so a `## Section` header
 * that appears *inside* a code fence is NOT counted as a real section. Without
 * this, the `incomplete-synthesis` gate could be satisfied by a header the LLM
 * emitted inside an example block.
 *
 * An UNTERMINATED fence is swallowed all the way to true end-of-text: the
 * close branch is `^[ \t]*\`\`\`...` (a real closing fence line) OR `(?![\s\S])`
 * (absolute EOF — `$` alone is end-of-LINE under the `m` flag and would strip
 * only the opening fence line, leaving inner headers countable; the negative
 * lookahead is what makes it truly conservative — better to under-count a
 * section than false-pass `hasAllSections`).
 */
export function stripFences(text: string): string {
  return text.replace(/^[ \t]*```[\s\S]*?(?:^[ \t]*```[^\n]*|(?![\s\S]))/gm, "");
}

/** True when `section`'s `## ` header is on its own line in (fence-stripped) `text`. */
function sectionPresent(text: string, section: WeeklySection): boolean {
  // escape regex metachars in the section label (it contains "-"); apostrophe
  // is not a metachar but the escape set is harmless on it.
  const esc = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${esc}\\s*$`, "im").test(text);
}

/**
 * True when `text` contains a real markdown `## <Section>` header (line-start,
 * case-insensitive, outside code fences) for EVERY one of the 4 mandatory
 * sections. Necessary — not sufficient — gate behind `incomplete-synthesis`.
 */
export function hasAllSections(text: string): boolean {
  const stripped = stripFences(text);
  return WEEKLY_SECTIONS.every((section) => sectionPresent(stripped, section));
}

/** Which mandatory sections are missing from `text` — for the error detail. */
export function missingSections(text: string): WeeklySection[] {
  const stripped = stripFences(text);
  return WEEKLY_SECTIONS.filter((section) => !sectionPresent(stripped, section));
}

/**
 * Escape leading `#` of every line so an injected `## Moved` inside an
 * untrusted daily-context body cannot (a) be read by the LLM as a structural
 * instruction or (b) be echoed back as a header that false-satisfies
 * `hasAllSections`. `\#` is the canonical markdown heading escape and `^##`
 * no longer matches it.
 */
export function neutralizeHeadings(body: string): string {
  return body.replace(/^(#+)/gm, "\\$1");
}

/** Build the Ollama prompt — pure, deterministic, returnable to tests. */
export function buildSummarizerPrompt(sources: WeeklySource[], weekIso: string): string {
  const lines: string[] = [
    "You are a manufacturing-software shop weekly-retro synthesizer.",
    `Given the last ${sources.length} daily-context briefs for ISO week ${weekIso},`,
    "produce a concise weekly retrospective with EXACTLY these four markdown",
    "sections, each introduced by a level-2 header on its own line:",
    "",
    "## Moved",
    "  what actually progressed this week (2-4 terse bullets)",
    "## Didn't move",
    "  what stalled or was deferred (2-4 terse bullets)",
    "## Emerging patterns",
    "  cross-day themes / recurring friction / signals (2-3 bullets)",
    "## Top-3 next-week leverage",
    "  the 3 highest-leverage things to do next week (numbered 1-3)",
    "",
    "Output ONLY those four sections with those EXACT headers. No preamble,",
    "no closing remarks, no extra sections.",
    "",
    `ISO WEEK: ${weekIso}`,
    "",
  ];
  for (const s of sources) {
    lines.push(`--- DAILY-CONTEXT ${s.date} ---`);
    // neutralize headings AFTER truncation (truncate the raw body to the byte
    // budget, then escape every surviving leading `#`) so an injected
    // `## Moved` cannot pose as an instruction or be echoed back as a header
    lines.push(neutralizeHeadings(truncateBody(s.body)));
    lines.push("");
  }
  lines.push("WEEKLY RETRO:");
  return lines.join("\n");
}

/** Stable sort of sources by date ASCENDING — deterministic prompt order. */
function sortByDate(arr: WeeklySource[]): WeeklySource[] {
  return [...arr].sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------------------------- default loader ---------------------------- */

/**
 * Read the most-recent DAYS_PER_WEEK `DAILY-CONTEXT-*.md` files from
 * `<vaultRoot>/generated/`, restricted to the 7-day window ending on `date`
 * (the retro's anchor). Files outside [monday-of-week .. date] are excluded so
 * a stale backlog of old daily-contexts cannot bleed into this week's retro.
 * Missing dir / unreadable files are silently skipped (fail-soft).
 */
export async function defaultLoader(opts: LoaderOpts): Promise<WeeklySource[]> {
  const generatedDir = path.join(opts.vaultRoot, "generated");
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(generatedDir, { withFileTypes: true });
  } catch {
    return [];
  }

  // window: the 7 days ending on `date` (inclusive). monday-of-week is a
  // floor only when the anchor is later in the week; we use a plain 7-day
  // lookback so the retro always covers a full week regardless of weekday.
  const anchor = new Date(`${opts.date}T00:00:00Z`);
  const windowStart = new Date(anchor.getTime() - (DAYS_PER_WEEK - 1) * 86_400_000);
  const startIso = isoDateUTC(windowStart);
  const endIso = opts.date;

  const out: WeeklySource[] = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const date = parseDailyContextDate(ent.name);
    if (!date) continue;
    if (date < startIso || date > endIso) continue; // outside the 7-day window
    const full = path.join(generatedDir, ent.name);
    try {
      const body = await fs.readFile(full, "utf8");
      out.push({ date, path: full, body, bytes: Buffer.byteLength(body, "utf8") });
    } catch {
      // unreadable file — skip (fail-soft per file)
    }
  }
  // most-recent DAYS_PER_WEEK only (defensive — the window already bounds it)
  const sorted = sortByDate(out);
  return sorted.slice(Math.max(0, sorted.length - DAYS_PER_WEEK));
}

/* -------------------- default Ollama summarizer -------------------- */

/** Injectable deps for `defaultOllamaSummarizer` (host resolver + fetch) so the
 * model-selection + POST can be unit-tested without a GPU, Ollama, or network. */
export interface DefaultSummarizerDeps {
  resolveModel?: typeof resolveSynthesisModel;
  fetchImpl?: typeof fetch;
}

/**
 * POST to Ollama `/api/generate` with a host-aware model: the 'best'
 * search_synthesis tier per host (live-validated gpt-oss:120b on Blackwell),
 * conservative on weaker hosts, 32B fail-soft fallback. Returns ok=false on any
 * network / parse / refusal error -- never throws. Honors env knobs:
 *   PRISM_WEEKLY_SYNTHESIS_OLLAMA_URL   (default http://127.0.0.1:11434/api/generate)
 *   PRISM_WEEKLY_SYNTHESIS_OLLAMA_MODEL (operator pin -- wins over host resolution)
 *   PRISM_WEEKLY_SYNTHESIS_OLLAMA_TIMEOUT_MS (default 180000 -- a large reasoning
 *     model on a non-interactive Sunday cron needs more than the old 90s)
 * Model resolution order: env pin > resolveSynthesisModel(search_synthesis) >
 * DEFAULT_OLLAMA_MODEL (fail-soft when Ollama is down / no models installed).
 */
export async function defaultOllamaSummarizer(
  opts: SummarizerOpts,
  deps: DefaultSummarizerDeps = {},
): Promise<SummarizerResult> {
  const resolveModel = deps.resolveModel ?? resolveSynthesisModel;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = process.env.PRISM_WEEKLY_SYNTHESIS_OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const envModel = process.env.PRISM_WEEKLY_SYNTHESIS_OLLAMA_MODEL;
  // Env pin wins (passed as `override`); else host-route; fail-soft to the const.
  let model = envModel || DEFAULT_OLLAMA_MODEL;
  try {
    const resolved = await resolveModel({
      fallback: DEFAULT_OLLAMA_MODEL,
      override: envModel || null,
    });
    model = (resolved && resolved.model) || model;
  } catch {
    /* resolver only throws on a missing fallback (we always pass one); keep model. */
  }
  const timeoutRaw = Number(process.env.PRISM_WEEKLY_SYNTHESIS_OLLAMA_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : OLLAMA_TIMEOUT_MS;

  const prompt = buildSummarizerPrompt(opts.sources, opts.weekIso);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const resp = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: DEFAULT_OLLAMA_TEMPERATURE,
          num_ctx: OLLAMA_NUM_CTX,
          num_predict: OLLAMA_NUM_PREDICT,
        },
      }),
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
    if (timedOut) return { ok: false, error: `timeout-${timeoutMs}ms` };
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

/* -------------------------- retro formatter -------------------------- */

export interface FormatRetroOpts {
  synthesis: string; // validated to contain all 4 sections
  sources: WeeklySource[];
  weekIso: string;
  date: string;
  model?: string;
}

/**
 * Pure formatter — emits markdown with YAML frontmatter listing every daily
 * context by date + path. Frontmatter `source_path` values are single-quoted
 * so a Windows drive-letter path (`C:/...`) can never break YAML parsing.
 */
export function formatRetro(opts: FormatRetroOpts): string {
  const { synthesis, sources, weekIso, date, model } = opts;
  const fm: string[] = [
    "---",
    "kind: weekly-synthesis",
    `week: ${weekIso}`,
    `generated_for_date: ${date}`,
    `generated_at: ${new Date().toISOString()}`,
    `sources_count: ${sources.length}`,
  ];
  if (model) fm.push(`summarizer_model: ${model}`);
  fm.push("sources:");
  for (const s of sources) {
    fm.push(`  - date: ${s.date}`);
    fm.push(`    path: '${s.path.replace(/\\/g, "/").replace(/'/g, "''")}'`);
    fm.push(`    bytes: ${s.bytes}`);
  }
  fm.push("---");
  fm.push("");
  fm.push(`# Weekly Synthesis — ${weekIso}`);
  fm.push("");
  fm.push(synthesis.trim());
  fm.push("");
  fm.push("## Source briefs");
  fm.push("");
  for (const s of sources) {
    const rel = s.path.replace(/\\/g, "/");
    fm.push(`- **${s.date}** — \`${rel}\` (${s.bytes} bytes)`);
  }
  fm.push("");
  return fm.join("\n");
}

/* -------------------------- engine -------------------------- */

export interface RunWeeklyOpts {
  /** ISO YYYY-MM-DD anchor; defaults to today UTC. */
  date?: string;
  /** Absolute path to `knowledge/memories/`. */
  vaultRoot: string;
  /** Where to write `WEEKLY-<weekIso>.md`. Default `<vaultRoot>/generated/`. */
  outputDir?: string;
  /** Injectable for tests. Default `defaultLoader`. */
  loader?: LoaderFn;
  /** Injectable for tests. Default `defaultOllamaSummarizer`. */
  summarizer?: SummarizerFn;
}

export interface RunWeeklyOk {
  ok: true;
  path: string;
  weekIso: string;
  date: string;
  sources_used: number;
  bytes_written: number;
}

export interface RunWeeklyFail {
  ok: false;
  error: WeeklySynthesisErrorClass;
  detail?: string;
}

export type RunWeeklyResult = RunWeeklyOk | RunWeeklyFail;

export class WeeklySynthesisEngine {
  private loader: LoaderFn;
  private summarizer: SummarizerFn;

  constructor(opts: { loader?: LoaderFn; summarizer?: SummarizerFn; outcomesDir?: string } = {}) {
    // Octopus folding (consensus brief + per-domain rollup from the U-FLEET-CONSUME
    // feeds) is composed onto the DEFAULT loader only. The composer is default-OFF
    // internally: it returns the base loader UNCHANGED unless PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1,
    // so production (no injected loader) is byte-identical when the knob is unset.
    //
    // An INJECTED loader is AUTHORITATIVE -- used as-is, never re-composed. Re-composing
    // a caller-supplied loader double-counts the octopus ledger source AND force-reads the
    // live OCTOPUS_OUTCOMES_DIR, which (a) broke the loader-injection contract that
    // OctopusWeeklySynthesisLoader's tests rely on (they compose octopus themselves) and
    // (b) leaked live outcome files into the daily-context E2E tests. Callers that want
    // octopus on top of a custom loader compose it themselves (composeOctopusLoader).
    if (opts.loader) {
      this.loader = opts.loader;
    } else {
      const outcomesDir = opts.outcomesDir ?? OCTOPUS_OUTCOMES_DIR;
      this.loader = composeOctopusLoader(defaultLoader, { outcomesDir });
    }
    this.summarizer = opts.summarizer ?? defaultOllamaSummarizer;
  }

  async runWeekly(opts: RunWeeklyOpts): Promise<RunWeeklyResult> {
    const date = opts.date ?? isoDateUTC();
    const vaultRoot = opts.vaultRoot;
    const outputDir = opts.outputDir ?? path.join(vaultRoot, "generated");

    // 0. validate the anchor date — a malformed `date` (e.g. an operator typo
    //    in the PRISM_WEEKLY_SYNTHESIS_DATE backfill knob) would otherwise
    //    propagate NaN into weekIsoUTC and write a corrupt `WEEKLY-NaN-WNaN.md`
    //    while the CLI exits 0. Fail loud instead (Karpathy R12). The
    //    round-trip check (`toISOString` prefix === input) also rejects a
    //    digit-shaped but impossible date like `2026-02-30`, which `new Date`
    //    would otherwise silently normalize to March 2.
    const parsedAnchor = new Date(`${date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedAnchor.getTime()) ||
      parsedAnchor.toISOString().slice(0, 10) !== date
    ) {
      return {
        ok: false,
        error: "invalid-date",
        detail: `anchor date is not a real YYYY-MM-DD: ${date}`,
      };
    }
    const weekIso = weekIsoUTC(new Date(`${date}T00:00:00Z`));

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

    // 2. load the daily-context lineage
    let sources: WeeklySource[];
    try {
      sources = await this.loader({ vaultRoot, date });
    } catch (err) {
      return {
        ok: false,
        error: "no-sources",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
    if (sources.length < MIN_SOURCES_FOR_RETRO) {
      return {
        ok: false,
        error: "no-sources",
        detail: `loader returned ${sources.length} daily-context files; ${MIN_SOURCES_FOR_RETRO} required`,
      };
    }

    // 3. synthesize. The summarizer is an injected DI boundary — a custom
    //    SummarizerFn (or a future defaultOllamaSummarizer regression) that
    //    THROWS instead of returning {ok:false} must not escape as an
    //    unhandled rejection: contain it as `summarizer-failed` so runWeekly
    //    keeps its discriminated-union contract (always resolves to a
    //    RunWeeklyResult, never rejects). Mirrors the step-2 loader try/catch.
    let sumResult: SummarizerResult;
    try {
      sumResult = await this.summarizer({ sources, weekIso });
    } catch (err) {
      return {
        ok: false,
        error: "summarizer-failed",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
    if (!sumResult.ok) {
      return { ok: false, error: "summarizer-failed", detail: sumResult.error };
    }

    // 3b. NECESSARY-NOT-SUFFICIENT GATE — the retro MUST contain all 4 section
    //     headers (line-start, outside code fences). A response missing any
    //     fails loud as `incomplete-synthesis` rather than writing a partial
    //     retro. This proves structure, not synthesis quality.
    if (!hasAllSections(sumResult.text)) {
      return {
        ok: false,
        error: "incomplete-synthesis",
        detail: `missing section(s): ${missingSections(sumResult.text).join(", ")}`,
      };
    }

    // 4. format + write
    const md = formatRetro({
      synthesis: sumResult.text,
      sources,
      weekIso,
      date,
      model: "model" in sumResult ? sumResult.model : undefined,
    });
    const outPath = path.join(outputDir, `WEEKLY-${weekIso}.md`);

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
      weekIso,
      date,
      sources_used: sources.length,
      bytes_written: Buffer.byteLength(md, "utf8"),
    };
  }
}

/* -------------------------- CLI (scheduled-task entry) -------------------------- */

/**
 * Invoked by `scripts/cron/weekly-synthesis-cron.ps1`, which runs this
 * TypeScript SOURCE directly through tsx:
 *   node node_modules/tsx/dist/cli.mjs src/engines/WeeklySynthesisEngine.ts --run
 * (PRISM's esbuild build emits a bundle — dist/index.js + dist/chunks/ —
 * with no per-engine dist/engines/<Name>.js, so there is no compiled .js to
 * invoke; the cron script's header documents the rationale in full.)
 *
 * Knobs:
 *   PRISM_WEEKLY_SYNTHESIS_VAULT_ROOT  (default H:/prism/knowledge/memories)
 *   PRISM_WEEKLY_SYNTHESIS_DATE        (override anchor date — for backfill)
 */
async function runCli(): Promise<number> {
  const vaultRoot =
    process.env.PRISM_WEEKLY_SYNTHESIS_VAULT_ROOT || "H:/prism/knowledge/memories";
  // The cron fires Sunday 8PM LOCAL. On a host west of UTC that instant is
  // already Monday in UTC, so a raw isoDateUTC() would roll the anchor into
  // the NEXT ISO week (wrong-week file + a Tue..Mon loader window). Snap the
  // anchor back to the most-recent Sunday (the week the retro is *for*) so the
  // result is correct regardless of the host timezone. An explicit
  // PRISM_WEEKLY_SYNTHESIS_DATE backfill value is used verbatim (no snap) —
  // and runWeekly validates it.
  let date = process.env.PRISM_WEEKLY_SYNTHESIS_DATE;
  if (!date) {
    const d = new Date();
    const dow = d.getUTCDay(); // 0=Sun
    if (dow !== 0) d.setUTCDate(d.getUTCDate() - dow); // snap back to Sunday
    date = isoDateUTC(d);
  }
  const engine = new WeeklySynthesisEngine();
  const result = await engine.runWeekly({ vaultRoot, date });
  if (result.ok) {
    process.stdout.write(
      JSON.stringify({ ok: true, path: result.path, sources_used: result.sources_used }) + "\n",
    );
    return 0;
  }
  process.stderr.write(
    JSON.stringify({ ok: false, error: result.error, detail: result.detail }) + "\n",
  );
  return 1;
}

// CLI guard — only run when invoked directly, never on library import.
const argv1 = process.argv[1] || "";
const invokedDirectly = (() => {
  try {
    const thisUrl = pathToFileURL(argv1).href;
    return import.meta.url === thisUrl;
  } catch {
    return /WeeklySynthesisEngine\.(?:js|ts)$/i.test(argv1);
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

// keep eslint happy about the intentionally-unused fileURLToPath import
// (kept for B1-sibling parity; the CLI guard uses pathToFileURL)
void fileURLToPath;

// Canonical singleton export — matches the PRISM dispatcher convention of
// importing a lowercase singleton via dynamic import (e.g. {weeklySynthesisEngine}).
export const weeklySynthesisEngine = new WeeklySynthesisEngine();
