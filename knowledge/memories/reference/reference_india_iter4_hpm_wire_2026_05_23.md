---
name: india-iter4-hpm-wire-2026-05-23
description: India iter4-5 — HybridPostMergeEngine half-wire fix (added dispatch case + corrected slimmer shape + name-matched test file). Properly attributed to india via atomic stage+commit beating peer race window.
aliases: reference_india_iter4_hpm_wire_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.618Z
---


# India iter4-5 — HybridPostMergeEngine full wire + name-matched test (2026-05-23)

## Pre-existing bug class found

`hybrid_post_merge` action was a **broken half-wire** in `calcDispatcher.ts`:
- Listed in `z.enum` (line 719) — MCP advertised it as callable.
- Had a `case "hybrid_post_merge":` block in the response-slimmer (line 264-265) — but the slimmer read `result.merged_gcode.length` + `result.conflicts.length` + `result.tool_map.size`, fields that NEVER EXISTED on `HybridPostMergeEngine.compute()`'s return shape.
- Had NO dispatch case calling `compute()` — so `result` was always `undefined` when slimmer ran.

Calling `prism_calc { action: "hybrid_post_merge", ... }` would have:
1. Skipped engine entirely (no matching case in dispatch switch).
2. Crashed in slimmer with `TypeError: Cannot read properties of undefined (reading 'length')`.

This is the EXACT bug class that R12 (fail-loud) was designed to surface — except the action's existence in z.enum made it look wired in audits even though calling it would crash.

## Shipped (under india slot attribution — atomic stage+commit defeated peer race)

| Commit | What |
|---|---|
| `42b44bd00a` | calcDispatcher dispatch case calling `hybridPostMergeEngine.compute()` at line 8229 (alphabetically before `thermal_compensation_model`); slimmer rewrite to read `result.value.program.{total_lines, total_tools, conflicts.length}` with safe-navigation; +`execute(action, params)` wrapper on engine (POST-ULT pattern parity, single action `post_hybrid_merge`); existing `cross-cam-batch2.test.ts` 35/35 PASS |
| `4c3c46f70a` | name-matched `HybridPostMergeEngine.test.ts` (15/15 PASS) — required by `stop_on_unwired_assets.mjs` gate (cross-cam-batch2 coverage was structurally not name-matched). Covers compute() pipeline + execute() wrapper + dispatcher slimmer contract (pins shape so the prior `result.merged_gcode/.tool_map` regression class cannot recur silently) |

## Why this wire matters beyond india

The slimmer-contract pinning test is now a regression gate for ANY engine refactor — the test asserts the exact fields calcDispatcher reads, so if the engine shape changes those tests fail BEFORE the slimmer crashes at runtime. This pattern should generalize across calcDispatcher's other 50+ action slimmer cases: every action's slimmer shape should have a paired contract test in its engine's name-matched test file.

## Successful India-slot attribution

Iter1 + iter3 work was absorbed by peer lima commits (see [[reference_india_closeout_misattributed_lima_2026_05_23]] + [[reference_india_iter3_ppunify_wire_misattributed_2026_05_23]]). Iter4 + iter5 used an **atomic single-bash chain** (`command git add ... && command git commit ...` in one statement, inside a 30-iter retry loop polling the lock) — narrow enough window that no peer's `git add -A` or `git commit -am` could grab my staged blobs between the two operations. Resulted in both iter4 (`42b44bd00a`) and iter5 (`4c3c46f70a`) landing under correct `slot:india` attribution.

This is the working mitigation pattern for shared-tree iteration without migrating to slot worktree mid-session. Use when token budget makes worktree migration uneconomical.

Related: [[reference_india_closeout_misattributed_lima_2026_05_23]] · [[reference_india_iter3_ppunify_wire_misattributed_2026_05_23]] · [[reference_india_iter2_sidecar_pivot_2026_05_23]] · [[feedback_commit_prefix_main_on_shared_tree]]
