---
name: reference_post_ship_cimco-integration-ms0-u-cimco-sim-arch-fix
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-ARCH-FIX (commit 5cf1a88ed). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.808Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-sim-arch-fix
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-ARCH-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-ARCH-FIX (slot:echo): architecture correction — no dotnet SDK on this box, and the proven WinMAX helper uses RAW System.Windows.Automation (not FlaUI). So the production driver is PowerShell-native raw-UIA (cimco-sim-drive.ps1 + ui-map FSM), functionally equiv to compiled C# but no build step — runs here today. Brittleness was fixed-sleeps, not language; fix = wait-for-control-enabled + retry-invoke + re-probe-confirm FSM. Operator option: provision .NET SDK for a compiled PrismCimcoUI.exe clone. Spec A3 added.

**Shipped:** 2026-06-04T11:21:26-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[cimco-integration-ms0-u-cimco-sim-arch-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._