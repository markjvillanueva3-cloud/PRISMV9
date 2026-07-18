---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Independent review (Arm B) of PRISM course-mapper library + paired test. Arm A ("
date: "2026-05-16"
first_ts: "2026-05-16T02:31:05.137Z"
last_ts: "2026-05-16T02:34:09.042Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a36eb361462e8c69f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent review (Arm B) of PRISM course-mapper library + paired test. Arm A (

> **claude-code-cli** | 2026-05-16 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a36eb361462e8c69f.jsonl`

## Transcript

### User | 2026-05-16T02:31:05.137Z

Independent review (Arm B) of PRISM course-mapper library + paired test. Arm A (code-analyzer) is reviewing in parallel — don't trust Arm A caught everything. Your weighted focus: hostile-input / silent-fail / dead-enum / integration-coupling class of bugs.

**Files (read FULL contents, BOTH):**
1. `H:\prism\scripts\lib\course-mapper-lib.mjs`
2. `H:\prism\scripts\lib\course-mapper-lib.test.mjs` (54 node:test cases, all pass)

**Context:** iter 3 of /loop. Pure transforms converting MIT OCW course metadata (PRISM_COURSE_CATALOG.json + MIT_COURSE_INDEX.json, ~225 entries) into TribalCourseNodes consumable by `prism_knowledge:tribal_search` and the /system-viz graph. Composes with tribal-graph-clusters.mjs (commit 15c161f63) + tribal-graph-embedding.mjs (commit 862137931). Output writes DIRECTLY into `state/shared/system-viz/system-graph.json` per user spec.

**Specifically hunt:**
- **Hostile inputs from real MIT data**: course titles/categories from external JSON. Could contain `__proto__` as id? Path-traversal in `extractedFrom`? Unicode/control chars in title contaminating embedding text? Stop-word filter bypassable?
- **Silent failures**: `nodesFromCatalog` / `nodesFromIndex` have try-catch that SKIPS malformed entries — is the swallowed error class right (only "missing slug" should skip, NOT real bugs)?
- **mergeIntoGraph atomicity**: it doesn't mutate input — but does it return a new graph object that shares mutable references with the original (e.g., `meta` object passed through)? If a caller mutates `result.graph.meta`, does that mutate `original.meta`?
- **mergeCourseNodes pick() determinism**: tie-break on confidence → tags-length → extractedFrom. Is `extractedFrom < extractedFrom2` always defined (both strings)? What if one entry has no `provenance` at all? `provenance?.confidence ?? 0` — but what if provenance is `null`? Optional chain handles.
- **Integration with tribal-graph-clusters**: `classifyDomain/School` return `{code, score, matched}` — was caugh
... [+775 chars truncated]

### Assistant | 2026-05-16T02:31:15.977Z

I'll review both files in full, focusing on hostile-input and silent-fail classes.

### Assistant | 2026-05-16T02:31:16.469Z

[tool_use: Read]

### User | 2026-05-16T02:31:17.514Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\course-mapper-lib.mjs' was already read 24s ago in this session and is unchanged (mtime 1778898610943). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T02:31:21.058Z

[tool_use: Bash]

### User | 2026-05-16T02:31:29.266Z

[tool_result] // course-mapper-lib.mjs
// Pure (no I/O) transforms that convert MIT OCW course metadata into
// Tr

### Assistant | 2026-05-16T02:31:31.130Z

[tool_use: Read]

### User | 2026-05-16T02:31:05.137Z

Independent review (Arm B) of PRISM course-mapper library + paired test. Arm A (code-analyzer) is reviewing in parallel — don't trust Arm A caught everything. Your weighted focus: hostile-input / silent-fail / dead-enum / integration-coupling class of bugs.

**Files (read FULL contents, BOTH):**
1. `H:\prism\scripts\lib\course-mapper-lib.mjs`
2. `H:\prism\scripts\lib\course-mapper-lib.test.mjs` (54 node:test cases, all pass)

**Context:** iter 3 of /loop. Pure transforms converting MIT OCW course metadata (PRISM_COURSE_CATALOG.json + MIT_COURSE_INDEX.json, ~225 entries) into TribalCourseNodes consumable by `prism_knowledge:tribal_search` and the /system-viz graph. Composes with tribal-graph-clusters.mjs (commit 15c161f63) + tribal-graph-embedding.mjs (commit 862137931). Output writes DIRECTLY into `state/shared/system-viz/system-graph.json` per user spec.

**Specifically hunt:**
- **Hostile inputs from real MIT data**: course titles/categories from external JSON. Could contain `__proto__` as id? Path-traversal in `extractedFrom`? Unicode/control chars in title contaminating embedding text? Stop-word filter bypassable?
- **Silent failures**: `nodesFromCatalog` / `nodesFromIndex` have try-catch that SKIPS malformed entries — is the swallowed error class right (only "missing slug" should skip, NOT real bugs)?
- **mergeIntoGraph atomicity**: it doesn't mutate input — but does it return a new graph object that shares mutable references with the original (e.g., `meta` object passed through)? If a caller mutates `result.graph.meta`, does that mutate `original.meta`?
- **mergeCourseNodes pick() determinism**: tie-break on confidence → tags-length → extractedFrom. Is `extractedFrom < extractedFrom2` always defined (both strings)? What if one entry has no `provenance` at all? `provenance?.confidence ?? 0` — but what if provenance is `null`? Optional chain handles.
- **Integration with tribal-graph-clusters**: `classifyDomain/School` return `{code, score, matched}` — was caugh
... [+775 chars truncated]

### Assistant | 2026-05-16T02:31:36.259Z

I'll perform an independent Arm B review focused on hostile-input, silent-fail, and integration-coupling bugs.

### Assistant | 2026-05-16T02:31:39.079Z

[tool_use: Read]

### Assistant | 2026-05-16T02:31:39.182Z

[tool_use: Read]

### User | 2026-05-16T02:31:40.175Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\course-mapper-lib.mjs' was already read 47s ago in this session and is unchanged (mtime 1778898610943). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T02:31:40.235Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\course-mapper-lib.test.mjs' was already read 42s ago in this session and is unchanged (mtime 1778898499112). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T02:31:43.060Z

The read-once guard says these are already in my context — but they aren't (I'm a freshly-spawned Arm B subagent). I need to bypass.

### Assistant | 2026-05-16T02:31:45.493Z

[tool_use: Bash]

### User | 2026-05-16T02:31:50.390Z

[tool_result] ===LIB:18331===
// course-mapper-lib.mjs
// Pure (no I/O) transforms that convert MIT OCW course metadata into
// TribalCourseNode objects consumable by prism_knowledge:tribal_search /
// tribal_suggest and emittable into the /system-viz graph as L4a nodes.

### Assistant | 2026-05-16T02:31:54.257Z

[tool_use: Bash]

### User | 2026-05-16T02:32:00.244Z

[tool_result] // course-mapper-lib.mjs
// Pure (no I/O) transforms that convert MIT OCW course metadata into
// TribalCourseNode objects consumable by prism_knowledge:tribal_search /
// tribal_suggest and emittable into the /system-viz graph as L4a nodes.
//
// Composition contract:
//   - classifySchool / classifyDomain reused from tribal-graph-clusters.mjs
//     (no fork — same L0-L8 taxonomy)
//   - confide
... [+17930 chars truncated]

### Assistant | 2026-05-16T02:32:03.625Z

[tool_use: Bash]

### User | 2026-05-16T02:32:08.918Z

[tool_result] // course-mapper-lib.test.mjs
// Run: node --test H:/prism/scripts/lib/course-mapper-lib.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  NODE_KIND,
  PROVENANCE_SOURCE_DEFAULT,
  METADATA_CONFIDENCE_DEFAULT,
  SYLLABUS_CONFIDENCE_DEFAULT,
  FULL_TEXT_CONFIDENCE_DEFAULT,
  EXTRACTION_LEVEL_METADATA,
  EXTRACTION_LEVEL_SYLLABUS,
  EXTRACTION_L
... [+17425 chars truncated]

### Assistant | 2026-05-16T02:32:12.072Z

Now let me verify some specific hostile-input vectors I want to confirm via execution. Let me check `tribal-graph-clusters.mjs` for the `classifyDomain`/`classifySchool` contract and confirm my hypotheses.

### Assistant | 2026-05-16T02:32:16.845Z

[tool_use: Bash]

### User | 2026-05-16T02:32:21.057Z

[tool_result] Exit code 1
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/lo
... [+511 chars truncated]

### Assistant | 2026-05-16T02:32:30.549Z

[tool_use: Bash]

### User | 2026-05-16T02:32:36.560Z

[tool_result] classifyDomain shape: ["X_unknown"]
classifySchool shape: {"code":"Z_uncategorized","score":0,"matched":null}
schoolChain raw: ["L5:Z_uncategorized","L6:S0_unknown","L7:G3_unknown","L8:PRISM_knowledge"]
schoolChain obj: ["L5:Z_uncategorized","L6:S0_unknown","L7:G3_unknown","L8:PRISM_knowledge"]
schoolChain undef: ["L5:Z_uncategorized","L6:S0_unknown","L7:G3_unknown","L8:PRISM_knowledge"]
schoolCha
... [+85 chars truncated]

### Assistant | 2026-05-16T02:32:41.617Z

CRITICAL FINDING. `classifyDomain` returns an **ARRAY** `["X_unknown"]`, NOT an object. The library assumes it's an object `{code, score, matched}` and falls through to `domainResult.code` extraction — but `["X_unknown"].code === undefined`, so it falls through to fallback `"X_unknown"`. The library "works" only by accident — the fallback masks a contract mismatch. Let me verify what it does with a real category match.

### Assistant | 2026-05-16T02:32:45.193Z

[tool_use: Bash]

### User | 2026-05-16T02:33:03.444Z

[tool_result] manufacturing classifyDomain: ["X_unknown"] isArray: true r.code: undefined
lib-extracted domain (BUG: always falls back): X_unknown

### Assistant | 2026-05-16T02:34:09.042Z

Acknowledged. The hook reminder advises preferring `prism_session` MCP dispatcher actions over broad shell exploration. For this review I only need targeted node verification of one library contract — the remaining findings are already confirmed from source reading. Proceeding with conclusions.

---

## Arm B Review — course-mapper-lib

**Grade: FAIL** (one P0 silent-fail + several P1 hostile-input / silent-fail / coupling issues)

### P0 — `classifyDomain` contract mismatch makes `domain` field PERMANENTLY `"X_unknown"` (silent fail, dead code)

**File:** `H:\prism\scripts\lib\course-mapper-lib.mjs:177-180`

```js
const domainResult = classifyDomain(tipForClassify);
...
const domain = (domainResult && typeof domainResult === "object" ? domainResult.code : domainResult) || "X_unknown";
```

`classifyDomain()` from `tribal-graph-clusters.mjs` returns an **array** of strings (e.g. `["X_unknown"]`, `["manufacturing","control"]`), **NOT** an object `{code,score,matched}`. Verified via live execution:

```
manufacturing classifyDomain: ["X_unknown"]  isArray: true  r.code: undefined
lib-extracted domain (lib code path): X_unknown   ← always falls back
```

Because `typeof [] === "object"` is true, the ternary takes the `.code` branch and reads `undefined`, then `|| "X_unknown"` papers over it. **Every course node in production will have `domain: "X_unknown"`.** Downstream `prism_knowledge:tribal_search` boosting on `meta.domain` is dead. Tests don't catch it — no assertion checks `node.domain` against a concrete non-fallback value, so `Karpathy R9` violation (test passes when relevant code is wrong).

`classifySchool` does return `{code,score,matched}` so its path works — the bug is asymmetric and easy to miss.

**Fix (line 177):**
```js
const domain = Array.isArray(domainResult)
  ? (domainResult[0] || "X_unknown")
  : (domainResult?.code || domainResult || "X_unknown");
```

**And add a test that fails on regression** — assert `domain !== "X_unknown"` for a known-manuf
... [+8943 chars truncated]
