---
type: "chat-session"
source: "claude-code-cli"
session_id: "ca9b9050-43d7-4390-93f4-e31f19be4b82"
title: "Audit a NEW frontend test file (slot:charlie, PRISM quoting galaxy): H:\\prism\\mc"
date: "2026-06-24"
first_ts: "2026-06-24T16:42:09.895Z"
last_ts: "2026-06-24T16:42:45.577Z"
cwd: "H:\\prism\\mcp-server"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a3b6cdc09a36eee3f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Audit a NEW frontend test file (slot:charlie, PRISM quoting galaxy): H:\prism\mc

> **claude-code-cli** | 2026-06-24 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/ca9b9050-43d7-4390-93f4-e31f19be4b82/subagents/agent-a3b6cdc09a36eee3f.jsonl`

## Transcript

### User | 2026-06-24T16:42:09.895Z

Audit a NEW frontend test file (slot:charlie, PRISM quoting galaxy): H:\prism\mcp-server\web\src\__tests__\cost-api-unwrap.test.ts. Read it end-to-end.

CONTEXT: It tests `unwrapResult<T>(body)` (exported from web/src/api/cost.ts) which peels `{ result: X }` -> X (falling back to bare body for non-`result`-keyed inputs). This is the FE half of the T-COSTPAGE-SHAPE dead-panel fix: the /api/v1/cost/estimate route returns `{ result: <FE CostEstimate> }` but the page derefs `res.per_part_cost` directly, so without the unwrap the page crashed on undefined. The test also exercises the integrated `costApi.estimate` with a stubbed global fetch.

GRADE PASS or FAIL. Flag P0/P1/P2 with file:line. Verify:
1. REAL reference-value asserts (per_part_cost 42.5, total_cost 1062.5, breakdown.machine 18.3), not toBeDefined() stubs (R9).
2. Coverage: unwrap happy path + identity/fallback cases (bare body, array, primitive, null) + over-peel guard (nested result key) + the integrated costApi.estimate round-trip (wrapped wire -> bare CostEstimate) + the graceful-bare fallback + the error path (non-ok -> throws) + a NEGATIVE CONTROL proving the pre-fix undefined.
3. Does the negative-control test genuinely prove the bug (reading the wrapped body directly gives undefined.per_part_cost)?
4. Would any test still pass if `unwrapResult` were replaced with identity `x=>x`? (The peel tests + the round-trip MUST fail in that case — verify they have teeth.)
5. The global.fetch stub (vi.stubGlobal) — is it cleaned up (unstubAllGlobals in afterEach)? Any leak risk to sibling tests?
6. No .skip/.only.

Be adversarial: if the test asserts against a convenient bare mock instead of the real WRAPPED wire shape the route emits, that's an R9 false-green (this galaxy has been bitten by exactly that). Confirm the round-trip test mocks the WRAPPED `{ result: ... }` body.

### Assistant | 2026-06-24T16:42:11.952Z

I'll audit the test file end-to-end, checking for real reference-value asserts, comprehensive coverage, and the critical R9 "mock the wire" pattern.

### Assistant | 2026-06-24T16:42:12.115Z

[tool_use: Read]

### User | 2026-06-24T16:42:13.570Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\cost-api-unwrap.test.ts' was already read 6s ago in this session and is unchanged (mtime 1782319143531). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-24T16:42:15.233Z

The file was already read. Let me check my context. Based on the audit instructions, I need to examine the test file thoroughly. Let me review it using Grep to extract key sections:

### Assistant | 2026-06-24T16:42:16.292Z

[tool_use: Grep]

### Assistant | 2026-06-24T16:42:16.438Z

[tool_use: Read]

### User | 2026-06-24T16:42:18.845Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\web\src\__tests__\cost-api-unwrap.test.ts' was already read 10s ago in this session and is unchanged (mtime 1782319143531). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### User | 2026-06-24T16:42:19.630Z

[tool_result] No files found

### Assistant | 2026-06-24T16:42:22.216Z

I see the file is already in my context from the earlier session. Let me work from that knowledge directly. The file was read 10 seconds ago in this session and hasn't changed. Based on the standing goal and context, I'm auditing the cost-api-unwrap.test.ts file for the charlie quoting galaxy.

Let me use Grep to extract the actual test content since Read has cached it:

### Assistant | 2026-06-24T16:42:22.542Z

[tool_use: Grep]

### User | 2026-06-24T16:42:23.599Z

[tool_result] 1:// @vitest-environment jsdom
2:/**
3: * T-COSTPAGE-SHAPE (FE half) -- the /api/v1/cost/{estimate,quote} routes return the engine result WRAPPED
4: * as `{ result: <body> }`, but web/src/api/cost.ts's `post`/`get` typed the response as the bare body
5: * (`CostEstimate`) and CostEstimatorPage derefs `res.per_part_cost` directly -> `undefined.toFixed()` crash.
6: * `unwrapResult` peels `body.resul
... [+4706 chars truncated]

### Assistant | 2026-06-24T16:42:45.577Z

Perfect. Now I have the full test content. Let me conduct the adversarial audit against the R9/R12 criteria:

## AUDIT FINDINGS

**GRADE: PASS** (with 2 commendations, 0 blockers)

---

### 1. REAL REFERENCE-VALUE ASSERTS ✅
**PASS** — Lines 31–33, 76–78, 84: Use concrete domain values, NOT toBeDefined() stubs.
- `per_part_cost: 42.5` ✅ (line 31, 76, 84)
- `total_cost: 1062.5` ✅ (line 32, 77)
- `breakdown.machine: 18.3` ✅ (line 33, 78)

These are verifiable—feShape() (lines 20–25) is a stable function that returns the same reference structure. The values have semantic meaning: they're what the page dereferences to avoid crashing.

---

### 2. COVERAGE: ALL REQUIRED PATHS ✅

| Path | Lines | Status |
|------|-------|--------|
| **unwrap happy path** | 29–34 | ✅ `{ result: X } -> X` + reference values |
| **Identity (bare body)** | 36–39 | ✅ Returns same ref, no `result` key |
| **Identity (arrays, primitives, null)** | 41–47 | ✅ Graceful fallback, never over-peels |
| **Nested result guard** | 49–52 | ✅ Only outer `result` peeled, inner intact |
| **Integrated costApi.estimate round-trip** | 71–79 | ✅ Wrapped wire -> bare CostEstimate |
| **Graceful bare fallback** | 81–85 | ✅ route returns bare body → still works |
| **Error path (non-ok)** | 94–99 | ✅ Status error → throws with message |
| **NEGATIVE CONTROL (R9)** | 87–92 | ✅ Wrapped body direct-deref = undefined ⚠️ |

All 7 required paths covered. **The negative control is correctly adversarial:** line 89 casts the wrapped body as if the page read it directly → `per_part_cost` is indeed undefined (line 90). Line 91 proves the unwrap fixes it.

---

### 3. NEGATIVE CONTROL TEETH (R9 adversarial proof) ✅

**Lines 87–92 are STRONG:**
```typescript
const wrapped = { result: feShape() } as unknown as CostEstimate;
expect(wrapped.per_part_cost).toBeUndefined();   // the exact pre-fix crash source
expect(unwrapResult<CostEstimate>(wrapped).per_part_cost).toBe(42.5); // the fix
```

This proves:
- The bug: `wrapped.per_pa
... [+4710 chars truncated]
