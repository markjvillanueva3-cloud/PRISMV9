---
type: "chat-session"
source: "claude-code-cli"
session_id: "2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd"
title: "Review `H:/prism/mcp-server/src/__tests__/ReputableSourceMonitorEngine.test.ts` "
date: "2026-05-13"
first_ts: "2026-05-13T15:43:10.921Z"
last_ts: "2026-05-13T15:44:03.192Z"
cwd: "H:\\prism\\mcp-server"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd/subagents/agent-a9b46995eaf14aac1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review `H:/prism/mcp-server/src/__tests__/ReputableSourceMonitorEngine.test.ts` 

> **claude-code-cli** | 2026-05-13 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd/subagents/agent-a9b46995eaf14aac1.jsonl`

## Transcript

### User | 2026-05-13T15:43:10.921Z

Review `H:/prism/mcp-server/src/__tests__/ReputableSourceMonitorEngine.test.ts` end-to-end. 13 tests across 12 §-numbered describe blocks for unit U-ALL01 of AUTO-LEARNING-LOOP-MS0.

The system-under-test is `H:/prism/mcp-server/src/engines/ReputableSourceMonitorEngine.ts` — a multi-source poller (RSS/Atom/JSON) with conditional GET, exponential backoff, 50MB payload guard, MITM redirect-host check.

Per-spec acceptance criterion (atomized spec at `H:/prism/state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-AUTO-LEARNING-LOOP-MS0-ATOMIZED-2026-05-10.md` `## U-ALL01`):
- 7 mandated test cases: happy (arXiv), 429 backoff, malformed RSS, redirect loop, 50MB payload guard, ETag honored, source-list config
- Variability axes: RSS / Atom / JSON / scrape (4 ingest types); 1 / 10 / 100 items
- Adversarial cases: source-poisoning, MITM-replaced response, infinite XML

Verify rigorously:
1. Are the 7 spec-mandated cases actually present and validated against REAL behavior (not toBeDefined / toBeNull / toBeUndefined / stub assertions)? Concrete value checks?
2. Variability span — do tests cover at least 3 of 4 ingest types? Does the parser tester exercise multiple item counts?
3. Adversarial coverage — does §4 actually test MITM (final URL hostname mismatch)? Does §5 actually test the 50MB cap or just claim to?
4. Mock fidelity — is `mockResponse` faithful to a real `Response` (status / headers / body / url all set correctly)? Any reliance on Node-specific Response quirks?
5. Hermetic — does each test isolate via `beforeEach` / `new Engine()` (no shared singleton leakage)?
6. Are the `expect(...).toBe(null)` / `.toBe(undefined)` semantic value-checks or weak stubs? (CLAUDE.md bans presence-only stubs — but value-equality on null/undefined is a real assertion.)
7. Backoff schedule test (§9) — does it correctly assert the 4-step ladder + clamp at the last bucket?
8. Alarm threshold test (§10) — does it test exactly the threshold boundary, or just the post-threshold state?
9. ETag
... [+462 chars truncated]

### Assistant | 2026-05-13T15:43:13.810Z

I'll review the test file end-to-end against the spec and best practices.

### Assistant | 2026-05-13T15:43:13.811Z

[tool_use: Read]

### Assistant | 2026-05-13T15:43:13.814Z

[tool_use: Read]

### Assistant | 2026-05-13T15:43:14.562Z

[tool_use: Read]

### User | 2026-05-13T15:43:17.507Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ReputableSourceMonitorEngine.ts' was already read 22s ago in this session and is unchanged (mtime 1778686519430). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### User | 2026-05-13T15:43:19.192Z

[tool_result] 1	/**
2	 * ReputableSourceMonitorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL01 tests
3	 * ======================================================================
4	 *
5	 * Covers the 7 cases mandated by the atomized U-ALL01 spec:
6	 *   1. happy path — arXiv RSS parses, items returned, state updated
7	 *   2. 429 backoff — rate-limit advances backoff schedule
8	 *   3. malformed RSS — quarantined; stat
... [+21481 chars truncated]

### User | 2026-05-13T15:43:20.121Z

[tool_result] 1	---
2	milestone: AUTO-LEARNING-LOOP-MS0
3	parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
4	research_source: state/shared/research/2026-05-10-pass2-* (synthesized) + user directive
5	total_units: 12
6	critical_path_role: continuous self-improvement loop — monitor reputable sources, detect novelty, auto-research, classify synergy, auto-augment viz + roadmap
7	loop_registrations: 
... [+7027 chars truncated]

### Assistant | 2026-05-13T15:43:23.009Z

I'll review the test file comprehensively against the spec and best practices.

### Assistant | 2026-05-13T15:43:23.289Z

[tool_use: Read]

### User | 2026-05-13T15:43:30.703Z

[tool_result] 1	/**
2	 * ReputableSourceMonitorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL01
3	 * ================================================================
4	 *
5	 * Multi-source external poller for reputable AI/ML/manufacturing news feeds.
6	 * Polls 10 RSS / Atom / JSON sources with conditional GET (ETag /
7	 * If-Modified-Since), exponential backoff on rate-limit (1m → 5m → 30m → 2h),
8	 * a 50 MB payload
... [+4087 chars truncated]

### Assistant | 2026-05-13T15:44:03.192Z

Reviewing the test file against the spec and best practices.

## Comprehensive Test Review: ReputableSourceMonitorEngine.test.ts

### **Coverage Against 7 Mandated Cases**

1. **§1 Happy path (arXiv)** ✓ Lines 138–174
   - Parses RSS correctly, returns items with all fields (title, guid, link, published, summary)
   - State advanced: concrete assertions on etag, lastModified, lastSuccess (ISO-8601 regex), consecutiveFailures=0
   - **Strength**: Full item shape validation, fallback guid logic tested (line 163–165)

2. **§2 429 backoff** ✓ Lines 177–194
   - Returns status='rate_limited', sets backoffUntil correctly
   - Assertion: `expect(st.backoffUntil).toBe(nowMs + BACKOFF_SCHEDULE_MS[0])`—concrete value, not presence stub
   - **Strength**: Uses injected `now()` to verify exact backoff delay

3. **§3 Malformed RSS** ✓ Lines 197–215
   - Returns status='error' with malformed_rss prefix (regex match line 209)
   - **Critical validation**: backoffUntil stays null (no transport-level backoff applied) ✓
   - Failure counter bumps for chronic breakage detection ✓

4. **§4 Redirect MITM** ✓ Lines 218–233
   - Final URL hostname (attacker.example) vs source (export.arxiv.org) mismatch detected
   - Error message exact format: `redirect_host_mismatch: expected=export\.arxiv\.org got=attacker\.example`
   - **Strength**: Uses regex to validate error structure, items empty array ✓

5. **§5 50MB payload guard** ✓ Lines 236–265
   - Streams chunks exceeding MAX_PAYLOAD_BYTES, aborts mid-stream
   - Exact byte-count check in error: `payload_exceeded_${MAX_PAYLOAD_BYTES}_bytes` (line 257)
   - Concrete numeric assertion: `typeof st.backoffUntil === "number"` and `> 0` (lines 263–264)
   - **Strength**: Tests stream cap via ReadableStream injection, not just claim

6. **§6 ETag honored** ✓ Lines 268–299
   - First poll: 200 with etag, parses
   - Second poll: 304, verifies `If-None-Match` header sent (line 283 captures etagSent, line 294 asserts it)
   - State preserved: etag s
... [+6213 chars truncated]
