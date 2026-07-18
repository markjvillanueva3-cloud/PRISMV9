# CAD-LEARNING-AI/U-BPA-OPCORRECTION-ALIAS — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-OPCORRECTION-ALIAS (slot:india): consumer recognizes operator_correction -- close a silent loop-drop of human ground-truth

**Commit:** `8664edcce83d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:45:07-05:00
**Tags:** cad-learning-ai, u-bpa-opcorrection-alias, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-OPCORRECTION-ALIAS (slot:india): consumer recognizes operator_correction -- close a silent loop-drop of human ground-truth

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-OPCORRECTION-ALIAS (slot:india): consumer recognizes operator_correction -- close a silent loop-drop of human ground-truth

blueprint-accuracy-consumer-lib.applyEvents bucketed top-level type:"operator_correction"
to "unknown" and skipped it -- losing the single highest-value training signal (human-
confirmed ground truth). Verified live: blueprint-accuracy-events.jsonl carries 1 such row
(divergent python writer; canonical JS buildOperatorCorrectionEvent emits type:outcome_record
+ payload.kind:operator_correction, which WAS consumed). Additive EVENT_TYPE_ALIASES
{operator_correction -> outcome_record}; resolveEventType() pure; applyEvents resolves the
alias BEFORE the known-type check; summary.aliasedCount keeps the divergence fail-loud (R12),
not silently masked. Semantically exact: the MS1 hook itself dispatches xproc_outcome_record
for operator corrections.

WIRE: alias resolved in applyEvents (the single consumer chokepoint) -> drives outcomesSince-
Consolidate + xproc_outcome_record_outcome dispatch + EWC consolidation.
TEST: +5 (40/40) -- live divergent-row fixture consumed not dropped; 25 aliased corrections
drive the implicit ewc_consolidate; narrow alias (genuinely-unknown still -> unknown, aliasedCount 0);
canonical outcome_record unchanged; resolveEventType pure incl non-string.
VALIDATE: live 145-row ledger, fresh-state dry-run -> processedCount 145, aliasedCount 1,
146 actions (was 144 consumed + 1 silently dropped pre-fix).
```

## Files touched (3)
- scripts/lib/blueprint-accuracy-consumer-lib.mjs      | 42 +++++++++++++++++++++++++++++++++++++++++-
- scripts/lib/blueprint-accuracy-consumer-lib.test.mjs | 82 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 123 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till -> unknown, aliasedCount 0);

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8664edcce83d`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._