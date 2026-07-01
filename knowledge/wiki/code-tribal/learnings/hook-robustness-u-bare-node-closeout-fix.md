# HOOK-ROBUSTNESS/U-BARE-NODE-CLOSEOUT-FIX — [MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-CLOSEOUT-FIX (slot:zulu): fix close-out-milestone.mjs bare-node spawns -> process.execPath (root of the observed MILESTONE_PROGRESS/BUILD_STATE regen exit=null)

**Commit:** `0e95e0843768` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:31:48-05:00
**Tags:** hook-robustness, u-bare-node-closeout-fix, auto-distilled

## Subject
[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-CLOSEOUT-FIX (slot:zulu): fix close-out-milestone.mjs bare-node spawns -> process.execPath (root of the observed MILESTONE_PROGRESS/BUILD_STATE regen exit=null)

## Body
```
[MAIN-FORCE] [HOOK-ROBUSTNESS]/U-BARE-NODE-CLOSEOUT-FIX (slot:zulu): fix close-out-milestone.mjs bare-node spawns -> process.execPath (root of the observed MILESTONE_PROGRESS/BUILD_STATE regen exit=null)

The scripts/-surface tail of the bare-node class. close-out-milestone.mjs had 2
bare spawnSync("node",...): spawnNodeScript() (line 314, regens MILESTONE_PROGRESS +
BUILD_STATE) and the chat-bus post (line 221). When run from a hook/portable-node
context, bare "node" ENOENTs -> spawnNodeScript returned exit=null -> the regen
"failed" silently (the exact symptom observed earlier this session). Both -> process.execPath.

Scope note (R12): the remaining scripts/ bare-node grep hits are NOT production spawns --
they are test FIXTURE STRINGS (validate-hook-orphan-signal.test asserts a regex that
DETECTS `spawn("node")` -- must not change), a writeFileSync fixture, an already-fixed
process.execPath + comment, and one defensive `node -v` test check. Production surface
(.claude/hooks + helpers + scripts) is now fully clean of bare-node spawns.
```

## Files touched (2)
- scripts/close-out-milestone.mjs | 4 ++--
- 1 file changed, 2 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0e95e0843768`
- Milestone envelope: `mcp-server/data/milestones/HOOK-ROBUSTNESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._