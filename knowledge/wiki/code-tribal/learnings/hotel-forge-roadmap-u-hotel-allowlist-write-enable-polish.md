# HOTEL-FORGE-ROADMAP/U-HOTEL-ALLOWLIST-WRITE-ENABLE-POLISH — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-ALLOWLIST-WRITE-ENABLE-POLISH (slot:hotel): close 3 scrutiny P2/P3 (doc-drift + identity-note + full manager-role test coverage)

**Commit:** `d8d2824cf2c1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:07:26-05:00
**Tags:** hotel-forge-roadmap, u-hotel-allowlist-write-enable-polish, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-ALLOWLIST-WRITE-ENABLE-POLISH (slot:hotel): close 3 scrutiny P2/P3 (doc-drift + identity-note + full manager-role test coverage)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-ALLOWLIST-WRITE-ENABLE-POLISH (slot:hotel): close 3 scrutiny P2/P3 (doc-drift + identity-note + full manager-role test coverage)

3-of-3 PASS on the core (18f37c812e), no P0/P1. This closes the cheap findings:
- A-P3/C-P3 doc-drift: business.ts header still claimed handoff_counterparty_respond
  "remains 403 pending review" -- corrected to reflect the 4 handoff writes are now
  role-gated-open; added the role-vs-identity note inline.
- C-P3: BUSINESS_WRITE_ROLE_MAP doc now records that the route gate is role-only
  (coarse) while each engine method ALSO enforces participant-identity from
  caller-asserted params.
- B-P3: write-role-gate test now exercises ALL manager-tier roles
  (lead/supervisor/hr_manager/admin) via it.each, not just lead+admin -- a typo in
  MANAGER_TIER_ROLES would now be caught. 23/23 green (was 19).

DEFERRED (A-P2, filed follow-up -- NOT this unit): bind the engine identity param
(responder_employee_id etc.) to req.userId server-side so a manager-tier session
cannot assert another employee's identity. Bounded today: workflow-state only, no
PII/money, and the global auditLog records the TRUE req.userId so any impersonation
is attributable. Needs an auth-user -> employee id mapping that does not yet exist.
No production-logic change in this commit (comments + a test assertion only).
```

## Files touched (4)
- mcp-server/src/__tests__/businessDispatchRoute.test.ts | 10 ++++++++++
- mcp-server/src/data/business-dispatch-allowlist.ts     |  5 ++++-
- mcp-server/src/routes/business.ts                      |  9 ++++++---
- 3 files changed, 20 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till claimed handoff_counterparty_respond

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d8d2824cf2c1`
- Milestone envelope: `mcp-server/data/milestones/HOTEL-FORGE-ROADMAP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._