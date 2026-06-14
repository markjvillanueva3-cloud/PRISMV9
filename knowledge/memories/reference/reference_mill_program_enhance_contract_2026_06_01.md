---
name: reference_mill_program_enhance_contract_2026_06_01
description: "mill_program_enhance (rec#3-gen) composes AutoSpeedFeed+ProgramCompare. Two runtime-caught contract traps: optimize() REQUIRES tools[] geometry; slimResponse() strips empty arrays. Shipped 2026-06-01."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.217Z
aliases: reference_mill_program_enhance_contract_2026_06_01
---


# mill_program_enhance — rec#3-gen contract findings (slot foxtrot, 2026-06-01)

**What shipped:** `prism_mill:mill_program_enhance` (U-MILL-PROGRAM-ENHANCE) — the GENERATE half of the JM-mill enhancement loop. Composes `AutoSpeedFeedEngine.optimize()` (SFC-grounded line-by-line Vc/fz rewrite) → `ProgramCompareEngine.compare()` + `.classifyEnhancement()` (same verdict gate `mill_enhancement_verify` exposes). Emits the enhanced program AND a real_improvement/cosmetic/degraded/inconclusive verdict. millDispatcher.ts (lazy `_autoSpeedFeed` → singleton `autoSpeedFeedEngine`, case + ACTIONS), millActionSchemas.ts (schema + map), 12/12 tests + 42/42 sibling regression.

**Trap 1 — AutoSpeedFeed.optimize REQUIRES `tools: ToolDefinition[]`, not just `{gcode, material}`.** The handoff recipe (and the prior summary) said "input requires gcode+material" — WRONG. `optimize()` line 192 does `input.tools.map(...)` → `Cannot read properties of undefined (reading 'map')` if tools absent. `ToolDefinition = {tool_number, diameter_mm, flutes, type?, material?, ...}`. This is correct by design: physics-correct RPM/feed are derived from diameter+flutes — you cannot ground a feed without geometry. So `mill_program_enhance` REQUIRES `tools[]` and **refuses to fabricate a diameter** (guessed diameter → wrong RPM → broken tool; shop_floor tier). Verify a composed engine's FULL required input, not the 2 fields you remember.

**Trap 2 — `slimResponse()` strips empty arrays fleet-wide.** `comparison.safety.regressions` is natively `string[]`, but for a clean enhancement it's `[]`, and the MCP handler's `slimResponse()` drops empty arrays → `out.safety` collapses to `{}`. So `Array.isArray(out.safety.regressions)` is FALSE through the dispatcher even though it's an array pre-serialization. Robust assertion: `(out.safety.regressions ?? []).length === 0` — still bites on a REAL regression (a non-empty array survives slimming). Applies to every MCP dispatcher result, not just mill.

**Observation (oscar/SFC lane, NOT chased):** AutoSpeedFeed no-ops a param-light conservative program (S1200/F8 aluminum → verdict `cosmetic`, lines_modified=0) unless cut depths (axial_depth_mm/radial_depth_mm) are supplied. The action passes these through via `.passthrough()`; whether a gain is found is AutoSpeedFeed's (oscar's) concern.

## How to apply
- Before composing a dispatcher action over an existing engine, probe the engine's REAL input contract (run it once via tsx) — don't trust a remembered field list.
- Through any MCP dispatcher, assert `(x ?? []).length` / `(x ?? {})` — slimResponse omits empties.
- Relates: [[reference_programcompare_modal_regex_bug_2026_06_01]] · [[reference_mill_optimizer_dead_actions_2026_06_01]] · [[feedback_verify_actual_contract_not_proxy]] · [[feedback_always_capture_lessons]]
