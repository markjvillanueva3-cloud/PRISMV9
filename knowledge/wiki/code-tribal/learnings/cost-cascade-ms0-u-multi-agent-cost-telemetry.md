# COST-CASCADE-MS0/U-MULTI-AGENT-COST-TELEMETRY — [MAIN] [COST-CASCADE-MS0]/U-MULTI-AGENT-COST-TELEMETRY: per-tentacle multi-LLM cost ledger

**Commit:** `9897ba6fe107` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T17:54:15-05:00
**Tags:** cost-cascade-ms0, u-multi-agent-cost-telemetry, auto-distilled

## Subject
[MAIN] [COST-CASCADE-MS0]/U-MULTI-AGENT-COST-TELEMETRY: per-tentacle multi-LLM cost ledger

## Body
```
[MAIN] [COST-CASCADE-MS0]/U-MULTI-AGENT-COST-TELEMETRY: per-tentacle multi-LLM cost ledger

MultiAgentCostTelemetryEngine — per-tentacle, per-task-class cost ledger
(append-only JSONL at mcp-server/data/state/cost-telemetry.jsonl, cwd-
independent via PATHS.MCP_SERVER + PRISM_COST_TELEMETRY_PATH env override).
record() is SYNC + never-throws (TELEMETRY_DROPPED on fs failure, hot-path
safe); aggregate() is ASYNC + TRUE-streaming via readline (no whole-file
read) + INCLUDES rotated `<base>-*.jsonl` segments within the window (no
post-rotation truncation). Rotation uses an unconditionally-unique name
(<base>-<ms>-<pid>-<rand>) so the TOCTOU clobber-a-segment race is
eliminated by construction. Wired into prism_dev as cost_telemetry_record
+ cost_telemetry_aggregate; both schema-validated, async correctly awaited
in the case. 33/33 tests (23 engine incl. rotated-segment-inclusion +
corrupt-between-good + env-precedence + 100-call burst; 10 dispatcher
round-trip). tsc clean. Per-file 2-arm scrutiny PASS/PASS x3 (engine round
3 after BYTES->CHARS + cause-propagation + PATHS-anchor + readline-stream;
wiring round 2 after env-override fix replaced prod-ledger writes with tmp
ledger).

Scope correction (R7/R8/R12): spec step-3 ("instrument AISystemRouter
.route() post-call") rests on a false premise — route() is advisory only
(no post-call execution, no token/latency/cost data); instrumenting it
would write zero-data degraded records for every routing DECISION, which
is the synthetic-telemetry anti-pattern this unit exists to prevent. The
honest integration point is the hook/dispatcher boundary where the real
LLM call completes with usage data — record() is exposed via the
dispatcher for that. Spec step-5 (cron hourly rotation) is superseded by
the engine's size-based auto-rotation (the correct trigger; time-rotating
a low-volume ledger creates empty segments).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .../MultiAgentCostTelemetryEngine.test.ts          | 417 +++++++++++++++++
- .../devDispatcher.cost-telemetry-wire.test.ts      | 214 +++++++++
- .../src/engines/MultiAgentCostTelemetryEngine.ts   | 495 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  19 +
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  35 +-
- 5 files changed, 1179 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9897ba6fe107`
- Milestone envelope: `mcp-server/data/milestones/COST-CASCADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._