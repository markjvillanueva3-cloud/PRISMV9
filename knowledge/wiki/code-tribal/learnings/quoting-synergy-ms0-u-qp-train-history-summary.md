# QUOTING-SYNERGY-MS0/U-QP-TRAIN-HISTORY-SUMMARY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAIN-HISTORY-SUMMARY (slot:charlie /goal-yolo iter11): closed-loop reader for iter10 ledger - parseLedgerLines + summarizeLedger + 21-case test.

**Commit:** `bd3ad1ffc7c7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T02:23:26-05:00
**Tags:** quoting-synergy-ms0, u-qp-train-history-summary, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAIN-HISTORY-SUMMARY (slot:charlie /goal-yolo iter11): closed-loop reader for iter10 ledger - parseLedgerLines + summarizeLedger + 21-case test.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAIN-HISTORY-SUMMARY (slot:charlie /goal-yolo iter11): closed-loop reader for iter10 ledger - parseLedgerLines + summarizeLedger + 21-case test.

iter10 shipped state/shared/quoting/train-cycle-history.jsonl as a write-only
audit trail. iter11 closes the loop with a pure-function reader so any chat /
dashboard / PSN leg can detect calibration drift WITHOUT scraping stdout.

Exports:
- parseLedgerLines(text) - corrupt-line tolerant (silent-skip per line, drops
  non-object JSON like null/arrays). Empty/null input -> [].
- summarizeLedger(rows, windowN=20) - 11-key stable shape:
  count, window_n, mape_pct_avg, mape_pct_p50, mape_pct_p95, mape_trend,
  cov_gate_fail_rate, safe_to_activate_rate, psi_delta_fed_total,
  latest_factor_path, last_run_iso.

Key semantics (pinned by tests):
- mape_trend ("rising"/"falling"/"flat"/"insufficient") - least-squares slope
  with |slope/yBar| < 0.01 flat-band; needs >= 3 points or returns
  "insufficient" (no false trends on cold start).
- cov_gate_fail = ok=true (engine ran) AND safe_to_activate=false (CoV refused).
  ok=false (engine error) is a SEPARATE signal class - must not be conflated
  with gate failure (different remediation path).
- Percentiles use NIST nearest-rank: ceil(p*N/100)-1. p95 of [280,300,312]
  yields 312 (tail), not floor-interp 300 (middle). Drift dashboards must
  track the worst, not the median-on-small-N.
- NaN/Infinity/string mape_pct values filtered (Number.isFinite gate)
  before stats - buildLedgerRow's pass-through reaches here, where dashboards
  expect clean numerics.
- Window slices LAST N rows (most-recent). Invalid windowN (NaN/negative/0/
  Infinity/string/null) coerced to default 20; fractional floored.

CLI: node scripts/quoting-train-history-summary.mjs [--ledger PATH] [--window N] [--json]
import.meta.url guard so the test file imports without firing main().

scripts/quoting-train-history-summary.test.mjs - 21/21 PASS. Coverage: parser
(empty/non-string/valid/corrupt/trailing-newline), 3 failure modes (all-gated /
engine-error-vs-gate-fail / rising-MAPE), 4 adversarial classes (NaN+Infinity+
null+string mape_pct, null/empty rows, invalid windowN coercion, fractional
windowN), boundary (single-row / 2-row insufficient-trend / flat / window-
slicing), 11-key shape stability, 3-scenario variability (improving/regressing/
stalled), parseLedgerLines+summarizeLedger roundtrip integration.

Test caught a real bug: original percentile formula floor(p*(N-1)/100) gave
p95=300 (middle) on N=3 [280,300,312]; should be 312 (tail). Fixed to
nearest-rank ceil(p*N/100)-1 - the correct interpretation for drift detection.
```

## Files touched (3)
- scripts/quoting-train-history-summary.mjs      | 210 +++++++++++++++++++
- scripts/quoting-train-history-summary.test.mjs | 278 +++++++++++++++++++++++++
- 2 files changed, 488 insertions(+)

## Lessons surfaced in commit body
- tiles use NIST nearest-rank: ceil(p*N/100)-1. p95 of [280,300,312]
- tile formula floor(p*(N-1)/100) gave

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bd3ad1ffc7c7`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._