# HOTEL/U-EMP-HUB-ROUTE-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMP-HUB-ROUTE-WIRE (slot:hotel /goal iter11): wire HotelEmployeeHubPage into App.tsx router at /employee/hotel-hub

**Commit:** `4510f6654209` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T14:32:23-05:00
**Tags:** hotel, u-emp-hub-route-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMP-HUB-ROUTE-WIRE (slot:hotel /goal iter11): wire HotelEmployeeHubPage into App.tsx router at /employee/hotel-hub

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMP-HUB-ROUTE-WIRE (slot:hotel /goal iter11): wire HotelEmployeeHubPage into App.tsx router at /employee/hotel-hub

Honest follow-up: yesterday's a7456e621a shipped the page + test but did NOT add the <Route> entry, so the page was unreachable from the running app. This commit closes the gap.

App.tsx:
  + lazy import: const HotelEmployeeHubPage = lazy(() => import('./pages/HotelEmployeeHubPage'))
  + <Route path='hotel-hub' element={lazyElement(<HotelEmployeeHubPage />)} /> alongside the existing phone-portal route

HotelEmployeeHubPage.tsx: refactored from required employee_id prop to internal useState with optional initial_employee_id prop (matches EmployeePhonePortalPage convention — employee picks their id at the top via an <input>). Header now has employee_id input field.

Route: /employee/hotel-hub — protected by EmployeeShellLayout + secure(). Navigable from the employee shell.

Test 6/6 PASS, tsc clean.

Frontend app NOW BUILT end-to-end (component + route + auth-gated layout). Backend HTTP route /api/v1/business/dispatch still tracked as U-PORTAL-BUSINESS-ROUTE follow-up — the dispatcher actions exist + are unit-tested but the Express mount is not yet wired (the page will 404 on its first API call until that lands).
```

## Files touched (3)
- mcp-server/web/src/App.tsx                        |  2 ++
- mcp-server/web/src/pages/HotelEmployeeHubPage.tsx | 19 +++++++++++++------
- 2 files changed, 15 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till tracked as U-PORTAL-BUSINESS-ROUTE follow-up — the dispatcher actions exist + are unit-tested but the Express mount is not yet wired (the page will 404 on its first API call until that lands).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4510f6654209`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._