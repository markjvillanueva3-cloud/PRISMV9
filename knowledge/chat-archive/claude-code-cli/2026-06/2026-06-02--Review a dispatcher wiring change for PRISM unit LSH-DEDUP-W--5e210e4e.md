---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Review a dispatcher wiring change for PRISM unit LSH-DEDUP-WIRE (slot:bravo). Fi"
date: "2026-06-02"
first_ts: "2026-06-02T17:09:00.040Z"
last_ts: "2026-06-02T17:11:17.067Z"
cwd: "H:\\prism-slot-bravo"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a6769c61bc10b3801.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# Review a dispatcher wiring change for PRISM unit LSH-DEDUP-WIRE (slot:bravo). Fi

> **claude-code-cli** | 2026-06-02 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a6769c61bc10b3801.jsonl`

## Transcript

### User | 2026-06-02T17:09:00.040Z

Review a dispatcher wiring change for PRISM unit LSH-DEDUP-WIRE (slot:bravo). Files:

1. Dispatcher: H:\prism\mcp-server\src\tools\dispatchers\memoryDispatcher.ts — search "LSH-DEDUP-WIRE" for my 3 added enum entries (lsh_dedup_add, lsh_dedup_is_duplicate, lsh_dedup_stats, just before `]).describe("Memory graph action")`) and the 3 matching case blocks (just before the main switch `default:`).
2. Engine: H:\prism\mcp-server\src\engines\LSHDedupEngine.ts — singleton `lshDedupEngine` (line 329). Methods: add(id: string, embedding: Float32Array): void (line 141, throws on dimension≠384), isDuplicate(embedding: Float32Array, threshold=0.85): {isDuplicate, matches: LSHCandidate[]} (line 223), getStats(): LSHStats (line 250).

VERIFY (grade PASS/FAIL, P0/P1 only):
- enum⇄case parity: 3 enum entries ↔ 3 cases, no orphans.
- API correctness: add→lshDedupEngine.add(p.id, new Float32Array(p.embedding)) then result={added:true,id}; is_duplicate→lshDedupEngine.isDuplicate(new Float32Array(p.embedding), p.threshold); stats→getStats(). The number[]→Float32Array conversion is REQUIRED (JSON has no Float32Array) — confirm it's correct.
- memoryDispatcher uses `result = <value>; break;` with a tail `JSON.stringify(slimResponse({ ...result, _action, _elapsed_ms }))` at line ~1376 — so `result` MUST be a spreadable object. Confirm all 3 cases assign an object to `result` (add→{added,id} ✓, isDuplicate→{isDuplicate,matches} ✓, getStats→LSHStats object ✓). A non-object result would break the `...result` spread.
- lazy import path '../../engines/LSHDedupEngine.js' correct (.js ESM convention — NOT a bug).
- The add() dimension guard: the dispatcher passes embeddings through as-is; if a caller sends a non-384-length array, add() throws — is that caught by the dispatcher's try/catch (acceptable) or does it crash? (Check the surrounding try/catch.)

DO NOT flag as my bug: a pre-existing TS7016 at memoryDispatcher.ts:474 (missing .d.ts for a .mjs import) is part of the repo's 655-error basel
... [+102 chars truncated]

### Assistant | 2026-06-02T17:09:29.023Z

I'll read both files to verify the wiring.

### Assistant | 2026-06-02T17:09:29.624Z

[tool_use: Read]

### Assistant | 2026-06-02T17:09:29.973Z

[tool_use: Read]

### User | 2026-06-02T17:09:46.623Z

[tool_result] 1	/**
2	 * PRISM Memory Graph Dispatcher (#27)
3	 * =====================================
4	 * 
5	 * prism_memory — 6 actions for the F2 cross-session memory graph.
6	 * 
7	 * Actions:
8	 *   get_health       — Graph stats, memory, integrity
9	 *   trace_decision   — Follow decision chain (forward/backward/both)
10	 *   find_similar     — Find similar nodes by dispatcher/action/error
11	 *   get_s
... [+2549 chars truncated]

### User | 2026-06-02T17:09:46.866Z

[tool_result] 135	    return denom > 0 ? dot / denom : 0;
136	  }
137	
138	  /**
139	   * Add an item to the LSH index
140	   */
141	  add(id: string, embedding: Float32Array): void {
142	    if (embedding.length !== this.config.dimensions) {
143	      throw new Error(`Embedding dimension mismatch: expected ${this.config.dimensions}, got ${embedding.length}`);
144	    }
145	
146	    this.embeddings.set(id, embe
... [+3677 chars truncated]

### Assistant | 2026-06-02T17:09:49.611Z

Now let me find the enum entries and case blocks added by LSH-DEDUP-WIRE.

### Assistant | 2026-06-02T17:09:51.291Z

[tool_use: Grep]

### Assistant | 2026-06-02T17:09:52.104Z

[tool_use: Read]

### User | 2026-06-02T17:10:06.203Z

[tool_result] 120-        // wiki index. Closes the synergy gap where PRISM AI dispatchers had no
121-        // first-class action to consult the file-based "2nd brain" — only the
122-        // in-MCP AgentMemoryFabric was MCP-exposed via agent_memory_query.
123-        "brain_recall",
124-        \ LSH-DEDUP-WIRE (slot:bravo): LSHDedupEngine — locality-sensitive-hashing embedding
125-        // dedup (pure, 
... [+1929 chars truncated]

### User | 2026-06-02T17:10:08.703Z

[tool_result] 260	      }
261	    }
262	
263	    const avgBucketSize = bucketCount > 0 ? totalBucketSize / bucketCount : 0;
264	    const avgQueryCandidates = this.queryStats.queries > 0
265	      ? this.queryStats.candidates / this.queryStats.queries
266	      : 0;
267	
268	    // Estimate false positive rate from average candidates vs matches
269	    // This is approximate - true FP rate requires labeled data
... [+1717 chars truncated]

### Assistant | 2026-06-02T17:10:12.742Z

Now let me check the surrounding try/catch to confirm dimension-guard throws are caught, and verify the tail spread pattern.

### Assistant | 2026-06-02T17:10:13.617Z

[tool_use: Read]

### User | 2026-06-02T17:10:34.858Z

[tool_result] 1340	              "../../../../scripts/lib/master-index-search-lib.mjs" as string
1341	            ).catch(() => null) as MasterLibShape | null;
1342	            const memLib = await import(
1343	              "../../../../scripts/lib/memory-index-search-lib.mjs" as string
1344	            ).catch(() => null) as MemLibShape | null;
1345	            const sources: Record<string, unknown[] | string
... [+4817 chars truncated]

### Assistant | 2026-06-02T17:10:38.027Z

Now let me check the outer try/catch scope to confirm the add() dimension-guard throw is caught there, and check where the switch begins.

### Assistant | 2026-06-02T17:10:39.669Z

[tool_use: Grep]

### User | 2026-06-02T17:11:00.483Z

[tool_result] 134-      \ H1-MS2: Auto-normalize snake_case → camelCase params
135-      let params = rawParams;
136:      try {
137-        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
138-        params = normalizeParams(rawParams);
--
148-        );
149-      }
150:      try {
151-        let result: any;
152-
--
465-              persistenceEnforced: false;
466-            } |
... [+1404 chars truncated]

### Assistant | 2026-06-02T17:11:17.067Z

All checks are complete. Here is the verdict.

---

**VERDICT: PASS**

```json
{
  "engine": "LSHDedupEngine",
  "file": "H:\\prism\\mcp-server\\src\\engines\\LSHDedupEngine.ts",
  "dispatcher": "memoryDispatcher",
  "z_enum": true,
  "case_statement": true,
  "lazy_import": true,
  "schema": true,
  "action_unique": true,
  "exported": true,
  "issues": []
}
```

**Check-by-check:**

- **enum/case parity:** 3 enum entries (`lsh_dedup_add`, `lsh_dedup_is_duplicate`, `lsh_dedup_stats`, lines 126-128) map 1:1 to 3 case blocks (lines 1377, 1384, 1390). No orphans on either side.

- **API correctness:** All three calls match the engine signatures exactly. `lsh_dedup_add` calls `lshDedupEngine.add(p.id, new Float32Array(p.embedding))` (matches `add(id: string, embedding: Float32Array): void`). `lsh_dedup_is_duplicate` calls `lshDedupEngine.isDuplicate(new Float32Array(p.embedding), p.threshold)` — `threshold` is typed `number | undefined` in the dispatcher params; the engine signature is `threshold: number = 0.85`, so passing `undefined` correctly invokes the default. `lsh_dedup_stats` calls `getStats()` with no args. All correct.

- **number[] -> Float32Array conversion:** Present and correct in both `lsh_dedup_add` (line 1380) and `lsh_dedup_is_duplicate` (line 1387). `lsh_dedup_stats` takes no embedding input so no conversion needed there.

- **Spreadable result objects:** All three cases assign plain objects to `result`. `lsh_dedup_add` assigns `{ added: true, id: p.id }`. `lsh_dedup_is_duplicate` assigns the return of `isDuplicate()` which is `{ isDuplicate: boolean; matches: LSHCandidate[] }`. `lsh_dedup_stats` assigns the return of `getStats()` which returns the `LSHStats` object literal (line 274-282 of engine) — a plain object. All are safely spreadable at line 1404.

- **Lazy import:** All 3 cases use `await import("../../engines/LSHDedupEngine.js")` with `.js` ESM suffix. Correct.

- **Dimension-guard throw handling:** The outer `try` block begins at line 150 
... [+362 chars truncated]
