---
name: reference_stop_gate_detector_accuracy_2026_06_19
description: Two findUnhandledActions detector fixes (equality-dispatch Pattern 5 + comment-strip glob-artifact lookbehind) that closed the dispatcher ghost-action audit from 67 false UNHANDLED actions to 0 — both prevent false Stop-gate session-blocks
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.212Z
aliases: reference_stop_gate_detector_accuracy_2026_06_19
---


**[STOP-HOOK-ACCURACY] 2 fixes (2026-06-19, slot:golf)** to `findUnhandledActions` in `.claude/hooks/stop_on_unwired_assets.mjs` (the pure detector backing BOTH the Stop gate that blocks session-end on orphan dispatcher actions AND `scripts/audit-dispatcher-ghost-actions.mjs`). A false UNHANDLED can BLOCK any session editing the affected dispatcher — same class as the 2026-06-11 array-dispatch regression ([[reference_stop_unwired_array_dispatch_fix_2026_06_11]]).

**Fix 1 — Pattern 5: equality dispatch** (`U-EQUALITY-DISPATCH-DETECT`). The detector knew 4 handler patterns (switch/case, lookup-table key, object key, `FOO_ACTIONS.includes(action)`) but NOT `if (action === "x")` / `else if` / ternary equality chains. So `intelligenceDispatcher` (62) + `materialProcessingDispatcher` (2) read as UNHANDLED while fully routed. Added `eqRe = /===\s*["'\`]name["'\`]|["'\`]name["'\`]\s*===/` (both operand orders). **STRICT `===` only** — `!==`/`!=` are negative guards that must NOT count (matching them would falsely CLEAR a real orphan = the dangerous direction); `===` is never a substring of `!==`, proven by adversarial tests + a 119-dispatcher fleet sweep (zero false-clears).

**Fix 2 — comment-strip glob/regex artifact** (`U-COMMENT-STRIP-GLOB-ARTIFACT`). The block-comment strip `/\/\*[\s\S]*?\*\//g` greedily paired a spurious `/*` inside a STRING literal (the glob `"**/*.MIN"` contains `*/*`) with the next stray `*/` (a regex `/...\d*/`), SWALLOWING the real `case` handlers between them. Live: `ppDispatcher.ts` L6279 glob ate its `pp_label_*` cases (L6289-6307). Fix: negative lookbehind `/(?<![*/])\/\*[\s\S]*?\*\//g` — a `/*` preceded by `*`/`/` (glob/regex artifact) is not a comment open. Residual pathological edge (real comment with `/*` adjacent to a preceding `*`/`/`) documented + accepted (0 live occurrences; full fix needs a tokenizer).

**Combined live validation (R15, with numbers):** ghost-action audit candidate dispatchers **3 → 0** (67 false UNHANDLED actions eliminated). Tests: 24/24 array-dispatch (+9 across both fixes) + 4/4 wiring. Each fix 2-arm per-file scrutiny PASS. Commits on `cad-fusion-live-ms0`.

**Lesson:** a dispatcher-action handler detector must recognize EVERY real dispatch shape (switch/case · table · object-key · array-membership · `if(action===)`), and its comment-strip must not treat `/*`/`*/` inside string/regex literals as comment markers — both failure modes silently report handled actions as UNHANDLED, which false-BLOCKS the Stop gate fleet-wide. This is the 3rd+4th entry in the detector-false-positive family ([[reference_stop_unwired_array_dispatch_fix_2026_06_11]], [[reference_stop_unwired_assets_false_positive_2026_05_23]]). Pairs with the same-session cron-advisory actuation-gate fix ([[reference_stale_cron_actuation_gate_2026_06_19]]).
