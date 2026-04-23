/**
 * CopyPasteDetectorEngine — U-FORE-14 (New-Coder Safety Net)
 * ===========================================================
 *
 * Heuristically scores whether a block of code about to be written
 * looks copy-pasted from elsewhere (LLM, Stack Overflow, a sibling
 * project) without adaptation. Surfaces risk signals BEFORE the code
 * lands in the repo.
 */

export interface CopyPasteInput {
  code: string;
  filePath?: string;
  repoImportStyle?: "esm" | "cjs" | "mixed";
}

export interface CopyPasteVerdict {
  suspicious: boolean;
  score: number;
  indicators: string[];
  recommendation: "accept" | "review" | "reject";
  summary: string;
}

const PLACEHOLDER_TOKENS = [
  /\bfoo\b/,
  /\bbar\b/,
  /\bbaz\b/,
  /\bexampleValue\b/,
  /\bTODO_?NAME\b/,
  /\bYOUR_[A-Z_]+\b/,
];
const TEMPLATE_TOKENS = /(\{\{[^}]+\}\}|<placeholder>|<INSERT [^>]+>)/;
const LLM_HEADER = /\/\*\*?[\s\S]{300,}?\*\//m;
const DEBUG_LOG_PATTERN = new RegExp("console\\." + "log\\(\\s*['\"]DEBUG");
const HIGH_COMMENT_DENSITY = 0.35;
const MIN_LINES_FOR_SEMICOLON_CHECK = 5;
const SEMICOLON_LOW_RATIO = 0.2;
const SEMICOLON_HIGH_RATIO = 0.98;
const REVIEW_THRESHOLD = 0.3;
const REJECT_THRESHOLD = 0.6;

function commentDensity(code: string): number {
  const lines = code.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return 0;
  let commentLines = 0;
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlock) {
      commentLines++;
      if (trimmed.includes("*/")) inBlock = false;
      continue;
    }
    if (trimmed.startsWith("//")) {
      commentLines++;
    } else if (trimmed.startsWith("/*")) {
      commentLines++;
      if (!trimmed.includes("*/")) inBlock = true;
    } else if (trimmed.startsWith("*") && !trimmed.startsWith("*/")) {
      commentLines++;
    }
  }
  return commentLines / lines.length;
}

function mixedImportStyle(code: string): boolean {
  const hasEsm = /^\s*import\s+[^;]+from\s+['"]/m.test(code);
  const hasCjs = /\brequire\(['"][^'"]+['"]\)/.test(code);
  return hasEsm && hasCjs;
}

function semicolonStyleMismatch(code: string): boolean {
  const lines = code.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < MIN_LINES_FOR_SEMICOLON_CHECK) return false;
  const terminating = lines.filter((line) => /[;{}]\s*(?:\/\/.*)?$/.test(line.trim())).length;
  const ratio = terminating / lines.length;
  return ratio < SEMICOLON_LOW_RATIO || ratio > SEMICOLON_HIGH_RATIO;
}

export class CopyPasteDetectorEngine {
  readonly name = "CopyPasteDetectorEngine";

  detect(input: CopyPasteInput): CopyPasteVerdict {
    if (!input || typeof input.code !== "string") {
      throw new Error("CopyPasteDetectorEngine.detect: code required");
    }
    const code = input.code;
    const indicators: string[] = [];
    let score = 0;

    if (LLM_HEADER.test(code)) {
      indicators.push("verbose_llm_header");
      score += 0.15;
    }
    if (mixedImportStyle(code)) {
      indicators.push("mixed_import_styles");
      score += 0.25;
    }
    if (PLACEHOLDER_TOKENS.some((re) => re.test(code))) {
      indicators.push("placeholder_identifier");
      score += 0.2;
    }
    if (TEMPLATE_TOKENS.test(code)) {
      indicators.push("template_tokens_present");
      score += 0.35;
    }
    const density = commentDensity(code);
    if (density > HIGH_COMMENT_DENSITY) {
      indicators.push(`high_comment_density:${density.toFixed(2)}`);
      score += 0.15;
    }
    if (DEBUG_LOG_PATTERN.test(code)) {
      indicators.push("debug_logs_present");
      score += 0.1;
    }
    if (semicolonStyleMismatch(code)) {
      indicators.push("semicolon_style_mismatch");
      score += 0.1;
    }
    if (input.repoImportStyle === "esm" && /\brequire\(['"]/.test(code)) {
      indicators.push("cjs_in_esm_repo");
      score += 0.15;
    }

    score = Math.min(1, score);

    const recommendation: CopyPasteVerdict["recommendation"] =
      score >= REJECT_THRESHOLD ? "reject" : score >= REVIEW_THRESHOLD ? "review" : "accept";
    const summary =
      recommendation === "reject"
        ? `High risk (${indicators.length} indicators). Rewrite before committing.`
        : recommendation === "review"
          ? `Some risk (${indicators.length} indicators). Read carefully.`
          : "Looks adapted for this repo.";

    return { suspicious: score >= REVIEW_THRESHOLD, score, indicators, recommendation, summary };
  }
}

export const copyPasteDetectorEngine = new CopyPasteDetectorEngine();
