---
type: "chat-session"
source: "claude-code-cli"
session_id: "5f24da39-0fd3-4a0b-a269-48217c52fd53"
title: "Review ONE test file end-to-end for PRISM unit INFRA-AGI-ROUTER-MS2/P0-U02. FILE"
date: "2026-05-20"
first_ts: "2026-05-20T22:26:45.463Z"
last_ts: "2026-05-20T22:27:19.204Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/5f24da39-0fd3-4a0b-a269-48217c52fd53/subagents/agent-ad6db7bd1d413e3e3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review ONE test file end-to-end for PRISM unit INFRA-AGI-ROUTER-MS2/P0-U02. FILE

> **claude-code-cli** | 2026-05-20 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/5f24da39-0fd3-4a0b-a269-48217c52fd53/subagents/agent-ad6db7bd1d413e3e3.jsonl`

## Transcript

### User | 2026-05-20T22:26:45.463Z

Review ONE test file end-to-end for PRISM unit INFRA-AGI-ROUTER-MS2/P0-U02.

FILE: H:/prism/mcp-server/src/__tests__/MillingAGIMasterEngine.test.ts — review ONLY the new appended block `describe("MillingAGIMasterEngine.orchestrate — DomainAGIIntent contract (P0-U02)", ...)` (the file's other describe blocks are pre-existing and out of scope).

WHAT IT TESTS: a new `orchestrate(intent: DomainAGIIntent, opts?): Promise<DomainAGIResult>` method on MillingAGIMasterEngine (H:/prism/mcp-server/src/engines/MillingAGIMasterEngine.ts). The method validates the intent, runs the legacy reason() pipeline, lifts tool/strategy/feed picks into Decision objects, optionally routes each through a consensus seam when `intent.consensusRequired`, and emits one outcome event per decision to the MS1 feedback bus. Two injectable seams (consensusDecide, publishOutcome) let tests avoid network calls.

UNIT SPEC EXIT CONDITIONS (the tests must actually verify these):
1. orchestrate exists and returns a DomainAGIResult.
2. Existing reason() API preserved.
3. 3 mill intent types (roughing, finishing, drilling) each return a valid result; consensusRequired=true triggers a consensus call for tool/strategy/feed picks.

The suite was just run: all 65 tests PASS (18 new).

CHECK FOR (test-quality focus):
- Do the assertions verify INTENT, not just behavior? Would a test FAIL if the business logic broke? (Karpathy R9 — `expect(getX()).toBe('John')` is worthless if getX() is hardcoded.)
- Are the 3 exit conditions genuinely covered?
- Weak assertions (toBeDefined-only, snapshot-only, truthiness-only)?
- Edge/error paths covered (invalid intent, wrong domain, consensus throws)?
- Is the consensus fake deterministic + does it actually exercise the consensus PATH (not just stubbed away)?
- Any test that passes for the wrong reason (e.g. asserting on a default that would pass even if orchestrate did nothing)?
- Mock/fake hygiene — no real network calls, no shared mutable state leaking between tests.

Repo
... [+93 chars truncated]

### Assistant | 2026-05-20T22:26:53.852Z

I'll review the test file for the DomainAGIIntent contract on MillingAGIMasterEngine.

### Assistant | 2026-05-20T22:26:53.879Z

[tool_use: Read]

### User | 2026-05-20T22:27:02.962Z

[tool_result] 1	/**
2	 * MillingAGIMasterEngine Tests
3	 * MILL-MASTER/P1-U03-AGI-BIND
4	 *
5	 * ≥15 tests covering: 8 reasoning modes, tool/strategy recommendations,
6	 * provenance tracking, edge cases, adversarial inputs.
7	 */
8	import { describe, it, expect } from "vitest";
9	import {
10	  millingAGIMasterEngine,
11	  MillingAGIMasterEngine,
12	  MillAGIRequest,
13	  MillReasoningMode,
14	  ISOGroup,
15	  
... [+35439 chars truncated]

### Assistant | 2026-05-20T22:27:19.204Z

Now let me focus on the P0-U02 test block (lines 543-794):

## Test Review: MillingAGIMasterEngine.orchestrate (P0-U02)

### Strengths

1. **Intent contract verified** — Tests check all three mill actions (roughing/finishing/drilling) return schema-valid DomainAGIResult with tool/strategy/feed decisions. Lines 588–603 use `DomainAGIResultSchema.parse(result)` to enforce contract, not just shape assertions.

2. **Consensus path exercised** — Lines 605–700 comprehensively test the consensus seam:
   - `consensusRequired=false` → no consensus calls (line 613)
   - `consensusRequired=true` → routes all 3 decision kinds (line 624)
   - Consensus override flagged + values differ (lines 637–651)
   - Seam throws → degrades soft to engine pick (lines 675–687)
   - Test-env guard fires when no fake injected (lines 689–699)

3. **Outcome events wired correctly** — Lines 702–724 verify events feed the feedback bus: one per decision, share job_id, distinct lineage_ids, schema-valid per event.

4. **Fake seams are deterministic** — `mkFakeConsensus()` (lines 564–577) and `mkPublishSpy()` (lines 580–586) never hit network; consensus records every call for inspection.

5. **Error paths covered** — Lines 726–748 test invalid action, wrong domain, material inference, ISO group fallback.

6. **Legacy API preserved** — Lines 786–793 confirm reason() still works unchanged (non-regression guard).

### P0/P1 Findings

1. **P0 — Weak assertion in line 614** — `expect(result.decisions.every((d) => d.source === "MillingAGIMasterEngine.reason")).toBe(true)` passes if decisions is EMPTY. A broken orchestrate() that returns `{ decisions: [] }` would pass this. Need: `expect(result.decisions).toHaveLength(3)` first.

2. **P0 — Consensus call assertions don't verify call sequence** — Lines 617–625 verify consensus IS called but never assert *which* decision hit it first or ordering. If the consensus path processes only tool (not feed+strategy), the test passes. Recommend: `expect(calls[0].decisi
... [+2046 chars truncated]
