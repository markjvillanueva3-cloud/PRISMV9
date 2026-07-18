---
name: reference_romeo_cimco_machine_bind_2026_06_04
description: romeo domain expanded to own CIMCO machine-config supply for echo's live sim-driver; machine-bind answer delivered
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.147Z
aliases: reference_romeo_cimco_machine_bind_2026_06_04
---


**[CIMCO-INTEGRATION-MS0]/U-ROMEO-MACHINE-BIND-ANSWER (slot:romeo, 2026-06-04, commit `f1e4ade66e`).** Operator expanded romeo's domain (beyond dispatcher-wiring) to **own the CIMCO machine-config supply** that echo's live CIMCO sim-driver needs. Cross-slot handoff resolved on the chat bus (romeo→echo, topic `CIMCO-SPINE2-machine-bind`).

**The answer (sourced from existing `state/shared/cimco/` artifacts — not new research):**
- **CIMCO `.mcfg` machine configs:** `H:/prism/resources/cimco-2026/CIMCOEdit/MachineCfg` — **86** configs, indexed in `state/shared/cimco/machine-index.json` (each: file/displayName/orientation/unit/axes[Name,Type,Limits,MaxSpeed]). These ARE the kinematics to verify against the real machine.
- **Bind mechanism:** the **"Configure Machine Type"** ribbon control (echo's MSAA driver already reaches it) file-picks a `.mcfg` from that dir — no registry step. Sim runs against the selected `.mcfg`'s kinematics. CIMCO sim is GUI-bound (no headless verdict; `PlotWindow`/`MachineSimulateWindow`/`UI::CollisionReport`) per echo's own recon.
- **JM-fleet→CIMCO map (already done):** `state/shared/cimco/jm-fleet-sim-map.json` (15 machines). **VMC-01 Hurco VM30i → `Cimco Mill 3 Axis Type A.mcfg`** (score 0.45, generic:Vertical/3ax; alternates Type B/C/C-AngleHead).

**⚠ UNITS HAZARD flagged (CLAUDE.md UNITS-FIRST):** VMC-01's resolved `.mcfg` is **mm** but **JM convention = INCH** → 25.4× scale error risk. The match is a GENERIC 3-axis template (score 0.45), NOT a verified VM30i kinematic model → `mustVerifyKinematics`: confirm NC G20/G21 vs `.mcfg` unit AND that Type-A axis limits bracket real VM30i travel before trusting any collision verdict. A CIMCO-sim CLEAN = conformance-clean, NOT controller-verified.

**OPEN GAP (next build, flag to operator):** stock/fixture/holder collision bodies are **per-setup**, NOT in the machine DB — holders ride `tool-index.json` `.tmlib`; **stock + fixture need a per-setup body manifest that does not exist yet** (CAM/setup-sheet layer, kilo/echo — or a romeo wire if there's an unwired setup-body engine). Until then echo's "kinematics + tool-collision-only (workholding UNVERIFIED)" downgrade is the correct honest verdict. Full answer: `state/shared/cimco/romeo-machine-bind-answer.md`. Spec: `state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md` (A5/A6/A7).
