---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "You are the content-specialist reviewer (Reviewer A) for MS-PRINT-PROGRAM-LOOP /"
date: "2026-05-15"
first_ts: "2026-05-15T15:35:29.691Z"
last_ts: "2026-05-15T15:36:57.690Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-aa4292c9a21e96a05.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# You are the content-specialist reviewer (Reviewer A) for MS-PRINT-PROGRAM-LOOP /

> **claude-code-cli** | 2026-05-15 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-aa4292c9a21e96a05.jsonl`

## Transcript

### User | 2026-05-15T15:35:29.691Z

You are the content-specialist reviewer (Reviewer A) for MS-PRINT-PROGRAM-LOOP / U-PPL-D1 — a multi-file build. Per CLAUDE.md per-file scrutiny gate, you review THIS file end-to-end BEFORE the next file in the build is written.

**FILE UNDER REVIEW:** `H:\prism\mcp-server\src\engines\ProgramPrintLinkIndexEngine.ts` (~520 LOC, just created)

**WHAT IT DOES:** Composite link index that extends `BlueprintProgramJoinEngine` (lives at `H:\prism\mcp-server\src\engines\BlueprintProgramJoinEngine.ts`, the U-DOCU-04 query layer) with TWO new capabilities:
  1. Enhanced JM-Die part-number normalizer that handles customer-suffixed forms the parent normalizer misses: `T8047D3 ITW`, `C2500-2497 SCREWS`, `9082526 AGRATI`, `BU-1365-0000-002 TFI`. Plus shop-floor descriptors (SETUP / SIDE-A / SIDE-B / REWORK / space-separated OP10).
  2. Program-side seed augmentation — given a list of program file paths, find programs the v6 join missed but whose filename-extracted PN candidates DO exist in the join (rescuing the customer-prefixed misses).

Also exposes composite lookup APIs (`lookupPrintForProgram`, `lookupProgramsForPrint`) and a `coverageReport` that combines join-side breakdown + seed stats + a disk-side gap walk.

**CONTRACT MUST PRESERVE:**
- BlueprintProgramJoinEngine's APIs are UNCHANGED. This engine COMPOSES, never forks.
- Path safety: all program paths from the v6 JSONL are untrusted Python-emitted data. The engine itself is pure-transform (no disk I/O on those paths) — but the docblock claims this. Verify the engine doesn't actually do any file I/O on path inputs.
- FAIL-LOUD per CLAUDE.md R12: `loadLinkIndex` must propagate (not swallow) `loadJoinIndex`'s throws on missing/corrupt join file.
- Idempotence: `normalizeJMDiePN` must hit a fixed point — applying it to its own output must return the same string.
- No physics constants involved (this is a parsing/indexing engine, not physics).

**SPECIFIC CONCERNS TO VERIFY (please trace each through the actual code, end-to
... [+3521 chars truncated]

### Assistant | 2026-05-15T15:35:34.975Z

I'll review the file end-to-end, cross-referencing the parent engine.

### Assistant | 2026-05-15T15:35:35.228Z

[tool_use: Read]

### User | 2026-05-15T15:35:36.757Z

[tool_result] 1	/**
2	 * ProgramPrintLinkIndexEngine — composite program↔print link index.
3	 *
4	 * MS-PRINT-PROGRAM-LOOP / U-PPL-D1 (Track D)
5	 *
6	 * COMPOSITION (does NOT fork BlueprintProgramJoinEngine):
7	 *
8	 *   BlueprintProgramJoinEngine (loadJoinIndex / programForPrint / printForProgram)
9	 *   = the BLUEPRINT-side seed: every blueprint page → search for matching programs
10	 *   = ships in U-DOCU-0
... [+29557 chars truncated]

### Assistant | 2026-05-15T15:36:57.690Z

I have the file content from the read. Let me trace through each concern carefully without re-reading.

Tracing concern #1 — Normalizer correctness:

**`T8047D3 ITW`**: trim/upper → `T8047D3 ITW`. CUSTOMER_SUFFIX_RE strips ` ITW` → `T8047D3`. Fixed-point loop continues, no more matches. Then CUSTOMER_PREFIX_MULTI_RE: needs `[A-Z]{2,3}-(?=\d)` — `T8047D3` has no dash after letters, NO match. Falls to CUSTOMER_PREFIX_LETTER_RE: `^([A-Z])(?=\d)` matches `T` (followed by `8`). `s.length - 1 = 6 >= 4`, strip → `8047D3`. Then `parentNormalizePN("8047D3")`. **Expected `8047D3` per docblock ✓**

**`C2500-2497 SCREWS`**: → `C2500-2497 SCREWS`. Strip ` SCREWS` → `C2500-2497`. No multi-letter prefix (only 1 letter before dash). Single-letter `C` followed by `2`, remainder `2500-2497` (length 9) ≥4, strip → `2500-2497`. Parent normalizes → **`2500-2497` ✓**

**`9082526 AGRATI`**: → strip ` AGRATI` → `9082526`. No letter prefix. Parent → **`9082526` ✓**

**`BU-1365-0000-002 TFI`**: → strip ` TFI` → `BU-1365-0000-002`. CUSTOMER_PREFIX_MULTI_RE: `^([A-Z]{2,3})-(?=\d)` — matches `BU-`. Remainder length `16-3=13` ≥4, strip → `1365-0000-002`. Parent → **`1365-0000-002` ✓**. Order is correct (multi tried first).

Tracing concern #2 — Edge cases:

- Empty string: line 263 returns `""` early ✓
- Whitespace-only: trim makes length 0 → returns `""` ✓
- Idempotent: applying to output. `"8047D3"` → trim/upper unchanged. No suffix match. No multi-prefix. Single-letter: `^[A-Z](?=\d)` — but `8047D3` starts with digit, NO match. Parent normalizes (might strip trailing `D3`? — per docblock, parent's material-code RE requires leading dash, so D3 stays). Idempotent ✓
- Input entirely customer suffix `" ITW"`: trim/upper → `ITW`. SUFFIX_RE requires `\s+` before suffix — NO leading whitespace, NO match. Falls through to prefix check: `^([A-Z]{2,3})-` — no dash, no match. Single-letter `^[A-Z](?=\d)` — `I` not followed by digit, no match. Parent returns whatever it does with `ITW`. Returns possibly 
... [+10426 chars truncated]
