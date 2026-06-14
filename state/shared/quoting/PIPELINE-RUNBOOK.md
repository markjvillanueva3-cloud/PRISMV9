# Quoting Calibration Pipeline — Operator Runbook

**Authoritative reference:** [`knowledge/wiki/architecture/quoting-training-pipeline.md`](../../../knowledge/wiki/architecture/quoting-training-pipeline.md)

This runbook lists the exact commands an operator (or a Windows Scheduled Task) runs to exercise the full quoting calibration substrate. Audience: ops on-call + the next chat to inherit this work.

## TL;DR — single-command nightly

```powershell
# Full chain, fail-loud on alert. Exit 2 means "wake the operator."
node H:/prism/scripts/quoting-baseline-bootstrap.mjs --limit 200 --summary && `
node H:/prism/scripts/quoting-docustrata-pipeline.mjs --baseline H:/prism/state/shared/quoting/baseline-records.json --out H:/prism/state/shared/quoting/baseline-records-with-synth.json --json && `
node H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/quoting-train-cycle.mjs --json --feed-psn --baseline H:/prism/state/shared/quoting/baseline-records-with-synth.json && `
node H:/prism/scripts/quoting-train-drift-alert.mjs --json
```

Exit code of the last command is the cron signal: **0 = ok/info**, **1 = warn**, **2 = ALERT (operator needed)**.

## Stage-by-stage

### Stage 0 — bootstrap (iter9 + iter13 + iter16)

```powershell
node H:/prism/scripts/quoting-baseline-bootstrap.mjs --limit 100 --summary
```

**What it does:** walks `H:/PRISM/JM DIE/` (or the ledger jsonl), filters out machine-category + library/template subdirs (iter9 `NON_CUSTOMER_SUBDIRS`), extracts `(customer, part_id)` tuples, derives per-record variance (iter13 `deriveRecordDefaults`: machine_class + cycle_time + rate + material), writes `state/shared/quoting/baseline-records.json`. `--summary` emits machine_class + time_bucket + top_customers histograms to stderr (iter16 distribution probe).

**Flags:**
- `--limit N` — cap records emitted (default 100)
- `--scan-archive` — bypass ledger, walk JM Die directly (iter8 bypass for thin ledgers)
- `--archive-root PATH` — override `H:/PRISM/JM DIE`
- `--scan-max-depth N` — bounded BFS depth (default 5)
- `--scan-max-files N` — file cap (default 10000)
- `--out PATH` — output file (default `state/shared/quoting/baseline-records.json`)
- `--summary` — print distribution to stderr (iter16)

**Healthy output check:** records must span ≥4 machine classes (mill / wire-edm / lathe / grinder etc) AND ≥3 time buckets. If `--summary` shows everything-mill or everything-1800s, the iter13 variance is degenerate — investigate.

### Stage 1 — Docustrata overlay (iter18 + iter19 + iter20 + iter21)

```powershell
node H:/prism/scripts/quoting-docustrata-pipeline.mjs --baseline H:/prism/state/shared/quoting/baseline-records.json --out H:/prism/state/shared/quoting/baseline-records-with-synth.json --json
```

**What it does:** runs the orchestrator (iter21 `runDocustrataPipeline`) which chains:
1. iter20 `generateSyntheticRevenueRecords` — derives synthetic revenue from cost+markup model
2. iter19 `validateDocustrataPayload` — schema gate (iter19 contract-lock)
3. iter18 `mergeDocustrataRevenue` — overlays synthetic revenue onto baseline records, flagging `revenue_source: "docustrata" | "stub"`

**Flags:**
- `--baseline PATH` — input (default `state/shared/quoting/baseline-records.json`)
- `--out PATH` — output (default `state/shared/quoting/baseline-records-with-synth.json`)
- `--markup N` — base markup pct (default 0.40)
- `--jitter N` — per-customer jitter pct (default 0.20)
- `--json` — machine-readable single-line JSON

**When the real Docustrata extractor lands (`U-QP-DOCUSTRATA-EXTRACTOR-WIRE`):** replace stage 1 with the extractor's output (must satisfy iter19 validator). Everything downstream stays untouched.

### Stage 2 — train cycle

```powershell
node H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/quoting-train-cycle.mjs --json --feed-psn --baseline H:/prism/state/shared/quoting/baseline-records-with-synth.json
```

**What it does:** invokes `QuotingTrainingOrchestratorEngine.runOnce()`. Computes per-record predicted vs actual revenue, MAPE, derives a calibration factor, applies CoV gate, writes `active-calibration.json` if safe, appends one row to `state/shared/quoting/train-cycle-history.jsonl` (iter10 ledger).

**Flags:**
- `--baseline PATH` — records to train on (use the merged output from stage 1)
- `--no-write` — dry-run, don't write active-calibration.json
- `--feed-psn` — also feed psi_delta to autonomy loop
- `--json` — single-line JSON result

**Why tsx not node:** the engine is .ts source; the dist may be stale. tsx compiles on the fly.

**Healthy output:** `{ok:true, safe_to_activate:true|false, active_factor_written:true|false}`. `safe_to_activate:false` is OK if the CoV gate properly rejected — iter12 alert will flag it if rate exceeds 50%.

### Stage 3 — drift alert (iter12 + iter15)

```powershell
node H:/prism/scripts/quoting-train-drift-alert.mjs --json
```

**What it does:** reads `train-cycle-history.jsonl`, summarizes the last N rows (iter11), classifies into `ok | info | warn | alert` (iter12), writes `state/shared/quoting/latest-drift-alert.json` (iter15 state-file), exits with cron-greppable code.

**Flags:**
- `--ledger PATH` — ledger to summarize (default `state/shared/quoting/train-cycle-history.jsonl`)
- `--window N` — rolling-window size (default 20)
- `--json` — machine-readable
- `--state-out PATH` — override state-file destination

**Exit codes:**
- `0` = ok/info (no operator action)
- `1` = warn (investigate next maintenance window)
- `2` = ALERT (operator needed NOW — cov_gate_fail ≥50% OR p95 ≥500% OR rising MAPE while avg ≥100%)

### Stage 4 (optional) — health check

```powershell
node H:/prism/scripts/quoting-pipeline-verify.mjs --json
```

**What it does:** runs every `scripts/quoting-*.test.mjs` and aggregates. Exit 0 confirms 221+ tests still pass. Useful when adding new units or before a wider deploy.

## Troubleshooting

### "ALERT" persistent

1. Check `state/shared/quoting/latest-drift-alert.json` for `reasons[]`.
2. If `cov_gate_fail_rate >= 0.5` — training is gating most cycles. Means the synth/Docustrata revenues are too different from training-engine predictions. Either tune `--markup` lower in stage 1 OR check `active-calibration.json` for a stuck factor.
3. If `mape_pct_p95 >= 500` — predictions are catastrophically off. Inspect the most recent ledger row (`tail -1 state/shared/quoting/train-cycle-history.jsonl`).
4. If `MAPE rising` — training is regressing. Check whether iter9 customer extraction is picking up new noise subdirs (run with `--summary`).

### "no parseable rows in ledger"

The ledger is empty. Run stages 0–2 at least once. Stage 3 needs ≥1 row.

### "ledger missing"

`state/shared/quoting/train-cycle-history.jsonl` was never created. Run stage 2 to produce the first row.

### "engine load failed"

Stage 2 needs either the compiled `mcp-server/dist/engines/QuotingTrainingOrchestratorEngine.js` OR tsx to run the .ts source. If both are missing:
```powershell
cd H:/prism/mcp-server; npm run build:fast
```

### Bootstrap shows everything-mill

iter13 variance injection isn't matching path/extension. Inspect a few `abs_path` values in the ledger and confirm they contain `/MILL/` or end in `.MIN`. If JM Die has a new subdir layout (e.g. `/CNC-MILL-3AXIS/`), extend `RATE_BY_PATH_HINT` in `scripts/quoting-baseline-bootstrap.mjs`.

### Stage 3 keeps writing the same alert

The state file is overwritten atomically every run. `latest-drift-alert.json`'s `ts_iso` updates each cycle. If `ts_iso` is NOT updating, stage 3 isn't running (check the cron task).

## Knobs (environment overrides)

None — the pipeline is CLI-flag-driven, not env-driven. Operator-config lives in:
- `state/shared/quoting/baseline-records.json` (refresh via stage 0)
- `state/shared/quoting/docustrata-revenues.json` (the future real-data input; iter18 bridge reads this when present)
- `state/shared/quoting/active-calibration.json` (stage 2 output, consumed by `QuotingActiveFactorLoaderEngine`)
- `state/shared/quoting/latest-drift-alert.json` (stage 3 output)

## File inventory

| Stage | Script | Engine/Pure-fn exports |
|---|---|---|
| 0 | `scripts/quoting-baseline-bootstrap.mjs` | `extractCustomer`, `isLikelyCustomer`, `deriveRecordDefaults`, `summarizeRecordsDistribution` |
| 1 | `scripts/quoting-docustrata-pipeline.mjs` | `runDocustrataPipeline` |
| 1a | `scripts/quoting-docustrata-synth.mjs` | `generateSyntheticRevenueRecords`, `deterministicHashUnit` |
| 1b | `scripts/quoting-docustrata-format.mjs` | `validateDocustrataPayload`, `SUPPORTED_SCHEMA_VERSIONS`, `REVENUE_BOUNDS` |
| 1c | `scripts/quoting-docustrata-bridge.mjs` | `buildRevenueKey`, `mergeDocustrataRevenue` |
| 2 | `scripts/quoting-train-cycle.mjs` | `buildLedgerRow` (calls `QuotingTrainingOrchestratorEngine.runOnce()`) |
| 3 | `scripts/quoting-train-drift-alert.mjs` | `detectDriftAlert`, `buildDriftStateFile`, `DEFAULT_THRESHOLDS` |
| 3a | `scripts/quoting-train-history-summary.mjs` | `parseLedgerLines`, `summarizeLedger` |
| 4 | `scripts/quoting-pipeline-verify.mjs` | `parseTapSummary`, `aggregateSummaries` |

All exports are pure functions with unit tests at `scripts/quoting-*.test.mjs`. 221 tests across 12 test files + the verify meta-runner.

## Next high-leverage unit (deferred from this session)

**`U-QP-DOCUSTRATA-EXTRACTOR-WIRE`** — replace stage 1's synth (iter20) with the real `DocustrataHistoricalPricingTrainerEngine` extractor. The iter19 validator already locks the input contract; stage 1 just swaps the data source. Everything else stays untouched.

**Other follow-ups** (see [[reference_quoting_pipeline_session_2026_05_26]] §"Open follow-ups"):
- `U-QP-DISPATCHER-WIRE` — `prism_quoting:training_*` MCP dispatcher action wrapping the chain.
- `U-QP-CRON-INSTALL` — Windows Scheduled Task `.ps1` registration.
- `U-QP-STOP-HOOK-INJECT` — auto-inject ALERT-level state into next chat's SessionStart banner.
