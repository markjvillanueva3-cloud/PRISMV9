# FLEET-REAPER-FIX/U-ENUM-NAME-SANITIZE — [MAIN] [FLEET-REAPER-FIX]/U-ENUM-NAME-SANITIZE: extend C0-strip to $p.Name (closes enum-blind regression class)

**Commit:** `ac9cca8902fa` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T12:04:38-05:00
**Tags:** fleet-reaper-fix, u-enum-name-sanitize, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-FIX]/U-ENUM-NAME-SANITIZE: extend C0-strip to $p.Name (closes enum-blind regression class)

## Body
```
[MAIN] [FLEET-REAPER-FIX]/U-ENUM-NAME-SANITIZE: extend C0-strip to $p.Name (closes enum-blind regression class)

The 2026-05-16b fix sanitized only $p.CommandLine. Live repro 2026-05-17
(golf, fleet-memory-monitor at 96% commit) hit enum-blind again at JSON
pos 97856 — past the cmd-field budget, i.e. $p.Name carried the control
byte. PS5.1 ConvertTo-Json emits raw C0 bytes → Node JSON.parse throws →
fleet-reaper sees 0 procs → orphans accumulate → commit climbs unseen →
chat OOMs. Extends -replace '[\x00-\x1F]',' ' to $p.Name. Verified live:
reaper went targets:0/enum-failed-caveat → targets:123/no-caveat.

+ scripts/__tests__/process-slot-map-name-sanitize.test.mjs — 3 fail-on-
  revert guards (node:test; .claude vitest infra is broken per CLAUDE.md).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/helpers/process-slot-map.mjs               | 57 +++++++++++-----
- .../process-slot-map-name-sanitize.test.mjs        | 77 ++++++++++++++++++++++
- 2 files changed, 116 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ac9cca8902fa`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._