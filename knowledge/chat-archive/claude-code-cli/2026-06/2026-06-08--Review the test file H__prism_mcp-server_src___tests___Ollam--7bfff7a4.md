---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Review the test file H:/prism/mcp-server/src/__tests__/OllamaCapabilityProbeEngi"
date: "2026-06-08"
first_ts: "2026-06-08T15:10:25.246Z"
last_ts: "2026-06-08T15:10:54.472Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a655550adf1d43a39.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review the test file H:/prism/mcp-server/src/__tests__/OllamaCapabilityProbeEngi

> **claude-code-cli** | 2026-06-08 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a655550adf1d43a39.jsonl`

## Transcript

### User | 2026-06-08T15:10:25.246Z

Review the test file H:/prism/mcp-server/src/__tests__/OllamaCapabilityProbeEngine.test.ts (read it end-to-end).

CONTEXT: This session migrated 3 RED tests in this file. The model `qwen2.5-coder:7b` was retired (`ollama rm`'d) on 2026-06-04 (U-BW-TS-ENGINES-RETIRE) and removed from `DEFAULT_MODEL_CATALOG` in src/engines/ModelRoutingEngine.ts. The cap-probe engine (src/engines/OllamaCapabilityProbeEngine.ts) iterates `this.catalog` and only marks a present model "runnable" if it's IN the catalog AND fits free VRAM. So the 3 tests asserting `qwen2.5-coder:7b` runnability were stale (RED). They were migrated to live-catalog models: `phi3:14b` (vramGB:14 = 14336 MiB, runsOn [home_blackwell, home_4080]) and `qwen3-vl:8b` (vramGB:6, runsOn includes home_blackwell). The fixture `PS_7B_LOADED` was renamed `PS_LOADED_8GB` (its size_vram drives the WDDM free-VRAM estimate; the /api/ps model name need NOT be in the catalog).

VERIFY (flag P0/P1, grade PASS/FAIL):
1. The 3 migrated tests preserve their ORIGINAL INTENT (fit-test, no-fit-test, blackwell-only-exclusion). Specifically: does phi3:14b at 14336 MiB correctly fit 15000 free but not 10000 free? Is the math arithmetically correct?
2. Did the migration accidentally weaken any assertion (the cardinal sin — R12)? Compare the new assertions to what they should test.
3. Is `qwen3-vl:8b` actually a valid home_blackwell-runnable catalog entry (vramGB 6)? Does the happy-path runnable-set assertion `["nomic-embed-text", "qwen2.5-coder:32b", "qwen3-vl:8b"]` hold given the WDDM-estimated ~87GB free?
4. Any remaining `qwen2.5-coder:7b` reference that is NOT just an explanatory comment?
5. The fixture rename PS_7B_LOADED -> PS_LOADED_8GB — all call sites updated?

Report concisely. Do NOT run the tests (they already pass 19/19); review the diff logic for correctness + intent-preservation only.

### Assistant | 2026-06-08T15:10:32.314Z

I'll read the test file end-to-end and verify the migration correctness.

### Assistant | 2026-06-08T15:10:32.352Z

[tool_use: Read]

### User | 2026-06-08T15:10:33.201Z

[tool_result] 1	/**
2	 * Tests for OllamaCapabilityProbeEngine (BLACKWELL-AI-MS0 / U-CAP-PROBE).
3	 *
4	 * Coverage: happy path · WDDM free-VRAM correction (the verified Windows
5	 * artifact) · 3 failure modes (no GPU, Ollama down, malformed JSON) · 2
6	 * adversarial (NaN/empty VRAM, oversize-doesn't-fit) · 4-profile variability
7	 * (blackwell/4080/3080/cloud_only) · TTL cache (injected clock) · the
8	 * rou
... [+19000 chars truncated]

### Assistant | 2026-06-08T15:10:35.789Z

Now let me verify the specific migration details by checking the source engine file briefly to understand the catalog structure:

### Assistant | 2026-06-08T15:10:36.363Z

[tool_use: Grep]

### User | 2026-06-08T15:10:39.119Z

[tool_result] mcp-server\src\engines\IdeaBlockGovernanceEngine.ts:12: * `qwen2.5-coder:7b` via Ollama. Confidence-threshold floor blocks
mcp-server\src\engines\ModelTelemetryEngine.ts:62:  /** Canonical model id, e.g. "qwen2.5-coder:7b" / "claude-sonnet-4-6". */
mcp-server\src\engines\ModelRoutingEngine.ts:158:    id: "qwen3-vl:8b",
mcp-server\src\engines\ModelRoutingEngine.ts:315:    id: "phi3:14b",
mcp-server
... [+534 chars truncated]

### Assistant | 2026-06-08T15:10:54.472Z

## Test Migration Verification Report

I've reviewed the OllamaCapabilityProbeEngine.test.ts file end-to-end. Here's the assessment:

### 1. **Original Intent Preserved** ✓ PASS
The three migrated tests maintain their semantic intent:
- **Line 44–76 (happy path / WDDM correction):** Tests that a model present in live catalog AND fitting free VRAM is marked runnable. The assertion `["nomic-embed-text", "qwen2.5-coder:32b", "qwen3-vl:8b"]` correctly verifies all three are present + runnable.
- **Line 257–271 (fit-test / no-fit-test):** Tests that a **present** model with insufficient free VRAM is **excluded** from runnable. Uses `phi3:14b` (14336 MiB declared vram) vs 10000 MiB free — arithmetic is correct: 14336 > 10000, so excluded. This replaces the stale `qwen2.5-coder:7b` (retired 2026-06-04) which was already absent from the catalog, making the old test's assertion wrong (a catalog-absent model can never be runnable, so the mechanism being tested wasn't actually being tested).
- **Line 274–286 (blackwell-only exclusion):** Tests that a model present AND fitting but excluded by hardware profile (`runsOn: [home_4080, ...]` but hardware is `home_blackwell`) is correctly filtered. Assertion passes the 4080 hardware check against `phi3:14b`.

### 2. **No Assertion Weakening** ✓ PASS
All three migrations strengthen or preserve the test assertions:
- Line 73: `toEqual(["nomic-embed-text", "qwen2.5-coder:32b", "qwen3-vl:8b"])` — exact match, three-item list. **No weakening.**
- Line 268–270: Still asserts `presentModels` contains the model BUT `runnableModelIds` does NOT (the real filter logic). **Preserved.**
- Line 285: `not.toContain("qwen2.5-coder:32b")` kept; `phi3:14b` is correctly asserted as runnable on 4080 with 15000 free (14336 < 15000). **No weakening.**

### 3. **Catalog Validity Check** ✓ PASS
- **`qwen3-vl:8b`** at line 51, 73, 36: Declared vramGB=6 (6144 MiB). Line 36 fixture loads `8749454458 bytes = 8344 MiB`. On Blackwell with ~87GB free (97887 − 8344
... [+1326 chars truncated]
