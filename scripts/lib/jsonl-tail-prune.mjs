// scripts/lib/jsonl-tail-prune.mjs
// --------------------------------
// PSN-LEDGER-HYGIENE/U-LEDGER-PRUNE (2026-05-24, slot:alpha)
//
// Bounded-growth hygiene for the JSONL ledgers PRISM writes (rtk-savings,
// prompt-rewrites, route-suggest, etc.). When a ledger crosses the SIZE_CAP
// threshold, drop the head and retain the tail.
//
// Pure-function tail-trimmer. Caller owns the file I/O (so the lib stays
// unit-testable without FS dependency). Returns the trimmed bytes + a meta
// summary the caller can log/emit.

export const DEFAULT_SIZE_CAP_BYTES = 5 * 1024 * 1024; // 5 MB ceiling
export const DEFAULT_RETAIN_BYTES = 1 * 1024 * 1024;   // keep last 1 MB

/**
 * Pure: given the current ledger contents (as a single string), decide
 * whether to prune and return {pruned: bool, newText, droppedBytes, droppedLines, retainedBytes, retainedLines}.
 *
 * When sizeCap exceeded, finds the FIRST newline at-or-after the cut-point
 * (so we never split a JSON line mid-record) and returns everything after it.
 */
export function pruneTail(text, sizeCapBytes = DEFAULT_SIZE_CAP_BYTES, retainBytes = DEFAULT_RETAIN_BYTES) {
  if (typeof text !== "string") {
    return { pruned: false, newText: "", droppedBytes: 0, droppedLines: 0, retainedBytes: 0, retainedLines: 0, reason: "non-string-input" };
  }
  const len = text.length;
  if (len <= sizeCapBytes) {
    return { pruned: false, newText: text, droppedBytes: 0, droppedLines: 0, retainedBytes: len, retainedLines: countLines(text), reason: "under-cap" };
  }
  // Cut-point: keep the trailing retainBytes
  const cutAt = Math.max(0, len - retainBytes);
  // Find next newline at-or-after cutAt to align on record boundary
  const nlAt = text.indexOf("\n", cutAt);
  if (nlAt === -1) {
    // No newline after cut — pathological (one giant line). Return as-is to avoid corrupting.
    return { pruned: false, newText: text, droppedBytes: 0, droppedLines: 0, retainedBytes: len, retainedLines: countLines(text), reason: "no-newline-after-cut" };
  }
  const newText = text.slice(nlAt + 1);
  return {
    pruned: true,
    newText,
    droppedBytes: nlAt + 1,
    droppedLines: countLines(text.slice(0, nlAt + 1)),
    retainedBytes: newText.length,
    retainedLines: countLines(newText),
    reason: `over-cap (${len}B > ${sizeCapBytes}B); retained last ${newText.length}B`,
  };
}

function countLines(s) {
  if (!s) return 0;
  let count = 0;
  for (const c of s) if (c === "\n") count += 1;
  // Trailing line without newline still counts as a record
  if (s.length > 0 && !s.endsWith("\n")) count += 1;
  return count;
}
