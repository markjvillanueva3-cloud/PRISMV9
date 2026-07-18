# AGENTIC-SUBSTRATE-BRIDGE/U-LOOP-STATE-READ-API — [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-LOOP-STATE-READ-API (slot:bravo): export readFleetLoops() -- programmatic fleet loop-state query (foundation for prism_session:loop_state_query)

**Commit:** `4c0410301b41` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T01:50:31-05:00
**Tags:** agentic-substrate-bridge, u-loop-state-read-api, auto-distilled

## Subject
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-LOOP-STATE-READ-API (slot:bravo): export readFleetLoops() -- programmatic fleet loop-state query (foundation for prism_session:loop_state_query)

## Body
```
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-LOOP-STATE-READ-API (slot:bravo): export readFleetLoops() -- programmatic fleet loop-state query (foundation for prism_session:loop_state_query)

The /loop infra had a CLI (loop-state.mjs list) but no importable reader, so dispatchers/
hooks/scripts could not query loop state without shelling out. Extracted the DATA half of
cmdList into an exported, testable readFleetLoops({dir,now}) -> {count, loops[]} (sorted
freshest-first, fail-soft on missing dir / corrupt file, injectable now for deterministic
staleMs). cmdList now delegates to it -> ONE read path (DRY), output shape UNCHANGED.

This is the safe .mjs-only foundation the heavier prism_session:loop_state_query dispatcher
action (needs the full TS build) will wrap -- built first per R13 logical order, so the
dispatcher lands on a proven base in fresh context.

Behavior-preserving: live  reads 289 real fleet loops, shape identical.
TEST 6 new R9 tests (sort order / field carry / fail-soft missing-dir / corrupt-skip / non-loop
filter / empty) + existing loop-state tests pass (26/26). Additive export -- the LIVE loop hooks
(tick/start/inject) are untouched.
```

## Files touched (3)
- .claude/helpers/loop-state-readfleet.test.mjs | 73 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/loop-state.mjs                | 29 ++++++++++++++++++++++-------
- 2 files changed, 95 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c0410301b41`
- Milestone envelope: `mcp-server/data/milestones/AGENTIC-SUBSTRATE-BRIDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._