---
name: reference_blackwell_stale_model_tag_2026_06_23
description: "Blackwell stale-model-tag class (slot:india 2026-06-23). The :3b/:7b/:14b qwen2.5-coder tags were retired 2026-06-04 (Blackwell migration). TWO tests asserted the retired :7b as a CURRENT default and failed deterministically: IncrementalLearningEngine.test.ts (manifest.baseModel) fixed in e2a41e1af9, LocalValidationEngine.test.ts (healthCheck.preferredModel) fixed in 70b991a8db -- both via a rot-proof family-regex toMatch(/^qwen2.5-coder:\\d+(\\.\\d+)?b$/). Most other retired-tag test refs are FIXTURE-ECHO (set-then-assert / input-driven), NOT bugs. A dead-default ENGINE regression class EXISTS (alpha fixed OllamaHookBridgeEngine) but NO second instance is confirmed -- OllamaIntegrationEngine was checked and is NOT one (R12 self-correction)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.478Z
aliases: reference_blackwell_stale_model_tag_2026_06_23
---


# Blackwell stale-model-tag class (retired :3b/:7b/:14b)

## Background
The `:3b/:7b/:14b` qwen2.5-coder tags were RETIRED 2026-06-04 (Blackwell migration; canonical heavy-code model is
now `qwen2.5-coder:32b`, per CLAUDE.md TOKEN ECONOMY). Tests/engines written before that date may reference them.

## FAILING-TEST instances (FIXED this session)
Two tests asserted the retired `:7b` as the engine's CURRENT default and failed deterministically once the engine
moved to `:32b`:
- `IncrementalLearningEngine.test.ts` -- `manifest.baseModel` (engine DEFAULT_BASE_MODEL = :32b). Fixed `e2a41e1af9`.
- `LocalValidationEngine.test.ts` -- `healthCheck.preferredModel` (engine returns :32b). Fixed `70b991a8db`.
Fix pattern (R9, test-only, engine was correct): replace the hardcoded size tag with a rot-proof family match
`toMatch(/^qwen2\.5-coder:\d+(\.\d+)?b$/)` -- verifies a valid coder model (family + size) without re-rotting on
the next size migration.

## NOT bugs (verified -- fixture-echo / input-driven, all PASS; do NOT touch)
Most retired-tag refs in tests are FIXTURE DATA, not stale defaults: model names used as arbitrary inputs / echoed
overrides / round-trip set-get. Confirmed-benign examples:
- `OllamaIntegrationEngine.test.ts:144-148` -- a set/get round-trip: the test `setDefaultModel("code","qwen2.5-coder:7b")`
  THEN asserts `getDefaultModel("code")===":7b"`. `getDefaultModel` reads a RECORDED per-task map (engine line 169;
  "Record a per-task default model" line 163) -- the engine has NO hardcoded `:7b` default. Fixture-echo, PASSES, NOT a bug.
- `IdeaBlockExtractor.test.ts:410` -- echoes a `model_override`. `ModelTelemetryEngine.test.ts:88,107` -- echoes a
  logged model name. `MultiModelConsensusOllamaResolve.test.ts` -- returns one of the explicit INPUT model lists.
  `PRISMLoRAAdapterEngine.test.ts:41` -- PASSES (legit/echo). `deepseek-r1:14b` is a DIFFERENT family, NOT retired.

## R12 SELF-CORRECTION (do not repeat my error)
My first draft of this memo claimed `OllamaIntegrationEngine.getDefaultModel("code")==:7b` was a "confirmed live
instance" of a dead-default ENGINE regression. **That was WRONG** -- I flagged it from a grep hit WITHOUT reading the
test setup. Reading it showed the test SETS :7b first (fixture-echo). Lesson: a passing `expect(x).toBe(retiredTag)`
is usually fixture-echo, not a stale default; READ the test's setup before calling it a production bug.

## Dead-default ENGINE regression class -- REAL precedent, VERIFIED-CLOSED (0 open instances)
The class is real: alpha fixed [[reference_post_ship_blackwell-model-upgrade-u-bw-hookbridge-retire]] --
`OllamaHookBridgeEngine` HARDCODED defaultModel + 7 modelOverrides at the DELETED `:7b`/`:14b` (every hook silently
got a dead model); re-pointed to the `:32b` floor. **AUDITED + CLOSED 2026-06-23:** grepped ALL engine SOURCE
(`mcp-server/src/engines`, not tests) for a hardcoded retired tag (`["'`]qwen2\.5-coder:(3b|7b|14b)["'`]` /
`deepseek-r1:7b`) -> exactly ONE hit, and it is a DOCSTRING EXAMPLE (`ModelTelemetryEngine.ts:62` comment
`/** Canonical model id, e.g. "qwen2.5-coder:7b" ... */`), NOT a live default. So NO engine hardcodes a retired tag
as a default -- the class has ZERO open instances (alpha's OllamaHookBridge was the only one). Do NOT re-run this
audit; do NOT chase OllamaIntegrationEngine (fixture-echo, not a bug).
