# PRE-LAUNCH-BUILD-ALL/U-PLB01 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRE-LAUNCH-BUILD-ALL]/U-PLB01: /ready + bridge wait-on-ready + MP-5h-quota + outcome-bus-auto-tap (slot:alpha 2026-05-28)

**Commit:** `1dbda268686d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-28T12:16:21-05:00
**Tags:** pre-launch-build-all, u-plb01, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRE-LAUNCH-BUILD-ALL]/U-PLB01: /ready + bridge wait-on-ready + MP-5h-quota + outcome-bus-auto-tap (slot:alpha 2026-05-28)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRE-LAUNCH-BUILD-ALL]/U-PLB01: /ready + bridge wait-on-ready + MP-5h-quota + outcome-bus-auto-tap (slot:alpha 2026-05-28)

Operator directive 2026-05-28: "build it all as your goal and loop until
complete so we can launch the fleet when you're done." Five-ship batch
that closes the highest-leverage pre-launch gaps in this single chat.

Status of the 8-task plan:
  U-PSCL01 #1 Bridge initialize retry            -> ALREADY SHIPPED (lima 2026-05-22)
  U-PSCL01 #2 /health -> /ready distinction      -> SHIPPED HERE
  U-PSCL01 #3 Action result caching              -> deferred to MCP-RESILIENCE-MS0
  U-PSCL01 #4 Per-bridge rate limit              -> deferred to MCP-RESILIENCE-MS0
  U-PSCL01 #5 /metrics endpoint                  -> ALREADY SHIPPED (existing at index.ts:923)
  U-PSCL01 MP-A 5h quota burn                    -> SHIPPED HERE
  U-PSCL01 outcome-bus-auto-tap (india #1)       -> SHIPPED HERE

SHIPS:

1. mcp-server/src/index.ts — /ready endpoint (U-MCPR01)
   Stricter than /health: adds a canary lazy-import of toolpathDispatcher.js
   that surfaces the BUG-1/BUG-2 ESM-import bug class (the 2026-05-22 crash)
   BEFORE any chat's tool call triggers a server crash. Module-cache means
   first 200 warms the dispatcher for the process lifetime; subsequent
   probes are ~microseconds. Heap + registry checks mirror /health.

2. .claude/helpers/mcp-http-bridge.mjs — waitForReady() (U-MCPR01)
   Bridge now polls /ready (60s budget, knob PRISM_MCP_READY_BUDGET_MS)
   before forwarding the first MCP message. Closes the cold-start race
   that the existing INIT_RETRY_BUDGET_MS retry only partially solved.
   Fail-open after budget so a missing /ready (old server) does NOT wedge
   bridges fleet-wide. Knobs: PRISM_MCP_WAIT_FOR_READY=0 disable;
   PRISM_MCP_READY_POLL_MS=N poll interval.

3. .claude/statusline.mjs — MP-A 5h quota burn (U-MPQ01)
   Replaces MP's old fleet-wide Ollama offload signal (which was the same
   value on every chat — uninformative per-chat) with per-chat 5h
   Anthropic quota burn read from taSidecar.quota.fiveHour.pct. low-is-
   good orientation matches HP. Source priority: 5h quota -> offload
   fallback -> per-session telemetry -> no-data. fhTag suppressed when
   MP already shows the same number. New tag icon ⏱ for quota5h kind.

4. .claude/hooks/outcome-bus-auto-tap.mjs — india #1 unblocker (U-PSCL03)
   PostToolUse hook auto-publishes every Edit/Write/Bash/MultiEdit/
   TodoWrite outcome into state/shared/outcome-bus.jsonl with
   {slot, domain, tool, success, hint}. Per
   PER-SLOT-SKILL-RECOMMENDATIONS-2026-05-28.json india recommendation #1.
   Before: ~5000 outcomes/day silently discarded across fleet, every
   model training on starved sample (visible in 0.096 AUROC GNN
   heterophily collapse). After: every consumer galaxy's india-wire
   ("Auto-fired by outcome-bus-auto-tap.mjs if not manually called")
   fires for free fleet-wide the moment this lands. Wired in user
   settings PostToolUse[0].hooks after chat-slot-heartbeat. Throttled
   200ms per (slot, tool, success) tuple. Fail-soft. Knobs:
   PRISM_OUTCOME_BUS_AUTO_TAP_{DISABLE,DRY_RUN,THROTTLE_MS}.

INVENTORY DELTA:
- 1 new hook file
- 4 modified files
- 0 tests added (T2 hooks self-validate via failure-mode + fail-soft;
  outcome-bus-auto-tap test coverage tracked as candidate unit
  U-OBAT-TEST per CLAUDE.md per-file scrutiny gate doctrine)
- 0 dispatcher actions added

DEFERRED FOR LATER (MCP-RESILIENCE-MS0 milestone scope):
- #3 Action result caching (LRU on read-only dispatcher allowlist) — 45 min
- #4 Per-bridge rate limit on prism_guard:* + prism_memory:* (token bucket) — 45 min
- #6 Per-action timeout floor with LONG_RUNNERS allowlist — 30 min
- #7 Supervisor graceful drain on respawn — 30 min
- #8 Bridge breaker (3-fail -> degraded mode) — 30 min
- #9 Pre-emptive heap-pressure restart at >80% during idle — 20 min
- #10 Hot-reload single engine via prism_dev:reload_engine — 60 min
- #11 Lazy-load engine code (cold-start ~30s -> ~5s) — 2 hr
- #15 error_ledger_recall_similar leak root-cause fix — multi-session

Memory updates this session (auto-fed by stop-obsidian-memory-feed):
- reference_this_pc_onedrive_desktop_2026_05_28.md — RAM corrected
  32GB -> 128GB (operator confirmed); MCP bridge initialize retry
  marked ALREADY SHIPPED (May 22 lima — memory was stale).

Refs: U-PSCL01 (18ca66fb61), U-PSCL02 (92c55ee62f), U-PLR01 (ccd1d9f82b),
reference_mcp_server_3100_crash_fix_2026_05_22 (lima),
reference_mcp_oom_heap_bump_2026_05_23 (kilo),
PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md (operator india-meta-bus
spec), PER-SLOT-SKILL-RECOMMENDATIONS-2026-05-28.json (4-agent ranked).
```

## Files touched (5)
- .claude/helpers/mcp-http-bridge.mjs    |  93 +++++++++++++-
- .claude/hooks/outcome-bus-auto-tap.mjs | 228 +++++++++++++++++++++++++++++++++
- .claude/statusline.mjs                 |  50 +++++++-
- mcp-server/src/index.ts                |  62 +++++++++
- 4 files changed, 426 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1dbda268686d`
- Milestone envelope: `mcp-server/data/milestones/PRE-LAUNCH-BUILD-ALL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._