# OCTOPUS-DRAIN-FIX/U-DRAIN-SPAWN-ENOENT — [MAIN-FORCE] [OCTOPUS-DRAIN-FIX]/U-DRAIN-SPAWN-ENOENT (slot:zulu): fix the SILENT dead octopus-consensus autofire (extensionless-portable-node cp.spawn ENOENT) + the same fleet-wide bug class

**Commit:** `ffb6b8c5b1dc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T19:51:44-05:00
**Tags:** octopus-drain-fix, u-drain-spawn-enoent, auto-distilled

## Subject
[MAIN-FORCE] [OCTOPUS-DRAIN-FIX]/U-DRAIN-SPAWN-ENOENT (slot:zulu): fix the SILENT dead octopus-consensus autofire (extensionless-portable-node cp.spawn ENOENT) + the same fleet-wide bug class

## Body
```
[MAIN-FORCE] [OCTOPUS-DRAIN-FIX]/U-DRAIN-SPAWN-ENOENT (slot:zulu): fix the SILENT dead octopus-consensus autofire (extensionless-portable-node cp.spawn ENOENT) + the same fleet-wide bug class

ROOT CAUSE of the RECURRING multi-day octopus drain stall (06-17/06-19/06-21, each 'fixed'
then recurred): stop-consensus-drain.mjs spawned the EXTENSIONLESS shim H:/.claude/bin/portable-node.
On Windows cp.spawn (no shell) cannot CreateProcess a file with no .exe/.cmd -> ENOENT, fired
ASYNC as an 'error' event the hook's synchronous try/catch CANNOT catch. The hook returned
'drainer spawned' while NOTHING ran. Every recorded drain was a MANUAL shell-resolved run during
an investigation -- the autofire never actually worked. The 06-19 'fix' re-wired the hook but only
verified it RETURNS spawned, never that a processed record appeared.

PROVEN: cp.spawn('.../portable-node',{}) -> ENOENT; process.execPath (real node.exe) spawns fine.
VALIDATED end-to-end: post-fix, triggering the hook produced a FRESH processed record (drained_at
advanced 00:26->00:37) AND the new log captured the child's output (both absent/empty before).

FIXES (the silent-portable-node-cp.spawn bug class, fleet-wide):
- stop-consensus-drain.mjs: spawn the REAL node via resolveNodeBin() (process.execPath, else
  H:/Tools/nodejs/node.exe / C: fallback), NEVER the shim. Basename-anchored guard
  /(^|[\/])node(\.exe)?$/i rejects 'portable-node' (3-of-3 P1: a bare /node$/ false-matched it).
  + tee the detached child stdout/stderr to an append LOG (was stdio:'ignore' -> silent failures
  = why the stall was undiagnosable for days, R12) + generous heap (Blackwell, precautionary).
- docker-hook-broker.mjs: FALLBACK_BIN default shim -> process.execPath (its own test already
  overrode to process.execPath, proving the shim default was broken; broker safety-net fallback
  cp.spawns it without shell).
- stop-bg-runner.mjs: removed the dead NODE_BIN=shim const (a trap; line ~90 already uses execPath).

13 tests (9 drain-hook incl adversarial shim-on-disk + resolveNodeBin; 15 broker pass). Per-file
2-arm scrutiny: FAIL->fixed P1->re-review PASS+PASS. Detection already shipped (reconcile-zulu-ledger
octopus meta-probe flags drain age >48h). NOTE: single-voter degradation is separate (peer-active).
```

## Files touched (5)
- .claude/helpers/docker-hook-broker.mjs      |  8 +++++++-
- .claude/hooks/stop-bg-runner.mjs            |  4 +++-
- .claude/hooks/stop-consensus-drain.mjs      | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
- .claude/hooks/stop-consensus-drain.test.mjs | 73 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- 4 files changed, 141 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- NOTE: single-voter degradation is separate (peer-active).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ffb6b8c5b1dc`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-DRAIN-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._