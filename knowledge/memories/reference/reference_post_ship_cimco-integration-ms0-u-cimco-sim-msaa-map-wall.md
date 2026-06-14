---
name: reference_post_ship_cimco-integration-ms0-u-cimco-sim-msaa-map-wall
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-MAP-WALL (commit 02f53b0bf). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.921Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-sim-msaa-map-wall
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-MAP-WALL

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-MAP-WALL (slot:echo): PS-5.1 MSAA-enumeration wall characterized + compiled-C# unblock found (no SDK). cimco-msaa-map-probe.ps1 proves the MSAA channel works (AccessibleObjectFromWindow->IAccessible, accChildCount=213 on XTPToolBar) but PS-5.1 cannot traverse it reliably: (1) typed [Accessibility.IAccessible] PARAM binding rejects the __ComObject RCW (PS arg-binding does not QI) even though its QI guid IS IAccessible; (2) AccessibleChildren (container marshaled as object/Interface) returns 0 NAMED for all 213 (lazy accName and/or VARIANT[] marshaling drop); (3) per-index get_accName empty too. => reliable IAccessible enum+drive is a compiled-C# job, not PS late-binding (the proven PrismWinMaxUI pattern). UNBLOCK supersedes A3: framework csc.exe IS present (C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe) + Accessibility.dll in GAC -> a net48 C# MSAA helper compiles HERE with NO .NET SDK install. Spec A6: next unit PrismCimcoUI.exe (oleacc IAccessible: AccessibleChildren name/role/defaultAction map + accDoDefaultAction drive + report-control read, csc.exe-compiled, orchestrated from cimco-sim-driver.mjs). Channel proven; clean tooling path identified; no operator provisioning needed.

**Shipped:** 2026-06-04T13:00:39-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[cimco-integration-ms0-u-cimco-sim-msaa-map-wall]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._