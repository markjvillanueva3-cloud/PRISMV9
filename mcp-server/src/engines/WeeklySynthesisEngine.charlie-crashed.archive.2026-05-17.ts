/**
 * WeeklySynthesisEngine
 * =====================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B4/U-WEEKLY-SYNTHESIS
 *
 * Sunday-evening retro that reads the last 7 days of
 * `DAILY-CONTEXT-YYYY-MM-DD.md` files (produced by B1 / DailyContextWorkflowEngine)
 * and emits a 4-section synthesis to
 * `knowledge/memories/generated/WEEKLY-YYYY-WW.md`.
 *
 * NOT a duplicate of the `/weekly-synthesis` skill (OBSIDIAN-COMPOUND-MS1) —
 * that's an operator-triggered Monday ritual analysing ALL vault subdirs;
 * this engine consumes only the B1 daily outputs on a Sunday cron.
 *
 * The four sections per the cyrilXBT retro spec:
 *   1. "Moved" — projects whose body text changed across days OR newly
 *      appeared in the second half of the window.
 *   2. "Didn't move" — projects whose body text was IDENTICAL across the
 *      week and appeared in ≥PATTERN_FREQUENCY_FLOOR dailies.
 *   3. "Emerging patterns" — terms that gained cross-daily document
 *      frequency (TF-style document count, capped at PATTERN_TOP_K).
 *   4. "Top-3 next-week leverage" — projects with highest body-churn
 *      (literal heuristic); Ollama upgrade replaces with synthesised list.
 *
 * Two-phase (mirrors DailyContextWorkflowEngine):
 *   1. `collectLineage()` — pure-deterministic FS read of last 7 dailies in
 *      window. Byte-stable given filesystem + `now`.
 *   2. `synthesize()` — composes markdown. Optional Ollama summariser DI;
 *      literal fallback per section when client null / throws / returns null.
 *
 * Safety: caps file count + excerpt bytes; rejects symlinks via lstat; never
 * follows directories; non-UTF8 bytes decoded lossily (U+FFFD).
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/B4/U-WEEKLY-SYNTHESIS
 * @module engines/WeeklySynthesisEngine
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

export interface DailySource {
  path: string;
  label: string;
  dateStr: string;
  mtime: string;
  mtimeMs: number;
  excerpt: string;
  truncated: boolean;
}

export interface WeeklyLineage {
  weekTag: string;
  windowStart: string;
  windowEnd: string;
  dailies: DailySource[];
  outputPath: string;
  generatedAt: string;
  availability: { dailyFilesFound: number };
  caps: { maxDailies: number; excerptBytes: number; windowDays: number };
}

export interface WeeklySection {
  heading: string;
  body: string;
  sourceCount: number;
}

export interface WeeklyBrief {
  weekTag: string;
  outputPath: string;
  markdown: string;
  lineage: WeeklyLineage;
  sections: {
    moved: WeeklySection;
    didntMove: WeeklySection;
    emergingPatterns: WeeklySection;
    topLeverage: WeeklySection;
  };
  synthesizer: "ollama" | "literal";
  sourceCount: number;
  meetsLineageFloor: boolean;
  warnings: string[];
  durationMs: { collect: number; synthesize: number; total: number };
  generatedAt: string;
}

export interface WeeklyOllamaSummariseClient {
  summarise(input: { model: string; system: string; prompt: string }): Promise<string | null>;
}

export interface WeeklyOptions {
  vaultRoot?: string;
  generatedRoot?: string;
  now?: number;
  maxDailies?: number;
  windowDays?: number;
  excerptBytes?: number;
  ollamaClient?: WeeklyOllamaSummariseClient;
  ollamaModel?: string;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_GENERATED_SUBDIR = "generated";
const DEFAULT_MAX_DAILIES = 7;
const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_EXCERPT_BYTES = 8192;
const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder";

const MAX_DAILIES_MIN = 1;
const MAX_DAILIES_MAX = 31;
const WINDOW_DAYS_MIN = 1;
const WINDOW_DAYS_MAX = 31;
const EXCERPT_BYTES_MIN = 512;
const EXCERPT_BYTES_MAX = 131_072;
const LINEAGE_FLOOR = 3;
const PATTERN_FREQUENCY_FLOOR = 2;
const PATTERN_TOP_K = 5;
const LEVERAGE_TOP_K = 3;
const MIN_TOKEN_LEN = 4;

const DAILY_PATTERN = /^DAILY-CONTEXT-(\d{4}-\d{2}-\d{2})\.md$/i;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "what", "where",
  "when", "why", "how", "all", "any", "some", "one", "two", "more", "most",
  "such", "only", "other", "its", "his", "her", "him", "she", "our", "way",
  "use", "used", "using", "can", "will", "would", "could", "should", "may",
  "might", "must", "also", "just", "very", "much", "many", "few", "still",
  "now", "yet", "back", "down", "off", "around", "between", "through", "during",
  "while", "because", "since", "until", "though", "although", "however",
  "therefore", "thus", "hence", "either", "neither", "both", "each", "every",
  "none", "see", "say", "said", "get", "got", "gets", "make", "makes", "made",
  "let", "lets", "yes", "have", "has", "had", "are", "was", "were", "but",
  "not", "you", "your", "they", "them", "their", "there", "than", "then",
  "daily", "context", "yesterday", "today", "brief", "source", "sources",
  "active", "projects", "inbox",
]);

// ---------- Zod schema -------------------------------------------------------

export const WeeklyOptionsSchema = z.object({
  vaultRoot: z.string().min(1).optional(),
  generatedRoot: z.string().min(1).optional(),
  now: z.number().finite().optional(),
  maxDailies: z.number().int().min(MAX_DAILIES_MIN).max(MAX_DAILIES_MAX).optional(),
  windowDays: z.number().int().min(WINDOW_DAYS_MIN).max(WINDOW_DAYS_MAX).optional(),
  excerptBytes: z.number().int().min(EXCERPT_BYTES_MIN).max(EXCERPT_BYTES_MAX).optional(),
  ollamaClient: z.unknown().optional(),
  ollamaModel: z.string().min(1).optional(),
}).passthrough();

function validateOptions(opts: WeeklyOptions): WeeklyOptions {
  WeeklyOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers ----------------------------------------------------------

function dateOnlyIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** ISO-8601 week tag (YYYY-W##). */
function isoWeekTag(ms: number): string {
  const d = new Date(ms);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function clampInt(v: number | undefined, lo: number, hi: number, dflt: number): number {
  if (v === undefined || v === null) return dflt;
  if (!Number.isFinite(v)) return dflt;
  const n = Math.floor(v);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function resolveRoot(p: string): string {
  if (!p || typeof p !== "string") throw new Error("root path required");
  return resolve(p);
}

function listDailies(dir: string): Array<{ path: string; mtimeMs: number; name: string; dateStr: string }> {
  if (!existsSync(dir)) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: Array<{ path: string; mtimeMs: number; name: string; dateStr: string }> = [];
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.includes("..") || ent.name.includes("/") || ent.name.includes("\\")) continue;
    const m = DAILY_PATTERN.exec(ent.name);
    if (!m) continue;
    if (!ent.isFile()) continue;
    const full = join(dir, ent.name);
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isSymbolicLink()) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    out.push({ path: full, mtimeMs: st.mtimeMs, name: ent.name, dateStr: m[1] });
  }
  return out;
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

function toDailySource(file: { path: string; mtimeMs: number; name: string; dateStr: string }, cap: number): DailySource {
  const { excerpt, truncated } = readExcerpt(file.path, cap);
  return {
    path: file.path,
    label: file.name.replace(/\.md$/i, ""),
    dateStr: file.dateStr,
    mtime: new Date(file.mtimeMs).toISOString(),
    mtimeMs: file.mtimeMs,
    excerpt,
    truncated,
  };
}

function tokenize(raw: string): string[] {
  const lower = raw.toLowerCase();
  const tokens: string[] = [];
  for (const piece of lower.split(/[^a-z0-9_-]+/)) {
    if (!piece || piece.length < MIN_TOKEN_LEN) continue;
    if (/^\d+$/.test(piece)) continue;
    if (STOPWORDS.has(piece)) continue;
    tokens.push(piece);
  }
  return tokens;
}

// ---------- Section extractors ----------------------------------------------

interface ProjectBullet {
  label: string;
  body: string;
  dateStr: string;
}

/** Pull `- **label** — body` bullets from a daily's "## Active Projects" section. */
function extractProjectBullets(daily: DailySource): ProjectBullet[] {
  const out: ProjectBullet[] = [];
  const lines = daily.excerpt.split(/\r?\n/);
  let inSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+Active Projects/i.test(line)) { inSection = true; continue; }
    if (inSection && /^##\s+/.test(line)) break;
    if (!inSection) continue;
    const m = /^[-*]\s+\*\*([^*]+)\*\*\s*[—–-]\s*(.+)$/u.exec(line);
    if (m) out.push({ label: m[1].trim(), body: m[2].trim(), dateStr: daily.dateStr });
  }
  return out;
}

function computeMoved(dailies: DailySource[]): Array<{ label: string; latestBody: string; dateStr: string; reason: string }> {
  if (dailies.length === 0) return [];
  const byLabel = new Map<string, ProjectBullet[]>();
  for (const d of dailies) {
    for (const b of extractProjectBullets(d)) {
      const arr = byLabel.get(b.label) ?? [];
      arr.push(b);
      byLabel.set(b.label, arr);
    }
  }
  // Split index for "recent half" — clamped to valid range. For 1 daily,
  // splitIdx=0 means the lone day IS the recent period (whole window is "new").
  const splitIdx = Math.min(dailies.length - 1, Math.max(0, Math.floor(dailies.length / 2)));
  const recentStart = dailies[splitIdx].dateStr;
  const out: Array<{ label: string; latestBody: string; dateStr: string; reason: string }> = [];
  for (const [label, bullets] of byLabel.entries()) {
    if (bullets.length === 0) continue;
    const sorted = [...bullets].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const bodies = new Set(sorted.map((x) => x.body));
    const latest = sorted[sorted.length - 1];
    if (bodies.size > 1) {
      out.push({ label, latestBody: latest.body, dateStr: latest.dateStr, reason: "body changed" });
    } else if (sorted[0].dateStr >= recentStart) {
      out.push({ label, latestBody: latest.body, dateStr: latest.dateStr, reason: "new this period" });
    }
  }
  out.sort((a, b) => b.dateStr.localeCompare(a.dateStr) || a.label.localeCompare(b.label));
  return out;
}

function computeDidntMove(dailies: DailySource[]): Array<{ label: string; body: string; daysSeen: number }> {
  if (dailies.length === 0) return [];
  const byLabel = new Map<string, ProjectBullet[]>();
  for (const d of dailies) {
    for (const b of extractProjectBullets(d)) {
      const arr = byLabel.get(b.label) ?? [];
      arr.push(b);
      byLabel.set(b.label, arr);
    }
  }
  const out: Array<{ label: string; body: string; daysSeen: number }> = [];
  for (const [label, bullets] of byLabel.entries()) {
    if (bullets.length < PATTERN_FREQUENCY_FLOOR) continue;
    const bodies = new Set(bullets.map((x) => x.body));
    if (bodies.size === 1) {
      out.push({ label, body: bullets[0].body, daysSeen: bullets.length });
    }
  }
  out.sort((a, b) => (b.daysSeen - a.daysSeen) || a.label.localeCompare(b.label));
  return out;
}

function computeEmergingPatterns(dailies: DailySource[]): Array<{ term: string; daysSeen: number }> {
  const docFreq = new Map<string, number>();
  for (const d of dailies) {
    const seen = new Set<string>();
    for (const t of tokenize(d.excerpt)) {
      if (seen.has(t)) continue;
      seen.add(t);
      docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    }
  }
  const ranked: Array<{ term: string; daysSeen: number }> = [];
  for (const [term, n] of docFreq.entries()) {
    if (n < PATTERN_FREQUENCY_FLOOR) continue;
    ranked.push({ term, daysSeen: n });
  }
  ranked.sort((a, b) => (b.daysSeen - a.daysSeen) || a.term.localeCompare(b.term));
  return ranked.slice(0, PATTERN_TOP_K);
}

function computeTopLeverage(dailies: DailySource[]): Array<{ label: string; latestBody: string; churn: number }> {
  const byLabel = new Map<string, ProjectBullet[]>();
  for (const d of dailies) {
    for (const b of extractProjectBullets(d)) {
      const arr = byLabel.get(b.label) ?? [];
      arr.push(b);
      byLabel.set(b.label, arr);
    }
  }
  const out: Array<{ label: string; latestBody: string; churn: number }> = [];
  for (const [label, bullets] of byLabel.entries()) {
    const bodies = new Set(bullets.map((x) => x.body));
    if (bodies.size === 0) continue;
    const sorted = [...bullets].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    out.push({ label, latestBody: sorted[sorted.length - 1].body, churn: bodies.size });
  }
  out.sort((a, b) => (b.churn - a.churn) || a.label.localeCompare(b.label));
  return out.slice(0, LEVERAGE_TOP_K);
}

// ---------- Renderers --------------------------------------------------------

function renderMovedSection(items: ReturnType<typeof computeMoved>): WeeklySection {
  if (items.length === 0) {
    return { heading: "Moved", body: "_No advanced or new items this week._", sourceCount: 0 };
  }
  const body = items.map((i) => `- **${i.label}** (${i.dateStr}, ${i.reason}) — ${i.latestBody}`).join("\n");
  return { heading: "Moved", body, sourceCount: items.length };
}

function renderDidntMoveSection(items: ReturnType<typeof computeDidntMove>): WeeklySection {
  if (items.length === 0) {
    return { heading: "Didn't move", body: "_Every recurring item shifted this week._", sourceCount: 0 };
  }
  const body = items.map((i) => `- **${i.label}** (seen ${i.daysSeen}× unchanged) — ${i.body}`).join("\n");
  return { heading: "Didn't move", body, sourceCount: items.length };
}

function renderEmergingPatternsSection(items: ReturnType<typeof computeEmergingPatterns>): WeeklySection {
  if (items.length === 0) {
    return { heading: "Emerging patterns", body: "_No terms crossed the cross-daily frequency floor._", sourceCount: 0 };
  }
  const body = items.map((i) => `- **${i.term}** — appears in ${i.daysSeen} dailies this week`).join("\n");
  return { heading: "Emerging patterns", body, sourceCount: items.length };
}

function renderTopLeverageSection(items: ReturnType<typeof computeTopLeverage>): WeeklySection {
  if (items.length === 0) {
    return { heading: "Top-3 next-week leverage", body: "_No items showed enough churn to recommend leverage._", sourceCount: 0 };
  }
  const body = items.map((i, idx) => `${idx + 1}. **${i.label}** (churn=${i.churn}) — ${i.latestBody}`).join("\n");
  return { heading: "Top-3 next-week leverage", body, sourceCount: items.length };
}

async function safeSummarise(
  client: WeeklyOllamaSummariseClient,
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

async function maybeOllamaSection(
  client: WeeklyOllamaSummariseClient | undefined,
  model: string,
  literal: WeeklySection,
  systemPrompt: string,
  dailies: DailySource[],
): Promise<{ section: WeeklySection; synthesizer: "ollama" | "literal" }> {
  if (literal.sourceCount === 0) return { section: literal, synthesizer: "literal" };
  if (!client) return { section: literal, synthesizer: "literal" };
  const prompt = dailies.map((d) => `### ${d.label}\n${d.excerpt}`).join("\n\n---\n\n");
  const summary = await safeSummarise(client, model, { system: systemPrompt, prompt });
  if (summary && summary.trim().length > 0) {
    return {
      section: { heading: literal.heading, body: summary.trim(), sourceCount: literal.sourceCount },
      synthesizer: "ollama",
    };
  }
  return { section: literal, synthesizer: "literal" };
}

// ---------- Engine -----------------------------------------------------------

export class WeeklySynthesisEngine {
  readonly name = "WeeklySynthesisEngine";

  collectLineage(opts: WeeklyOptions = {}): WeeklyLineage {
    validateOptions(opts);
    const vaultRoot = resolveRoot(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const generatedRoot = resolveRoot(opts.generatedRoot ?? join(vaultRoot, DEFAULT_GENERATED_SUBDIR));
    const now = opts.now ?? Date.now();
    const maxDailies = clampInt(opts.maxDailies, MAX_DAILIES_MIN, MAX_DAILIES_MAX, DEFAULT_MAX_DAILIES);
    const windowDays = clampInt(opts.windowDays, WINDOW_DAYS_MIN, WINDOW_DAYS_MAX, DEFAULT_WINDOW_DAYS);
    const excerptBytes = clampInt(opts.excerptBytes, EXCERPT_BYTES_MIN, EXCERPT_BYTES_MAX, DEFAULT_EXCERPT_BYTES);

    const windowEnd = dateOnlyIso(now);
    const windowStartMs = now - windowDays * 24 * 60 * 60 * 1000;
    const windowStart = dateOnlyIso(windowStartMs);
    const weekTag = isoWeekTag(now);
    const outputPath = join(generatedRoot, `WEEKLY-${weekTag}.md`);

    const all = listDailies(generatedRoot);
    const dailyFilesFound = all.length;
    const inWindow = all
      .filter((f) => f.dateStr >= windowStart && f.dateStr < windowEnd)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.name.localeCompare(b.name))
      .slice(-maxDailies);

    const dailies = inWindow.map((f) => toDailySource(f, excerptBytes));

    return {
      weekTag,
      windowStart,
      windowEnd,
      dailies,
      outputPath,
      generatedAt: new Date(now).toISOString(),
      availability: { dailyFilesFound },
      caps: { maxDailies, excerptBytes, windowDays },
    };
  }

  async synthesize(opts: WeeklyOptions = {}): Promise<WeeklyBrief> {
    validateOptions(opts);
    const tStart = Date.now();
    const lineage = this.collectLineage(opts);
    const tCollectDone = Date.now();
    const model = opts.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    const client = opts.ollamaClient;

    const movedItems = computeMoved(lineage.dailies);
    const didntMoveItems = computeDidntMove(lineage.dailies);
    const patternItems = computeEmergingPatterns(lineage.dailies);
    const leverageItems = computeTopLeverage(lineage.dailies);

    const movedLiteral = renderMovedSection(movedItems);
    const didntMoveLiteral = renderDidntMoveSection(didntMoveItems);
    const patternsLiteral = renderEmergingPatternsSection(patternItems);
    const leverageLiteral = renderTopLeverageSection(leverageItems);

    let allOllamaForPopulated = true;
    const moved = await maybeOllamaSection(
      client, model, movedLiteral,
      "Given a week of daily briefs, return a markdown bullet list naming what advanced. Preserve concrete artifacts (file paths, unit ids, commit shas) verbatim.",
      lineage.dailies,
    );
    if (moved.synthesizer === "literal" && movedLiteral.sourceCount > 0 && client) allOllamaForPopulated = false;

    const didntMove = await maybeOllamaSection(
      client, model, didntMoveLiteral,
      "Given a week of daily briefs, return a markdown bullet list naming what stayed the same — items that appeared unchanged across multiple days. Preserve concrete artifacts.",
      lineage.dailies,
    );
    if (didntMove.synthesizer === "literal" && didntMoveLiteral.sourceCount > 0 && client) allOllamaForPopulated = false;

    const patterns = await maybeOllamaSection(
      client, model, patternsLiteral,
      "Given a week of daily briefs, return a markdown bullet list naming emerging themes that gained frequency across days. Cite the recurring terms.",
      lineage.dailies,
    );
    if (patterns.synthesizer === "literal" && patternsLiteral.sourceCount > 0 && client) allOllamaForPopulated = false;

    const leverage = await maybeOllamaSection(
      client, model, leverageLiteral,
      "Given a week of daily briefs, return a numbered list of the TOP 3 highest-leverage focus items for next week. Be concrete; cite project labels verbatim.",
      lineage.dailies,
    );
    if (leverage.synthesizer === "literal" && leverageLiteral.sourceCount > 0 && client) allOllamaForPopulated = false;

    const populatedSections =
      (movedLiteral.sourceCount > 0 ? 1 : 0) +
      (didntMoveLiteral.sourceCount > 0 ? 1 : 0) +
      (patternsLiteral.sourceCount > 0 ? 1 : 0) +
      (leverageLiteral.sourceCount > 0 ? 1 : 0);

    const actuallyUsedOllama = client !== undefined && populatedSections > 0 && allOllamaForPopulated;
    const synthesizer: "ollama" | "literal" = actuallyUsedOllama ? "ollama" : "literal";

    const totalSources = lineage.dailies.length;
    const everythingAvailableUsed = lineage.dailies.length === Math.min(
      lineage.availability.dailyFilesFound,
      lineage.caps.maxDailies,
    );
    const warnings: string[] = [];
    if (lineage.availability.dailyFilesFound === 0) {
      warnings.push("no DAILY-CONTEXT files on disk — B1 hasn't run yet?");
    } else if (totalSources < lineage.availability.dailyFilesFound) {
      warnings.push(`window filter applied: ${totalSources}/${lineage.availability.dailyFilesFound} dailies included`);
    }
    if (totalSources < LINEAGE_FLOOR) {
      warnings.push(`retro is thin: ${totalSources}/${LINEAGE_FLOOR} dailies in window`);
    }
    const meetsLineageFloor =
      totalSources >= LINEAGE_FLOOR || (totalSources > 0 && everythingAvailableUsed);

    const header = `# Weekly Synthesis — ${lineage.weekTag}\n_Generated ${lineage.generatedAt} from ${totalSources} daily brief(s) — synthesizer=${synthesizer}_\n_Window: ${lineage.windowStart} → ${lineage.windowEnd}_`;

    const sourcesBlock = (() => {
      const lines: string[] = ["## Sources"];
      if (lineage.dailies.length === 0) lines.push("- _(none)_");
      else for (const d of lineage.dailies) lines.push(`- ${d.path} (${d.mtime})`);
      return lines.join("\n");
    })();

    const markdown =
      [
        header,
        `## ${moved.section.heading}\n\n${moved.section.body}`,
        `## ${didntMove.section.heading}\n\n${didntMove.section.body}`,
        `## ${patterns.section.heading}\n\n${patterns.section.body}`,
        `## ${leverage.section.heading}\n\n${leverage.section.body}`,
        sourcesBlock,
      ].join("\n\n") + "\n";

    const tEnd = Date.now();

    return {
      weekTag: lineage.weekTag,
      outputPath: lineage.outputPath,
      markdown,
      lineage,
      sections: {
        moved: moved.section,
        didntMove: didntMove.section,
        emergingPatterns: patterns.section,
        topLeverage: leverage.section,
      },
      synthesizer,
      sourceCount: totalSources,
      meetsLineageFloor,
      warnings,
      durationMs: {
        collect: tCollectDone - tStart,
        synthesize: tEnd - tCollectDone,
        total: tEnd - tStart,
      },
      generatedAt: lineage.generatedAt,
    };
  }
}

/** @internal — exported for the test suite only; do NOT depend on from prod code. */
export const _internals = {
  isoWeekTag,
  extractProjectBullets,
  computeMoved,
  computeDidntMove,
  computeEmergingPatterns,
  computeTopLeverage,
  tokenize,
  clampInt,
  LINEAGE_FLOOR,
  PATTERN_FREQUENCY_FLOOR,
  PATTERN_TOP_K,
  LEVERAGE_TOP_K,
  DAILY_PATTERN,
};

export const weeklySynthesisEngine = new WeeklySynthesisEngine();
export default WeeklySynthesisEngine;

export async function buildAndOptionallyWriteWeeklySynthesis(
  opts: WeeklyOptions & { write?: boolean; mkdirIfMissing?: boolean },
): Promise<WeeklyBrief & { written: boolean }> {
  validateOptions(opts);
  const brief = await weeklySynthesisEngine.synthesize(opts);
  if (!opts.write) {
    return { ...brief, written: false };
  }
  const outDir = dirname(brief.outputPath);
  if (opts.mkdirIfMissing !== false) {
    try {
      mkdirSync(outDir, { recursive: true });
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw e;
    }
  }
  writeFileSync(brief.outputPath, brief.markdown, "utf8");
  return { ...brief, written: true };
}
