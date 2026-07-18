---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "Review a runtime-LLM migration in `H:/prism/mcp-server/src/tools/dispatchers/atc"
date: "2026-06-19"
first_ts: "2026-06-19T17:56:46.383Z"
last_ts: "2026-06-19T17:58:14.495Z"
cwd: "H:\\prism\\mcp-server"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a8aab115bbf2c18d1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review a runtime-LLM migration in `H:/prism/mcp-server/src/tools/dispatchers/atc

> **claude-code-cli** | 2026-06-19 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a8aab115bbf2c18d1.jsonl`

## Transcript

### User | 2026-06-19T17:56:46.383Z

Review a runtime-LLM migration in `H:/prism/mcp-server/src/tools/dispatchers/atcsDispatcher.ts` (slot:india, FREE-AI-MIGRATION/U-ATCS-DISPATCHER-LLM-ROUTE). Read the WHOLE file's relevant regions plus its test `H:/prism/mcp-server/src/__tests__/atcs-dispatcher-llm-route.test.ts`.

CONTEXT -- what changed:
1. `callClaudeForUnit(systemPrompt, userPrompt, _model, maxTokens=4096)` (now EXPORTED for test) was a DIRECT paid `fetch("https://api.anthropic.com/v1/messages")` returning `{text,tokens,duration_ms}`. It now routes through the free Ollama-first substrate: `const {llmEngine}=await import("../../engines/LLMEngine.js"); const res=await llmEngine.query({prompt:userPrompt, system:systemPrompt, complexity:"high", max_tokens:maxTokens});`. Its RETURN TYPE gained a `model: string` field; on success it returns `{text:res.answer, tokens:res.tokens_used, duration_ms, model:res.model}`.
2. R12: ralph-style throw-on-offline -- `if (res.model === "offline") throw new Error("no AI provider available ...")`. The delegate_to_manus per-unit `.catch` (already present) marks the unit FAILED on that throw. The `.then` success path gained `delUnit.model = r.model;` (honest provenance).
3. SEAM FIX: the `delegate_to_manus` case had `if (!hasValidApiKey()) return err("ANTHROPIC_API_KEY not configured. Add to .env file.")` at its top -- REMOVED. The `hasValidApiKey`/`getApiKey` imports were dropped (kept `getModelForTier`, used at the tier resolution + DelegatedUnit.model label). The now-dead `type ApiResponse = Record<string,any>` was removed.

VERIFY (report P0/P1/P2 with file:line, then PASS or FAIL):
- Lazy import path `../../engines/LLMEngine.js` correct from `src/tools/dispatchers/`; `llmEngine.query` exists with `{prompt,system,complexity,max_tokens}` -> `{answer,model,tokens_used,...}` (LLMEngine at `src/engines/LLMEngine.ts`).
- callClaudeForUnit's NEW return type `{text,tokens,duration_ms,model}` is consumed correctly by the SINGLE call site (the delegate_to_manus `.then(r => {
... [+1299 chars truncated]

### Assistant | 2026-06-19T17:56:50.895Z

I'll read both files in parallel to do a thorough wiring review.

### Assistant | 2026-06-19T17:56:51.277Z

[tool_use: Read]

### Assistant | 2026-06-19T17:56:51.450Z

[tool_use: Read]

### User | 2026-06-19T17:56:52.466Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1256 of 1547 total (26164 tokens, cap 25000). Call Read with offset=1257 limit=1256 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * ATCS Dispatcher - Autonomous Task Completion System
3	 * Dispatcher #23: File-system-driven s
... [+62827 chars truncated]

### User | 2026-06-19T17:56:52.783Z

[tool_result] 1	/**
2	 * atcsDispatcher LLM-route migration test (FREE-AI-MIGRATION/U-ATCS-DISPATCHER-LLM-ROUTE, slot:india).
3	 *
4	 * Verifies prism_atcs's delegated-unit executor `callClaudeForUnit` was migrated from a DIRECT
5	 * paid Claude fetch (api.anthropic.com) to the free Ollama-first llmEngine substrate. Under
6	 * VITEST, llmEngine's test-hermeticity guard disables both default provider paths -> th
... [+5118 chars truncated]

### Assistant | 2026-06-19T17:56:56.043Z

Now I need to read the rest of the dispatcher file and verify the LLMEngine contract.

### Assistant | 2026-06-19T17:56:57.184Z

[tool_use: Read]

### Assistant | 2026-06-19T17:56:57.428Z

[tool_use: Read]

### User | 2026-06-19T17:56:58.028Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\LLMEngine.ts' was already read 20m ago in this session and is unchanged (mtime 1781883882762). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-19T17:56:58.358Z

[tool_result] 1257	
1258	            writeJSON(path.join(taskDir, "ASSEMBLY_REPORT.json"), assemblyReport);
1259	            writeJSON(path.join(taskDir, "TASK_MANIFEST.json"), manifest);
1260	            appendLog(taskId, `ASSEMBLY: ${assemblyReport.quality_verdict}. ${allOutputs.length}/${totalExpected} units. Status: ${manifest.status}`);
1261	
1262	            return ok(assemblyReport);
1263	          }
126
... [+15964 chars truncated]

### Assistant | 2026-06-19T17:57:02.262Z

The read-once guard tells me LLMEngine.ts was already read in this session — but since this is a fresh dispatcher-wiring review agent thread, the guard may be overly aggressive. Let me grep for the critical contract fields instead.

### Assistant | 2026-06-19T17:57:03.840Z

[tool_use: Grep]

### User | 2026-06-19T17:57:04.907Z

[tool_result] 5- * quote explanations, process advice, and G-code annotation. Routes to a FREE
6- * local Ollama model by default (so product features cost $0 at launch), with
7- * an adaptive fallback ladder to the paid Claude API and then a deterministic
8: * offline response. Policy via `config.prefer` / env `PRISM_LLM_PREFER`
9: * (auto|ollama|claude). See `query()` for the provider loop.
10- *
11- * Contex
... [+11660 chars truncated]

### Assistant | 2026-06-19T17:57:05.253Z

[tool_use: Grep]

### User | 2026-06-19T17:57:06.750Z

[tool_result] 87- * Execute one delegated work-unit prompt through the shared free-AI substrate
88- * (FREE-AI-MIGRATION/U-ATCS-DISPATCHER-LLM-ROUTE). Was a direct PAID Claude fetch
89: * (api.anthropic.com); now routes through `llmEngine.query` -- Ollama-first (free)
90- * with an adaptive Claude backup on availability + capability, then offline.
91- * `complexity:"high"` because delegated build units are non-
... [+23 chars truncated]

### Assistant | 2026-06-19T17:57:09.926Z

I have all the information needed. Let me now do a final targeted check on the `getModelForTier` import and confirm the export of `callClaudeForUnit`.

### Assistant | 2026-06-19T17:57:11.082Z

[tool_use: Grep]

### Assistant | 2026-06-19T17:57:11.806Z

[tool_use: Grep]

### User | 2026-06-19T17:57:12.795Z

[tool_result] 26:import { getModelForTier } from "../../config/api-config.js";
1330:            const model = getModelForTier(tier as ValidatedTier);

### User | 2026-06-19T17:57:13.575Z

[tool_result] 602:export const llmEngine = new LLMEngine();

### Assistant | 2026-06-19T17:58:14.495Z

I have all the data needed to produce the full review. Here is the complete findings report.

---

## Dispatcher Wiring Review: FREE-AI-MIGRATION/U-ATCS-DISPATCHER-LLM-ROUTE

**Files reviewed:**
- `H:/prism/mcp-server/src/tools/dispatchers/atcsDispatcher.ts`
- `H:/prism/mcp-server/src/__tests__/atcs-dispatcher-llm-route.test.ts`
- `H:/prism/mcp-server/src/engines/LLMEngine.ts` (contract verification via grep)

---

### Finding 1 — Lazy import path correctness

**PASS**

`atcsDispatcher.ts` lives at `src/tools/dispatchers/atcsDispatcher.ts`. The lazy import at line 105 is:

```
const { llmEngine } = await import("../../engines/LLMEngine.js");
```

Two `../` steps from `src/tools/dispatchers/` land at `src/`, then `engines/LLMEngine.js` is correct. The singleton `export const llmEngine = new LLMEngine();` exists at `LLMEngine.ts:602`. Named-export destructuring `{ llmEngine }` is correct. No issue.

---

### Finding 2 — LLMEngine.query() contract match

**PASS**

`LLMEngine.ts` defines `query(input: LLMQuery): Promise<LLMResponse>` at line 295.

`LLMQuery` accepts (among others):
- `prompt: string` — used at line 107
- `system?: string` — used at line 108 (the `system` override field per the `LLMQuery` definition at lines 79-84)
- `complexity?: "low" | "high"` — used at line 109 (`"high"`)
- `max_tokens?: number` — used at line 110

`LLMResponse` (lines 87-94) has:
- `answer: string`
- `model: string`
- `tokens_used: { input: number; output: number }`
- `duration_ms: number`

`callClaudeForUnit` maps these as:
- `res.answer` → `text` (line 116)
- `res.tokens_used` → `tokens` (line 117)
- `res.model` → `model` (line 119)
- `Date.now() - startTime` → `duration_ms` (line 118, computed independently rather than forwarding `res.duration_ms`, which is fine — the outer timer wraps the entire call including the lazy import)

All four LLMResponse fields are consumed correctly. No contract mismatch.

---

### Finding 3 — Offline throw and no-stub guarantee

**PASS**

The offlin
... [+7945 chars truncated]
