---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Analyst review (arm C of PRISM 3-of-3; read-only; concise PASS/FAIL + file:line)"
date: "2026-06-17"
first_ts: "2026-06-17T03:53:52.263Z"
last_ts: "2026-06-17T03:55:16.989Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a5b0d492b9c9bdeb1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Analyst review (arm C of PRISM 3-of-3; read-only; concise PASS/FAIL + file:line)

> **claude-code-cli** | 2026-06-17 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a5b0d492b9c9bdeb1.jsonl`

## Transcript

### User | 2026-06-17T03:53:52.263Z

Analyst review (arm C of PRISM 3-of-3; read-only; concise PASS/FAIL + file:line). Weight toward SILENT breakage, regression risk, I/O security, error-budget completeness, and integration coupling. Do NOT assume arms A/B caught everything.

Committed fix: git-grounded shipped-detection for the zulu autonomous build-loop cron (so a drifted/missing bravo brief can no longer make the cron show a drained C1-C8 queue as pending). Files:
- H:/prism/scripts/lib/zulu-build-queue.mjs (parseShippedFromCommits w/ per-line revert-skip; buildQueueFromTexts unions brief+git shipped via opts.gitLogText)
- H:/prism/scripts/lib/zulu-build-queue.test.mjs (8 new tests, 20/20 pass)
- H:/prism/scripts/zulu-build-loop.mjs (fail-soft execFileSync `git log --oneline -400` -> opts.gitLogText)

Focus:
1. SILENT BREAKAGE: does the new git-read path ever change behavior for an EXISTING caller of buildQueueFromTexts that passes no opts.gitLogText? (back-compat must be exact). Does any OTHER consumer import parseShipped/buildQueueFromTexts and get affected?
2. INTEGRATION COUPLING: the driver now spawns `git` every cron run. Is there a perf/contention risk (git log -400 on a busy shared repo) — and is the 15s timeout + fail-soft adequate so a slow/locked git never stalls or fails the cron?
3. I/O SECURITY: execFileSync args are a fixed array (no user input) — confirm no injection surface. Is ROOT (`process.env.PRISM_ROOT||"H:/prism"`) a trust concern (env-controlled `-C` path)?
4. ERROR BUDGET: if git returns partial output (truncated at maxBuffer 8MB) — does parseShippedFromCommits still behave (just sees fewer commits)? Any throw path uncaught?
5. The revert-skip `/\brevert\b/i` per line — could it WRONGLY drop a legit ship whose subject contains "revert" in prose (e.g. "U-ZBL-C9 add revert-safety to X")? Assess false-negative risk vs the false-positive it fixes.

Concise verdict PASS/FAIL + file:line.

### Assistant | 2026-06-17T03:53:55.902Z

I'll analyze the committed fix for the zulu build-loop git-grounded shipped-detection. Let me start by reading the changed files.

### Assistant | 2026-06-17T03:53:56.279Z

[tool_use: Read]

### Assistant | 2026-06-17T03:53:56.757Z

[tool_use: Read]

### Assistant | 2026-06-17T03:53:57.023Z

[tool_use: Read]

### User | 2026-06-17T03:54:01.553Z

[tool_result] read-once-guard: 'H:\prism\scripts\zulu-build-loop.mjs' was already read 6m ago in this session and is unchanged (mtime 1781648172130). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T03:54:02.856Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-build-queue.mjs -- pure build-queue reader/selector for the ZULU autonomous
4	 * build-loop orchestrator (slot:zulu, 2026-06-15, U-ZULU-BUILDLOOP INCR 1).
5	 *
6	 * WHY: the operator wants "autonomous continuous building". The build-loop driver
7	 * (INCR 2) needs to know WHAT to build next. This is the verifiable pure core (R13):
8	 * given the capability spe
... [+7412 chars truncated]

### User | 2026-06-17T03:54:03.009Z

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
... [+10376 chars truncated]

### Assistant | 2026-06-17T03:54:08.067Z

Now let me trace the consumers. First, the driver file (`zulu-build-loop.mjs`) which I read earlier but need the current relevant section, and any other consumers of these functions.

### Assistant | 2026-06-17T03:54:09.191Z

[tool_use: Grep]

### Assistant | 2026-06-17T03:54:10.465Z

[tool_use: Grep]

### User | 2026-06-17T03:54:20.210Z

[tool_result] CLAUDE.md:40:- 2026-06-15 | **[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-PARSESHIPPED-LESSON (slot:zulu): wiki + CLAUDE.md regression record for the parseShipped prose-miscou...** | observed-in: 439532e7a | fix: see commit | verify: `git -C H:/prism show 439532e7a`
CLAUDE.md:41:- 2026-06-15 | **[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-PARSESHIPPED-PROSE-FIX (slot:zulu): parseShipped miscounted an inline-prose
... [+13262 chars truncated]

### User | 2026-06-17T03:54:20.495Z

[tool_result] 19- * operator-gated units are surfaced as BLOCKED and never emitted as the next unit.
20- *
21- * Knobs: PRISM_ZBL_DISABLE=1 (no-op), PRISM_ZBL_OLLAMA_DISABLE=1 (skip digest),
22: *        PRISM_ZBL_OLLAMA_MODEL, PRISM_OLLAMA_URL, PRISM_ROOT.
23- * Exit: 0 ok / 0 drained / 0 disabled (never fails a cron); 2 only on unreadable sources.
24: * ASCII-only. Uses global fetch (Node 22) for Ollama + a r
... [+1757 chars truncated]

### Assistant | 2026-06-17T03:54:24.454Z

The grep confirms `buildQueueFromTexts` has exactly ONE production consumer: `scripts/zulu-build-loop.mjs:122`. No other importer. Let me read the driver's spec/brief read path and how it consumes the queue result to confirm the integration contract end-to-end.

### Assistant | 2026-06-17T03:54:24.840Z

[tool_use: Read]

### User | 2026-06-17T03:54:25.946Z

[tool_result] 104	    return String(j.response || "").replace(/\s+/g, " ").trim().slice(0, 600);
105	  } catch { return ""; }
106	}
107	
108	function atomicWriteJson(p, obj) {
109	  const dir = path.dirname(p);
110	  fs.mkdirSync(dir, { recursive: true });
111	  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
112	  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
113	  fs.renameSync(tmp, p);
11
... [+1655 chars truncated]

### Assistant | 2026-06-17T03:54:33.761Z

I have the full picture now. Let me verify one edge concern on the revert regex against real ZBL commit subjects in the actual git log, and confirm the `readSafe` behavior for the brief (so I can assess whether the union truly fixes the live failure without a new path silently breaking).

### Assistant | 2026-06-17T03:54:35.108Z

[tool_use: Grep]

### User | 2026-06-17T03:54:36.684Z

[tool_result] 40:function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
41-
42-/**
43- * Read recent commit subjects for the GIT-REALITY shipped signal. The brief's
44- * "## SHIPPED" prose drifts\goes missing (live: bravo.md was unreadable while C1-C8
45- * were shipped -> the pointer falsely showed the whole queue pending). Commit subjects
46- * (U-ZBL-C<n> \ U-ZULU-CAP-C<n>)
... [+1001 chars truncated]

### Assistant | 2026-06-17T03:54:37.082Z

[tool_use: Bash]

### User | 2026-06-17T03:54:42.032Z

[tool_result] NO revert-line collisions with a U-ZBL/U-ZULU-CAP C-marker in last 400 commits

### Assistant | 2026-06-17T03:55:16.989Z

I have everything needed to render a verdict. Let me synthesize the analysis across the five focus areas.

**Trace results:**
- `buildQueueFromTexts` has exactly ONE production consumer: `scripts/zulu-build-loop.mjs:122`, plus the test file. No other importer (grep confirmed).
- `parseShipped` / `parseShippedFromCommits` are only consumed inside `buildQueueFromTexts` and the test file. No external consumer.
- Real git-log check: zero `revert`+`U-ZBL/U-ZULU-CAP-C<n>` collisions in the last 400 commits.

**1. Silent breakage (back-compat):** `buildQueueFromTexts(specText, briefText)` with no `opts` → `opts={}` default → `if (opts.gitLogText)` is falsy → git path skipped, identical to legacy `parseShipped`-only behavior (zulu-build-queue.mjs:151). The legacy test at test:224 pins this. The driver always passes `gitLogText`, but a `""` from a failed git read is also falsy, so it cleanly degrades to brief-only. No back-compat break. Clean.

**2. Integration coupling / perf:** `git log --oneline -400` is read-only, no working-tree lock contention (only `.git/index` reads, no `index.lock` taken by `log`). 15s timeout + `catch → ""` fail-soft means a slow/locked git can never stall or fail the cron. Worst case the cron degrades to brief-only — the exact pre-fix behavior. Acceptable.

**3. I/O security:** `execFileSync("git", [fixed array])` — no shell, no user input in args, zero injection surface (zulu-build-loop.mjs:52). `ROOT` is env-controlled (`PRISM_ROOT||"H:/prism"`) but it's only a `-C <dir>` path to a read-only `git log`; an attacker who can set `PRISM_ROOT` in the cron's env already controls the spec/brief paths and the whole process — no privilege escalation introduced. Not a new trust concern.

**4. Error budget:** maxBuffer 8MB truncation throws `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`, which is caught by the bare `catch { return "" }` (zulu-build-loop.mjs:55) → degrades to brief-only, not a crash. `parseShippedFromCommits` is pure, `String(x||"")`-guarded, never th
... [+4119 chars truncated]
