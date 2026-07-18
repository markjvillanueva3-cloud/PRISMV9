---
session: claude-2993382b
topic: oscar-sfc-accuracy
slot: oscar
written_at: 2026-06-25T14:17:16.274Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-2993382b
status: active
---

# HANDOFF: claude-2993382b
Updated: 2026-06-25T14:17:16.274Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-2993382b

## STATE
## SESSION COMPLETE -- 2 commits, 9 loop iters (slot:oscar, cad-fusion-live-ms0)
### Shipped
1. U-OSC-SFC-PRODUCT-BRIDGE -- P0: SFC web calculator was 100% blocked (prism_product:sfc_calculate false-blocked by machine-completeness gate: page posts FLAT machine_max_rpm/_power_kw, gate reads NESTED machine.spindle.*; productDispatcher didn't bridge). Shared applySfcMachineBridge() wired in; calcDispatcher refactored to it. 15/15 unit + 3/3 live-gate round-trip; live-verified; 2-arm scrutiny PASS.
2. U-OSC-SFC-GAUNTLET-DURABLE-TASK -- scripts/install-sfc-gauntlet-task.ps1: durable Windows task for the JM-accuracy-report refresh (sfc-jm-accuracy-refresh every 6h), the one gauntlet leg that was Claude-cron-only. Parse-validated; 2-arm scrutiny PASS. NEEDS operator elevated registration.

### Verified findings (R12)
- ACCURACY: SFC is conservative-safe vs ALL JM -- 169/509,381 high-conf over-speeds; '124K aggressive' = 99.9% G50-clamped + default-H. Units/inch handling CORRECT (read actual G96 NC). NO calc bug.
- NEVER-STOP: largely ALREADY BUILT + LIVE -- 'PRISM SFC Variability Guard' fires every 5min (guard.jsonl proof); +remine weekly. My '0 tasks' earlier was a non-elevated schtasks VISIBILITY artifact. Inventory: reference_sfc_durable_tasks_inventory_2026_06_25.
- MATERIAL lever: default-H is BEST AVAILABLE. Programs state no material; quoting material_iso (32,502 recs) exists but keyed by job-number which does NOT reliably join to description-named program files -> join INFEASIBLE as scoped. Full analysis: reference_oscar_sfc_jm_gauntlet_accuracy_verdict_2026_06_25.

### Operator pivot (broadcast)
Frontend UI -> Claude desktop app; backend slots = calc accuracy only; PRISM rebrand (Sandvik). feedback_frontend_ui_owned_by_desktop_claude_2026_06_25.

### Pre-existing (not mine)
2 tsc errors ReinforcementLearningCAMFeedbackEngine.ts; sys-ms1-sub-dispatchers.test.ts 5 stale action-count asserts.

## RESUME
/startup-oscar /loop /goal -- oscar/SFC backend accuracy. THIS SESSION COMPLETE (9 iters, loop ended: high-value units delivered + material lever proven data-join-infeasible). PENDING operator: register the durable accuracy-report task (elevated): powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-sfc-gauntlet-task.ps1 -RunNow. FUTURE (larger efforts, not quick loop units): (a) per-program material via part-DESCRIPTION<->material map or setup-sheet extraction (the quote-part-number join is INFEASIBLE -- programs are description-named); (b) coordinate w/ charlie(quoting)/hotel(orders) if material accuracy becomes a priority.

## CONTEXT

