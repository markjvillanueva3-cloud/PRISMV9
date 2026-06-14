---
name: reference-token-savings-iter22-misattribution-2026-05-22
description: iter22 (U-NUDGE-SELF-AWARENESS) of TOKEN-SAVINGS-PIVOT shipped in peer commit 0a690f376a (slot:charlie WEDM-Phase-A) — misattributed but work landed
aliases: reference_token_savings_iter22_misattribution_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.972Z
---


# [[reference_token_savings_pivot_2026_05_22|TOKEN-SAVINGS-PIVOT]] iter22 misattribution — 2026-05-22, slot:alpha

**iter22 (`U-NUDGE-SELF-AWARENESS`)** of the [[reference_token_savings_pivot_2026_05_22|TOKEN-SAVINGS-PIVOT]] autonomous /loop shipped functionally — `formatTakeRateAdvisory()` + main() wiring + 13 pure tests — but the commit attribution is wrong.

## What shipped
- `formatTakeRateAdvisory(stats, threshold=0.20, minFires=5)` exported from `.claude/hooks/mcp-route-suggest.mjs:178` — pure function that returns a single-line measured-rate advisory iff fleet `totalFires >= minFires` AND `takeups/fires < threshold`. Above-threshold or low-fire sessions get silence (no positive-reinforcement noise, no misleading 0/0 alarm).
- `main()` wiring (`.claude/hooks/mcp-route-suggest.mjs:580-600`): reads the same sidecar `_recordRouteFires` just wrote to, computes the advisory, appends it as a footer line to the joined `messages` before emitting `additionalContext`. Knob: `PRISM_MCP_ROUTE_AWARENESS_DISABLE=1`.
- 13 pure tests in `.claude/hooks/__tests__/mcp-route-suggest.test.mjs` covering: happy path, below minFires, at-threshold (>=), above-threshold, missing takeupTotals, null/undefined/non-object defensive, malformed totalFires (NaN/Infinity/string), malformed totalTakeups, custom threshold, custom minFires, exact-minFires boundary, 19.9% just-below-threshold boundary, advisory-text actionable-line assertions.

All 13 new tests pass via `node --test` (ok 16-28 inclusive). The spawn-based tests in the same file fail with `ENOENT` because they hard-code `H:/.claude/bin/portable-node` — pre-existing portable-node-path mismatch on this host, unrelated to iter22.

## Where it shipped
**Commit `0a690f376a`** — `[MAIN] [WEDM-PHASE-A]/U-WEDM-CORPUS-CORRECTION (slot:charlie iter38)`. The commit message is about Mitsubishi-lathe vs WEDM corpus detection; my iter22 hook + test work was absorbed because slot:charlie ran `git add -A` (or equivalent wildcard stage) during the very small window I had iter22 files modified-but-unstaged.

`git show 0a690f376a:.claude/hooks/mcp-route-suggest.mjs | grep formatTakeRateAdvisory` confirms the function + caller are present verbatim. No corruption — just wrong commit-message attribution.

## Why I'm not re-committing
- Work is already in HEAD; another commit would be a no-op
- Reverting + re-committing the peer's WEDM corpus correction would clobber their iter38 ship
- This is the exact `[[reference_iter2_html_adopt_misattribution_2026_05_18]]` + `[[reference_h8_misattribution_2026_05_20]]` pattern — load-bearing on the iter file_path:line cite, NOT on the commit-message banner
- Cherry-pick currently in progress (peer) blocks index ops anyway

## Why this keeps happening
26-chat fleet on shared `H:/prism` main tree. Peers running `git add -A` or wildcard stagers (build-state hooks, batch commit scripts) sweep up adjacent unstaged work. Structural fix is slot-worktree migration — `H:/prism-slot-alpha` — per `[[feedback_conflict_fork_rule]]`. I've now hit this in iter20 + iter21 + iter22 of the same /loop; migration is the right next move.

## /goal status after iter22
- iter17-19 (prior session): shipped initial route-suggest + takeup hook pair
- iter20: `U-WEBSEARCH-KB-ROUTE` (commit `0a9d0b918f`) — credit isBroadWebSearch via prism_knowledge:search + master_index_query
- iter21: `U-DOCTRINE-AUDIT-CREDIT` (commit `9750aaf18f`) — credit top-2 classifiers backendAuditChain + doctrineSurface via 5 routes (86% of fires were uncredited before)
- iter22: `U-NUDGE-SELF-AWARENESS` (commit `0a690f376a` MISATTRIBUTED) — fleet take-rate inline in every nudge so the model sees the gap in-context

Cumulative coverage: ~95% of fires now have an MCP route credit path; iter22 closes the awareness-feedback loop. Fleet take-rate at iter22-ship time: 1/284 = 0.35%. Iter22 watches whether that needle moves — if yes, the inline advisory works; if not, the diagnosis isn't visibility, it's the model judging the nudges as bad guidance.

## Verification one-liner
```bash
git show 0a690f376a:.claude/hooks/mcp-route-suggest.mjs | grep -c formatTakeRateAdvisory  # → 2
git show 0a690f376a:.claude/hooks/__tests__/mcp-route-suggest.test.mjs | grep -c formatTakeRateAdvisory  # → 13
```
