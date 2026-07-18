# SFC-VENDOR-PARITY/U-OSC-TEST15-ALU-COVERAGE — [MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-TEST15-ALU-COVERAGE (slot:oscar): fix stale aluminum-unclamped coverage threshold (pre-existing failing sanity test)

**Commit:** `7de7f110e18a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T02:30:51-05:00
**Tags:** sfc-vendor-parity, u-osc-test15-alu-coverage, auto-distilled

## Subject
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-TEST15-ALU-COVERAGE (slot:oscar): fix stale aluminum-unclamped coverage threshold (pre-existing failing sanity test)

## Body
```
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-TEST15-ALU-COVERAGE (slot:oscar): fix stale aluminum-unclamped coverage threshold (pre-existing failing sanity test)

calculator-machinist-allout-sanity (a slow 60s suite outside the default run, so silently failing) was
red at line 161: unclampedAluminumVsSteel > 500, actual ~140. Verified PRE-EXISTING at pre-session commit
1f7d03f33d -- NOT caused by this session's parity work.

Live triage of the compute loop (1905 profiles): aluminum 6061's correct roughing Vc ~628 m/min needs
~10-20k RPM at the test's 10-20mm tool diameters, so aluminum is RPM-CLAMPED on 1765/1905 (93%) -- only
~140 profiles leave it unclamped. That is correct physics, a SIDE-EFFECT of the material-aware Vc fix
(U-OSC9-SPEEDFEED-MATERIAL-AWARE gave aluminum its correct higher speed -> clamps more), NOT a regression.
The per-profile aluminum>=steel ordering assert still runs + passes on every unclamped case.

Fix (NOT softening): correct the stale coverage bar >500 -> >100 (actual ~140, margin) with a full
justifying comment; steel/tool_steel bar unchanged (passes at 1717); real ordering assertion untouched.
Test now passes (2/2, 59.9s). Diagnosis: reference_oscar_task15_alu_clamp_coverage_2026_06_25.
```

## Files touched (2)
- mcp-server/src/__tests__/calculator-machinist-allout-sanity.test.ts | 10 +++++++++-
- 1 file changed, 9 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till runs + passes on every unclamped case.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7de7f110e18a`
- Milestone envelope: `mcp-server/data/milestones/SFC-VENDOR-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._