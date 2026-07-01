# FLEET-LAUNCHER-IMPROVE-MS0/U-FLI05 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI05 (slot:tango): strategically launch Docker + Ollama at fleet activation

**Commit:** `1645c20d838b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T18:51:16-05:00
**Tags:** fleet-launcher-improve-ms0, u-fli05, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI05 (slot:tango): strategically launch Docker + Ollama at fleet activation

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI05 (slot:tango): strategically launch Docker + Ollama at fleet activation

Operator: "make ollama and docker launch strategically when launch prism fleet launcher is activated."

Reused the existing idempotent ollama-docker-launcher.mjs (launches Docker Desktop
if off + brings up the compose stack + health + writes DOCKER_RUNTIME_STATE.json)
rather than building new. Two changes:

1. ollama-docker-launcher.mjs: new --ensure-native-ollama flag. Native Ollama owns
   host :11434 (the "PRISM Ollama Serve" logon task) and is NOT a compose service,
   so the docker stack alone never covers it. Extracted an exported, dep-injected
   ensureNativeOllama({probe, runTask}): probe :11434, start the scheduled task ONLY
   if down (idempotent -- no transient duplicate ollama serve on the bound port).
   3 hermetic tests (already-running/started/failed); 20/20 launcher tests pass.

2. Thin wrapper (regenerate-launch-fleet.mjs template): a strategic prewarm step --
   start "" /min node ollama-docker-launcher.mjs --skip-pull --ensure-native-ollama
   -- DETACHED so Docker's 30-60s cold start does NOT block the 24-chat spawn; the
   stack warms in parallel. Runs before :launch.

Why at the wrapper (not per-session): docker-intel-autostart.mjs fires on each
SessionStart but only probes docker info and bails on docker-down -- it does NOT
launch Docker Desktop. ollama-docker-launcher.mjs DOES, so one launch-time detached
call covers the gap the 24 per-session hooks cannot.

Verified: 20/20 tests; parse clean; --ensure-native-ollama CLI -> already-running
(ollama up, no schtasks, docker untouched via short-circuit); desktop regenerated
with the prewarm step before :launch.
```

## Files touched (4)
- mcp-server/scripts/ollama-docker-launcher.mjs      | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/scripts/ollama-docker-launcher.test.mjs | 37 ++++++++++++++++++++++++++++++++++
- scripts/regenerate-launch-fleet.mjs                |  8 ++++++++
- 3 files changed, 111 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1645c20d838b`
- Milestone envelope: `mcp-server/data/milestones/FLEET-LAUNCHER-IMPROVE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._