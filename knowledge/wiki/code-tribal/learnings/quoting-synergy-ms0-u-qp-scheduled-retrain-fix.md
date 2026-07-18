# QUOTING-SYNERGY-MS0/U-QP-SCHEDULED-RETRAIN-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN-FIX (slot:charlie /goal-yolo iter5): Windows ESM fix on yolo-iter3 invoker. Smoke-test exposed ERR_UNSUPPORTED_ESM_URL_SCHEME — bare 'H:/...' rejected by Node's dynamic import. Fix: pathToFileURL() wrap on both dist + src paths. Plain node now loads compiled .js; tsx wrapper loads .ts source (operator-hinted fallback when dist missing). Smoke-test PASS end-to-end with 50 ledger-bootstrap records: bootstrap -> tsx invoke -> CoV verdict safe_to_activate=true -> dry-run skipped. Chain confirmed wired: orchestrator + invoker + bootstrap + Windows-ESM fix.

**Commit:** `f3d33b083295` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T23:18:44-05:00
**Tags:** quoting-synergy-ms0, u-qp-scheduled-retrain-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN-FIX (slot:charlie /goal-yolo iter5): Windows ESM fix on yolo-iter3 invoker. Smoke-test exposed ERR_UNSUPPORTED_ESM_URL_SCHEME — bare 'H:/...' rejected by Node's dynamic import. Fix: pathToFileURL() wrap on both dist + src paths. Plain node now loads compiled .js; tsx wrapper loads .ts source (operator-hinted fallback when dist missing). Smoke-test PASS end-to-end with 50 ledger-bootstrap records: bootstrap -> tsx invoke -> CoV verdict safe_to_activate=true -> dry-run skipped. Chain confirmed wired: orchestrator + invoker + bootstrap + Windows-ESM fix.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN-FIX (slot:charlie /goal-yolo iter5): Windows ESM fix on yolo-iter3 invoker. Smoke-test exposed ERR_UNSUPPORTED_ESM_URL_SCHEME — bare 'H:/...' rejected by Node's dynamic import. Fix: pathToFileURL() wrap on both dist + src paths. Plain node now loads compiled .js; tsx wrapper loads .ts source (operator-hinted fallback when dist missing). Smoke-test PASS end-to-end with 50 ledger-bootstrap records: bootstrap -> tsx invoke -> CoV verdict safe_to_activate=true -> dry-run skipped. Chain confirmed wired: orchestrator + invoker + bootstrap + Windows-ESM fix.
```

## Files touched (2)
- scripts/quoting-train-cycle.mjs | 37 ++++++++++++++++++++++++++++---------
- 1 file changed, 28 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f3d33b083295`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._