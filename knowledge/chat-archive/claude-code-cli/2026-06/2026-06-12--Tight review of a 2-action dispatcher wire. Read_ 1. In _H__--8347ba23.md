---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "Tight review of a 2-action dispatcher wire. Read: 1. In `H:/prism/mcp-server/src"
date: "2026-06-12"
first_ts: "2026-06-12T00:11:55.738Z"
last_ts: "2026-06-12T00:12:20.647Z"
cwd: "H:\\prism-slot-bravo"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a3f57264b3adb680d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Tight review of a 2-action dispatcher wire. Read: 1. In `H:/prism/mcp-server/src

> **claude-code-cli** | 2026-06-12 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a3f57264b3adb680d.jsonl`

## Transcript

### User | 2026-06-12T00:11:55.738Z

Tight review of a 2-action dispatcher wire. Read:
1. In `H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`: the `local_embedding_status` + `local_embedding_similarity` entries in `INDIA_AI_ORPHAN_ACTIONS` + `INDIA_AI_ORPHAN_SCHEMAS` (search "Unit 2 -- LocalEmbeddingEngine"), and the two `case` handlers (search "INDIA-AI-ORPHAN-WIRE unit 2").
2. `H:/prism/mcp-server/src/engines/LocalEmbeddingEngine.ts` lines 80-156 (`isLoaded`, `getModel`, `cosineSimilarity` — note `cosineSimilarity` THROWS on non-array/empty/length-mismatch).

Verify:
- Both action names are in the actions array AND have a case (no orphan/typo); schemas present.
- `local_embedding_status` maps to isLoaded()+getModel() correctly.
- `local_embedding_similarity` GUARDS its input BEFORE calling cosineSimilarity so the engine's throw paths (non-array / empty / length-mismatch) are never hit unguarded — confirm the finiteNumArray guard + length-mismatch guard cover all three throw conditions, AND that a non-finite element can't reach cosineSimilarity and silently produce NaN.
- R12 SAFETY: neither action exposes NN inference (embed() / model-loading must NOT be wired). Confirm embed() is absent from the wire.
Report P0/P1 only. End: `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-12T00:11:58.137Z

I'll read both files in parallel to verify the wiring.

### Assistant | 2026-06-12T00:12:00.136Z

[tool_use: Grep]

### Assistant | 2026-06-12T00:12:00.514Z

[tool_use: Read]

### User | 2026-06-12T00:12:01.301Z

[tool_result] 264-
265-// INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11) -- surfaces the DATA introspection of india's
266-// dispatcher-DARK AI-systems engines (built + in-process-consumed but with ZERO MCP surface).
267-\ Classified by an ultracode sonnet fan-out (wf_4ebeaa0f-2cc): 8 of 21 dark AI engines are
268-\ WIRE_SAFE_DATA. R12 INVARIANT (carried from the SFC sweep): expose deterministic DATA / stats /
269-/
... [+4706 chars truncated]

### User | 2026-06-12T00:12:01.413Z

[tool_result] 80	  isLoaded(): boolean {
81	    return this.pipeline !== null;
82	  }
83	
84	  getModel(): string {
85	    return this.model;
86	  }
87	
88	  async embed(text: string): Promise<EmbedResult> {
89	    const started = Date.now();
90	    this.validateText(text);
91	    if (!this.pipeline) {
92	      const loaded = await this.load();
93	      if (!loaded) {
94	        return {
95	          ok: false,
... [+2174 chars truncated]

### Assistant | 2026-06-12T00:12:03.861Z

Now I need to see the length-mismatch guard in the case handler. Let me read the rest of that case block.

### Assistant | 2026-06-12T00:12:04.710Z

[tool_use: Read]

### User | 2026-06-12T00:12:05.841Z

[tool_result] 4273	      case "local_embedding_similarity": {
4274	        const a = params.a;
4275	        const b = params.b;
4276	        const finiteNumArray = (v: unknown): v is number[] =>
4277	          Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number" && Number.isFinite(x));
4278	        if (!finiteNumArray(a) || !finiteNumArray(b)) {
4279	          result = { success: false, erro
... [+636 chars truncated]

### Assistant | 2026-06-12T00:12:20.647Z

All the evidence is in hand. Here is the full finding.

---

**Action name registration**

Both `local_embedding_status` and `local_embedding_similarity` appear in `INDIA_AI_ORPHAN_ACTIONS` (line 282-283 of aiReasoningDispatcher.ts). That array is spread into `ALL_AI_ACTIONS` (line 307), which is the z.enum source. Both have entries in `INDIA_AI_ORPHAN_SCHEMAS` (lines 293-294), spread into `ALL_AI_SCHEMAS` (line 319). No orphan, no typo. Registration is complete.

**`local_embedding_status` case (line 4268-4272)**

Calls `localEmbeddingEngine.isLoaded()` and `localEmbeddingEngine.getModel()`. Both are trivial synchronous property reads (lines 80-86 of LocalEmbeddingEngine.ts) — no model loading, no NN path. Correct mapping.

**`local_embedding_similarity` guard coverage vs. engine throw conditions**

`cosineSimilarity` has exactly three throw conditions (lines 143-145 of LocalEmbeddingEngine.ts):
1. Non-array input — `!Array.isArray(a) || !Array.isArray(b)` throws.
2. Empty vector — `a.length === 0 || b.length === 0` throws.
3. Length mismatch — `a.length !== b.length` throws.

The dispatcher guard (lines 4276-4285) covers them:

- `finiteNumArray` requires `Array.isArray(v)` — covers throw condition 1.
- `finiteNumArray` requires `v.length > 0` — covers throw condition 2.
- `v.every((x) => typeof x === "number" && Number.isFinite(x))` — `Number.isFinite` is false for `NaN`, `Infinity`, and `-Infinity`, so no non-finite element can reach the engine. This also means `NaN`-silent-propagation through the dot-product loop is impossible.
- The explicit `if (a.length !== b.length)` check at line 4282 — covers throw condition 3.

All three throw conditions are guarded before `cosineSimilarity` is ever called. No unguarded path exists.

**R12 NN-inference safety**

`embed()` (line 88) and `embedBatch()` (line 134) are both async, model-loading, ONNX-inference paths. Neither appears in either case handler. The comment at line 4267 explicitly documents the exclusion. No infer
... [+237 chars truncated]
