# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-INVOKE-WATCHDOG — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-INVOKE-WATCHDOG (slot:echo): live-validated robustness fix - accDoDefaultAction on a Codejock control is SYNCHRONOUS and BLOCKS FOREVER (invoke "Backplot" never returned - the MSAA default-action opens a modal / waits on foreground). Fixed in PrismCimcoUI.exe with an 8s watchdog thread that force-exits (Environment.Exit) emitting blocked:true if the action does not return, so the process NEVER hangs (action still dispatched; orchestrator handles modal out-of-band; neither ok nor blocked is a clearance signal). Interlocked guard prevents double-print race. Re-validated live: invoke "Machine Simulation" now returns cleanly, exe self-terminates, 0-orphan. This is exactly the class of bug only LIVE validation (R15) surfaces - the read path passed review but the drive path hung. Recompiled pure-ASCII via framework csc.exe. Spec A7 amended. Node orchestrator (next) must also spawn-with-timeout-kill as a 2nd backstop.

**Commit:** `f46119631e1c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T14:16:56-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-invoke-watchdog, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-INVOKE-WATCHDOG (slot:echo): live-validated robustness fix - accDoDefaultAction on a Codejock control is SYNCHRONOUS and BLOCKS FOREVER (invoke "Backplot" never returned - the MSAA default-action opens a modal / waits on foreground). Fixed in PrismCimcoUI.exe with an 8s watchdog thread that force-exits (Environment.Exit) emitting blocked:true if the action does not return, so the process NEVER hangs (action still dispatched; orchestrator handles modal out-of-band; neither ok nor blocked is a clearance signal). Interlocked guard prevents double-print race. Re-validated live: invoke "Machine Simulation" now returns cleanly, exe self-terminates, 0-orphan. This is exactly the class of bug only LIVE validation (R15) surfaces - the read path passed review but the drive path hung. Recompiled pure-ASCII via framework csc.exe. Spec A7 amended. Node orchestrator (next) must also spawn-with-timeout-kill as a 2nd backstop.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-INVOKE-WATCHDOG (slot:echo): live-validated robustness fix - accDoDefaultAction on a Codejock control is SYNCHRONOUS and BLOCKS FOREVER (invoke "Backplot" never returned - the MSAA default-action opens a modal / waits on foreground). Fixed in PrismCimcoUI.exe with an 8s watchdog thread that force-exits (Environment.Exit) emitting blocked:true if the action does not return, so the process NEVER hangs (action still dispatched; orchestrator handles modal out-of-band; neither ok nor blocked is a clearance signal). Interlocked guard prevents double-print race. Re-validated live: invoke "Machine Simulation" now returns cleanly, exe self-terminates, 0-orphan. This is exactly the class of bug only LIVE validation (R15) surfaces - the read path passed review but the drive path hung. Recompiled pure-ASCII via framework csc.exe. Spec A7 amended. Node orchestrator (next) must also spawn-with-timeout-kill as a 2nd backstop.
```

## Files touched (2)
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md | 1 +
- 1 file changed, 1 insertion(+)

## Lessons surfaced in commit body
- till dispatched; orchestrator handles modal out-of-band; neither ok nor blocked is a clearance signal). Interlocked guard prevents double-print race. Re-validated live: invoke "Machine Simulation" now returns cleanly, exe self-terminates, 0-orphan. This is exactly the class of bug only LIVE validation (R15) surfaces - the read path passed review but the drive path hung. Recompiled pure-ASCII via fram

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f46119631e1c`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._