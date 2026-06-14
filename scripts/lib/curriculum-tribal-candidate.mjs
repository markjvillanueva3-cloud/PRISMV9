/**
 * curriculum-tribal-candidate.mjs — pure functions that join curriculum
 * JSONL records to their source .txt extracts and emit tribal-tip
 * candidates ready for operator curation into a typed cited-tips file.
 *
 * The iter9 curriculum JSONL has 280-char previews; downstream curation
 * needs the FULL page text + signals + citation. This module reads a
 * curriculum record + the corresponding extract text and produces a
 * candidate-shaped object that mirrors the iter6 CitedPostTip interface.
 *
 * Pure functions only. Caller owns IO + filesystem layout.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-CURRICULUM-TRIBAL-CANDIDATES
 * @slot echo · @iter 11 · @date 2026-05-26
 */

/** Pure: extract one page's text from an extract by form-feed split. 1-based page index. */
export function extractPageText(extractText, pageNum) {
  if (extractText == null) return "";
  const pages = String(extractText).split("\f");
  const idx = Number.isInteger(pageNum) ? pageNum - 1 : -1;
  if (idx < 0 || idx >= pages.length) return "";
  return pages[idx];
}

/** Pure: collapse pdftotext-layout whitespace runs to single spaces; trim. */
export function cleanPageText(text) {
  if (text == null) return "";
  return String(text).replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Pure: deterministic 16-char hash id (FNV-1a 32-bit, base36). */
export function candidateId(seed) {
  let h = 0x811c9dc5;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `cur-${h.toString(36).padStart(7, "0")}`;
}

/** Pure: shape a candidate record from a curriculum JSONL record + the extract page text. */
export function buildCandidate(record, extractText) {
  const pageText = cleanPageText(extractPageText(extractText, record?.pageNum));
  const filename = String(record?.filename || "");
  const pageNum = Number.isInteger(record?.pageNum) ? record.pageNum : 0;
  const id = candidateId(`${filename}|${pageNum}`);
  const citation = `${filename} p${pageNum}`;
  const sourceTitle = filename.replace(/\.pdf$/i, "");
  return {
    id,
    sourceId: filename,
    sourceTitle,
    citation,
    page: pageNum,
    domain: record?.domain || "reference",
    controller: record?.controller || null,
    vendor: record?.vendor || null,
    difficulty: record?.difficulty || "unscored",
    score: typeof record?.score === "number" ? record.score : 0,
    signals: record?.signals || null,
    body: pageText,
    bodyLength: pageText.length,
  };
}

/** Pure: filter curriculum records to advanced + complex only. */
export function selectHighSignalRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.filter((r) => r && (r.difficulty === "advanced" || r.difficulty === "complex"));
}

/** Pure: deduplicate candidates by id (latest wins). */
export function deduplicateCandidates(candidates) {
  const out = new Map();
  for (const c of candidates || []) {
    if (c && c.id) out.set(c.id, c);
  }
  return Array.from(out.values());
}

/** Pure: group candidates by domain for stats / per-domain emission. */
export function groupCandidatesByDomain(candidates) {
  const out = new Map();
  for (const c of candidates || []) {
    const d = c?.domain || "reference";
    if (!out.has(d)) out.set(d, []);
    out.get(d).push(c);
  }
  return out;
}
