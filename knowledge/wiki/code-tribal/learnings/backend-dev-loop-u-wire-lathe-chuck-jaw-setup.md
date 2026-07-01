# BACKEND-DEV-LOOP/U-WIRE-LATHE-CHUCK-JAW-SETUP — [MAIN] [BACKEND-DEV-LOOP]/U-WIRE-LATHE-CHUCK-JAW-SETUP: wire LatheChuckJawSetupEngine -> turning-dispatcher

**Commit:** `63dc1e34cee7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T00:38:48-05:00
**Tags:** backend-dev-loop, u-wire-lathe-chuck-jaw-setup, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-WIRE-LATHE-CHUCK-JAW-SETUP: wire LatheChuckJawSetupEngine -> turning-dispatcher

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-WIRE-LATHE-CHUCK-JAW-SETUP: wire LatheChuckJawSetupEngine -> turning-dispatcher

Wires the 156-LOC LATHE-PRO-MS11 soft-jaw setup calculator (bore + grip + centrifugal-lift safety, ISO-16156 + NIST-SP-960-18 compliant). Engine had 0 dispatcher refs. New actions: lathe_chuck_jaw_compute, lathe_chuck_jaw_stats. 17/17 PASS.

Physics invariants verified: bore = part_od - 2*springback (formula); min_grip = max(3mm, 0.2*OD) per ISO 16156 (10mm for 50mm part, 3mm floor for 12mm part); recommended_grip = 1.5*min (50% margin); operating_rpm > rated returns operating_rpm_safe=false + RPM warning; use_master_pressure=false adds master-pressure recommendation; step_required toggles step_face_depth_mm field; heavier clamp force MUST shrink bore (monotonicity catches formula regression even when rounding loses precision).

Test-fixture lesson: strict less-than  false-fails when springback rounds to 0 at 3 decimals. Loosened to less-than-or-equal + ADDED monotonicity assertion (heavier clamp → smaller bore) — the right way to keep coverage strong without false alarms. Per R12: 'fix the test, never weaken — but DO add a stronger complementary check'.

Session total: 14 units / 46 new MCP-callable lathe actions. Iter 14/30.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/U-WIRE-LATHE-CHUCK-JAW-SETUP.test.ts | 167 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     |  22 +++
- .../src/tools/dispatchers/turningDispatcher.ts     |  23 +++
- 3 files changed, 212 insertions(+)

## Lessons surfaced in commit body
- lesson: strict less-than  false-fails when springback rounds to 0 at 3 decimals. Loosened to less-than-or-equal + ADDED monotonicity assertion (heavier clamp → smaller bore) — the right way to keep coverage strong without false alarms. Per R12: 'fix the test, never weaken — but DO add a stronger complementary check'.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 63dc1e34cee7`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._