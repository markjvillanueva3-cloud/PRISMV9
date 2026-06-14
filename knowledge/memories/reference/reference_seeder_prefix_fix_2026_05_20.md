---
name: reference-seeder-prefix-fix-2026-05-20
description: "2026-05-20 sierra G4-follow-up — seed-ghost-from-unwired.mjs now emits canonical `disp.<file-derived>` edge targets via MCP_TOOL_TO_DISP_NODE_ID map; closes ~500 of 569 dead pixels found by G4 sweep. R12 fallback + prototype-chain guard caught by scrutiny."
aliases: reference_seeder_prefix_fix_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.921Z
---


## SYSTEM-VIZ-HIGH-ROI-MS0 / U-VIZ-G4-SEEDER-FIX — seed-ghost prefix bug fix

**Shipped:** 2026-05-20 (slot sierra, /loop iter-3)

**Problem:** `scripts/seed-ghost-from-unwired.mjs` `buildGhostFromUnwired`
emitted `edge.to = \`dispatcher.${inf.dispatcher}\`` — two compounding
bugs at once:
1. Wrong prefix (`dispatcher.` instead of `disp.` per G1 PREFIX_TO_TYPE SSOT)
2. Wrong name (MCP tool name `prism_calc` instead of file-derived id
   `disp.calcdispatcher`)

Net: every proposed wiring edge pointed at a node id that never existed
in the graph. The G4 dead-pixel sweep (2026-05-20) measured the live
impact: **569 dead edges / ~500 trace to this single seeder**.

**Fix:** `scripts/seed-ghost-from-unwired.mjs`:

- Add frozen `MCP_TOOL_TO_DISP_NODE_ID` (16-entry map, one per distinct
  `dispatcher` value in `DISPATCHER_INFERENCE_RULES`). Every value uses
  canonical `disp.` prefix.
- Add `mcpToolToDispNodeId(mcpToolName)` resolver with `Object.hasOwn`
  guard against prototype-chain hits (`__proto__`, `constructor`).
- Edge construction: `to: mcpToolToDispNodeId(inf.dispatcher)`.

**R12 safety property:** unmapped tool name → fallback `disp.<lower>`
(better than legacy `dispatcher.<name>` — surfaces as ONE dead pixel on
the next G4 sweep instead of propagating as ~500 silently).

**Scrutiny catch:** the initial resolver used `MAP[k] || fallback` — on
`__proto__` that returned `Object.prototype` (truthy non-string),
bypassing the fallback entirely. Test #8 (adversarial-input case)
failed at first run and surfaced the bug. Switched to `Object.hasOwn(MAP, k)`
guard, all 36 tests PASS.

**Tests:** `scripts/seed-ghost-from-unwired.test.mjs` — added 11 cases
under `U-VIZ-G4-SEEDER-FIX` describe block:
- map frozen, ≥16 entries, every value `disp.*`, never `dispatcher.*`
- every inference-rule dispatcher has a map entry (catches drift —
  adding a new rule without a map entry fails this test)
- 6 canonical happy-path mappings + UNKNOWN fallback + adversarial
  (NaN, Infinity, prototype-pollution) + buildGhostFromUnwired
  integration on 5 real engine names
- source-grep oracle: legacy `` `dispatcher.${inf.dispatcher}` `` literal
  must NOT appear; new `mcpToolToDispNodeId(inf.dispatcher)` MUST appear

**Behavioral spot-check** (post-fix):
- MillForceEngine → disp.calcdispatcher
- CollisionDetectorEngine → disp.safetydispatcher
- GCodeTemplateEngine → disp.camdispatcher
- LatheGroovePostEngine → disp.turningdispatcher
- NeuralPredictorEngine → disp.aireasoningdispatcher
- XyzzyFooBar → (no edge — UNKNOWN, contract preserved)

**Lesson:** third confirmation this session of the "two pieces both pass
their own tests but assume different conventions" failure class (sister
to [[reference_system_viz_type_backfill_2026_05_20]] G1). The G4 sweep
IS the canary — no test on the seeder alone or the graph alone would
have caught this; the bug only exists at the join.

**Insight (scrutiny):** a `map[k] || fallback` pattern is unsafe on
user-controlled keys against any plain `{}` map — JS's prototype-chain
inheritance means `__proto__`, `constructor`, `toString`, `hasOwnProperty`
all return truthy non-string values. Use `Object.hasOwn` (or `Object.create(null)`
for the map). This pattern lives elsewhere in the codebase too — possible
audit unit class.

**Pending follow-up:**
- `U-VIZ-G4-REGEN-VERIFY`: run `node scripts/regen-viz.mjs --full` +
  next G4 sweep, confirm dead-edge count drops 569 → ~70.

Wiki: [[seeder-prefix-fix]]. Related:
[[reference_system_viz_dead_pixel_sweep_2026_05_20]] ·
[[reference_system_viz_type_backfill_2026_05_20]].
