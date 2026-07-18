---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "Review a NEW shared resolver lib + its test (slot:sierra, PRISM). Read both END-"
date: "2026-06-03"
first_ts: "2026-06-03T02:50:41.593Z"
last_ts: "2026-06-03T02:51:56.623Z"
cwd: "H:\\prism-slot-sierra"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a07887c9d540b86e4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review a NEW shared resolver lib + its test (slot:sierra, PRISM). Read both END-

> **claude-code-cli** | 2026-06-03 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a07887c9d540b86e4.jsonl`

## Transcript

### User | 2026-06-03T02:50:41.593Z

Review a NEW shared resolver lib + its test (slot:sierra, PRISM). Read both END-TO-END. Grade PASS/FAIL with P0/P1/P2/P3. Do NOT edit.

## Files
1. H:/prism/scripts/lib/code-path-resolver.mjs
2. H:/prism/scripts/lib/code-path-resolver.test.mjs

## What it does
The load-bearing root of a node-direct-navigation fix. PRISM's pre-search hooks (viz-first-redirect EXACT-MATCH banner, master-index-precheck) currently surface a node label + synthetic id but never a FILE PATH, so the model still Grep/Globs for the file. This resolver maps a node's name/label/id-tail → its source file path via the canonical CODE_SYSTEM_INDEX.json (`codes`: 4180 `{code,path,name}` entries) so the hooks can emit `Read: <path>`. It is consumer-side: NO find-cache producer change (the path is recomputable here, unlike noteCount whose source is dropped in slimming).

## Verified keying facts (from real data — confirm they hold)
- CODE_SYSTEM_INDEX `codes` entry: `{code:"E0001", path:"src/engines/AHPEngine.ts", name:"AHP", category:"E"}` — `name` is SUFFIX-STRIPPED ("AHP"); path-basename is "AHPEngine".
- find-cache engine node: label="StochasticWrapperEngine" (= basename), id="eng.stochastic.stochasticwrapperengine" (tail = lowercased basename).
- So the resolver builds byName (lowercased name) + byBasename (lowercased path-leaf-no-ext) and tries name-then-basename on raw input + id-tail.

## Scrutinize hard (real bugs, not style)
- **Correctness of resolution**: does name-then-basename precedence ever emit a WRONG path? Consider a stripped-name key colliding with a different file's basename across the two maps (byName precedence wins) — is that handled / acceptable? The INVARIANT is "never emit a path we are not certain of."
- **Ambiguity refusal**: a basename/name mapping to ≥2 distinct paths is marked AMBIGUOUS → resolve returns null. Verify the `put()` collision logic is correct (first entry stored, second DISTINCT path → AMBIGUOUS, second SAME path → stays). Verify resolveCodePath returns nul
... [+1327 chars truncated]

### Assistant | 2026-06-03T02:50:53.487Z

I'll review both files end-to-end. Let me read them.

### Assistant | 2026-06-03T02:50:53.969Z

[tool_use: Read]

### Assistant | 2026-06-03T02:50:54.294Z

[tool_use: Read]

### User | 2026-06-03T02:51:14.326Z

[tool_result] 1	// code-path-resolver.mjs — resolve a PRISM node's name / label / id-tail to its
2	// SOURCE FILE PATH via the canonical CODE_SYSTEM_INDEX.json.
3	//
4	// SYSTEM-VIZ / U-SV-CODE-PATH-RESOLVER (sierra, node-direct-navigation).
5	//
6	// WHY: the node-direct-navigation surfaces (viz-first-redirect EXACT-MATCH banner,
7	// master-index-precheck inject) already tell the model "the graph knows X" but
... [+5668 chars truncated]

### User | 2026-06-03T02:51:14.342Z

[tool_result] 1	// code-path-resolver.test.mjs — proves the resolver actually resolves real nodes
2	// (the R12 "not a no-op" gate, per synthesis wf_7fae44ef-d77) + deterministic
3	// collision / fail-soft behavior.
4	//
5	// Two layers:
6	//   1. REAL-DATA: a deterministic 50-entry spread of the LIVE CODE_SYSTEM_INDEX is
7	//      resolved by basename + id-tail form; asserts ≥90% resolve AND 100% correct
8	// 
... [+7660 chars truncated]

### Assistant | 2026-06-03T02:51:17.236Z

Now let me verify the keying facts against real data. Let me inspect the actual CODE_SYSTEM_INDEX.json structure and check the cross-map collision concern (a name colliding with a different file's basename).

### Assistant | 2026-06-03T02:51:19.625Z

[tool_use: Bash]

### User | 2026-06-03T02:51:26.076Z

[tool_result] total code entries: 4180 with path: 3742
sample: {"code":"E0001","path":"src/engines/AHPEngine.ts","name":"AHP","category":"E"}
entry keys: code,path,name,category

### Assistant | 2026-06-03T02:51:29.560Z

The doc comment claims "4,149" entries but real data shows 4180 total / 3742 with path. Minor doc drift. Now let me test the critical cross-map collision concern: a `byName` key that wins precedence but points to a different path than a `byBase` key of the same string would point to.

### Assistant | 2026-06-03T02:51:36.170Z

[tool_use: Bash]

### User | 2026-06-03T02:51:40.144Z

[tool_result] CROSS-MAP (name nonamb vs base nonamb, DIFFERENT path): 0

### Assistant | 2026-06-03T02:51:43.370Z

Zero cross-map collisions in real data right now. But the concern in the prompt is whether the *resolver* would silently emit a wrong path if such a collision existed. Let me reason about this with a constructed case and also check whether the threshold/sample math is honest.

### Assistant | 2026-06-03T02:51:46.878Z

[tool_use: Bash]

### User | 2026-06-03T02:51:53.605Z

[tool_result] all.length 3742 step 74 sample.length 50
dotted-basename samples (id-tail assert skipped): 17
   src/__tests__/BooleanKernelEngine.test.ts
   src/__tests__/OperationSequencerEngine.test.ts
   src/__tests__/advanced-reporting.test.ts
   src/__tests__/batch62-engines.test.ts
   src/__tests__/box-ms8-mill-wedm.test.ts
   src/__tests__/context-preloader-engine.test.ts
   src/__tests__/dfm-pipeline-eng
... [+167 chars truncated]

### Assistant | 2026-06-03T02:51:56.623Z

Now let me verify the actual behavior of the resolver on the real index — does it actually hit ≥45/50, and critically, is the test's "≥90% resolve" claim honest given that 17/50 are dotted test files? Let me run the actual resolver and also probe the within-`byBase` collision (test files with same basename across dirs) and the `idTail` precedence edge case.
