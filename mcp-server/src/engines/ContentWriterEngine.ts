/**
 * ContentWriterEngine
 * ===================
 *
 * OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC
 *
 * Voice-rule validator for content drafts. The engine itself does NOT write
 * prose — that's the role of an LLM round-trip downstream. This engine is
 * the deterministic gate the article describes:
 *
 *   "Read the draft against the voice section of CLAUDE.md. Flag any
 *    sentence that sounds like it came from a generic AI writing tool.
 *    Rewrite flagged sentences before delivering."
 *
 * Loads `knowledge/voice-spec.md` (or override path) — frontmatter contains
 * the machine-checkable rules:
 *
 *   ban_words: [...]                # exact-match (case-insensitive) flags
 *   ban_punctuation: [";"]          # any occurrence flags
 *   max_sentence_length_chars: 200  # per-sentence character cap
 *   require_specific_number: true   # whole-draft must contain >=1 digit
 *   min_screenshot_line: true       # at least one line should be quotable
 *
 * Output is a list of violations with line/column refs the writer can act on.
 * No mutation — the human (or LLM) does the rewriting; this engine only flags.
 *
 * @milestone OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface VoiceRules {
  banWords: string[];
  banPunctuation: string[];
  maxSentenceLengthChars: number;
  requireSpecificNumber: boolean;
  minScreenshotLine: boolean;
  requireCloserFirst: boolean;
}

export type ViolationSeverity = "error" | "warn" | "info";

export interface VoiceViolation {
  rule: string;
  severity: ViolationSeverity;
  /** 1-indexed line number of the offending sentence/line. */
  line: number;
  /** Verbatim sentence/line snippet (truncated to 200 chars). */
  snippet: string;
  /** Why this triggered. */
  reason: string;
}

export interface ValidateOptions {
  /** Override voice-spec.md location. */
  voiceSpecPath?: string;
  /** Override the loaded rules entirely (test injection). */
  rulesOverride?: VoiceRules;
}

export interface ValidateResult {
  /** True iff zero error-severity violations. */
  passed: boolean;
  rules: VoiceRules;
  violations: VoiceViolation[];
  /** Sentence count + total chars + flagged count. */
  stats: { sentences: number; totalChars: number; flaggedCount: number };
}

const DEFAULT_VOICE_SPEC = "H:/prism/knowledge/voice-spec.md";
const SNIPPET_TRUNC = 200;

const BUILTIN_DEFAULTS: VoiceRules = {
  banWords: [
    "leverage", "utilize", "delve", "delve into", "navigate", "unlock",
    "robust", "seamless", "elevate", "transformative",
    "in conclusion", "it is worth noting", "worth noting",
    "tapestry", "myriad", "plethora", "synergy",
  ],
  banPunctuation: [";"],
  maxSentenceLengthChars: 200,
  requireSpecificNumber: true,
  minScreenshotLine: true,
  requireCloserFirst: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice-spec parsing (minimal YAML — no external dep)
// ─────────────────────────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): Record<string, unknown> | null {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = raw.slice(4, end).replace(/^\n/, "");
  const out: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;
  let currentArray: string[] | null = null;
  for (const lineRaw of fm.split(/\r?\n/)) {
    const line = lineRaw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const arrItem = line.match(/^\s*-\s*(.*)$/);
    if (arrItem && currentArrayKey) {
      let v = arrItem[1].trim();
      if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      currentArray!.push(v);
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) {
      currentArrayKey = null;
      currentArray = null;
      const [, key, valRaw] = kv;
      const val = valRaw.trim();
      if (val === "" || val === "[]") {
        // Possibly start of an array on following lines.
        currentArrayKey = key;
        currentArray = [];
        out[key] = currentArray;
      } else if (val === "true") {
        out[key] = true;
      } else if (val === "false") {
        out[key] = false;
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        out[key] = Number(val);
      } else if (val.startsWith("[") && val.endsWith("]")) {
        // inline array
        const inner = val.slice(1, -1).trim();
        if (!inner) out[key] = [];
        else {
          out[key] = inner.split(/\s*,\s*/).map((s) => {
            let t = s.trim();
            if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) {
              t = t.slice(1, -1);
            }
            return t;
          });
        }
      } else if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        out[key] = val.slice(1, -1);
      } else {
        out[key] = val;
      }
    }
  }
  return out;
}

function loadRules(filePath: string): VoiceRules {
  if (!existsSync(filePath)) return BUILTIN_DEFAULTS;
  let raw: string;
  try { raw = readFileSync(filePath, "utf8"); }
  catch { return BUILTIN_DEFAULTS; }
  const fm = parseFrontmatter(raw);
  if (!fm) return BUILTIN_DEFAULTS;
  return {
    banWords: Array.isArray(fm.ban_words) ? (fm.ban_words as string[]).map((s) => String(s).toLowerCase()) : BUILTIN_DEFAULTS.banWords,
    banPunctuation: Array.isArray(fm.ban_punctuation) ? (fm.ban_punctuation as string[]).map(String) : BUILTIN_DEFAULTS.banPunctuation,
    maxSentenceLengthChars: typeof fm.max_sentence_length_chars === "number" ? fm.max_sentence_length_chars : BUILTIN_DEFAULTS.maxSentenceLengthChars,
    requireSpecificNumber: typeof fm.require_specific_number === "boolean" ? fm.require_specific_number : BUILTIN_DEFAULTS.requireSpecificNumber,
    minScreenshotLine: typeof fm.min_screenshot_line === "boolean" ? fm.min_screenshot_line : BUILTIN_DEFAULTS.minScreenshotLine,
    requireCloserFirst: typeof fm.require_closer_first === "boolean" ? fm.require_closer_first : BUILTIN_DEFAULTS.requireCloserFirst,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sentence splitting (heuristic, no external dep)
// ─────────────────────────────────────────────────────────────────────────────

function splitSentences(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  // Split on terminal punctuation followed by whitespace or end.
  const parts = trimmed.split(/(?<=[.!?])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function checkBanWords(draft: string, lines: string[], rules: VoiceRules): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  for (const word of rules.banWords) {
    if (!word) continue;
    // Phrase-aware regex: word boundary on both sides, case-insensitive.
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (m && m.length > 0) {
        out.push({
          rule: "ban_words",
          severity: "error",
          line: i + 1,
          snippet: lines[i].slice(0, SNIPPET_TRUNC),
          reason: `banned phrase "${word}" detected (article rule: voice register)`,
        });
        break; // one violation per word per draft is enough signal
      }
    }
  }
  return out;
}

function checkBanPunctuation(lines: string[], rules: VoiceRules): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  for (const punct of rules.banPunctuation) {
    if (!punct) continue;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(punct)) {
        out.push({
          rule: "ban_punctuation",
          severity: "error",
          line: i + 1,
          snippet: lines[i].slice(0, SNIPPET_TRUNC),
          reason: `banned punctuation "${punct}" detected (article rule: hard stops, not semicolons)`,
        });
      }
    }
  }
  return out;
}

function checkSentenceLength(lines: string[], rules: VoiceRules): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const sentences = splitSentences(lines[i]);
    for (const s of sentences) {
      if (s.length > rules.maxSentenceLengthChars) {
        out.push({
          rule: "max_sentence_length_chars",
          severity: "warn",
          line: i + 1,
          snippet: s.slice(0, SNIPPET_TRUNC),
          reason: `sentence is ${s.length} chars (cap ${rules.maxSentenceLengthChars}) — split for one-idea-per-paragraph`,
        });
      }
    }
  }
  return out;
}

function checkSpecificNumber(draft: string, rules: VoiceRules): VoiceViolation[] {
  if (!rules.requireSpecificNumber) return [];
  if (/\d/.test(draft)) return [];
  return [{
    rule: "require_specific_number",
    severity: "error",
    line: 1,
    snippet: draft.slice(0, SNIPPET_TRUNC),
    reason: "no specific number anywhere in draft (article rule: real numbers beat vague claims)",
  }];
}

function checkScreenshotLine(lines: string[], rules: VoiceRules): VoiceViolation[] {
  if (!rules.minScreenshotLine) return [];
  // Heuristic: a "screenshot line" is a standalone sentence between 40 and
  // 180 chars that doesn't look like a heading or list item. If at least
  // one such line exists, we're fine.
  const candidates = lines.filter((l) => {
    const t = l.trim();
    if (!t) return false;
    if (t.startsWith("#") || t.startsWith("-") || t.startsWith("*")) return false;
    if (t.length < 40 || t.length > 180) return false;
    return /[.!?]\s*$/.test(t);
  });
  if (candidates.length > 0) return [];
  return [{
    rule: "min_screenshot_line",
    severity: "warn",
    line: 1,
    snippet: lines[0]?.slice(0, SNIPPET_TRUNC) ?? "",
    reason: "no screenshot-worthy line detected (article rule: every piece needs one line the reader will screenshot)",
  }];
}

export class ContentWriterEngine {
  readonly name = "ContentWriterEngine";

  /**
   * Validate a draft against the voice spec.
   *
   * @param draft  Full content draft (markdown or plain text).
   * @param opts   Voice-spec path or rules override.
   */
  validate(draft: string, opts: ValidateOptions = {}): ValidateResult {
    const rules = opts.rulesOverride ?? loadRules(resolve(opts.voiceSpecPath ?? DEFAULT_VOICE_SPEC));
    const lines = draft.split(/\r?\n/);
    const sentences = lines.flatMap(splitSentences);

    const violations: VoiceViolation[] = [
      ...checkBanWords(draft, lines, rules),
      ...checkBanPunctuation(lines, rules),
      ...checkSentenceLength(lines, rules),
      ...checkSpecificNumber(draft, rules),
      ...checkScreenshotLine(lines, rules),
    ];
    // Stable sort: by line then severity (error before warn before info).
    const sevOrder: Record<ViolationSeverity, number> = { error: 0, warn: 1, info: 2 };
    violations.sort((a, b) => (a.line - b.line) || (sevOrder[a.severity] - sevOrder[b.severity]) || a.rule.localeCompare(b.rule));

    const errorCount = violations.filter((v) => v.severity === "error").length;
    return {
      passed: errorCount === 0,
      rules,
      violations,
      stats: {
        sentences: sentences.length,
        totalChars: draft.length,
        flaggedCount: violations.length,
      },
    };
  }

  /** Read the loaded rules without validating any draft (test helper). */
  loadRules(opts: ValidateOptions = {}): VoiceRules {
    return opts.rulesOverride ?? loadRules(resolve(opts.voiceSpecPath ?? DEFAULT_VOICE_SPEC));
  }
}

export const contentWriterEngine = new ContentWriterEngine();
