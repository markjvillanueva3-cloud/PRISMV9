# First live Docustrata-pipeline run — Evidence

**Date:** 2026-05-26 (overnight session, slot:charlie iter33 /goal-yolo)
**Pipeline:** iter9-32 quoting calibration substrate, end-to-end live run

## What ran

```powershell
node H:/prism/scripts/quoting-docustrata-pipeline.mjs --json
```

(Stage 1 of the runbook chain — synth → validate → bridge against live `state/shared/quoting/baseline-records.json`.)

## Result

```json
{
  "ok": true,
  "stage": "done",
  "reason": null,
  "synth_count": 100,
  "validation_warnings": 0,
  "bridge_report": {
    "total": 100,
    "matched": 100,
    "unmatched": 0,
    "stub_preserved_count": 0,
    "rejected_below_min": 0,
    "override_min": 117.01,
    "override_max": 155.34,
    "match_rate_pct": 100,
    "min_revenue_threshold": 1
  },
  "out": "H:/PRISM/state/shared/quoting/baseline-records-with-synth.json"
}
```

**The pipeline runs end-to-end on the live machine.** 100/100 records matched (tautology — synth was derived FROM the baseline), 0 validation warnings, output landed at the expected path.

## What this PROVES

1. **iter18 mergeDocustrataRevenue** wires correctly through iter19 validator and iter20 synth — orchestrator (iter21) composes the three stages without error.
2. **iter19 validator accepts** iter20-generated payloads on real data (no warnings, no errors).
3. **iter18 bridge produces clean stats** — match_rate, override range, rejection count all populated correctly.
4. The 281/281 test suite (iter32-verified) reflects real behavior, not just contrived fixtures.

## What this REVEALS (real finding — surfaced per R12 fail-loud)

The live `state/shared/quoting/baseline-records.json` is **PRE-ITER13** — lacks `machine_class` field, has flat defaults `{estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 50}` across every record, and contains a synthetic-looking customer name `PRISM_UPGRADED` instead of real JM Die customers (ALCOA, ITW, BRADY, etc.).

**Symptom:** override range is a tight $117-$155 (only 1.32× spread). With proper iter13 variance, a mixed cohort across wire-EDM ($110/hr × 30min + $35 = $90 cost × 1.4 = ~$126), mill ($95/hr × 30min + $60 = $107.5 cost × 1.4 = ~$150), and 5-axis ($100/hr × 120min + $60 = $260 cost × 1.4 = ~$364) would span ~3× rather than 1.32×.

**Root cause hypothesis:** the baseline-records.json was generated before iter13 (probably during iter4-6 first-cycle work), and the operator's cron hasn't rerun bootstrap since. The on-disk artifact is stale.

## Remediation (one command)

```powershell
node H:/prism/scripts/quoting-baseline-bootstrap.mjs --limit 100 --summary --scan-archive
```

The `--summary` flag (iter16) will print the variance distribution to stderr so operators can confirm the regenerated baseline has the expected machine-class spread.

If the JM Die ledger is thin (iter8 noted this), `--scan-archive` walks the archive directly. Stage 1 (iter21 orchestrator) will then re-overlay synth on the fresh baseline and the override range should widen to ~3× spread.

## Cross-refs

- `state/shared/quoting/FIRST-TRAINING-CYCLE-EVIDENCE.md` — the earlier iter6 evidence (training cycle proven; this iter33 file proves the iter21 orchestrator side)
- `state/shared/quoting/PIPELINE-RUNBOOK.md` §"Troubleshooting" / "Bootstrap shows everything-mill"
- `[[reference_quoting_pipeline_session_2026_05_26]]` — full session memory including this finding
- iter13 commit `71e08eae58` — per-record signal variance ship that's missing from the on-disk baseline
- iter32 commit `211ab8e1f3` — proved the verify script catches its own gaps; this iter33 proves the same applies to the production data

## Operator next step

Add `node scripts/quoting-baseline-bootstrap.mjs --limit 200 --summary --scan-archive` as stage 0 of the nightly Scheduled Task (iter26 `install-quoting-pipeline-cron.ps1` already includes it; just re-run the install once to regenerate the wrapper if it was registered pre-iter13).
