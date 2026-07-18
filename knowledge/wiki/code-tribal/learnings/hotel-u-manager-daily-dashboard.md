# HOTEL/U-MANAGER-DAILY-DASHBOARD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-MANAGER-DAILY-DASHBOARD (slot:hotel iter21 /goal): foreman/manager team rollup — natural counterpart to EmployeeDailyDigest (iter20) closing the manager-side view

**Commit:** `daf788c45efb` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T21:48:09-05:00
**Tags:** hotel, u-manager-daily-dashboard, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-MANAGER-DAILY-DASHBOARD (slot:hotel iter21 /goal): foreman/manager team rollup — natural counterpart to EmployeeDailyDigest (iter20) closing the manager-side view

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-MANAGER-DAILY-DASHBOARD (slot:hotel iter21 /goal): foreman/manager team rollup — natural counterpart to EmployeeDailyDigest (iter20) closing the manager-side view

— ManagerDailyDashboardEngine: pure transform over manager input (direct_reports + pending_pto_requests + team_coverage_gaps + overdue_action_items) → team_rollup (n_reports, avg_composite, top_performer, ready_for_promotion list, needs_attention dims, pct_with_today_shift) + top-5 ranked priorities. Urgency hierarchy: unstaffed_machine (sortKey 0) > overdue >7d action (1) > stale >7d PTO (2) > other coverage gaps (10) > overdue ≤7d action (12) > team_alert <0.55 avg (14) > stale 4-7d PTO (15) > fresh PTO (20). team_alert triggers when n≥3 AND avg_composite<0.55.

— Tests: 18/18 PASS. Variability: empty team zero-shape, 3-report typical, multi-dim needs_attention per employee, promote_now+ready both classified, 10-gap top-5 cap, 4 urgency tiers (PTO 10d→critical, PTO 4d→warn, action >7d→critical, team avg <0.55→team_alert). ≥5 R12 modes (missing manager_id, bad date, composite_score out-of-range, NaN composite, negative age_days, non-array fields).

— businessDispatcher: +1 action (manager_dashboard_build).

— /system-viz synergy: hotel-domain classifier extended (manager_dashboard_ regex → business axis).

Closes the manager-side view of the synergy capstone — iter20 was per-employee phone-ready; iter21 is per-manager team-ready. Same urgency-ranking philosophy: safety/coverage gaps come BEFORE info noise.
```

## Files touched (5)
- .../__tests__/ManagerDailyDashboardEngine.test.ts  | 306 +++++++++++++++++++++
- .../src/engines/ManagerDailyDashboardEngine.ts     | 241 ++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |   8 +
- scripts/generate-hotel-domain-features.mjs         |   1 +
- 4 files changed, 556 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show daf788c45efb`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._