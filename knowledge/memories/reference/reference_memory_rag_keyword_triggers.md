---
name: Memory RAG keyword triggers
description: Exact keyword list that fires memory-rag-inject.mjs and surfaces vault excerpts above the user prompt. Phrase prompts to trigger this when recall is wanted.
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
The UserPromptSubmit hook `H:/prism/.claude/hooks/memory-rag-inject.mjs` only injects vault context when the prompt matches a memory-recall keyword. Otherwise the hook silently passes through (4s budget, never blocks).

**Trigger keywords** (delegated to `obsidianMemoryRagEngine.query()` — keyword set lives there, not in the hook):

- `remember`
- `recall`
- `previous`
- `last time`
- `earlier`
- `prior`
- `before`
- `context from`

**How to apply:**

- To intentionally surface vault context: include one of these words naturally in the prompt ("recall how we wired the post processor", "what did we decide previously about ...").
- The hook reads on disk only — no LLM calls, no Qdrant — so it's effectively free.
- Hits are rendered above the user prompt as `additionalContext`.
- Escape hatch to suppress: `PRISM_MEMORY_RAG_DISABLED=1`.
- Source: `H:/prism/.claude/hooks/memory-rag-inject.mjs` lines 1–28 (header) — actual keyword list lives in `ObsidianMemoryRagEngine` at `H:/prism/mcp-server/src/engines/ObsidianMemoryRagEngine.ts` (or `H:/prism-iooms0/...`).
- Logged hits: `H:/prism/state/shared/memory-rag-inject.log`.

If a future Claude widens the trigger list, every prompt pays a 4s+vault-scan cost — keep it narrow.
