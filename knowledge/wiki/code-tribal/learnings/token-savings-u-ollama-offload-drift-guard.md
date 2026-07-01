# TOKEN-SAVINGS/U-OLLAMA-OFFLOAD-DRIFT-GUARD — [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-DRIFT-GUARD (slot:alpha): self-detect a new untracked execution bridge so the ~46x utilization under-count cannot silently recur

**Commit:** `e35ceca1c2a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:40:04-05:00
**Tags:** token-savings, u-ollama-offload-drift-guard, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-DRIFT-GUARD (slot:alpha): self-detect a new untracked execution bridge so the ~46x utilization under-count cannot silently recur

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-DRIFT-GUARD (slot:alpha): self-detect a new untracked execution bridge so the ~46x utilization under-count cannot silently recur

The off-Claude utilization total only sums bridges in the static
EXECUTION_BRIDGE_HOOKS Set. A new bridge added without updating that Set goes
invisible -- the exact bug that hid ask-hermes's ~855 executions (reported 19
vs true ~874). Rather than rely on a human keeping the Set in sync (R5: let
code answer it), the dashboard now scans live byHook for any ask-* bucket with
real activity (offloaded/fired/byMode.executed/bySource) that is NOT tracked
and surfaces it LOUD in the advisory with the one-line fix location.

Pure exported findUntrackedBridges(byHook, trackedSet); computed in summarize()
-> totals.untrackedBridges; surfaced in advisory(). Convention-gated (ask-*) so
the dozens of non-bridge byHook writers (suggest-only advisories etc.) never
false-alarm; zero-activity ask-* buckets ignored. +5 R9 tests (new bridge
flagged, bySource/executed-only counts, adversarial no-false-positive on
tracked/non-ask/zero-activity, empty-safe, end-to-end advisory surfacing).
40/40 dashboard tests. LIVE: 99.8% healthy, no untracked warning (all 3 bridges
tracked). Closes the root bug class of the ollama-utilization thread.
```

## Files touched (3)
- scripts/__tests__/ollama-offload-dashboard.test.mjs | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-offload-dashboard.mjs                | 43 +++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 98 insertions(+)

## Lessons surfaced in commit body
- tilization under-count cannot silently recur
- tilization total only sums bridges in the static
- tilization thread.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e35ceca1c2a7`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._