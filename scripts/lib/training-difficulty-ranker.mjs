/**
 * training-difficulty-ranker.mjs — page-by-page training curriculum ranker
 * for echo's domain (CAM/post/mill/wire) extracts.
 *
 * Operator directive 2026-05-26 (iter9): "extract page by page of notable
 * data that will train the system from the easiest input to complex work".
 *
 * Pure functions only. Splits a pdftotext-layout extract into pages
 * (form-feed delimited), scores each page on six difficulty signals, and
 * ranks the global corpus easy→complex for system training.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM
 * @slot echo
 * @iter 9
 * @date 2026-05-26
 */

/** Pure: split a pdftotext-layout extract into pages by form-feed (`\f`). */
export function splitPages(text) {
  if (text == null) return [];
  const raw = String(text);
  if (raw.length === 0) return [];
  return raw.split("\f");
}

/** Pure: count regex matches without allocating an array of strings. */
function countMatches(s, re) {
  const m = s.match(re);
  return m ? m.length : 0;
}

/** Pure: extract difficulty signals from a single page's text. */
export function extractSignals(pageText) {
  const s = String(pageText || "");
  const len = s.length;
  const words = s.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lineCount = s.split(/\r?\n/).length;

  const gCodes = countMatches(s, /\bG\d{1,3}\b/g);
  const mCodes = countMatches(s, /\bM\d{1,3}\b/g);
  const numericRefs = countMatches(s, /\b\d+\.\d+\b/g);
  const unitRefs = countMatches(s, /\b\d+(?:\.\d+)?\s*(?:mm|in|inch|ipm|rpm|sfm|fpm|deg|°)\b/gi);
  const fiveAxisRefs = countMatches(s, /\b(5-axis|five[- ]axis|multiaxis|multi-axis|swarf|trochoidal|barrel\s+tool|hsm|adaptive)\b/gi);
  const macroRefs = countMatches(s, /(?:\b(?:macro|subprogram|sub-program|parametric|custom\s+macro|variable\s+assignment|GOTO)\b)|(?:\b(?:IF|WHILE)\s*\[)/gi);
  const advancedTerms = countMatches(s, /\b(post\s+customization|kinematics|inverse\s+kinematics|cycle\s+time\s+optimization|toolpath\s+linking|smoothing|look-?ahead|backlash\s+comp|thermal\s+comp)\b/gi);
  const easyTerms = countMatches(s, /\b(introduction|overview|tutorial|getting\s+started|lesson\s+\d+|chapter\s+\d+|basics|setup|hello|welcome|prerequisites|fundamentals|shop\s+safety|getting\s+to\s+know|warning|caution|notice)\b/gi);

  return {
    len, wordCount, lineCount,
    gCodes, mCodes, numericRefs, unitRefs,
    fiveAxisRefs, macroRefs, advancedTerms, easyTerms,
  };
}

/** Pure: score a page on a 0-10 difficulty scale from signals. */
export function scorePage(pageText, opts = {}) {
  const sig = extractSignals(pageText);
  const pageNum = Number.isInteger(opts.pageNum) ? opts.pageNum : 0;
  const totalPages = Number.isInteger(opts.totalPages) && opts.totalPages > 0 ? opts.totalPages : 1;

  if (sig.wordCount < 20) {
    return { score: 0, difficulty: "noise", signals: sig, reason: "below-min-words" };
  }
  if (sig.easyTerms >= 2 && sig.gCodes === 0 && sig.macroRefs === 0) {
    return { score: 1, difficulty: "easy", signals: sig, reason: "easy-terms-dominant" };
  }

  const per100 = (n) => (sig.wordCount > 0 ? (n * 100) / sig.wordCount : 0);
  let raw = 0;
  raw += Math.min(per100(sig.gCodes) * 0.5, 2.0);
  raw += Math.min(per100(sig.mCodes) * 0.3, 1.0);
  raw += Math.min(per100(sig.unitRefs) * 0.2, 1.0);
  raw += Math.min(per100(sig.fiveAxisRefs) * 1.2, 2.5);
  raw += Math.min(per100(sig.macroRefs) * 1.5, 2.5);
  raw += Math.min(per100(sig.advancedTerms) * 1.5, 2.0);
  raw -= Math.min(per100(sig.easyTerms) * 0.5, 1.0);
  if (totalPages > 1) {
    const pos = pageNum / totalPages;
    raw += pos * 0.5;
  }

  const score = Math.max(0, Math.min(10, raw));
  let difficulty;
  if (score < 0.5) difficulty = "unscored";
  else if (score < 1.5) difficulty = "easy";
  else if (score < 3.5) difficulty = "intermediate";
  else if (score < 6.0) difficulty = "advanced";
  else difficulty = "complex";

  return { score: Number(score.toFixed(3)), difficulty, signals: sig, reason: "weighted-signals" };
}

/** Pure: rank pages of a single source easy→complex. Excludes "noise" pages. */
export function rankPagesEasyToComplex(text, opts = {}) {
  const pages = splitPages(text);
  const totalPages = pages.length;
  const filename = opts.filename || "unknown.pdf";
  const ranked = [];
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const scored = scorePage(pages[i], { pageNum, totalPages });
    if (scored.difficulty === "noise") continue;
    ranked.push({
      filename, pageNum, totalPages,
      difficulty: scored.difficulty,
      score: scored.score,
      signals: scored.signals,
      preview: pages[i].trim().slice(0, opts.previewChars || 240).replace(/\s+/g, " "),
    });
  }
  ranked.sort((a, b) => a.score - b.score || a.pageNum - b.pageNum);
  return ranked;
}

/** Pure: merge ranked pages from multiple sources into one easy→complex curriculum. */
export function mergeCurricula(rankedArrays) {
  const all = [];
  for (const arr of rankedArrays || []) {
    if (!Array.isArray(arr)) continue;
    for (const r of arr) all.push(r);
  }
  all.sort((a, b) => a.score - b.score || a.filename.localeCompare(b.filename) || a.pageNum - b.pageNum);
  return all;
}

/** Pure: distribution counts by difficulty bucket. */
export function difficultyDistribution(ranked) {
  const out = { unscored: 0, easy: 0, intermediate: 0, advanced: 0, complex: 0 };
  for (const r of ranked || []) {
    if (out[r.difficulty] !== undefined) out[r.difficulty]++;
  }
  return out;
}
