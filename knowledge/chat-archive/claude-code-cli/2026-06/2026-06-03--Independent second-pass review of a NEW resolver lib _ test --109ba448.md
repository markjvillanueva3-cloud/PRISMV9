---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Independent second-pass review of a NEW resolver lib + test (slot:sierra, PRISM "
date: "2026-06-03"
first_ts: "2026-06-03T02:51:09.730Z"
last_ts: "2026-06-03T02:51:58.202Z"
cwd: "H:\\prism-slot-sierra"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a118facd609ac029d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Independent second-pass review of a NEW resolver lib + test (slot:sierra, PRISM 

> **claude-code-cli** | 2026-06-03 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a118facd609ac029d.jsonl`

## Transcript

### User | 2026-06-03T02:51:09.730Z

Independent second-pass review of a NEW resolver lib + test (slot:sierra, PRISM node-direct navigation). Read both END-TO-END. Grade PASS/FAIL with P0/P1/P2/P3. Don't assume a first reviewer caught anything. Do NOT edit.

## Files
1. H:/prism/scripts/lib/code-path-resolver.mjs  (exports: resolveCodePath, idTail, __test)
2. H:/prism/scripts/lib/code-path-resolver.test.mjs

## Context
This resolver (name/label/id-tail → source file path via CODE_SYSTEM_INDEX.json) is step 1 of a 4-step plan; steps 2-3 will wire it into two hot hooks (viz-first-redirect, master-index-precheck) to emit `Read: <path>`. So this lib must be ROBUST and fail-soft — it runs inside PreToolUse/UserPromptSubmit hooks on a tight budget. An exception or wrong path here degrades every search across the fleet.

## Weight toward what correctness-only misses
- **Hot-path safety**: this is imported by hooks that fire ~1000s×/day. Is the mtime-cached load O(1) on the steady path (no re-parse per call)? Any unbounded work? Could a huge/odd CODE_SYSTEM_INDEX cause a perf cliff? Confirm it never loads the 685MB system-graph (it only reads the ~small CODE_SYSTEM_INDEX.json).
- **The "never emit a wrong path" invariant** is the whole safety story (a wrong `Read: <path>` actively misleads the model — worse than no path). Pressure-test every way a wrong path could escape: cross-map precedence, case-folding collisions, a node whose label coincidentally matches an unrelated code name, partial/substring matches (does it ever do a substring/fuzzy match? it must be EXACT-key only).
- **Convention/idiom**: matches the sibling mtime-cache pattern in master-index-precheck-inject.mjs:62-73? Reasonable knob naming (PRISM_CODE_SYSTEM_INDEX_PATH)? Export surface minimal?
- **Test honesty (R9/R12)**: the real-data test gates the id-tail assertion to dot-free basenames — read the justification comment; is it legitimate or is it papering over a resolver limitation that step 2/3 consumers will hit (i.e., will real find-cache 
... [+627 chars truncated]

### Assistant | 2026-06-03T02:51:23.870Z

I'll review both files end-to-end. Let me read them.

### Assistant | 2026-06-03T02:51:24.342Z

[tool_use: Read]

### Assistant | 2026-06-03T02:51:24.738Z

[tool_use: Read]

### User | 2026-06-03T02:51:28.621Z

[tool_result] 1	// code-path-resolver.mjs — resolve a PRISM node's name / label / id-tail to its
2	// SOURCE FILE PATH via the canonical CODE_SYSTEM_INDEX.json.
3	//
4	// SYSTEM-VIZ / U-SV-CODE-PATH-RESOLVER (sierra, node-direct-navigation).
5	//
6	// WHY: the node-direct-navigation surfaces (viz-first-redirect EXACT-MATCH banner,
7	// master-index-precheck inject) already tell the model "the graph knows X" but
... [+5668 chars truncated]

### User | 2026-06-03T02:51:29.049Z

[tool_result] 1	// code-path-resolver.test.mjs — proves the resolver actually resolves real nodes
2	// (the R12 "not a no-op" gate, per synthesis wf_7fae44ef-d77) + deterministic
3	// collision / fail-soft behavior.
4	//
5	// Two layers:
6	//   1. REAL-DATA: a deterministic 50-entry spread of the LIVE CODE_SYSTEM_INDEX is
7	//      resolved by basename + id-tail form; asserts ≥90% resolve AND 100% correct
8	// 
... [+7660 chars truncated]

### Assistant | 2026-06-03T02:51:31.376Z

Now let me verify key claims against the real data and the sibling convention.

### Assistant | 2026-06-03T02:51:32.792Z

[tool_use: Read]

### Assistant | 2026-06-03T02:51:35.847Z

[tool_use: Bash]

### User | 2026-06-03T02:51:35.862Z

[tool_result] 55	// matter, capped to bound stage-1 cost.
56	const STAGE1_K = Math.min(30, Math.max(TOP_K, TOP_K * 5));
57	const DSL_EMIT = process.env.PRISM_MASTER_INDEX_DSL_EMIT !== "0";
58	
59	// CODE_SYSTEM_INDEX.json reverse-lookup (SYSTEM-VIZ-DSL-MS0).
60	// 12,772 codes including AC/SK/ML/FM/GH from supplementary extraction.
61	// mtime-cached — peer regen of the index invalidates automatically.
62	const
... [+1019 chars truncated]

### User | 2026-06-03T02:51:40.116Z

[tool_result] total code entries: 4180
sample entry: {"code":"E0001","path":"src/engines/AHPEngine.ts","name":"AHP","category":"E"}
file bytes: 943494
top keys: [ '_meta', 'categories', 'codes', 'reverse' ]
first 3 keys: [ 'E0001', 'E0002', 'E0003' ]

### Assistant | 2026-06-03T02:51:43.401Z

The shape claims check out: `{code, path, name, category}`, `name` is suffix-stripped ("AHP"), 4180 entries, file is ~921 KB (small — confirms it never touches the 685MB graph). The sibling mtime-cache pattern matches (lines 62-73). Let me verify the collision counts and pressure-test the "wrong path" invariant against real data.

### Assistant | 2026-06-03T02:51:54.186Z

[tool_use: Bash]

### User | 2026-06-03T02:51:58.202Z

[tool_result] byName keys: 3711 ambiguous: 31
byBase keys: 3739 ambiguous: 3
CROSS-MAP CONFLICTS (clean name & clean basename -> different paths): 0
[]
