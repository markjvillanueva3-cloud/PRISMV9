# PSN-SYNERGIZE/U-GREP-GRAPH-WIRE — [MAIN] [PSN-SYNERGIZE]/U-GREP-GRAPH-WIRE (slot:sierra): wire grep-index-first to system-graph + telemetry sink

**Commit:** `c0446ab1f269` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T22:31:40-05:00
**Tags:** psn-synergize, u-grep-graph-wire, auto-distilled

## Subject
[MAIN] [PSN-SYNERGIZE]/U-GREP-GRAPH-WIRE (slot:sierra): wire grep-index-first to system-graph + telemetry sink

## Body
```
[MAIN] [PSN-SYNERGIZE]/U-GREP-GRAPH-WIRE (slot:sierra): wire grep-index-first to system-graph + telemetry sink

PSN-synergy wire - closes the 'named index-first but does not query the index'
gap in grep-index-first.mjs. Hook now consults system-graph.json (110K nodes)
BEFORE keyword/Ollama fallback, and emits telemetry to the same
ollama-offload-stats.json dashboard that surfaces ollama-route-pretooluse.

grep-index-first.mjs:
- getGraphNodeHits(): token-AND match against system-graph nodes (4-char min,
  regex-meta stripped), mtime-cached, top-3 hits with file paths.
- recordTelemetry(): atomic-RMW (PID-tmp + rename) into ollama-offload-stats
  byHook[grep-index-first] = {fired, suggested}. Same contract as U2.
- main() reordered: graph hits first (exact path beats keyword), then Ollama,
  then regex. Top 6 surfaced.
- Module-vs-CLI gate so test imports do not fire top-level stdin parse.
- DI seams (graphPath/statsPath/maxHits) for testability.

grep-index-first.test.mjs (16 tests, all pass via node --test):
- Happy: exact match, ghost passthrough, maxHits, multi-token AND
- Failure: short pattern, missing graph, corrupt JSON, no nodes array
- Adversarial: regex meta, malformed nodes, NaN/Infinity payloads
- Telemetry: new file, increment, peer-slot preservation (anti-clobber),
  corrupt-JSON fail-soft, missing-byHook tolerance.

PSN legs connected: Grep -> System Viz (graph) -> Wiki+Memory paths
surfaced by node.path -> Offload Dashboard (telemetry).

No dispatcher wiring needed - hook already in PreToolUse:Grep chain.
Rollback: git revert HEAD.
```

## Files touched (3)
- .claude/hooks/grep-index-first.mjs      | 160 +++++++++++++++--
- .claude/hooks/grep-index-first.test.mjs | 302 ++++++++++++++++++++++++++++++++
- 2 files changed, 449 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c0446ab1f269`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGIZE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._