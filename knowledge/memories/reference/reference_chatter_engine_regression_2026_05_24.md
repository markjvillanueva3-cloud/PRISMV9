---
name: chatter-engine-regression-2026-05-24
description: RESOLVED 2026-05-30 (U-CHATTER-SLD-RESTORE, slot:foxtrot). [HISTORICAL] ChatterStabilityLobeEngine had returned 0 lobes for sane inputs; now restored with a correct SDOF Altintas-Budak sweep + windowed-k lobe emission + Altintas-2008 process damping. 49/49 tests green.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.058Z
aliases: reference_chatter_engine_regression_2026_05_24
---


## ✅ RESOLVED 2026-05-30 (U-CHATTER-SLD-RESTORE, slot:foxtrot)
The 0-lobe regression below is **FIXED**. Root cause: `compute()` called `new StabilityLobeDiagram()`
on a **singleton instance** (not constructable → threw → fell to a fallback whose chatter-freq sweep
hugged resonance where Re[G]≈0, so `a_lim` never went positive). Fix: correct SDOF Altintas-Budak
sweep over the post-resonance band fn→3·fn with **windowed-k** lobe emission (fills any rpm window);
αxx now uses radial ratio Kr so up/down-milling differ; process damping (Altintas-Eynian-Onozuka 2008)
implemented + integrated. Dead code removed. **49/49 tests pass** (`ChatterStabilityLobeEngine.test.ts`
+ `process-damping-stability.test.ts`); engine adds zero new tsc errors. Commit `U-CHATTER-SLD-RESTORE`.
The historical analysis below is retained for context.

## ChatterStabilityLobeEngine — pre-existing regression (observed 2026-05-24, slot:oscar iter25) — NOW FIXED

`mcp-server/src/engines/ChatterStabilityLobeEngine.ts` `compute()` returns `lobes: []` + `max_stable_ap_mm: 0` for typical milling inputs (12mm carbide endmill, 4-flute, 50mm overhang, P-group steel, 0.5 ae/D ratio, 1000-12000 rpm sweep). Both code paths fail:

- **Primary**: `_computeWithStabilityLobeDiagram()` calls `StabilityLobeDiagram.calculate()` and returns `null` if `lobes.length === 0 || unconditional_limit <= 0`.
- **Fallback** (line 174-245): the inline multi-mode FRF loop sweeps N=0..5 lobes × nPoints rpm samples and pushes only when `a_lim > 0 && a_lim < 100`. For typical inputs the `reG` term comes out non-negative across the sweep → `a_lim ≤ 0` → nothing pushed.

The pre-existing `ChatterStabilityLobeEngine.test.ts` fails the same way:
```
expect(result.value.lobes.length).toBeGreaterThan(0);  // gets 0
```

**Why:** Should restore one of the two paths. The fallback's `fc = natFreq * (1 + 0.1 * Math.sin(i * Math.PI / nPoints))` only sweeps fc through a thin band; the lobe-rpm formula then concentrates output near `60·fc/(Z·N)` which can fall outside the rpm window for small N. The `StabilityLobeDiagram` algorithm class lives in `mcp-server/src/algorithms/` and probably needs an FRF input shape it isn't getting.

**How to apply:** When wiring downstream consumers of `chatterStabilityLobeEngine.compute()`, expect empty lobe envelope and structure the consumer for `no-coverage` fail-loud rather than assuming a non-trivial SLD. U-CW-03's `evaluateChatterStabilityGate()` does this — when lobes are empty the gate returns `safe: false, reason: "no stability-lobe coverage..."`. That contract becomes useful unchanged once the engine is restored.

**Tracked**: candidate follow-up unit `U-CHATTER-SLD-RESTORE` (proposed name) under MS-CRITWIRE or a sibling milestone — needs an operator to investigate the StabilityLobeDiagram algorithm + inline-fallback rpm-window math. Related: [[reference_per_slot_claim_ms0_2026_05_16]], [[u-cw-03-chatter-stability-gate-2026-05-24]].

**Verify**: `cd H:/prism/mcp-server && npx vitest run src/__tests__/ChatterStabilityLobeEngine.test.ts` — expect existing failures until restored.
