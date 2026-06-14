---
name: reference_post_ship_hotel-u-employee-mobile-portal-r1
description: Auto-distilled learnings from shipping HOTEL/U-EMPLOYEE-MOBILE-PORTAL-R1 (commit 71fe33d69). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.493Z
aliases: reference_post_ship_hotel-u-employee-mobile-portal-r1
---


# HOTEL/U-EMPLOYEE-MOBILE-PORTAL-R1

[MAIN] [HOTEL]/U-EMPLOYEE-MOBILE-PORTAL-R1 (slot:hotel iter4) [BOOTSTRAP-SLOT-ENFORCE]: role-based ACL on privileged actions (bumpJobPriority + delegateTask). Optional injected RoleResolver — backward-compatible: ACL disabled when no resolver installed. Default allow lists: priority bump=[foreman,manager,admin], delegate=[foreman,manager,admin]. Refuse-on-unknown: unresolvable actor (resolver returns null) is REJECTED — never default-allow. configureRoleACL() supports per-method override. reset() drops the ACL config along with state. +9 test cases covering happy path / non-manager refusal / unknown-actor refusal / null-resolver reset / custom-role override. 68/68 tests pass.

**Shipped:** 2026-05-24T01:37:06-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hotel-u-employee-mobile-portal-r1]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._