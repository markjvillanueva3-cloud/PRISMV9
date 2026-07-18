# QUOTING-SYNERGY-MS0/U-QP-DRIFT-ALERT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DRIFT-ALERT (slot:charlie /goal-yolo iter12): single-flag alert classifier for iter11 summary + 21-case test.

**Commit:** `b1c6a096ff87` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T02:28:08-05:00
**Tags:** quoting-synergy-ms0, u-qp-drift-alert, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DRIFT-ALERT (slot:charlie /goal-yolo iter12): single-flag alert classifier for iter11 summary + 21-case test.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DRIFT-ALERT (slot:charlie /goal-yolo iter12): single-flag alert classifier for iter11 summary + 21-case test.

iter11 produces an 11-field summary; humans/dashboards need ONE flag to act on.
iter12 ships detectDriftAlert(summary, thresholds?) -> {level, reasons, counts}
with deterministic 3-tier precedence (ALERT > WARN > INFO > OK):

ALERT (P0 — needs human now):
  - cov_gate_fail_rate >= 0.5 (CoV refusing >= 50%% of cycles = bad calibration)
  - mape_pct_p95 >= 500 (catastrophic prediction error)
  - mape_trend rising AND mape_pct_avg >= 100 (regressing while already bad)

WARN (P1 — investigate next maintenance):
  - cov_gate_fail_rate >= 0.25
  - mape_pct_p95 >= 100
  - mape_trend rising (any avg)
  - safe_to_activate_rate < 0.5

INFO (P2 — not actionable but worth noting):
  - count < 3 (insufficient history)
  - psi_delta_fed_total = 0 across window (PSN autonomy loop unfed)

Same-axis dedup between tiers: if cov triggers ALERT, the cov WARN line is
suppressed (no double-reporting). Per-axis precedence preserves clean
alert-level resolution.

CLI: node scripts/quoting-train-drift-alert.mjs [--ledger PATH] [--window N] [--json]
Exit codes: 2=alert (cron-greppable), 1=warn, 0=ok/info.
import.meta.url guard so test file imports without firing main().

scripts/quoting-train-drift-alert.test.mjs - 21/21 PASS. Coverage:
- OK path (healthy summary)
- 3 ALERT triggers (cov / p95 / rising+high-avg)
- 4 WARN triggers (cov 0.25 / p95 100 / safe-rate / rising-alone)
- 2 INFO triggers (count<3 / psi-unfed)
- Precedence dedup (ALERT cov suppresses WARN cov)
- Adversarial (null/undefined summary, empty {}, NaN-style fields, string mape)
- Threshold override + null fallback
- Shape stability + DEFAULT_THRESHOLDS contract pin (downstream consumers
  depend on those exact numbers)
- 3 realistic scenarios (first-cycle 2108%% / steady-state 12%% / creeping 50%%)

Closes the observable pipeline: bootstrap (iter9 customers) -> train-cycle
(orchestrator) -> ledger write (iter10) -> ledger read (iter11) -> alert (iter12).
Any chat, dashboard, or PSN leg now gets a single actionable flag with reasons.
Cron-safe: exit code 2 means human attention; 0 means heartbeat.
```

## Files touched (3)
- scripts/quoting-train-drift-alert.mjs      | 163 +++++++++++++++++++++++
- scripts/quoting-train-drift-alert.test.mjs | 203 +++++++++++++++++++++++++++++
- 2 files changed, 366 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b1c6a096ff87`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._