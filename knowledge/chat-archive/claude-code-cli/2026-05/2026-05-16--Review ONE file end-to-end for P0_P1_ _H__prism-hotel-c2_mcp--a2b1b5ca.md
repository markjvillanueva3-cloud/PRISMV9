---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review ONE file end-to-end for P0/P1: `H:/prism-hotel-c2/mcp-server/src/engines/"
date: "2026-05-16"
first_ts: "2026-05-16T04:44:05.091Z"
last_ts: "2026-05-16T04:45:43.848Z"
cwd: "h:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-aa5435476d386135f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review ONE file end-to-end for P0/P1: `H:/prism-hotel-c2/mcp-server/src/engines/

> **claude-code-cli** | 2026-05-16 | 15 msgs (6 user / 9 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-aa5435476d386135f.jsonl`

## Transcript

### User | 2026-05-16T04:44:05.091Z

Review ONE file end-to-end for P0/P1: `H:/prism-hotel-c2/mcp-server/src/engines/WeeklySynthesisEngine.ts` (OBSIDIAN-INTELLIGENCE-MS3 / B4 U-WEEKLY-SYNTHESIS).

It is a Sunday-8PM retro: reads the last 7 `DAILY-CONTEXT-YYYY-MM-DD.md` files (emitted by sibling B1 `DailyContextWorkflowEngine.ts` into `<vaultRoot>/generated/`), calls Ollama qwen2.5-coder:7b, writes a 4-section retro to `<vaultRoot>/generated/WEEKLY-<weekIso>.md`. It mirrors the established sibling pattern — read `H:/prism-hotel-c2/mcp-server/src/engines/DailyContextWorkflowEngine.ts` (B1) as the convention reference (zod strict, DI loader/summarizer, CLI guard, WIRE-EXEMPT header). It imports `weekIsoUTC`/`mondayUTC` from `./ConnectionFinderEngine.js` (B2) — read those two functions to confirm correct usage.

Unit spec exit conditions to verify the code satisfies:
- Sun-8PM cron writes `knowledge/memories/generated/WEEKLY-YYYY-Www.md`
- 4 sections: Moved / Didn't move / Emerging patterns / Top-3 next-week leverage
- Reads last 7 DAILY-CONTEXT files for input
- Test: dry-run on a 7-day fixture produces all 4 sections

Scrutinize specifically:
1. `hasAllSections`/`missingSections` — the regex `^##\s+<esc>\s*$` with `im` flags: does it correctly require an exact `## Section` header line? The section label "Didn't move" contains an apostrophe and "Top-3 next-week leverage" contains digits+hyphens — confirm the `replace(/[.*+?^${}()|[\]\\]/g,...)` escape is correct (note: `-` is NOT escaped — is that safe here since it's not in a char class?). Any ReDoS? Could a section header inside a fenced code block or as `### Moved` false-match/false-miss?
2. `defaultLoader` 7-day window: `windowStart = anchor - 6 days`; filter `date >= startIso && date <= endIso`; then `slice(len-7)`. Is the window correct (7 inclusive days ending on anchor)? `parseDailyContextDate` regex. String date comparison `date < startIso` — safe for YYYY-MM-DD lexical compare? The `mondayUTC` import is `void`-ed (unused) — flag if that's dead w
... [+723 chars truncated]

### Assistant | 2026-05-16T04:44:11.337Z

I'll review the file end-to-end. Let me start by reading the target file and its convention references.

### Assistant | 2026-05-16T04:44:11.817Z

[tool_use: Read]

### Assistant | 2026-05-16T04:44:12.620Z

[tool_use: Read]

### Assistant | 2026-05-16T04:44:13.068Z

[tool_use: Read]

### User | 2026-05-16T04:44:13.085Z

[tool_result] 1	// WIRE-EXEMPT: cron-invoked synthesizer. The engine is a library (importable for tests + dispatcher composition) AND a CLI (--run). Its invocation path — a Sunday-evening scheduled task — ships as a sibling deliverable of this same unit (B4): scripts/cron/weekly-synthesis-cron.ps1. No dispatcher action is required for the cron path; downstream composition (Track G observability) imports the eng
... [+20734 chars truncated]

### User | 2026-05-16T04:44:14.283Z

[tool_result] 1	// WIRE-EXEMPT: cron-invoked synthesizer — wired via scripts/cron/daily-context-cron.ps1 scheduled-task at 06:00 local. Engine is a library (importable for tests + dispatcher composition) AND a CLI (--run) for the scheduled task. No dispatcher action is required for the cron path; downstream composition (Track G observability, future digest pipelines) imports the engine class directly.
2	/**
3	 
... [+17954 chars truncated]

### User | 2026-05-16T04:44:14.662Z

[tool_result] 1	// WIRE-EXEMPT: cron-only consumer. ScheduledTask "PRISM Weekly Connection Brief" (scripts/cron/connection-finder-cron.ps1) invokes the compiled engine directly each Monday 08:00 local. No dispatcher action needed — downstream consumers (Track G overlays, future obsidian-graph injectors) will subscribe via fs.watch on the inbox/ directory.
2	/**
3	 * ConnectionFinderEngine — OBSIDIAN-INTELLIGENC
... [+21039 chars truncated]

### Assistant | 2026-05-16T04:44:19.365Z

I have all three files. Let me also check the test file to verify test coverage of the spec exit conditions.

### Assistant | 2026-05-16T04:44:20.127Z

[tool_use: Glob]

### User | 2026-05-16T04:44:21.005Z

[tool_result] No files found

### Assistant | 2026-05-16T04:44:23.220Z

The test file does not exist yet at the standard path. Let me check more broadly.

### Assistant | 2026-05-16T04:44:23.609Z

[tool_use: Glob]

### User | 2026-05-16T04:44:25.051Z

[tool_result] H:\prism-hotel-c2\mcp-server\src\engines\WeeklySynthesisEngine.ts

### Assistant | 2026-05-16T04:45:43.848Z

The test file does not exist. The unit spec explicitly requires "Test: dry-run on a 7-day fixture produces all 4 sections" — this is an unsatisfied exit condition. I'll flag it. Now my analysis of the engine itself.

---

## Code Quality Analysis Report — WeeklySynthesisEngine.ts

### Summary
- File reviewed: `H:/prism-hotel-c2/mcp-server/src/engines/WeeklySynthesisEngine.ts` (527 lines)
- The engine is well-structured, closely mirrors the B1/B2 sibling pattern, uses DI, closed-enum failure model, zod `.strict()`, AbortController timeout, CLI guard. Most spec exit conditions are met by the engine code.
- Issues found: 1 P0, 3 P1, several P2/P3.

---

### P0 — Required test deliverable is missing

**Spec exit condition unmet:** *"Test: dry-run on a 7-day fixture produces all 4 sections."* No test file exists — `Glob **/*eeklySynthesis*` returns only the engine itself. The B1 sibling has `__tests__/DailyContextWorkflow.test.ts` (referenced in its own header). The unit cannot ship without the fixture-driven test; the engine's whole DI design (`loader`/`summarizer` injection, "fully deterministic when both injected" — lines 33-35) exists precisely to enable this test, and it is currently exercised by nothing.

- **File:** `WeeklySynthesisEngine.ts` (whole unit) — missing sibling `mcp-server/src/__tests__/WeeklySynthesis.test.ts`
- **Severity:** P0 (named exit condition; Karpathy R9/R12 — "tests pass" is a lie if no test exists)
- **Fix:** Add `WeeklySynthesis.test.ts` with: (a) a 7-day fixture loader returning 7 `WeeklySource` objects + a stub summarizer returning text with all 4 headers → assert `ok:true` and the written file contains all 4 `## ` headers; (b) a summarizer stub returning text missing "Didn't move" → assert `ok:false, error:"incomplete-synthesis"`; (c) `no-sources` (loader returns `[]`); (d) `defaultLoader` window correctness — 9 fixture files, assert only the 7 in-window survive; (e) `hasAllSections` true/false cases including the apostrophe and digit-h
... [+11154 chars truncated]
