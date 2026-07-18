# FRONTEND-AUDIT-MS0/U-FRONTEND-INVENTORY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FRONTEND-AUDIT-MS0]/U-FRONTEND-INVENTORY (slot:romeo iter34): R12 frontend audit + scoped upgrade plan.

**Commit:** `867d9a134739` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T01:18:50-05:00
**Tags:** frontend-audit-ms0, u-frontend-inventory, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FRONTEND-AUDIT-MS0]/U-FRONTEND-INVENTORY (slot:romeo iter34): R12 frontend audit + scoped upgrade plan.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FRONTEND-AUDIT-MS0]/U-FRONTEND-INVENTORY (slot:romeo iter34): R12 frontend audit + scoped upgrade plan.

Closes operator /goal sub-goal 1 in full (inventory + PSN-node gap analysis).
Scopes sub-goal 2 (build new frontend) as DEFERRED per 3 standing memos:
  - feedback_backend_before_frontend (backend wiring must precede new frontend)
  - feedback_frontend_codex (never overwrite Codex pages)
  - feedback_ppg_frontend (preserve PPG design language)
Scopes sub-goal 3 (millions of UI scenarios) as scaffolded — Playwright e2e
dir already exists; auto-running mass-scenarios without operator review
produces false confidence (R12).

Inventory delivered:
  - 149 pages in mcp-server/web/src/pages/
  - 92 api clients in mcp-server/web/src/api/
  - 3 frontend trees (1 canonical merged, 2 PENDING_MERGE per BUILD_STATE)
  - 40+ frontend roadmap units across APPW-MS8, WEDM, Calculator, Dashboard,
    Lathe, Cross-platform, MS0-EXTENSION clusters
  - PSN-node gap table naming 6 recent backend additions not yet surfaced
    in existing pages (master_index_query, 3 generic-bridge engines,
    CohortBridgeShimEngine substrate, /api/snapshot + /api/graph-snapshot)

Next-highest-leverage move named: close APPW-MS8 merge cluster (Frontend
Audit & Decision -> Execute Merge -> Deprecate Old -> Dispatcher Coverage)
BEFORE per-page upgrade pass. Not autonomously executable — each merge is
a contract decision needing operator approval per page.
```

## Files touched (2)
- .../FRONTEND-AUDIT-AND-UPGRADE-PLAN-2026-05-25.md  | 101 +++++++++++++++++++++
- 1 file changed, 101 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 867d9a134739`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._