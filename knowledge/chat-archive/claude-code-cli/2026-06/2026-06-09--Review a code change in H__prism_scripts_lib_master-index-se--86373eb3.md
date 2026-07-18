---
type: "chat-session"
source: "claude-code-cli"
session_id: "86373eb3-4ddb-4fe0-820b-a16ac7694943"
title: "Review a code change in H:/prism/scripts/lib/master-index-search-lib.mjs (and it"
date: "2026-06-09"
first_ts: "2026-06-09T15:54:52.320Z"
last_ts: "2026-06-09T15:58:58.152Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--/86373eb3-4ddb-4fe0-820b-a16ac7694943/subagents/agent-ad8d675ed9235cd92.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Review a code change in H:/prism/scripts/lib/master-index-search-lib.mjs (and it

> **claude-code-cli** | 2026-06-09 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--/86373eb3-4ddb-4fe0-820b-a16ac7694943/subagents/agent-ad8d675ed9235cd92.jsonl`

## Transcript

### User | 2026-06-09T15:54:52.320Z

Review a code change in H:/prism/scripts/lib/master-index-search-lib.mjs (and its test H:/prism/scripts/lib/master-index-search-lib.test.mjs). Read both files end-to-end.

CONTEXT: The master-index-precheck-inject.mjs hook OOM-crashed on every prompt when PRISM_MASTER_INDEX_INJECT=1, because tryLoadSidecar() did `JSON.parse(readFileSync(sidecarPath))` on a 191MB sidecar inside the fleet's 384MB hook heap cap (set by portable-node, a deliberate Windows commit-reservation guard). The fix adds a heap-aware guard in tryLoadSidecar(): before parsing, check the sidecar file size against ceiling = 35% of v8.getHeapStatistics().heap_size_limit (override knob PRISM_SIDECAR_MAX_BYTES). If the sidecar exceeds the ceiling, return rejected() so the caller falls through to the smaller architecture-graph (59MB). Added `import * as v8 from "node:v8"`. Two regression tests added.

VERIFY, with file:line evidence:
1. Heap-guard math: does 35%-of-heap keep a 384MB-heap hook from OOMing on the 191MB sidecar (35% of ~432MB live limit ~= 151MB < 191MB -> rejected -> fallback)? Confirm.
2. Is the try/catch around the v8/stat check fail-SAFE (v8/stat throws -> falls through to legacy parse = prior behavior), and does it avoid swallowing a real error?
3. Does the guard run BEFORE the parse and AFTER the existing existsSync/schema checks?
4. Does rejected() emit a visible stderr line (R12)?
5. Are the 2 regression tests REAL (assert path via x===99/undefined sentinel) covering oversized->legacy AND generous->sidecar?
6. Edge cases: PRISM_SIDECAR_MAX_BYTES non-numeric/0/negative; statSync race after existsSync.

Report P0/P1/P2 with file:line. End with one line: PASS or FAIL.

### Assistant | 2026-06-09T15:56:08.136Z

I'll read both files end-to-end before evaluating any claims.

### Assistant | 2026-06-09T15:56:08.791Z

[tool_use: Read]

### Assistant | 2026-06-09T15:56:10.429Z

[tool_use: Read]

### User | 2026-06-09T15:56:15.148Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+30087 chars truncated]

### User | 2026-06-09T15:56:18.078Z

[tool_result] 1	/**
2	 * master-index-search-lib.test.mjs
3	 *
4	 * Real-value coverage for the shared keyword search lib used by both
5	 * master-index-precheck-inject.mjs and spawned-agent-context-lib.mjs.
6	 *
7	 * Uses node:test (matches the rest of .claude/helpers/ test pattern) so it
8	 * works under the portable node runner without vitest harness setup.
9	 *
10	 * Coverage:
11	 *   - tokenize: stopwords,
... [+40634 chars truncated]

### Assistant | 2026-06-09T15:58:58.152Z

I have read both files end-to-end. Now I will evaluate each of the six verification points with file:line evidence.

---

## Reviewing H:/prism/scripts/lib/master-index-search-lib.mjs and its test

---

### Verification Point 1: Heap-guard math — does 35%-of-heap keep a 384MB-heap hook from OOMing on the 191MB sidecar?

The comment at `master-index-search-lib.mjs:185-191` states the sidecar is "~200 MB" and describes the fix. The actual sidecar being guarded is described in `master-index-search-lib.mjs:133-140` as the "merged system-graph" at ~372 MB, with the sidecar (`system-graph-index.json`) being a compact inverted-index. The context block at lines 185-191 says:

> "a 384 MB heap -> ~134 MB sidecar ceiling, so the 200 MB sidecar is skipped"

The user's prompt says the sidecar is 191MB and the heap limit reported by V8 for the portable-node fleet is 384MB. Let me verify the arithmetic in the code itself:

`master-index-search-lib.mjs:193-195`:
```js
const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;
const sidecarMaxBytes = Number(process.env.PRISM_SIDECAR_MAX_BYTES)
  || Math.floor(heapLimitBytes * 0.35);
```

The reported `heap_size_limit` from V8 is NOT the same as `--max-old-space-size`. V8's `heap_size_limit` typically includes both young-gen and old-gen, and on Node.js the `heap_size_limit` reported by `v8.getHeapStatistics()` is often LARGER than the old-space limit set by `--max-old-space-size=384`. A 384MB `--max-old-space-size` typically results in a `heap_size_limit` around 432-480MB depending on Node version.

The comment at line 190 says "a 384 MB heap -> ~134 MB sidecar ceiling." But if `heap_size_limit` is actually ~432MB (as the user's prompt states: "35% of ~432MB live limit ~= 151MB"), then:
- 35% of 432MB = 151MB ceiling
- 191MB sidecar > 151MB ceiling → REJECTED → fallback to architecture-graph (59MB)

The math in the prompt is correct. The comment in the code says "~134 MB" which implies 35% of 384MB, but `heap_size_limit` returns
... [+11343 chars truncated]
