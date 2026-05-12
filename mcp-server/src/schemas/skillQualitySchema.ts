/**
 * Skill Quality Schema — quality-tracking fields for the PRISM skill library.
 *
 * U-SKU06 (SKILLS-UTILIZATION-MS0): the registry-schema foundation. PRISM has
 * ~637 skills (project `commands/*.md` + user `commands/*.md` + plugin
 * `skills/**​/SKILL.md`). This schema adds the quality-tracking fields that the
 * rest of the milestone reads:
 *   - U-SKU01 (3Q pre-build gate)        → trigger_phrases, has_output_example
 *   - U-SKU02 (3-scenario test runner)   → scenario_tests, production_grade
 *   - U-SKU03 (skill linter)             → vague_language_violations, body_line_count
 *   - U-SKU04 (refinement cadence)       → last_refined, invocation_count_30d
 *   - U-SKU05 (library audit)            → all of the above + last_audited
 *
 * Source doctrine: state/shared/research/2026-05-10-skills-openclaw.md §2 +
 * the @eng_khairallah1 4-phase course (Three-Question gate, Three-Scenario bar,
 * "vague language is banned", master-tracking-doc pattern).
 *
 * Pure, side-effect-free helpers live here so the linter (U-SKU03), the 3Q gate
 * (U-SKU01) and the registry builder all share one implementation.
 *
 * @module skillQualitySchema
 */

import { z } from "zod";

/** Schema version for SKILL_QUALITY_REGISTRY.json — bump on breaking change. */
export const SKILL_QUALITY_SCHEMA_VERSION = "1.0.0";

/** Storage caps (mirrors the @eng_khairallah1 / Anthropic skill conventions). */
export const SKILL_DESCRIPTION_MAX_CHARS = 1024;
/** Body-line cap from @eng_khairallah1 Phase-2 ("keep the file under 500 lines"). */
export const SKILL_BODY_LINE_CAP = 500;
/** Minimum distinct trigger phrases for a description to be considered specific. */
export const SKILL_MIN_TRIGGER_PHRASES = 3;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

/** Where a skill physically lives (Anthropic's enterprise→user→project→plugin precedence). */
export type SkillSourceTier = "enterprise" | "user" | "project" | "plugin";

/** Declared skill kind — gates which quality checks apply (methodology skills are
 *  exempt from the "perfect output example" requirement, per U-SKU01 adversarial case). */
export type SkillType = "rigid" | "flexible" | "methodology" | "reference";

/** Result of a single scenario test (U-SKU02). `null` = not yet run. */
export type ScenarioVerdict = "pass" | "fail" | null;

/** The three @eng_khairallah1 production-grade scenarios. */
export interface ScenarioTests {
  /** Happy path — ~80% of cases. */
  happy: ScenarioVerdict;
  /** Edge case — weird / incomplete / conflicting input. */
  edge: ScenarioVerdict;
  /** Stress test — biggest / messiest version. */
  stress: ScenarioVerdict;
}

/** Quality-tracking fields attached to every skill registry entry. */
export interface SkillQualityFields {
  /** True only when linter clean AND 3Q satisfied AND all 3 scenarios pass
   *  (or skill_type === "methodology" with a process rubric). Default false. */
  production_grade: boolean;
  /** ISO date the skill body was last edited (defaults to file mtime). */
  last_refined: string;
  /** Trigger phrases extracted from the description (heuristic). Default []. */
  trigger_phrases: string[];
  /** True when the body has a fenced code block near "example"/"output"/"perfect". */
  has_output_example: boolean;
  /** Non-fenced-code body line count (the figure the 500-line cap is checked against). */
  body_line_count: number;
  /** Per-scenario verdicts from U-SKU02's runner. */
  scenario_tests: ScenarioTests;
  /** Banned vague phrases found in instruction lines (outside code/quotes). Default []. */
  vague_language_violations: string[];
  /** ISO datetime the library audit (U-SKU05) last graded this skill, or null. */
  last_audited: string | null;
  /** Invocations in the last 30 days from telemetry. `null` when telemetry is unavailable. */
  invocation_count_30d: number | null;
}

/** One row of SKILL_QUALITY_REGISTRY.json. */
export interface SkillQualityRecord {
  /** Canonical skill name — directory name for `skills/<name>/SKILL.md`,
   *  filename-without-`.md` for flat `commands/foo.md`, `<plugin>:<skill>` for plugin skills. */
  name: string;
  /** Real (symlink-resolved) absolute path to the SKILL.md / command .md. */
  path: string;
  /** Which tier this copy came from. */
  tier: SkillSourceTier;
  /** Plugin namespace, when tier === "plugin". */
  plugin?: string;
  /** Description from frontmatter (truncated to SKILL_DESCRIPTION_MAX_CHARS for storage). */
  description: string;
  /** True when the original description exceeded the storage cap. */
  description_over_limit: boolean;
  /** Declared skill kind, when the frontmatter sets `skill_type:`. */
  skill_type?: SkillType;
  /** True when frontmatter has `disable-model-invocation: true` (description not auto-loaded). */
  disable_model_invocation: boolean;
  /** True when frontmatter has `user-invocable: false` (a pure reference skill). */
  user_invocable: boolean;
  /** Name of the higher-precedence skill that overrides this one (R7 — surface, don't average). */
  shadowed_by?: string;
  /** Name(s) of the lower-precedence skill(s) this one overrides. */
  shadows?: string[];
  /** Set instead of crashing when frontmatter YAML fails to parse. */
  _parse_error?: string;
  /** Quality fields. */
  quality: SkillQualityFields;
}

/** Default quality block — every populator row starts here. */
export function defaultSkillQuality(lastRefinedISO: string): SkillQualityFields {
  return {
    production_grade: false,
    last_refined: lastRefinedISO,
    trigger_phrases: [],
    has_output_example: false,
    body_line_count: 0,
    scenario_tests: { happy: null, edge: null, stress: null },
    vague_language_violations: [],
    last_audited: null,
    invocation_count_30d: null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ────────────────────────────────────────────────────────────────────────────

export const ScenarioVerdictZ = z.union([z.literal("pass"), z.literal("fail"), z.null()]);

export const ScenarioTestsZ = z.object({
  happy: ScenarioVerdictZ,
  edge: ScenarioVerdictZ,
  stress: ScenarioVerdictZ,
});

export const SkillQualityFieldsZ = z.object({
  production_grade: z.boolean(),
  last_refined: z.string(),
  trigger_phrases: z.array(z.string()),
  has_output_example: z.boolean(),
  body_line_count: z.number().int().nonnegative(),
  scenario_tests: ScenarioTestsZ,
  vague_language_violations: z.array(z.string()),
  last_audited: z.string().nullable(),
  invocation_count_30d: z.number().int().nonnegative().nullable(),
});

export const SkillQualityRecordZ = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  tier: z.union([z.literal("enterprise"), z.literal("user"), z.literal("project"), z.literal("plugin")]),
  plugin: z.string().optional(),
  description: z.string(),
  description_over_limit: z.boolean(),
  skill_type: z.union([z.literal("rigid"), z.literal("flexible"), z.literal("methodology"), z.literal("reference")]).optional(),
  disable_model_invocation: z.boolean(),
  user_invocable: z.boolean(),
  shadowed_by: z.string().optional(),
  shadows: z.array(z.string()).optional(),
  _parse_error: z.string().optional(),
  quality: SkillQualityFieldsZ,
});

export const SkillQualityRegistryZ = z.object({
  schemaVersion: z.string(),
  generatedAt: z.string(),
  total: z.number().int().nonnegative(),
  byTier: z.record(z.string(), z.number()),
  parseFailures: z.number().int().nonnegative(),
  skills: z.array(SkillQualityRecordZ),
});

export type SkillQualityRegistry = z.infer<typeof SkillQualityRegistryZ>;

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (shared by U-SKU01 gate, U-SKU03 linter, U-SKU06 builder)
// ────────────────────────────────────────────────────────────────────────────

/** Vague-verb regex set — @eng_khairallah1 Phase-2: "vague language is banned".
 *  Matched only OUTSIDE fenced code blocks and quoted strings (see {@link detectVagueLanguageViolations}). */
export const VAGUE_LANGUAGE_PATTERNS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: "format-nicely", re: /\bformat(?:s|ted|ting)?\s+(?:it\s+)?nicely\b/i },
  { id: "handle-appropriately", re: /\bhandle(?:s|d)?\s+(?:it\s+|them\s+|this\s+)?appropriately\b/i },
  { id: "as-needed", re: /\bas\s+needed\b/i },
  { id: "appropriately", re: /\bappropriately\b/i },
  { id: "properly-handle", re: /\bproperly\s+handle(?:s|d)?\b/i },
  { id: "deal-with", re: /\bdeal\s+with\s+(?:it|them|this|the\s+\w+)\b/i },
  { id: "make-it-nice", re: /\bmake\s+it\s+(?:nice|pretty|clean|good)\b/i },
  { id: "clean-it-up", re: /\bclean\s+(?:it|them|this)\s+up\b/i },
  { id: "etc", re: /\betc\.?(?:\s|$)/i },
  { id: "and-so-on", re: /\band\s+so\s+on\b/i },
  { id: "various", re: /\bvarious\b/i },
];

/** Placeholder / stub-language patterns — flags skills that were never finished
 *  (R4 in U-SKU03). Matched only outside fenced code blocks. */
export const PLACEHOLDER_PATTERNS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: "todo", re: /\bTODO\b/ },
  { id: "tbd", re: /\bTBD\b/ },
  { id: "fixme", re: /\bFIXME\b/ },
  { id: "insert-here", re: /<\s*insert\b/i },
  { id: "your-placeholder", re: /\[\s*your\s+\w+/i },
  { id: "stub", re: /\bstub\b/i },
  { id: "placeholder", re: /\bplaceholder\b/i },
];

/** Split a markdown body into segments tagged "code" (inside ```​ fences) or "text". */
function segmentByFence(body: string): Array<{ kind: "code" | "text"; text: string }> {
  const segments: Array<{ kind: "code" | "text"; text: string }> = [];
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let buf: string[] = [];
  const flush = (kind: "code" | "text") => {
    if (buf.length) segments.push({ kind, text: buf.join("\n") });
    buf = [];
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      // The fence line itself belongs to neither — flush current, toggle.
      flush(inFence ? "code" : "text");
      inFence = !inFence;
      continue;
    }
    buf.push(line);
  }
  flush(inFence ? "code" : "text");
  return segments;
}

/** Strip inline-code spans (`…`) and quoted strings ("…" / '…') from a line so the
 *  vague-language scan doesn't false-positive on a skill that *quotes* a banned phrase
 *  as an example (U-SKU03 adversarial case). */
function stripInlineCodeAndQuotes(line: string): string {
  return line
    .replace(/`[^`]*`/g, " ")
    .replace(/"[^"]*"/g, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/“[^”]*”/g, " ");
}

/**
 * Find banned vague-language phrases in the *instruction* portion of a skill body.
 * Skips fenced code blocks and inline-code/quoted spans. Returns the matched phrase ids.
 */
export function detectVagueLanguageViolations(body: string): string[] {
  if (!body) return [];
  const found = new Set<string>();
  for (const seg of segmentByFence(body)) {
    if (seg.kind === "code") continue;
    for (const rawLine of seg.text.split(/\r?\n/)) {
      const line = stripInlineCodeAndQuotes(rawLine);
      for (const { id, re } of VAGUE_LANGUAGE_PATTERNS) {
        if (re.test(line)) found.add(id);
      }
    }
  }
  return [...found].sort();
}

/** Find placeholder/stub markers in the instruction portion of a skill body. */
export function detectPlaceholderViolations(body: string): string[] {
  if (!body) return [];
  const found = new Set<string>();
  for (const seg of segmentByFence(body)) {
    if (seg.kind === "code") continue;
    for (const { id, re } of PLACEHOLDER_PATTERNS) {
      if (re.test(seg.text)) found.add(id);
    }
  }
  return [...found].sort();
}

/** Count body lines that are NOT inside fenced code blocks — the figure the 500-line
 *  cap is checked against (U-SKU03 adversarial: a 200-line embedded example shouldn't
 *  push a small skill over the limit). Also reports the fenced-code line count separately. */
export function countBodyLines(body: string): { instructionLines: number; codeLines: number; totalLines: number } {
  if (!body) return { instructionLines: 0, codeLines: 0, totalLines: 0 };
  let instructionLines = 0;
  let codeLines = 0;
  const lines = body.split(/\r?\n/);
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      codeLines++; // the fence delimiter itself counts as code, not instruction
      continue;
    }
    if (inFence) codeLines++;
    else instructionLines++;
  }
  return { instructionLines, codeLines, totalLines: lines.length };
}

/**
 * Detect whether the body shows "what perfect output looks like" (@eng_khairallah1 Q3):
 * a fenced code block within ±3 lines of one of the words example / output / perfect / returns.
 * Also true when an HTML/markdown table appears near those words (some skills show output as a table).
 */
export function detectOutputExample(body: string): boolean {
  if (!body) return false;
  const lines = body.split(/\r?\n/);
  const anchorRe = /\b(example|output|perfect|returns?|result)\b/i;
  const fenceLines: number[] = [];
  const tableLines: number[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      if (!inFence) fenceLines.push(i);
      inFence = !inFence;
      continue;
    }
    // crude markdown-table row: starts with | and has another |
    if (!inFence && /^\s*\|.*\|/.test(lines[i])) tableLines.push(i);
  }
  const anchors: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (anchorRe.test(lines[i])) anchors.push(i);
  }
  if (!anchors.length) return false;
  const near = (xs: number[]) => xs.some((x) => anchors.some((a) => Math.abs(a - x) <= 3));
  return near(fenceLines) || near(tableLines);
}

/** Levenshtein-based stem similarity in [0,1] for trigger-phrase dedupe (U-SKU01 adversarial:
 *  "write email"/"write an email"/"write the email" should count as one). */
function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/\b(an?|the|my|your|this|that)\b/g, "").replace(/\s+/g, " ").trim();
  const s2 = b.toLowerCase().replace(/\b(an?|the|my|your|this|that)\b/g, "").replace(/\s+/g, " ").trim();
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;
  const m = s1.length;
  const n = s2.length;
  const dp: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = s1[i - 1] === s2[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  const dist = dp[n];
  return 1 - dist / Math.max(m, n);
}

/**
 * Extract distinct trigger phrases from a skill description (@eng_khairallah1 Q2:
 * "list ≥5 trigger phrases"). Heuristic, in priority order:
 *   1. quoted strings ("…" / '…') — authors often list trigger phrases as quotes
 *   2. "use when X" / "when X" / "triggers when X" clauses
 *   3. comma- or slash-separated short imperative phrases following "for"/"to"
 * Near-duplicates (stem similarity ≥ 0.8) are collapsed. Returns up to 24 phrases.
 */
export function extractTriggerPhrases(description: string): string[] {
  if (!description) return [];
  const candidates: string[] = [];

  // 1. quoted strings
  for (const m of description.matchAll(/["“']([^"”']{3,60})["”']/g)) {
    candidates.push(m[1].trim());
  }

  // 2. "use when …" / "when …" / "triggers? (?:when|on|for) …" up to the next clause boundary
  for (const m of description.matchAll(/\b(?:use\s+when|when|triggers?\s+(?:when|on|for|if)|fires?\s+(?:when|on))\s+([^.;\n,]{4,80})/gi)) {
    candidates.push(m[1].trim());
  }

  // 3. comma / slash separated action phrases after "for" or "to" or "—"
  for (const m of description.matchAll(/\b(?:for|to)\s+([a-z][^.;\n]{6,140})/gi)) {
    for (const part of m[1].split(/\s*[,/]\s*|\s+(?:and|or)\s+/i)) {
      const p = part.trim().replace(/[.;:]+$/, "");
      if (p.length >= 4 && p.length <= 60 && /^[a-z]/i.test(p)) candidates.push(p);
    }
  }

  // dedupe (exact + stem-similar)
  const out: string[] = [];
  for (const c of candidates) {
    const norm = c.replace(/\s+/g, " ").trim();
    if (!norm) continue;
    if (out.some((o) => stringSimilarity(o, norm) >= 0.8)) continue;
    out.push(norm);
    if (out.length >= 24) break;
  }
  return out;
}

/** Vague-verb set used by the 3Q gate's Q1 check (description must not BE one of these). */
export const VAGUE_DESCRIPTION_OPENERS: ReadonlyArray<RegExp> = [
  /^\s*(?:helps?\s+with|does|handles?|manages?|deals?\s+with)\s+(?:stuff|things|everything|various\s+\w+)\s*\.?\s*$/i,
  /^\s*(?:a\s+)?(?:tool|skill|helper|utility)\s+for\s+(?:stuff|things|various\s+\w+)\s*\.?\s*$/i,
];

/** Result of {@link parseSkillFile}. */
export interface ParsedSkillFile {
  /** Frontmatter key→value (only the keys we care about are guaranteed-typed elsewhere). */
  frontmatter: Record<string, unknown> | null;
  /** Body (everything after the closing `---`, or the whole file if no frontmatter). */
  body: string;
  /** Set when the `---`-delimited block existed but couldn't be parsed. */
  parseError?: string;
}

/**
 * Minimal, dependency-free frontmatter parser for SKILL.md / command .md files.
 * Handles: `key: scalar`, `key: |` block scalars, `key:` followed by `- item` lists,
 * `key: [a, b]` inline arrays, and quoted scalars. Anything fancier → `parseError` set,
 * `frontmatter: null`, body = whole file (so the row is still produced, not crashed).
 */
export function parseSkillFile(content: string): ParsedSkillFile {
  if (!content) return { frontmatter: null, body: "" };
  const fmMatch = content.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    // A skill that *opens* with `---` but never closes the block is malformed
    // frontmatter (distinct from a legacy flat command that has no frontmatter at
    // all). Surface it so the registry can flag the row; still return the whole
    // file as body so the row is produced, not crashed.
    if (/^﻿?---\r?\n/.test(content)) {
      return { frontmatter: null, body: content, parseError: "frontmatter block opened with '---' but never closed" };
    }
    return { frontmatter: null, body: content };
  }
  const block = fmMatch[1];
  const body = fmMatch[2] ?? "";
  try {
    const fm: Record<string, unknown> = {};
    const lines = block.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || /^\s*#/.test(line)) { i++; continue; }
      const kv = line.match(/^([A-Za-z0-9_.\-]+)\s*:\s*(.*)$/);
      if (!kv) { i++; continue; }
      const key = kv[1];
      let rest = kv[2];
      if (rest === "|" || rest === "|-" || rest === ">" || rest === ">-") {
        // block scalar — collect subsequent indented lines
        const collected: string[] = [];
        i++;
        while (i < lines.length && (/^\s+/.test(lines[i]) || lines[i].trim() === "")) {
          collected.push(lines[i].replace(/^\s{1,4}/, ""));
          i++;
        }
        fm[key] = collected.join("\n").trim();
        continue;
      }
      if (rest === "") {
        // possibly a list: subsequent "- item" lines
        const items: string[] = [];
        let j = i + 1;
        while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
          items.push(lines[j].replace(/^\s*-\s+/, "").trim().replace(/^["']|["']$/g, ""));
          j++;
        }
        if (items.length) { fm[key] = items; i = j; continue; }
        fm[key] = "";
        i++;
        continue;
      }
      // inline array [a, b, c]
      const inlineArr = rest.match(/^\[(.*)\]$/);
      if (inlineArr) {
        fm[key] = inlineArr[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        i++;
        continue;
      }
      // strip wrapping quotes
      rest = rest.replace(/^["']|["']$/g, "");
      if (/^(true|false)$/i.test(rest)) fm[key] = /^true$/i.test(rest);
      else if (/^-?\d+(\.\d+)?$/.test(rest)) fm[key] = Number(rest);
      else fm[key] = rest;
      i++;
    }
    return { frontmatter: fm, body };
  } catch (e) {
    return { frontmatter: null, body: content, parseError: e instanceof Error ? e.message : String(e) };
  }
}

/** Coerce a frontmatter `skill_type` value to the SkillType union (or undefined). */
export function coerceSkillType(v: unknown): SkillType | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.toLowerCase().trim();
  if (s === "rigid" || s === "flexible" || s === "methodology" || s === "reference") return s;
  return undefined;
}
