---
name: reference_cimco_navmap_2026_06_03
description: "CIMCO blind-navigation map (U-CIMCO-NAV-MAP) — 511 navigable surfaces extracted from 154 CHM pages, wired into prism_cimco"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.065Z
aliases: reference_cimco_navmap_2026_06_03
---


# CIMCO blind-navigation map — U-CIMCO-NAV-MAP (slot:echo, 2026-06-03)

**What shipped** (`cad-fusion-live-ms0`, CIMCO-INTEGRATION-MS0):
The "plot the entire CIMCO app for full blind navigation" deliverable. A multi-agent **Workflow** (`cimco-blind-nav-plot`, wf_ffa343d5: 12 plot + 5 verify + 1 synth agents, ~2.7M subagent tokens) read the **154 decompiled CHM help pages** (`resources/cimco-2026/_extracted/edit_us/`, CIMCO Edit 2026.01.10) and extracted **511 navigable surfaces** (370 proof-relevant) — every menu/dialog/tab/shortcut/setup screen keyed by automation channel.

**Artifacts:**
- `state/shared/cimco/nav-map.json` — the 511-surface durable map + critical-path verdicts + synthesis.
- `scripts/cimco-nav-map.mjs` — loader/query API (loadNavMap, queryNav, resolveNav, validateNavMap, blindNavReadiness, criticalProcedures, channelDistribution). CLI: `summary|query|resolve|procedures|readiness|verify`. 21/21 tests (`cimco-nav-map.test.mjs`).
- `scripts/cimco-nav-map-ingest.mjs` — Workflow-output → nav-map.json ETL (regen path).
- Wired into `CimcoVerificationBridgeEngine.navQuery()` + `navReadiness()` → `prism_cimco` actions `cimco_nav_query` + `cimco_nav_readiness` (schema + dispatcher + 4 round-trip tests; 28/28 bridge tests). tsc-clean.

**Channel split (the headline):** uia 374 · file 120 · dnc-api 14 · cli 3. The strongest blind channel is **file** (NC I/O, `.setup` stock/fixture sidecar, `.tmlib`, MachineCfg authoring, File-Compare ignore-options).

**Critical-path verdict — all 5 navigable=true** (open-nc → load-machine-model+stock → run-sim → read-sim-report → file-compare). BUT honest gap: the **VERDICT half (Machine Simulation run + Simulation Report + in-app File-Compare) is UIA-only on the live licensed app with NO documented export.** Post-proving is ~60-70% blind-driveable today; SETUP+INPUT (file/cli) + SHIP (FTP) are headless. The keystone unblock = a verified UIA Simulation-Report reader (SPINE-2).

**Operator's "use system machine models in CIMCO":** `setup.machine-models.install` is GUI/UIA-only — only CUSTOM-machine provisioning is file-blind. The 86 native `.mcfg` are managed via the Machine Models tab (requires Machine Simulation add-on license active).

**5 dependency-ordered next units** (from synthesis): U-CIMCO-LAUNCH-PROBE → U-CIMCO-UIA-REPORT-READER (keystone) → U-CIMCO-SETUP-SIDECAR-AUTHOR → U-CIMCO-DIALECT-ALLOWLISTS → U-CIMCO-FTP-SHIP-VERIFY.

Sibling: [[reference_cimco_bridge_engine_spine1_2026_06_02]] (SPINE-1). Wiki [[cimco-verification-simulation-integration]]. See also [[reference_cimco_drift_grouping_bug_2026_06_03]] (drift-audit finding from the same session).
