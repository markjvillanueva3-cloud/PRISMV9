---
name: reference_whiskey_lathe_quality_gate_sx_silent_bug_2026_06_01
description: "SAFETY BUG (fixed U-CL11): LatheQualityGateEngine.validateProgram read context.material.* but material lives at context.PART.material -> S(x) omega hard-block threw 'reading name of undefined' on EVERY call, caught+logged as WARN, so the S(x) safety gate silently NO-OP'd for every lathe program. Also context.machine.max_power_kw should be spindle_power_kw. Surfaced by wiring the engine onto prism_turning_program (was a dispatcher-orphan)."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.260Z
aliases: reference_whiskey_lathe_quality_gate_sx_silent_bug_2026_06_01
---


# LatheQualityGateEngine S(x) silent-safety bug + wire (CLOSED-LOOP-MS0/U-CL11, slot:whiskey, 2026-06-01)

**Context:** the `/loop wire` arc wired the lathe closed-loop chain onto the lathe-native MCP surface `prism_turning_program` (it was reachable only via `prism_cam`): U-CL9 emit (`turning_program_emit*`), U-CL10 generate (`turning_toolpath_*`), U-CL11 **assess** (`turning_program_quality_gate` + `turning_program_validate_safety` -> `LatheQualityGateEngine`, which was a **dispatcher-orphan**, wired nowhere). Doctrine: CLAUDE.md §ENGINE WIRING "wire to EVERY dispatcher that would naturally consume it" (multi-surface wiring of one engine is NOT duplication).

**The bug (R12, safety-critical):** `LatheQualityGateEngine.validateProgram` (line ~710) computes the S(x) omega safety hard-block via `omegaSafetyScoreEngine.evaluate(...)`, passing material as `context.material.{name,iso_group,hardness_hrc}`. But `ValidationContext` has material at **`context.part.material`** — `context.material` is `undefined`, so `.name` threw `TypeError: Cannot read properties of undefined (reading 'name')`. The throw was caught by a `try/catch` that only `log.warn`ed "Could not compute S(x)" — so **the S(x) safety hard-block silently NO-OP'd for every lathe program ever validated** (omega_safety undefined, omega_blocked false). An unsafe program could pass the omega gate because the gate never ran. Classic silent-degradation safety failure (whiskey soul refuses `softening-safety-thresholds` — a silently-skipped gate is worse).

**Fix:** `context.material.*` -> `context.part.material.*`; also `context.machine.max_power_kw` -> `spindle_power_kw` (wrong field name -> always fell back to 15 kW, weakening the power-limit check); wired real `diameter_mm`/`part_diameter_mm` from context (were hardcoded 50). `OmegaSafetyScoreEngine` physics UNCHANGED — plumbing-only fix. `chuck_type` left as literal "3_jaw" (WorkholdingInput enum narrower than QualityGateWorkholding.type — passing the union risks a tsc narrowing error; can't verify while build is RED).

**Verification:** 14/14 vitest dispatch round-trip; test now asserts `omega_safety.omega_safety` is a real number (was `undefined` pre-fix), and the "Could not compute S(x)" WARN is gone. Commit `a2b41878ec`.

**How to apply:** when wiring an orphan engine, exercise its FULL output path in the dispatch test (not just "returns a report") — the S(x) sub-feature was silently broken and only a test that reached the omega field would catch it. Caught `try/catch` around a SAFETY computation is a smell: a swallowed safety-gate error must fail loud, not warn. Pairs with [[feedback_always_fill_gaps]] + R12 fail-loud. Build-plan: `state/shared/specs/WHISKEY-CLOSED-LOOP-BUILD-PLAN-2026-05-31.md`.
