# BUILD-FIX/U-WEDM-NEURAL-DUTY-FIXTURE — [MAIN-FORCE] [BUILD-FIX]/U-WEDM-NEURAL-DUTY-FIXTURE (slot:india): conform 2 stale duty-cycle fixtures in the WEDM neural test to the canonical max_duty_rough ceiling -> 38/38 (was 36/38)

**Commit:** `581269da0a64` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T05:32:09-05:00
**Tags:** build-fix, u-wedm-neural-duty-fixture, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-FIX]/U-WEDM-NEURAL-DUTY-FIXTURE (slot:india): conform 2 stale duty-cycle fixtures in the WEDM neural test to the canonical max_duty_rough ceiling -> 38/38 (was 36/38)

## Body
```
[MAIN-FORCE] [BUILD-FIX]/U-WEDM-NEURAL-DUTY-FIXTURE (slot:india): conform 2 stale duty-cycle fixtures in the WEDM neural test to the canonical max_duty_rough ceiling -> 38/38 (was 36/38)

WHAT: 2 of 38 WEDMProgramNeuralAnalysisEngine.predictWireBreakRisk tests were RED
(surfaced sweeping india's CrossProcess+Neural surface, 1 red file of 95):
"should detect high duty cycle risk" + "should provide mitigations for risks".

ROOT CAUSE (engine correct, test stale -- R7 source-of-truth wins): predictWireBreakRisk
flags a duty-cycle wire-break factor only when dutyCycle > EDM_PHYSICS.wire_safety.max_duty_rough
(= 0.55, canonical physics SoT, imported not inlined -- WEDMProgramNeuralAnalysisEngine.ts:1348-1353).
The fixtures used on_time 10 / off_time 10 = 50% duty, which is BELOW the 0.55 break-risk
ceiling, so the engine correctly did NOT flag it -- making the tests' "50% - too high"
expectation inconsistent with the canonical constant. (50% is above the ~18-25% typical
operating range but below the wire-break ceiling; those are distinct.)

FIX (test-file only; NO physics constant or engine changed; no WEDM-physics guess --
pure arithmetic vs the existing 0.55 SoT): both fixtures -> on_time 15 / off_time 5 = 75%
duty (0.75 > 0.55). Test 1: duty contribution min(30,(0.75-0.55)/0.55*100)=30 -> risk_score
30 > 20, "High duty cycle" factor present. Test 2: duty(30)+tension2500(20)=50 -> risk_level
"high" != "low", mitigations present. Strengthens both (now exercise a genuine high-duty
wire-break risk), no assertion weakened (R12).

VERIFY: 36/38 -> 38/38. Per-file 2-arm scrutiny (test-review-agent + code-analyzer) PASS,
0 findings -- both confirmed engine correct + constants.ts/engine byte-unchanged (git-diff
scoped to the test file) + no green-washing. Safety ceiling 0.55 left intact (mike/safety SoT).
```

## Files touched (2)
- mcp-server/src/__tests__/wedm-program-neural-analysis.test.ts | 8 ++++----
- 1 file changed, 4 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 581269da0a64`
- Milestone envelope: `mcp-server/data/milestones/BUILD-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._