# QUOTING-SYNERGY-MS0/U-QP-MARGIN-FLOOR-GATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-MARGIN-FLOOR-GATE (slot:charlie): margin-floor gate on every quote-emitting path

**Commit:** `b5886a26e288` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:09:11-05:00
**Tags:** quoting-synergy-ms0, u-qp-margin-floor-gate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-MARGIN-FLOOR-GATE (slot:charlie): margin-floor gate on every quote-emitting path

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-MARGIN-FLOOR-GATE (slot:charlie): margin-floor gate on every quote-emitting path

Closes charlie's soul #1 refuse ("emitting-customer-quote-without-margin-floor-gate").
The live quoting surface had NO margin floor — discount stacking (volume + repeat +
tier) could erode a quote's margin arbitrarily with no guard
(reference_quoting_margin_floor_gate_gap_2026_06_09). The only minMargin (0.20) was a
dead constant in the @deprecated QuotingEngine.

QuoteEstimatorEngine now gates BOTH quote-emitting paths (R15 — wire to all surfaces):
- estimate(): after actualMargin, if margin < floor → pushes a WARN to dfm_warnings +
  sets pricing.below_margin_floor. WARN+flag, never silent-emit, never auto-clamp/reject
  (R12 fail-loud; a quoting tool surfaces, the operator decides).
- estimateCalibrated path: re-evaluates the gate against the CALIBRATED margin (not
  base's), so a calibration that erodes margin across the floor is still flagged.
- Floor is CALLER-SUPPLIED via new input.margin_floor_pct (canonical, sourced from
  ShopConfigurationEngine by the dispatcher) with a documented DEFAULT_MARGIN_FLOOR_PCT=20
  fallback — NOT a scattered inline margin literal (soul: inline-shop-rate-or-margin-
  constants). 20% sits below all tier targets (A30/B35/C40/new38) so it only trips on
  discount-stacked quotes. Holistic margins-to-ShopConfig refactor tracked separately.

Result type gains pricing.{below_margin_floor:boolean, margin_floor_pct:number}.

4 R9 tests (deterministic via margin_floor_pct override, not cost-model reverse-eng):
healthy→not flagged + floor echoed; unmeetable 99% floor→flagged + exactly one warning
citing the real margin; 0% floor→never flags; strict-< boundary (==margin no flag,
+1 flags). 4/4 pass; existing QuoteEstimator + calibrated suites unregressed.

NOTE (R12): quoting-system.test.ts "NRE items amortization" is RED but PRE-EXISTING
(verified by stashing this edit — still fails), unrelated to this change, separate
in-lane follow-up.

Verify: cd mcp-server && npx vitest run src/__tests__/QuoteEstimatorEngine.marginFloor.test.ts (4/4)
```

## Files touched (4)
- mcp-server/src/__tests__/CimcoVerificationBridgeEngine.test.ts         | 110 ++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/post-processor/CimcoVerificationBridgeEngine.ts | 170 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/cimcoActionSchemas.ts                           |  64 ++++++++++++++++++++++
- 3 files changed, 344 insertions(+)

## Lessons surfaced in commit body
- till flagged.
- till fails), unrelated to this change, separate

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b5886a26e288`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._