---
name: reference_cimco_jm_machine_map_2026_06_02
description: JM fleet → CIMCO sim-machine map shipped (which CIMCO .mcfg to simulate each JM machine on); kinematic-fit scorer; the prerequisite for proving out JM posts in CIMCO sim.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.064Z
aliases: reference_cimco_jm_machine_map_2026_06_02
---


# JM-fleet → CIMCO sim-machine map (slot:echo, 2026-06-02, commit 0a1d8fc168)

**What:** `scripts/cimco-jm-machine-map.mjs` → `state/shared/cimco/jm-fleet-sim-map.json`. For each of the 15 JM Die machines, resolves the best CIMCO Machine-Simulation `.mcfg` + a status tier. The prerequisite for the operator's goal "prove out all JM posts in CIMCO sim to 100% working" — you cannot trust a sim run on the wrong kinematics (tribal tip #9).

**Result (15 machines):**
- **2 native-cimco-match** (CIMCO ships a same-vendor `.mcfg`): Haas VF-2 → `Haas VF-2TR`, Haas OM-2 → `Haas CM-1`. CIMCO ships 18 Haas defs.
- **10 generic-template** (no vendor `.mcfg`; a Cimco generic kinematic template fits, author exact later): 7 Okuma lathes (live-tool *-M → `Lathe 4 Axis CY`, plain → `Lathe 3 Axis C`, Multus B250II → `Lathe Mill-Turn BC`), Hurco VM30i + Roku-Roku → `Mill 3 Axis`, Okuma M460V-5AX → `Mill 5 Axis`. CIMCO has NO Okuma/Hurco/Roku/Mitsubishi defs.
- **3 not-applicable**: Mitsubishi EDM-01/02 (sinker) + WEDM-01 (wire) — CIMCO Machine-Sim is mill/lathe kinematics only; EDM stays on PRISM discharge-physics sim (tribal tip #10).

**Scorer (reusable):** vendor-match (0.55, dominant) + model-token overlap + **orientation match** (Vertical/Horizontal/Lathe — a vertical mill must NOT map to a horizontal sim) + **axis-count match** (3/4/5 — a 3-axis machine must NOT map to a 5-axis sim; mismatch penalized). Hard type-gate (mill never maps to lathe). Generic templates graded by orientation+axis fit (not a flat floor — that was the v1 bug that collapsed all lathes to "CIMCO Lathe Default" + all mills to a wrong "Horizontal" template).

**Safety:** every mill/lathe mapping carries `mustVerifyKinematics:true` (a candidate, NOT an approved sim machine until travels/axis checked vs the real machine) + units-first (JM=inch; metric `.mcfg` flagged, 25.4× guard). 9/9 tests incl. real-corpus integration.

**For foxtrot/whiskey:** the 10 generic-template machines need exact `.mcfg` authored from PRISM machine-kinematics for full fidelity. Reads canonical JM inventory from `mcp-server/src/data/jm-die-profile.ts` (regex-extracted, not duplicated). Part of CIMCO-INTEGRATION-MS0. See [[reference_cimco_bridge_engine_spine1_2026_06_02]] + [[cimco-verification-simulation-integration]].
