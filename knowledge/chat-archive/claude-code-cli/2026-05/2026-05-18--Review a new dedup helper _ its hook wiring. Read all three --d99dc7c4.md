---
type: "chat-session"
source: "claude-code-cli"
session_id: "d99dc7c4-f4b8-4951-8139-7614d2ab529b"
title: "Review a new dedup helper + its hook wiring. Read all three files END-TO-END. FI"
date: "2026-05-18"
first_ts: "2026-05-18T02:50:23.812Z"
last_ts: "2026-05-18T02:52:00.029Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/d99dc7c4-f4b8-4951-8139-7614d2ab529b/subagents/agent-a4084d86d61df06f8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Review a new dedup helper + its hook wiring. Read all three files END-TO-END. FI

> **claude-code-cli** | 2026-05-18 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d99dc7c4-f4b8-4951-8139-7614d2ab529b/subagents/agent-a4084d86d61df06f8.jsonl`

## Transcript

### User | 2026-05-18T02:50:23.812Z

Review a new dedup helper + its hook wiring. Read all three files END-TO-END.

FILES:
1. H:/prism/scripts/lib/loop-inject-dedup.mjs — the helper
2. H:/prism/scripts/lib/loop-inject-dedup.test.mjs — 26 node:test cases, all passing
3. H:/prism/.claude/hooks/goal-prereq-inject.mjs — the consumer hook (dedup wired into main(), ~lines 205-225)

CONTRACT: `loop-inject-dedup.mjs` is a session-scoped dedup for UserPromptSubmit context injection. `recordAndCheck({sessionId, hookName, content, cacheDir, now})` returns `{suppress, pointer, reason, digest}`. It normalizes volatile tokens (timestamps/ages/iter/hashes), sha1-digests, and compares to a per-(session,hook) record in a cache file under state/shared/.loop-inject-cache/. It suppresses (returns a compact pointer) IFF the normalized digest is non-empty AND byte-equal to a prior fire AND that prior fire is within MAX_SUPPRESS_AGE_MS (20min — older priors may have been evicted by /compact, so re-emit). `goal-prereq-inject.mjs` calls it: if `suppress`, it emits the pointer instead of the full /goal pre-flight panel. Kill-knob: PRISM_LOOP_INJECT_DEDUP_DISABLE=1.

CRITICAL — this hook fires fleet-wide on every /goal-containing prompt. The design intent is FAIL-OPEN: a dedup fault must ONLY ever emit the FULL panel, never wrongly suppress (which = quality loss). VERIFY:
- Is the fail-open guarantee actually airtight? Trace every throw/error path in recordAndCheck and the hook's try/catch. Can suppress=true ever be returned wrongly?
- The /compact eviction risk: MAX_SUPPRESS_AGE_MS=20min bounds it. Is 20min sound? Can a suppressed pointer ever point at content no longer in context within the window?
- Cache: atomic write (temp+rename)? Concurrent fires from the same session? Cache-key sanitization (cachePath) — path traversal via a hostile sessionId?
- normalize() — KEEP-IN-SYNC comment with loop-inject-cost-audit.mjs. Does over/under-strip risk a wrong suppression?
- The hook edit: import path `../../scripts/lib/loop-inject-de
... [+246 chars truncated]

### Assistant | 2026-05-18T02:50:32.185Z

I'll review all three files end-to-end.

### Assistant | 2026-05-18T02:50:32.525Z

[tool_use: Read]

### Assistant | 2026-05-18T02:50:32.714Z

[tool_use: Read]

### Assistant | 2026-05-18T02:50:32.820Z

[tool_use: Read]

### User | 2026-05-18T02:50:36.042Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-inject-dedup.mjs — session-scoped dedup for UserPromptSubmit context
4	 * injection. When a hook would inject the SAME content it already injected
5	 * earlier in this session (after volatile-token normalization), the hook emits
6	 * a compact pointer instead — the model already holds the block.
7	 *
8	 * FOXTROT-WORK 2026-05-18 — realizes the loop-context ded
... [+6441 chars truncated]

### User | 2026-05-18T02:50:36.097Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * goal-prereq-inject.mjs — UserPromptSubmit hook for /goal awareness.
5	 *
6	 * Complements the existing Stop-hook goal-complete-gate.mjs by surfacing pre-flight
7	 * status BEFORE the user types /goal complete:
8	 *   - CLOSE-OUT-CANDIDATES freshness (Stop gate requires <2h)
9	 *   - sibling-unit status in the same milestone (you said "goal complete" b
... [+11012 chars truncated]

### User | 2026-05-18T02:50:36.105Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for loop-inject-dedup.mjs — session-scoped injection dedup.
4	 * Run: node --test scripts/lib/loop-inject-dedup.test.mjs
5	 */
6	import { describe, it, before, after } from "node:test";
7	import assert from "node:assert/strict";
8	import fs from "node:fs";
9	import os from "node:os";
10	import path from "node:path";
11	import {
12	  normalize,
13	  digest,
14
... [+7690 chars truncated]

### Assistant | 2026-05-18T02:50:38.837Z

Let me check the KEEP-IN-SYNC counterpart `normalize()` in the cost-audit file.

### Assistant | 2026-05-18T02:50:40.279Z

[tool_use: Bash]

### User | 2026-05-18T02:50:46.758Z

[tool_result] FILE-OR-FN-NOT-FOUND

### Assistant | 2026-05-18T02:50:50.782Z

[tool_use: Bash]

### User | 2026-05-18T02:50:56.133Z

[tool_result] H:/prism/scripts/loop-inject-cost-audit.mjs  17.8K
---
H:/prism/scripts/lib/loop-inject-dedup.mjs:9: * scripts/loop-inject-cost-audit.mjs (commit f88cc94705): a /loop re-injects
H:/prism/scripts/lib/loop-inject-dedup.mjs:41: * KEEP-IN-SYNC with normalize() in scripts/loop-inject-cost-audit.mjs.
H:/prism/scripts/loop-inject-cost-audit.mjs:3: * loop-inject-cost-audit.mjs — empirical per-/loop-iterat
... [+290 chars truncated]

### Assistant | 2026-05-18T02:51:00.099Z

[tool_use: Grep]

### User | 2026-05-18T02:51:02.868Z

[tool_result] 127:export function normalize(t) {
128-  return String(t == null ? "" : t)
129-    .replace(\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, "<TS>")
130-    .replace(/\d{4}-\d{2}-\d{2}/g, "<DATE>")
131-    .replace(\b\d+(?:\.\d+)?(?:ms|hr|min|sec|[smhd])\b\s*(?:old|ago)?/gi, "<AGE>")
132-    .replace(\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<TIME>")
133-    .replace(\biter(?:ation)?\s*#?\d+/gi, "iter<N>")
134-    .replace(
... [+348 chars truncated]

### Assistant | 2026-05-18T02:51:05.766Z

The two `normalize()` functions are byte-identical (the `\` rendering above is a Grep display artifact — same regexes). KEEP-IN-SYNC holds.

Now let me verify the import path resolves correctly.

### Assistant | 2026-05-18T02:51:10.311Z

[tool_use: Bash]

### User | 2026-05-18T02:51:15.190Z

[tool_result] IMPORT-OK function

### Assistant | 2026-05-18T02:52:00.029Z

Import path resolves: `.claude/hooks/` + `../../scripts/lib/` → `H:/prism/scripts/lib/loop-inject-dedup.mjs`. Correct.

Now the deep trace.

## Review: loop-inject-dedup helper + hook wiring

### Fail-open guarantee — AIRTIGHT

Traced every path in `recordAndCheck`:
- The entire body is wrapped in `try{}catch{}` → `catch` returns hard-coded `{suppress:false, ...}`.
- `suppress=true` is set in exactly one place (line 135), gated by `decision.suppress` from the pure `decideDedup`.
- `decideDedup` returns `suppress:true` only when `curDigest` truthy AND `prev.digest===curDigest` AND within window. All four guard clauses precede it.
- Cache I/O (`readCache`, `mkdirSync`, `writeFileSync`, `renameSync`, `pruneOldCaches`) all happen **after** the suppress-and-return at line 137 — a write fault cannot flip an already-`false` result to `true`, and on a suppress-hit no writes occur at all. A throw anywhere lands in the outer catch → `false`.
- Hook side: `import()` + `recordAndCheck` wrapped in `try{}catch{}` → `additionalContext` stays `ctx`. `sid` falsiness checked before the call.

The fail-open contract holds. `suppress=true` cannot be returned wrongly.

### /compact eviction — sound, no P0/P1

`MAX_SUPPRESS_AGE_MS=20min`. On a hit, line 137 deliberately does **not** slide `ts` ("keep the original cache record"). This is correct: the window is anchored to the *original* injection, so a long /loop cannot keep a pointer alive indefinitely chained off stale content. Worst case: content injected at T, suppressed at T+19:59, then /compact at T+20:00 evicts it — the model lost the block but the pointer was already emitted. This is a real but **bounded and accepted** risk; the design doc names it. 20min is a reasonable conservative bound for compact cadence. **PASS** — though see P2 below.

### Cache safety

- **Atomic write**: temp+rename present (lines 143-145). `renameSync` is atomic on same volume; tmp is in `dir` so same-volume. Good.
- **Concurrent fires same session**: tm
... [+4739 chars truncated]
