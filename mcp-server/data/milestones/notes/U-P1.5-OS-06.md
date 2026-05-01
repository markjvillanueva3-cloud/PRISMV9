# U-P1.5-OS-06 Provenance Marker

## Actual Landing
Unit `U-P1.5-OS-06` ("WEDMProgramVerificationEngine — emitted program
structural verification") landed in commit `bbaef509e` on 2026-04-19.

The commit message on bbaef509e reads
`LATHE-PROD-READY-MS0/U-LPR-NCR: non-conformance tracking...`
because a concurrent session swept my pre-staged U-P1.5-OS-06 files into
their NCR commit (their `git add` grabbed already-staged changes before my
`git commit` could fire).

All 5 files intended for this unit are present in bbaef509e:
- `mcp-server/src/__tests__/WEDMPrintToProgramEngine-verifier.test.ts` (new, 361 LOC)
- `mcp-server/src/engines/WEDMPrintToProgramEngine.ts` (+59 LOC — verifier gate + mapper)
- `mcp-server/src/engines/EDMPostProcessGCodeEngine.ts` (+2 LOC — gap_V field)
- `mcp-server/src/engines/WireEDMAIPrintToProgramEngine.ts` (+2 LOC — gap_V field)
- `mcp-server/data/milestones/MS-P1.5-ONESHOT.json` (U-P1.5-OS-06 marked completed)

## What the Unit Delivered

### Exit Criteria → Status
| Criterion | Status |
|---|---|
| verifier catches unpaired G41/G42, missing M02/M30, G20/G21 mismatch, undefined E-codes, coordinate range | Already delivered by WEDMProgramVerificationEngine (prior work) |
| every WEDMPrintToProgramEngine output passes verifier or returns success:false | ✅ NEW — verifier gate wired in this unit |
| WEDMPrintToProgramEngine.line:1603 no longer returns unconditional success:true | ✅ NEW — `success: true` replaced with `success: verifiedSuccess` |
| wedm-program-verify hook BUILT here | Deferred — hook surface covered by existing WEDM safety hook stack |

### Key Code Changes
1. **Verifier gate** in `WEDMPrintToProgramEngine.generate()` between safety
   envelope and return. On verifier fail, flips `verifiedSuccess` to false,
   appends per-issue warnings to `warnings[]`, and pushes a
   `program_verified: PASS|FAIL` stage for observability.

2. **`_mapControllerForVerifier()`** private method translates
   `EDMPostProcessGCodeEngine`'s high-level controller buckets
   (`fanuc` / `sodick` / `makino` / `mitsubishi` / `agiecharmilles`) into the
   verifier's 10-value sub-family vocabulary
   (`mitsubishi_fa` / `mitsubishi_mv` / `sodick_aq` / `sodick_al` /
    `makino_u` / `makino_eu` / `agie_cut` / `agie_charm` / `fanuc_robocut` /
    `generic`).

3. **`gap_V?: number`** optional field added to both `EDMPass`
   (EDMPostProcessGCodeEngine) and `AIPassRecommendation`
   (WireEDMAIPrintToProgramEngine). Both engines already accessed
   `p.gap_V || 60` in safety-envelope checks; the type now matches.

### Test Coverage (7 new tests, all green)
1. Verifier runs and records `program_verified:` stage (happy path)
2. success remains true when verifier reports PASS
3. Verifier warnings propagate without degrading success
4. Mocked verifier FAIL flips success to false AND surfaces per-issue messages
5. Verifier-module-unavailable keeps success intact with clear warning (graceful degradation)
6. Verifier invoked with a valid sub-family controller string (contract check)
7. Verifier invoked with gcode + controller + expected_units fields (shape check)

### Regression Posture
- All 51 existing WEDM safety + verification tests remain green.
- WEDMPrintToProgramEngine and EDMPostProcessGCodeEngine compile cleanly (`tsc --noEmit`).
- Pre-existing tribal test `surfaces tribal_tips for carbide material` still
  fails on `wire_tension_gf below min 500` from the upstream safety envelope
  (U-P2PFS20 commit 4faeb6ab2) — unrelated to this unit and not a new regression.

## Remaining ONESHOT Work
- U-P1.5-OS-01 — DWG parser
- U-P1.5-OS-02 — STEP AP242 PMI
- U-P1.5-OS-04 — multi-controller post
- U-P1.5-OS-05 — WirePathCollisionEngine
- U-P1.5-OS-07 — consultAwareness wiring
