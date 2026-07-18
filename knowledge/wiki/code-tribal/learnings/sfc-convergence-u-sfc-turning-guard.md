# SFC-CONVERGENCE/U-SFC-TURNING-GUARD — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-TURNING-GUARD (slot:oscar): R9 turning-correctness guard on the convergence target + document why the bug survived

**Commit:** `9bc424a1b86e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T14:40:52-05:00
**Tags:** sfc-convergence, u-sfc-turning-guard, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-TURNING-GUARD (slot:oscar): R9 turning-correctness guard on the convergence target + document why the bug survived

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-TURNING-GUARD (slot:oscar): R9 turning-correctness guard on the convergence target + document why the bug survived

Adds UltimateSpeedFeed-turning-correctness.test.ts (4 tests) encoding the turning-physics
INTENT the production orchestrator violates: Vc is set by the WORKPIECE diameter, so rpm =
1000*Vc/(pi*D_workpiece) and scales INVERSELY with workpiece diameter at fixed Vc. Tests:
plausible Vc (not collapsed ~1-2 m/min), rpm self-consistent with the 50mm workpiece (within
2%), rpm halves when the workpiece doubles, and Vc does not collapse on a tiny tool nose.
4/4 pass -- the engine (convergence target) is correct; this guards it from regression.

WHY the orchestrator bug survived (R9 root cause): the existing orchestrator turning tests
(speed-feed-orchestrator-dedicated.test.ts:112-150) set tool_diameter_mm but NO
workpiece_diameter_mm, and assert only RELATIVE behavior (cache monotonicity, rpm clamp,
safety-pass) -- never that turning Vc is physically correct from the workpiece diameter. A
test that cannot fail when the turning physics is wrong does not encode intent, so a 60x Vc
error passed CI. The fix (U-SFC-ORCH-TURNING / convergence) should land WITH an
intent-encoding orchestrator turning test like this one.
```

## Files touched (2)
- mcp-server/src/__tests__/UltimateSpeedFeed-turning-correctness.test.ts | 62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 62 insertions(+)

## Lessons surfaced in commit body
- wrong does not encode intent, so a 60x Vc

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9bc424a1b86e`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._