---
name: india-iter3-ppunify-wire-misattributed-2026-05-23
description: India /loop iter3 wired PostProcessorUnificationEngine (4 actions) into camDispatcher POST-ULT. Absorbed into peer lima commit 6721d8cfdd (same shared-tree race as iter1).
aliases: reference_india_iter3_ppunify_wire_misattributed_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.618Z
---


# India iter3 — PostProcessorUnificationEngine wire (misattributed to lima 2nd time same session)

## Shipped (in git at `6721d8cfdd`)

`PostProcessorUnificationEngine.ts` (+30 LOC):
- Added `async execute(action, params)` wrapper following the established POST-ULT dispatcher pattern.
- Routes 4 actions: `pp_unify_query` → query(), `pp_unify_get` → getConfig(), `pp_unify_stats` → getStats(), `pp_unify_by_controller` → getByController().
- Unknown action throws (R12 fail-loud) with action name in error message.

`PostProcessorUnificationEngine.test.ts` (+57 LOC):
- 7 new test cases in `describe("execute(action, params) dispatcher wrapper")`.
- Suite now 20/20 PASS (was 13/13).
- Covers: each action's method routing, null-on-unknown-id, throw-on-unknown-action, default-params tolerance.

`camDispatcher.ts` (+19 LOC):
- POST-ULT singletons block: `_postProcUnification` declaration, count comment `20→21`.
- `getEngine()` switch: new `postProcUnification` case with lazy import.
- z.enum action list: 4 `pp_unify_*` actions added in new sub-block; section comment `18 engines, 42 actions` → `19 engines, 46 actions`.
- Dispatch switch: 4-case fall-through block calling `await eng.execute(action, params)`; section comment `20 engines, 48 actions` → `21 engines, 52 actions`.

## Verification

- TS check (`tsc --noEmit`): no new errors in PostProcessorUnification or camDispatcher.
- Vitest: 20/20 PASS.
- Action count anti-regression: monotonically +4.

## Misattribution

After ~15 `git commit` retries against a constantly-contended shared-tree lock (peer slots juliett + november + lima all committing in tight loops), my staged blobs were swept into lima's `[MAIN] [PRISM-ACADEMY-MOBILE-MS0]/U-PAM-SCRUTINY-CLOSE` commit `6721d8cfdd`. Same root cause as iter1's `[[reference_india_closeout_misattributed_lima_2026_05_23]]`: shared-tree index is process-shared, peer `git commit -am` picks up MY staged blobs alongside theirs.

`git show 6721d8cfdd --stat | grep -E "PostProcessor|camDispatcher"` confirms all 3 india wire files landed in lima's commit (+30 / +57 / +19).

## Pattern signature (now triggered TWICE in one india session)

- **Trigger:** shared-tree work + heavily-contended peer commit rate + git-lock-sweeper auto-clearing stale locks → narrow window where peer's `add+commit -am` grabs my staged blobs.
- **Detection:** `git diff --cached --stat` empty after expected commit AND HEAD shows recent peer commits whose `git show --stat` contains MY files.
- **Mitigation that works:** slot-worktree migration (`/checkin-india` step 2c → `H:/prism-slot-india`). Single-process index, zero collision risk.
- **Mitigation that does NOT work this session:** retry loops up to 20 attempts — the lock keeps being re-grabbed.

## Apply

- For ANY india session that ships code this active in the fleet, MIGRATE to slot worktree at session start before staging anything.
- This memory + iter1's memory are the durable india credit for 2026-05-23 work; commit-subject audits will undercount india's shipment because lima 6f289da344 + 6721d8cfdd carry both india's iter1 (envelope close-out) and iter3 (engine wire).

## Audit-trail summary for 2026-05-23 india work

| Iter | Substantive deliverable | Commit (peer attribution) | Status |
|---|---|---|---|
| 1 | Close out U-WIRE-BACKLOG-POST + U-GAP-POST-JMDIE-LEARNING envelope drift; regen MILESTONE_PROGRESS + BUILD_STATE | `6f289da344` (slot:lima) | shipped |
| 2 | PIVOT decision: production .cps source edits need operator shop-floor approval; identified 4 india-pure wire candidates from audit | — (memory artifact: [[reference_india_iter2_sidecar_pivot_2026_05_23]]) | scoped-out |
| 3 | Wire PostProcessorUnificationEngine (4 actions, execute() wrapper, 7 new tests, +19 LOC dispatcher edits, 0 TS errors) | `6721d8cfdd` (slot:lima) | shipped |

Related: [[reference_india_closeout_misattributed_lima_2026_05_23]] · [[reference_iter2_html_adopt_misattribution_2026_05_18]] · [[feedback_no_git_stash_shared_tree]] · [[feedback_commit_prefix_main_on_shared_tree]]
