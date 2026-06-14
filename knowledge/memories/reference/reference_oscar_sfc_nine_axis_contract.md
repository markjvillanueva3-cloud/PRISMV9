---
name: reference-oscar-sfc-nine-axis-contract
description: The SpeedFeedNineAxisOrchestratorEngine input contract — 9 axes, 3 modes, clamp order. The real SFC recommendation path (not a one-off formula).
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.258Z
aliases: reference_oscar_sfc_nine_axis_contract
---


# SFC 9-axis orchestrator contract (the real recommendation path)

`speedFeedNineAxisOrchestratorEngine.run({...})` is the canonical SFC entry — NOT `sfc_calculate` alone (that's single-cell physics). Wired `prism_calc:sfc_nine_axis_run`.

**9 input axes:** machine · spindle · controller · material · workholding · holder · tooling · coolant · toolpath.

**3 modes:** `cost_batch` (min $/part), `aggressive_rush` (max MRR, gates on chatter SLD), `prism_optimized` (balanced — default).

**Output:** MRR-ranked candidate set + ROI investment popup + per-candidate Vc/RPM/feed/chipload/MRR/power/tool-life, each clamped.

**Clamp order (what the engine enforces, in sequence):**
1. Spindle RPM min/max + power/torque curve (`MachineSpindleDefaults` / torque curves) — hard.
2. Chatter stability (Altintas SLD + RCSA-FRF, `SpeedFeedChatterStabilityAdapterEngine`) — hard on aggressive mode.
3. Chip-thinning effective-feed correction when ae/D<0.5 or lead≠90°.
4. Thermal / coolant limit.
5. CSS (G96) → G50/G92 max-RPM cap injection.

Source: `mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts` (per [[reference_oscar_sfc_9axis_ship_absorbed_2026_05_25]], 1954 LOC, 59/59 tests). Cross-ref [[reference_oscar_sfc_domain_map_2026_05_27]].
