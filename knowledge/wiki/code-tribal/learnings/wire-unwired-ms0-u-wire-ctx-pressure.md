# WIRE-UNWIRED-MS0/U-WIRE-CTX-PRESSURE — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CTX-PRESSURE: ContextWindowPressureEngine → prism_context (4 actions)

**Commit:** `351ccc680891` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T00:04:02-05:00
**Tags:** wire-unwired-ms0, u-wire-ctx-pressure, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CTX-PRESSURE: ContextWindowPressureEngine → prism_context (4 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CTX-PRESSURE: ContextWindowPressureEngine → prism_context (4 actions)

Files
  mcp-server/src/tools/dispatchers/contextDispatcher.ts            +48 LOC
  mcp-server/src/schemas/contextActionSchemas.ts                   +41 LOC
  mcp-server/src/__tests__/contextDispatcher.contextPressure.test.ts +212 LOC (14 cases, 14/14 PASS)

What ships
  Engine unmodified. Stateful singleton (contextWindowPressureEngine
  accumulates a sliding window of 50 token samples for rate calc).
  Wires 4 actions:
    context_pressure_record               tokens + optional timestamp     → { recorded, timestamp }
    context_pressure_read                 currentTokens                    → PressureReading (also records as side-effect)
    context_pressure_optimal_compaction   (no params)                      → { shouldCompactNow, idealUtilization, reason }
    context_pressure_reset                (no params)                      → { reset: true }

Why prism_context
  Pure context-window observability — sits with compact_* and parallel_* in
  the prism_context token-cost-optimization neighborhood. BUILD_STATE
  suggested prism_forming but that's wrong (forming is sheet-metal); the
  module docstring + status enum (green/yellow/orange/red Claude session
  pressure) is unambiguously context-management.

Stateful contract documented
  All four actions operate on the process-shared singleton. Operators
  must call context_pressure_reset at scenario boundaries to avoid sample
  pollution across sessions; the test suite uses reset in beforeEach for
  every case.

Coverage (14 cases — concrete utilization fractions, no toBeDefined stubs)
  record (2):
    * explicit timestamp echoed back, recorded:true
    * omitted timestamp auto-assigned in [before, after] Date.now() bracket
  read (4 status bands at canonical utilization fractions on 200K maxTokens):
    * 30% (60K)  → green   + 'No action needed'
    * 60% (120K) → yellow  + '/slim'
    * 80% (160K) → orange  + '/compact soon'
    * 95% (190K) → red     + Critical /compact OR /handoff
  optimal_compaction (4):
    * pre-data                       → 'Insufficient data', idealUtilization 0.7
    * latest >85% AND rate<2000/min  → 'Over threshold', idealUtilization 0.85
    * util<70% with samples           → 'Healthy — no compaction needed'
    * util>60% AND rate>2000/min     → 'High burn rate — compact early', idealUtilization 0.6
  reset (1):
    * after reset, optimal_compaction reverts to 'Insufficient data'
  adversarial (3):
    * record rejects negative tokens (nonnegative())
    * read rejects missing currentTokens (required)
    * optimal_compaction rejects extra keys (.strict())

Test debug note
  First-pass 'Over threshold' test had rate=300000/min (5K tokens over 1s)
  which triggers the HIGHER-PRIORITY 'High burn rate' branch instead.
  Engine checks rate>2000 FIRST. Fixed by widening the timestamp delta to
  60001ms with only 1K token delta → rate ≈ 1000/min, below the burn-rate
  cutoff, so the over-threshold branch fires as intended. The lesson is
  encoded in the test fixture (60001ms timestamp delta + comment).

Pre-stage audit
  47 raw added lines on dispatcher (all WIRE-UNWIRED-MS0/U-WIRE-CTX-PRESSURE
  scope), 41 added on schemas, 212 new test file — verified no peer-stage
  sweep (lesson from U-WIRE-CADBRIDGE 2026-05-17).

Action enum count: prism_context 81 → 85 (+4).
```

## Files touched (4)
- .../contextDispatcher.contextPressure.test.ts      | 240 +++++++++++++++++++++
- mcp-server/src/schemas/contextActionSchemas.ts     |  41 ++++
- .../src/tools/dispatchers/contextDispatcher.ts     |  48 +++++
- 3 files changed, 329 insertions(+)

## Lessons surfaced in commit body
- tilization, reason }
- wrong (forming is sheet-metal); the
- tilization fractions, no toBeDefined stubs)
- tilization fractions on 200K maxTokens):
- tilization 0.7

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 351ccc680891`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._