---
name: reference_post_ship_per-slot-galaxy-buildout-u-echo-winmax-bridge-2
description: Auto-distilled learnings from shipping PER-SLOT-GALAXY-BUILDOUT/U-ECHO-WINMAX-BRIDGE-2 (commit 9f5b0281f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.622Z
aliases: reference_post_ship_per-slot-galaxy-buildout-u-echo-winmax-bridge-2
---


# PER-SLOT-GALAXY-BUILDOUT/U-ECHO-WINMAX-BRIDGE-2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PER-SLOT-GALAXY-BUILDOUT]/U-ECHO-WINMAX-BRIDGE-2: live WCF probe against running WinMax — CORRECTS http:8080 assumption (R12). Verified: WcfDataService hosts net.tcp:4502 (DataServicetcp, contract WcfDataServices.IDataService) + net.pipe ONLY; the config's HTTP SOAP/mex endpoints are NOT listening; no .NET SDK on box. probeWcfLive rewritten to net.tcp reachability probe (reports reachable+contract+'.NET-client-needed', never fabricates). 12 tests (hermetic net.tcp reachable + unreachable). DESIGN: live-probe findings + go-live decision (install .NET SDK->C# shim recommended)

**Shipped:** 2026-05-30T00:29:58-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[per-slot-galaxy-buildout-u-echo-winmax-bridge-2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._