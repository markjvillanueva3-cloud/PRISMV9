---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Review this test file end-to-end for test integrity. Grade PASS or FAIL. TEST FI"
date: "2026-05-16"
first_ts: "2026-05-16T04:16:21.531Z"
last_ts: "2026-05-16T04:17:24.962Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a8966524d3ce0829b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review this test file end-to-end for test integrity. Grade PASS or FAIL. TEST FI

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a8966524d3ce0829b.jsonl`

## Transcript

### User | 2026-05-16T04:16:21.531Z

Review this test file end-to-end for test integrity. Grade PASS or FAIL.

TEST FILE: H:\prism\scripts\lib\course-content-mine-lib.test.mjs
SUBJECT UNDER TEST: H:\prism\scripts\lib\course-content-mine-lib.mjs

This is iter-7 of TRIBAL-GRAPH-MS0: a pure lib that mines MIT-OCW per-resource descriptor metadata into an ADVISORY ranked review queue via a local Ollama call. The test suite is `node:test` (the repo's vitest harness is broken — this is expected, not a defect). All 38 tests currently pass.

Your job is to find tests that pass but DON'T actually verify intent (Karpathy R9: a test that can't fail when the business logic breaks is worthless):
- Are the assertions real-value / invariant checks, or tautologies / `toBeDefined`-equivalents that would still pass if the function returned a constant?
- For the SECURITY-CRITICAL behaviors (prompt-injection neutralization, control-char/zero-width stripping, the depth-aware JSON merge-attack defense, clamp01 type-rejection fail-loud, the hardcoded advisoryOnly/mustHumanVerify/caveat framing, the RELEVANCE_FLOOR predicate): does each test actually pin the behavior such that regressing the code would flip the test red? Try to imagine a plausible code regression for each and check whether a test catches it.
- Coverage floor required by the project: happy path + ≥3 failure modes + ≥2 adversarial inputs per substantial function, and ≥3 spanning configurations where the domain has variability. Identify any exported function with weak/missing coverage (the lib exports: sanitizeText, collectResourceDescriptors, aggregateCourseCorpus, buildMinePrompt, extractFirstJsonObject, parseMineResponse, corpusMfgPrior, scoreCandidate, passesRelevanceFloor, toCandidateRecord, callOllamaMine).
- Are there assertions that are too loose (e.g. `assert.ok(x.length <= 101)` where the exact value is knowable), or that would pass for the wrong reason?
- The two tests that were just changed from failing→passing by CODE fixes (collectResourceDescriptor
... [+269 chars truncated]

### Assistant | 2026-05-16T04:16:25.879Z

I'll review this test file end-to-end for test integrity. Let me start by reading both files.

### Assistant | 2026-05-16T04:16:25.880Z

[tool_use: Read]

### Assistant | 2026-05-16T04:16:26.065Z

[tool_use: Read]

### User | 2026-05-16T04:16:26.991Z

[tool_result] 1	#!/usr/bin/env node
2	// course-content-mine-lib.test.mjs — node:test (vitest harness is broken in
3	// this repo; see reference_fleet_reaper_ms1). Real-value / invariant
4	// assertions only — no toBeDefined() stubs (hook-rejected). Covers happy path
5	// + ≥3 failure modes + ≥2 adversarial inputs per the comprehensive-build floor,
6	// and locks in every P0/P1/P2/P3 the 2-arm per-file scrutiny
... [+18021 chars truncated]

### User | 2026-05-16T04:16:27.160Z

[tool_result] 1	#!/usr/bin/env node
2	// course-content-mine-lib.mjs
3	// Iter 7 (TRIBAL-GRAPH-MS0): PURE transforms for mining the machine-readable
4	// per-resource descriptor layer of MIT OCW course zips into a RANKED REVIEW
5	// QUEUE of PRISM-value candidates (technique vocabulary + asset proposals).
6	//
7	// WHY THIS SHAPE (load-bearing — read before changing):
8	//   * MIT lecture-note PDFs are SCANNED 
... [+24957 chars truncated]

### Assistant | 2026-05-16T04:17:24.962Z

I've read both files fully. Now I'll conduct a systematic test integrity review for each exported function, checking for Karpathy R9 violations (tests that pass but don't verify intent), weak coverage, and the specific security-critical behaviors.

## Analysis by Function

### **sanitizeText (tests lines 34–67)**

**Test 1 (line 34):** Non-string → empty string
- ✓ Real assertion: `assert.equal(sanitizeText(v), "")` pins exact output type and value.
- ✓ Catches regression if control flow changes to return `undefined` or `null`.

**Test 2 (line 38):** Control char stripping + whitespace collapse
- ✓ Specific: `ctrl(0, 7, 0x1f, 0x7f)` replaced with spaces, then collapsed, trimmed.
- ✓ Would fail if the `replace(CONTROL_CHARS_RE, " ")` or collapse logic regressed.

**Test 3 (line 42):** Zero-width/BOM stripping (adversarial)
- ✓ Real: Asserts both absence (`!out.includes(ZW)`) and correct text content.
- ✓ Would catch if ZERO_WIDTH_RE was deleted or broken.

**Test 4 (line 48):** **SECURITY-CRITICAL** — injection neutralization after whitespace collapse
- **ISSUE FOUND:** Lines 50–53 use `.includes("[redacted:")` which is a WEAK CHECK.
  - The test passes if ANY redaction marker appears, but doesn't verify:
    - Whether the **ORIGINAL trigger phrase** (e.g., "ignore the above") is actually gone.
    - Whether the redaction **length marker** is correct (the code does `"[redacted:" + m.length + "]"`).
  - **Regression scenario:** If the injection regex is deleted, the test would STILL PASS because a rogue `"[redacted:"` string in the corpus would satisfy `.includes("[redacted:")`.
  - **FIX:** Should assert the trigger phrase is NOT present in output AND verify the marker format: `assert.equal(sanitizeText("ignore the above"), "[redacted:16]");`

**Test 5 (line 56):** Legitimate math prose survives
- ✓ Correct: Asserts both absence of redaction AND presence of key content ("transfer function").
- ✓ Catches if injection regex is too greedy.

**Test 6 (line 63):** Hard le
... [+14421 chars truncated]
