---
name: reference_oscar_radial_pct_inert_rootcause_2026_06_10
description: "VERIFIED root cause: SFC radial_depth_pct is COMPLETELY inert (MRR identical 5%-100% ae). Two layers ignore it; the fix is force-clamp-coupled. Corrects the prior 'duty-cycle tool-life' premise."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.694Z
aliases: reference_oscar_radial_pct_inert_rootcause_2026_06_10
---


**Empirical finding (probe, not assumption):** running SpeedFeedNineAxisOrchestratorEngine.run with
`toolpath.radial_depth_pct` = 5, 12, 25, 50, 100 (P/AISI-1018, 12mm/4fl carbide, prism_optimized)
yields IDENTICAL vc=140 / rpm=3714 / feed=1931 / **mrr=74.2** / life=43.0 at every ae. MRR =
ap*ae*feed MUST change ~20x across that range -> radial_depth_pct is fully IGNORED.

**Root cause (two layers, both verified in source):**
1. **SFC engine** `UltimateSpeedFeedEngine.alternatives.balanced.ae_pct` is a STATIC TABLE LOOKUP
   keyed by `<ISO>_<operation>_<cut_type>` (e.g. `P_milling_roughing: { ae_pct:[25,40,65] }`, balanced
   = the middle value 40). It does NOT read the input's `radial_depth_pct`/`radial_depth_mm` at all.
2. **Orchestrator** prism_optimized branch line ~895: `ae = (alt.ae_pct/100) * tool_diameter_mm` --
   uses the table value, ignores the user input. MRR (line ~906 `ap*ae*feed`) is therefore constant.
   (cost_batch/aggressive_rush use `sfc.radial_depth.value` at line ~866 -- verify whether THAT
   reflects the user input; the probe only exercised prism_optimized.)

**THE PRIOR PREMISE WAS WRONG.** Earlier handoffs framed radial_pct as a "duty-cycle TOOL-LIFE
correction" (scale wearLifeCap/thermalLifeCap by pi/phi_s). That is a RED HERRING and arguably unsafe:
Taylor T_min is CUTTING-TIME life (uses Vc/fz/ap, NOT ae) -- correctly ae-independent, matching how
G-Wizard/HSMAdvisor report tool life. Inflating it by a wall-clock duty factor would OVER-REPORT life
at low ae -> tool-failure risk. The real gap is the IGNORED INPUT -> MRR, not tool-life.

**The fix is FORCE-CLAMP-COUPLED (why it needs care + physics-reviewer, not a YELLOW-budget rush):**
honoring the user's ae changes MRR, but the downstream **workholding-adequacy derate** (orch ~929-976)
and **spindle-power clamp** (~977-1011) both read `sfc.forces.tangential_force_N`/`radial_force_N` --
forces the SFC engine computed at the TABLE ae. If the orchestrator overrides ae HIGHER than the table
default, those safety clamps read forces too LOW -> UNDER-PROTECT (the oscar-soul red line). Lower ae
(the common HSM case) is safe (forces lower -> clamps stay conservative). A correct fix must recompute
the clamp forces at the honored ae (forces-vs-ae is itself a physics-reviewer question -- the average
in-plane drive force rises with engaged arc phi_s).

**Recommended next-context build (fresh budget):** (1) decide layer -- honor radial_depth_pct/_mm in
the orchestrator prism_optimized ae (override alt.ae_pct when explicitly provided) AND/OR fix the SFC
balanced-alternative to scale ae toward the user input; (2) make the workholding+power clamp forces
consistent with the honored ae (scale sfc.forces by the ae ratio, or re-derive); (3) physics-reviewer
MANDATORY (force coupling); (4) R9 test: user radial_depth_pct varies -> MRR varies AND = ap*ae*feed;
backward-compat (no input -> table default unchanged); a higher-ae case must NOT weaken the workholding/
power clamp vs a force-consistent baseline. Run FULL SpeedFeedNineAxisOrchestratorEngine.test.ts +
ultimate-speed-feed*.test.ts.

Related: [[reference_oscar_sfc_runout_life_derate_2026_06_09]] · [[feedback_audit_consumers_when_moving_logic_into_engine]] · R12 (data over assumption).
