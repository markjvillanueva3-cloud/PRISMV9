# Quote Deep Audit — Agent 5: Tests

## Coverage (files, it() count)
- **Test Files**: 13 (Quote*.test.ts, LatheAutoQuote, WEDM, Additive, orchestrator)
- **Total it() Blocks**: 403 distributed across 13 files
  - InstantQuoteEngine: 26 tests
  - QuoteToShipOrchestratorEngine: 140 tests (27-stage pipeline)
  - AdditiveQuoteEngine: 65 tests
  - LatheAutoQuoteFromPrintEngine: 32 tests
  - WEDMQuoteBridgeEngine: 21 tests
  - QuoteRevisionEngine: 28 tests
  - Others (routes, lifecycle): 91 tests

## Variability Matrix Coverage
✅ **Happy path** — Simple 6061 bracket at qty=10; validated unit_price, total_price, confidence bounds
✅ **Multi-operation jobs** — LatheAutoQuote covers face/turn/groove; WEDM tests depth/wire costs; Additive tests multi-layer
✅ **Volume scaling** — Qty breaks at [1, 5, 10, 25, 50, 100]; Wright's Law learning curve (LR=0.85); setup amortization tested
✅ **Material cost variability** — N (aluminum), P (steel), S (Inconel) ISO groups; aluminum vs titanium speed multipliers (3x)
✅ **Machine rate scenarios** — Rate_per_hr in [85–95]/hr; expensive ops tested; overhead/margin separation
✅ **Setup amortization** — Setup cost per unit decreases >90% qty1→qty100; explicit unit_cost=setup/qty tests
✅ **Margin sensitivity** — Rush multiplier isolates margin-only bump; margin_pct tested separately
✅ **Edge cases** — NaN/Infinity handling; zero cost; negative qty clamped to 1; missing geometry warnings
❌ **Adversarial inputs** — Partial coverage: NaN trap exists; Infinity not explicitly tested for negative results

## Reference Value Sourcing
- **JM Die**: Referenced in CAMX-MS21 & lifecycle tests (2 Shop Rd, Addison IL)
- **Historical**: No explicit JM Die historical quote matching; tests use synthetic inputs
- **Benchmarks**: Missing industry baselines (Hougen tables, MfgCost Guide)
- **Confidence intervals**: Computed via RSS (root-sum-square) in WEDM tests; CI95 bounds validated in InstantQuote

## Stub Assertions
- **QuoteToShipOrchestratorEngine**: 27 stages tested for stub normalization (lines 75–119)
- **Fail on required stubs**: DFMFeedbackEngine stub rejection; error message captured
- **Skip optional stubs**: MakeVsBuyDecisionEngine stub logged as warning; stage skipped
- **No stub-backed assertions**: All assertions require real engine output, not placeholder values

## Score (0–100)
**72/100**

**Strengths:**
- 403 tests across 13 files (high coverage count)
- Comprehensive multi-operation support (lathe, mill, WEDM, additive)
- Volume amortization + Wright's Law validated
- Confidence bounds & uncertainty propagation tested (RSS formula verified)
- Stub detection prevents false-positive quotes
- Quantity breaks monotonic; margin isolation verified

**Gaps:**
- No JM Die historical quote reconciliation (synthetic inputs only)
- Infinity payoff not tested (asymptotic behavior)
- Missing Hougen/MfgCost benchmark anchoring
- Machine selection (Haas vs Okuma) not varied in quotes
- No adversarial time-series (oscillating rates, tool wear spikes)
- Tolerance interaction with cost (thin walls, tight bores) coverage incomplete
