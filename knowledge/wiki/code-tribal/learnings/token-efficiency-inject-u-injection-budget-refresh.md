# TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-REFRESH — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-REFRESH (slot:bravo): close the CAP-gate loop -- SessionStart opportunistic snapshot refresher (ledger unit 10). CAP gate fail-opens on a stale snapshot; this rewrites it >12h via a DETACHED probe spawn (never blocks; fleet 30m cooldown marker prevents probe-storm). WIRED SessionStart C:+H:. 16/16 tests + 3 live paths. Knobs PRISM_INJECTION_BUDGET_REFRESH_{DISABLE,INTERVAL_MS,COOLDOWN_MS}.

**Commit:** `190f36b7495d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T22:21:24-05:00
**Tags:** token-efficiency-inject, u-injection-budget-refresh, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-REFRESH (slot:bravo): close the CAP-gate loop -- SessionStart opportunistic snapshot refresher (ledger unit 10). CAP gate fail-opens on a stale snapshot; this rewrites it >12h via a DETACHED probe spawn (never blocks; fleet 30m cooldown marker prevents probe-storm). WIRED SessionStart C:+H:. 16/16 tests + 3 live paths. Knobs PRISM_INJECTION_BUDGET_REFRESH_{DISABLE,INTERVAL_MS,COOLDOWN_MS}.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-REFRESH (slot:bravo): close the CAP-gate loop -- SessionStart opportunistic snapshot refresher (ledger unit 10). CAP gate fail-opens on a stale snapshot; this rewrites it >12h via a DETACHED probe spawn (never blocks; fleet 30m cooldown marker prevents probe-storm). WIRED SessionStart C:+H:. 16/16 tests + 3 live paths. Knobs PRISM_INJECTION_BUDGET_REFRESH_{DISABLE,INTERVAL_MS,COOLDOWN_MS}.
```

## Files touched (3)
- .claude/hooks/__tests__/injection-budget-snapshot-refresh.test.mjs |  83 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/injection-budget-snapshot-refresh.mjs                | 142 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 225 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 190f36b7495d`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._