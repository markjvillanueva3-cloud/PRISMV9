---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Holistic review (read-only; PASS/FAIL + P0/P1/P2 + file:line). This is arm A of "
date: "2026-06-17"
first_ts: "2026-06-17T03:47:58.822Z"
last_ts: "2026-06-17T03:49:53.481Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a4c712ee36e8ca0b5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Holistic review (read-only; PASS/FAIL + P0/P1/P2 + file:line). This is arm A of 

> **claude-code-cli** | 2026-06-17 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a4c712ee36e8ca0b5.jsonl`

## Transcript

### User | 2026-06-17T03:47:58.822Z

Holistic review (read-only; PASS/FAIL + P0/P1/P2 + file:line). This is arm A of PRISM's 3-of-3 scrutiny gate for a committed fix to the zulu autonomous build-loop cron.

CHANGE: git-grounded shipped-detection. The build-loop pointer falsely showed the drained C1-C8 capability queue as pending because `parseShipped` read only the bravo brief's `## SHIPPED` prose (which drifted / went missing). The fix adds a git-commit-grounded shipped signal.

Files (read end-to-end):
- H:/prism/scripts/lib/zulu-build-queue.mjs  (new `parseShippedFromCommits` + `buildQueueFromTexts` union via opts.gitLogText)
- H:/prism/scripts/lib/zulu-build-queue.test.mjs  (7 new tests)
- H:/prism/scripts/zulu-build-loop.mjs  (new fail-soft `readShippedCommitsText` execFileSync git log, passed as opts.gitLogText)

Verify:
1. `parseShippedFromCommits` regex `/U-Z(?:BL|ULU-CAP)-((?:C\d+)+)/gi` + inner `C(\d+)` split: correctly extracts C8 from `U-ZBL-C8-...`, C1+C2+C3 from the combined `U-ZULU-CAP-C1C2C3`, and does NOT false-match a bare `C9` in prose (needs the `U-Z<...>-C` prefix). Any over/under-match?
2. `buildQueueFromTexts` union: brief-shipped ∪ git-shipped; legacy brief-only path (no opts.gitLogText) preserved byte-identically.
3. The driver's `readShippedCommitsText`: is it genuinely fail-soft (git absent / not-a-repo / timeout → "" → brief-only fallback, never throws / never fails the cron)? Is `execFileSync` (no shell) used correctly (no shell-injection surface; args array)? maxBuffer/timeout sane?
4. Does the change preserve the cron's exit-code contract (0 ok/drained/disabled; 2 only on unreadable spec)?
5. Tests: real reference values (not stubs), no .skip/.only, cover happy + combined-form + adversarial + back-compat?

Grade PASS/FAIL with file:line. Be concise.

### Assistant | 2026-06-17T03:48:01.919Z

I'll review this committed fix to the zulu autonomous build-loop cron. Let me read all three files end-to-end.

### Assistant | 2026-06-17T03:48:02.458Z

[tool_use: Read]

### Assistant | 2026-06-17T03:48:03.103Z

[tool_use: Read]

### Assistant | 2026-06-17T03:48:03.128Z

[tool_use: Read]

### User | 2026-06-17T03:48:03.886Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-build-queue.mjs -- pure build-queue reader/selector for the ZULU autonomous
4	 * build-loop orchestrator (slot:zulu, 2026-06-15, U-ZULU-BUILDLOOP INCR 1).
5	 *
6	 * WHY: the operator wants "autonomous continuous building". The build-loop driver
7	 * (INCR 2) needs to know WHAT to build next. This is the verifiable pure core (R13):
8	 * given the capability spe
... [+7045 chars truncated]

### User | 2026-06-17T03:48:04.503Z

[tool_result] 1	import { test } from "node:test";
2	import assert from "node:assert/strict";
3	import {
4	  effortRank, idNum, parseEffort, parseCapabilitySpec, parseShipped,
5	  parseShippedFromCommits, computeQueue, buildQueueFromTexts,
6	} from "./zulu-build-queue.mjs";
7	
8	const EM = String.fromCharCode(0x2014); // em-dash for markdown fixtures (source stays ASCII)
9	
10	test("effortRank orders S<M<L<unkno
... [+9715 chars truncated]

### User | 2026-06-17T03:48:05.257Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-build-loop.mjs -- ZULU autonomous build-loop driver (slot:zulu, 2026-06-15,
4	 * U-ZULU-BUILDLOOP INCR 2). The cron-safe orchestration tick for "autonomous
5	 * continuous building".
6	 *
7	 * WHAT IT DOES each run:
8	 *   1. Reads the capability spec + bravo brief (the Obsidian/specs build-queue sources).
9	 *   2. Computes the ranked PENDING queue + next uni
... [+7220 chars truncated]

### Assistant | 2026-06-17T03:48:07.869Z

Now let me verify the regex behavior empirically and check the surrounding contract (the spec source, the actual git log format).

### Assistant | 2026-06-17T03:48:14.419Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:48:15.714Z

[tool_use: Bash]

### User | 2026-06-17T03:48:18.598Z

[tool_result] U-ZBL-C8-SOUL -> ["C8"]
U-ZULU-CAP-C1C2C3 -> ["C1","C2","C3"]
bare C9 prose -> []
lowercase u-zbl-c8 -> ["C8"]
U-ZBL-C8C9 combined-on-ZBL -> ["C8","C9"]
U-ZBL-C8-... then -C5 later in same word -> ["C8"]
U-ZULU-CAP-C10C2 -> ["C10","C2"]
embedded mid-word XU-ZBL-C8 -> ["C8"]
U-ZBLX-C8 (not ZBL-) -> []

### User | 2026-06-17T03:48:22.225Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
NO MATCHES in last 50

### Assistant | 2026-06-17T03:48:24.500Z

Let me check the actual git log to verify the real commit-subject format these units land as, and confirm the test fixtures match reality.

### Assistant | 2026-06-17T03:48:26.442Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:48:27.462Z

[tool_use: Bash]

### User | 2026-06-17T03:48:30.286Z

[tool_result] 03b14647a4 [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C5-TRENDGATE-CONTRACT-FIX (slot:zulu): C5 honored its 'single spike never escalates' contract only once the window was full -- a cold slot's 1-2 breaching samples escalated
1602f254ba [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C8-SOUL-EVOLUTION-ADVISOR (slot:zulu, operator 'build for bravo'): ZuluSoulEvolutionAdvisorEngine -- outcome-based soul evolution (AD
... [+2772 chars truncated]

### User | 2026-06-17T03:48:31.451Z

[tool_result] 295d8ffde4 [MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C2-HERMETIC (slot:zulu): fix scrutiny arm-B P1 -- C2 round-trip test was non-hermetic (wrote orphan U-RT records to the LIVE zulu-task-continuity.json store, accreting unbounded)
dd56b17ebf [MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C1C2C3 (slot:zulu): build+wire 3 hermes-zulu capability engines (multi-wave DAG / task-cont
... [+478 chars truncated]

### Assistant | 2026-06-17T03:48:35.231Z

The real commit history confirms the regex matches actual reality: `U-ZBL-C5`, `U-ZBL-C8`, `U-ZULU-CAP-C1C2C3`, `U-ZULU-CAP-C2-HERMETIC` all exist. Now let me run the tests and verify the spec/brief source files exist with the expected header format.

### Assistant | 2026-06-17T03:48:36.183Z

[tool_use: Bash]

### Assistant | 2026-06-17T03:48:38.284Z

[tool_use: Bash]

### User | 2026-06-17T03:48:39.733Z

[tool_result]   ...
# Subtest: buildQueueFromTexts unions brief + git shipped sources
ok 18 - buildQueueFromTexts unions brief + git shipped sources
  ---
  duration_ms: 0.0871
  ...
# Subtest: buildQueueFromTexts without gitLogText is the legacy brief-only path (back-compat)
ok 19 - buildQueueFromTexts without gitLogText is the legacy brief-only path (back-compat)
  ---
  duration_ms: 0.4762
  ...
1..19
# test
... [+91 chars truncated]

### User | 2026-06-17T03:48:43.524Z

[tool_result] ls: cannot access 'state/shared/slot-briefs/bravo.md': No such file or directory
-rw-r--r-- 1 wompu 197611 18381 Jun 15 09:46 state/shared/specs/HERMES-CAPABILITY-EXPANSION-CANDIDATES-2026-06-15.md
---SPEC HEADERS---
36:### C1 — Dependency-Ordered Multi-Wave DAG Scheduler
54:### C2 — Cross-Session Task Continuity Tracker
72:### C3 — Fleet Health Synthesis Engine
89:### C4 — Delegation Contract Eng
... [+228 chars truncated]

### Assistant | 2026-06-17T03:48:48.372Z

Two important findings here. First, all 19 tests pass. Second, the spec file exists but the brief `state/shared/slot-briefs/bravo.md` does NOT exist — which is precisely the live failure mode this fix addresses (brief unreadable → `readSafe` returns "" → brief-only path saw 0 shipped). Let me confirm the spec headers use em-dash (they do — `### C1 —`) and that `parseCapabilitySpec` handles that, plus verify the live driver output end-to-end and the `extractBlock` em-dash handling.

### Assistant | 2026-06-17T03:48:53.566Z

[tool_use: Bash]

### User | 2026-06-17T03:48:57.193Z

[tool_result] 27:- `state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md` — fleet-control NO-GO root causes
60:- The BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md B-track "fleet-control readiness" blocker explicitly requires "durable task registry visible to Zulu across restarts"
77:- HERMES-CONTROL-READINESS-2026-06-01.md diagnosis: "Fleet-control readiness = NO-GO — governance absent + 12/34 galaxies slot-unadd
... [+1136 chars truncated]

### Assistant | 2026-06-17T03:49:03.060Z

This is the decisive empirical proof: with the real spec (8 candidates C1–C8) + the missing brief (`""`) + the real git log, the git-grounded path correctly drains the queue — `done: [C1..C8], pending: [], next: null`. Before this fix, `parseShipped("")` returned an empty set and all 8 would have shown pending. The fix works against live data.

The `governance`/`fleet-control` strings in the spec are in prose body text (lines 27, 60, 77, etc.), NOT in the `### C<n>` candidate titles, so `computeQueue`'s gated test (which only checks `${c.title} ${c.effort}`) correctly does not false-block any candidate — confirmed `blocked: []`. Let me verify the gated-pattern matching scope once more and check the exit-code contract path for the unreadable-spec case.

### Assistant | 2026-06-17T03:49:07.554Z

[tool_use: Bash]

### User | 2026-06-17T03:49:14.212Z

[tool_result] === unreadable spec -> exit 2 ===
[zbl] capability spec unreadable: C:/Program Files/Git/nonexistent/path/spec.md
exit=2
=== disabled -> exit 0 ===
[zbl] disabled (PRISM_ZBL_DISABLE=1)
exit=0
=== git absent simulation (bad PRISM_ROOT for git -C, real spec via env) ===
git -C non-repo THREW (caught -> would return "") OK

### Assistant | 2026-06-17T03:49:18.709Z

All exit-code contract paths verified: unreadable spec → exit 2, disabled → exit 0, git-on-non-repo throws and is caught (→ `""` → brief-only fallback). 

Let me do one final check on a subtle correctness question: the union semantics in `buildQueueFromTexts` mutate the Set returned by `parseShipped`, and whether `computeQueue`'s gated regex could ever match an effort token or title legitimately. Let me also confirm there's no `.skip`/`.only` and that the test count is honest.

### Assistant | 2026-06-17T03:49:25.141Z

[tool_use: Bash]

### User | 2026-06-17T03:49:31.032Z

[tool_result] === .skip / .only check ===
NONE - clean
=== test count (test( declarations) ===
19
=== toBeDefined/trivial-assert stubs ===
NONE - all real assertions
=== verify parseShipped Set is fresh per call (no shared mutable state leak) ===
call A done (git C1): [ 'C1' ] | call B done (no shipped): []
OK: no cross-call Set leakage

### Assistant | 2026-06-17T03:49:53.481Z

All checks pass. I have read all three files end-to-end, verified the regex empirically against adversarial inputs and the real git history, run the full test suite (19/19), and proved the fix against live data. Here is my verdict.

---

VERDICT: PASS

summary: The git-grounded shipped-detection fix is correct, well-tested, and genuinely fixes the live regression. Empirically verified against real data: with the spec's 8 candidates (C1–C8) and the actually-missing brief (`state/shared/slot-briefs/bravo.md` does not exist on disk — the exact failure mode), the new `gitLogText` path correctly drains the queue (`done:[C1..C8], pending:[], next:null`) where the brief-only path would have falsely shown all 8 pending. The regex matches real commit subjects (`U-ZBL-C5/C8`, `U-ZULU-CAP-C1C2C3`), is fail-soft, preserves the exit-code contract, and the legacy path is byte-identical.

findings:
- none (P0/P1/P2)

What I verified (auditable basis for the PASS):

1. **Regex correctness** (`zulu-build-queue.mjs:107-108`) — `/U-Z(?:BL|ULU-CAP)-((?:C\d+)+)/gi` + inner `C(\d+)` split. Empirically confirmed: extracts `C8` from `U-ZBL-C8-...`, `C1/C2/C3` from combined `U-ZULU-CAP-C1C2C3`, `C10/C2` from `U-ZULU-CAP-C10C2` (multi-digit safe), and does NOT match bare `C9` in prose (requires the `U-Z<...>-C` prefix). The `-C5` in a trailing word like `U-ZBL-C8-fix-C5-ref` is correctly NOT captured (the C-run must be contiguous right after the prefix) — under-match here is the safe direction (a non-shipped unit is never falsely marked done). `U-ZBLX-C8` correctly does not match. No over/under-match against real data.

2. **Real-history match** — confirmed the actual commit subjects in the last 400 commits (`U-ZBL-C4/C5/C6/C7/C8`, `U-ZULU-CAP-C1C2C3`, `U-ZULU-CAP-C2-HERMETIC`) are exactly the forms the regex targets; the test fixtures (`test.mjs:152-185`) mirror reality, not invented strings.

3. **Union semantics** (`zulu-build-queue.mjs:143-149`) — brief-shipped ∪ git-shipped via mutating
... [+1834 chars truncated]
