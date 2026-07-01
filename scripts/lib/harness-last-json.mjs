/**
 * harness-last-json.mjs -- shared subprocess-stdout JSON extractor.
 *
 * Parses the LAST JSON object from a child process's stdout that may be
 * (a) a clean single-line object, (b) PRETTY-PRINTED across multiple lines,
 * or (c) preceded by arbitrary log lines. PRISM harnesses (Rung A/B) emit a
 * pretty summary JSON, so a naive "last line that starts with { and ends with }"
 * scan returns null on the multi-line case -- the real bug this lib fixes.
 *
 * Returns the parsed object, or null on any failure (caller decides fallback).
 * Used by scripts/lathe-closed-loop-full.mjs.
 */
export function lastJson(stdout) {
  if (!stdout) return null;
  const s = String(stdout).trim();
  // (a) whole trailing string is a single object (covers pretty multi-line).
  try { return JSON.parse(s); } catch { /* not a clean single object */ }
  // (b)/(c) brace-match the last balanced {...} block from the end.
  const end = s.lastIndexOf("}");
  if (end === -1) return null;
  let depth = 0;
  for (let i = end; i >= 0; i--) {
    const ch = s[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      depth--;
      if (depth === 0) { try { return JSON.parse(s.slice(i, end + 1)); } catch { return null; } }
    }
  }
  return null;
}
