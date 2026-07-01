---
type: "chat-session"
source: "claude-code-cli"
session_id: "02436db5-5bb2-4a62-8e0d-1eeba8600240"
title: "Post-ship audit of the RGS-TOOL-AUTOINVOKE-MS0 milestone in PRISM (`H:/prism`). "
date: "2026-05-16"
first_ts: "2026-05-16T13:15:24.333Z"
last_ts: "2026-05-16T13:27:55.245Z"
cwd: "H:\\prism"
messages: 70
user_msgs: 27
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-abea795bb242a5b0d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Post-ship audit of the RGS-TOOL-AUTOINVOKE-MS0 milestone in PRISM (`H:/prism`). 

> **claude-code-cli** | 2026-05-16 | 70 msgs (27 user / 43 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/02436db5-5bb2-4a62-8e0d-1eeba8600240/subagents/agent-abea795bb242a5b0d.jsonl`

## Transcript

### User | 2026-05-16T13:15:24.333Z

Post-ship audit of the RGS-TOOL-AUTOINVOKE-MS0 milestone in PRISM (`H:/prism`). READ-ONLY — find gaps, do NOT edit/commit anything.

YOUR AXIS: **Real batch-output quality.** The planner `scripts/rgs-tool-planner.mjs` produces a per-unit tool-plan sidecar. Actually RUN it and judge whether the plans are GOOD, not just well-formed.

Do:
1. `cd H:/prism && node scripts/rgs-tool-planner.mjs --limit 100 --ollama-off --json` — captures 100 real units deterministically.
2. Read the produced `state/shared/roadmap-tool-plans.json`. Inspect ~15 plans spanning different milestones/domains. For each judge: does the recommended `pipelines` actually fit the unit's title/description? Does `buildVsIntegrate` look right? Are `tribal`/`skills`/`mcpTools` relevant or noise? Is `complexityTier` plausible vs the unit's effort?
3. Look for systematic failure: do ALL units get the same generic `/scrutinize` fallback (rule table too weak)? Do tribal hits repeat identically across unrelated units (search not discriminating)? Is `confidence` always the same value?
4. Check the deterministic minimum-plan contract actually held — any unit that should have thrown RGS_DETERMINISTIC_PLAN_INVALID but slipped through with an empty-ish plan?
5. Clean up: `rm -f state/shared/roadmap-tool-plans.json state/shared/.roadmap-tool-plans.checkpoint.json state/shared/.roadmap-tool-plans.lock` after inspecting (do not leave smoke artifacts; do not commit them).

Return: P0/P1/P2 findings with concrete examples (quote actual unit keys + their plans), an honest verdict on whether the output is USEFUL or noise, and 2-3 concrete improvements to the rule table / fusion to raise plan quality.

### Assistant | 2026-05-16T13:15:29.355Z

I'll run this post-ship audit systematically. Let me start by understanding the planner before running it.

### Assistant | 2026-05-16T13:15:30.113Z

[tool_use: Read]

### Assistant | 2026-05-16T13:15:30.694Z

[tool_use: Bash]

### User | 2026-05-16T13:15:30.928Z

[tool_result] 1	/**
2	 * rgs-tool-planner.mjs
3	 * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
4	 *
5	 * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
6	 * heap this is fine, but if you hit GC pressure on very large runs add:
7	 *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
8	 *
9	 * CLI usage:
10	 *   node scripts/rgs-tool-planner.mjs [--
... [+23382 chars truncated]

### User | 2026-05-16T13:17:33.829Z

[tool_result] Command running in background with ID: b38osjj70. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\02436db5-5bb2-4a62-8e0d-1eeba8600240\tasks\b38osjj70.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-16T13:17:37.162Z

Let me read the key fusion library while waiting for the planner run:

### Assistant | 2026-05-16T13:17:37.927Z

[tool_use: Read]

### Assistant | 2026-05-16T13:17:38.011Z

[tool_use: Read]

### User | 2026-05-16T13:17:39.651Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\rgs-signal-fusion.mjs' was already read 2m ago in this session and is unchanged (mtime 1778906605991). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T13:17:41.835Z

[tool_result] 1	/**
2	 * rgs-unit-enum.mjs
3	 * Enumerates every OPEN (not-yet-shipped) roadmap unit across all milestone envelopes.
4	 *
5	 * Real data shapes found (verified 2026-05-15):
6	 *   - 384 envelopes: envelope.phases[].units[]  (phases take precedence when BOTH present)
7	 *   - 254 envelopes: envelope.units[]           (top-level, no phases)
8	 *   -   7 envelopes: BOTH phases and top-level units →
... [+6064 chars truncated]

### Assistant | 2026-05-16T13:17:45.618Z

Good - let me check the fusion library content from memory and read the signal fusion file directly:

### Assistant | 2026-05-16T13:17:46.833Z

[tool_use: Bash]

### Assistant | 2026-05-16T13:17:47.117Z

[tool_use: Read]

### User | 2026-05-16T13:17:49.040Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-16T13:18:04.289Z

[tool_result] /**
 * rgs-signal-fusion.mjs
 * Pure signal-fusion core for RGS tool-auto-invoke pipeline.
 *
 * export async function fuseSignals({ unit, complexity, readers }) -> ToolPlan | null
 *
 * All I/O is injected via `readers`; the only direct import is the pure rule
 * table from ./rgs-pipeline-rules.mjs (matchPipelines, matchAgents).
 *
 * CONTRACT: see task spec — implement every step exactly.
 */

i
... [+10298 chars truncated]

### Assistant | 2026-05-16T13:18:06.958Z

Now let me read the pipeline rules — that's the core of what determines plan quality:

### Assistant | 2026-05-16T13:18:07.914Z

[tool_use: Bash]

### User | 2026-05-16T13:18:34.357Z

[tool_result] /**
 * rgs-pipeline-rules.mjs
 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
 * Frozen rule arrays — mutation throws in strict mode.
 *
 * Exports:
 *   matchPipelines(unit) -> {skill, why, confidence}[]  (always >=1 entry)
 *   matchAgents(unit)    -> string[]  (deduped agent names, [] if no match)
 */

// ---------------------------------------
... [+4063 chars truncated]

### Assistant | 2026-05-16T13:18:36.978Z

Now let me check if the planner run completed, then run it:

### Assistant | 2026-05-16T13:18:38.931Z

[tool_use: Read]

### User | 2026-05-16T13:18:41.940Z

[tool_result] 1	[rgs-tool-planner] Ollama unavailable — proceeding in deterministic mode.
2	[rgs-tool-planner] Graph loaded.
3	[rgs-unit-enum] Envelope in BOX-AUDIT.json has no id field, using filename stem "BOX-AUDIT"
4	[rgs-unit-enum] Envelope in DEV-VELOCITY-AUTOTRIGGER-MS0.json has no id field, using filename stem "DEV-VELOCITY-AUTOTRIGGER-MS0"
5	[rgs-unit-enum] Envelope in INTEG-ROADMAP.json has no id fiel
... [+4408 chars truncated]

### Assistant | 2026-05-16T13:18:49.016Z

The planner is still running. Let me check how many units finished and look at the sidecar while it runs:

### Assistant | 2026-05-16T13:18:51.110Z

[tool_use: Bash]

### User | 2026-05-16T13:19:26.545Z

[tool_result] {
  "units": 100,
  "planned": 55,
  "skipped": 45,
  "degraded": true,
  "sidecar": "H:\\prism\\state\\shared\\roadmap-tool-plans.json"
}

### Assistant | 2026-05-16T13:19:30.550Z

45 of 100 units skipped by the minimum-plan contract. Now let me inspect the sidecar and understand the distribution:

### Assistant | 2026-05-16T13:19:37.291Z

[tool_use: Bash]

### User | 2026-05-16T13:19:55.545Z

[tool_result] Total planned: 948

Pipeline skill distribution:
  /scrutinize: 831
  /forge-triple: 659
  /wire-unwired: 89
  test-team: 88
  /pdf-learn: 73
  /dedup: 18
  /video-learn: 6

Verdict distribution: { build: 857, integrate: 91 }
Tier distribution: { M: 484, L: 464 }
Source distribution: { deterministic: 948 }
Confidence min/median/max: 0.3000 0.6000 0.6000
Unique confidence values count: 2
Unique con
... [+28 chars truncated]

### Assistant | 2026-05-16T13:20:00.101Z

Critical finding: only 2 unique confidence values (0.3 and 0.6). Now let me sample ~15 actual plans across different milestones/domains:

### Assistant | 2026-05-16T13:20:05.663Z

[tool_use: Bash]

### User | 2026-05-16T13:20:28.543Z

[tool_result] === ACP-MS0::P0-U01 ===
  confidence: 0.6 | tier: M | verdict: build
  pipelines: /forge-triple (0.850), test-team (0.750), /scrutinize (0.700)
  skills: audit-viz-first, scrutinize
  mcpTools: NONE
  agents: physics-reviewer, test-review-agent
  tribal count: 0 | top hit: NONE
  rationale: Deterministic plan for unit "P0-U01" (tier=M, verdict=build)

=== ACP-MS1::P0-U01 ===
  confidence: 0.6 | ti
... [+4105 chars truncated]

### Assistant | 2026-05-16T13:20:38.065Z

[tool_use: Bash]

### User | 2026-05-16T13:21:05.418Z

[tool_result] KEY: ACP-MS0::P0-U01
  verdict: build | tier: M | conf: 0.6
  pipelines: /forge-triple + test-team + /scrutinize
  tribal hits: 0 | skills triggered: 2 | mcpTools: 0

KEY: ACP-MS0::P0-U02
  verdict: integrate | tier: M | conf: 0.6
  pipelines: /forge-triple + /scrutinize
  tribal hits: 0 | skills triggered: 2 | mcpTools: 0

KEY: ACP-MS0::P0-U03
  verdict: build | tier: M | conf: 0.6
  pipelines: /
... [+1535 chars truncated]

### Assistant | 2026-05-16T13:21:07.839Z

Now look at the actual unit titles and descriptions to cross-check whether `/forge-triple` is appropriate:

### Assistant | 2026-05-16T13:21:13.192Z

[tool_use: Bash]

### User | 2026-05-16T13:21:31.773Z

[tool_result] ID: P0-U01
  title: Inventory all slash commands grouped by workflow (build, test, deploy, CAD, speed-feed, post, etc.)
  desc: Inventory all slash commands grouped by workflow (build, test, deploy, CAD, speed-feed, post, etc.) — follow 4-LOOP (BUI
  effort: 60

ID: P0-U02
  title: Inventory hook definitions (existing + CCM planned) and map to automation lifecycle stages
  desc: Inventory hook def
... [+903 chars truncated]

### Assistant | 2026-05-16T13:21:35.461Z

Now I can see the core problem clearly. ACP-MS0::P0-U01 is "Inventory all slash commands grouped by workflow" — a pure documentation/audit task — yet it gets `/forge-triple` because the word "hook" appears in its description. Let me sample more domains and check the tribal reader failure:

### Assistant | 2026-05-16T13:21:47.621Z

[tool_use: Bash]

### User | 2026-05-16T13:22:04.365Z

[tool_result] === ACP-MS0::P0-U01 ===
  TITLE: Inventory all slash commands grouped by workflow (build, test, deploy, CAD, speed-feed, post, etc.)
  DESC: Inventory all slash commands grouped by workflow (build, test, deploy, CAD, speed-feed, post, etc.) 
  PLAN pipelines: /forge-triple + test-team + /scrutinize
  PLAN verdict: build | tier: M | conf: 0.6
  tribal: 0 | skills: audit-viz-first, scrutinize
  FORG
... [+3103 chars truncated]

### Assistant | 2026-05-16T13:22:07.674Z

Now I have everything I need. Let me check the tribal search failure and the `/forge-triple` over-firing root cause, then clean up:

### Assistant | 2026-05-16T13:22:14.636Z

[tool_use: Bash]

### User | 2026-05-16T13:22:39.707Z

[tool_result] tribal-embed-index entries: 388 [ 'schemaVersion', 'model', 'dim', 'generatedAt', 'entries' ]
first entry keys: id, source, domain, title, path, text, hash, embedding
lib exports: DEFAULT_EXCLUDED_LAYERS, STOPWORDS, _resetCachesForTests, loadGraph, loadTribalIndex, runMasterIndexSearch, runTribalSearch, searchGraphHits, searchTribalHits, tokenize
import error: lib.runTribalSearch(...).then is not 
... [+10 chars truncated]

### Assistant | 2026-05-16T13:22:45.230Z

[tool_use: Bash]

### User | 2026-05-16T13:23:02.645Z

[tool_result] runTribalSearch type: function
result type: object 
EMPTY — checking tribal index load
tribal index entries: 388

### Assistant | 2026-05-16T13:23:12.936Z

[tool_use: Bash]

### User | 2026-05-16T13:23:26.577Z

[tool_result] entries count: 388
entry fields: idx, id, source, domain, title, path, text
entry domain: general
entry text snippet: # PRISM Wiki Index > LLM-maintained catalog. Bootstrap rewrites entries with `so
broad query result: undefined
tokens: [ 'hook', 'skill', 'build' ]
has text field: true
has tip field: false
text sample: # PRISM Wiki Index > LLM-maintained catalog. Bootstrap rewrites entries with `s
... [+21 chars truncated]

### Assistant | 2026-05-16T13:23:30.772Z

[tool_use: Bash]

### User | 2026-05-16T13:23:48.654Z

[tool_result] Exit code 1
searchTribalHits type: function
file:///H:/prism/scripts/lib/master-index-search-lib.mjs:373
  for (const tok of queryTokens) {
                    ^

TypeError: queryTokens is not iterable
    at searchTribalHits (file:///H:/prism/scripts/lib/master-index-search-lib.mjs:373:21)
    at file:///H:/prism/[eval1]:4:16
    at ModuleJob.run (node:internal/modules/esm/module_job:271:2
... [+269 chars truncated]

### Assistant | 2026-05-16T13:23:51.481Z

Found the bug. Let me look at the exact line:

### Assistant | 2026-05-16T13:23:53.458Z

[tool_use: Bash]

### User | 2026-05-16T13:24:06.495Z

[tool_result] 356:  * title matches strongest, then text, then domain-name token match. Optional
357:  * `prefDomain` doubles the score for in-domain entries (matches
358:  * tribal-rerank.mjs IN_DOMAIN_WEIGHT=2.0 convention).
359:  *
360:  * @param {{entries: Array, inverted: Map}} index
361:  * @param {string[]} queryTokens
362:  * @param {object} [opts]
363:  * @param {number} [opts.topK=5]
364:  * @param {s
... [+1599 chars truncated]

### Assistant | 2026-05-16T13:24:10.011Z

[tool_use: Bash]

### User | 2026-05-16T13:24:21.718Z

[tool_result] 401:       };
402:     })
403:     .sort((a, b) => b.score - a.score)
404:     .slice(0, topK);
405: 
406:   return ranked;
407: }
408: 
409: /**
410:  * Convenience wrapper for tribal keyword search.
411:  *
412:  * @param {string} query
413:  * @param {object} [opts]   — { indexPath, topK, prefDomain, maxTokens, maxLen }
414:  * @returns {{ tokens: string[], hits: Array }}
415:  */
416: export f
... [+819 chars truncated]

### Assistant | 2026-05-16T13:24:24.324Z

Now I have the complete picture. Let me clean up the artifacts and compile my findings:

### Assistant | 2026-05-16T13:24:34.655Z

[tool_use: Bash]

### User | 2026-05-16T13:24:49.243Z

[tool_result] Plans with tribal=0: 1900 / 1900 (100%)
Plans with mcpTools=0: 1899 / 1900 (100%)
Plans with skills=0: 1 / 1900
/forge-triple in plan: 1177 / 1900 (62%)
/scrutinize ONLY (fallback): 337 / 1900 (18%)
confidence=0.3: 240 | confidence=0.6: 1660

### Assistant | 2026-05-16T13:24:53.856Z

[tool_use: Bash]

### User | 2026-05-16T13:25:18.844Z

[tool_result] schemaVersion: 1.0.0
generatedAt: 2026-05-16T13:25:10.057Z
degraded: true
total plans in sidecar: 2000

### Assistant | 2026-05-16T13:25:30.997Z

[tool_use: Bash]

### User | 2026-05-16T13:25:43.487Z

[tool_result] Checked units with /forge-triple: 1259
False positives (no engine+hook/forge-triple in text): 0 (0%)
Sample false positives:

### Assistant | 2026-05-16T13:25:46.699Z

Interesting — the rule itself isn't firing erroneously. The description text must contain "engine" + "hook/skill". Let me verify with a concrete example and then clean up:

### Assistant | 2026-05-16T13:25:51.459Z

[tool_use: Bash]

### User | 2026-05-16T13:26:03.490Z

[tool_result] Full description:
Inventory all slash commands grouped by workflow (build, test, deploy, CAD, speed-feed, post, etc.) — follow 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP), consult KNOWLEDGE_SOURCES before coding, forge-triple ownership in milestone header.

engine in text: false
hook/skill in text: false
4-LOOP mention: true

### Assistant | 2026-05-16T13:26:08.301Z

"forge-triple" is literally in the description text — that's the match trigger. Now check the ACP-MS0::P0-U01 plan again knowing this, then do the cleanup:

### Assistant | 2026-05-16T13:26:17.933Z

[tool_use: Bash]

### User | 2026-05-16T13:26:27.035Z

[tool_result] /forge-triple triggered via boilerplate description text: 1241
/forge-triple triggered via real engine+hook content: 18
Boilerplate sample false positives:
  ACP-MS0::P0-U01 | Inventory all slash commands grouped by workflow (build, test, deploy,
  ACP-MS0::P0-U02 | Inventory hook definitions (existing + CCM planned) and map to automat
  ACP-MS0::P0-U03 | Inventory core scripts by purpose (build g
... [+210 chars truncated]

### Assistant | 2026-05-16T13:26:35.131Z

That confirms the core finding: 1241 of 1259 `/forge-triple` hits (98.6%) are from boilerplate "forge-triple ownership in milestone header" text, not real engine+hook+skill builds. Now clean up:

### Assistant | 2026-05-16T13:26:37.313Z

[tool_use: Bash]

### User | 2026-05-16T13:26:47.806Z

[tool_result] removed: state/shared/roadmap-tool-plans.json
already absent: state/shared/.roadmap-tool-plans.checkpoint.jsonl
already absent: state/shared/.roadmap-tool-plans.lock

### Assistant | 2026-05-16T13:27:55.245Z

Artifacts cleaned. Here is the full audit report.

---

## RGS-TOOL-AUTOINVOKE-MS0 Post-Ship Audit — Batch Output Quality

**Run:** `--limit 100 --ollama-off --json --force` → 100 units in, 55 planned, 45 skipped. Sidecar accumulated 2000 plans total across prior checkpoint.

---

### P0 — `/forge-triple` fires on 98.6% of units via description boilerplate (plan is noise for almost all of them)

**Root cause:** The `forge.?triple` branch in the rule test is:
```js
/forge.?triple/i.test(s) || /\bnew engine\b/i.test(s)
```
Every milestone envelope description appends the boilerplate phrase `"forge-triple ownership in milestone header"`. The regex matches that phrase and fires `/forge-triple` as a high-confidence pipeline (0.85) even on pure documentation, inventory, audit, schema, and wiring units that have nothing to do with building a new engine+skill+hook triple.

**Measured impact across the 2000-plan sidecar:**
- 1259 units received `/forge-triple` in their plan
- 1241 of those (98.6%) were triggered **only** by the boilerplate text, not by real engine+hook content in the unit title/description
- Only 18 units legitimately matched via `engine\b` + `\b(skill|hook)\b`

**Concrete examples:**
- `ACP-MS0::P0-U01` — "Inventory all slash commands grouped by workflow" → gets `/forge-triple (0.850)` because its description says "forge-triple ownership in milestone header"
- `ACP-MS0::P0-U04` — "Cross-reference inventories to identify partial chains" → same
- `AI-WIRE-MS0::U-AIW04b` — "Create Schema Definitions for Agent Actions" → gets `/forge-triple` because "engine" appears in description boilerplate

The `forge.?triple` branch in the rule must require the term appears in the **title only**, or require it alongside `create|build|new` in a title-scoped match.

---

### P0 — Tribal search returns 0 hits for every single plan (signal is dead)

**Root cause:** `rgs-tool-planner.mjs` calls `makeTribalReader()` which calls `lib.runTribalSearch(text, {prefDomain, limit:8})`. 
... [+6583 chars truncated]
