# CHECKIN-UPGRADE-MS0/P2-AUTOUPGRADE — [MAIN] [CHECKIN-UPGRADE-MS0]/P2-AUTOUPGRADE: terminal-window-id cache-hit auto-upgrade probe

**Commit:** `9e67e2cdef28` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T11:43:42-05:00
**Tags:** checkin-upgrade-ms0, p2-autoupgrade, auto-distilled

## Subject
[MAIN] [CHECKIN-UPGRADE-MS0]/P2-AUTOUPGRADE: terminal-window-id cache-hit auto-upgrade probe

## Body
```
[MAIN] [CHECKIN-UPGRADE-MS0]/P2-AUTOUPGRADE: terminal-window-id cache-hit auto-upgrade probe

Closes Reviewer B P2 on commit 59465d7c2. The never-downgrade rule's write-side
compare was unreachable on cache hit: TIER 0 short-circuited and returned. A
session that first resolved to a degraded tw-pp tier would freeze at tier 1
forever, defeating the rule's intent.

Fix: throttled auto-upgrade probe on cache-hit when cachedTier < MAX_TIER (4)
AND (now - lastProbeAt) >= AUTOUPGRADE_THROTTLE_MS (default 30s). If
tierOf(fresh) > cachedTier, replace cache entry (set upgradedFrom). Otherwise
advance lastProbeAt and return cached.

Cache schema extended (back-compat) with optional lastProbeAt + upgradedFrom.
Knobs: PRISM_TWID_AUTOUPGRADE_DISABLE=1, PRISM_TWID_AUTOUPGRADE_THROTTLE_MS=N.

Tests: 29 -> 35 cases (6 new). One pre-existing test updated to assert against
PRISM_TWID_AUTOUPGRADE_DISABLE=1 because its 'cache always wins' invariant is
intentionally relaxed by this fix. All pass.

Also: wires stop-cross-tree-collision-advisory.mjs at Stop[7]/36 timeout=3000ms
in both C: + H: settings.json (c-to-h-mirror replicated). Returns
{continue:true,suppressOutput:true} on no-collision path — zero-risk wiring.

Infra (helpers/.claude/helpers/) — uses [MAIN] override since this is
integration-only work, not feature-scope.
```

## Files touched (3)
- .claude/helpers/terminal-window-id.mjs      |  55 ++++++++++++-
- .claude/helpers/terminal-window-id.test.mjs | 121 +++++++++++++++++++++++++++-
- 2 files changed, 171 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9e67e2cdef28`
- Milestone envelope: `mcp-server/data/milestones/CHECKIN-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._