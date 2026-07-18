# SFC-OPTIMIZE-FOR/U-SFC-OPTIMIZE-FOR-REQUEST — [MAIN-FORCE] [SFC-OPTIMIZE-FOR]/U-SFC-OPTIMIZE-FOR-REQUEST (slot:oscar): wire optimize_for through the SFC web request layer (types + buildSfcCalcRequest)

**Commit:** `ede6ac6102c8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T21:51:52-05:00
**Tags:** sfc-optimize-for, u-sfc-optimize-for-request, auto-distilled

## Subject
[MAIN-FORCE] [SFC-OPTIMIZE-FOR]/U-SFC-OPTIMIZE-FOR-REQUEST (slot:oscar): wire optimize_for through the SFC web request layer (types + buildSfcCalcRequest)

## Body
```
[MAIN-FORCE] [SFC-OPTIMIZE-FOR]/U-SFC-OPTIMIZE-FOR-REQUEST (slot:oscar): wire optimize_for through the SFC web request layer (types + buildSfcCalcRequest)

Request-layer increment of the optimize_for vertical slice, on the proven engine
core (U-SFC-OPTIMIZE-FOR-ENGINE). The page <select> UI is the next iter.

- SfcCalculateRequest gains optimize_for?: "cost"|"balanced"|"productivity" (exact
  union match with the engine SFCInput.optimize_for -- no field-name drift).
- buildSfcCalcRequest takes an optional 5th optimizeFor and forwards it only when
  truthy (absent -> engine default "balanced"); mirrors the machine-limit omit idiom.
- 2 tests (forwards all 3 goals; omits when none). 6/6 web tests, web tsc-clean.

Non-orphan + zero-regression: the engine already consumes the field, the sole
production caller (SfcCalculatorPage.tsx:134, 4-arg) yields a byte-identical request.
Both scrutiny arms traced the full survive-path (route req.body -> sfc_calculate
.passthrough() schema -> normalizeParams additive -> dispatcher forwards params ->
sfcCalculate:772). Per-file 2-arm PASS.
```

## Files touched (4)
- mcp-server/web/src/__tests__/buildSfcRequest.test.ts | 12 ++++++++++++
- mcp-server/web/src/components/sfc/buildSfcRequest.ts |  7 +++++++
- mcp-server/web/src/types/sfc.ts                      |  4 ++++
- 3 files changed, 23 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ede6ac6102c8`
- Milestone envelope: `mcp-server/data/milestones/SFC-OPTIMIZE-FOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._