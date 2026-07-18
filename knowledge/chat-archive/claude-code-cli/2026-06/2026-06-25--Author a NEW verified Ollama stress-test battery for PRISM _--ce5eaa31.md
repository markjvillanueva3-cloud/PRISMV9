---
type: "chat-session"
source: "claude-code-cli"
session_id: "ce5eaa31-2e70-42f5-bb52-524de0feb512"
title: "Author a NEW verified Ollama stress-test battery for PRISM (slot:alpha). GOAL: S"
date: "2026-06-25"
first_ts: "2026-06-25T02:22:48.004Z"
last_ts: "2026-06-25T02:26:21.643Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/ce5eaa31-2e70-42f5-bb52-524de0feb512/subagents/workflows/wf_c9cfd598-bcb/agent-af547d1fb47e34f4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Author a NEW verified Ollama stress-test battery for PRISM (slot:alpha). GOAL: S

> **claude-code-cli** | 2026-06-25 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ce5eaa31-2e70-42f5-bb52-524de0feb512/subagents/workflows/wf_c9cfd598-bcb/agent-af547d1fb47e34f4e.jsonl`

## Transcript

### User | 2026-06-25T02:22:48.004Z

Author a NEW verified Ollama stress-test battery for PRISM (slot:alpha). GOAL: STRUCTURED JSON output reliability.

Prompts asking for a JSON object with specific keys+types (e.g. diameter_mm number, flutes integer, material string) from short text. "Reply with ONLY the JSON object." verify: strip fences, JSON.parse succeeds AND required keys present with right typeof AND right value extracted from c.input; non-parseable/schema-violating -> false. >=5 tasks (flat/nested/array shapes).

SHAPE (the harness scripts/ollama-stress-test.mjs runTierSweep consumes this directly -- read scripts/lib/ollama-capability-battery.mjs first for the exact pattern + norm/firstNumber helpers):
export const BATTERY = [{ id, category, cases:[...], prompt:(c)=>"terse-answer prompt", verify:(out,c)=>bool }, ...]
RULES: >=5 cases/relevant; verify PURE+SAFE and MUST return false on a wrong/empty answer (R9, no stubs); prompt asks "Reply with ONLY ..."; be tolerant of formatting (trim/case-fold/extract) but strict on content; add a run-as-main self-test that asserts verify(KNOWN-GOOD)===true AND verify(KNOWN-BAD)===false for every task and prints "SELFTEST OK n/n" (guarded so import does not run it); ASCII-only; node --check must pass; run the self-test and confirm before returning.

Write the module to H:/prism/scripts/lib/stress-battery-jsonschema.mjs, run `node --check`, run the self-test (`node H:/prism/scripts/lib/stress-battery-jsonschema.mjs` -> must print SELFTEST OK), FIX until it passes, then report. A verifier that cannot fail on a wrong answer is worthless (R9).

### Assistant | 2026-06-25T02:22:54.704Z

I'll read the existing battery file first to understand the exact pattern, then write the new battery.

### Assistant | 2026-06-25T02:22:54.955Z

[tool_use: Read]

### User | 2026-06-25T02:22:56.213Z

[tool_result] 1	/**
2	 * ollama-capability-battery.mjs -- pure: a battery of VERIFIABLE task-types + code verifiers that
3	 * measure an Ollama model's TRUE success rate per task (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11).
4	 *
5	 * THE GOAL (operator 2026-06-11, "fable 5 demolished session limits"): only AUTO-OFFLOAD a task to
6	 * a local model when we KNOW it succeeds ~100% -- and we know that only by MEASU
... [+7805 chars truncated]

### Assistant | 2026-06-25T02:22:59.641Z

Now I have the exact pattern. Let me also quickly check if the stress-test runner exists to understand what `BATTERY` shape it expects vs `TASK_BATTERY`.

### Assistant | 2026-06-25T02:23:00.383Z

[tool_use: Read]

### User | 2026-06-25T02:23:01.630Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ollama-stress-test.mjs
3	//
4	// U-ALPHA-OLLAMA-STRESS (slot:alpha, 2026-06-24) -- the SCALING / DIMINISHING-
5	// RETURNS companion to india's ollama-capability-probe.mjs.
6	//
7	// THE GAP IT FILLS.
8	//   ollama-capability-probe.mjs already answers "WHICH (task,model) pairs pass"
9	//   (per-task success rate via verifiers) -- but only at concurrency 1, a fixe
... [+4635 chars truncated]

### Assistant | 2026-06-25T02:23:04.964Z

Good. The stress test imports `TASK_BATTERY` from `ollama-capability-battery.mjs` - but the task says `runTierSweep` consumes a `BATTERY` export. Let me check what runTierSweep actually expects.

### Assistant | 2026-06-25T02:23:05.489Z

[tool_use: Read]

### User | 2026-06-25T02:23:07.672Z

[tool_result] 80	// Below this, the frontier is flagged low-confidence and the routing rec is
81	// explicitly advisory (R12: never present an n=1 pass as a hard route).
82	const MIN_CONFIDENT_N = 3;
83	
84	// ---------------------------------------------------------------------------
85	// PURE ANALYSIS (no I/O -- unit-tested with injected metric rows)
86	// ----------------------------------------------------
... [+6736 chars truncated]

### Assistant | 2026-06-25T02:23:11.300Z

I have enough context. The runner uses `TASK_BATTERY` from the main battery file. The new file exports `BATTERY` (per the task spec). Let me now write the module.

### Assistant | 2026-06-25T02:24:49.370Z

[tool_use: Write]

### User | 2026-06-25T02:24:53.822Z

[tool_result] File created successfully at: H:/prism/scripts/lib/stress-battery-jsonschema.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:24:57.736Z

Now run `node --check` and the self-test.

### Assistant | 2026-06-25T02:24:59.249Z

[tool_use: Bash]

### User | 2026-06-25T02:25:04.405Z

[tool_result] CHECK OK

### Assistant | 2026-06-25T02:25:06.562Z

[tool_use: Bash]

### User | 2026-06-25T02:25:11.360Z

[tool_result] Exit code 1
FAIL: json-operation-list GOOD fixture returned false (expected true)
SELFTEST FAILED 11/12

### Assistant | 2026-06-25T02:25:16.782Z

One failure. The `json-operation-list` good fixture uses "housing" but the test case checks for `part_name` containing "bracket". Let me debug which part of the verify fails.

### Assistant | 2026-06-25T02:25:25.554Z

[tool_use: Bash]

### User | 2026-06-25T02:25:29.669Z

[tool_result] case: {"part_name":"bracket","op_keywords":["face","drill","tap"],"min_ops":3}
obj: {
  part_name: 'bracket',
  operations: [ 'facing', 'drilling', 'tapping' ]
}
part_name check: bracket includes bracket -> true
ops array? true
ops len: 3 >= min 3
joined: facing drilling tapping
keyword face -> false
keyword drill -> true
keyword tap -> true
verify result: false

### Assistant | 2026-06-25T02:25:32.073Z

The issue is "facing" does not include "face" — `"facing".includes("face")` should be true. Let me check:

### Assistant | 2026-06-25T02:25:32.583Z

[tool_use: Bash]

### User | 2026-06-25T02:25:37.848Z

[tool_result] false

### Assistant | 2026-06-25T02:25:42.434Z

"facing" does not contain "face" — "fac**ing**" vs "f**ace**". The keyword `"face"` is not a substring of `"facing"`. I need to either change the keyword to `"fac"` (root) or check that the joined string contains it. The clean fix is to use root/stem keywords. Let me fix the op_keywords to use unambiguous stems that are actual substrings of the operation words.

### Assistant | 2026-06-25T02:25:42.971Z

[tool_use: Read]

### User | 2026-06-25T02:25:43.882Z

[tool_result] 195	      return true;
196	    },
197	  },
198	
199	  // -------------------------------------------------------------------------
200	  // TASK 3: material properties -- nested object shape
201	  // { name: string, density_g_cm3: number, hardness_HB: number, iso_group: string }
202	  // -------------------------------------------------------------------------
203	  {
204	    id: "json-material-pr
... [+1525 chars truncated]

### Assistant | 2026-06-25T02:25:46.874Z

The fix: change `"face"` to `"fac"` (a true substring of "facing") and similarly audit the other cases for substring correctness.

### Assistant | 2026-06-25T02:25:54.273Z

[tool_use: Edit]

### User | 2026-06-25T02:25:59.732Z

[tool_result] The file H:/prism/scripts/lib/stress-battery-jsonschema.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-25T02:26:02.481Z

[tool_use: Bash]

### User | 2026-06-25T02:26:07.782Z

[tool_result] SELFTEST OK 12/12

### Assistant | 2026-06-25T02:26:10.035Z

SELFTEST OK 12/12. All 6 tasks pass good fixtures and reject bad ones.

### Assistant | 2026-06-25T02:26:20.501Z

[tool_use: StructuredOutput]

### User | 2026-06-25T02:26:21.643Z

[tool_result] Structured output provided successfully
