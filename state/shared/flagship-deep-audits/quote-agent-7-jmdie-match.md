# Quote Deep Audit — Agent 7: JM Die Historical Match

## Validation Harness Status

**Status:** STUB — calibration infrastructure exists but NO JM Die harness.

**Current State:**
- `QuotingFormulaEngine.calibrateQuote()` (src/engines/QuotingFormulaEngine.ts lines 374-434) accepts historical quote/actual pairs
- Test suite has 5 calibration tests (QuotingFormulaEngine.test.ts lines 146-189) with synthetic aluminum/steel data
- **Zero tests** load JM Die invoices or actual programs
- No fixture linking real JM Die jobs (FONTANA B-1289-11, ALCOA cups, etc.) to actual invoice costs

## JM Die Calibration Data Loaded

**Available:** H:/PRISM/JM DIE/ contains 100+ customers, 509 Haas mill programs, 23 OKUMA lathe jobs
- Real programs: FONTANA, ALCOA, OPTIMAS, ITW, FASTENAL, Holo-Krome, SFS
- No machine_rates table populated for any machine (see mill-agent-7 audit: "ERP Integration — ZERO COVERAGE")
- No historical invoice database wired to PRISM

**Missing:** 
- JM Die machine rates ($/hr by machine type)
- Historical actual costs (material, labor, machine time per job)
- Material cost actuals (payables/AP logs)
- Invoice reconciliation (quoted vs. actual PO/invoice delta)

## Variance Metrics

**Tested (synthetic only):**
- Aluminum: 50% historical underquote (calibration_factor ≈ 1.5)
- Steel: consistent 20% variance
- No confidence intervals (synthetic tests assume 0.7–0.95 confidence)

**NOT tested:**
- Real JM Die aluminum vs. steel vs. inconel spreads
- Machine-specific variance (Haas vs. Okuma vs. Hurco)
- Customer-specific historical patterns (ALCOA fast-pay vs. one-off)
- Setup complexity impact on quote accuracy
- Lot-size learning curve effects (Wright's model calibrated? Unknown.)

## Score (0–100)

**42/100**

**Strengths:**
- `calibrateQuote()` engine design is sound (filters by material/operation/complexity)
- Confidence calculation accounts for sample size + variance
- QuotingFormulaEngine exports 6 formulas (ABC, learning curve, EOQ, calibration, setup complexity, scrap reserve)
- 403 quote tests across 13 files (high test count, but all synthetic)

**Gaps:**
- **CRITICAL:** No JM Die historical harness; all tests use synthetic inputs
- Machine rates not loaded (cannot compute actual $/hr cost vs. quote)
- No invoice/payables ETL pipeline wired
- Real JM Die programs (509) not used as regression fixtures
- Learning curve & setup complexity formulas not validated against actual shop data
- No variance rollup by customer or machine type
- Tolerance interaction (thin walls, tight bores) not modeled vs. actual scrap/rework

## Minimum Viable Harness (Scope)

1. Extract JM Die invoice sample (10–20 jobs, 2021–2025)
2. Load Haas VF-2 programs + actual program runtimes + invoice material/labor/machine costs
3. Wire QuotingFormulaEngine.calibrateQuote() with real historical array
4. Run quote-to-actual delta analysis: PRISM quote vs. JM Die invoice
5. Validate calibration_factor ± 10% for each machine type

**Effort:** 5–7 days (invoice extract + ETL + 10 fixture jobs + variance rollup).
