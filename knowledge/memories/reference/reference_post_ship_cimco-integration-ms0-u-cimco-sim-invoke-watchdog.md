---
name: reference_post_ship_cimco-integration-ms0-u-cimco-sim-invoke-watchdog
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-INVOKE-WATCHDOG (commit f46119631). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.875Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-sim-invoke-watchdog
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-INVOKE-WATCHDOG

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-INVOKE-WATCHDOG (slot:echo): live-validated robustness fix - accDoDefaultAction on a Codejock control is SYNCHRONOUS and BLOCKS FOREVER (invoke "Backplot" never returned - the MSAA default-action opens a modal / waits on foreground). Fixed in PrismCimcoUI.exe with an 8s watchdog thread that force-exits (Environment.Exit) emitting blocked:true if the action does not return, so the process NEVER hangs (action still dispatched; orchestrator handles modal out-of-band; neither ok nor blocked is a clearance signal). Interlocked guard prevents double-print race. Re-validated live: invoke "Machine Simulation" now returns cleanly, exe self-terminates, 0-orphan. This is exactly the class of bug only LIVE validation (R15) surfaces - the read path passed review but the drive path hung. Recompiled pure-ASCII via framework csc.exe. Spec A7 amended. Node orchestrator (next) must also spawn-with-timeout-kill as a 2nd backstop.

**Shipped:** 2026-06-04T14:16:56-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[cimco-integration-ms0-u-cimco-sim-invoke-watchdog]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._