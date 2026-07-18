---
name: reference-u-wire-energy-2026-05-17
description: "U-WIRE-ENERGY shipped 2026-05-17 kilo — wires MachiningEnergyModelEngine into prism_calc:machining_energy_model; 16-case test PASS; 6-reviewer gate (4 PASS / 2 FAIL→FIXED→PASS); teaches \"half-wired ghost orphans\" class + \"canonical-constants migration is a wiring prerequisite when the engine inlines non-canonical safety-rail constants\""
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:10.204Z
aliases: reference_u_wire_energy_2026_05_17
---


# U-WIRE-ENERGY — wire MachiningEnergyModelEngine into `prism_calc:machining_energy_model`

**Shipped:** 2026-05-17 kilo / claude-9587867d / commit `7fab606fa9`. Triggered by `/startup-kilo /loop [10m] finish all remaining kilo tasks /goal`. Second unit in the kilo `WIRE-UNWIRED-MS0` thread (sibling [[reference_u_wire_arcfit_2026_05_17]]).

## What

Closes a **half-orphan** in `prism_calc` — `machining_energy_model` was already in the ACTIONS enum + slimResponse remap (calcExtractKeyValues line 290-291) but had NO executor case body. Calls fell through to the default branch. This unit adds the schema + executor body + 16-case test. The action now returns real Gutowski energy estimates.

4 files touched:

- `mcp-server/src/engines/MachiningEnergyModelEngine.ts` — import `CANONICAL_KIENZLE`; per-ISO `kc1_1` + `mc` threaded into the Kienzle force expansion (was inline `KC11` table + hardcoded `mc=0.25`)
- `mcp-server/src/schemas/calcActionSchemas.ts` — new schema + `ACTION_CALC_SCHEMAS` map entry; `spindle_efficiency` bounded `(0, 1]`
- `mcp-server/src/tools/dispatchers/calcDispatcher.ts` — executor case body (lazy import, AtomicValue unwrap spread to match slimResponse contract)
- `mcp-server/src/__tests__/machining-energy-model-wiring.test.ts` — 16-case behavioral test (PASS 16/0)

## Why this teaches

**1. Half-wired ghost orphans are a distinct orphan class.** Unlike U-WIRE-ARCFIT's completely-invisible engine, this engine was *partially* wired — visible in the action surface, ostensibly returning a slimmed shape, but inert at the dispatch layer because no case body existed. Grep for `case "machining_energy_model":` returned ONE hit (the slimResponse remap inside `calcExtractKeyValues`), not two (no executor body). Always check both surfaces: the ACTIONS enum + the executor switch.

**2. Canonical-constants migration is a wiring prerequisite when the engine inlines non-canonical values.** The engine's previous `const KC11 = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };` violated the CLAUDE.md HARD safety rail "NEVER inline Kienzle/Taylor/material constants" AND was 14-28% off canonical (P:1800, M:2100, K:1100, N:700, S:2800, H:3200). The engine was *dead* (no executor body = no calls reached it) so the wrong values never shipped to production — but wiring it as-is would have put them onto the live MCP surface. **The migration to canonical was a load-bearing wiring prerequisite, not a separate unit.** Reviewer B caught this in the per-file scrutiny pass.

**3. Reviewer B's "hidden coupling" weighting is high-signal.** Of 6 reviewers across 3 files, 4 PASSed and 2 FAILed — both FAILs were Reviewer B (independent second-pass) on schema + test. Both surfaced the KC11 doctrine violation that Arm A (specialist reviewer) missed despite reading the same files. Arm A reads the engine's happy-path math; Arm B reads the codebase boundary the test cements. Different weighting, different failure modes caught.

**4. AtomicValue envelope spread is an INVERTED convention.** Most prism_calc engines that return `AtomicValue<T>` keep `result = engine.compute(...)` intact and have the slimmer at calcExtractKeyValues read `result.value.X`. This case spreads `.value` to top-level (`result = { ...wrapped.value, _unit, _formula, _confidence }`) because the pre-existing slimResponse remap reads `result.total_kwh` directly (without `.value`). The case body's hand is forced by what the slimmer already does. Tracked as a P2 cross-cutting reconciliation.

**5. "Zero recommendations" negative tests are fragile under threshold tuning.** I first wrote a test asserting `recs.length === 0` on the canonical input — the test FAILED because canonical aluminum @ light cut trips `efficiency<30` at ~12% (coolant + axis dominate cutting power). Rather than weaken the assertion or tune the canonical, replaced with a **monotonicity** test: aggressive well-tuned cycle (mql + low axis + big MRR) must emit STRICTLY FEWER recommendations than the bad-input cycle. Monotone invariants survive threshold drift; absolute-count assertions don't.

## 6-reviewer per-file gate

PASS PASS PASS PASS FAIL FAIL → fixed → PASS PASS. 0 P0, 0 P1 remaining post-fix.

Per-file dispatch protocol: 2 parallel reviewer agents per file × 3 files = 6 in one tool block. Arm A = file-type specialist (wiring-review-agent / test-review-agent / reviewer). Arm B = independent second-pass `reviewer` weighted on hidden coupling + integration + naming conformance + inlined constants + stub assertions. This is the EXACT topology the CLAUDE.md §PER-FILE SCRUTINY GATE prescribes.

Deferrable findings (next-unit):

- **P2** — `calcExtractKeyValues` has no `machining_energy_model` branch optimized for `pressurePct > 50`. Existing line-290 remap returns 4 keys; pressure-degraded path falls through to the generic 5-scalar default.
- **P2** — Engine not re-exported from `src/engines/index.ts` barrel.
- **P2** — AtomicValue handling convention reconciliation (spread vs envelope).
- **P3** — `electricity_cost_per_kwh` has no upper bound (fat-finger guard).
- **P3** — `tool_changes` has no upper bound (sanity guard).

## Verification

- `npx vitest run src/__tests__/machining-energy-model-wiring.test.ts` → `PASS 16 / FAIL 0`.
- `npx vitest run src/__tests__/arc-fit-kasa-wiring.test.ts` → `PASS 13 / FAIL 0` (no cross-engine regression from canonical migration).
- `npx tsc --noEmit` → 0 new errors in changed files (5 pre-existing errors in calcDispatcher.ts at lines 1152/1156/7857/9109/9124 are outside this change's range).
- Schema map entries: 119 → 120 (anti-regression UP). Action count unchanged (was already in ACTIONS enum).

## Sibling memory

- [[reference_u_wire_arcfit_2026_05_17]] — the prior kilo wire unit (fully-invisible engine). This unit's sibling — same recipe, different orphan class.
- [[reference_wire_unwired_ms0_u_wire01_2026_05_16]] — 96%-noise warning for the 729-pool. Both kilo units reconfirm: test-only WEAK-SIGNAL is where real orphans hide.
- [[feedback_canonical_constants_safety_rail]] — the CLAUDE.md doctrine that demanded the engine migration. Add if not yet written.

## Wiki

[knowledge/wiki/architecture/u-wire-energy.md](../H--PRISM/wiki/architecture/u-wire-energy.md) (in-repo path: `H:/prism/knowledge/wiki/architecture/u-wire-energy.md`)


## Related
[[engines/MachiningEnergyModelEngine|MachiningEnergyModelEngine]] • [[dispatchers/prism_calc|prism_calc]] • [[skills/startup-kilo|/startup-kilo]] • [[skills/loop|/loop]] • [[skills/goal|/goal]] • [[skills/src|/src]] • [[skills/engines|/engines]] • [[skills/schemas|/schemas]] • [[skills/calc|/calc]] • [[skills/tools|/tools]]