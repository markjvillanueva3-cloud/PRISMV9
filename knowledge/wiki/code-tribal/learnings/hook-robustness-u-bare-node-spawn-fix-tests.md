# HOOK-ROBUSTNESS/U-BARE-NODE-SPAWN-FIX-TESTS — [MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX-TESTS (slot:zulu): fix the last 5 bare-node spawns (3 test-infra + 2 scratch) -> process.execPath; class now fully remediated

**Commit:** `3b8d2e6dceeb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:26:16-05:00
**Tags:** hook-robustness, u-bare-node-spawn-fix-tests, auto-distilled

## Subject
[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX-TESTS (slot:zulu): fix the last 5 bare-node spawns (3 test-infra + 2 scratch) -> process.execPath; class now fully remediated

## Body
```
[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-SPAWN-FIX-TESTS (slot:zulu): fix the last 5 bare-node spawns (3 test-infra + 2 scratch) -> process.execPath; class now fully remediated

Completes U-BARE-NODE-SPAWN-FIX. The fleet sweep's tail: 3 __tests__ spawners
(hook-test, action-triple-sync, concurrency-test) + 2 scratch measurement tools
all used bare spawnSync/spawn("node",...) and ENOENT'd under portable-node --
action-triple-sync.test.mjs was confirmed BROKEN (Error: spawn node ENOENT),
now 8/8 passing after the process.execPath fix. All 5 syntax-checked.

Final grep (tool): ZERO actual bare-node spawns remain in .claude/ -- the only
3 residual matches are doc-COMMENTS documenting this very bug class
(precompact-handoff.mjs:625, stop-memory-size-watchdog.mjs:100, precompact-pad.test.mjs).
The silent-spawn class (extensionless-shim + stdio:ignore + bare-node-PATH) is
fully remediated across the affected surface (R15/R16 apply-to-all complete).
```

## Files touched (6)
- .claude/hooks/__tests__/action-triple-sync.test.mjs |  2 +-
- .claude/hooks/__tests__/concurrency-test.mjs        |  2 +-
- .claude/hooks/__tests__/hook-test.mjs               |  2 +-
- .claude/scratch/measure-sessionstart-token-cost.mjs | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/scratch/probe-sessionstart-hooks.mjs        | 27 +++++++++++++++++++++++
- 5 files changed, 101 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3b8d2e6dceeb`
- Milestone envelope: `mcp-server/data/milestones/HOOK-ROBUSTNESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._