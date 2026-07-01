# HOTEL/U-EMPLOYEE-MOBILE-PORTAL-R1 — [MAIN] [HOTEL]/U-EMPLOYEE-MOBILE-PORTAL-R1 (slot:hotel iter4) [BOOTSTRAP-SLOT-ENFORCE]: role-based ACL on privileged actions (bumpJobPriority + delegateTask). Optional injected RoleResolver — backward-compatible: ACL disabled when no resolver installed. Default allow lists: priority bump=[foreman,manager,admin], delegate=[foreman,manager,admin]. Refuse-on-unknown: unresolvable actor (resolver returns null) is REJECTED — never default-allow. configureRoleACL() supports per-method override. reset() drops the ACL config along with state. +9 test cases covering happy path / non-manager refusal / unknown-actor refusal / null-resolver reset / custom-role override. 68/68 tests pass.

**Commit:** `71fe33d69982` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T01:37:06-05:00
**Tags:** hotel, u-employee-mobile-portal-r1, auto-distilled

## Subject
[MAIN] [HOTEL]/U-EMPLOYEE-MOBILE-PORTAL-R1 (slot:hotel iter4) [BOOTSTRAP-SLOT-ENFORCE]: role-based ACL on privileged actions (bumpJobPriority + delegateTask). Optional injected RoleResolver — backward-compatible: ACL disabled when no resolver installed. Default allow lists: priority bump=[foreman,manager,admin], delegate=[foreman,manager,admin]. Refuse-on-unknown: unresolvable actor (resolver returns null) is REJECTED — never default-allow. configureRoleACL() supports per-method override. reset() drops the ACL config along with state. +9 test cases covering happy path / non-manager refusal / unknown-actor refusal / null-resolver reset / custom-role override. 68/68 tests pass.

## Body
```
[MAIN] [HOTEL]/U-EMPLOYEE-MOBILE-PORTAL-R1 (slot:hotel iter4) [BOOTSTRAP-SLOT-ENFORCE]: role-based ACL on privileged actions (bumpJobPriority + delegateTask). Optional injected RoleResolver — backward-compatible: ACL disabled when no resolver installed. Default allow lists: priority bump=[foreman,manager,admin], delegate=[foreman,manager,admin]. Refuse-on-unknown: unresolvable actor (resolver returns null) is REJECTED — never default-allow. configureRoleACL() supports per-method override. reset() drops the ACL config along with state. +9 test cases covering happy path / non-manager refusal / unknown-actor refusal / null-resolver reset / custom-role override. 68/68 tests pass.
```

## Files touched (3)
- .../EmployeeShopFloorMobileEngine.test.ts          | 65 ++++++++++++++++++++++
- .../src/engines/EmployeeShopFloorMobileEngine.ts   | 54 +++++++++++++++++-
- 2 files changed, 118 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 71fe33d69982`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._