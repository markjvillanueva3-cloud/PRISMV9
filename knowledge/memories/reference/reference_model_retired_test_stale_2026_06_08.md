---
name: reference_model_retired_test_stale_2026_06_08
description: Retiring a model from DEFAULT_MODEL_CATALOG silently turns catalog-driven cap-probe/default tests RED — the model-retired-but-consumer-test-stale regression class (india schema-read-blindness family)
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-09T14:54:09.221Z
aliases: reference_model_retired_test_stale_2026_06_08
---


# Model-retired-but-test-stale regression (BLACKWELL-AI-MS0, slot:india, 2026-06-08)

When a local model is `ollama rm`'d and removed from `DEFAULT_MODEL_CATALOG`
(`mcp-server/src/engines/ModelRoutingEngine.ts`), every test that asserts that
model as a **live catalog entry or live default** silently goes RED — but the
engine code is *correct*. The tests encode a stale catalog snapshot.

**Concrete instance:** `qwen2.5-coder:7b` retired 2026-06-04 (U-BW-TS-ENGINES-RETIRE,
slot:alpha). It broke 4 assertions across 2 files:
- `OllamaCapabilityProbeEngine.test.ts` — 3 RED. The probe iterates `this.catalog`
  and marks a present model runnable IFF it is in the catalog AND fits free VRAM.
  A catalog-absent model can never be runnable → the old fixtures asserted the
  wrong mechanism. Migrated to live `phi3:14b` (vramGB 14 = 14336 MiB,
  runsOn [home_blackwell, home_4080]) + `qwen3-vl:8b` (vramGB 6, home_blackwell).
- `ConnectionFinderEngine.test.ts` — 1 RED. `DEFAULT_OLLAMA_MODEL` re-pointed to
  `qwen2.5-coder:32b` (engine line 34); test still asserted `7b`.

**The discriminator (which test is actually broken):** a model-name string in a
test is load-bearing-stale ONLY if it asserts a **live catalog/default** value.
The same string used as an **opaque fixture** (audit-log voice label, idea-block
content, /api/ps loaded-model name, context-floor input-echo) is legitimate and
stays GREEN — verified 8 consensus/idea test files (266/266) + 28 other refs all
non-stale. The `no-retired-llm-refs` source-lock is intentionally scoped to
`src/engines/**` non-test for exactly this reason.

**Fix discipline (R12):** the code was already correct — chase the code, never
weaken the assertion to green. Both per-file reviewers traced the engine source
to confirm before PASS.

This is the same class as the NN/GNN schema-read-blindness bugs india tracks
(`f436b2c614`, `93f85ec067`): a consumer reads a value that the producer's
canonical source changed. Here the "producer" is the model catalog.

**Forward guard idea (not built):** a catalog-retirement could emit a test-grep
warning for `toBe/toContain/toEqual` assertions on the removed id, scoped to
catalog/default contexts. See [[ai-training_synthesis]] open thread.

Commit: U-CAP-PROBE-CATALOG-RETIRE-TESTFIX. Related: [[reference_gnn_selective_deploy_2026_06_06]].
