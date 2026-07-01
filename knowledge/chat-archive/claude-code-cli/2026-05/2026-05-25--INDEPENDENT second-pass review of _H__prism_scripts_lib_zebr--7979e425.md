---
type: "chat-session"
source: "claude-code-cli"
session_id: "7979e425-2dbf-471a-ad68-c7177d2219a4"
title: "INDEPENDENT second-pass review of `H:/prism/scripts/lib/zebra-context-bundle.mjs"
date: "2026-05-25"
first_ts: "2026-05-25T19:33:27.522Z"
last_ts: "2026-05-25T19:36:21.537Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-aa908d901c90188a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# INDEPENDENT second-pass review of `H:/prism/scripts/lib/zebra-context-bundle.mjs

> **claude-code-cli** | 2026-05-25 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-aa908d901c90188a1.jsonl`

## Transcript

### User | 2026-05-25T19:33:27.522Z

INDEPENDENT second-pass review of `H:/prism/scripts/lib/zebra-context-bundle.mjs`. The file was extended with 3 readers for ZEBRA-OMNISCIENT-MS0 units U-ZO-MS0-02 (loadBridgeUnits), U-ZO-MS0-03 (loadSlotSoulRefuseList), U-ZO-MS0-04 (loadLoopState + findActiveLoops).

Do NOT assume the other reviewer caught everything. You're weighted on:
- **Integration with already-built engines** — the existing `loadFile()` worker handles cache + envelope. The new readers must REUSE it correctly; don't bypass cache, don't reimplement fail-soft, don't break the 60/60 existing tests.
- **Hidden coupling** — KNOWN_SLOTS constant mirrors `.claude/helpers/chat-slots.mjs` SLOT_NAMES. If SLOT_NAMES drifts, this constant becomes wrong. Is the drift documented + recoverable?
- **Security** — slot path-traversal: even with KNOWN_SLOTS whitelist, does the implementation defend in depth? sessionId regex: tight enough to block injection? Is JSON.parse on untrusted disk content (could prototype-pollute via `__proto__` injection)?
- **Error budgets** — does any reader silently swallow an unexpected throw? Reader injection: does the test path differ in observable behavior from the production path (the U-ZO-MS0-01 lesson was injected-reader bypass of fs.statSync)?
- **Naming + convention conformance** — does it match the existing file's naming (camelCase functions, UPPER_SNAKE constants, JSDoc-free comment style with section headers)?
- **Inlined constants** — any magic strings or numbers? The "26" in NATO list is OK if cited; sort comparators OK; but undocumented timeouts/sizes are not.
- **Stub assertions** — are reader return shapes complete? E.g., does an envelope ever have `ok:true` with `reason: null` but ALSO miss a required field?

CRITICAL contract checks (must PASS):
1. `parseBridgeUnits({})` (empty obj) → `{ok:false, reason:"no-bridge-units", wiring:[], deepIntegration:[]}` — both arrays present even on failure.
2. `parseSoulFrontmatter("")` → `{refuseList:[], hermesRole:null, domainFil
... [+1039 chars truncated]

### Assistant | 2026-05-25T19:33:37.360Z

I'll perform an independent second-pass review of this file, focusing on the integration, hidden coupling, security, and contract checks you specified.

### Assistant | 2026-05-25T19:33:37.748Z

[tool_use: Read]

### User | 2026-05-25T19:33:42.269Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
2	// with mtime-keyed cache layer for the Zebra orchestrator sweep.
3	//
4	// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
5	// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
6	// to build) so the Zebra orchestrator's `planSlotAction` can make
7	// goal-aware decis
... [+28614 chars truncated]

### Assistant | 2026-05-25T19:33:46.512Z

Now I'll check the chat-slots source of truth to verify KNOWN_SLOTS drift posture, and check the spec + test file for context.

### Assistant | 2026-05-25T19:33:51.966Z

[tool_use: Bash]

### Assistant | 2026-05-25T19:33:52.587Z

[tool_use: Bash]

### Assistant | 2026-05-25T19:33:53.515Z

[tool_use: Bash]

### User | 2026-05-25T19:34:02.456Z

[tool_result] Exit code 1
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/lo
... [+599 chars truncated]

### User | 2026-05-25T19:34:13.024Z

[tool_result] H:/prism/scripts/lib/zebra-context-bundle.test.mjs  16.0K
test exists

### User | 2026-05-25T19:34:21.653Z

[tool_result] false

### Assistant | 2026-05-25T19:34:24.429Z

Acknowledged. Reading SLOT_NAMES directly to compare against KNOWN_SLOTS.

### Assistant | 2026-05-25T19:34:25.509Z

[tool_use: Read]

### Assistant | 2026-05-25T19:34:25.815Z

[tool_use: Read]

### User | 2026-05-25T19:34:29.834Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * chat-slots.mjs — 7-slot fleet manager for concurrent PRISM chats.
4	 *
5	 * Replaces opaque 8-char hex chat ids in handoff filenames with NATO-phonetic
6	 * slot names (alpha..juliett — 9 work + 1 hygiene = 10 total). Each Claude/Codex
7	 * session at SessionStart claims the first free slot; the slot binding lives
8	 * for the lifetime of the chat (or until the 10-
... [+2080 chars truncated]

### User | 2026-05-25T19:34:29.850Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — tests for the CLAUDE-BRIEF + BUILD-VISION
2	// reader. Hermetic via injected synthetic reader + node:test + node:assert/strict.
3	//
4	// Acceptance criteria from `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` §7:
5	//   - tests pin fail-soft + cache-hit + ttl-expiry + stale-mark behavior
6	//   - one real-data E2E per the MS1 P0 lesson
7	//     ("pure-co
... [+17415 chars truncated]

### Assistant | 2026-05-25T19:34:32.727Z

Acknowledged. I have sufficient context to complete the independent second-pass review.

Let me verify the SLOT_NAMES drift posture by reading just the constant definition:

### Assistant | 2026-05-25T19:34:34.906Z

[tool_use: Grep]

### Assistant | 2026-05-25T19:34:36.242Z

[tool_use: Grep]

### User | 2026-05-25T19:34:40.953Z

[tool_result] 103:export const SLOT_NAMES = [
104-  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
105-  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
106-];
107-
108-/** Crash TTL — slot is considered crashed/reclaimable after this many ms with
109- *  no heartbe
... [+113 chars truncated]

### User | 2026-05-25T19:34:42.227Z

[tool_result] 63:    schemaVersion: "1.0.0",
64:    sessionId: flags.session,
120:        sessionId: s.sessionId, task: s.task, iter: s.iter, target: s.target,

### Assistant | 2026-05-25T19:36:21.537Z

Acknowledged. I have all the context needed for the review. Confirmed:
- KNOWN_SLOTS (line 374-379) is byte-equal with `SLOT_NAMES` in `H:/prism/.claude/helpers/chat-slots.mjs:103-106` — no drift today.
- `loop-state.mjs` writes `schemaVersion: "1.0.0"` — but the reader never validates it (FINDING C below).

---

# Independent Second-Pass Review — `H:/prism/scripts/lib/zebra-context-bundle.mjs`

**Verdict: FAIL (P0 prototype-pollution surface, P0 ENV-disable bypass, P0 stale slot-soul envelope, P1 silent-throw budget breach, plus 4 P1/P2 findings)**

The file reads cleanly against the existing 60/60 test contract, the existing `loadFile` worker is correctly reused (no cache bypass, no duplicate fail-soft logic in MS0-02/03/04 readers), and KNOWN_SLOTS is byte-equal with SLOT_NAMES today. But seven defects survive — three are P0 because they break the explicit contract checks you named.

I'm citing line numbers from the file as I read it.

---

## P0 findings (must block merge)

### P0-A — Prototype-pollution surface on `JSON.parse` (3 sites)
**Lines: 319, 599, 646** — `parseBridgeUnits`, `loadLoopState`, and `findActiveLoops` all call `JSON.parse(...)` on disk content with no `__proto__` / `constructor` / `prototype` sanitization, and the result is fed into `parseBridgeUnits(json)` / `parseLoopState(json)` which then spread or `...base` against caller-shaped envelopes.

The threat surface is narrow but real: `state/shared/specs/ROADMAP-CONSOLIDATED.json` is touched by `consolidate-roadmaps.mjs`, which ingests prose-roadmap extraction from 6 agents (CLAUDE.md §ROADMAP CONSOLIDATION). The Zebra orchestrator then runs `parseBridgeUnits` against that file inside the same node process that owns the chat slot. A malicious or LLM-hallucinated `"bridge_units": { "wiring": [], "__proto__": {"toString":"hijacked"} }` parses to a poisoned proto chain.

`parseLoopState` is even tighter (no spread of `json` itself), but `loadLoopState` does `return { ...base, ok: true, reason: n
... [+13055 chars truncated]
