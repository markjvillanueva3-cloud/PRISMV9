---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "PER-FILE SCRUTINY GATE — unit U-CLEANUP-D5. Review one test file end-to-end. FIL"
date: "2026-05-14"
first_ts: "2026-05-14T14:07:54.914Z"
last_ts: "2026-05-14T14:09:16.313Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-af6743a2ca1c2ef06.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# PER-FILE SCRUTINY GATE — unit U-CLEANUP-D5. Review one test file end-to-end. FIL

> **claude-code-cli** | 2026-05-14 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-af6743a2ca1c2ef06.jsonl`

## Transcript

### User | 2026-05-14T14:07:54.914Z

PER-FILE SCRUTINY GATE — unit U-CLEANUP-D5. Review one test file end-to-end.

FILE: H:\prism\mcp-server\src\__tests__\WikiPrecheckBoostKeywords.test.ts

WHAT IT TESTS — the two D5 deliverables:
1. `H:\prism\scripts\build-wiki-leaf-index.mjs` — producer: `parseFrontmatter` (array-aware YAML) + `normalizeBoostKeywords`. Extracts `boost_keywords` frontmatter into `_leaf-index.jsonl`.
2. `H:\prism\.claude\hooks\wiki-precheck-inject.mjs` — consumer hook: `matchBoostKeywords` (substring + non-regex glob), `hashKeyword` (salted sha1), `capInjection` (8 KB cap), `loadLeafCorpus`, `main()`.

The suite is 40 tests across 6 describe blocks (A-F). It currently PASSES 40/40.

REVIEW FOR TEST LEGITIMACY — this is the critical axis:
1. **Real assertions vs theater** — does every test assert concrete behavior that would FAIL if the implementation were wrong? Flag any test that would still pass against a broken/stub implementation. No `.toBeDefined()` / `.toBeTruthy()` / presence-only asserts.
2. **The SUT is real** — the tests import the actual `.mjs` files (not mocks). Confirm nothing critical is mocked away. The `freshHook()` cache-busting dynamic import + env-isolation pattern — is it sound? Could a test be passing because of stale module/env state bleeding from a sibling test?
3. **Coverage floor** — PRISM requires happy path + ≥3 failure modes + ≥2 adversarial inputs + ≥3 spanning configurations. Verify the suite actually hits all of these for the D5 surface. Are there UNCOVERED behaviors that matter (e.g. the boost-score ranking interaction, the de-dup, the semantic-fallback path, telemetry)?
4. **Assertion strength** — e.g. the ReDoS test asserts `<100ms` — is that a real regression catch? The miss-log test asserts raw tokens are absent — is that checking the right thing? The capInjection tests — do they actually prove the 8KB bound?
5. **Determinism / flakiness** — `Math.random()` in `freshHook()` cache-bust, `performance.now()` timing assertion, tmpdir lifecycle, env save/
... [+563 chars truncated]

### Assistant | 2026-05-14T14:07:58.632Z

I'll review this test file end-to-end for legitimacy, assertion strength, and coverage.

### Assistant | 2026-05-14T14:07:58.719Z

[tool_use: Read]

### User | 2026-05-14T14:08:01.137Z

[tool_result] 1	/**
2	 * WikiPrecheckBoostKeywords.test.ts — U-CLEANUP-D5.
3	 *
4	 * Covers the two D5 deliverables:
5	 *   1. scripts/build-wiki-leaf-index.mjs — producer: extracts `boost_keywords`
6	 *      frontmatter into _leaf-index.jsonl (array-aware parseFrontmatter +
7	 *      normalizeBoostKeywords).
8	 *   2. .claude/hooks/wiki-precheck-inject.mjs — consumer: honors boost_keywords,
9	 *      caps inje
... [+20374 chars truncated]

### Assistant | 2026-05-14T14:08:03.638Z

I'll conduct a comprehensive end-to-end review of this test file, checking for legitimacy, assertion strength, and coverage of the D5 deliverables.

### Assistant | 2026-05-14T14:08:07.216Z

[tool_use: Read]

### User | 2026-05-14T14:08:13.190Z

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
... [+7998 chars truncated]

### Assistant | 2026-05-14T14:08:14.303Z

Now let me check the producer script to understand the full context:

### Assistant | 2026-05-14T14:08:14.796Z

[tool_use: Read]

### User | 2026-05-14T14:08:16.613Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-leaf-index.mjs
4	 *
5	 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
6	 *   knowledge/wiki/architecture/_leaf-index.jsonl
7	 *
8	 * One line per entry: { name, title, type, desc, path } where:
9	 *   - name  = basename without .md  (the [[wiki-link]] target)
10	 *   - title = frontmatter title (falls back to first H1)
11	 
... [+8896 chars truncated]

### Assistant | 2026-05-14T14:08:18.722Z

Now let me check the rest of the hook to understand the full integration:

### Assistant | 2026-05-14T14:08:19.102Z

[tool_use: Read]

### User | 2026-05-14T14:08:21.775Z

[tool_result] 150	
151	// Lazy per-repo salt for miss-log hashing — 16 random bytes, generated once and
152	// persisted next to MISSES_LOG, cached in module scope. Fail-safe: an
153	// unreadable/unwritable salt path falls back to "" (still hashed, just weaker).
154	let _missSalt = null;
155	function missSalt() {
156	  if (_missSalt !== null) return _missSalt;
157	  const saltPath = join(dirname(MISSES_LOG), "
... [+13125 chars truncated]

### Assistant | 2026-05-14T14:09:16.313Z

Now I have the complete picture. Let me conduct a rigorous end-to-end review of the test file.

---

## COMPREHENSIVE TEST LEGITIMACY REVIEW

**File:** `H:\prism\mcp-server\src\__tests__\WikiPrecheckBoostKeywords.test.ts`

### 1. REAL ASSERTIONS VS THEATER

**Status: PASS** — Every test checks concrete behavior, not just presence.

Examples of strong assertions:
- **A.4 (regression guard)**: Checks `fm("title: [DRAFT]").title).toBe("[DRAFT]")` — asserts the literal string is NOT coerced to an array. This would FAIL if the parser wrongly treated non-ARRAY_KEYS as arrays.
- **A.5 (empty scalar)**: Verifies `fm.verified_by).toBe("")` AND `fm.title).toBe("Real Title")` — ensures the empty scalar doesn't absorb the next key. A broken parser would fail here.
- **A.6 (non-array key with block items)**: Ensures `fm("tags:\n  - a\n  - b").tags).toBe("")` — a naive parser that treats all block-sequence items as arrays would incorrectly return `["a","b"]`.
- **C.1 (substring match)**: `matchBoostKeywords("explain the async hook dispatcher please", ["async hook dispatcher"])` → asserts the multi-word phrase is found as a substring. Removing substring logic would break this.
- **C.5 (ReDoS adversarial)**: `performance.now()` timing assertion at 100ms threshold — a ReDoS-prone glob→regex implementation would time out and fail.
- **D.1 (hash format)**: Asserts `/^[0-9a-f]{12}$/` — a broken hash function or missing slice would produce wrong-length hex.
- **E.2 (cap enforcement)**: `Buffer.byteLength(out, "utf8")).toBeLessThanOrEqual(8192)` — directly verifies the byte cap. Removing the cap logic would fail this.

**No theater found.** All assertions encode behavior that WOULD FAIL if the implementation broke.

---

### 2. SUT IS REAL — NO CRITICAL MOCKS

**Status: PASS** — The two `.mjs` files are imported directly, not mocked.

- Line 35-36: `const producer = await import(PRODUCER_URL);` imports the real script.
- Line 40-41: `const hook = await import(HOOK_URL);` imports the real
... [+13694 chars truncated]
