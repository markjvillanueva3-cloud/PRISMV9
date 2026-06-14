---
name: quoting-training-pipeline
type: architecture
status: live
domain: quoting
slot_owner: charlie
last_updated: 2026-05-26
links:
  - reference_quoting_calibration_u_qt10_2026_05_25
  - feedback_ai_training_first_before_revenue
  - feedback_psn_definition
---

# Quoting Training Pipeline — observable end-to-end

The autonomous calibration chain that turns JM Die file-system metadata into `active-calibration.json` factors, with full drift-audit on top. Lives in PRISM as 5 cooperating scripts under `scripts/quoting-*.mjs` plus `QuotingTrainingOrchestratorEngine` at the core.

## Stages

```
JM DIE archive walk  →  baseline-records.json  →  runOnce()  →  active-calibration.json
                                                       ↓
                                                  ledger row appended
                                                       ↓
                                                  summarizeLedger
                                                       ↓
                                                  detectDriftAlert
                                                       ↓
                                                exit code 0/1/2
```

| Stage | Script / Engine | Output | Iter |
|---|---|---|---|
| **Bootstrap** | `scripts/quoting-baseline-bootstrap.mjs` | `state/shared/quoting/baseline-records.json` | iter4 + iter7 + iter8 + **iter9** + **iter13** |
| **Train cycle** | `scripts/quoting-train-cycle.mjs` + `QuotingTrainingOrchestratorEngine.runOnce()` | `active-calibration.json` (CoV-gated) + ledger append | iter1 + iter3 + iter5 + **iter10** |
| **History summary** | `scripts/quoting-train-history-summary.mjs` | summary `{count, mape_pct_avg/p50/p95, mape_trend, cov_gate_fail_rate, safe_to_activate_rate, psi_delta_fed_total, latest_factor_path, last_run_iso}` | **iter11** |
| **Drift alert** | `scripts/quoting-train-drift-alert.mjs` | `{level: ok|warn|alert|info, reasons[], counts}` + exit code 0/1/2 | **iter12** |

## Iter9 — clean inputs (`5b370300f0`)

Extended `NON_CUSTOMER_SUBDIRS` regex catches POST PROCESSORS / _PART LIBRARY / LIBRARIES / MACROS / TEMPLATES / MASTERS / SETUPS / SAMPLES / EXAMPLES / REFERENCE / DOCS / DOCUMENTATION / MANUALS / TUTORIALS / TRAININGS / MISC + optional leading underscore. `extractCustomer()` walks forward from `JM DIE/` until first `isLikelyCustomer()` segment, so both layouts (machine-then-customer, customer-then-machine) resolve correctly. Import-safe CLI guard added so test files can import helpers without firing main(). 14/14 tests.

## Iter10 — drift-audit ledger (`acee69cad3`)

Pure-function `buildLedgerRow(result, tsIso)` exports an 11-key stable JSONL shape; `main()` appends one row to `state/shared/quoting/train-cycle-history.jsonl` after every cycle (non-fatal — ledger failure surfaces to stderr but never blocks the main result emit). Import-safe CLI guard. 13/13 tests pinning shape stability, NaN/Infinity/string handling, adversarial result shapes.

**Defensive design:** `mape_pct` `typeof number && Number.isFinite` gate, `Boolean()` coercion on flags, `Array.isArray()` check on warnings, full pass-through of null/undefined fields.

## Iter11 — closed-loop summarizer (`bd3ad1ffc7`)

`parseLedgerLines(text)` corrupt-line-tolerant JSONL reader (drops non-object JSON like `null`/arrays). `summarizeLedger(rows, windowN=20)` slices LAST N rows and emits 11-key summary. Trend detection uses least-squares slope with `|slope/yBar| < 0.01` flat-band; needs `≥3` points or returns `"insufficient"` (no false trends on cold start). Percentiles use **NIST nearest-rank** (`ceil(p*N/100)-1`) so `p95` of `[280,300,312]` returns 312 (tail), not floor-interp 300 (middle). 21/21 tests.

**Real bug caught + fixed in this iter:** original percentile formula `floor(p*(N-1)/100)` gave middle value on N=3. NIST nearest-rank is correct for drift detection.

## Iter12 — alert classifier (`b1c6a096ff`)

`detectDriftAlert(summary, thresholds?)` 3-tier precedence:

**ALERT** (P0 — exit 2, cron-greppable)
- `cov_gate_fail_rate ≥ 0.5`
- `mape_pct_p95 ≥ 500` (catastrophic)
- `mape_trend = "rising"` AND `mape_pct_avg ≥ 100`

**WARN** (P1 — exit 1)
- `cov_gate_fail_rate ≥ 0.25`
- `mape_pct_p95 ≥ 100`
- `mape_trend = "rising"` (any avg)
- `safe_to_activate_rate < 0.5`

**INFO** (P2 — exit 0)
- `count < 3` (insufficient history)
- `psi_delta_fed_total = 0` across window (PSN autonomy loop unfed)

**Same-axis dedup** between tiers prevents double-reporting (cov in ALERT suppresses cov in WARN). Threshold override + null-fallback supported. 21/21 tests.

## Iter13 — per-record signal variance (`71e08eae58`)

Replaced the flat `{1800s, $95, $50}` defaults with `deriveRecordDefaults(absPath, sizeBytes)` — path-hint > extension fallback, both case-insensitive, Windows backslash normalized. Rate by machine class (wire-EDM $110 · sinker $100 · mill $95 · Heidenhain $100 · lathe $85 · grinder $75). Time-in-cut bucketed by file size (`<50KB→600s`, `<500KB→1800s`, `<5MB→3600s`, `≥5MB→7200s`). Material spend indexed by machine class. 29/29 tests including a load-bearing "mixed-cohort yields ≥3 distinct rates × ≥3 distinct times × ≥4 distinct classes × ≥3 distinct materials" assertion.

**Effect:** training engine no longer sees a degenerate single-point input distribution. Even before Docustrata invoices replace size-byte-stub `actual_revenue_usd`, the gradient signal is ~5× richer.

## How to run the chain (manual / cron)

```bash
# Stage 1 — fresh baseline from JM Die ledger
node scripts/quoting-baseline-bootstrap.mjs --limit 100

# Stage 2 — train cycle (writes active-calibration.json + ledger row)
node mcp-server/node_modules/.bin/tsx scripts/quoting-train-cycle.mjs --json --feed-psn

# Stage 3 — drift alert (exit 2 = ALERT, 1 = WARN, 0 = OK/INFO)
node scripts/quoting-train-drift-alert.mjs --json
```

CLI exit codes are cron-friendly: a Windows Scheduled Task can grep stage 3's exit for `2` and notify the operator without parsing JSON.

## First-cycle evidence

See `state/shared/quoting/FIRST-TRAINING-CYCLE-EVIDENCE.md` (slot:charlie 2026-05-26): the chain ran end-to-end against the JM Die fleet ledger, surfaced MAPE 2108% (expected — actual_revenue_usd is a size-byte stub), CoV gated → `safe_to_activate=true` only because the factor clamped to the 0.2 safety floor. Active-calibration.json written; downstream `QuotingActiveFactorLoaderEngine` (iter9 of an earlier session) reads it.

## Why this matters (training discipline per [[feedback_ai_training_first_before_revenue]])

The operator's standing rule: train on the full JM Die corpus BEFORE chasing revenue. iter9-13 satisfies the "train continuously, even with stub data" half of that. The drift alert ensures the training loop doesn't silently degrade — if MAPE creeps rising or CoV starts gating >50% of cycles, exit code 2 surfaces the regression.

## Next high-leverage unit (DEFERRED)

**U-QP-DOCUSTRATA-ACTUAL-REVENUE** — replace the `Math.max(10, sizeBytes * 0.0001)` stub in `quoting-baseline-bootstrap.mjs` with real Docustrata invoice extractions via `DocustrataHistoricalPricingTrainerEngine`. This is the single biggest signal upgrade available — turns 2108% MAPE into real predictive error and unlocks meaningful calibration. Estimated scope: medium (engine read + extraction-record schema + bootstrap wiring + integration test).

## Wiring

- **MCP dispatcher:** none (yet). These scripts run via `node`/`tsx` from cron, not from a `prism_*` action. Future iter could add a `prism_quoting:training_cycle_run` dispatcher action that wraps the chain.
- **PSN leg:** **#1 (Obsidian brain)** captures auto-memories per Stop hook; **#11 (PRISM AI)** consumes `active-calibration.json` via `QuotingActiveFactorLoaderEngine`. The drift alert is intended PSN-leg observable (open follow-up: wire `detectDriftAlert` into a SessionStart inject when level=alert).

## Commit chain (full session 2026-05-26)

| Iter | Commit | One-line |
|---|---|---|
| 9  | `5b370300f0` | NON_CUSTOMER_SUBDIRS extension + CLI guard + 14 tests |
| 10 | `acee69cad3` | JSONL drift ledger + buildLedgerRow + 13 tests |
| 11 | `bd3ad1ffc7` | summarizeLedger + parseLedgerLines + 21 tests (NIST percentile fix) |
| 12 | `b1c6a096ff` | detectDriftAlert 3-tier classifier + 21 tests |
| 13 | `71e08eae58` | deriveRecordDefaults per-record variance + 29 tests |
| 14 | `88f6f975ae` | this wiki entry — discoverability surface |
| 15 | `4f00ed1473` | drift-alert state-file emit (`buildDriftStateFile`) + 10 tests |
| 16 | `15b09088ad` | bootstrap distribution probe (`summarizeRecordsDistribution`) + 12 tests |
| 17 | `3de92ef087` | round-trip E2E composition test (4 scenarios) |
| 18 | `3820f1ed4f` | Docustrata bridge shim (`mergeDocustrataRevenue`) + 20 tests |
| 19 | `2d4e2cfa3e` | Docustrata format validator (`validateDocustrataPayload`) + 23 tests |
| 20 | `d9f727aa06` | Docustrata synth generator (`generateSyntheticRevenueRecords`) + 21 tests |
| 21 | `cb52c38aee` | Docustrata pipeline orchestrator (`runDocustrataPipeline`) + 14 tests |
| 22 | memory file | session memory + Obsidian auto-feed |
| 23 | `f464588376` | pipeline-verify health check (`parseTapSummary` + `aggregateSummaries`) + 19 tests |

**Total iter9-23: 221 tests across 12 test files + 1 meta-runner.**

## Iter15 — drift-alert state-file (`4f00ed1473`)

`buildDriftStateFile(alert, summary, ts)` pinned 4-key shape `{schema_version:"1.0.0", ts_iso, alert, summary}`. `main()` atomic-writes via tmp+rename to `state/shared/quoting/latest-drift-alert.json` after every cycle (non-fatal — stderr surface, never blocks main exit). Dashboards / PSN legs / Stop hook injection read the current level without re-running the chain. 10/10 tests pin shape stability + null defenses + JSON roundtrip + realistic integration.

## Iter16 — bootstrap distribution probe (`15b09088ad`)

`summarizeRecordsDistribution(records, topK)` returns `{total, machineClassHisto (desc by count), timeBucketHisto (asc by seconds), topCustomers, rateRange, materialRange}`. Bootstrap `--summary` flag prints all histograms to stderr post-WROTE. Operator confirms iter13's variance injection actually produced diverse records (not single-point collapse). 12/12 tests including 5-record mixed-cohort variability assertion.

## Iter17 — round-trip E2E composition test (`3de92ef087`)

Per COMPREHENSIVE-BUILD-ENFORCEMENT R2. Chains iter13→iter16→iter10→iter11→iter12→iter15 against synthetic data with NO FS dependency. 4 scenarios PASS:
- Full chain on 6-record JM-Die-shaped cohort + 5-cycle simulated training trajectory
- Steady-state (post-Docustrata) 15-cycle MAPE 12-14% → level=ok (no false alarms)
- Empty pipeline → info-level (insufficient history)
- Degraded (rising MAPE 80→400) → ALERT precedence

**Real bug caught:** my initial `cov_gate_fail_rate=0.4` assumption was wrong (3 of 5 mapes ≥100 → gate_fail=0.6); test corrected, code unchanged. Exactly the discipline mandated.

## Iter18 — Docustrata bridge shim (`3820f1ed4f`)

`buildRevenueKey(customer, partId)` → uppercase-pipe canonical key (rejects empty/non-string). `mergeDocustrataRevenue(records, revenueMap, opts)` → `{records, report}` non-mutating overlay; matched records get `actual_revenue_usd` override AND `revenue_source: "docustrata"` flag (distinguishes from `"stub"`). `minRevenue` floor (default 1) rejects zero/negative. NaN/Infinity ignored. 20/20 tests.

This is the READ-SIDE HOOK that future iter wires the real Docustrata extractor into. Today the bridge accepts ANY Map/object so it's safe for testing.

## Iter19 — Docustrata format validator (`2d4e2cfa3e`)

`validateDocustrataPayload(raw)` → `{valid, errors, warnings, normalized:Map, stats}`. Accepts BOTH payload shapes:
1. Records-array: `{schema_version, generated_iso, source, records:[{customer, part_id, revenue}]}`
2. Flat map: `{"CUSTOMER|PART_ID": revenue, ...}`

Both normalized to single uppercase Map ready for iter18. `SUPPORTED_SCHEMA_VERSIONS` Set ({"1.0.0"} today, additive). `REVENUE_BOUNDS` Object.freeze `{min:0.01, max:10_000_000}`. Errors = disqualifying; warnings = non-fatal (records dropped, payload still usable). 23/23 tests covering both shapes + bounds + adversarial + duplicate-key warning + 5-key shape stability.

**Locks the contract iter20's actual extractor must emit. Validator runs BEFORE bridge consumption so malformed extractor output can't silently poison training.**

## Iter20 — Docustrata synth generator (`d9f727aa06`)

`generateSyntheticRevenueRecords(baselineRecords, opts)` derives validator-compliant payloads FROM baseline records using transparent cost+markup model:
```
cost     = (cycleTimeHr × machineRate) + materialSpend
markup   = baseMarkup + jitter
revenue  = cost × (1 + markup)
```

Determinism: `deterministicHashUnit(string)` FNV-1a variant → `[0,1)`. Per-customer jitter is deterministic on `(customer|part_id)`, so same input → same revenue. Reproducible for testing. Defaults: `baseMarkupPct=0.40`, `jitterPct=0.20`. 21/21 tests including full chain integration (synth→validate→bridge) + 4-domain machine-class variance.

## Iter21 — Docustrata pipeline orchestrator (`cb52c38aee`)

`runDocustrataPipeline(baselineRecords, opts)` → `{ok, stage, reason, synth, validation, merge}`. Chains synth (iter20) → validate (iter19) → bridge (iter18) in one CLI call with stage-by-stage failure preservation. Stage names: `synth | validate | bridge | done`. Exit 0 = full chain ok, 1 = any stage failed. 14/14 tests.

Operator runs `node scripts/quoting-docustrata-pipeline.mjs --baseline X --out Y --json` for the full chain.

## Iter23 — pipeline-verify health check (`f464588376`)

`parseTapSummary(text)` + `aggregateSummaries(perFile)` pure exports. `main()` auto-discovers `scripts/quoting-*.test.mjs`, spawns `node --test` sequentially against each, parses summary lines, aggregates totals, flags any file with non-zero fail count OR non-zero exit code. Cron exit codes: 0=all pass, 1=any fail, 2=discovery/runner error. 19/19 tests.

**Operator runs `node scripts/quoting-pipeline-verify.mjs --json` for single confidence number over the whole iter9-21 substrate.**

## How to run the full chain end-to-end

```bash
# Stage 0 — bootstrap clean inputs with iter13 variance + iter16 distribution probe
node scripts/quoting-baseline-bootstrap.mjs --limit 100 --summary

# Stage 1 — overlay synthetic revenues (or real Docustrata when iter20+ wires it)
node scripts/quoting-docustrata-pipeline.mjs --baseline state/shared/quoting/baseline-records.json --out state/shared/quoting/baseline-records-with-synth.json --json

# Stage 2 — train cycle (writes active-calibration.json + JSONL ledger row)
node mcp-server/node_modules/.bin/tsx scripts/quoting-train-cycle.mjs --json --feed-psn

# Stage 3 — drift alert (writes latest-drift-alert.json, cron-greppable exit)
node scripts/quoting-train-drift-alert.mjs --json

# Stage 4 — pipeline health check (all tests should pass)
node scripts/quoting-pipeline-verify.mjs --json
```

Cron-friendly: stage 3 exit 2 = ALERT, 1 = WARN, 0 = OK/INFO. Stage 4 exit 0 confirms substrate health.

## Next high-leverage unit (still DEFERRED for future iter)

**U-QP-DOCUSTRATA-EXTRACTOR-WIRE** — replace `generateSyntheticRevenueRecords` in iter21 orchestrator with the real `DocustrataHistoricalPricingTrainerEngine` extractor. The iter19 validator already locks the contract; iter21 orchestrator just swaps stage 1's data source. Everything downstream stays untouched.

## Related

[[feedback_ai_training_first_before_revenue]] · [[feedback_psn_definition]] · [[reference_quoting_calibration_u_qt10_2026_05_25]] · [[feedback_reflect_all_changes_post_update]]
