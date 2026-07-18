# UNIT-0015 -- Hard Turning and Milling Integration -- GAP ANALYSIS
_Analyst: oscar (speed-feed; cross-domain -- natural owner whiskey/lathe + foxtrot/mill) - 2026-07-02 - Grep-verified + graph-confirmed._

## Existing coverage
- **Hard-turning decision**: `HardTurningDecisionEngine.ts` (graph node `hard-turn-decide` L10/built) -- decides hard-turn feasibility/strategy. Lathe hard-turning surface `lathe-hard-turning` present.
- **H-group Kienzle**: `CANONICAL_KIENZLE` includes the H (hardened) ISO group (`physics/constants.ts`), so force for hardened materials already flows through the canonical Kienzle path; hardened tool steels (D2/H13/M2/A2/O1/S7/52100/440C/300M/Maraging_300) carry JC params in `JohnsonCookEngine.ts`.
- **CBN / hard-material tooling**: `CeramicsMachiningEngine.ts` + coating selection for hard materials; cryo path for hard machining.
- **Wear for hard parts**: the AdvancedWearPhysics + Archard/Usui stack (UNIT-0004/0009 coverage) applies.

## Real gaps
1. **`lathe_hard_turning` is a STUB** (graph node `turning:lathe_hard_turning` marked L8/stub). A real, fillable gap -- the turning-dispatcher hard-turning action is not backed by a full implementation.
2. **No unified HardTurningMillingEngine** spanning BOTH turn + mill for hardened materials -- HardTurningDecisionEngine is turn-focused; the milling side of hard machining (hard-milling strategy, CBN mill parameters) is thinner.
3. **White-layer / residual-stress for hard parts** exists (surface_integrity + residual_stress_phase_transform, UNIT-0006) but is not explicitly wired into a hard-part quality gate.
4. **"Validation on JM Die hardened parts"** -- data-blocked (no measured hard-part force/wear dataset in-repo; H-group Kienzle constants are literature, not JM-calibrated).

## Verdict
**extend** (decision engine + H-group Kienzle wired; fill the `lathe_hard_turning` stub + add the hard-MILLING side; validation data-blocked)

## Recommended next action
Priority 1: fill the `lathe_hard_turning` STUB (whiskey owns) so the turning dispatcher's hard-turning action is real, routing to HardTurningDecisionEngine + H-group Kienzle. Priority 2: add hard-MILLING coverage (foxtrot) -- CBN/hardened-mill parameters + the white-layer quality gate (reuse surface_integrity + residual_stress_phase_transform). Import all constants from physics/constants.ts (H-group Kienzle already canonical). Declare JM hard-part measurement as the validation dependency; report the stub-fill loudly (R12 -- a stub passing as done is the exact anti-pattern).

## ROI
**5/10** -- a concrete stub to fill (real, verifiable) + a genuine hard-milling extension, over an already-canonical H-group Kienzle foundation; capped by the hard-part-data validation gap and the whiskey/foxtrot ownership handoff.
