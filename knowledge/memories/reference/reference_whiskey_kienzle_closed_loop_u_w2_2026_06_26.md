---
name: reference-whiskey-kienzle-closed-loop-u-w2-2026-06-26
description: "Lathe Wizard (->Kienzle) exhaustive closed-loop test -- assessment + U-W2 unified driver + the real JM data scale + the dedup/safety findings (slot:whiskey, 2026-06-26)"
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.257Z
aliases: reference_whiskey_kienzle_closed_loop_u_w2_2026_06_26
---


# Lathe Wizard -> Kienzle: closed-loop test assessment + U-W2 driver (2026-06-26)

Operator /goal (slot:whiskey, session 5e7ecda3): assess the print->CNC-program-for-lathes wizard, build an exhaustive closed-loop test over ALL JM data, max lathe tribal, build BE/FE, rename Lathe Wizard -> **Kienzle**. Master plan: `state/shared/specs/KIENZLE-LATHE-WIZARD-MASTER-PLAN-2026-06-26.md`.

## Verified JM lathe data scale (find-counted, not survey hearsay)
- `.MIN` programs = **34,993** total (16,558 under `JM DIE/CNC LATHE/`, ~18.4K more under `JM DIE/OKUMA/` etc.)
- `.nc` = **114,653** (CNC LATHE) | STEP/STP = **2,307** | Fusion `.f3d` = **1,737** | lathe PDF prints = **10** | Mastercam `.mcam` = 0 (Fusion->post->NC workflow).

## Key findings
- **DEDUP (R8 win):** `TurningPrintIntakeEngine.ts:535` already builds `TurningInput` from BlueprintVisionOCREngine output (print/photo OCR path). `PipelineHarnessAdaptersEngine.normalizeLatheInput()` normalizes to it. So GAP-1 "print->features" is **wiring, not a new engine** -- creating a `LathePrintFeatureExtractionBridgeEngine` would have been a duplicate.
- **Doctrine rot fixed:** `lathe/CLAUDE.md` flagged `threadingPipelineDispatcher.ts` as "UNVERIFIED not found" -- it **EXISTS** (`mcp-server/src/tools/dispatchers/threadingPipelineDispatcher.ts` + `ThreadingPipelineEngine.ts`, wired in index.ts). Was a wrong-path miss. Corrected.
- **Engines are REAL, not stubs:** the lathe MEMORY.md "STUB" line is about the per-galaxy memory-doc migration (U-GALAXY-MS1-C1), not the 251 lathe engines (LatheCollisionZoneEngine 20+ tests, turningPrintToProgramEngine runnable since adapter bound 2026-06-03).
- **SAFETY finding (live):** Rung A over the full CNC-LATHE corpus (16,558 .MIN, 0 parse errors) -> SFM p50 169, feed p50 0.003 IPR, **97.9% G50-cap compliance, 310 programs are G96-CSS with NO G50 cap = overspeed-risk**.
- **PRISM accuracy (Rung B):** generator feed lands in the JM empirical band **96.3%** of the time.

## Shipped
- `U-W0-MASTER-PLAN` (committed): master plan spec + doctrine fix.
- `U-W2-CLOSED-LOOP-DRIVER` (committed): `scripts/lathe-closed-loop-full.mjs` -- unified driver orchestrating Rung A + Rung B + combined dashboard (`state/shared/dashboards/lathe-closed-loop-full.{json,md}`). Spawn bug fixed (use `process.execPath` not bare "node" under portable node; `lastJson` handles multi-line pretty JSON). `full_geometry_loop_closed=false` is honest -- Rung C-CAD (STEP geometry->features + part# join) is the remaining keystone.

## Remaining (cron dcdc0189, overnight yolo)
U-W3 Rung C-CAD + corpus expansion to all 34,993 .MIN + driver unit test (R9 debt). U-W4 wire 4 Okuma engines. U-W5 LoRA-safety wire. U-W6 tribal 57->500 via /pdf-learn+/video-learn. U-W7 3 FE/BE lathe API gaps. U-W8 Kienzle rename (operator decisions: brand string, appId reverse-DNS).

Related: [[reference_whiskey_lathe_soul_designation_2026_05_27]] · [[feedback_check_units_first]] · [[reference_lathe_100pct_wired_2026_05_23]]
