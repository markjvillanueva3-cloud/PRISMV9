# QUOTING-SYNERGY-MS0/U-QP-RATE-WIRE — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-RATE-WIRE (slot:charlie): quote rates from ShopConfigurationEngine, not inline stubs (G2)

**Commit:** `51110d8c66ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:45:51-05:00
**Tags:** quoting-synergy-ms0, u-qp-rate-wire, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-RATE-WIRE (slot:charlie): quote rates from ShopConfigurationEngine, not inline stubs (G2)

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-RATE-WIRE (slot:charlie): quote rates from ShopConfigurationEngine, not inline stubs (G2)

QuoteEstimatorEngine had hardcoded MACHINE_RATE_HR (cnc_mill_3axis=$85), setup
$55, programming $75 -- a silent divergence from the real rate source
(ShopConfigurationEngine, 21 JM machines w/ per-machine hourly_rate + ShopRates).
The charlie soul refuses inline-shop-rate-constants; this kills the dead wire.

Dependency-injection design (additive, zero regression to the 3 importers):
- QuoteEstimateInput gains optional machine_rate_hr/setup_rate_hr/programming_rate_hr;
  all 4 usage sites read `input.X ?? <inline planning default>`. No injection ->
  byte-identical old behavior (regression-locked: 85/55/75 with no override).
- InstantQuoteEngine populates them from the active shop via a machine-type ->
  shop-type taxonomy bridge (cnc_mill_3axis|vertical_mill -> "VMC", etc.), reading
  getMachines() per-machine rate + getRates() setup/programming. Silent fallback to
  planning defaults when the shop lacks a machine type; fail-loud log on lookup error;
  "ShopConfigurationEngine" recorded in physics_engines_used when any shop rate applied.
  The inline table is now an explicit planning-default fallback for non-shop machines.

Effect: a JM 3-axis-mill quote now uses VMC-01 $80 (real) not inline $85; setup
$65, programming $85 from the shop. 6 tests (injection + regression-lock + machining
cost drives output + InstantQuote E2E reading ShopConfig VMC/Lathe rates from the
canonical source -- NO hardcoded $/hr, soul-compliant). 2-reviewer per-file gate
PASS x2 (code-analyzer 9/10 + independent), 0 P0/P1. tsc-clean.

NOTE (separate, NOT this unit): a pre-existing ERPIntegrationEngine taylor_C
null-access (physics-fed-costing.test 4 fail at clean HEAD, proven via git-stash)
is recorded for hotel in reference_erp_taylorc_nullaccess_2026_06_12.
```

## Files touched (4)
- mcp-server/src/__tests__/QuoteRateWire.test.ts | 93 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/InstantQuoteEngine.ts   | 46 ++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/QuoteEstimatorEngine.ts | 17 ++++++++++++----
- 3 files changed, 152 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 51110d8c66ac`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._