/**
 * CaptureSharpenEngine
 * ====================
 *
 * OBSIDIAN-CONTENT-MS2/U-CAPTURE-SHARPEN
 *
 * Takes a raw inbox capture (a voice-memo transcript, a mid-day observation,
 * a pasted snippet) and assesses whether it meets the cyrilXBT JARVIS
 * sharpened-note bar:
 *
 *   "If the sharpened note still needs explanation, it is not sharp enough.
 *    A good sharpened note reads like a headline, not a sentence from a
 *    paragraph."
 *
 * The engine does NOT rewrite the capture (LLMs do that downstream). It
 * scores the capture across measurable dimensions and either accepts (the
 * capture stands alone) or rejects (the capture still needs explanation).
 * It also classifies the capture into one of the 5 cyrilXBT subfolders:
 *
 *   observations / reactions / patterns / questions / numbers
 *
 * and proposes 3 tags (content_pillar / note_type / topical) per the
 * article's process-inbox skill contract.
 *
 * Score components (each in [0, 1]):
 *
 *   length_fit   — sentence length within healthline range
 *   structure    — single sentence, terminated, declarative
 *   specificity  — contains a digit, source-tag, or named entity
 *   independence — minimal anaphora ("this", "that", "it") referring outside
 *
 * Total score = mean of components. Threshold = 0.7 to accept.
 *
 * @milestone OBSIDIAN-CONTENT-MS2/U-CAPTURE-SHARPEN
 */

export type CaptureType = "observations" | "reactions" | "patterns" | "questions" | "numbers";

export interface SharpenAssessment {
  passed: boolean;
  score: number;            // 0..1 weighted mean of components
  components: {
    lengthFit: number;
    structure: number;
    specificity: number;
    independence: number;
  };
  classifiedAs: CaptureType;
  proposedTags: [string, string, string]; // [pillar, note_type, topical]
  flags: Array<{ kind: string; reason: string }>;
  /** Always one of the cyrilXBT subfolders. */
  targetSubfolder: CaptureType;
  /** Original input echoed back for symmetry. */
  raw: string;
}

export interface SharpenOptions {
  /** Override classification keyword maps for tests. */
  keywordOverrides?: Partial<Record<CaptureType, string[]>>;
  /** Acceptance threshold (default 0.7). */
  threshold?: number;
  /** Optional content_pillar to override classification. */
  contentPillarHint?: string;
}

const DEFAULT_THRESHOLD = 0.7;

const MIN_HEADLINE_CHARS = 20;
const IDEAL_HEADLINE_LO = 60;
const IDEAL_HEADLINE_HI = 200;
const MAX_HEADLINE_CHARS = 280;

const ANAPHORA_BARE = new Set([
  "this", "that", "it", "these", "those", "they", "them",
]);

const KEYWORD_MAP: Record<CaptureType, string[]> = {
  numbers: ["%", "$", "ratio", "rate", "count", "impressions", "bookmarks", "engagement", "score"],
  questions: ["?", "why", "how", "what if", "would", "could"],
  patterns: ["pattern", "across", "both", "always", "every time", "tends to", "principle"],
  reactions: ["love", "hate", "annoying", "surprising", "wrong", "weird", "interesting", "agree", "disagree"],
  observations: [],  // default fallback
};

// ─────────────────────────────────────────────────────────────────────────────
// Component scorers
// ─────────────────────────────────────────────────────────────────────────────

function scoreLengthFit(raw: string): number {
  const len = raw.trim().length;
  if (len < MIN_HEADLINE_CHARS) return 0;
  if (len > MAX_HEADLINE_CHARS) return 0;
  if (len >= IDEAL_HEADLINE_LO && len <= IDEAL_HEADLINE_HI) return 1;
  // Linear ramp at the edges.
  if (len < IDEAL_HEADLINE_LO) {
    return (len - MIN_HEADLINE_CHARS) / (IDEAL_HEADLINE_LO - MIN_HEADLINE_CHARS);
  }
  return (MAX_HEADLINE_CHARS - len) / (MAX_HEADLINE_CHARS - IDEAL_HEADLINE_HI);
}

function scoreStructure(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  // Score 1 if exactly one terminal punctuation, declarative or question.
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return 0;
  if (sentences.length > 2) return 0;
  // Ends with terminal punctuation?
  const endsWell = /[.!?]\s*$/.test(trimmed);
  // Has compound clause separators (semicolons, " — ", " - ")?
  const hasCompound = /;|\s—\s|\s-\s/.test(trimmed);
  let score = 0;
  if (endsWell) score += 0.6;
  if (sentences.length === 1) score += 0.4;
  else score += 0.15; // 2 sentences is acceptable but worse
  // Compound separators are a hard demerit — ceiling the score at 0.4 so
  // semicolon-laden captures always flag the structure rule.
  if (hasCompound) score = Math.min(score, 0.4);
  return Math.max(0, Math.min(1, score));
}

function scoreSpecificity(raw: string): number {
  let score = 0;
  if (/\d/.test(raw)) score += 0.5;
  if (/\[\[[^\]]+\]\]|`[^`]+`|"[^"]+"|\([^)]+ \d{4}\)/.test(raw)) score += 0.4;
  // Named-entity proxy: capitalized word not at start of sentence.
  if (/[a-z]\s+[A-Z][a-zA-Z]+/.test(raw)) score += 0.3;
  return Math.min(1, score);
}

function scoreIndependence(raw: string): number {
  // Penalize bare anaphora that have no antecedent within the capture itself.
  const tokens = raw.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  let bareAnaphoraCount = 0;
  for (const t of tokens) if (ANAPHORA_BARE.has(t)) bareAnaphoraCount++;
  // Light penalty: each bare anaphora costs 0.2 from baseline 1.
  const score = Math.max(0, 1 - bareAnaphoraCount * 0.2);
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification + tagging
// ─────────────────────────────────────────────────────────────────────────────

function classify(raw: string, overrides?: Partial<Record<CaptureType, string[]>>): CaptureType {
  const lower = raw.toLowerCase();
  const map: Record<CaptureType, string[]> = {
    observations: overrides?.observations ?? KEYWORD_MAP.observations,
    reactions: overrides?.reactions ?? KEYWORD_MAP.reactions,
    patterns: overrides?.patterns ?? KEYWORD_MAP.patterns,
    questions: overrides?.questions ?? KEYWORD_MAP.questions,
    numbers: overrides?.numbers ?? KEYWORD_MAP.numbers,
  };
  // Order matters: numbers > questions > patterns > reactions > observations.
  for (const k of map.numbers) {
    if (k && lower.includes(k)) return "numbers";
  }
  if (/\d+\s*[%kKmM]?\b/.test(raw)) return "numbers";
  if (lower.endsWith("?") || /\b(why|how|what if|would|could)\b/.test(lower)) return "questions";
  for (const k of map.patterns) {
    if (k && lower.includes(k)) return "patterns";
  }
  for (const k of map.reactions) {
    if (k && lower.includes(k)) return "reactions";
  }
  return "observations";
}

function proposeTags(raw: string, captureType: CaptureType, contentPillarHint?: string): [string, string, string] {
  // Tag 1: content_pillar (caller-supplied, else "uncategorized")
  const pillar = (contentPillarHint ?? "uncategorized").toLowerCase().replace(/\s+/g, "-");
  // Tag 2: note_type (capture type itself)
  const noteType = captureType;
  // Tag 3: topical — pull the longest non-stopword token, lowercase.
  const STOP = new Set(["this", "that", "with", "into", "from", "have", "their", "there", "would", "could", "should", "about", "after", "before"]);
  const tokens = raw.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean).filter((t) => t.length >= 4 && !STOP.has(t));
  let topical = "general";
  if (tokens.length > 0) {
    tokens.sort((a, b) => b.length - a.length);
    topical = tokens[0];
  }
  return [pillar, noteType, topical];
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class CaptureSharpenEngine {
  readonly name = "CaptureSharpenEngine";

  /**
   * Assess a raw capture against the cyrilXBT JARVIS sharpened-note bar.
   * Does NOT rewrite — the LLM does that. Returns a score + classification
   * + tag proposal + accept/reject verdict.
   *
   * @param raw   The capture text (single string, may have multiple sentences).
   * @param opts  Threshold + classification overrides + pillar hint.
   */
  assess(raw: string, opts: SharpenOptions = {}): SharpenAssessment {
    const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
    const trimmed = raw.trim();

    const components = {
      lengthFit: scoreLengthFit(trimmed),
      structure: scoreStructure(trimmed),
      specificity: scoreSpecificity(trimmed),
      independence: scoreIndependence(trimmed),
    };
    const score = (components.lengthFit + components.structure + components.specificity + components.independence) / 4;
    const passed = score >= threshold;

    const flags: Array<{ kind: string; reason: string }> = [];
    if (components.lengthFit < 0.5) {
      const len = trimmed.length;
      if (len < MIN_HEADLINE_CHARS) flags.push({ kind: "too_short", reason: `${len} chars < ${MIN_HEADLINE_CHARS} (capture is too thin to stand alone)` });
      else if (len > MAX_HEADLINE_CHARS) flags.push({ kind: "too_long", reason: `${len} chars > ${MAX_HEADLINE_CHARS} (sharpen — a headline is not a paragraph)` });
      else flags.push({ kind: "length_off_target", reason: `${len} chars outside ideal ${IDEAL_HEADLINE_LO}-${IDEAL_HEADLINE_HI}` });
    }
    if (components.structure < 0.5) {
      flags.push({ kind: "structure", reason: "compound or unterminated — split into one declarative sentence" });
    }
    if (components.specificity < 0.5) {
      flags.push({ kind: "specificity", reason: "no number, source tag, or named entity (article rule: real numbers beat vague claims)" });
    }
    if (components.independence < 0.5) {
      flags.push({ kind: "anaphora", reason: "bare 'this/that/it' references — sharpened note must stand alone without context" });
    }

    const captureType = classify(trimmed, opts.keywordOverrides);
    const proposedTags = proposeTags(trimmed, captureType, opts.contentPillarHint);

    return {
      passed,
      score,
      components,
      classifiedAs: captureType,
      proposedTags,
      flags,
      targetSubfolder: captureType,
      raw,
    };
  }
}

export const captureSharpenEngine = new CaptureSharpenEngine();
