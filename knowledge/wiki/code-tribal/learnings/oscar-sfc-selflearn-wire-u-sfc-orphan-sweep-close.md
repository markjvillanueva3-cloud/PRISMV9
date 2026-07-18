# OSCAR-SFC-SELFLEARN-WIRE/U-SFC-ORPHAN-SWEEP-CLOSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-ORPHAN-SWEEP-CLOSE: close the SFC orphan-wire sweep with verified reachability

**Commit:** `b4bc61863a63` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T18:34:27-05:00
**Tags:** oscar-sfc-selflearn-wire, u-sfc-orphan-sweep-close, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-ORPHAN-SWEEP-CLOSE: close the SFC orphan-wire sweep with verified reachability

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-ORPHAN-SWEEP-CLOSE: close the SFC orphan-wire sweep with verified reachability

Mark #2 ParamRefine SHIPPED (ae756dcfc8) + record R8-verified reachability for the
remaining 6, superseding the first-pass consumer-count guesses.

SWEEP OUTCOME: of 8 alleged "dark orphans", only TWO were genuinely orphaned --
#1 Ranker (9aa9ce20f2) + #2 ParamRefine (ae756dcfc8), both now wired. #3 RAGWarmStart +
#5 PropagationBridge + #7 OutcomeCaptureWire + #8 ProvenanceWire are reachable/exempt
(false-dark -- the first shallow singleton-name grep missed CLASS-name static-method
consumers; R8 lesson re-confirmed for the 3rd time: grep BOTH XEngine + xEngine).
#6 InferenceGateWire is a memory-vs-code discrepancy (memory says wired via
ultimate_speed_feed; current cad-fusion-live-ms0 calcDispatcher has zero such ref) ->
flagged UNVERIFIED for india/oscar to confirm, NOT assumed dark. #4 PSNDecisionPrior is
transitively reachable + low-value.

NET: the SFC self-learning fold-back + Bayesian arbitration + parameter calibration
surfaces are all now dispatcher-reachable. Remaining = india/oscar confirm #6 + optional
exempt-marker corrections (the false // WIRE-EXEMPT lines should NAME the real wrapper).

Queue: state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md.
```

## Files touched (2)
- state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md | 35 ++++++++++++++++++++++++++++++++++-
- 1 file changed, 34 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- lesson re-confirmed for the 3rd time: grep BOTH XEngine + xEngine).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b4bc61863a63`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-SELFLEARN-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._