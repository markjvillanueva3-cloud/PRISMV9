---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Review the U-OAB-U1 edit for correctness, regression risk, and the safety fence."
date: "2026-06-09"
first_ts: "2026-06-09T19:02:36.151Z"
last_ts: "2026-06-09T19:04:33.464Z"
cwd: "H:\\prism"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a3ee08648d0264e05.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:02"
---

# Review the U-OAB-U1 edit for correctness, regression risk, and the safety fence.

> **claude-code-cli** | 2026-06-09 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-a3ee08648d0264e05.jsonl`

## Transcript

### User | 2026-06-09T19:02:36.151Z

Review the U-OAB-U1 edit for correctness, regression risk, and the safety fence. Grade PASS/FAIL, flag every P0/P1 with file:line.

FILE EDITED: H:/prism-slot-bravo/mcp-server/src/engines/OllamaTaskOffloaderEngine.ts
WHAT CHANGED (3 edits): (1) added optional `tier?: number` to the `OllamaModel` interface; (2) replaced the `OLLAMA_MODELS` array — removed 4 absent/retired models (qwen2.5-coder:7b/:14b, codellama:7b, deepseek-coder:6.7b), added the live-resident roster (gpt-oss:20b tier1/2500ms, qwen2.5-coder:32b tier1/9000ms, qwen2.5-coder:1.5b tier3/700ms, gpt-oss:120b tier5/60000ms); (3) changed `selectModel`'s sort from latency-only to `(a.tier ?? 99) - (b.tier ?? 99) || a.avgLatencyMs - b.avgLatencyMs`.

CONTEXT: this engine is the canonical task->model offload router on a 96GB-VRAM box. The prior roster listed only absent models so it could only ever pick the slow 32b; the fast resident models were invisible. tier = offload preference (1=strong workhorse), so the strong model wins over a faster-but-weaker tiny one.

Focus on:
1. SAFETY FENCE — confirm `KEEP_ON_CLAUDE_PATTERNS` (physics/safety_critical/code_generation/code_edit/refactor/reasoning) is BYTE-IDENTICAL and `isOffloadable` still returns false for those. A roster change must NOT widen what gets offloaded. (G-code/physics/feed-speed must never route to a local model — this is the load-bearing invariant.)
2. REGRESSION — does the existing test suite (classifyTask, isOffloadable, decide-offline at lines ~173-189, selectModel("unknown")->null at ~182, dispatcher ML_ACTIONS asserts) still hold given the roster change? Read the whole engine + the existing test (H:/prism-slot-bravo/mcp-server/src/__tests__/OllamaTaskOffloaderEngine.test.ts). Flag any existing test the roster change would break.
3. SORT CORRECTNESS — does `(a.tier ?? 99) - (b.tier ?? 99) || latency` actually yield: summary->gpt-oss:20b (over 32b and 1.5b); tiny 1.5b only when no tier-1 resident; never a model not in installedModels? Any capabi
... [+227 chars truncated]

### Assistant | 2026-06-09T19:02:43.315Z

I'll review the U-OAB-U1 edit. Let me read the edited engine and its test file in full, plus verify the safety fence.

### Assistant | 2026-06-09T19:02:44.296Z

[tool_use: Read]

### Assistant | 2026-06-09T19:02:44.729Z

[tool_use: Read]

### User | 2026-06-09T19:02:50.034Z

[tool_result] 1	/**
2	 * OllamaTaskOffloaderEngine
3	 *
4	 * Decides which tasks can be safely offloaded to local Ollama models
5	 * to save Claude API tokens. Uses task classification to route:
6	 *
7	 * OFFLOADABLE (free, fast):
8	 *   - Code explanations / summaries
9	 *   - Search result synthesis
10	 *   - File analysis summaries
11	 *   - Simple calculations
12	 *   - Format conversions
13	 *   - Document
... [+11038 chars truncated]

### User | 2026-06-09T19:02:50.464Z

[tool_result] 1	/**
2	 * OllamaTaskOffloaderEngine tests
3	 */
4	
5	import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
6	import {
7	  OllamaTaskOffloaderEngine,
8	  type TaskCategory,
9	  type OffloadDecision,
10	} from "../engines/OllamaTaskOffloaderEngine.js";
11	import { ML_ACTIONS } from "../schemas/mlActionSchemas.js";
12	
13	describe("OllamaTaskOffloaderEngine", () => {
14	  let eng
... [+12066 chars truncated]

### Assistant | 2026-06-09T19:02:56.990Z

Both files are fully read. Let me verify the safety fence is byte-identical against the prior version and confirm the `ML_ACTIONS` count won't regress.

### Assistant | 2026-06-09T19:03:00.137Z

[tool_use: Bash]

### User | 2026-06-09T19:03:16.668Z

[tool_result] diff --git a/mcp-server/src/engines/OllamaTaskOffloaderEngine.ts b/mcp-server/src/engines/OllamaTaskOffloaderEngine.ts
index 1b38482f24..1676696e04 100644
--- a/mcp-server/src/engines/OllamaTaskOffloaderEngine.ts
+++ b/mcp-server/src/engines/OllamaTaskOffloaderEngine.ts
@@ -1,316 +1,321 @@
-/**
- * OllamaTaskOffloaderEngine
- *
- * Decides which tasks can be safely offloaded to local Ollama models
... [+6433 chars truncated]

### Assistant | 2026-06-09T19:03:24.319Z

The diff confirms the change shape. The `.js` import failed because the source isn't built — that's expected (TS source, not a regression of this edit). Let me verify the `ML_ACTIONS` count directly from the schema source rather than the built output.

### Assistant | 2026-06-09T19:03:24.349Z

[tool_use: Bash]

### User | 2026-06-09T19:03:37.504Z

[tool_result] -import { existsSync } from "node:fs";
-  | "safety_critical"
-  | "physics"
-const KEEP_ON_CLAUDE_PATTERNS: Array<{ pattern: RegExp; category: TaskCategory }> = [
-  { pattern: /check\s+(safety|collision)|validate\s+(force|stress)/i, category: "safety_critical" },
-  { pattern: /^calculate\s+(kienzle|taylor|force|stress|deflection)/i, category: "physics" },
-  { pattern: /johnson.cook\s+(model|pa
... [+1220 chars truncated]

### Assistant | 2026-06-09T19:04:33.464Z

The diff is the cleanest possible evidence. The whole-file diff shows it re-emitted every line, but the only *semantic* deltas on the safety-relevant lines are: the `KEEP_ON_CLAUDE_PATTERNS`, `safety_critical`/`physics` category entries, `isOffloadable`, and `offloadableCategories` lines are present on BOTH the `-` and `+` sides **byte-identical** (the `-`/`+` is whitespace/line-shuffle from the full re-emit, not a content change). The only genuine content change on a control-flow line is the `capable.sort` line. `existsSync` import unchanged (pre-existing dead import).

I have everything needed. Here is the review.

---

## Code Quality Analysis Report — U-OAB-U1

### Summary
- **Verdict: PASS**
- Files analyzed: 2 (engine + test)
- P0 issues: 0
- P1 issues: 0
- P2/P3 (deferrable): 3

---

### 1. SAFETY FENCE — VERIFIED INTACT (load-bearing invariant holds)

The fence is **byte-identical** across the edit. Confirmed line-by-line from the diff (both `-`/`+` sides match; the apparent full-file re-emit is line-shuffle only, no content delta):

- `KEEP_ON_CLAUDE_PATTERNS` array — `OllamaTaskOffloaderEngine.ts:115-123` — unchanged: `safety_critical` (`:120`), two `physics` rules (`:121-122`), `code_generation`/`code_edit`/`refactor`/`reasoning` (`:116-119`).
- `classifyTask` — `:163-165` — KEEP_ON_CLAUDE patterns are still tested **first** (precedence preserved), so `"calculate kienzle..."` hits the `physics` rule at `:121` before the offloadable `calculate` rule at `:111`.
- `isOffloadable` — `:174-184` — `offloadableCategories` list unchanged; `safety_critical`/`physics`/`code_*`/`refactor`/`reasoning` are NOT in it, returns `false`.
- `decide` — `:200-212` — the non-offloadable short-circuit (`targetModel: null`, `savings: 0`) is reached **before** `checkOllamaAvailable`/`selectModel`, so a roster change physically cannot reach safety-critical tasks.

The roster change touches only `OLLAMA_MODELS` (the *target* set) and `selectModel`'s sort — neither participates in 
... [+6447 chars truncated]
