# STUB-HUNT-MS0/U-STUB-HUNT-04-MILL-PROGRAM-ANALYZER — [MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-04-MILL-PROGRAM-ANALYZER (slot:bravo iter25, mill-galaxy): restore MillProgramAnalyzerEngine.ts from 14-line stub (U-EFF25 placeholder). Original returned {ok:false, stub:true, bytes:program.length}. millDispatcher routes 4 actions here (analyze/validate/validateSetup/analyzeSPC) — all received the stub. Real implementation: analyze() parses G/M-codes from program text (zero-padded usage tally, tool changes via M06, coolant states via M07/08/09, feed/spindle ranges from F/S words, missing-coolant + empty-program warnings); validate() = analyze + ok flag; validateSetup() defers physics to MillingForceEngine.verifyPower (canonical Kienzle imported from src/physics/constants.ts per bravo-soul rule — NEVER inlined) + ω sigmoid proxy 1/(1+(req/max)^4) + S(x) blended omega+sfRatio + shop_floor Ω≥0.95 S(x)≥0.98 default gate (overridable); analyzeSPC() computes mean+sigma+Cp+Cpk per ISO 22514 ±3σ + within-spec check + NaN/Infinity filtering. 16/16 PASS vitest hermetic (6 analyze + 1 validate + 2 validateSetup pass/fail + 6 SPC + 1 class identity). Fail-loud per R12 on non-string program + non-array measurements. Eliminates the 2nd-largest mill-domain stub flagged in -size <2k scan. STUB-HUNT progress: 4 of N rescued — BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer (~600 LOC + 73 tests cumulative).

**Commit:** `30521f265add` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:00:45-05:00
**Tags:** stub-hunt-ms0, u-stub-hunt-04-mill-program-analyzer, auto-distilled

## Subject
[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-04-MILL-PROGRAM-ANALYZER (slot:bravo iter25, mill-galaxy): restore MillProgramAnalyzerEngine.ts from 14-line stub (U-EFF25 placeholder). Original returned {ok:false, stub:true, bytes:program.length}. millDispatcher routes 4 actions here (analyze/validate/validateSetup/analyzeSPC) — all received the stub. Real implementation: analyze() parses G/M-codes from program text (zero-padded usage tally, tool changes via M06, coolant states via M07/08/09, feed/spindle ranges from F/S words, missing-coolant + empty-program warnings); validate() = analyze + ok flag; validateSetup() defers physics to MillingForceEngine.verifyPower (canonical Kienzle imported from src/physics/constants.ts per bravo-soul rule — NEVER inlined) + ω sigmoid proxy 1/(1+(req/max)^4) + S(x) blended omega+sfRatio + shop_floor Ω≥0.95 S(x)≥0.98 default gate (overridable); analyzeSPC() computes mean+sigma+Cp+Cpk per ISO 22514 ±3σ + within-spec check + NaN/Infinity filtering. 16/16 PASS vitest hermetic (6 analyze + 1 validate + 2 validateSetup pass/fail + 6 SPC + 1 class identity). Fail-loud per R12 on non-string program + non-array measurements. Eliminates the 2nd-largest mill-domain stub flagged in -size <2k scan. STUB-HUNT progress: 4 of N rescued — BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer (~600 LOC + 73 tests cumulative).

## Body
```
[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-04-MILL-PROGRAM-ANALYZER (slot:bravo iter25, mill-galaxy): restore MillProgramAnalyzerEngine.ts from 14-line stub (U-EFF25 placeholder). Original returned {ok:false, stub:true, bytes:program.length}. millDispatcher routes 4 actions here (analyze/validate/validateSetup/analyzeSPC) — all received the stub. Real implementation: analyze() parses G/M-codes from program text (zero-padded usage tally, tool changes via M06, coolant states via M07/08/09, feed/spindle ranges from F/S words, missing-coolant + empty-program warnings); validate() = analyze + ok flag; validateSetup() defers physics to MillingForceEngine.verifyPower (canonical Kienzle imported from src/physics/constants.ts per bravo-soul rule — NEVER inlined) + ω sigmoid proxy 1/(1+(req/max)^4) + S(x) blended omega+sfRatio + shop_floor Ω≥0.95 S(x)≥0.98 default gate (overridable); analyzeSPC() computes mean+sigma+Cp+Cpk per ISO 22514 ±3σ + within-spec check + NaN/Infinity filtering. 16/16 PASS vitest hermetic (6 analyze + 1 validate + 2 validateSetup pass/fail + 6 SPC + 1 class identity). Fail-loud per R12 on non-string program + non-array measurements. Eliminates the 2nd-largest mill-domain stub flagged in -size <2k scan. STUB-HUNT progress: 4 of N rescued — BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer (~600 LOC + 73 tests cumulative).
```

## Files touched (3)
- .../__tests__/MillProgramAnalyzerEngine.test.ts    | 159 +++++++++++++
- .../src/engines/MillProgramAnalyzerEngine.ts       | 251 ++++++++++++++++++++-
- 2 files changed, 403 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 30521f265add`
- Milestone envelope: `mcp-server/data/milestones/STUB-HUNT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._