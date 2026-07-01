# SELF-COMPACT-MS0/U-SELFCOMPACT-SINGLETAB-LAZY — [MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-SINGLETAB-LAZY (slot:charlie): resolve owning-pid lazily so the PS ancestry walk fires only when a tier needs a pid

**Commit:** `697a2fe75017` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T08:34:19-05:00
**Tags:** self-compact-ms0, u-selfcompact-singletab-lazy, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-SINGLETAB-LAZY (slot:charlie): resolve owning-pid lazily so the PS ancestry walk fires only when a tier needs a pid

## Body
```
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-SINGLETAB-LAZY (slot:charlie): resolve owning-pid lazily so the PS ancestry walk fires only when a tier needs a pid

Scrutiny arm C P2: resolveOwningPidForChat (a ~278ms PowerShell ancestry walk)
ran unconditionally in resolveOwnWindow, wasting a spawn on the UIA-success and
pane-count-hard-stop paths that discard the result. Make it a memoized lazy
accessor -- resolved at most once, and only when Tier-1.5 (singletab) or Tier-3
actually needs a pid. Behavior-neutral (no tier outcome changes). +3 regression
tests proving 0 PS spawns on uia-success + pane-count, exactly 1 on no-tab. 52/52.
```

## Files touched (3)
- scripts/self-compact.mjs      | 40 ++++++++++++++++++++++++++--------------
- scripts/self-compact.test.mjs | 34 ++++++++++++++++++++++++++++++++++
- 2 files changed, 60 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 697a2fe75017`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._