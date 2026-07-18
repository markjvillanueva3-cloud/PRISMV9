# UNIT-0002 — Physics & Material Science Overview — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) · 2026-07-02 · evidence-cited per R12_

## Existing coverage
- **Domain-1 atomic unit breakdown ALREADY EXISTS**: `UNIT-0003..UNIT-0008` (6 sub-unit files) verified present in `H:/prism/knowledge/hermes-outputs/units/` (ls, 29 entries): material behavior (0003), tool wear (0004), strain-rate/serrated-chip (0005), phase-transformations/BUE (0006), work-hardening/DSA (0007), min-chip-thickness/size-effect (0008). Spec asks 8-12; 6 exist.
- **Master plan file exists**: `H:/prism/knowledge/hermes-outputs/MASTER-UNIT-PLAN.md` (ls-verified filename; body not read — PARTIAL-UNVERIFIED content).
- **Physics constants foundation exists**: `mcp-server/src/physics/constants.ts:40` `CANONICAL_KIENZLE`, `:63` `CANONICAL_TAYLOR` (ISO 3685 cited at `:919`), `:114` `CANONICAL_TAYLOR_LIFE_CV`, `:1252` extended-Taylor exponents.
- **Dispatcher wiring for every Domain-1 physics area already live in prism_calc** (`mcp-server/src/tools/dispatchers/calcDispatcher.ts`): `flow_stress` (:44), `jc_flow_stress/jc_params/jc_search/jc_list` (:599, :1956-1983), `wear_progression` (:64/:8701), `wear_prediction` (:202), `tool_wear_rate` (:5262), `archard_wear` (:220), `stochastic_wear` (:140), `chip_formation` (:100), `chip_formation_predict` (:9283), `thick_shear_zone` (strain rate, :108), `surface_integrity_predict` (white layer, :210). Safety side: `safetyDispatcher.ts:117` `tool_life_budget`, `:172` `federated_tool_life_blend`.
- **Canonical digests** for the "dispatcher wiring map" deliverable already exist as living artifacts: `mcp-server/data/docs/ENGINE_DIGEST.md` + `DISPATCHER_DIGEST.md` (declared canonical in `H:/prism/CLAUDE.md` §CANONICAL SOURCES; not re-read this session — PARTIAL-UNVERIFIED contents).

## Real gaps
1. **No per-sub-unit dispatcher/formula mapping document** — the mapping exists implicitly in code (citations above) but no artifact maps UNIT-0003..0008 → specific `prism_calc` actions. (The four gap files in this `work/` directory now cover 0002-0005; 0006-0008 remain unmapped.)
2. **No written JM Die real-data validation strategy** — and (important, physics-first honesty) the sub-unit acceptance criteria reference data classes that do NOT exist in the repo: measured cutting forces (dynamometer) and chip morphology measurements. The actual validation substrate PRISM has is: mined proven S/F (`speed_feed_mine`), calibration actuals (`speed_feed_calibration_persist`), and vendor parity (`speed_feed_tri_compare`) — see `mcp-server/src/engines/speed-feed/CLAUDE.md:89-95`. The strategy doc must re-base criteria on this substrate or declare the data-acquisition dependency.
3. Spec says "8-12 atomic units"; 6 exist. Either 2 more units are needed (candidates: thermal partition/Peclet, minimum-quantity-lubrication chemistry) or the 8-12 range should be amended to 6 with justification.

## Verdict
**knowledge-only**

## Recommended next action
Do not build anything. Write the two missing knowledge artifacts: (a) a Domain-1 unit↔dispatcher wiring map (one table, citing the calcDispatcher/safetyDispatcher lines above, extended to UNIT-0006..0008), and (b) a validation-strategy section that HONESTLY re-bases the sub-unit acceptance criteria on the data PRISM actually possesses (proven-S/F mining, calibration-persist actuals, G-Wizard/HSMAdvisor tri-compare) instead of nonexistent dynamometer/chip-metrology datasets, flagging measured-force and chip-morphology acquisition as an operator-level data dependency. Update MASTER-UNIT-PLAN.md cross-references. No new engines, no new dispatcher actions.

## ROI
**6/10** — pure documentation effort (~1-2 h) with outsized value: it prevents the autonomous harness from duplicate-building engines that already exist (0003-0005 below all prove that risk is real).
