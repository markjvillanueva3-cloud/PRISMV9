---
name: reference_cimco_spine2_livesim_derisk_2026_06_04
description: "CIMCO SPINE-2 live Machine-Sim driver — empirical UIA de-risk = GO + 7-unit build plan (U-CIMCO-SIM-DERISK, slot:echo)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.066Z
aliases: reference_cimco_spine2_livesim_derisk_2026_06_04
---


**CIMCO SPINE-2 live-sim de-risk — U-CIMCO-SIM-DERISK (slot:echo, 2026-06-04, commit `0e7359e56a`)**

Operator bought the Machine Simulation add-on + granted permission to launch CIMCO → the previously operator-gated keystone (live collision/accuracy verdict) is now buildable. Used the `cimco-spine2-livesim-path` Workflow (6 agents, ~1.05M tok) + a live empirical UIA probe to find the path + retire most of the gating risk.

**Empirical GO (verified live, DESKTOP-N7MI1VB, via `scripts/cimco-uia-probe.ps1`):**
- Licensed install = `C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe` (MFC/Codejock XTP, window class **`XTPMainFrame`**). The `H:\resources\cimco-2026` copy is **reference-only (no license)** — driver must target Program Files.
- **Raw Windows UI-Automation reads the app's full ribbon/tab/menu/button tree (names + IsEnabled), zero-install (no NuGet).** Launch reliable ~4-6s.
- **CIMCO is SINGLE-INSTANCE** — launching while an instance exists forwards the file & the new pid exits → find the window **globally by class `XTPMainFrame`, NEVER by launched pid**; pre-kill for a clean slate.
- `Backplot` tab = the Machine-Simulation surface; tab activation works via **InvokePattern** (not SelectionItem — Codejock XTP). **`Machine Simulation` ribbon button is ENABLED → add-on entitlement appears active** (base-Edit greys it out). `Machine`, `Control Type` (controller bind), `Backplot` all present+enabled.
- **The Simulation Report (verdict) has NO export channel** (no file/CLI/COM/SQL/macro — 3 recon arms) → must be **UIA-scraped** from the running window.

**Remaining gating risk (U-CIMCO-SIM-1):** can UIA read the report GRID cells, or is it custom-drawn MFC needing OCR? Needs a running sim to answer. Fallback ladder Grid→Table→Text→OCR (source-tagged, OCR never alone clears) → else fail-CLOSED.

**Plan:** `state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md` — 7 units `U-CIMCO-SIM-1..7`, dependency-ordered, **clone the proven WinMAX bridge** (`scripts/winmax-{driver,ui-map}.mjs` + `mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/{Program.cs,PrismWinMaxUI.exe}` net48 C# UIA, JSON-from-end-of-stdout). Consumes `cimco-nav-planner.planNavigation` + `assessLiveRunClearance` (engine ~L777). Fail-CLOSED safety gates; `controllerVerified:false` hardcoded; per-machine JM fleet matrix (12 sim + 3 EDM); **VMC-01 Hurco = first live E2E** (exact RPost). Mock-by-default, live transport operator-supervised, NEVER auto-launches.

Iter 3 of the CIMCO proveout `/loop`. Builds on [[reference_cimco_nav_planner_2026_06_04]] (simulate step plan) + [[reference_cimco_jm_machine_map_2026_06_02]] (machine→.mcfg) + [[reference_cimco_verify_open_file_2026_06_04]] (the offline blind-safe arm). Wiki [[cimco-verification-simulation-integration]].
