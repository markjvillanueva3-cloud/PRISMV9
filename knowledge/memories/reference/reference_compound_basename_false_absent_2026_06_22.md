---
name: reference_compound_basename_false_absent_2026_06_22
description: "A code-asset extraction regex that stops at the last dot-segment drops compound basenames (foo.test.mjs -> test.mjs), causing false-ABSENT and false-close in the MISC verifier."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.528Z
aliases: reference_compound_basename_false_absent_2026_06_22
---


Bug found + fixed 2026-06-22 (slot:zulu), commit `1ac297d7c8`, surfaced by
DOGFOODING the Ollama recall arm (the first live --limit 40 sweep false-closed
MISC-124 claiming "File no longer exists" when `scrutiny-ledger.test.mjs` exists).

**Root cause:** `CODE_ASSET_RE = /\b[\w-]+\.(?:mjs|ts|js)\b/g` in
`scripts/verify-misc-tasks-open.mjs` (shared by `extractCodeAssets`, used by BOTH
the deterministic arm and the Ollama recall arm). For a COMPOUND basename like
`scrutiny-ledger.test.mjs`, `\b[\w-]+` anchors after the interior `.` and the
regex extracts only `test.mjs`. That degraded basename misses the basename
path-index -> `gatherEvidence` emits "test.mjs: ABSENT" -> the model correctly
reads ABSENT -> closes the item on a false premise. A never-false-close charter
violation in PRACTICE (the status conservatism held, but the input was wrong).

**Fix:** `/\b[\w-]+(?:\.[\w-]+)*\.(?:mjs|ts|js)\b/g` -- allow interior dot-segments;
regex backtracking keeps `a.mjs b.mjs` as two matches. Bonus: `vitest.config.ts`
now extracts whole and correctly hits the TARGET_BASENAMES wire-target exclusion
(before it degraded to `config.ts` and escaped the filter).

**Lessons:**
1. A basename-extraction regex MUST allow interior dots -- `.test.`, `.config.`,
   `.spec.`, `.d.ts` files are common and silently drop otherwise.
2. DOGFOODING surfaced this: running the tool I built on live data found a bug
   that 12 stub tests + a live --limit 8 run did not. A bounded live sweep pays
   for itself. [[reference_knowledge_to_model_loop_map_2026_06_21]]
3. R12 spot-check verdicts: of 2 Ollama "closed", MISC-220 was real (file exists)
   but MISC-124 was false (this bug). Always verify a "closed" before trusting it;
   the never-false-close charter is about STATUS, not the REASON's correctness.

Sibling matcher-precision bug in the same file:
[[feedback_reuse_whole_token_matcher_not_includes]].
