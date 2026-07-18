---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Audit the test additions in H:/prism/scripts/promote-memory-to-wiki.test.mjs for"
date: "2026-06-17"
first_ts: "2026-06-17T13:21:47.325Z"
last_ts: "2026-06-17T13:22:20.892Z"
cwd: "H:\\prism-slot-sierra"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a23b5d1a4826f056f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Audit the test additions in H:/prism/scripts/promote-memory-to-wiki.test.mjs for

> **claude-code-cli** | 2026-06-17 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a23b5d1a4826f056f.jsonl`

## Transcript

### User | 2026-06-17T13:21:47.325Z

Audit the test additions in H:/prism/scripts/promote-memory-to-wiki.test.mjs for REAL coverage of a new `isHubSource` ref-count de-inflation feature in H:/prism/scripts/promote-memory-to-wiki.mjs. Read both files.

The 3 added tests (at the END of the test file):
1. `isHubSource: dreams/ _index/ index.md are hub sources; atoms + wiki entries are not` — unit test.
2. `runMemoryPromotion: refs from a dreams/ hub do NOT count toward the gate (de-inflation)` — integration.
3. `runMemoryPromotion: genuine refs still promote; a wiki index.md source does not pad the count` — integration.

VERIFY:
- Do the unit-test assertions cover the real edge cases: TRUE for dreams//_index//index.md; FALSE for normal memory + wiki entry; segment-anchoring (a "dreams" SUBSTRING that is not a path segment must be FALSE — e.g. reference_dreams_analysis.md); basename precision (index-design.md must be FALSE); backslash-path normalization?
- Are the 2 integration tests genuinely reference-value/behavioral (not toBeDefined-style stubs)? Do they assert concrete counts (e.g. cand.refs === 3, hubSourcesSkipped >= 3, promoted === 0)?
- Are they MUTATION-PROOF — i.e., would they fail if `isHubSource` were removed/neutered? (I ran the mutation: neutering isHubSource fails exactly these 3 and passes the other 35. Confirm the assertions logically guarantee that.)
- Any accidental .skip/.only? Any test that would pass even if the logic were wrong?
- Is there a HAPPY path + failure-mode + adversarial (substring-not-segment) coverage?

Report PASS/FAIL + any P0/P1 gaps with line citations. Do NOT execute the suite (audit statically).

### Assistant | 2026-06-17T13:21:50.636Z

I'll audit the test coverage for the `isHubSource` feature. Let me read both files.

### Assistant | 2026-06-17T13:21:50.701Z

[tool_use: Read]

### Assistant | 2026-06-17T13:21:50.716Z

[tool_use: Read]

### User | 2026-06-17T13:21:51.221Z

[tool_result] read-once-guard: 'H:\prism\scripts\promote-memory-to-wiki.mjs' was already read 20s ago in this session and is unchanged (mtime 1781702212769). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T13:21:51.266Z

[tool_result] read-once-guard: 'H:\prism\scripts\promote-memory-to-wiki.test.mjs' was already read 20s ago in this session and is unchanged (mtime 1781702331807). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T13:21:53.056Z

The files were already read. Let me search for the specific tests and the `isHubSource` function to audit them.

### Assistant | 2026-06-17T13:21:54.059Z

[tool_use: Grep]

### Assistant | 2026-06-17T13:21:54.404Z

[tool_use: Grep]

### User | 2026-06-17T13:21:54.996Z

[tool_result] 1-// Tests for scripts/promote-memory-to-wiki.mjs (U-VAULT02).
2-// Pure-function units + a hermetic real-FS end-to-end (tmp vault, controlled
3-// `nowMs` for age) so the promotion gate is exercised on real file IO, not mocks.
4-
5-import { test } from "node:test";
6-import assert from "node:assert/strict";
7-import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 
... [+5845 chars truncated]

### User | 2026-06-17T13:21:55.352Z

[tool_result] 243-// honest, so a future auto-generated junk class cannot clear minRefs via hub inflation
244-// alone (the recurring root cause behind classes 1/3/4 of nonPromotableReason).
245-\ Three categories (segment-anchored so it holds under test temp-roots too):
246-\   - dreams\   : LLM free-association notes that liberally [[link]] many memories.
247-\   - _index\   : explicit memory aggregation hubs
... [+832 chars truncated]

### Assistant | 2026-06-17T13:22:20.892Z

Perfect. Now I have the context. Let me analyze the audit statically.

## AUDIT REPORT: `isHubSource` Test Coverage

### FUNCTION IMPLEMENTATION (lines 253–258)
```typescript
export function isHubSource(filePath) {
  const u = String(filePath).replace(/\\/g, "/");
  if (/(^|\/)(dreams|_index)\//.test(u)) return true;
  if (basename(u).toLowerCase() === "index.md") return true;
  return false;
}
```

---

### TEST 1: Unit Test (lines 393–406)
**`isHubSource: dreams/ _index/ index.md are hub sources; atoms + wiki entries are not`**

#### TRUE Cases Covered
1. ✓ `dreams/` segment: `H:/prism/knowledge/memories/dreams/dream_42.md` → TRUE
2. ✓ `_index/` segment: `H:/prism/knowledge/memories/_index/all.md` → TRUE
3. ✓ `index.md` basename (wiki root): `H:/prism/knowledge/wiki/index.md` → TRUE
4. ✓ `index.md` basename (nested): `H:/prism/knowledge/wiki/consensus/index.md` → TRUE
5. ✓ Backslash normalization: `C:\\Users\\x\\knowledge\\memories\\dreams\\d.md` → TRUE

#### FALSE Cases Covered
1. ✓ Genuine memory (feedback type): `H:/prism/knowledge/memories/feedback/feedback_x.md` → FALSE
2. ✓ Genuine wiki entry: `H:/prism/knowledge/wiki/lessons/golf.md` → FALSE
3. ✓ Substring "dreams" (NOT segment): `reference_dreams_analysis.md` → FALSE (basename precision)
4. ✓ Substring "index" (NOT segment, basename): `index-design.md` → FALSE

#### Edge Case Analysis
| Case | Covered | Status |
|------|---------|--------|
| Backslash → forward-slash normalization | YES (line 399) | **PASS** |
| Segment-anchoring (`/(^|\/)(dreams\|_index)\//` captures only segments) | YES (lines 404–405) | **PASS** |
| Case-insensitive `basename().toLowerCase() === "index.md"` | Implicitly (line 397–398 use lowercase) | **PASS** |
| Path with multiple `/` segments (e.g., `dreams/nested/d.md`) | NOT explicitly tested | **GAP** |
| Trailing slash or no extension (e.g., `dreams/` or `index`) | NOT tested | **GAP** |
| Empty string / null | NOT tested | **GAP** |

#### Unit Test Verdict
**PASS with minor gaps*
... [+6701 chars truncated]
