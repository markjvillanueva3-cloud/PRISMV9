# OSCAR-SFC-9AXIS-MS0/U-OSC-SFC-PERF — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SFC-PERF (slot:oscar): defer fire-and-forget telemetry off calculate() hot path — ~2500ms/call -> 0.9ms/call

**Commit:** `7d169b3c92cb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:10:41-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-sfc-perf, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SFC-PERF (slot:oscar): defer fire-and-forget telemetry off calculate() hot path — ~2500ms/call -> 0.9ms/call

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SFC-PERF (slot:oscar): defer fire-and-forget telemetry off calculate() hot path — ~2500ms/call -> 0.9ms/call

Root cause of the documented ~2.5s/call (reference_ultimatespeedfeed_calculate_slow_2026_06_01) + the vitest EPERM hang: captureSFC ran a SYNCHRONOUS OutcomeCaptureBus disk-append (+EPERM retry under fleet contention) on the calculate() hot path. Return value was unused (pure fire-and-forget). Deferred via setImmediate (setTimeout fallback) so the calc is pure-CPU; telemetry still flushes next tick on the long-running server.

~2700x faster — SaaS-critical (a calculator API at 2.5s/request is unsellable). Verified: 0.9 ms/call over 10 calls + all 6 flagship fixes still PASS.
```

## Files touched (2)
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts | 33 +++++++++++++++++++++++----------
- 1 file changed, 23 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- till flushes next tick on the long-running server.
- till PASS.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7d169b3c92cb`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._