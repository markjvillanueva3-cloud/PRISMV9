# GOLF-QUEUE/U-GOLF-G6-OLLAMA-HEALTH-ARM — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GOLF-QUEUE]/U-GOLF-G6-OLLAMA-HEALTH-ARM (slot:golf): native-ollama :11434 Stop-advisory arm

**Commit:** `776a0d747609` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:14:44-05:00
**Tags:** golf-queue, u-golf-g6-ollama-health-arm, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GOLF-QUEUE]/U-GOLF-G6-OLLAMA-HEALTH-ARM (slot:golf): native-ollama :11434 Stop-advisory arm

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GOLF-QUEUE]/U-GOLF-G6-OLLAMA-HEALTH-ARM (slot:golf): native-ollama :11434 Stop-advisory arm

G6 (golf completion plan, build-iter-B). Gap: the docker-service-health-stop
Stop hook surfaced downed Docker containers (qdrant/postgres/prometheus/grafana)
+ a downed MCP :3100 singleton, but NATIVE ollama on :11434 -- the token-economy
offload + embeddings + octopus-consensus substrate (a PSN leg) -- had NO
Stop-surfaced down-advisory anywhere (octopus/chat probes fire SessionStart only;
the reaper probes ollama only for its GPU coordinator). On this host the compose
ollama service is dropped (native runtime owns :11434), so the docker-container
guard structurally never covered it.

Fix: buildOllamaAdvisory(probe) [pure, exported] + ollamaNativeProbe(fetchImpl)
[exported, injectable] folded into the existing advisory merge. Probed
UNCONDITIONALLY before the docker arm so a down Docker daemon (the normal state
here) does not suppress the ollama-offload signal. Cheap /api/tags endpoint +
2.5s timeout + reachable===false gate = no cry-wolf during a model load. Cache
carries .ollamaProbe (back-compat: pre-change rows short-circuit to silent).

WIRE: extends an already-Stop-wired hook (no orphan). TEST: 11/11 (4 new IO
failure-mode tests via injected fetch -- R15 happy+3-failure). VALIDATE LIVE:
healthy=silent; real closed-port=advisory fires; docker-down does NOT suppress
ollama (proven -- npipe error + ollama advisory both present). Per-file 2-agent
scrutiny PASS+PASS (P1 latency doc-drift documented; P2 magic-80 named; P2 IO
coverage closed).
```

## Files touched (3)
- .claude/hooks/docker-service-health-stop.mjs      | 88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------
- .claude/hooks/docker-service-health-stop.test.mjs | 51 ++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 126 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 776a0d747609`
- Milestone envelope: `mcp-server/data/milestones/GOLF-QUEUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._