---
session: claude-8f2683e8
topic: cad-fusion-live-ms0
written_at: 2026-05-12T15:52:04.447Z
machine: MARKV
family: Claude
session_key: claude-8f2683e8
status: active
---

# HANDOFF: claude-8f2683e8
Updated: 2026-05-12T15:52:04.455Z
Family: Claude | Machine: MARKV | Session: claude-8f2683e8

## STATE
Shipped: JM Die part library (PartFolderOrganizerEngine + prism_cad 4 actions + 44 tests + esbuild; 25,028 part folders / 42,407 print pages / 10,678 program files materialized via phase18; 2 customer-consolidation passes 1024->483 folders via phase19 + a 51-company alias map in part-library-layout.json). 3-agent scrutiny: consolidation sound (no data loss, 0 collisions); ~32K programs all accounted-for in jm-die-full-program-index-v2.json, ~33% in the library (the rest = miss/garbage join rows); system-viz code wired but needs digest regen; ran system-viz + build-state regen. README + _TEMPLATE in _PART LIBRARY/. Enumerated (not built) the macro-program/domain-command request -> DOMAIN-STUDIO-NODE-MAP.md. All uncommitted (worktree fork needed). 3-way scrutiny gate still pending.

## RESUME
NEXT SESSION: per the user (2026-05-12), run /forge + /system-viz to scope+build the macro-program pipeline + 3 domain mega-commands. (1) Read state/shared/specs/DOMAIN-STUDIO-NODE-MAP.md (the system-viz node enumeration for /lathe /mill /wedm) and state/shared/handoffs/HANDOFF-claude-7b9d1810-docustra-print-extra.md §"NEW REQUEST" (full plan + safety flag). (2) Recommended order: B=/forge+/rgs scoping run for the macro->program pipeline (macro-library engine + safety-gated MacroProgramFillEngine that fills Okuma-OSP VC vars from print dims, S(x)>=0.70 + sim back-plot + operator-in-the-loop, per-lathe-machine post-resolution from ShopConfigurationEngine, bulk fan-out into _PART LIBRARY part folders) -> A=build the 3 mega-commands /lathe /mill /wedm (~300-500 lines each, wire everything in the node map) -> C=per-lathe-machine program gen ONLY after the safety pipeline exists; NEVER bulk-auto-emit G-code. (3) Also still pending: commit this session diff via a worktree fork (fights commit-ownership-guard in main tree) + run the 3-way scrutiny gate; wire PartFolderOrganizerEngine.resolveCustomer (TS) to apply the customer-alias map from part-library-layout.json; regenerate ENGINE_DIGEST/DISPATCHER_DIGEST so PartFolderOrganizerEngine + prism_cad:create_part_folder etc show by name; phase15-huge daemon still running (~13h) -> when done re-run phase16 join + phase18 (alias-aware now). Background: jm-part-library daemon retired (done); phase15-huge has a self-reviving scheduled task with a PID-reuse hole (manual restart cmd in the handoff FIRST ACTION).

## CONTEXT
Macro folder = H:/PRISM/JM DIE/Macro programs/ (4 Okuma-OSP VC-variable lathe macros: BASE WAFER INSERT MACRO=O1001, BASIC-CASING, BASIC CASING WITH SINGLE COUNTERBORE, BASIC TOP HAT CASING WITH SINGLE COUNTERBORE). Part families they cover: wafer insert / casing / top-hat casing. The handoff file HANDOFF-claude-7b9d1810-docustra-print-extra.md is the comprehensive record (this chat updates it BY PATH; stable-session-id mis-resolves this chat). Project tsc has 1356 PRE-EXISTING errors (not from this session diff; my 3 source files type-check clean). esbuild build (npm run build:fast) is current.
