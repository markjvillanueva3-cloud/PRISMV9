---
name: reference_jm_mill_spindle_specs_verified_2026_06_15
description: "VERIFIED OEM spindle specs for JM Die's 5 mill models (web-researched 2026-06-15, 5 parallel sonnet agents). Corrects JmDieMachineConfigEngine roster: okuma-mb-56va (6000) was standing in for the REAL Okuma M460V-5AX (15000 rpm) -- a 2.5x under-clamp; rmx-5 (40000) for the real HC658-II (32000). Fix in generate-jm-by-machine-libraries.ts JM_FLEET (commit 8e29ca53eb); engine roster itself flagged for juliett/foxtrot."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.629Z
aliases: reference_jm_mill_spindle_specs_verified_2026_06_15
---


**Verified JM Die MILL spindle specs** (web research 2026-06-15, 5 parallel sonnet agents -> OEM/dealer datasheets; operator "push through with parallel agents/ultracode"). Used to reconcile the by-machine clamping (commit `8e29ca53eb`, `[JM-BY-MACHINE]/U-FLEET-SPEC-RECONCILE`).

| ShopConfig id | REAL model | max RPM | taper | power kW | conf | source |
|---|---|---|---|---|---|---|
| VMC-01 | Hurco VM30i | 12,000 | CAT40 | 15 | high | hurco.com spec page |
| VMC-02 | Okuma GENOS M460V-5AX (5-axis) | **15,000** | CAT40 Big-Plus | 22 | high | okuma.eu press release + product page |
| VMC-03 | Haas VF-2 | 8,100 | CAT40 (CT-40) | 22.4 | high | haas.co.uk |
| VMC-04 | Haas OM-2 (Office Mill) | 30,000 | ISO 20 | 3.73 | high | techspex + Haas OM datasheet |
| VMC-05 | Roku-Roku HC 658-II | 32,000 | HSK-E40 | 6.26 | medium | millenniummachinery + MC Machinery (no direct OEM PDF) |

Lathes (LTH-01..07, OEM via JmDieMachineConfigEngine, matched ShopConfig): GENOS L300-M 4500/15, L200E-M 5000/11, LNC8 4000/11, Crown L1060 3800/11, GENOS L400II-E 3800/18.5, LB3000EX 4200/22, Multus B250II 5000/22 (mill-turn). Turning is CSS (rpm=null) so the lathe rpm is a small-diameter ceiling, not a clamp.

**THE BUG it corrected (R12):** `JmDieMachineConfigEngine.getAllConfigs()` roster carried WRONG mill models for JM's fleet -- `okuma-mb-56va` (6000 rpm / BT50, a DIFFERENT real Okuma) stood in for JM's actual Okuma M460V-5AX (15000 rpm / CAT40 Big-Plus). The by-machine generator keyed off it -> the 5-axis got cutting data clamped to 6000 when it runs to 15000 (2.5x under-clamp, 128 spurious clamps). Also `roku-roku-rmx5` (40000) for the real HC 658-II (32000). VMC-01/03/04 matched. **Fix:** romeo-domain -- a verified `JM_FLEET` table in `generate-jm-by-machine-libraries.ts` keyed off the real ShopConfig IDs; 128 spurious VMC-02 clamps removed, fleet clamps 397->269. **The engine roster mismatch itself is NOT fixed** -- flagged for the engine owner (juliett DB-expansion / foxtrot mill) to reconcile `JmDieMachineConfigEngine`'s roster (and the Fusion `.machine` defs that consume it) against JM's real fleet.

**Method note:** WebSearch/WebFetch research is NOT Ollama-doable (local models have no web access); the fanout-gate's "mechanical -> Ollama" advice was wrong for this task. Used a `[SCOPED]` Workflow with `model:'sonnet'` arms (web-spec extraction = sonnet tier per R5) + opus synthesis inline. The in-line same-command cherry-pick guard landed the commit cleanly (3rd clean commit this session after the guard fix).

**DEDUP / R8 -- a parallel verified source exists on foxtrot's branch (reconcile on merge).** [[reference_jm_vmc_spindle_envelopes_2026_06_02]] (foxtrot, 2026-06-02) describes `mcp-server/src/data/jm-mill-fleet-envelopes.ts` (`JM_MILL_FLEET_ENVELOPES` + `resolveJmMillEnvelope(id)` + `machineGroundingConstraints`), commit `f95571612` (POST-TRAIN-MS0/U-MILL-MACHINE-GROUND) -- "adversarially verified against on-disk catalogs (workflow jm-vmc-spindle-verify, 2-pass/machine)." VERIFIED this session: that file + its consumers (MillTemplateTrainingHarnessEngine, MillToolpathTemplateLibraryEngine) are **NOT on cad-fusion-live-ms0 HEAD** (`git ls-tree HEAD` miss; grep miss) -- f95571612 is not in HEAD's ancestry, so the change set lives on slot/foxtrot (or was reverted), never merged. So my `JM_FLEET` is NOT a live duplicate. BUT when foxtrot's POST-TRAIN-MS0 merges, there will be TWO JM mill spindle sources -> **consolidate onto ONE** (prefer foxtrot's `resolveJmMillEnvelope()` if its values match my web research -- both used "verify the REAL specs", different methods = cross-validation; if they differ, reconcile R7). Owner: foxtrot (mill) + romeo coordinate at merge. My by-machine generator's `JM_FLEET` should switch to `resolveJmMillEnvelope()` once that file lands on MAIN.

Linked: [[reference_jm_by_machine_fleet_libraries_2026_06_15]] (the by-machine libraries this corrects), [[reference_jm_vmc_spindle_envelopes_2026_06_02]] (foxtrot's parallel verified source -- reconcile on merge), [[reference_cam_collision_sim_geometry_state_2026_06_15]], [[feedback_check_inprogress_git_op_before_commit]] (the commit-race guard).
