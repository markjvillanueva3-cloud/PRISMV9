---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "Review a new FREE vision substrate added to `H:/prism/mcp-server/src/engines/LLM"
date: "2026-06-19"
first_ts: "2026-06-19T19:46:18.359Z"
last_ts: "2026-06-19T19:48:08.003Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a8dacf4f91e29e6f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review a new FREE vision substrate added to `H:/prism/mcp-server/src/engines/LLM

> **claude-code-cli** | 2026-06-19 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a8dacf4f91e29e6f6.jsonl`

## Transcript

### User | 2026-06-19T19:46:18.359Z

Review a new FREE vision substrate added to `H:/prism/mcp-server/src/engines/LLMEngine.ts` + `H:/prism/mcp-server/src/engines/OllamaClientEngine.ts` (slot:india, FREE-AI-MIGRATION/U-LLM-QUERY-VISION), committed 3f7df39916. Read the relevant regions + the test `H:/prism/mcp-server/src/__tests__/LLMEngine.queryVision.test.ts`.

CONTEXT -- what was ADDED (all additive; the existing text query() path is untouched):
1. `OllamaClientEngine.ts`: `OllamaGenerateOptions` gained `images?: readonly string[]` (base64, no data: prefix); `generate()` now spreads `...(options.images?.length ? { images: [...options.images] } : {})` into `this.client.generate(...)` (conditional -- text-only calls unaffected).
2. `LLMEngine.ts`: `LLMConfig` gained `ollama_vision_model: string` (constructor default `qwen2.5vl:7b`, env `PRISM_LLM_OLLAMA_VISION_MODEL`); `LLMDeps` gained injectable `ollamaVisionGenerate?` + `claudeVisionCall?`; new types `VisionImage` + `LLMVisionQuery`; new method `queryVision(input)` mirroring the text `query()` provider ladder (ollama-vision-first -> claude-vision-backup -> offline), plus private helpers `_normalizeImage`, `_visionAnswerAdequate`, `_defaultOllamaVisionGenerate`, `_callClaudeVision`, `_generateOfflineVisionResponse`.

VERIFY (report P0/P1/P2 with file:line, then PASS or FAIL):
- The new `ollama_vision_model` REQUIRED config field is always set by the constructor (so the 6 LLMEngine importers + any `new LLMEngine(partialConfig)` callers still compile -- they pass Partial<LLMConfig>).
- queryVision mirrors query() correctly: provider order via `_providerOrder()`, ollama cooldown (`ollamaDownUntil`), `_withTimeout`, adequacy gate (`_visionAnswerAdequate`), `claudeBackupAvailable = !!api_key && order includes claude`, offline last. Confirm the escalation logic matches the text path's semantics (adequate||no-backup -> return local; inadequate+backup -> escalate without cooldown; ollama !ok -> cooldown + fall through).
- `_netDisabledInTest()` guards BOTH ne
... [+1179 chars truncated]

### Assistant | 2026-06-19T19:46:26.571Z

I'll read the relevant files to perform a thorough wiring review.

### Assistant | 2026-06-19T19:46:26.971Z

[tool_use: Read]

### Assistant | 2026-06-19T19:46:27.389Z

[tool_use: Read]

### Assistant | 2026-06-19T19:46:27.578Z

[tool_use: Read]

### User | 2026-06-19T19:46:28.854Z

[tool_result] 1	/**
2	 * LLMEngine — AI-Powered Manufacturing Intelligence
3	 *
4	 * Ollama-first LLM client for natural language queries about manufacturing,
5	 * quote explanations, process advice, and G-code annotation. Routes to a FREE
6	 * local Ollama model by default (so product features cost $0 at launch), with
7	 * an adaptive fallback ladder to the paid Claude API and then a deterministic
8	 * offline
... [+39022 chars truncated]

### User | 2026-06-19T19:46:28.977Z

[tool_result] 1	/**
2	 * OllamaClientEngine — Thin client around the `ollama` npm package
3	 *
4	 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
5	 * can request chat completions, plain-text generation, and embeddings
6	 * without importing the Ollama SDK directly. The real daemon must be
7	 * running (either via `docker compose up -d ollama` or a host install);
8	 * this engine is a 
... [+8117 chars truncated]

### User | 2026-06-19T19:46:29.014Z

[tool_result] 1	/**
2	 * LLMEngine.queryVision substrate test (FREE-AI-MIGRATION/U-LLM-QUERY-VISION, slot:india).
3	 *
4	 * queryVision is the FREE multimodal (image+text) path -- the keystone for the operator's
5	 * print-to-CNC / CAD-drawing features (ollama vision model first, Claude vision backup, then
6	 * offline), mirroring the proven text query() ladder. These tests exercise every rung:
7	 *  - offline 
... [+7803 chars truncated]

### Assistant | 2026-06-19T19:46:33.329Z

Now let me check the importers of LLMEngine to verify the `Partial<LLMConfig>` claim and the constructor behavior.

### Assistant | 2026-06-19T19:46:34.156Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:46:34.753Z

[tool_use: Grep]

### User | 2026-06-19T19:46:36.245Z

[tool_result] mcp-server\src\engines\LLMEngine.ts:827:export const llmEngine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:9:    const engine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:14:    const engine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:23:    const engine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:31:    const engine = new 
... [+4862 chars truncated]

### User | 2026-06-19T19:46:37.250Z

[tool_result] mcp-server\src\engines\AIExtractionReasonerEngine.ts:18:import { llmEngine, type ContextChunk } from "./LLMEngine.js";
mcp-server\src\engines\ColdHeadingToolConfiguratorEngine.ts:34:import { llmEngine, type ContextChunk } from "./LLMEngine.js";
mcp-server\src\engines\ElectrodeAIReasoningEngine.ts:44:import { llmEngine, type ContextChunk, type LLMResponse } from "./LLMEngine.js";
mcp-server\src\eng
... [+971 chars truncated]

### Assistant | 2026-06-19T19:46:40.257Z

I have all three files. Now let me verify the specific points in the review checklist systematically.

### Assistant | 2026-06-19T19:46:41.093Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:46:41.790Z

[tool_use: Grep]

### User | 2026-06-19T19:46:43.342Z

[tool_result] 42:  ollama_vision_model: string;
184:      ollama_vision_model: config?.ollama_vision_model ?? process.env.PRISM_LLM_OLLAMA_VISION_MODEL ?? "qwen2.5vl:7b",
483:            model: this.config.ollama_vision_model,
500:              model: `${this.config.ollama_vision_model} (ollama)`,

### User | 2026-06-19T19:46:43.563Z

[tool_result] 241:  private _netDisabledInTest(): boolean {
253:    if (this._netDisabledInTest()) {
568:    if (this._netDisabledInTest()) {
594:    if (this._netDisabledInTest()) {
755:    if (this._netDisabledInTest()) {

### Assistant | 2026-06-19T19:48:08.003Z

Good. All key call sites confirmed. Now I have everything needed to grade every verification point. Here is the complete review.

---

## Review: LLMEngine.queryVision + OllamaClientEngine vision passthrough

### Verified Files
- `H:/prism/mcp-server/src/engines/LLMEngine.ts`
- `H:/prism/mcp-server/src/engines/OllamaClientEngine.ts`
- `H:/prism/mcp-server/src/__tests__/LLMEngine.queryVision.test.ts`

---

### Check 1 — `ollama_vision_model` always set by the constructor

**LLMEngine.ts:184:**
```
ollama_vision_model: config?.ollama_vision_model ?? process.env.PRISM_LLM_OLLAMA_VISION_MODEL ?? "qwen2.5vl:7b",
```

The constructor accepts `Partial<LLMConfig>` and provides the three-level fallback chain (explicit config → env → literal default). The field is non-optional on `LLMConfig` (line 42: `ollama_vision_model: string`) but every call site passes a partial or no config at all — confirmed by the importer grep: all six engine importers (`AIExtractionReasonerEngine`, `ColdHeadingToolConfiguratorEngine`, `ElectrodeAIReasoningEngine`, `LocalModelOrchestratorEngine`, `PRISMIntelligenceLayer`, `TrilobeElectrodeGeometryEngine`) import the pre-built singleton `llmEngine` (line 827: `export const llmEngine = new LLMEngine()`) which calls the constructor with no arguments. The default triple-fallback fires for every such caller. No `new LLMEngine(partialConfig)` call site omits `ollama_vision_model` in a way that would bypass the default.

**Result: PASS**

---

### Check 2 — `queryVision` mirrors `query()` provider ladder correctly

Walking `queryVision` (lines 458–539) against `query()` (lines 333–446):

- **Provider order via `_providerOrder()`**: both call `this._providerOrder()` to get the loop list. `queryVision` line 477: `for (const provider of this._providerOrder())`. Identical pattern.
- **Ollama cooldown check**: `queryVision` line 479: `if (Date.now() < this.ollamaDownUntil) continue`. Identical to `query()` line 372.
- **`_withTimeout` wrapping**: `queryVision` 
... [+11887 chars truncated]
