---
type: "chat-session"
source: "claude-code-cli"
session_id: "c82292de-3196-443a-9079-0b9c268968eb"
title: "Independent third-reviewer (arm C) of PRISM unit U-BPA-LORA-PAIRS-WIRE (slot:ind"
date: "2026-06-25"
first_ts: "2026-06-25T00:21:17.262Z"
last_ts: "2026-06-25T00:25:40.624Z"
cwd: "H:\\PRISM"
messages: 64
user_msgs: 23
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-a2f7aa7a59a0883bb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Independent third-reviewer (arm C) of PRISM unit U-BPA-LORA-PAIRS-WIRE (slot:ind

> **claude-code-cli** | 2026-06-25 | 64 msgs (23 user / 41 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-a2f7aa7a59a0883bb.jsonl`

## Transcript

### User | 2026-06-25T00:21:17.262Z

Independent third-reviewer (arm C) of PRISM unit U-BPA-LORA-PAIRS-WIRE (slot:india). Do NOT assume arms A/B caught everything. Weighted toward: silent breakage, regression risk, I/O security, integration coupling, error-budget completeness. Grade PASS or FAIL with file:line citations. Read files end-to-end.

The unit makes the MCP action `blueprint_lora_prepare_set` default its training data from the closed-loop ledger when the caller omits `precomputedPairs[]`, by wiring the previously-orphaned `buildLoRAPairsFromLedger` into the dispatcher via a new `resolveLoRATrainingPairs` helper.

Files:
1. `H:/PRISM/scripts/lib/blueprint-lora-pair-builder.mjs` — new exported `resolveLoRATrainingPairs`.
2. `H:/PRISM/scripts/lib/blueprint-lora-pair-builder.test.mjs` — new tests.
3. `H:/PRISM/mcp-server/src/tools/dispatchers/cadDispatcher.ts` — rewired `blueprint_lora_prepare_set` case (~L3486).

Specifically hunt for:
- SILENT BREAKAGE: does any existing caller of `blueprint_lora_prepare_set` that relied on the OLD hard-error (`requires confidenceTier + precomputedPairs[]`) now get a surprising empty-set success instead of an error? Is that an acceptable behavior change or a silent footgun?
- REGRESSION: the case now does extra dynamic imports (path/url/the .mjs builder) on EVERY call, including the caller-supplied-pairs path. Any perf/coupling concern? Could a builder import failure throw and break a previously-working caller-supplied-pairs call (which never needed the builder)? Trace the failure path.
- I/O: the ledger read happens inside the engine's async `loadTrainingPairs` via `resolveLoRATrainingPairs` (which is sync and reads the file eagerly BEFORE the engine call). Is the ledger read on the hot path acceptable? Any unbounded read of `state/shared/blueprint-accuracy-events.jsonl` (currently ~500KB)?
- INTEGRATION: does `result = { success: true, data: { ...data, pairSource } }` break any downstream consumer expecting the bare TrainingSetSelection shape (setId/pairs/con
... [+474 chars truncated]

### Assistant | 2026-06-25T00:21:20.111Z

I'll review this unit thoroughly. Let me read all three files end-to-end.

### Assistant | 2026-06-25T00:21:20.585Z

[tool_use: Read]

### Assistant | 2026-06-25T00:21:20.892Z

[tool_use: Read]

### User | 2026-06-25T00:21:21.349Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\lib\blueprint-lora-pair-builder.mjs' was already read 3m ago in this session and is unchanged (mtime 1782346373635). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T00:21:21.703Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\lib\blueprint-lora-pair-builder.test.mjs' was already read 3m ago in this session and is unchanged (mtime 1782346439328). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### Assistant | 2026-06-25T00:21:23.948Z

The read-once guard reports these files were read earlier in this session, but I'm a fresh agent and don't have that content in my context. Let me bypass the cache.

### Assistant | 2026-06-25T00:21:24.962Z

[tool_use: Bash]

### User | 2026-06-25T00:21:28.844Z

[tool_result] /**
 * blueprint-lora-pair-builder (U-BPA-LORA-PAIRS, slot:india)
 *
 * Closes predictions->outcomes->RETRAIN on the LoRA surface: turns the shared
 * blueprint-accuracy-events.jsonl ledger into BlueprintLoRABridgeEngine
 * `LoRATrainingPair[]`, so blueprint_lora_prepare_set can default its training
 * data from CONFIRMED ground-truth instead of requiring caller-supplied pairs.
 *
 * VERIFIED live
... [+6155 chars truncated]

### Assistant | 2026-06-25T00:21:32.641Z

The cache guard says it was read this session, but as a subagent I need the content. Let me read the test and dispatcher files. The `cat` worked; let me continue with the test file and dispatcher, plus the consumer-lib that `parseEventsBlob` comes from.

### Assistant | 2026-06-25T00:21:33.625Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:21:35.138Z

[tool_use: Bash]

### User | 2026-06-25T00:21:37.911Z

[tool_result] /**
 * U-BPA-LORA-PAIRS (slot:india) -- tests the ledger -> LoRATrainingPair[] builder:
 * maps ONLY trustworthy rows (operator_correction + outcome_record accurate:true
 * with a populated extraction), EXCLUDES failure-telemetry (accurate:false,
 * extraction:null) and unconfirmed (accurate:null), with tier filtering, fail-soft,
 * and a LIVE-ledger smoke. Run: node scripts/lib/blueprint-lora-pai
... [+7769 chars truncated]

### User | 2026-06-25T00:21:41.641Z

[tool_result] // scripts/lib/blueprint-accuracy-consumer-lib.mjs
//
// BLUEPRINT-OCR-TRAINING-MS2/U-BPA-CONSUMER — pure functional core.
//
// The MS1 hook (`.claude/hooks/blueprint-accuracy-guard.mjs`) emits four event
// types to `state/shared/blueprint-accuracy-events.jsonl` after every blueprint
// extraction tool call:
//   - drift_observation  (conformal-bound widening >threshold)
//   - replay_add       
... [+2446 chars truncated]

### Assistant | 2026-06-25T00:21:44.865Z

Now let me look at `parseEventsBlob` to understand its read behavior, and then the dispatcher case.

### Assistant | 2026-06-25T00:21:46.445Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:21:46.924Z

[tool_use: Bash]

### User | 2026-06-25T00:21:53.003Z

[tool_result]  * Parse a JSONL blob (file contents) into an array of well-formed events.
 * Malformed lines are dropped (counted in the returned stats).
 *
 * @param {string} blob
 * @returns {{ events: object[], malformedCount: number, totalLines: number }}
 */
export function parseEventsBlob(blob) {
  if (typeof blob !== "string" || !blob.length) {
    return { events: [], malformedCount: 0, totalLines: 0 };

... [+1594 chars truncated]

### User | 2026-06-25T00:21:56.681Z

[tool_result]             result = { success: true, data };
            break;
          }
          // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7 — BlueprintExtractionRAGEngine
          // MCP path requires precomputedVisionRegions[] (vision backend
          // function cannot cross MCP boundary).
          case "blueprint_rag_extract": {
            if (!params.request || !params.backendId || !Array.isArray(params
... [+11733 chars truncated]

### Assistant | 2026-06-25T00:22:00.739Z

I now have the full dispatcher case. Let me verify the key claims:

1. The OLD behavior — was there a hard-error requiring `precomputedPairs[]`? Let me check git diff.
2. The engine's `prepareTrainingSet` shape (what the `...data` spread looks like, and whether downstream consumers depend on the bare shape).
3. The `confidenceTier` validation — is the engine tier-validated? An unknown tier from the caller.

### Assistant | 2026-06-25T00:22:02.655Z

[tool_use: Bash]

### User | 2026-06-25T00:22:10.669Z

[tool_result] 6cfc375799 [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-TOPK (slot:india): honor engine topK + drop the default-tribal corpus-size cliff (scrutiny P2)
466f47d769 [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-TRIBAL-DEFAULT (slot:india): inject blueprint-EXTRACTION tribal corpus by default into blueprint_rag_extract
e2fa23c46f [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME (slot:india): wire 
... [+3789 chars truncated]

### Assistant | 2026-06-25T00:22:14.096Z

Now I have the exact before/after. The OLD code required both `confidenceTier` AND `Array.isArray(params.precomputedPairs)`. Let me now check the engine's `prepareTrainingSet` to understand: (a) what shape `data` is (to assess the `pairSource` spread regression), (b) whether it validates tier / empty pairs, and (c) what `loadTrainingPairs` does with the pairs.

### Assistant | 2026-06-25T00:22:16.234Z

[tool_use: Bash]

### User | 2026-06-25T00:22:22.072Z

[tool_result] 5: * GroundTruthRegistryEngine + anonymizes (scrubs customer names, part numbers,
19: * @classification CRITICAL (LoRA export — HARD RULE anonymization)
32:export const LORA_CONFIDENCE_TIERS = ["operator_verified", "ensemble_consensus", "single_backend"] as const;
33:export type LoRAConfidenceTier = (typeof LORA_CONFIDENCE_TIERS)[number];
35:export interface LoRATrainingPair {
53:    confidenceTie
... [+2371 chars truncated]

### Assistant | 2026-06-25T00:22:26.946Z

Key findings emerging. Let me read the full `prepareTrainingSet` body (L118-160) and check what happens with empty pairs, plus check for downstream consumers of the `data` shape (e.g., does `blueprint_lora_export` consume `setId`?).

### Assistant | 2026-06-25T00:22:28.409Z

[tool_use: Bash]

### Assistant | 2026-06-25T00:22:31.205Z

[tool_use: Bash]

### User | 2026-06-25T00:22:35.039Z

[tool_result]   async prepareTrainingSet(input: {
    confidenceTier: LoRAConfidenceTier;
    sizeCap?: number;
    anonymize?: boolean;
    io?: LoRABridgeIO;
  }): Promise<TrainingSetSelection> {
    if (!LORA_CONFIDENCE_TIERS.includes(input.confidenceTier)) {
      throw new Error(`[BlueprintLoRABridgeEngine] invalid confidenceTier: ${input.confidenceTier}`);
    }
    const sizeCap = clampInt(input.sizeCap,
... [+1321 chars truncated]

### User | 2026-06-25T00:22:51.546Z

[tool_result] <persisted-output>
Output too large (31.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\c82292de-3196-443a-9079-0b9c268968eb\tool-results\bs0kuvucz.txt

Preview (first 2KB):
=== consumers of blueprint_lora_prepare_set result shape (web/frontend/tests) ===
mcp-server/web/node_modules/jiti/dist/babel.js:38:    `]}function getComputedKeyLastElement(path){if((path=(0,_helperSkipTr
... [+1819 chars truncated]

### Assistant | 2026-06-25T00:22:54.303Z

The grep was polluted by node_modules. Let me search source-only for real consumers of the result shape, and check the web frontend for the LoRA prepare-set call.

### Assistant | 2026-06-25T00:22:56.287Z

[tool_use: Bash]

### User | 2026-06-25T00:23:02.147Z

[tool_result] mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:91:  "blueprint_lora_prepare_set",
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:98:  blueprint_lora_prepare_set: z.record(z.string(), z.unknown()),
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:4215:      case "blueprint_lora_prepare_set": {
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:4219:            
... [+1111 chars truncated]

### Assistant | 2026-06-25T00:23:05.950Z

Critical finding. There is a **SECOND dispatcher** with its own `blueprint_lora_prepare_set` case: `aiReasoningDispatcher.ts:4215`, and it still carries the OLD contract (`requires confidenceTier + precomputedPairs[]`). Let me read that case to confirm whether it was wired or left behind (integration drift / inconsistent contract).

### Assistant | 2026-06-25T00:23:07.055Z

[tool_use: Bash]

### User | 2026-06-25T00:23:12.657Z

[tool_result]         const { physicsNeuralBridgeEngine } = await import("../../engines/PhysicsNeuralBridgeEngine.js");
        // Action contract key is `version` (matches the action name + the U-NN-WIRE-PNB
        // wiring test + the sibling `version:` usage). The engine's internal `model_version`
        // field name must not leak into the external action shape; no consumer reads model_version.
        re
... [+2650 chars truncated]

### Assistant | 2026-06-25T00:23:16.347Z

This is a significant integration-coupling finding. The same action `blueprint_lora_prepare_set` exists in TWO dispatchers with DIVERGENT contracts now. Let me verify which dispatcher actually serves the MCP action `blueprint_lora_prepare_set` at runtime (which one is registered for that action) — is it `prism_cad`/`prism_ai`, and do both register it? Let me check the action registration.

### Assistant | 2026-06-25T00:23:18.722Z

[tool_use: Bash]

### User | 2026-06-25T00:23:23.005Z

[tool_result] === cadDispatcher: does it register blueprint_lora_prepare_set in its action list? ===
276:  "blueprint_lora_prepare_set", "blueprint_lora_export", "blueprint_lora_register_endpoint",
277:  "blueprint_lora_history",
3486:          case "blueprint_lora_prepare_set": {
3497:                new Error("blueprint_lora_prepare_set requires confidenceTier (precomputedPairs[] optional -- defaults from the
... [+1373 chars truncated]

### Assistant | 2026-06-25T00:23:26.894Z

Confirmed: `blueprint_lora_prepare_set` is a registered action in BOTH `prism_cad` (cadDispatcher) and `prism_ai` (aiReasoningDispatcher), sharing the same engine. The unit only updated the `prism_cad` copy. Now let me verify the engine's behavior with EMPTY pairs (the silent-empty-set concern) and check the existing aiReasoning test that calls with `precomputedPairs: []` — to confirm the divergence and whether the empty-set produces a success or error.

### Assistant | 2026-06-25T00:23:28.432Z

[tool_use: Bash]

### User | 2026-06-25T00:23:34.009Z

[tool_result] let server: MockMCPServer;

beforeAll(() => {
  server = new MockMCPServer();
  registerAIReasoningDispatcher(server);
});

describe("aiReasoningDispatcher → blueprint_lora_prepare_set", () => {
  // Wiring round-trip test — engine variability lives in BlueprintLoRABridgeEngine.test.ts (36/36).
  // The action-discoverability sweep at the bottom proves routing; the failure-mode tests below
  // pr
... [+3029 chars truncated]

### Assistant | 2026-06-25T00:23:39.147Z

I have enough now to assess the silent-empty-set concern. Let me verify the final critical question: when `prepareTrainingSet` gets an empty `pairs` array (ledger has no operator_verified rows), does it return `success:true` with `pairs:[]` — i.e., the silent footgun? The engine code at L132-155 shows `raw.slice(0, sizeCap)` of `[]` → `[]` → returns `{setId, pairs:[], confidenceTier, anonymized:true}` with no error. Let me confirm the live ledger's actual content to gauge whether the default path returns empty in practice.

### Assistant | 2026-06-25T00:23:41.772Z

[tool_use: Bash]

### User | 2026-06-25T00:23:45.286Z

[tool_result] Exit code 1
size: 508483 bytes, lines: 145
=== type counts ===
      3 "type":"angle"
     72 "type":"angular"
     10 "type":"chamfer"
      3 "type":"depth"
    188 "type":"diameter"
      1 "type":"external"
      4 "type":"length"
    567 "type":"linear"
    144 "type":"outcome_record"
     86 "type":"radius"
      1 "type":"relief_pattern"
      7 "type":"thread"
=== operator_correction count
... [+50 chars truncated]

### Assistant | 2026-06-25T00:23:51.438Z

This confirms the silent-empty-set footgun in practice. The live ledger has **144 `outcome_record` rows, ZERO `operator_correction`, ZERO `accurate:true`**. So `buildLoRAPairsFromLedger("operator_verified")` returns `[]` on the real ledger TODAY. Let me confirm `parseEventsBlob` reads the whole file eagerly (the `nested "type"` matches above are inside payloads, not top-level events, so the type distribution is misleading — but the key facts stand: 144 outcome_records, 0 trainable). Let me verify the `eventToPair` for a sample real outcome_record and confirm zero trainable, plus check the resolve reads entire 508KB synchronously.

### Assistant | 2026-06-25T00:23:54.538Z

[tool_use: Bash]

### User | 2026-06-25T00:23:58.645Z

[tool_result] === sample top-level event types (first field of each line) ===
{"type":"outcome_record","ts":"2026-05-18T20:06:41.466Z","payload":{"pdf_path":"H:/prism/JM DIE/GENERAL BANDAGES/1666891.pdf","part_class":"general","operator_id":null,"extract_status":"failed","cad_s...
{"type":"outcome_record","ts":"2026-05-18T20:08:47.684Z","payload":{"pdf_path":"H:/prism/JM DIE/GENERAL BANDAGES/1666891.pdf","part_
... [+388 chars truncated]

### Assistant | 2026-06-25T00:24:04.701Z

Interesting — the live ledger DOES produce 1 pair (an `accurate:true` outcome_record exists, my grep was looking at the wrong nesting). So the default path returns 1 pair today, not 0. Still, the silent-empty-set concern is valid for any tier with no rows (e.g. `ensemble_consensus`, `single_backend`), and for the common case. Let me confirm the behavior: a caller requesting `ensemble_consensus` or `single_backend` now gets `success:true, pairs:[]` instead of being able to supply pairs and the old hard-error. Let me run the exact dispatcher-equivalent scenarios to confirm the empty success path and that resolve short-circuits for caller pairs (no ledger read).

### Assistant | 2026-06-25T00:24:11.346Z

[tool_use: Bash]

### User | 2026-06-25T00:24:15.621Z

[tool_result] ensemble_consensus -> source: ledger pairs: 0
caller path -> source: caller builderRan: false pairs: 1
caller path real builder -> source: caller pairs: 1

### Assistant | 2026-06-25T00:24:20.869Z

Confirmed:
- The caller-supplied non-empty path **correctly short-circuits BEFORE the builder/ledger read** (builderRan=false). The dynamic `.mjs` import still happens in the dispatcher, but `resolveLoRATrainingPairs` itself does not read the file when caller supplies pairs. Good — that addresses the explicit question.
- A tier with no rows (`ensemble_consensus`) now returns `source: ledger, pairs: 0` → `success:true` with empty set, where the OLD code hard-errored.

Now let me trace the **builder-import-failure path** regression concern: if the `.mjs` import throws (e.g. file missing/syntax error), does it break a previously-working caller-supplied-pairs call? Let me confirm there's no try/catch around the dynamic import in the dispatcher.

### Assistant | 2026-06-25T00:24:22.072Z

[tool_use: Bash]

### User | 2026-06-25T00:24:27.384Z

[tool_result] 16:            const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
17:            const pathMod = await import("path");
18:            const urlMod = await import("url");
22:            const { resolveLoRATrainingPairs } = await import(urlMod.pathToFileURL(builderPath).href);
23:            const { pairs, source: pairSource } = resolveLoRATrainingPairs
... [+2 chars truncated]

### Assistant | 2026-06-25T00:24:33.217Z

No try/catch around the builder import. Let me check whether the outer dispatcher has a top-level try/catch that converts a throw into a `dispatcherError` (so an import failure degrades to a structured error, not an uncaught crash) — and whether the OLD caller-supplied path would have succeeded where the new one throws.

### Assistant | 2026-06-25T00:24:35.922Z

[tool_use: Bash]

### User | 2026-06-25T00:24:40.500Z

[tool_result] === find the try/catch wrapping the switch in cadDispatcher ===
              return dispatcherError(
              return dispatcherError(
              return dispatcherError(
              return dispatcherError(
              return dispatcherError(
              return dispatcherError(
              return dispatcherError(
              return dispatcherError(
              return dispatcherE
... [+637 chars truncated]

### Assistant | 2026-06-25T00:24:47.834Z

The switch is wrapped by a top-level `try` whose `catch` at L6181-6182 returns `dispatcherError(error, ...)`. So a builder-import failure becomes a structured dispatcher error rather than an uncaught crash. That bounds the regression: an import failure does NOT crash the process, but it WOULD convert a previously-succeeding caller-supplied-pairs call into an error (the import now runs unconditionally before the short-circuit logic completes). This is a real but low-probability regression (the .mjs is committed and tested). Let me verify the import ordering precisely — the import runs before `resolveLoRATrainingPairs` is even called, so a caller-supplied path now has a new failure dependency it never had.

Let me also confirm the `pairSource` downstream-shape concern: does any consumer read the bare `TrainingSetSelection` from this dispatcher's result, and does `prism_ai`'s version (no `pairSource`) create an inconsistent contract? I already saw the only programmatic consumer is the xray script which just embeds an instruction string. Let me do a final check on the web frontend.

### Assistant | 2026-06-25T00:24:50.646Z

[tool_use: Bash]

### User | 2026-06-25T00:24:55.437Z

[tool_result] --- (empty = no web consumer) ---

=== does prism_ai (aiReasoning) version return bare selection (no success wrap, no pairSource)? confirm divergence ===
        }
        const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
        result = await blueprintLoRABridgeEngine.prepareTrainingSet({
          confidenceTier: p.confidenceTier as Parameters<typ
... [+395 chars truncated]

### Assistant | 2026-06-25T00:25:02.686Z

No web/frontend consumer reads the result shape, so the `{ ...data, pairSource }` spread is additive and safe for the `prism_cad` path (no downstream break). 

The divergence is now fully characterized: `prism_ai`'s `blueprint_lora_prepare_set` returns the bare selection AND still requires `precomputedPairs[]` (old contract), while `prism_cad`'s returns `{...selection, pairSource}` and defaults from the ledger. Same action name, same engine, two different contracts and two different result shapes.

Let me do one final verification: run the new test suite to confirm 15/15 as claimed, and confirm the `confidenceTier` mismatch — the builder's `LORA_TIERS` clamps unknown tiers to `operator_verified` silently, but the engine throws on an invalid tier. So if a caller passes `confidenceTier:"confirmed"` (as the aiReasoning test does), what happens in the cad path?

### Assistant | 2026-06-25T00:25:05.347Z

[tool_use: Bash]

### User | 2026-06-25T00:25:09.169Z

[tool_result] # tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 20.6376
=== tier mismatch: builder clamps 'confirmed' to operator_verified, but engine throws on invalid tier ===
builder with confirmed tier -> source: ledger pairs: 1 (clamped silently to operator_verified)

### Assistant | 2026-06-25T00:25:40.624Z

15/15 confirmed. The tier-mismatch is benign in the cad path: if a caller passes an invalid tier like `"confirmed"`, the builder silently clamps to `operator_verified` and builds, but then `prepareTrainingSet` throws `invalid confidenceTier` (caught → dispatcherError). So the invalid-tier caller still gets an error — the builder's clamp is wasted work but doesn't mask the engine's validation. No silent-success-on-invalid-tier bug. Good.

I now have everything needed. Let me consolidate the verdict.

## Summary of trace

**Files reviewed end-to-end:** `blueprint-lora-pair-builder.mjs`, its `.test.mjs` (15/15), the `cadDispatcher.ts` case (git diff HEAD→working), the engine `BlueprintLoRABridgeEngine.ts:118-160`, the sibling `aiReasoningDispatcher.ts:4215`, the existing wire test, and the live ledger (508KB/145 lines, builds 1 pair today).

---

VERDICT: FAIL

summary: The wiring is functionally sound and well-tested in isolation (caller-pairs short-circuit before any ledger read; engine throw → dispatcherError; `pairSource` spread is additive with no downstream consumer). But the SAME action `blueprint_lora_prepare_set` is registered in TWO dispatchers (`prism_cad` and `prism_ai`) sharing one engine, and only the `prism_cad` copy was rewired — leaving a divergent contract and a silent empty-set behavior change that the unit did not surface to callers.

findings:
- [P1] `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:4215-4229` — INTEGRATION DRIFT / un-updated consumer. `blueprint_lora_prepare_set` is also a registered `prism_ai` action (allowlist L91, schema L98) backed by the same `BlueprintLoRABridgeEngine`. It still enforces the OLD contract `requires confidenceTier + precomputedPairs[]` (L4217) and returns the BARE selection (no `pairSource`, no `{success}` wrap). After this unit the action behaves differently depending on which dispatcher routes it: `prism_cad` defaults from the ledger + returns `{...data, pairSource}`; `prism_ai` hard-errors without 
... [+3363 chars truncated]
