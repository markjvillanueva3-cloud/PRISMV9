---
name: reference-gwizard-abstains-on-generic-combos-2026-06-04
description: G-Wizard toolcrib is tool-specific (not a generic calculator) — it abstains on generic material×diameter SFC combos; generic comparison must use the handbook/baseline lanes
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.135Z
aliases: reference_gwizard_abstains_on_generic_combos_2026_06_04
---


**SFC vendor comparison — G-Wizard cannot vote on the open-generic cartesian (oscar, 2026-06-04).**

The first live `runOpenCartesianCompareSweep` run (36 generic cells: 3 ops × 6 ISO × carbide × {6mm,16mm}) read the real **41,209-row G-Wizard toolcrib** and returned **`gwizard_computed: 0`** — 18 cells matched only via `joiner_catalog` (PRISM OEM-PDF back-fill, NOT a G-Wizard computation) and 18 were `absent`. 

**Why:** G-Wizard's toolcrib.csv is a crib of *specific purchased tools* with their stored SFM/IPT, **not** a generic parameter calculator that computes for arbitrary (material × diameter × tool-material). So for generic combos G-Wizard has no row to compute from and — per the comparator's honesty axis — correctly **abstains** (only `provenance==="gwizard_computed"` cells may vote). This is exactly why the sibling `src/sfc/jmFirstSweep.ts` is deliberately **tool-bound** (real JM tools, where G-Wizard rows exist).

**Consequence for the comparison strategy:**
- **Open-generic space** (the "all logical combinations" goal): the only voting reference lanes are the **Traditional/handbook** lane and the **HSMAdvisor-folded baseline** DB. G-Wizard is effectively absent here. PRISM showed a **45% median |Vc Δ|** vs the handbook lane across these regimes — a large, actionable divergence worth running specialized-calc candidate detection on.
- **G-Wizard comparison** only yields signal on **real-tool cohorts** (jmFirstSweep) — keep tool-bound for any G-Wizard-voting comparison.
- HSMAdvisor is also tool/library-based — expect the same abstention pattern on generic combos; verify against `HSMAdvisorComparatorBridgeEngine` before relying on an HSMAdvisor generic vote.

Ledger of the run: `mcp-server/state/outcomes/open_cartesian_compare*.{jsonl,json}`. Runner: `mcp-server/src/sfc/openCartesianCompareSweep.ts` ([[reference_oscar_sfc_domain_map_2026_05_27]]). Pairs with the tool-bound sibling jmFirstSweep + the SFC tri-vendor comparator honesty axis.
