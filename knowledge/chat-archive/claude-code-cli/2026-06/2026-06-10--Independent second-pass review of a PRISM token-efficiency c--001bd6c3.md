---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Independent second-pass review of a PRISM token-efficiency change (slot:bravo). "
date: "2026-06-10"
first_ts: "2026-06-10T17:25:52.062Z"
last_ts: "2026-06-10T17:29:15.885Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-ac5e31db1891bceb9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent second-pass review of a PRISM token-efficiency change (slot:bravo). 

> **claude-code-cli** | 2026-06-10 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/agent-ac5e31db1891bceb9.jsonl`

## Transcript

### User | 2026-06-10T17:25:52.062Z

Independent second-pass review of a PRISM token-efficiency change (slot:bravo). Read end-to-end:
- H:/prism/.claude/hooks/tribal-by-domain-inject.mjs
- H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs
Context: H:/prism/scripts/lib/inject-throttle.mjs.

The change wires a per-session same-prompt throttle (shouldThrottleInject) into the tribal-by-domain UserPromptSubmit injector so a /loop re-submitting the identical prompt every tick stops re-running the rerank subprocess + Ollama embed (~3-4s, ~2KB) and re-injecting the same tribal block. Knob PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS (default 60000, 0=off, parsed via IIFE so "0" stays off). Placed before CAG + rerank. Uses this hook's approve()/tele() idiom. Mirrors the master-index commit shipped earlier this session.

Weight toward what a code-analyzer might MISS:
1. QUALITY tradeoff vs "without sacrificing quality": the throttle suppresses re-injection of tribal precontext for an IDENTICAL prompt within 60s. Could the tribal hits meaningfully change within 60s for the SAME prompt (e.g. the tribal-embed-index is rebuilt mid-session by a peer)? Is the loss acceptable / consistent with the sibling injectors that accept the same 60s tradeoff?
2. THROTTLE-BEFORE-CAG ordering: the throttle is before the CAG shouldSkip. On a throttled tick the CAG advisory is also suppressed. Correct (repeat noise) or does any consumer need the CAG advisory every tick? (shouldSkip is read-only — confirm.)
3. Stamp-on-no-hits: shouldThrottleInject stamps before runRerank. If tick-1 yields no hits (rerank fail / empty), the stamp is still written, so tick-2 is throttled. Harmless (both emit nothing)? Confirm no correctness issue.
4. IIFE knob parse: `parseInt(env ?? "", 10)` then `Number.isFinite(n) ? clamp(0,3600000,n) : 60000`. Verify: "0"->0 (off), unset->60000, "abc"->60000, "999999999"->3600000 (clamped), negative->0 (clamped). Any hole?
5. State-file hygiene across 26 slots: per-session files + atomic rename + GC (pruneStaleSes
... [+572 chars truncated]

### Assistant | 2026-06-10T17:25:57.403Z

I'll review this change end-to-end. Let me read the three files.

### Assistant | 2026-06-10T17:25:58.473Z

[tool_use: Read]

### Assistant | 2026-06-10T17:25:59.136Z

[tool_use: Read]

### Assistant | 2026-06-10T17:25:59.704Z

[tool_use: Read]

### User | 2026-06-10T17:26:01.285Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\inject-throttle.mjs' was already read 28m ago in this session and is unchanged (mtime 1780324216599). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T17:26:01.549Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+20952 chars truncated]

### User | 2026-06-10T17:26:01.861Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-by-domain-inject.test.mjs — hermetic node:test suite
3	//
4	// Pure-function tests for extractPrompt / inferTribalDomain /
5	// parseRerankOutput / formatInjection. No Ollama / no subprocess.
6	//
7	// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs
8	
9	import { describe, it } from "node:test";
10	import assert from "node:assert/strict";

... [+21509 chars truncated]

### Assistant | 2026-06-10T17:26:11.307Z

The inject-throttle.mjs content is in my context from the earlier read. Let me confirm I have its full content by checking the key functions referenced — `shouldThrottleInject`, `safeSessionId`, `promptHash`, `DEFAULT_STATE_DIR`, and `pruneStaleSessions`. Let me grep the file to verify the exact implementation of the load-bearing parts.

### Assistant | 2026-06-10T17:26:11.309Z

[tool_use: Read]

### User | 2026-06-10T17:26:13.188Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\inject-throttle.mjs' was already read 28m ago in this session and is unchanged (mtime 1780324216599). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T17:26:21.632Z

The read-once guard is blocking. Since I'm a fresh agent and the file isn't actually in my visible context, let me grep the key functions to verify the implementation details I need for findings 3, 4, and 5.

### Assistant | 2026-06-10T17:26:23.401Z

[tool_use: Grep]

### User | 2026-06-10T17:26:27.361Z

[tool_result] 22:export const DEFAULT_STATE_DIR = "H:/prism/mcp-server/data/state/inject-throttle";
23-\ GC horizon: a per-session file untouched longer than this is dead (the session
24-// ended / rotated on /compact) and is swept so the dir never grows unbounded — the
25-// repo's named per-session-file leak class (cf. tmp-orphan-janitor, juliett's 16GB).
26-export const DEFAULT_PRUNE_MS = 86_400_000;   // 24
... [+3409 chars truncated]

### Assistant | 2026-06-10T17:26:31.050Z

I now have the exact implementation of all load-bearing functions. Let me verify the `savePrev` atomic-write detail (lines 62-77) that the grep truncated, since it's relevant to the state-hygiene finding.

### Assistant | 2026-06-10T17:26:31.995Z

[tool_use: Read]

### User | 2026-06-10T17:26:36.175Z

[tool_result] 62	export function savePrev(path, rec, {
63	  writeImpl = writeFileSync, renameImpl = renameSync, mkdirImpl = mkdirSync,
64	  existsImpl = existsSync, stateDir = DEFAULT_STATE_DIR,
65	} = {}) {
66	  if (!path) return false;
67	  try {
68	    if (!existsImpl(stateDir)) mkdirImpl(stateDir, { recursive: true });
69	    const tmp = `${path}.tmp.${process.pid}`;
70	    writeImpl(tmp, JSON.stringify(rec
... [+440 chars truncated]

### Assistant | 2026-06-10T17:26:48.626Z

I now have everything needed. Let me work through each of the 7 review axes against the actual code.

**Verification of each axis:**

1. **Quality tradeoff** — The throttle suppresses re-injection for IDENTICAL prompt+session within 60s. The CLAUDE.md "Recent regressions" confirms the tribal-embed-index IS rebuilt mid-session by peers (the shard-transition clobber, auto-embed on wiki Write). But the throttle scope is per-session (`sessionId` + `promptHash`) — a peer rebuilding the index does not affect whether *this* session re-injects the same prompt. The loss is: within a 60s window, on the SAME prompt, if the index changed, the new hits are not surfaced. Identical 60s tradeoff to the sibling injectors. Acceptable.

2. **Throttle-before-CAG ordering** — On a throttled tick, the CAG advisory (`skipAdvisory`) is also suppressed (lines 335-339 return before 340-345). `shouldSkip` is read-only (it's a CAG-tier classifier consume). Confirmed below.

3. **Stamp-on-no-hits** — `shouldThrottleInject` stamps via `savePrev` BEFORE `runRerank` (line 335 stamps, line 353 reranks). So if tick-1 yields no hits, the stamp is written, and tick-2 is throttled. Both emit nothing → harmless. Confirmed.

4. **IIFE knob parse** — Walk the cases below.

5. **State-file hygiene** — Same lib as sibling; per-session files + atomic rename + GC. Confirmed below.

6. **Test honesty** — Two tests, walk below.

7. **Convention conformance** — Walk below.

Let me verify the one thing I cannot confirm without reading: that `shouldSkip` in cag-consume.mjs is genuinely read-only (no side-effect that a throttled tick would now skip).

### Assistant | 2026-06-10T17:26:49.700Z

[tool_use: Grep]

### User | 2026-06-10T17:26:55.197Z

[tool_result] 102:export function shouldSkip(skipKey, opts = {}) {
103-  if (process.env.PRISM_CAG_CONSUME_DISABLE === "1") {
104-    return { skip: false, reason: "disabled" };
105-  }
106-  // Env override for sidecarDir is the only way the in-process consumers
107-  // (called from inside settings.json-wired hook subprocesses, where opts
108-  // can't be passed) can be steered at a tmpdir for end-to-end tes
... [+960 chars truncated]

### Assistant | 2026-06-10T17:29:15.885Z

`shouldSkip` is confirmed read-only — it reads a sidecar file and returns a classification; no writes, no mark-consumed, no counter increment. A throttled tick suppressing the CAG path loses nothing stateful. The CAG advisory is just a *repeat* of the same "COLD-tier, skipping" notice that the operator already saw on tick-1 — pure repeat noise. Correct to suppress.

Now I have everything verified. Here is my independent second-pass review.

---

## VERDICT: PASS

No P0 or P1 findings. The change is correct, conventionally conformant, and the quality tradeoff is sound and consistent with its two sibling injectors. Findings below are P2/P3 (one real-but-acceptable behavioral note worth recording, plus two cosmetic).

---

### Axis-by-axis adversarial verdict

**1. Quality tradeoff vs "without sacrificing quality" — ACCEPTABLE (P2 note, not a defect)**

The throttle key is `(safeSessionId, promptHash)` (`inject-throttle.mjs:108-110`), scoped per-session. The CLAUDE.md "Recent regressions" confirm the tribal-embed-index genuinely *is* mutated mid-session by peers (auto-embed on wiki Write; the 2026-06-08 and 2026-06-10 shard/clobber incidents). So the theoretical worst case is real: within a 60s window, on a re-submitted IDENTICAL prompt, if a peer rebuilt the index between tick-1 and tick-2, tick-2 will not surface the changed hits.

Why this is acceptable, not a quality regression:
- The trigger condition is `/loop` re-submitting a byte-identical prompt within 60s. A human typing a new prompt produces a different `promptHash` → no throttle, fresh rerank. The suppression only ever hits the machine-driven repeat case the unit explicitly targets (`tribal-by-domain-inject.mjs:331-334`).
- The suppressed payload is *tribal precontext* — advisory ranking hints, not load-bearing physics or safety data. Worst case the loop tick reasons on 60s-stale tribal hints for one tick; the next window re-injects.
- It is the **identical** 60s tradeoff the memory-index and master-index i
... [+9175 chars truncated]
