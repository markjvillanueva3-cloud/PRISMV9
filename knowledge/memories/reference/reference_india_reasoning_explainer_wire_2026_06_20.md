---
name: reference_india_reasoning_explainer_wire_2026_06_20
description: "A \"regression\" flagged by failing tests was actually STALE TESTS referencing actions re-wired under canonical names; naive restore = duplicate-action dedup trap (caught by scrutiny arm B). Wired 2 genuinely-dormant explainer methods canonically instead."
type: reference
slot: india
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.620Z
aliases: reference_india_reasoning_explainer_wire_2026_06_20
---


# U-REASONING-EXPLAINER-WIRE (slot:india, 2026-06-20, commit a39f111717)

## What looked like a regression but wasn't
`aiReasoningDispatcher.bounds.test.ts` + `aiReasoningDispatcher.explain.test.ts` were RED, referencing 11 `ai_*` actions (`ai_pac_*`, `ai_vc_bound`, `ai_belief_*`, `ai_explain*`). Git showed commit **c642606778 "FEAT-TERMINAL-TITLE"** (a shared-tree clobber) had deleted them from `aiReasoningActionSchemas.ts` (-458) + `aiReasoningDispatcher.ts` (-559) — the classic shared-tree absorption.

## The trap (R8/R7/dedup)
A naive verbatim restore (first agent did this, 47/47 green) re-added the old `ai_*` names. **2-arm per-file scrutiny — arm B (code-analyzer) caught it FAIL:** those engines were RE-WIRED canonically by LATER milestones — `belief_set/update/query` (U-WIRE20), `bounds_pac_complexity/vc/rademacher/pac_bayes` (U-WIRE29), `reasoning_explain`. So the engines were NEVER dormant. The `ai_*` restore created **duplicate action surfaces with divergent return shapes** = a dedup violation. Reverted it.

## The correct fix (R7 pick-canonical, R16 close-real-gap)
- **belief_* / bounds_* / reasoning_explain already wired + tested** (uwire29 + UnwiredBatch1). The `ai_*` tests were STALE (dead names).
- **Genuinely unwired (real gap):** `ReasoningExplainerEngine.explainFormula` + `getReadingLevelLabel`. Wired them canonically as `reasoning_explain_formula` + `reasoning_reading_level` (mirror `reasoning_explain`).
- **Retargeted** both stale test files to canonical live action names. `belief_*` gained its FIRST-ever test coverage. Also tightened the `reasoning_explain` Zod schema (was a no-op passthrough → real `ExplanationRequest` shape).
- 85/85 green across bounds/explain/uwire29/UnwiredBatch1; tsc clean.

## Lessons (compounding)
1. **A failing test for a "missing" action may be a STALE test, not a regression.** Before restoring clobbered wiring, check whether the engine was re-wired under a DIFFERENT (canonical) action name — `grep` the engine singleton + method across the dispatcher. Re-adding the old name = duplicate surface. Per-file 2-arm scrutiny (arm B = code-analyzer, dedup/silent-breakage lens) is what catches this; do NOT skip it.
2. **Shared-tree commit absorption (recurring).** Committing from shared `H:/prism` on `cad-fusion-live-ms0` raced the shared `.git/index`: the commit swept in 2 pre-staged peer files (`scripts/lib/ollama-vision-extract-lib.{mjs,test.mjs}`, claude-167a5334) despite explicit pathspecs, and a peer (sierra) committed on top before I could extract them — `SLOT-COMMIT-ENFORCE` then blocked the fix. Peer work was committed+intact (not lost) but mis-attributed. **Fix: commit from the slot worktree `H:/prism-slot-india` on `slot/india`** — its own HEAD+index eliminate the race. See [[feedback_commit_to_slot_worktree]].

## Next (queued)
c642606778 mass-reverted ~30+ reasoning actions + many non-ai actions; most were re-added by later commits, only U-WIRE08/U-WIRE10 stayed dead (now fixed). Audit which OTHER clobber-dropped actions are still missing: `git show c642606778 -- <schema> | grep '^-'` vs current `AI_REASONING_ACTIONS`.
