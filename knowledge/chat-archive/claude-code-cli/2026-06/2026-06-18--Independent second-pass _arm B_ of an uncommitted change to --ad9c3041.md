---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Independent second-pass (arm B) of an uncommitted change to PRISM's MultiModelCo"
date: "2026-06-18"
first_ts: "2026-06-18T03:31:53.705Z"
last_ts: "2026-06-18T03:35:55.472Z"
cwd: "H:\\prism\\mcp-server"
messages: 63
user_msgs: 24
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-aed0c8bb634fe2d1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Independent second-pass (arm B) of an uncommitted change to PRISM's MultiModelCo

> **claude-code-cli** | 2026-06-18 | 63 msgs (24 user / 39 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-aed0c8bb634fe2d1e.jsonl`

## Transcript

### User | 2026-06-18T03:31:53.705Z

Independent second-pass (arm B) of an uncommitted change to PRISM's MultiModelConsensusEngine.ts (added a `coderEnsemble` ConsensusInput flag + exported `CODER_ENSEMBLE_MODELS` + an ask() branch routing coding consensus to the diverse-panel with coder models). Weighted toward SILENT BREAKAGE, REGRESSION, TYPE-SAFETY, and INTEGRATION COUPLING. Use `git -C H:/prism diff`. Grade PASS/FAIL with file:line.

CHECK:
- The 3 importers of MultiModelConsensusEngine (ConsensusAIBridgeEngine, ConsensusCoordinatorEngine, ConsensusNeuralFeedbackEngine) — do they still compile + behave? (tsc reported 0 errors total — confirm none of these import or destructure in a way the new field/const breaks.)
- TYPE: `CODER_ENSEMBLE_MODELS = [...] as const` is a readonly tuple. `diverseModels` is now assigned it OR a mutable string[] literal OR `input.diverseLocalModels` (readonly string[]). Confirm `diverseModels`'s inferred type is still accepted everywhere it's used downstream (resolveDiverseOllamaPanel takes `readonly string[]` — fine, but check no later code mutates diverseModels or assigns it to a `string[]`).
- BACK-COMPAT: with coderEnsemble unset/false, is the ask() path byte-identical to before? (the `|| coderEnsemble` and `coderEnsemble ? ... : ...` must not change the default branch.)
- Run `npx vitest run src/__tests__/MultiModelConsensusOllamaResolve.test.ts` (from mcp-server) — confirm 45 pass, 0 skip. Scan the 3 new tests for stubs/.skip/.only or weakened assertions.
- Does exporting CODER_ENSEMBLE_MODELS collide with any existing export name? Any other test or consumer that would now see it?
- The deepseek-coder omission: is it genuinely correct that a bare "deepseek-coder" wouldn't match via resolveDiverseOllamaPanel's `installed.includes`? Confirm the function uses exact match (not prefix/substring).
- Any path where coderEnsemble + an explicit input.ollamaModel/secondaryOllamaModel/dualOllama conflict and produce a wrong/empty voice list?

Report PASS explicitly if clean, 
... [+25 chars truncated]

### Assistant | 2026-06-18T03:31:57.318Z

I'll investigate this change systematically. Let me start by reading the diff and the affected files.

### Assistant | 2026-06-18T03:31:58.272Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:31:58.834Z

[tool_use: Bash]

### User | 2026-06-18T03:32:02.648Z

[tool_result] diff --git a/mcp-server/src/engines/MultiModelConsensusEngine.ts b/mcp-server/src/engines/MultiModelConsensusEngine.ts
index d669261203..2e3677335f 100644
--- a/mcp-server/src/engines/MultiModelConsensusEngine.ts
+++ b/mcp-server/src/engines/MultiModelConsensusEngine.ts
@@ -95,6 +95,12 @@ export interface ConsensusInput {
   diverseLocalPanel?: boolean;
   /** Override the panel. Default ["gpt-oss
... [+3600 chars truncated]

### User | 2026-06-18T03:32:07.709Z

[tool_result]  M .claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs
 M .claude/hooks/loop-iteration-inject.mjs
 M .claude/hooks/mcp-bridge-enforce-pretool.mjs
 M .claude/hooks/model-tier-advisor.mjs
 M .claude/hooks/stop-force-loop-continue.mjs
 M .claude/scripts/consensus-queue-drain.mjs
 M .claude/scripts/consensus-queue-drain.test.mjs
 M .gitignore
 M CLAUDE.md
 M PRISM-INVENTORY-LATEST.md
 M data/r
... [+2415 chars truncated]

### Assistant | 2026-06-18T03:32:10.354Z

Let me check the test file diff and the full diff for any other changes related to this.

### Assistant | 2026-06-18T03:32:11.428Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:32:12.504Z

[tool_use: Bash]

### User | 2026-06-18T03:32:17.275Z

[tool_result] warning: in the working copy of 'mcp-server/src/__tests__/AutoConsensusHooks.test.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'mcp-server/src/routes/erp.ts', CRLF will be replaced by LF the next time Git touches it
 mcp-server/data/docs/DISPATCHER_DIGEST.md          |  106 +-
 mcp-server/data/state/BASELINE_INVENTORY.json      |   26 +-
 mcp-server
... [+889 chars truncated]

### User | 2026-06-18T03:32:24.083Z

[tool_result]  M mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts
 M mcp-server/src/engines/MultiModelConsensusEngine.ts

### Assistant | 2026-06-18T03:32:26.671Z

The task is scoped to the MultiModelConsensusEngine.ts change and its test. Let me look at the test diff and the full surrounding code.

### Assistant | 2026-06-18T03:32:27.401Z

[tool_use: Bash]

### User | 2026-06-18T03:32:31.706Z

[tool_result] diff --git a/mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts b/mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts
index cf7b0418ae..55428446a1 100644
--- a/mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts
+++ b/mcp-server/src/__tests__/MultiModelConsensusOllamaResolve.test.ts
@@ -15,6 +15,7 @@ import {
   pickBestOllamaModel,
   resolveOllamaModels
... [+2312 chars truncated]

### Assistant | 2026-06-18T03:32:34.720Z

I'm an arm-C analyst in read-only mode, focused on the consensus engine diff. Let me investigate the importers, type safety, and the resolveDiverseOllamaPanel function. Let me read the relevant code sections.

### Assistant | 2026-06-18T03:32:36.052Z

[tool_use: Read]

### User | 2026-06-18T03:32:36.965Z

[tool_result] 480	      const available: string[] = [];
481	      if (weightedClaude) available.push("anthropic");
482	      if (includeCodex) available.push("openai"); // codex unless includeCodex:false
483	      if (includeGrok) available.push("xai");
484	      if (includeGemini) available.push("google");
485	      available.push("ollama"); // primary ollama always in pool
486	      try {
487	        const pe
... [+7263 chars truncated]

### Assistant | 2026-06-18T03:32:36.975Z

[tool_use: Grep]

### User | 2026-06-18T03:32:39.161Z

[tool_result] 266:// are EXACT live tags (resolveDiverseOllamaPanel install-gates by exact `installed.includes`), both
392:export function resolveDiverseOllamaPanel(
544:      // resolveDiverseOllamaPanel falls back to its pre-probe install-gate (full
557:      ollamaVoices = resolveDiverseOllamaPanel(diverseModels, installedOllama, runnableIds);

### Assistant | 2026-06-18T03:32:42.302Z

Now let me read the `resolveDiverseOllamaPanel` function to verify the exact-match install-gating behavior, and check the downstream usage of `diverseModels`.

### Assistant | 2026-06-18T03:32:43.148Z

[tool_use: Read]

### User | 2026-06-18T03:32:46.011Z

[tool_result] 370	  return { primary: resolvedPrimary, secondary: resolvedSecondary };
371	}
372	
373	/**
374	 * BLACKWELL-MODEL-INTEGRATION-MS0 — resolve a DIVERSE local panel of N
375	 * distinct-family Ollama voices against the LIVE installed set, install-gating
376	 * each independently (present → active, absent → skipped). Returns the requested
377	 * models that are both installed AND chat-capable, in REQ
... [+5201 chars truncated]

### Assistant | 2026-06-18T03:32:53.015Z

The `resolveDiverseOllamaPanel` confirms exact match via `installed.includes(m)` (line 424). Now let me verify the downstream usage of `diverseModels` and `primaryOllama` to confirm the readonly tuple type is accepted everywhere. Line 561 uses `String(diverseModels[0] ?? ...)` which is safe. Let me check the 3 importers and verify they don't break.

### Assistant | 2026-06-18T03:32:54.891Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:32:55.757Z

[tool_use: Grep]

### User | 2026-06-18T03:32:58.015Z

[tool_result] src\__tests__\AIDispatcherConsensusDecide.test.ts:23:import type { ConsensusResult } from "../engines/MultiModelConsensusEngine.js";
src\__tests__\AIDispatcherConsensusDecide.test.ts:36:import { multiModelConsensusEngine } from "../engines/MultiModelConsensusEngine.js";
src\__tests__\AIDispatcherConsensusEscalate.test.ts:16:import type { ConsensusResult } from "../engines/MultiModelConsensusEngine
... [+1347 chars truncated]

### User | 2026-06-18T03:33:00.084Z

[tool_result] src\engines\MultiModelConsensusEngine.ts:99:   *  seat the dedicated CODER panel (CODER_ENSEMBLE_MODELS: qwen2.5-coder:32b + qwen3-coder:30b +
src\engines\MultiModelConsensusEngine.ts:271:export const CODER_ENSEMBLE_MODELS = ["qwen2.5-coder:32b", "qwen3-coder:30b"] as const;
src\engines\MultiModelConsensusEngine.ts:508:    // swaps the generic synthesis panel for the dedicated CODER_ENSEMBLE_MODEL
... [+1115 chars truncated]

### Assistant | 2026-06-18T03:33:12.823Z

`CODER_ENSEMBLE_MODELS` is only referenced in the engine itself and the test — no export-name collision. The 3 importers (ConsensusAIBridgeEngine, ConsensusCoordinatorEngine, ConsensusNeuralFeedbackEngine) import named symbols that are unaffected by the new additions. Let me verify there's no `export *` re-export that could collide, and check the `diverseModels` usage more carefully for type-mutation risks. Let me also verify how `diverseModels` flows into `callOllama` / the rest of ask().

### Assistant | 2026-06-18T03:33:14.752Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:33:15.376Z

[tool_use: Grep]

### User | 2026-06-18T03:33:15.934Z

[tool_result] 512:    const diverseModels = input.diverseLocalModels ?? (coderEnsemble ? CODER_ENSEMBLE_MODELS : [
538:    let primaryOllama: string;
539:    let ollamaVoices: string[];
557:      ollamaVoices = resolveDiverseOllamaPanel(diverseModels, installedOllama, runnableIds);
561:      primaryOllama = ollamaVoices[0] ?? String(diverseModels[0] ?? DEFAULT_OLLAMA_MODEL);
562:      if (ollamaVoices.length ==
... [+375 chars truncated]

### User | 2026-06-18T03:33:16.761Z

[tool_result] src\hooks\index.ts:76:export * from "./EnforcementHooks.js";
src\hooks\index.ts:77:export * from "./LifecycleHooks.js";
src\hooks\index.ts:78:export * from "./ManufacturingHooks.js";
src\hooks\index.ts:79:export * from "./CognitiveHooks.js";
src\hooks\index.ts:80:export * from "./ObservabilityHooks.js";
src\hooks\index.ts:81:export * from "./AutomationHooks.js";
src\hooks\index.ts:82:export * from
... [+1551 chars truncated]

### Assistant | 2026-06-18T03:33:22.042Z

The `export *` re-exports are all in unrelated index files (hooks, algorithms, utils) — none re-export from MultiModelConsensusEngine, so no export-name collision. `diverseModels` flows only into `resolveDiverseOllamaPanel` (which takes `readonly string[]`, line 392-393) and `String(diverseModels[0] ...)` (line 561) — both readonly-safe. `ollamaVoices` is a separate `string[]` (line 539), assigned the return of `resolveDiverseOllamaPanel` which returns `string[]` (mutable, line 411). No mutation of `diverseModels` occurs. The readonly tuple type is fully compatible.

Now let me run the test and run tsc on the engine to confirm compile cleanliness, and confirm the roster model name `qwen3-coder:30b` is a real tag.

### Assistant | 2026-06-18T03:33:23.292Z

[tool_use: Bash]

### User | 2026-06-18T03:33:29.039Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/MultiModelConsensusOllamaResolve.test.ts (45 tests) 32ms

 Test Files  1 passed (1)
      Tests  45 passed (45)
   Start at  22:33:28
   Duration  255ms (transform 81ms, setup 0ms, import 131ms, tests 32ms, environment 0ms)

### Assistant | 2026-06-18T03:33:32.958Z

45 tests pass, 0 skip. Let me verify the 3 new tests are genuine (no stubs/weakened assertions — they look real with concrete `.toEqual` checks), and confirm tsc compiles the engine cleanly. Let me also check the back-compat path: when `coderEnsemble` is unset, the default branch must be byte-identical. Let me verify the `qwen3-coder:30b` roster claim and check whether any existing default-panel test exercises the unchanged branch.

### Assistant | 2026-06-18T03:33:34.845Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:33:35.729Z

[tool_use: Grep]

### User | 2026-06-18T03:34:12.106Z

[tool_result] ---tsc-exit-check-done---

### User | 2026-06-18T03:34:13.313Z

[tool_result] Found 10 files
src\__tests__\MultiModelConsensusOllamaResolve.test.ts
src\engines\MultiModelConsensusEngine.ts
src\tools\dispatchers\aiDispatcher.ts
src\engines\OllamaHookBridgeEngine.ts
src\__tests__\OllamaHookBridgeEngine.test.ts
src\__tests__\OllamaHookBridgeEngine.model-routing.test.ts
src\engines\OllamaTaskOffloaderEngine.ts
src\__tests__\ModelRoutingEngine.test.ts
src\engines\ModelRoutingEng
... [+44 chars truncated]

### Assistant | 2026-06-18T03:34:16.300Z

tsc reports no errors for MultiModelConsensusEngine (clean). Now let me verify `qwen3-coder:30b` is a real roster tag and that `deepseek-coder` omission is correctly reasoned. Let me check the model roster references and confirm the exact-tag claim.

### Assistant | 2026-06-18T03:34:17.800Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:34:19.282Z

[tool_use: Grep]

### User | 2026-06-18T03:34:21.550Z

[tool_result] 36:[Omitted long matching line]

### User | 2026-06-18T03:34:25.305Z

[tool_result] src/engines/OllamaHookBridgeEngine.ts:86:// (ai_feature, code_explain, pattern_match, validation) now use qwen3-coder:30b -- the
src/engines/OllamaHookBridgeEngine.ts:104:    // FLEET-OLLAMA-ROUTING/U-FLOR-CODER-DEFAULT (2026-06-10): qwen3-coder:30b is the
src/engines/OllamaHookBridgeEngine.ts:107:    // back to the 32b defaultModel below if qwen3-coder is ever absent (never cold-fails).
src/engin
... [+752 chars truncated]

### Assistant | 2026-06-18T03:34:30.970Z

I notice a potential discrepancy worth investigating. `OllamaHookBridgeEngine.ts:108-111` and the new `CODER_ENSEMBLE_MODELS` use exact tag `qwen3-coder:30b`, but `ModelRoutingEngine.ts:185` uses `qwen3-coder:30b-a3b` and `aiDispatcher.ts:56` uses `qwen3-coder:32b`. These are three different tag forms. Since `resolveDiverseOllamaPanel` uses **exact** `installed.includes` match, the correctness of `CODER_ENSEMBLE_MODELS` hinges on which exact tag is actually pulled. Let me check the canonical host facts to determine the real installed tag.

### Assistant | 2026-06-18T03:34:32.388Z

[tool_use: Grep]

### Assistant | 2026-06-18T03:34:32.981Z

[tool_use: Read]

### User | 2026-06-18T03:34:34.035Z

[tool_result] 36:qwen3-coder
36:qwen3-coder
36:qwen3-coder
36:qwen3-coder

### User | 2026-06-18T03:34:34.845Z

[tool_result] 100	  defaultModel: "qwen2.5-coder:32b",
101	  modelOverrides: {
102	    grep_index: "gpt-oss:20b",         // speed tier (install-gated → 32b if absent)
103	    mcp_route: "gpt-oss:20b",          // speed tier (install-gated → 32b if absent)
104	    // FLEET-OLLAMA-ROUTING/U-FLOR-CODER-DEFAULT (2026-06-10): qwen3-coder:30b is the
105	    // active code default -- Qwen3-Coder 30B-A3B MoE (~3B acti
... [+549 chars truncated]

### Assistant | 2026-06-18T03:34:39.832Z

Let me read the full canonical host facts line 36 to see the exact pulled tag form, since that determines whether the `qwen3-coder:30b` exact match will succeed against the live roster.

### Assistant | 2026-06-18T03:34:40.691Z

[tool_use: Bash]

### User | 2026-06-18T03:34:44.974Z

[tool_result] 36:> **R12 ROSTER UPDATE — 2026-06-16 (slot:zulu, re-verified live `/api/tags`).** The roster GREW 10 → **16 models** since the 2026-06-09 snapshot above. **Six added:** `deepseek-r1:32b`, `deepseek-r1:14b` (deep local reasoners), `qwen3-coder:30b` (new heavy coder — the canonical `PRISM_LOCAL_MEDIUM_MODEL`), `qwen2.5vl:32b` (large VLM), `qwen2.5-coder:14b`, **`qwen2.5-coder:7b`**. **CORRECT

### Assistant | 2026-06-18T03:34:49.226Z

This is the decisive evidence. The live `/api/tags` roster (re-verified 2026-06-16) lists the exact tag as `qwen3-coder:30b` — matching `CODER_ENSEMBLE_MODELS` precisely. The variant tags `qwen3-coder:30b-a3b` (ModelRoutingEngine) and `qwen3-coder:32b` (aiDispatcher) are not the pulled tag; the new code correctly uses the verified live tag. Let me confirm the 16-model roster also includes `qwen2.5-coder:32b` (the other ensemble member) and check the deepseek-coder omission reasoning against the roster.

### Assistant | 2026-06-18T03:34:51.005Z

[tool_use: Bash]

### User | 2026-06-18T03:34:55.128Z

[tool_result] 27:| **qwen2.5-coder:32b** | 19.9 GB | **Heavy code** explain / review / lint / diff-summary / docstring — the strongest local coder | the heavy-code default. *(2026-06-16 correction: `qwen2.5-coder:7b` IS installed again — "NOT installed" was stale; `:32b` nonetheless stays the deliberate Black
42:1. **`qwen2.5-coder:7b` is the documented offload default fleet-wide** (global CLAUDE.md, `/ollama-*
... [+903 chars truncated]

### Assistant | 2026-06-18T03:35:03.467Z

This is strongly corroborating. The canonical host facts (re-verified live 2026-06-16) confirm:

1. `qwen2.5-coder:32b` is installed (the heavy-code default) — ensemble member 1 matches.
2. `qwen3-coder:30b` is the new heavy coder, canonical `PRISM_LOCAL_MEDIUM_MODEL` — ensemble member 2 matches.
3. The drift note explicitly states the phantom `qwen3-coder:32b` "only `:30b` ships" was a real bug fixed elsewhere — confirming the new code's exact `:30b` tag is the correct one, not the `:32b` form in aiDispatcher.
4. `deepseek-coder` does NOT appear in the 16-model roster — the omission with the "bare tag would never match" reasoning is correct (the roster has `deepseek-r1:32b`/`deepseek-r1:14b`, which are reasoners, not the `deepseek-coder` family).

Now let me verify the final concern: the conflict path where `coderEnsemble` interacts with `input.ollamaModel`/`secondaryOllamaModel`/`dualOllama`. When `coderEnsemble` is true, `diverseLocalPanel` becomes true, which forces the code into the `if (diverseLocalPanel)` branch (line 540) and sets `dualOllama = false` (line 522, gated by `!diverseLocalPanel`). Let me confirm `input.ollamaModel` is genuinely ignored in the diverse branch (this is pre-existing behavior, but I should confirm the coderEnsemble path doesn't produce an empty/wrong voice list).

### Assistant | 2026-06-18T03:35:04.713Z

[tool_use: Read]

### User | 2026-06-18T03:35:05.590Z

[tool_result] 599	    // Each call returns ONE or MORE ModelResponses (dual-Ollama returns 2).
600	    // We flatten after Promise.all so the rest of the engine treats them uniformly.
601	    // Per-model prompts are built lazily so each model gets a context sized to
602	    // its own context window.
603	    const calls: Array<Promise<ModelResponse[]>> = [];
604	    if (weightedClaude) {
605	      calls.push(b
... [+1914 chars truncated]

### Assistant | 2026-06-18T03:35:17.164Z

This confirms the full path. Tracing the `coderEnsemble` interaction concerns:

- **coderEnsemble + input.ollamaModel/secondaryOllamaModel:** When `coderEnsemble=true`, `diverseLocalPanel=true`, so execution takes the `if (diverseLocalPanel)` branch (line 540). In that branch `input.ollamaModel`/`secondaryOllamaModel` are NOT read — the panel comes from `diverseModels`. This is **pre-existing** behavior of the `diverseLocalPanel` flag (the diverse panel has always ignored the single-model pins), not introduced by this change. The new flag inherits the same documented semantics. No empty/wrong list arises: `ollamaVoices` is guaranteed non-empty via the `primaryOllama = ollamaVoices[0] ?? String(diverseModels[0] ?? DEFAULT_OLLAMA_MODEL)` fallback (line 561) + the `if (ollamaVoices.length === 0) ollamaVoices = [primaryOllama]` floor (line 562).

- **coderEnsemble + dualOllama:** `dualOllama` is gated by `!diverseLocalPanel` (line 522), so it is forced false — the two modes never both fire (the comment guarantee holds). The coder panel goes through the `ollamaVoices.length > 1` serialized path (line 618-632), correctly running both coders one-at-a-time.

- **coderEnsemble + diverseLocalModels:** If a caller pins `diverseLocalModels`, it wins (`input.diverseLocalModels ?? ...`, line 512) — the coder preset only applies when the caller did not pin a panel. Sensible precedence.

- **Back-compat (coderEnsemble unset/false):** `coderEnsemble = input.coderEnsemble === true` → false. `diverseLocalPanel === true || false` = original `input.diverseLocalPanel === true`. `diverseModels = input.diverseLocalModels ?? (false ? ... : [original 3 defaults])` → the original default array, byte-identical. The default branch is provably unchanged.

Let me do a final check: verify the 3 importers don't destructure or re-export the `ConsensusInput` interface in a way that the optional new field could break (e.g., exhaustiveness checks), and confirm there are no other consumers passing `Cons
... [+49 chars truncated]

### Assistant | 2026-06-18T03:35:19.543Z

[tool_use: Bash]

### User | 2026-06-18T03:35:27.217Z

[tool_result] ===keyof/Required/exhaustive checks on ConsensusInput===

### Assistant | 2026-06-18T03:35:55.472Z

None of the 3 importers reference `coderEnsemble`/`diverseLocalPanel`/`diverseLocalModels`, and no code uses `keyof ConsensusInput`, `Required<ConsensusInput>`, or `satisfies ConsensusInput` exhaustiveness checks that an added optional field could break. Adding an optional field to `ConsensusInput` is purely additive and back-compatible.

I have completed all required checks. Here is my verdict.

---

VERDICT: PASS

summary: The `coderEnsemble` addition is cleanly additive and back-compatible. With the flag unset/false the `ask()` Ollama-resolution path is provably byte-identical to before (`diverseModels` falls through to the original 3-element default array; `diverseLocalPanel` and `dualOllama` gating unchanged). The new `CODER_ENSEMBLE_MODELS` exact tags (`qwen2.5-coder:32b`, `qwen3-coder:30b`) match the live 16-model `/api/tags` roster verified 2026-06-16, and the `deepseek-coder` omission is correctly reasoned (no `deepseek-coder` tag in the roster; exact-match install-gating would never seat a bare tag). No silent breakage of the 3 importers, no export collision, no type-mutation hazard.

findings:
- [PASS] `mcp-server/src/engines/MultiModelConsensusEngine.ts:271` -- exported `CODER_ENSEMBLE_MODELS` collides with no existing export; grepped all consumers + `export *` re-exports (hooks/algorithms/utils index files — none re-export from this engine). Only referenced in the engine + its test.
- [PASS] TYPE -- `CODER_ENSEMBLE_MODELS` (`readonly [...]` tuple) flows only into `resolveDiverseOllamaPanel(requested: readonly string[], ...)` (`:392-393`, readonly-safe) and `String(diverseModels[0] ?? ...)` (`:561`). `ollamaVoices` is a separate mutable `string[]` (`:539`) assigned the `string[]` return of the resolver (`:411`); `diverseModels` is never mutated nor assigned to a `string[]`. tsc `--noEmit` reports 0 errors for this file.
- [PASS] BACK-COMPAT -- `coderEnsemble = input.coderEnsemble === true` defaults false → `diverseLocalPanel` reduces to the original `inp
... [+2898 chars truncated]
