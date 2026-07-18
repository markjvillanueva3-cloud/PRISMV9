# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-MAP-WALL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-MAP-WALL (slot:echo): PS-5.1 MSAA-enumeration wall characterized + compiled-C# unblock found (no SDK). cimco-msaa-map-probe.ps1 proves the MSAA channel works (AccessibleObjectFromWindow->IAccessible, accChildCount=213 on XTPToolBar) but PS-5.1 cannot traverse it reliably: (1) typed [Accessibility.IAccessible] PARAM binding rejects the __ComObject RCW (PS arg-binding does not QI) even though its QI guid IS IAccessible; (2) AccessibleChildren (container marshaled as object/Interface) returns 0 NAMED for all 213 (lazy accName and/or VARIANT[] marshaling drop); (3) per-index get_accName empty too. => reliable IAccessible enum+drive is a compiled-C# job, not PS late-binding (the proven PrismWinMaxUI pattern). UNBLOCK supersedes A3: framework csc.exe IS present (C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe) + Accessibility.dll in GAC -> a net48 C# MSAA helper compiles HERE with NO .NET SDK install. Spec A6: next unit PrismCimcoUI.exe (oleacc IAccessible: AccessibleChildren name/role/defaultAction map + accDoDefaultAction drive + report-control read, csc.exe-compiled, orchestrated from cimco-sim-driver.mjs). Channel proven; clean tooling path identified; no operator provisioning needed.

**Commit:** `02f53b0bf315` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:00:39-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-msaa-map-wall, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-MAP-WALL (slot:echo): PS-5.1 MSAA-enumeration wall characterized + compiled-C# unblock found (no SDK). cimco-msaa-map-probe.ps1 proves the MSAA channel works (AccessibleObjectFromWindow->IAccessible, accChildCount=213 on XTPToolBar) but PS-5.1 cannot traverse it reliably: (1) typed [Accessibility.IAccessible] PARAM binding rejects the __ComObject RCW (PS arg-binding does not QI) even though its QI guid IS IAccessible; (2) AccessibleChildren (container marshaled as object/Interface) returns 0 NAMED for all 213 (lazy accName and/or VARIANT[] marshaling drop); (3) per-index get_accName empty too. => reliable IAccessible enum+drive is a compiled-C# job, not PS late-binding (the proven PrismWinMaxUI pattern). UNBLOCK supersedes A3: framework csc.exe IS present (C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe) + Accessibility.dll in GAC -> a net48 C# MSAA helper compiles HERE with NO .NET SDK install. Spec A6: next unit PrismCimcoUI.exe (oleacc IAccessible: AccessibleChildren name/role/defaultAction map + accDoDefaultAction drive + report-control read, csc.exe-compiled, orchestrated from cimco-sim-driver.mjs). Channel proven; clean tooling path identified; no operator provisioning needed.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-MAP-WALL (slot:echo): PS-5.1 MSAA-enumeration wall characterized + compiled-C# unblock found (no SDK). cimco-msaa-map-probe.ps1 proves the MSAA channel works (AccessibleObjectFromWindow->IAccessible, accChildCount=213 on XTPToolBar) but PS-5.1 cannot traverse it reliably: (1) typed [Accessibility.IAccessible] PARAM binding rejects the __ComObject RCW (PS arg-binding does not QI) even though its QI guid IS IAccessible; (2) AccessibleChildren (container marshaled as object/Interface) returns 0 NAMED for all 213 (lazy accName and/or VARIANT[] marshaling drop); (3) per-index get_accName empty too. => reliable IAccessible enum+drive is a compiled-C# job, not PS late-binding (the proven PrismWinMaxUI pattern). UNBLOCK supersedes A3: framework csc.exe IS present (C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe) + Accessibility.dll in GAC -> a net48 C# MSAA helper compiles HERE with NO .NET SDK install. Spec A6: next unit PrismCimcoUI.exe (oleacc IAccessible: AccessibleChildren name/role/defaultAction map + accDoDefaultAction drive + report-control read, csc.exe-compiled, orchestrated from cimco-sim-driver.mjs). Channel proven; clean tooling path identified; no operator provisioning needed.
```

## Files touched (3)
- scripts/cimco-msaa-map-probe.ps1                           | 110 +++++++++++++++++++++++++++++++++++
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md |  13 +++++
- 2 files changed, 123 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 02f53b0bf315`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._