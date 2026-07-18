# INDIA-AI-CONFORMAL/U-NN-CONFORMAL-AUDIT-TOOL — [MAIN-FORCE] [INDIA-AI-CONFORMAL]/U-NN-CONFORMAL-AUDIT-TOOL (slot:india): conformal coverage audit tool for the GNN tier-5 holdout -- TOOL DONE, result still ref-pool-gated

**Commit:** `9818b48832af` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T13:18:47-05:00
**Tags:** india-ai-conformal, u-nn-conformal-audit-tool, auto-distilled

## Subject
[MAIN-FORCE] [INDIA-AI-CONFORMAL]/U-NN-CONFORMAL-AUDIT-TOOL (slot:india): conformal coverage audit tool for the GNN tier-5 holdout -- TOOL DONE, result still ref-pool-gated

## Body
```
[MAIN-FORCE] [INDIA-AI-CONFORMAL]/U-NN-CONFORMAL-AUDIT-TOOL (slot:india): conformal coverage audit tool for the GNN tier-5 holdout -- TOOL DONE, result still ref-pool-gated

scripts/nn-graph-conformal-audit.mjs + .test.mjs (13/13) -- tested orchestrator wiring two EXISTING engines (R8, zero reinvention): CrossProcessConformalClassificationEngine.calibrate/predictionSet + ConformalCalibrationMonitorEngine.configure/record/status. End-to-end pipeline: parse JSONL -> split cal/test -> LAC calibrate -> per-test predictionSet -> rolling-coverage record -> report empirical vs target with marginalGuaranteeMet + trustworthy.

INDIA DISCIPLINE in code (never a misleading metric, R12):
- REFUSE-GATE n_test < MIN_MEANINGFUL_N=20 -> {ok:false,refused:true} + CLI exit 2 (matches monitor's MIN_WINDOW_SIZE -- defense-in-depth via zod min()).
- trustworthy:false when fullSetRate>0.5 (trivially-inflated empirical=1.0 from tiny calibration is NOT a real signal).
- --strict CI gate fails CLOSED on UNTRUSTWORTHY (exit 2), not just on guarantee-unmet -- the silent CI false-green is the exact failure mode the audit exists to prevent.

3 reviewer-A findings fixed inline (operator fix-inline doctrine), each regression-pinned: P1 false-green --strict gate (spawnSync test asserts exit 2 on untrustworthy); P2 silent miscount on out-of-range test label (bound-check before loop -> clean refusal); P3 silent NaN on bad CLI flag (parseArgs throws clear error).

LIVE CLI proof: 80-pair fixture -> exit 0 with coverage; 30-pair fixture -> "REFUSED: insufficient holdout" + exit 2.

Honest scope: the audit RESULT is still pool-gated -- needs a full-softmax GNN-predictor pass over the holdout, AND the live holdout is n=13<20 (correctly triggers refuse). Same ref-pool-growth root cause as the tier-5 deploy gate. Memory reference_conformal_audit_tool_2026_06_16 + wiki code-tribal/learnings/conformal-audit-false-green-strict-gate. Per-file 2-arm scrutiny 0 P0/P1 + 3-of-3 PASS blockCount 0.
```

## Files touched (5)
- knowledge/wiki/code-tribal/learnings/conformal-audit-false-green-strict-gate.md |  46 ++++++++++++++++++
- scripts/nn-graph-conformal-audit.mjs                                            | 252 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/nn-graph-conformal-audit.test.mjs                                       | 236 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/INDIA-REMAINING-WORK-LEDGER-2026-06-15.md                    |   7 +++
- 4 files changed, 541 insertions(+)

## Lessons surfaced in commit body
- till ref-pool-gated
- till pool-gated -- needs a full-softmax GNN-predictor pass over the holdout, AND the live holdout is n=13<20 (correctly triggers refuse). Same ref-pool-growth root cause as the tier-5 deploy gate. Memory reference_conformal_audit_tool_2026_06_16 + wiki code-tribal/learnings/conformal-audit-false-green-strict-gate. Per-file 2-arm scrutiny 0 P0/P1 + 3-of-3 PASS blockCount 0.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9818b48832af`
- Milestone envelope: `mcp-server/data/milestones/INDIA-AI-CONFORMAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._