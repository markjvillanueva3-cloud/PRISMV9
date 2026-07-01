# QUOTING-PIPELINE-MS0/U-QP13-ACCURACY-ENHANCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-QP13-ACCURACY-ENHANCE (slot:charlie /goal-13 iter9): four math-driven accuracy upgrades wired into prism_quoting (8 to 12 actions). (1) Platt-scaling calibration (Lin 2007 formula + Newton-Raphson MLE fit) — calibrated posteriors P(route|features) from ad-hoc 0-1 scores. (2) OCR-confusion-weighted Levenshtein + fuzzy SKU matching — catches 0/O 1/I 5/S 8/B OCR errors; confusion pairs cost 0.5 vs generic 1.0. (3) Weibull survival + replacement-probability priors — wraps U-QP05 flat interval as eta with beta=2.5 industrial-wear default for proactive BOM ordering. (4) Interval-arithmetic quote uncertainty propagation — reuses PROGRAM-PROOF-MS0/U-PP02 IntervalArithmeticPredicateEngine for guaranteed-correct [lo,hi] quote bounds; surfaces uncertainty instead of fake-precise totals. 28/28 vitest PASS. Wired as accuracy_platt_calibrate / accuracy_fuzzy_match_sku / accuracy_bom_urgency / accuracy_quote_interval.

**Commit:** `f6e9d36d965c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T17:22:19-05:00
**Tags:** quoting-pipeline-ms0, u-qp13-accuracy-enhance, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-QP13-ACCURACY-ENHANCE (slot:charlie /goal-13 iter9): four math-driven accuracy upgrades wired into prism_quoting (8 to 12 actions). (1) Platt-scaling calibration (Lin 2007 formula + Newton-Raphson MLE fit) — calibrated posteriors P(route|features) from ad-hoc 0-1 scores. (2) OCR-confusion-weighted Levenshtein + fuzzy SKU matching — catches 0/O 1/I 5/S 8/B OCR errors; confusion pairs cost 0.5 vs generic 1.0. (3) Weibull survival + replacement-probability priors — wraps U-QP05 flat interval as eta with beta=2.5 industrial-wear default for proactive BOM ordering. (4) Interval-arithmetic quote uncertainty propagation — reuses PROGRAM-PROOF-MS0/U-PP02 IntervalArithmeticPredicateEngine for guaranteed-correct [lo,hi] quote bounds; surfaces uncertainty instead of fake-precise totals. 28/28 vitest PASS. Wired as accuracy_platt_calibrate / accuracy_fuzzy_match_sku / accuracy_bom_urgency / accuracy_quote_interval.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-PIPELINE-MS0]/U-QP13-ACCURACY-ENHANCE (slot:charlie /goal-13 iter9): four math-driven accuracy upgrades wired into prism_quoting (8 to 12 actions). (1) Platt-scaling calibration (Lin 2007 formula + Newton-Raphson MLE fit) — calibrated posteriors P(route|features) from ad-hoc 0-1 scores. (2) OCR-confusion-weighted Levenshtein + fuzzy SKU matching — catches 0/O 1/I 5/S 8/B OCR errors; confusion pairs cost 0.5 vs generic 1.0. (3) Weibull survival + replacement-probability priors — wraps U-QP05 flat interval as eta with beta=2.5 industrial-wear default for proactive BOM ordering. (4) Interval-arithmetic quote uncertainty propagation — reuses PROGRAM-PROOF-MS0/U-PP02 IntervalArithmeticPredicateEngine for guaranteed-correct [lo,hi] quote bounds; surfaces uncertainty instead of fake-precise totals. 28/28 vitest PASS. Wired as accuracy_platt_calibrate / accuracy_fuzzy_match_sku / accuracy_bom_urgency / accuracy_quote_interval.
```

## Files touched (6)
- .../QuotingAccuracyEnhancementEngine.test.ts       | 216 +++++++++++++++
- .../engines/QuotingAccuracyEnhancementEngine.ts    | 304 +++++++++++++++++++++
- .../src/engines/SubSpindleHandoffVerifierEngine.ts | 175 ++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |  36 +++
- .../src/tools/dispatchers/quotingDispatcher.ts     |  24 ++
- 5 files changed, 755 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f6e9d36d965c`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._