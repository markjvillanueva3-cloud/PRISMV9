# OLLAMA-OFFLOAD/U-NIGHT-TREEKILL — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-TREEKILL (slot:zulu): night-batch tree-kills a timed-out job (was 13.6h spawnSync grandchild-pipe block)

**Commit:** `925a1dc172ba` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T17:23:03-05:00
**Tags:** ollama-offload, u-night-treekill, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-TREEKILL (slot:zulu): night-batch tree-kills a timed-out job (was 13.6h spawnSync grandchild-pipe block)

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-NIGHT-TREEKILL (slot:zulu): night-batch tree-kills a timed-out job (was 13.6h spawnSync grandchild-pipe block)

The 6/15 night batch returned 0x2 because galaxy-transcript-mine ran 13.6h
(49,150,091ms) despite a correct 2h timeoutMs -- 5.6h past the 06:00 window,
burning the GPU into the workday. Root cause: spawnJob used spawnSync({timeout}),
which on Windows kills only the DIRECT child then BLOCKS draining stdout/stderr
pipes an orphaned GRANDCHILD (the miner's own ollama subprocess, looping on
HTTP 503) still held open. A post-hoc tree-kill is impossible with spawnSync
(the child is already reaped), so spawnJob is now async: spawn + a wall-clock
timer that tree-kills the whole process tree while it is still LIVE (Windows
taskkill /t /f; POSIX detached process-group SIGKILL), returning the same
spawnSync-shaped {status,error,stdout,stderr} so runJobs row-capture is
unchanged. runJobs/main now await it; the injected-runImpl test seam survives
(await passes a sync return through). Protects all 14 jobs, not just the miner.

Tests 15/15 (3 new, real children on this host): timeout-kill returns ~prompt
with null/ETIMEDOUT; the GRANDCHILD-pipe regression returns in 670ms (was
13.6h); fast child keeps its real exit code + output. Live integration: real
runJobs->real spawnJob killed a 60s-sleeping job at 714ms (its 600ms timeout).
```

## Files touched (3)
- scripts/ollama-night-batch.mjs      | 79 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------
- scripts/ollama-night-batch.test.mjs | 53 ++++++++++++++++++++++++++++++++++++++++++++++-------
- 2 files changed, 116 insertions(+), 16 deletions(-)

## Lessons surfaced in commit body
- till held open. A post-hoc tree-kill is impossible with spawnSync
- till LIVE (Windows

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 925a1dc172ba`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._