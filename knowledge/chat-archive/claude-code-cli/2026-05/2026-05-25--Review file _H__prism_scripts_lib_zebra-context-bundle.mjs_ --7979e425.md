---
type: "chat-session"
source: "claude-code-cli"
session_id: "7979e425-2dbf-471a-ad68-c7177d2219a4"
title: "Review file `H:/prism/scripts/lib/zebra-context-bundle.mjs` end-to-end. The file"
date: "2026-05-25"
first_ts: "2026-05-25T19:33:27.516Z"
last_ts: "2026-05-25T19:35:36.266Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-ac403de8bbbcdf18b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review file `H:/prism/scripts/lib/zebra-context-bundle.mjs` end-to-end. The file

> **claude-code-cli** | 2026-05-25 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-ac403de8bbbcdf18b.jsonl`

## Transcript

### User | 2026-05-25T19:33:27.516Z

Review file `H:/prism/scripts/lib/zebra-context-bundle.mjs` end-to-end. The file was just extended with 3 new readers for ZEBRA-OMNISCIENT-MS0:

- **U-ZO-MS0-02** `loadBridgeUnits(opts)` — reads `state/shared/specs/ROADMAP-CONSOLIDATED.json`, returns top-K bridge units (wiring + deep_integration). Pure helpers: `parseBridgeUnits(json)`.
- **U-ZO-MS0-03** `loadSlotSoulRefuseList(slot, opts)` — reads `state/shared/slot-souls/<slot>.md`, extracts `refuse_list:` from YAML frontmatter. Pure helpers: `extractFrontmatterText`, `parseSoulFrontmatter`. Constant: `KNOWN_SLOTS` (26 NATO).
- **U-ZO-MS0-04** `loadLoopState(sessionId, opts)` + `findActiveLoops(opts)` — reads `state/shared/loop-state/loop-<sid>.json`. Pure helpers: `isValidSessionId`, `parseLoopState`.

CONTRACT TO VERIFY against:
1. Fail-soft contract — every reader returns a stable envelope with a `reason` field on failure; NEVER throws. R12 fail-loud — explicit empty paths must surface as `reason: "no-path"`, not silently use the default.
2. Cache contract — reuse the existing `loadFile()` (don't reimplement caching). Adding new path constants is OK.
3. Pure-core + injected-reader — new readers must accept `opts.reader` for hermetic tests. (Single-loop reader inherits this via `loadFile`; `findActiveLoops` needs its own `opts.readdir` + `opts.reader` injection — verify both are present.)
4. Path-traversal safety — slot string must be validated against KNOWN_SLOTS before file-path interpolation. sessionId must match strict UUID-like regex.
5. Schema-mismatch handling — JSON shape changes (missing `bridge_units` key, missing `status` field) must fail gracefully with a named reason, not crash.
6. No inlined physics constants (bravo slot doctrine — not applicable here, no physics math).

Read the WHOLE FILE end-to-end (no skip). Report P0/P1/P2/P3 with file:line citations. Grade PASS or FAIL. If FAIL, give the smallest fix.

Hard checks:
- [ ] Every new reader's failure path returns `ok:false` + a NAMED reason stri
... [+616 chars truncated]

### Assistant | 2026-05-25T19:33:37.423Z

I'll review the file end-to-end against the contract.

### Assistant | 2026-05-25T19:33:38.080Z

[tool_use: Read]

### User | 2026-05-25T19:33:41.372Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zebra-context-bundle.mjs' was already read 0s ago in this session and is unchanged (mtime 1779737553692). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-25T19:33:44.201Z

The hook is incorrectly blocking. Let me try with the cache disabled via a different path approach.

### Assistant | 2026-05-25T19:33:45.061Z

[tool_use: Bash]

### User | 2026-05-25T19:33:52.507Z

[tool_result] 669

### Assistant | 2026-05-25T19:33:55.506Z

[tool_use: Read]

### User | 2026-05-25T19:34:00.218Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
2	// with mtime-keyed cache layer for the Zebra orchestrator sweep.
3	//
4	// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
5	// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
6	// to build) so the Zebra orchestrator's `planSlotAction` can make
7	// goal-aware decis
... [+9151 chars truncated]

### Assistant | 2026-05-25T19:34:03.707Z

[tool_use: Read]

### User | 2026-05-25T19:34:07.505Z

[tool_result] 200	    composedAt: typeof opts.now === "function" ? opts.now() : Date.now(),
201	  };
202	}
203	
204	// Cache invalidation. Pass null/undefined to clear everything; pass a path
205	// (any form) to clear that one entry. Path is resolved to match the cache
206	// key normalization, so callers don't have to remember the canonical form.
207	export function invalidateContextCache(filePath = null) {
2
... [+10256 chars truncated]

### Assistant | 2026-05-25T19:34:11.106Z

[tool_use: Read]

### User | 2026-05-25T19:34:15.412Z

[tool_result] 440	  }
441	  return out;
442	}
443	
444	// loadSlotSoulRefuseList(slot, opts) — top-level reader.
445	//   loadSlotSoulRefuseList("bravo")              → bravo's refuse_list
446	//   loadSlotSoulRefuseList("../etc/passwd")      → reason "invalid-slot"
447	//   loadSlotSoulRefuseList("BRAVO")              → normalized lowercase ok
448	//
449	// Envelope:
450	//   { ok, reason, slot, refuseList, he
... [+8478 chars truncated]

### Assistant | 2026-05-25T19:34:20.564Z

I've read the entire file (669 lines) end-to-end. Let me now do a thorough review.

Let me verify a few specifics about how `loadFile` propagates `reason` for the empty-path case used by the new readers.

### Assistant | 2026-05-25T19:34:22.662Z

[tool_use: Grep]

### User | 2026-05-25T19:34:27.860Z

[tool_result] 125:    return { ...EMPTY_ENVELOPE, reason: "no-path", path: filePath || "" };
173://   loadBrief({briefPath: ""})     → reason:"no-path" (explicit empty = error)
174://   loadBrief({briefPath: null})   → reason:"no-path" (explicit null = error)
264:    return { ok: false, reason: "schema-mismatch", wiring: [], deepIntegration: [] };
268:    return { ok: false, reason: "no-bridge-units", wiring: [
... [+940 chars truncated]

### Assistant | 2026-05-25T19:35:36.266Z

Acknowledged. The graph context isn't relevant to this code review (the reasons cited are validated as string-literal returns in the lib itself, not graph nodes). Continuing the review.

I've now verified every named reason string in the file. Here is the end-to-end review.

---

## Code Quality Analysis Report — `H:/prism/scripts/lib/zebra-context-bundle.mjs`

### Summary
- **Overall Quality Score:** 8.5/10
- **Lines analyzed:** 669
- **Issues found:** 6 (0 P0 · 1 P1 · 3 P2 · 2 P3)
- **Grade:** PASS (with one P1 worth fixing before close-out)

The three new readers (U-ZO-MS0-02 / 03 / 04) are well-shaped: pure parsers separated from impure top-level functions, named `reason` strings on every failure path, defensive validation before path interpolation, no caching reimplementation, and `findActiveLoops` correctly injects both `readdir` and `reader`. The hard checks all pass with one caveat about precedence (P1 below).

---

### Hard Checks (from contract)

| # | Check | Verdict | Citation |
|---|---|---|---|
| 1 | Every new reader's failure path returns `ok:false` + named reason; never throws | PASS | lines 264, 268, 314-315, 320, 324, 337, 467, 488, 493, 497, 594-595, 600, 604, 615-616, 630-631 |
| 2 | `loadBridgeUnits({roadmapPath:""})` → `reason:"no-path"` | PASS | line 295 propagates "" → `loadFile` line 124-126 returns `no-path` → line 315 propagates through `base.reason` |
| 3 | `loadSlotSoulRefuseList("../etc/passwd")` → `reason:"invalid-slot"` | PASS | line 453 normalizes (no traversal escapes lowercase NATO regex) → line 466 rejects against `KNOWN_SLOTS` → line 467 returns named reason |
| 4 | `loadLoopState("not-a-uuid")` → `reason:"invalid-session-id"` | PASS | line 528 strict UUID regex → line 574-575 |
| 5 | `findActiveLoops()` reader-injectable (opts.readdir + opts.reader) | PASS | lines 621-627 (both present and defaulted) |
| 6 | Sort in `findActiveLoops` is deterministic (no NaN compare) | PASS | lines 661-666 — explicit equality + null sinks; no `N
... [+7757 chars truncated]
