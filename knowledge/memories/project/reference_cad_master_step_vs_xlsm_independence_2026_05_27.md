---
name: cad-master-step-vs-xlsm-independence-2026-05-27
description: "The JM Die master STEP files in FUSION CAD AND CAM FILES/ELECTRODES/ and the xlsm archetype defaults are INDEPENDENT — the xlsm is a configurator that drives SolidWorks at parametric-rebuild time, not a snapshot of the master STEP. Master STEPs are one-off saved instances at whatever dims the operator typed last."
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_master_step_vs_xlsm_independence_2026_05_27
---


# CAD master STEP vs xlsm parametric defaults — they are independent

**Discovery (slot:delta /loop iter146, 2026-05-27):**
`cad-validate-parametric-vs-masters.mjs` measured the JM master
`ELECTRODES/3 Taptites.STEP` and compared it against the xlsm `3 Taptites`
sheet defaults (C(1)=0.1922, E(1)=0.1843, length=0.75").

**Finding:**
- Master `3 Taptites.STEP`: 33 sketch-plane Z-bands, C measurements
  in the 1.5-2.4 in range (peak), part scale ~2"
- xlsm 3 Taptites defaults: C in the 0.16-0.19 in range, total length 0.75"
- **Scale ratio: ~10x**

**Why:**
The xlsm is a CONFIGURATOR — operators type C/E/length/etc., hit the
`BuildButton`, which in turn loads the master SLDPRT, OVERWRITES its
named parameters (`Part.Parameter('D2@Sketch1').SystemValue = ...`),
rebuilds, and saves. The master SLDPRT is a parametric template — its
saved-state geometry is just whatever dims the last operator left it at.

The master STEP files in `ELECTRODES/3 Taptites.STEP` etc. are
THE LAST EXPORTED INSTANCE, not the template. They're one-off, not
canonical.

**How to apply:**
- Do NOT use the master STEP geometry as ground truth for any archetype
  preset. Use the xlsm `dims[]` row 11+ values as the canonical default,
  and accept any-dim override at generation time.
- For training data, the master STEP is one labeled sample (an instance),
  not the template. To grow ground-truth labels, query the saved-order
  history `T2:AO500` per archetype - that's the per-operator instance
  log. Caveat: those are mostly test-data ('Testing 123', 'jkhasdf') so
  yield is low ([[reference_cad_join_corpus_xlsm_0_yield_2026_05_27]]).
- The parametric generator should ALWAYS take dims as input - never
  use defaults derived from a master STEP file.
- The closed-loop pipeline:
    operator -> dim spec JSON -> parametric STEP generator -> Fusion
  bypasses the master entirely, which is the WHOLE POINT.

# Related memories
- [[reference_jm_xlsm_parametric_tables_2026_05_27]] (planned) - xlsm sheet structure
- [[reference_ejot_p30247750_exact_dims_2026_05_27]] - the test electrode case
- [[reference_delta_cad_toolchain_session_2026_05_27]] - full toolchain
- [[reference_roku_roku_primary_electrode_machine_2026_05_27]] - which machine runs it
