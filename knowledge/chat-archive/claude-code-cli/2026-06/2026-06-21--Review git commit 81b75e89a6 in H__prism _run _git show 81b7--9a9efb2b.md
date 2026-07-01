---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a9efb2b-f8dc-4bb1-83a2-9a2785dec826"
title: "Review git commit 81b75e89a6 in H:/prism (run `git show 81b75e89a6` + Read the 4"
date: "2026-06-21"
first_ts: "2026-06-21T02:54:24.340Z"
last_ts: "2026-06-21T02:56:00.828Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 10
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/9a9efb2b-f8dc-4bb1-83a2-9a2785dec826/subagents/agent-abb869f309814f606.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review git commit 81b75e89a6 in H:/prism (run `git show 81b75e89a6` + Read the 4

> **claude-code-cli** | 2026-06-21 | 24 msgs (10 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a9efb2b-f8dc-4bb1-83a2-9a2785dec826/subagents/agent-abb869f309814f606.jsonl`

## Transcript

### User | 2026-06-21T02:54:24.340Z

Review git commit 81b75e89a6 in H:/prism (run `git show 81b75e89a6` + Read the 4 changed files): scripts/ollama-offload-dashboard.mjs, scripts/__tests__/ollama-offload-dashboard.test.mjs, scripts/ask-hermes.mjs, scripts/ask-hermes.test.mjs.

CONTEXT: U-OLLAMA-BRIDGE-EXEC-VISIBILITY. The offload dashboard reported `offloaded=210` (prompt-classifier DECISIONS) / `executedOffloads=19`, making utilization look ~9-18%, while `ask-hermes` (855 real off-Claude executions) wrote a CUSTOM byHook bucket and never pushed to events[], so it was invisible to every metric + recorded tokensSaved=0. This commit (measurement-only, no routing change): (1) dashboard summarize() aggregates EXECUTION_BRIDGE_HOOKS (ask-ollama/ask-hermes/ask-openrouter) byHook.offloaded -> bridgeExecutions/bridgeTokensSaved/byBridge; (2) ask-hermes tallyUsage() attributes estimated tokensSaved per offloaded call (estimateHermesSaved=(input+output)/4), `|| 0` add (not `| 0`) for >32-bit safety.

Review for correctness + honest measurement: (1) Does bridgeExecutions correctly sum ONLY execution bridges (not decision hooks like ollama-task-offloader)? Any double-count between bridgeExecutions and the existing executedOffloads/offloaded? (2) Is the tokensSaved attribution honest (conservative estimate, only on real offloads, never on fail/kept)? (3) The `|| 0` vs `| 0` 32-bit fix — correct? (4) Tests real (R9) — do they fail if logic breaks? Any weak asserts? (5) Did the commit change any routing/safety behavior (it should NOT — classifier + safety gates untouched)? Cite file:line. Grade PASS or FAIL with P0/P1. Terse.

### Assistant | 2026-06-21T02:54:29.630Z

I'll read the commit and all four changed files before making any judgments.

### Assistant | 2026-06-21T02:54:30.072Z

[tool_use: Bash]

### User | 2026-06-21T02:54:35.230Z

[tool_result] commit 81b75e89a661b5271119e47e2bb12d5e4ac822ee
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 21:53:17 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-BRIDGE-EXEC-VISIBILITY (slot:alpha): surface TRUE off-Claude utilization -- 855 ask-hermes executions were invisible to every metric
    
    ROOT CAUSE: the offload dashboard reported offloaded=210 (prompt-cla
... [+1609 chars truncated]

### Assistant | 2026-06-21T02:54:37.925Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:54:38.216Z

[tool_use: Bash]

### User | 2026-06-21T02:54:46.055Z

[tool_result] commit 81b75e89a661b5271119e47e2bb12d5e4ac822ee
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 21:53:17 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-BRIDGE-EXEC-VISIBILITY (slot:alpha): surface TRUE off-Claude utilization -- 855 ask-hermes executions were invisible to every metric
    
    ROOT CAUSE: the offload dashboard reported offloaded=210 (prompt-cla
... [+7378 chars truncated]

### User | 2026-06-21T02:54:52.978Z

[tool_result] commit 81b75e89a661b5271119e47e2bb12d5e4ac822ee
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 20 21:53:17 2026 -0500

    [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-BRIDGE-EXEC-VISIBILITY (slot:alpha): surface TRUE off-Claude utilization -- 855 ask-hermes executions were invisible to every metric
    
    ROOT CAUSE: the offload dashboard reported offloaded=210 (prompt-cla
... [+6299 chars truncated]

### Assistant | 2026-06-21T02:54:55.538Z

Now read the test files end-to-end.

### Assistant | 2026-06-21T02:54:56.329Z

[tool_use: Read]

### Assistant | 2026-06-21T02:54:56.339Z

[tool_use: Read]

### User | 2026-06-21T02:54:58.407Z

[tool_result] 1	// OLLAMA-EXPAND-MS0 / U-OE-DASH-KEEP-BREAKDOWN — fail-on-revert regression tests
2	// for the keep-breakdown + adjusted-offload-rate transparency fix.
3	//
4	// Slot: charlie (claude-bca3789f), 2026-05-18.
5	//
6	// What changed in ollama-offload-dashboard.mjs:
7	//   1. summarize() now emits keepBreakdown, offloadBreakdown, correctKeepCount,
8	//      unclassifiedKeepCount, rawOffloadRate, adj
... [+26054 chars truncated]

### User | 2026-06-21T02:54:58.533Z

[tool_result] 1	#!/usr/bin/env node
2	// Tests for ask-hermes.mjs -- the PRISM->Hermes-proxy bridge pure functions.
3	// (HERMES-BRIDGE-MS0/U-ASK-HERMES). Pure functions only; importing the script
4	// is side-effect-free (isMain is false under the test runner, so main() never
5	// runs and no network call is made).
6	// Run: node --test scripts/ask-hermes.test.mjs
7	import { test } from "node:test";
8	import a
... [+30625 chars truncated]

### Assistant | 2026-06-21T02:55:01.454Z

Now read the full source files to verify the surrounding contracts.

### Assistant | 2026-06-21T02:55:01.886Z

[tool_use: Read]

### Assistant | 2026-06-21T02:55:02.179Z

[tool_use: Read]

### User | 2026-06-21T02:55:04.779Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
4	 *
5	 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
6	 *
7	 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
8	 * and prints:
9	 *   1. Top-line totals (since last reset)
10	 *   2. Per-hook fire counts (which hooks are doing the routing)
11	 *   3. Last 24h activity from the ro
... [+25323 chars truncated]

### User | 2026-06-21T02:55:04.929Z

[tool_result] 190	  return true;
191	}
192	
193	/**
194	 * Pure: fold one ask-hermes call into the offload-stats object's
195	 * byHook["ask-hermes"] tally. Mutates + returns `stats`. A call answered
196	 * off-Claude (source "hermes" OR "ollama-fallback") counts as an `offloaded`;
197	 * a total failure counts as `kept` (Claude must still answer). bySource keeps
198	 * the Hermes-vs-fallback split so real Herm
... [+3891 chars truncated]

### Assistant | 2026-06-21T02:55:10.216Z

Now I have read all four files end-to-end. Let me check one specific concern: whether `ask-ollama`'s `byHook["ask-ollama"].offloaded` is a true execution count (not a decision count), to verify there is no double-count with `executedOffloads`.

### Assistant | 2026-06-21T02:55:12.323Z

[tool_use: Bash]

### User | 2026-06-21T02:55:22.572Z

[tool_result] 3: * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
227: * Parse argv (the slice AFTER `node ask-ollama.mjs`). Returns
887: * command output can be piped to a local model: `rtk grep foo | ask-ollama summarize -`.
921:const USAGE = `ask-ollama — local Ollama query service (offloads token-heavy work)
923:  node scripts/ask-ollama.mjs viz <query>        search the system-viz g
... [+1968 chars truncated]

### Assistant | 2026-06-21T02:55:24.703Z

[tool_use: Read]

### User | 2026-06-21T02:55:25.875Z

[tool_result] 1148	
1149	// U-OFFLOAD-ACTION (2026-06-12, slot:zulu): record an EXECUTED offload event so
1150	// the fleet dashboard's offload rate measures work that actually RAN locally,
1151	// not directives issued. The offloader hook records decision:"offload" at
1152	// DIRECTIVE time (before any adoption); this records at EXECUTION time with the
1153	// MEASURED in/out token delta. extras.mode:"executed
... [+1711 chars truncated]

### Assistant | 2026-06-21T02:56:00.828Z

I have everything I need. Here is the verdict.

---

VERDICT: PASS
summary: The commit is measurement-only as claimed. It correctly surfaces true off-Claude executions from bridge hooks that never wrote to events[], attributes tokensSaved conservatively and only on real offloads, fixes a genuine 32-bit overflow risk, and tests are real R9 assertions that would fail on a revert. No routing, classifier, or safety behavior was touched.

findings:

- [P1] `H:/prism/scripts/ask-ollama.mjs:1168-1173` / `H:/prism/scripts/ollama-offload-dashboard.mjs:229-241` -- **Potential double-count of ask-ollama executions between `bridgeExecutions` and `executedOffloads`.** `ask-ollama` writes events with `mode:"executed"` via `recordOllamaEvent` (flowing to `executedOffloads` via `bumpTotals`), AND it also increments `byHook["ask-ollama"].offloaded` in the same write path (the `recordOllamaEvent` call goes through `lib/ollama-stats.mjs` which bumps `byHook`). The dashboard then sums `byHook["ask-ollama"].offloaded` into `bridgeExecutions`. So the 18 ask-ollama executions visible in the live validation (ask-hermes 855 / ask-ollama 18 / cloud 1 = 874) are counted in BOTH `executedOffloads` (via `recent.*`) AND `bridgeExecutions` (via `byHook`). The comment at dashboard:91-94 acknowledges this: `"ask-ollama (also flows through executedOffloads via mode:'executed')"`. The two metrics are surfaced separately in the output so there is no arithmetic error in any single displayed number. However, if a consumer sums `bridgeExecutions + executedOffloads` to get a total, they double-count ask-ollama. The advisory and `printHuman` do NOT sum them, so there is no displayed lie in this commit -- but the comment's parenthetical is the only guard against a future consumer making this mistake. Recommendation: add an explicit note in the `totals` return shape that `bridgeExecutions` already includes the ask-ollama executions that also appear in `executedOffloads`, so consumers must not add them. This 
... [+2693 chars truncated]
