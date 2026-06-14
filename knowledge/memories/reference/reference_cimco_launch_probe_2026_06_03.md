---
name: reference_cimco_launch_probe_2026_06_03
description: CIMCO launch surface (U-CIMCO-LAUNCH-PROBE) — exe inventory + verified/needs-live launch patterns + the blind-safe External-Commands integration hook
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.065Z
aliases: reference_cimco_launch_probe_2026_06_03
---


# CIMCO launch surface — U-CIMCO-LAUNCH-PROBE (slot:echo, 2026-06-03)

**What shipped** (`cad-fusion-live-ms0`, CIMCO-INTEGRATION-MS0): the R13 foundation under the run-sim/compare path — HOW a blind agent starts and drives the local CIMCO Edit 2026 install to prove a JM-fleet post.

- **Data:** `state/shared/cimco/launch-surface.json` (schemaVersion 1.0.0). **Loader/query:** `scripts/cimco-launch-probe.mjs` (fail-loud loader, CLI `summary|verify|patterns|hook|open <file>`, 10 tests). **Wired:** `CimcoVerificationBridgeEngine.launchSurface()` → `prism_cimco` action `cimco_launch_surface` (dispatcher 8→9 actions).

**Verified exe inventory** (paths + sizeBytes confirmed on disk): `CIMCOEdit.exe` (30.8 MB — main editor + File Compare + Machine-Sim host) · `Dll/CIMCOSimulation.exe` (7.0 MB — the sim-verdict surface the SPINE-2 UIA reader targets) · `Sys/KeyManager.exe` (license; Simulation is license-gated) · `Dll/GroovingKernelWrapper.exe` (lathe groove kernel). `verify()` returns a `missing[]` — never fabricates a present exe.

**Honest launch-pattern split (R12):** VERIFIED = `CIMCOEdit.exe "<ncFile>"` (file open, the blind launch). NEEDS-LIVE-VERIFY = open-pair compare (CIMCO accepts multi-file args but File-Compare ACTION is UIA-only — no documented compare flag) + standalone-sim-replay. A `strings` scan of CIMCOEdit.exe found no usage banner → NO CLI flag asserted beyond file-open (did not invent flags).

**Headline finding — the blind-safe integration hook (FILE channel, NO UIA):** *Editor Setup > External Commands* registers an external program (External Command 1/2) invoked from the NC Functions tab on the open file, with macro args `$FILE / $FILENOEXT / $PATH / $FILEPATH / $OUTFILE`. PRISM use: register a "PRISM Verify" External Command → receives `$FILEPATH`, runs `prism_cimco` verification, writes verdict to `$OUTFILE`. Wires PRISM INTO CIMCO with zero UIA. Source: `setupexternalcommands.htm`. Complements (≠ replaces) the SPINE-2 UIA Simulation-Report reader (still needed for the in-app Machine-Sim collision verdict, license-gated).

**Tests:** `scripts/cimco-launch-probe.test.mjs` 10/10 (fail-loud loader, missing-exe detection, size-mismatch flag, pattern split, real-install integration) + bridge engine suite 31/31 (added launchSurface engine block + dispatcher round-trip). tsc-clean (the 30 workspace tsc errors at probe time were all pre-existing peer-domain drift — cad-validation-corpus / RANSAC / AgenticLoop — none in echo's 4 files).

**Next synthesis units:** U-CIMCO-UIA-REPORT-READER (keystone — needs live licensed app) · U-CIMCO-SETUP-SIDECAR-AUTHOR · U-CIMCO-DIALECT-ALLOWLISTS (static proving path, blind-buildable) · U-CIMCO-FTP-SHIP-VERIFY.

Wiki: [[cimco-verification-simulation-integration]]. Sibling memories: [[reference_cimco_navmap_2026_06_03]] · [[reference_cimco_drift_grouping_bug_2026_06_03]].
