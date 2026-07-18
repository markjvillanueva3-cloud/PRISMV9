# SIERRA-BACKEND/U-FE-ERP-ROOTCAUSE-BUILD — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ERP-ROOTCAUSE-BUILD (slot:sierra): build prism_business:root_cause_list -> un-501 /erp/root-cause-list

**Commit:** `e12ada8924a9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:18:15-05:00
**Tags:** sierra-backend, u-fe-erp-rootcause-build, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ERP-ROOTCAUSE-BUILD (slot:sierra): build prism_business:root_cause_list -> un-501 /erp/root-cause-list

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ERP-ROOTCAUSE-BUILD (slot:sierra): build prism_business:root_cause_list -> un-501 /erp/root-cause-list

New read action over the REAL NCCA store (NonConformanceAndCorrectiveActionEngine). Root causes are stored
8D-style on non-conformances (recordRootCause -> nc.d4_root_cause); root_cause_list lists ONLY the NCs that
have a root cause recorded (distinct from nc_list, which lists ALL NCs incl. open/contained ones with none),
optionally filtered by status/severity/source. No new engine/store (R8 -- reuse listNCs); no schema needed
(validateActionParams passes schema-less actions through, matching the nc_list sibling).

Wiring: action enum entry + dispatcher case (lazy import, { success, data } shape) + erp.ts route re-pointed
501 -> real callTool.

Tests: erp-rewire-actions.test.ts 11/11 -- root_cause_list is round-tripped THROUGH the real prism_business
dispatcher (captures the registered tool handler; SUT = real dispatcher switch + real NCCA engine, nothing
mocked). Coverage: happy (seeded NC's d4_root_cause surfaces, status in_root_cause, ISO recorded_at) + 3
failure modes (open NC excluded / every row has a >=10-char cause; status filter narrows + all rows match;
count==length invariant) + 2 adversarial (no params; unknown source -> empty, no crash).

EVAL: audit --p0-only = 0 CLEAN; tsc --noEmit = 0 (fresh, cache-busted); fe-route-contract-gate 3/3; erp-rewire 11/11.

ERP 501 close-out (this session): of the 10 routes first-pass 501'd, 3 now un-501'd to real data
(dispatch_board->dispatch_get_all_queues, oee_six_losses->oee_calculate, root_cause_list NEW); 7 remain
honest-501 (a3_report_*/value_stream_map = no store; cash_flow_summary on stub-wired cash_flow_project;
operations_kpis/margin_trends loosely-related only; timecard_audit_log no edit-history read) -- hotel
foundation-building, the 501 msgs name each.
```

## Files touched (4)
- mcp-server/src/__tests__/erp-rewire-actions.test.ts    | 85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                           | 11 +++++++----
- mcp-server/src/tools/dispatchers/businessDispatcher.ts | 22 ++++++++++++++++++++++
- 3 files changed, 114 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e12ada8924a9`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._