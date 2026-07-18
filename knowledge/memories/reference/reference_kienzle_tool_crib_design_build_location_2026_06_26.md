---
name: reference_kienzle_tool_crib_design_build_location_2026_06_26
description: FLEET-WIDE — the REVAMPED Kienzle app build (Claude Design) is the zip H:\KIENZLE APP BUILD.zip (26 .dc.html pages = whole app). Canonical new UI for the entire Kienzle app; all builds change to match. Read before implementing/wiring any Kienzle frontend.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.632Z
aliases: reference_kienzle_tool_crib_design_build_location_2026_06_26
---


**THE REVAMPED KIENZLE APP BUILD (fleet-wide, operator-confirmed 2026-06-26, slot:quebec)**

The operator's full Claude-Design revamp of the **entire Kienzle app** is on disk:

## ⭐ Canonical build artifact
- **`H:\KIENZLE APP BUILD.zip`** (drive root) — 1,416,514 B, dated 2026-06-26 13:11. **42 files.** This is the NEW canonical UI for the WHOLE app; all current builds change to match it.
- Extracted working copy: **`H:/prism/mcp-server/web/design-imports/kienzle-app-build/`** (drop-zone; design source, not the shipped bundle).
- Source: Claude Design cloud project `9e002608-540b-4214-81ff-446dd2409274`.

## Contents (enumerated, R12 — not assumed)
**26 `.dc.html` design pages** (the full app):
Academy · Alarm Decoder · Audit & Rebrand · Backend Wiring Map · Blueprint Intake · CAD Features · Collision Gap · ERP · Employee Portal · Inventory · Job Cost · Materials · Payroll Labor · Post · Quality · Quote · Scheduling · Shop Floor · Speed-Feed · System Sync · Thermal Comp · **Tool Crib** · Tooling Shop · Trilobe Creator · Warm-Up Generator · Wizards.
Plus: `Machine3D.js`, `deck-stage.js`, `jm-data.js` (shared JS), `.thumbnail`, and `research/*.png` (current-state screenshots + 3D crib renders).

## What this means (cross-galaxy)
This is a FLEET-WIDE frontend redesign spanning every domain, not one page:
- **quebec** (frontend) implements/wires each `.dc.html` → `src/pages/` consuming the existing dispatchers.
- **charlie** (Quote/quoting), **hotel** (ERP/Employee Portal/Payroll/Inventory/Job Cost/Scheduling), **oscar** (Speed-Feed), **echo** (Post), **delta** (CAD Features/Collision/Thermal), **mike/whiskey/foxtrot** (Wizards), **lima** (Academy) own the respective backends quebec consumes.
- Backend already bridged for Tool Crib: `/api/v1/tool-crib` (`ToolCribEngine`, commit `4ca7837887`).

## Supersedes
Corrects the earlier finding in this memory ("no clean loose file on disk") — the build IS on disk as the zip above. Prior on-disk pointer `H:/prism/state/shared/KIENZLE-TOOL-CRIB-DESIGN-DIRECTIVE.md` still valid (intent note). Per [[reference_quebec_fe_be_wiring_state_2026_06_25]]: Claude Design owns the UI; quebec owns DATA/API wiring.

## Next step to apply
Implement each `.dc.html` 1:1 into `mcp-server/web/src/pages/` + wire to the existing prism_* dispatchers via `src/api/`. Large multi-galaxy rollout — sequence by domain, one page per unit, per-file scrutiny.
