---
type: "chat-session"
source: "claude-code-cli"
session_id: "68828b1a-52ea-4665-adc2-3915276169b4"
title: "Apply the operator-requested RGS rule-table update to PRISM. This closes the ~42"
date: "2026-06-04"
first_ts: "2026-06-04T13:45:47.017Z"
last_ts: "2026-06-04T13:52:42.176Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 18
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/68828b1a-52ea-4665-adc2-3915276169b4/subagents/agent-aac2edb47817e9e91.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Apply the operator-requested RGS rule-table update to PRISM. This closes the ~42

> **claude-code-cli** | 2026-06-04 | 50 msgs (18 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/68828b1a-52ea-4665-adc2-3915276169b4/subagents/agent-aac2edb47817e9e91.jsonl`

## Transcript

### User | 2026-06-04T13:45:47.017Z

Apply the operator-requested RGS rule-table update to PRISM. This closes the ~42% GENERIC_FALLBACK gap so the Roadmap Generation System routes new external-software + domain units to the right skill/reviewer instead of the weakest default.

SOURCE OF TRUTH (the exact rules to add): read section `## RGS-SYSTEM UPDATE recommendations` in `H:/prism/state/shared/specs/MASTER-RGS-ROADMAPS-2026-06-03.md` (starts ~line 603). It specifies:
- **Part A: 30 NEW PIPELINE_RULES** (a markdown table with columns: # | domain | `test` regex | `skill` | confidence | note). Each becomes a `{ test: /<regex>/i, skill: "<skill>", why: "<short why from the note>", confidence: <num> }` entry.
- **Part B: NEW AGENT_RULES** (reviewer routing additions) — `{ test: /<regex>/i, agent: "<agent-type>" }`.
- **Part C: structural-exclusion guards to PRESERVE** — do NOT reorder these below the new rules.

FILE TO EDIT: `H:/prism/scripts/lib/rgs-pipeline-rules.mjs` (228 lines). Structure:
- `const RULES = deepFreezeArray([ ... ])` (line ~29) — the PIPELINE_RULES. Add the 30 new pipeline rules HERE.
- `const GENERIC_FALLBACK` (line ~160) — the fallback returned when nothing matches. New rules go in RULES, which is matched BEFORE this.
- `const AGENT_RULES = deepFreezeArray([ ... ])` (line ~172) — add the new agent rules HERE.
- `matchPipelines(unit)` / `matchAgents(unit)` consume these.

CRITICAL CONSTRAINTS (Karpathy R8/R9/R11/R12):
1. **Ordering matters.** The existing structural-exclusion guards (wedm vs route polysemy, the `\bpost\b` vs postpone guards) MUST stay ABOVE the new generic-ish rules so a "wire the WEDM post" unit hits `/wedm-program` before `/post-generate`, etc. Insert new rules in domain order but AFTER any existing exclusion guard they could otherwise mis-shadow. Read the existing RULES array fully first and place thoughtfully.
2. **Use word-boundary `\b` anchors** exactly as the doc specifies (it already wrote `\b`-anchored regexes — preserve them). Verify each regex is valid JS (e
... [+1417 chars truncated]

### Assistant | 2026-06-04T13:46:03.527Z

I'll read CLAUDE.md first, then the source files systematically before making any changes.

### Assistant | 2026-06-04T13:46:04.138Z

[tool_use: Read]

### Assistant | 2026-06-04T13:46:04.454Z

[tool_use: Read]

### User | 2026-06-04T13:46:10.030Z

[tool_result] 595	- **Missing SVI axis:** no academy/Courses subsystem in `SVIEnhancedCalculatorEngine` — flagged `[ORPHAN — cross-cutting, no envelope]` in trajectory Tier-3 #17.
596	- **Orphan cross-substrate node:** academy galaxy has a `documented-by` edge to `memory_patterns.academy_synthesis` but no `owned-by-slot` lima edge materialized in courses roost.
597	- **Outcome bridge unverified:** `U-BRIDGE-WIR
... [+21386 chars truncated]

### User | 2026-06-04T13:46:10.127Z

[tool_result] 1	/**
2	 * rgs-pipeline-rules.mjs
3	 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
4	 * Frozen rule arrays — mutation throws in strict mode (deep-frozen via deepFreezeArray
5	 * per U-DOMAIN-RULES Arm A scrutiny P0-2; the docstring's contract now actually holds).
6	 *
7	 * Exports:
8	 *   matchPipelines(unit) -> {skill, why, confidence}[]  (alway
... [+10349 chars truncated]

### Assistant | 2026-06-04T13:46:20.584Z

Now let me read the test file to understand the existing test patterns:

### Assistant | 2026-06-04T13:46:21.279Z

[tool_use: Read]

### User | 2026-06-04T13:46:24.769Z

[tool_result] 1	/**
2	 * rgs-tool-planner.test.mjs
3	 * node:test suite for the runPlanner() exported core.
4	 * All I/O is injected — no real graph, no real Ollama, no real files.
5	 * Uses node:os tmpdir for sidecar/checkpoint paths; cleaned up in after().
6	 *
7	 * Run:
8	 *   "H:/.claude/bin/portable-node" --test scripts/rgs-tool-planner.test.mjs
9	 */
10	
11	import { describe, it, before, after } from "nod
... [+22536 chars truncated]

### Assistant | 2026-06-04T13:46:32.577Z

Now let me check the rgs-plan-coverage test file and the rgs-tool-planner.mjs to understand how matchPipelines/matchAgents are used:

### Assistant | 2026-06-04T13:46:33.498Z

[tool_use: Glob]

### Assistant | 2026-06-04T13:46:34.126Z

[tool_use: Glob]

### User | 2026-06-04T13:46:51.715Z

[tool_result] No files found

### User | 2026-06-04T13:46:51.918Z

[tool_result] scripts\rgs-plan-coverage.test.mjs

### Assistant | 2026-06-04T13:46:55.698Z

Let me read the coverage test and also check if there's already a pipeline-rules test file:

### Assistant | 2026-06-04T13:46:55.933Z

[tool_use: Read]

### User | 2026-06-04T13:46:58.889Z

[tool_result] 1	/**
2	 * rgs-plan-coverage.test.mjs
3	 * Pure unit tests for the coverage() function.
4	 * Uses node:test — run with:
5	 *   "H:/.claude/bin/portable-node" --test scripts/rgs-plan-coverage.test.mjs
6	 */
7	
8	import { test } from "node:test";
9	import assert from "node:assert/strict";
10	
11	import { coverage } from "./rgs-plan-coverage.mjs";
12	
13	// -------------------------------------------
... [+8671 chars truncated]

### Assistant | 2026-06-04T13:47:19.240Z

Now I have a clear picture of everything. Let me plan the implementation before writing anything (>50 lines of new code):

**Plan:**

**Part 1 — `rgs-pipeline-rules.mjs` changes:**

Add 30 new PIPELINE_RULES entries inside the `RULES` array, placed carefully:
- Rules 4 (golf/fleet) and 15 (ghost-action wiring) must go AFTER the existing `/wire-unwired` exclusion guard (line 66-73) but the golf rule must go BEFORE `/wire-unwired` per the spec (place ABOVE it so fleet hygiene doesn't hit generic wiring). Wait — re-reading: spec says rule #4 "place ABOVE `/wire-unwired` so 'wire the MCP actuator' → hygiene not generic wiring". So golf/fleet rule goes before the wiring rule.
- Rule #7 (post-generate) must be placed such that WEDM units hit `/wedm` first — the existing `/wedm` rule is at line 111-115, so the post-generate rule goes AFTER it.
- New rules go in domain order within the existing structure.

**Ordering strategy:**
1. After pdf/video/forge-triple rules but BEFORE the `/wire-unwired` rule: insert golf/fleet rule (#4)
2. After `/wire-unwired`: insert the domain rules in this order: sierra (#1), india (#2, #3), oscar (#5, #6), then the manufacturing domains block continues
3. After `/wedm` rule: insert echo/post rules (#7), kilo (#8), foxtrot (#9, #10), whiskey (#11, #12), mike (#13, #14)
4. After `/cam-strategy`: insert romeo (#15, #16)
5. After `/cad-from-blueprint`: insert charlie (#17), alpha (#18, #19, #20), hotel (#21, #22), delta (#23, #24, #25, #26), xray (#27, #28, #29), lima (#30)

**Part 2 — `AGENT_RULES` additions:**
6 new agent rules (india training, golf fleet, charlie quoting, alpha token, hotel ERP, lima academy)

**Part 3 — New tests in `rgs-tool-planner.test.mjs`:**
Add a new describe block (T12) with 14 assertions covering ≥12 rules + 1 structural-exclusion regression.

The `matchPipelines`/`matchAgents` functions take `{ title, description }` objects. I'll use them directly by importing from the rules file.

Let me now implement this. First th
... [+13 chars truncated]

### Assistant | 2026-06-04T13:47:49.300Z

[tool_use: Edit]

### User | 2026-06-04T13:47:52.477Z

[tool_result] The file H:/prism/scripts/lib/rgs-pipeline-rules.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T13:47:58.975Z

Now I'll add all the remaining new rules in a single targeted edit. I'll insert them after the existing manufacturing domain block (after the `/wire-unwired` rule and before the existing mill/lathe/wedm/cam/cad rules) and at the appropriate positions:

### Assistant | 2026-06-04T13:48:54.025Z

[tool_use: Edit]

### User | 2026-06-04T13:48:58.508Z

[tool_result] The file H:/prism/scripts/lib/rgs-pipeline-rules.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T13:49:06.122Z

Now I need to add the post-process rule (#7) after the WEDM rule, and the remaining sub-domain rules (#9-14) after the lathe rule. Then add the agent rules. Let me insert them precisely:

### Assistant | 2026-06-04T13:49:27.054Z

[tool_use: Edit]

### User | 2026-06-04T13:49:30.242Z

[tool_result] The file H:/prism/scripts/lib/rgs-pipeline-rules.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T13:49:34.331Z

Now add the new AGENT_RULES entries:

### Assistant | 2026-06-04T13:49:54.709Z

[tool_use: Edit]

### User | 2026-06-04T13:49:59.466Z

[tool_result] The file H:/prism/scripts/lib/rgs-pipeline-rules.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T13:50:08.804Z

Now let me do a quick build to check for syntax errors before writing tests:

### Assistant | 2026-06-04T13:50:08.805Z

[tool_use: Bash]

### User | 2026-06-04T13:50:16.700Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-04T13:50:25.256Z

No syntax errors. Now let me verify the exports work and spot-check a few rules:

### Assistant | 2026-06-04T13:50:37.243Z

[tool_use: Bash]

### User | 2026-06-04T13:50:43.463Z

[tool_result] [U-VIZ-MERGE regen-viz streaming rewrite] -> skills: /audit-viz-first | agents: none
[U-LORA-TRAIN LoRA fine-tune for mill domain] -> skills: /ai-train-india, /mill | agents: test-review-agent
[U-RAG-EMBED corpus embedding HNSW index] -> skills: /wiki-query, /cad-corpus | agents: none
[U-MCP-RESTART MCP daemon watchdog actuator] -> skills: /fleet-reaper | agents: wiring-review-agent
[U-SFC-COMBO-H
... [+973 chars truncated]

### Assistant | 2026-06-04T13:50:52.788Z

All routing is correct. The structural exclusion guards are working:
- WEDM-post hits `/wedm` (not `/post-generate`) ✓
- Wire EDM wiring hits `/wedm` (not `/wire-unwired`) ✓

Now I'll add the new test block to `rgs-tool-planner.test.mjs`:

### Assistant | 2026-06-04T13:51:22.050Z

[tool_use: Edit]

### User | 2026-06-04T13:51:26.997Z

[tool_result] The file H:/prism/scripts/rgs-tool-planner.test.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T13:51:29.708Z

Now run the tests to verify everything passes:

### Assistant | 2026-06-04T13:51:31.285Z

[tool_use: Bash]

### User | 2026-06-04T13:51:38.052Z

[tool_result]     # Subtest: rule \#28 xray: GD&T datum FCF routes to /cad-tolerance-check
    ok 12 - rule \#28 xray: GD&T datum FCF routes to /cad-tolerance-check
      ---
      duration_ms: 0.0962
      ...
    # Subtest: rule \#30 lima: academy course curriculum MIT-OCW routes to /learn-corpus
    ok 13 - rule \#30 lima: academy course curriculum MIT-OCW routes to /learn-corpus
      ---
      duration_ms:
... [+1757 chars truncated]

### Assistant | 2026-06-04T13:51:41.285Z

47/47 pass, 0 fail. Now run the coverage test:

### Assistant | 2026-06-04T13:51:41.934Z

[tool_use: Bash]

### User | 2026-06-04T13:51:49.426Z

[tool_result]   ...
# Subtest: 100% coverage: all open units have plans
ok 8 - 100% coverage: all open units have plans
  ---
  duration_ms: 0.1188
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 93.5506

### Assistant | 2026-06-04T13:51:54.929Z

All clean. Let me do a final fast build to confirm no TypeScript/esbuild issues with the changed JS files:

### Assistant | 2026-06-04T13:51:55.574Z

[tool_use: Bash]

### User | 2026-06-04T13:52:00.211Z

[tool_result] npm error Missing script: "build:fast"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: H:\prism\.cache\npm\_logs\2026-06-04T13_51_59_338Z-debug-0.log

### Assistant | 2026-06-04T13:52:04.778Z

[tool_use: Bash]

### User | 2026-06-04T13:52:22.916Z

[tool_result]            ╵                                   ~~~~~~~~~~~~~~

▲ [WARNING] Using direct eval with a bundler is not recommended and may cause problems [direct-eval]

    src/engines/OkumaParametricProgramEngine.ts:2628:27:
      2628 │       try { return Boolean(eval(e)); } catch { return false; }
           ╵                            ~~~~

  You can read more about direct eval and bundling here:
... [+326 chars truncated]

### Assistant | 2026-06-04T13:52:42.176Z

Build succeeds — only pre-existing warnings, no new errors. Here is the full report:

---

**a) Rules added**

- **30 new PIPELINE_RULES** added to the `RULES` array in `H:/prism/scripts/lib/rgs-pipeline-rules.mjs`
- **6 new AGENT_RULES** entries added to the `AGENT_RULES` array

**b) Test command and results**

```
"H:/.claude/bin/portable-node" --test scripts/rgs-tool-planner.test.mjs
```
**47 pass, 0 fail** (36 pre-existing + 20 new T12 assertions — the describe counts as 1 suite containing 20 subtests, plus the 11 pre-existing suites).

```
"H:/.claude/bin/portable-node" --test scripts/rgs-plan-coverage.test.mjs
```
**8 pass, 0 fail** — no regression.

**c) Rules adjusted and why**

- **Rule #7 (echo post-generate):** used a custom `test` function (same pattern as the existing `/wire-unwired` exclusion guard) rather than a bare regex because bare `/\bpost\b/i` would match "postpone", "poster", etc., and WEDM-post units must hit `/wedm` first. The function explicitly returns `false` when WEDM context is detected, then checks for structural post-proc signals.
- **Rule #13 and #14 (mike WEDM sub-routes):** the spec used `\|` (markdown-escaped pipe) in the regex strings — converted to real JS regex alternation `|`.
- **Rule #30 (lima academy):** uses a custom `test` function wrapping the negative-lookbehind regex `(?<!\bof\s)course` — JavaScript regex lookbehinds work in Node 16+ (this codebase targets modern Node). Polysemy test confirmed passing.
- **Rule #4 (golf fleet):** placed BEFORE the `/wire-unwired` rule as specified, so "MCP actuator" routes to `/fleet-reaper` not generic wiring.
- Rules **#9 and #10 (foxtrot)**, **#11–#14 (whiskey/mike)** were inserted after the `/wedm` rule so WEDM context is already captured above them.

**d) Structural-exclusion guards preserved**

Both exclusion guards are confirmed intact and tested:
- `wedm/wire-edm/sinker-edm` context exclusion in `/wire-unwired` (pipeline rule, line ~67) — T12 test "Wire EDM dispatcher wiring uni
... [+404 chars truncated]
