---
name: reference_echo_hurco_winmax_priority
description: MasterPost MVP controller priority is Hurco WinMAX-first (post-processor galaxy / slot echo)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.092Z
aliases: reference_echo_hurco_winmax_priority
---


MasterPost product MVP controller priority (per MS-MASTERPOST envelope): **Hurco WinMAX → Haas → Fanuc → Siemens 840D → Mazatrol → Okuma OSP**. 4-week MVP, backend ~70% built.

Hurco-first because JM Die's lead machine + the largest post engine is `HurcoV11MillMasterPostEngine.ts` (92K) — the most-exercised real-world surface. The JM Hurco fleet (VM30i v8.9 / v10.9-DRILLFIX / v11 / PRISM-Master, WinMAX/MAX5) carries PRISM-enhanced roughing (dyn-depth, chip-thin, corner G-force, 8-level, deflection-comp), G05.3 smooth, UltiMotion G64. Recent echo work: HURCO-POST-PIPELINE-BRIDGE-MS0 (tier-aware Ω floor 0→120/200, dialect-aware stub).

16 in-flight handoffs include 8 `hurco-vm30i-fu*` + 5 `hurco-post-r*` — coordinate via chat-bus before touching `HurcoV11*`. See [[reference_echo_jm_cps_fleet]], [[reference_echo_legal_gate_masterpost]].
