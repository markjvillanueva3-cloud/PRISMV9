# CLAUDE-MD PATCH — Turning cascade API bug (U-BRIDGE-WIRE-TURNING)

**Why a patch-sibling:** `CLAUDE.md` is golf-slot-only (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF guard). Per the PATCH-SIBLING convention, bravo writes the intended `## Recent regressions` delta here; golf drains it into the live file.

**Authored by:** bravo / claude-5a2d6313 · U-BRIDGE-WIRE-TURNING · 2026-05-19

---

## PATCH — prepend to the "## Recent regressions" log (new entries at TOP, immediately under the two HTML-comment lines)

```
- 2026-05-19 | **`TurningStochasticPlanEngine.evaluateCascadeSample` calls non-existent `TurningInsertLifeEngine` methods (`insertChangeSchedule`, `wearAccumulation`)** — the engine exposes only `predictLife` / `selectGrade` / `validateChipbreaker`. The MS1+MS2 cascade therefore always throws → `evaluateCascadeSample` returns `null` → `TurningStochasticPlanEngine` reports `trials_feasible:0` for every input and `TurningSensitivityAnalysisEngine` (delegates to it) returns `{error:"baseline plan infeasible",cpk_baseline:null}` for every input. Invisible until now: both engines had 0 dispatcher refs (unwired), so the broken cascade was never exercised — classic unwired-engine API drift after `TurningInsertLifeEngine` was refactored. | surfaced-by: U-BRIDGE-WIRE-TURNING (slot bravo) — wiring the 6 unwired Turning engines to `prism_turning` round-trip-tested them and exposed the rot. | shipped: all 6 wires are mechanically correct (action enum + Zod schema + dispatcher case + 51-case round-trip test); 4 engines (envelope-distance + 3 thread engines) work end-to-end; the 2 cascade engines route correctly but return degraded output. `dispatcher.turningBridgeWire.test.ts` pins the degraded state with explicit `KNOWN ENGINE BUG` cases so a future fix fails-loud. | fix: pending — `U-FIX-TURNING-CASCADE-API` must rewrite `evaluateCascadeSample` to use `predictLife` (per-op tool-life → parts-per-edge scheduling + wear integration). Physics-bearing → needs the safety-physics reviewer, NOT an inline fix. | verify: `grep -c "insertChangeSchedule\|wearAccumulation" mcp-server/src/engines/TurningInsertLifeEngine.ts` → 0 (methods absent); `node mcp-server/node_modules/vitest/vitest.mjs run mcp-server/src/__tests__/dispatcher.turningBridgeWire.test.ts` → 51/51.
```

Memory: `reference_turning_cascade_api_bug_2026_05_19.md` (auto-feeds Obsidian).
