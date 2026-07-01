# SIERRA-BACKEND/U-FE-ERP-SECONDPASS-REWIRE — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ERP-SECONDPASS-REWIRE (slot:sierra): un-501 /dispatch-board + /oee-six-losses -> existing real actions (R8/R16 second pass)

**Commit:** `887c82e904df` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:04:33-05:00
**Tags:** sierra-backend, u-fe-erp-secondpass-rewire, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ERP-SECONDPASS-REWIRE (slot:sierra): un-501 /dispatch-board + /oee-six-losses -> existing real actions (R8/R16 second pass)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ERP-SECONDPASS-REWIRE (slot:sierra): un-501 /dispatch-board + /oee-six-losses -> existing real actions (R8/R16 second pass)

Second-pass deep-search correction of U-FE-ROUTE-P0-ZERO's over-conservative 501s. A comprehensive
businessDispatcher enum scan found 2 of the 10 endpoints had a REAL action under a DIFFERENT name:
- /erp/dispatch-board  -> dispatch_get_all_queues (MachineDispatchEngine.getAllQueues -> whole-shop
  PlanningBoard; sibling dispatch_get_queue is per-machine). The exact route name (dispatch_board) != the
  registered action (dispatch_get_all_queues), which the first-pass exact-name scout missed.
- /erp/oee-six-losses  -> oee_calculate (OEECalculatorEngine.calculate already returns six_big_losses).
  The route coerces its GET query strings to numbers (the business oee_calculate case is a raw passthrough,
  no Zod coercion) so the engine math is reliable; the FE reads result.six_big_losses.

R8 reuse-don't-rebuild: wired to existing tested actions rather than building near-duplicate ones.

Tests: erp-rewire-actions.test.ts 6/6 -- REAL reference-value/invariant assertions (R9): six_big_losses
breakdowns(60%)/setup(40%) split of unplanned downtime, startup(20%)/production rejects partition,
quality=good/total=97.14%, OEE=A*P*Q; getAllQueues PlanningBoard shape + reflects a queued job.

The other 8 stay 501 (verified genuinely absent: a3_report_*/value_stream_map = no store; or unsafe-to-rewire:
cash_flow_summary on the stub-wired cash_flow_project; operations_kpis/margin_trends only loosely-related
actions; root_cause_list -> nc_list lists ALL NCs incl those without a root cause = misleading;
timecard_audit_log no edit-history read). These need hotel-domain foundation-building; the 501 msgs name each.

DEEP-SEARCH LESSON: grep the FULL action enum for SIBLING actions before declaring an action absent --
the route name often != the registered action name.

EVAL: audit-fe-route-action-contract.mjs --p0-only = 0 CLEAN. tsc --noEmit = 0 (fresh, cache-busted).
fe-route-contract-gate.test.ts 3/3 + erp-rewire-actions.test.ts 6/6.
```

## Files touched (3)
- mcp-server/src/__tests__/erp-rewire-actions.test.ts | 90 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                        | 34 ++++++++++++++++++++++++++++++----
- 2 files changed, 120 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- LESSON: grep the FULL action enum for SIBLING actions before declaring an action absent --

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 887c82e904df`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._