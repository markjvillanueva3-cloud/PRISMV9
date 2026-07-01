---
type: "chat-session"
source: "claude-code-cli"
session_id: "732a6b5a-50ee-4199-990c-589ff5ab0df0"
title: "Review test additions for integrity. Grade PASS or FAIL. FILE: H:/prism/.claude/"
date: "2026-05-18"
first_ts: "2026-05-18T03:35:36.954Z"
last_ts: "2026-05-18T03:36:35.527Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-a6a63eb0a7fad9921.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review test additions for integrity. Grade PASS or FAIL. FILE: H:/prism/.claude/

> **claude-code-cli** | 2026-05-18 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-a6a63eb0a7fad9921.jsonl`

## Transcript

### User | 2026-05-18T03:35:36.954Z

Review test additions for integrity. Grade PASS or FAIL.

FILE: H:/prism/.claude/hooks/wiki-precheck-inject.test.mjs — read end-to-end.
SUBJECT: H:/prism/.claude/hooks/wiki-precheck-inject.mjs — the `prewarmEmbedModel` function (read it).

CONTEXT: WIKI-INJECT-MS0/U-WIM02 added `prewarmEmbedModel(spawnImpl = spawn)` — keeps the embed model resident via a throttled DETACHED spawn. The suite grew from 17 to 22 tests; 5 new `prewarmEmbedModel:` tests + the structural test expanded.

VERIFY (R9 — tests verify intent, not behavior):
- The 5 prewarm tests inject a FAKE spawn (records calls, returns `{unref(){}}`) so no real detached process is spawned. Confirm NO test path can spawn a real process — including the pre-existing `main()` integration tests (main() now calls prewarmEmbedModel() with the DEFAULT spawn). Is `PRISM_WIKI_PREWARM_DISABLE=1` reliably set for every main() test? Trace the env state across test order.
- Do the prewarm tests actually verify the spawn arguments (node binary, `-e`, the fetch JS containing the endpoint + model + keep_alive, detached:true, stdio:"ignore")?
- Is the throttle genuinely exercised — fresh-stamp-blocks vs expired-stamp-allows (via utimesSync)?
- Is the fail-safe test real (a throwing spawn → returns false, doesn't throw)?
- Each prewarm test toggles `PRISM_WIKI_PREWARM_DISABLE`. If a test fails mid-body before restoring it, does that leak and corrupt later tests? Is that risk real given test order (prewarm tests are last except the structural test)?
- The structural regression test — does it now pin the prewarm wiring (`prewarmEmbedModel();` call in main, `keep_alive: EMB_KEEP_ALIVE`)? Is it a real fail-on-revert oracle?
- Any test that would still pass against a reverted/broken prewarm implementation?

Report P0/P1 with line numbers. End with: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-05-18T03:35:42.506Z

I'll read both files and verify the test integrity for `prewarmEmbedModel`.

### Assistant | 2026-05-18T03:35:42.682Z

[tool_use: Read]

### Assistant | 2026-05-18T03:35:42.701Z

[tool_use: Read]

### User | 2026-05-18T03:35:43.433Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\wiki-precheck-inject.mjs' was already read 8s ago in this session and is unchanged (mtime 1779075182417). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T03:35:43.897Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wiki-precheck-inject.test.mjs — node:test suite for wiki-precheck-inject.mjs.
4	 *
5	 * Primary coverage: the WIKI-INJECT-MS0 embeddings-staleness guard
6	 * (embeddingStaleness / staleFooterNote / the embStale wiring through
7	 * semanticFallback → main → logMiss). Also pins the BM25/boost matched path so
8	 * the guard edits can't silently break the happy path.
9
... [+13269 chars truncated]

### Assistant | 2026-05-18T03:35:46.674Z

Good, I have the test file. Now let me search for the hook implementation to verify the wiring:

### Assistant | 2026-05-18T03:35:47.023Z

[tool_use: Grep]

### User | 2026-05-18T03:35:51.349Z

[tool_result] Found 1 file
.claude\hooks\wiki-precheck-inject.mjs

### Assistant | 2026-05-18T03:35:56.342Z

Let me read the hook file directly with offset to see the prewarm implementation:

### Assistant | 2026-05-18T03:35:56.527Z

[tool_use: Read]

### User | 2026-05-18T03:35:58.961Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+28254 chars truncated]

### Assistant | 2026-05-18T03:36:01.621Z

Let me continue reading the hook file to see the end and the export:

### Assistant | 2026-05-18T03:36:02.207Z

[tool_use: Read]

### User | 2026-05-18T03:36:03.202Z

[tool_result] 500	  });
501	  const footer = "_Query \`/wiki-query <name>\` for full entry. Don't re-derive what the wiki already documents._";
502	  return out({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: capInjection(header, entryLines, footer, MAX_INJECT_BYTES) } });
503	}
504	
505	// out() returns the emitted object so main() is assertable in-process by tests.
506	function o
... [+669 chars truncated]

### Assistant | 2026-05-18T03:36:05.286Z

Perfect. Now I'll analyze the test suite against the wiring. Let me check the specific test code paths:

### Assistant | 2026-05-18T03:36:05.996Z

[tool_use: Grep]

### User | 2026-05-18T03:36:07.228Z

[tool_result] 48:process.env.PRISM_WIKI_INDEX = P.index;
49:process.env.PRISM_WIKI_LEAF_INDEX = P.leaf;
50:process.env.PRISM_WIKI_EMB_INDEX = P.emb;
51:process.env.PRISM_WIKI_MISSES_LOG = P.misses;
52:process.env.PRISM_WIKI_CACHE_DIR = P.cache;
53:process.env.PRISM_WIKI_TELEMETRY = P.tele;
54:delete process.env.PRISM_WIKI_PRECHECK;            // ensure not disabled
55:delete process.env.PRISM_WIKI_EMB_STALE_HOU
... [+733 chars truncated]

### Assistant | 2026-05-18T03:36:35.527Z

Now I'll analyze the test suite comprehensively against the requirements.

## Analysis

### R9 Verification (Tests Verify Intent, Not Behavior)

**CRITICAL FINDING — P0: Test Environment Leakage Across Test Boundaries**

Lines 186-245 show a **REAL race condition** in the test suite:

1. **Line 57 (fixture setup)**: `process.env.PRISM_WIKI_PREWARM_DISABLE = "1"` — disables prewarm for the entire suite
2. **Line 187 (test 1)**: `process.env.PRISM_WIKI_PREWARM_DISABLE = "1"` — redundant set
3. **Line 195 (test 2)**: `delete process.env.PRISM_WIKI_PREWARM_DISABLE` — ENABLES prewarm
4. **Line 210 (test 2 cleanup)**: `process.env.PRISM_WIKI_PREWARM_DISABLE = "1"` — re-disables
5. **Line 214 (test 3)**: `delete process.env.PRISM_WIKI_PREWARM_DISABLE` — ENABLES prewarm
6. **Line 222 (test 3 cleanup)**: `process.env.PRISM_WIKI_PREWARM_DISABLE = "1"` — re-disables
7. **Line 226 (test 4)**: `delete process.env.PRISM_WIKI_PREWARM_DISABLE` — ENABLES prewarm
8. **Line 235 (test 4 cleanup)**: `process.env.PRISM_WIKI_PREWARM_DISABLE = "1"` — re-disables
9. **Line 239 (test 5)**: `delete process.env.PRISM_WIKI_PREWARM_DISABLE` — ENABLES prewarm
10. **Line 244 (test 5 cleanup)**: `process.env.PRISM_WIKI_PREWARM_DISABLE = "1"` — re-disables

**The leak:** If ANY prewarm test (lines 194-245) **fails mid-body** before reaching its cleanup line (210, 222, 235, 244), the env var remains in a DELETED state (prewarm ENABLED) for all subsequent tests. The main() integration tests at lines 149-181 would then execute `prewarmEmbedModel()` (line 427 in hook) **with the default spawn** — violating the no-real-detached-process contract.

**Line 248-257 (structural regression test):** Correctly pins the wiring via `readFileSync` source-code assertions. This test is **SAFE** — it doesn't set env vars and runs last. It is a real fail-on-revert oracle.

### Verification Against R9 Criteria

**✓ Fake spawn injection:** Tests 2-5 inject a fake spawn that records calls. ✓ Returns `{unref(){}}` mock. ✓ 
... [+6225 chars truncated]
