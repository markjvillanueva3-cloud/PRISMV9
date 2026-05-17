// error-pattern-memo-guard.mjs — pure decision core for error-pattern-promote's
// ledger-unchanged memoization. Extracted per R9 (testable pure function).
//
// shouldSkipMemo(memo, ledgerStat) → boolean
//   true  = ledger is byte-identical (size+mtime) to the last run AND that run
//           was a no-op → the full readLedger()+parse+group is provably still a
//           no-op, skip it.
//   false = do the full work (cold start, file grew, decision was a draft, or
//           any stat/memo unavailable — fail OPEN, never skip on doubt).
//
// Correctness assumption (load-bearing): the ledger is APPEND-ONLY and
// size-monotonic. New events strictly grow the file → size changes → cache
// miss → full work. Events aging out of the rolling window only LOWER a
// group's count, never push one over THRESHOLD. So a no-op stays a no-op
// until the file actually grows. If a future ledger writer ever does an
// in-place same-size rewrite, this assumption breaks and a changed-but-
// same-size ledger could be skipped until the next append (bounded,
// self-healing, advisory-only hook — acceptable, but documented).

export function shouldSkipMemo(memo, ledgerStat) {
  if (!ledgerStat) return false;            // stat failed → full work
  if (!memo) return false;                  // cold start / corrupt sidecar → full work
  if (memo.size !== ledgerStat.size) return false;       // file grew/shrank
  if (memo.mtimeMs !== ledgerStat.mtimeMs) return false; // touched
  if (typeof memo.decision !== "string") return false;   // malformed memo
  return memo.decision.startsWith("noop");  // only no-op decisions are memo-skippable
}
