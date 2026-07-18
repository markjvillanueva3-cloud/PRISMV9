---
type: "chat-session"
source: "claude-code-cli"
session_id: "49ed5a8b-21b3-4cf8-a533-ef32fdab96a4"
title: "Audit a NEW companion test for real coverage. Read both end-to-end: - TEST: `H:/"
date: "2026-06-24"
first_ts: "2026-06-24T00:35:32.140Z"
last_ts: "2026-06-24T00:36:31.379Z"
cwd: "H:\\prism\\mcp-server"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/49ed5a8b-21b3-4cf8-a533-ef32fdab96a4/subagents/agent-a74d357d44c579c40.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Audit a NEW companion test for real coverage. Read both end-to-end: - TEST: `H:/

> **claude-code-cli** | 2026-06-24 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/49ed5a8b-21b3-4cf8-a533-ef32fdab96a4/subagents/agent-a74d357d44c579c40.jsonl`

## Transcript

### User | 2026-06-24T00:35:32.140Z

Audit a NEW companion test for real coverage. Read both end-to-end:
- TEST: `H:/prism/mcp-server/src/__tests__/PostVersioningEngine.test.ts` (15 tests, all passing)
- ENGINE: `H:/prism/mcp-server/src/engines/PostVersioningEngine.ts`

The engine is a post-processor revision store (store/history/diff/retrieve over an in-memory Map). The test drives a fake clock (vi.useFakeTimers/setSystemTime) because computeHash salts with Date.now(); the singleton has no reset() so each test uses a unique machine_id.

Verify, then grade PASS or FAIL with P0/P1 + line numbers:
1. The `diff` test's per-line reference values are correct for the two hand-built gcode strings (gA 4 lines, gB 5 lines): unchanged=2, changed=2 (lines 2 and 4), added=1 (line 5 "M30"), removed=0; and config_diffs has exactly 3 entries (controller, aggressiveness, feature added).
2. The two CHARACTERIZATION tests (D1: hash non-determinism from Date.now salt; D2: history.total = page length not true count) genuinely lock the engine's ACTUAL (buggy) behavior and are clearly flagged as defects, not silently asserted as correct.
3. Real coverage: happy + >=3 failure modes (error throws) + >=2 adversarial/characterization. No .skip/.only, no toBeDefined/presence-only stubs.
4. The fake-timer approach is sound (afterEach restores real timers; history sort by generated_at is deterministic under the fake clock).
5. Any flakiness risk from the reset-less shared singleton (cross-test or cross-file machine_id collision).

### Assistant | 2026-06-24T00:35:35.584Z

I'll audit the PostVersioningEngine test file comprehensively. Let me start by reading both the test and the engine.

### Assistant | 2026-06-24T00:35:35.956Z

[tool_use: Read]

### Assistant | 2026-06-24T00:35:36.792Z

[tool_use: Read]

### User | 2026-06-24T00:35:37.178Z

[tool_result] 1	/**
2	 * PostVersioningEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
3	 *
4	 * Post-processor revision tracker: content-addressable-ish store with
5	 * store / history / diff / retrieve over an in-memory Map. Pure logic except
6	 * for the clock, so these tests drive a FAKE clock (vi.useFakeTimers) to make
7	 * the hash + generated_at deterministic and to characterize
... [+10933 chars truncated]

### User | 2026-06-24T00:35:37.533Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\PostVersioningEngine.ts' was already read 5m ago in this session and is unchanged (mtime 1775100222000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-24T00:35:40.050Z

Good — I have the test file. Let me grep the engine file to see the key sections without re-reading it.

### Assistant | 2026-06-24T00:35:41.505Z

[tool_use: Grep]

### Assistant | 2026-06-24T00:35:42.489Z

[tool_use: Grep]

### User | 2026-06-24T00:35:42.535Z

[tool_result] 2: * PostVersioningEngine — Post processor revision tracking and diff
12: *   - Rollback: retrieve any previous version by hash
69:    /** Config differences */
70:    config_diffs: string[];
84:  action: "store" | "history" | "diff" | "retrieve";
96:  /** For diff: two version hashes */
99:  /** For retrieve: version hash */
118:        return this.getHistory(input.machine_id ?? "", input.limit);
... [+679 chars truncated]

### User | 2026-06-24T00:35:44.132Z

[tool_result] 244:export const postVersioningEngine = new PostVersioningEngineImpl();

### Assistant | 2026-06-24T00:35:46.108Z

Now let me examine the core implementation details of the engine:

### Assistant | 2026-06-24T00:35:47.280Z

[tool_use: Grep]

### User | 2026-06-24T00:35:48.287Z

[tool_result] 145-      prism_version: PRISM_VERSION,
146-      label: v.label,
147-    };
148-
149-    this.store.set(hash, version);
150-    return version;
151-  }
152-
153:  private getHistory(machineId: string, limit?: number): VersionHistoryResult {
154-    if (!machineId) throw new Error("machine_id required for history action");
155-
156-    const versions = Array.from(this.store.values())
157-      .fi
... [+1854 chars truncated]

### Assistant | 2026-06-24T00:36:31.379Z

Perfect. Now I have the full picture. Let me analyze the test audit systematically:

## TEST AUDIT: PostVersioningEngine.test.ts

### 1. DIFF TEST REFERENCE VALUES (Lines 158–192)

**Test setup:**
- gA: 4 lines = `"G0 X0\nG1 Z-5\nG1 X10\nM30"` 
  - Line 1: "G0 X0"
  - Line 2: "G1 Z-5"
  - Line 3: "G1 X10"
  - Line 4: "M30"

- gB: 5 lines = `"G0 X0\nG1 Z-3\nG1 X10\nG1 Y5\nM30"`
  - Line 1: "G0 X0"
  - Line 2: "G1 Z-3"
  - Line 3: "G1 X10"
  - Line 4: "G1 Y5"
  - Line 5: "M30"

**Expected line-by-line diff:**
- Line 1: "G0 X0" vs "G0 X0" → **unchanged** (1/2)
- Line 2: "G1 Z-5" vs "G1 Z-3" → **changed** (1/2)
- Line 3: "G1 X10" vs "G1 X10" → **unchanged** (2/2)
- Line 4: "M30" vs "G1 Y5" → **changed** (2/2)
- Line 5: (none) vs "M30" → **added** (1/1)

**Test assertions (lines 176–179):**
- `lines_unchanged: 2` ✓ CORRECT
- `lines_changed: 2` ✓ CORRECT
- `lines_added: 1` ✓ CORRECT
- `lines_removed: 0` ✓ CORRECT (gA has no "extra" lines not in gB)

**Config diffs (line 188):**
- controller: "fanuc" → "haas" ✓
- aggressiveness: 1 → 3 ✓
- features: ["coolant"] → ["coolant", "rigid_tap"] (added "rigid_tap") ✓
- prism_version: same (not counted)

**Count: 3 config_diffs ✓ CORRECT**

### 2. CHARACTERIZATION TESTS (Defects D1 & D2)

**D1 — Non-Deterministic Hash (Lines 100–112):**
- **Intent:** Lock the ACTUAL behavior that contradicts the JSDoc claiming "deterministic" / "content-addressable"
- **Evidence:** `computeHash()` line 232 includes `Date.now()` in the salt: `${Date.now()}`
- **Test:** Same config at t=1M and t=2M produce DIFFERENT hashes
- **Then:** Same config at t=1M AGAIN produces the SAME hash (proves the salt source is the clock, not randomness)
- **Flag:** Clearly labeled "D1 CHARACTERIZATION" with a comment flagging the contradiction (line 106)
- **Status:** NOT a silent assertion of correctness; explicitly marked as a contract defect ✓ CORRECT

**D2 — Mislabeled Total Count (Lines 131–143):**
- **Intent:** Lock the ACTUAL behavior that `total` reports page-l
... [+4611 chars truncated]
