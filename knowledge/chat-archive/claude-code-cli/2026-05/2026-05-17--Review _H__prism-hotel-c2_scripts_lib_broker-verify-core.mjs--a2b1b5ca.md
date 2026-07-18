---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review `H:/prism-hotel-c2/scripts/lib/broker-verify-core.mjs` (pure-core library"
date: "2026-05-17"
first_ts: "2026-05-17T15:29:57.898Z"
last_ts: "2026-05-17T15:32:20.978Z"
cwd: "h:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ac376919c6b3aceeb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review `H:/prism-hotel-c2/scripts/lib/broker-verify-core.mjs` (pure-core library

> **claude-code-cli** | 2026-05-17 | 10 msgs (4 user / 6 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ac376919c6b3aceeb.jsonl`

## Transcript

### User | 2026-05-17T15:29:57.898Z

Review `H:/prism-hotel-c2/scripts/lib/broker-verify-core.mjs` (pure-core library, ~170 LOC, 8 exports) end-to-end. This is the OBSIDIAN-INTELLIGENCE-MS3 / A1 close-out verifier — a pure parser+decision module that summarizes Docker broker health, burn-in fire results, and xmalloc log events, then composes a close-out report.

Verify against the A1 envelope at `H:/prism-hotel-c2/mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json` (look up unit id "A1" in phases[].units[]). The library's job is to mechanically verify the 3 Docker-blocked exit conditions:
  1. "Docker container 'prism-hooks' runs persistently" → /healthz returns 200
  2. "Per-event cold-start eliminated, xmalloc OOMs drop to zero in 24h burn-in"
  3. "Round-trip test: 50 rapid PreToolUse fires complete with zero forked-process failures"
PLUS implicitly: "Fallback to legacy in-process node execution if container is down (graceful degrade)" — the burn-in summarizer must NOT fail when ALL fires went through fallback successfully.

Test suite: `H:/prism-hotel-c2/mcp-server/src/__tests__/BrokerVerifyCore.test.ts` (42 cases passing as of just now). Read it too — confirm tests genuinely exercise each decision path and fail on regression rather than rubber-stamping.

WEIGHTED on: correctness of decision logic (especially graceful-degrade semantics + R12 fail-loud invariants), boundary handling, time-window math, schema discipline, frozen-object guarantees, test-as-spec quality. Flag any P0 (correctness bug, silent-pass path) or P1 (missing edge case, fragile invariant) issues.

Return PASS/FAIL grade + per-finding severity. Be specific with file:line citations.

### Assistant | 2026-05-17T15:30:06.025Z

I'll analyze the broker-verify-core library and its test suite against the A1 envelope requirements.

### Assistant | 2026-05-17T15:30:06.388Z

[tool_use: Read]

### User | 2026-05-17T15:30:08.076Z

[tool_result] 1	// NB: no shebang. Library — invoked from scripts/docker/verify-prism-hooks-broker.mjs.
2	/**
3	 * broker-verify-core.mjs — pure verifier core for OBSIDIAN-INTELLIGENCE-MS3 / A1
4	 *
5	 * Mechanically completes the 3 Docker-blocked exit conditions in the A1 envelope
6	 * (U-DOCKER-HOOK-BROKER partial_ship → final close-out) once the operator restores
7	 * Docker engine. Caller injects three read
... [+8393 chars truncated]

### Assistant | 2026-05-17T15:30:11.451Z

[tool_use: Read]

### User | 2026-05-17T15:30:12.509Z

[tool_result] 1	/**
2	 * BrokerVerifyCore.test.ts — vitest for scripts/lib/broker-verify-core.mjs
3	 *
4	 * OBSIDIAN-INTELLIGENCE-MS3 / A1 close-out verifier.
5	 *
6	 * Real-value assertions only — no `.toBeDefined()` stubs. Every test exercises
7	 * a concrete decision path that would silently break under regression.
8	 */
9	import { describe, it, expect } from "vitest";
10	import {
11	  BROKER_VERIFY_SCHEMA_V
... [+15070 chars truncated]

### Assistant | 2026-05-17T15:30:14.748Z

Now let me check the A1 envelope.

### Assistant | 2026-05-17T15:30:18.303Z

[tool_use: Bash]

### User | 2026-05-17T15:31:13.374Z

[tool_result] {
  "id": "A1",
  "title": "U-DOCKER-HOOK-BROKER â€” persistent prism-hooks container holds all 50+ hooks warm",
  "status": "in_progress",
  "ec": [
    "Docker container 'prism-hooks' runs persistently with all hook scripts pre-loaded",
    "Hook-broker dispatcher proxies PreToolUse/PostToolUse/Stop/SessionStart/UserPromptSubmit events to the container via HTTP/IPC",
    "Per-event cold-start el
... [+270 chars truncated]

### Assistant | 2026-05-17T15:32:20.978Z

Envelope confirmed. Now I have everything I need for the review.

---

## Code Quality Analysis Report — `broker-verify-core.mjs` + `BrokerVerifyCore.test.ts`

### Summary
- **Overall Quality Score:** 8.5 / 10
- **Files Analyzed:** 2 (170 LOC library + 345 LOC test)
- **Grade:** **PASS** with 1 P1 and 4 P2 findings — no P0 correctness bugs, decision logic is sound, R12 fail-loud invariants hold, graceful-degrade semantics correct.
- **Envelope alignment:** 3 of 5 envelope EC items mechanically verified by this library (#1, #3, #5). EC#2 (HTTP dispatch) is the broker itself, not in scope here. EC#4 (graceful-degrade fallback) is *implicitly* exercised by `summarizeBurnIn` via `viaBroker:false → ok:true` counting as `fallback++`, with the comment at L77-78 explicitly defending this. Correct.

---

### Critical Issues (P0)
**None found.** Decision logic is correct on every path I traced:

- `decideHealthVerdict` requires strict `=== true` (L44) — no truthy coercion. R12 holds.
- `summarizeBurnIn` pass rule `errors === 0 && total >= expected` (L79) correctly absorbs the envelope's graceful-degrade clause — a run that hits the broker zero times but completes 50 fallback fires with no fork-storm errors is a legitimate PASS. The comment at L77-78 names this explicitly, which is what the task brief asked to verify.
- `summarizeXmallocLog` window math: `since = now - windowMs`, comparison `ts < since || ts > now` (L103, L109) — correct half-open window with a future-ts corruption guard.
- `composeReport.overallPass` requires `verdicts.length === 3 && failed === 0` (L130) — no 2-of-3 partial pass leakage.

---

### Findings by severity

#### P1 — `summarizeXmallocLog` silently swallows non-numeric `ts` (broker-verify-core.mjs:108)
```js
const ts = Number(ev.ts);
if (!Number.isFinite(ts)) continue;
```
The test at L195-202 *codifies* this as "silently skipped" behavior — but the envelope condition is "xmalloc OOMs drop to zero in 24h burn-in." If a real xmalloc/OOM event lands
... [+6999 chars truncated]
