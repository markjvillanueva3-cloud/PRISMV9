---
name: reference-u-wire-fluid-pumps-2026-05-20
description: "2026-05-20 kilo /loop — wired 5 fluid/pump engines into prism_fluid_thermal; also: unwired-engine audit suggestedDispatcher field is false-positive heavy"
aliases: reference_u_wire_fluid_pumps_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.246Z
---


# U-WIRE-FLUID-PUMPS-5 — kilo /loop iter 1 (2026-05-20)

Wired 5 genuinely-unwired engines into `prism_fluid_thermal` (48→53 actions),
commit `[MAIN] [ORPHAN-RESCUE]/U-WIRE-FLUID-PUMPS-5 (slot:kilo)`:

- `fluidized_bed_calculate` → FluidizedBedEngine (Wen-Yu Umf, Richardson-Zaki)
- `vacuum_pump_calculate` → VacuumPumpEngine (pumpdown eq, P_atm/P_target ratio)
- `peristaltic_pump_calculate` → PeristalticPumpEngine
- `progressive_cavity_pump_calculate` → ProgressiveCavityPumpEngine (Moineau)
- `axial_piston_pump_calculate` → AxialPistonPumpEngine (swashplate)

Pattern: `fluidThermalDispatcher` is table-driven (`ACTION_MAP: Record<string,[file,export,method]>`).
Wire = 1 ACTION_MAP row + 1 Zod schema row per engine + count bump. `ACTION_MAP`
exported so the test can assert wiring vite-safely. 12/12 vitest PASS
(`fluid-thermal-pumps-wiring.test.ts`).

## Finding — `audit-unwired-engines.mjs` suggestedDispatcher is false-positive heavy

`state/shared/UNWIRED-ENGINE-AUDIT-*.json` flags 646 "unwired" engines; 348 carry
a `suggestedDispatcher`. The suggestion is **keyword-based, not capability-gap-based**.
Verified this loop:

- **fluid_thermal group (5)** — genuinely unwired, no name overlap → clean wire ✓
- **processControl group (DOETaguchEngine, CUSUMEngine)** — 0 dispatcher refs BUT
  `prism_process_control` already wires `doe_analyze`→DOEAnalysisEngine and
  `spc_cusum`→SPCChartingEngine. Wiring these = R7 overlap-duplicate. SKIP.
- **quality group (SPCProcessCapabilityEngine, MultivariateSPCEngine, ...)** —
  overlap `spc_calculate`/`cpk_predict`; ConcentrationInequalityEngine + ERPQualityEngine
  are wrong-home suggestions (belong near prism_calc/prism_business). SKIP.

**Rule for future kilo wiring loops:** an audit hit is only a clean wire if the
target dispatcher has NO existing action covering that capability. Verify with
`grep -rl '<Engine>' src/tools/dispatchers/` (==0) AND check the dispatcher's
action list for a name/capability collision. The bd4b3692 route-wired/MCP-orphan
pattern (engine imported by `src/routes/` but absent from any dispatcher — e.g.
StripeBillingEngine) is a more reliable signal than suggestedDispatcher.

See [[feedback_high_roi_backend_first_slot_queue]], [[reference_u_orphan_rescue_stripe_2026_05_20]].
