---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c37ed17-584a-4913-9d0f-8eb3cdcea8df"
title: "Independent second-pass review of `H:/prism/.claude/commands/wiring-potential.md"
date: "2026-05-14"
first_ts: "2026-05-14T03:01:28.182Z"
last_ts: "2026-05-14T03:05:41.718Z"
cwd: "H:\\prism\\mcp-server"
messages: 40
user_msgs: 18
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-a4343ec539d4a532a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of `H:/prism/.claude/commands/wiring-potential.md

> **claude-code-cli** | 2026-05-14 | 40 msgs (18 user / 22 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-a4343ec539d4a532a.jsonl`

## Transcript

### User | 2026-05-14T03:01:28.182Z

Independent second-pass review of `H:/prism/.claude/commands/wiring-potential.md` (CLEANUP-MS0/U-CLEANUP-C4). Do not assume the operator-clarity reviewer caught everything. Weight your review toward:

- **Integration with the auto-trigger orchestrator** — `H:/prism/.claude/hooks/skill-auto-trigger.mjs` reads `triggers[]` from frontmatter and surfaces top-K skills per UserPromptSubmit. Are the triggers specific enough to fire on the right prompts (wire/orphan/dispatch language) but not over-broad (firing on every "wire" mention)?

- **Coupling with the live dispatcher action** — verify `prism_dev:wiring_potential` actually accepts the 3 modes the skill names (`analyze`, `batch_unwired`, `dashboard`). Check `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts` line 4488 onward. If the skill describes modes that don't exist or omits ones that do, that's a P0.

- **`pipeline_integrations` frontmatter** — the skill claims forge / rgs / close-out integration. Is the integration phase named correctly (e.g. `forge: post-engine-create hint`)? If forge/rgs/close-out don't read these frontmatter keys, this is misleading; if they do, the format must match.

- **Frontmatter completeness** — sibling skills have `model`, `effort`, `context`, `allowed-tools` fields per the SKILL-AUTO-TRIGGER spec. Does C4 need them? Check 2-3 sibling skills in `H:/prism/.claude/commands/` for the modern frontmatter shape (e.g. wiring-batch, build-state, orphan-inventory).

- **Token cost** — the skill is documentation surfaced into context on trigger; oversized prose burns tokens on every fire. Is it tight? Sibling `/wiring-batch` is ~60 lines — this one is significantly larger. Justified or trimmable?

- **Failure-mode coverage** — does the "Failure modes" section list every realistic failure of the wrapped action (capacity-warn flagged for all candidates, engine not in master-index, batch-mode partial failures, JSON schema drift)?

- **Output formatting examples** — are the rendered-output
... [+193 chars truncated]

### Assistant | 2026-05-14T03:01:33.107Z

I'll review the skill file end-to-end, verifying integration claims against actual code.

### Assistant | 2026-05-14T03:01:33.309Z

[tool_use: Read]

### User | 2026-05-14T03:01:34.078Z

[tool_result] 1	---
2	name: wiring-potential
3	description: Rank candidate dispatchers for an orphan engine (built but unwired). Returns top-K targets with rationale + reasoning trace. Invokes prism_dev:wiring_potential (C2-shipped action) which wraps WiringPotentialEngine (C1-shipped engine).
4	version: 1.0.0
5	triggers:
6	  - "wire this engine"
7	  - "wiring potential"
8	  - "orphan recommendation"
9	  - "whi
... [+9536 chars truncated]

### Assistant | 2026-05-14T03:01:37.379Z

Now let me verify the dispatcher action against the live code.

### Assistant | 2026-05-14T03:01:38.267Z

[tool_use: Read]

### User | 2026-05-14T03:01:38.906Z

[tool_result] 4488	          // ── CLEANUP-MS0/U-CLEANUP-C2: wiring_potential ───────────────
4489	          // WiringPotentialEngine (shipped in U-CLEANUP-C1) dispatcher
4490	          // surface. Three modes:
4491	          //   analyze       — rank candidate dispatchers for ONE orphan.
4492	          //   batch_unwired — scan BUILD_STATE.NEEDS_WIRING.sample_engines
4493	          //                   (or exp
... [+9147 chars truncated]

### Assistant | 2026-05-14T03:01:39.263Z

[tool_use: Bash]

### Assistant | 2026-05-14T03:01:40.603Z

[tool_use: Bash]

### User | 2026-05-14T03:01:43.346Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3 matches in 3F:

[file] 4488 (1):
     0: wiring_potential ───────────────

[file] 4501 (1):
     0: {

[file] H:/.../dispatchers/devDispatcher.ts (1):
    85: "wiring_potential"] as const;

### User | 2026-05-14T03:02:56.234Z

[tool_result] H:/prism/mcp-server/src/engines/WiringPotentialEngine.ts
---
H:/prism/.claude/commands/build-state.md
H:/prism/.claude/commands/orphan-inventory.md
H:/prism/.claude/commands/wiring-batch.md

### Assistant | 2026-05-14T03:03:00.022Z

Acknowledged the dispatcher convention rule. The skill is recommendation-only and doesn't alter dispatcher conventions; the action it wraps already conforms (snake_case, lazy import, `{success: true, data: {...}}`). Now let me compare against sibling skills and the auto-trigger spec.

### Assistant | 2026-05-14T03:03:01.460Z

[tool_use: Bash]

### Assistant | 2026-05-14T03:03:02.321Z

[tool_use: Read]

### Assistant | 2026-05-14T03:03:03.168Z

[tool_use: Read]

### Assistant | 2026-05-14T03:03:03.668Z

[tool_use: Read]

### Assistant | 2026-05-14T03:03:04.167Z

[tool_use: Read]

### User | 2026-05-14T03:03:14.417Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
118 matches in 30F:

[file] 103 (1):
     0: /.claude/commands/forge-triple.md` — for the full create-engine pipeline (if a w...

[file] 107 (1):
     0: always

[file] 111 (1):
     0: see `/frontend-merge-plan` instead.

[fil
... [+2271 chars truncated]

### User | 2026-05-14T03:03:14.708Z

[tool_result] 1	---
2	name: wiring-batch
3	description: Propose a wire-batch plan from the unwired-engine backlog — pick a domain, get top-N engines + suggested dispatcher + action-name draft
4	version: 1.0.0
5	triggers:
6	  - "wire next"
7	  - "wire backlog"
8	  - "wiring batch"
9	  - "what to wire"
10	  - "lathe wiring"
11	  - "mill wiring"
12	  - "unwired"
13	---
14	
15	# /wiring-batch — Propose the next wir
... [+720 chars truncated]

### User | 2026-05-14T03:03:14.721Z

[tool_result] 1	---
2	description: Generate the built-but-unwired audit punch list. Reads system-graph orphans (low in/out-degree but documented) + groups by suggested dispatcher (heuristic name match) + by layer. Outputs state/shared/ORPHAN-INVENTORY.md.
3	allowed-tools: Bash, Read
4	---
5	
6	# /orphan-inventory — Audit punch list for built-but-unwired nodes
7	
8	Generates `state/shared/ORPHAN-INVENTORY.md` fr
... [+937 chars truncated]

### User | 2026-05-14T03:03:14.802Z

[tool_result] 1	---
2	name: build-state
3	description: Print the current PRISM BUILD_STATE — built vs unwired vs pending vs frontend-merge — and offer drill-down
4	version: 1.0.0
5	triggers:
6	  - "build state"
7	  - "build status"
8	  - "what's built"
9	  - "what is built"
10	  - "show wiring"
11	  - "show pending"
12	  - "what needs wiring"
13	  - "what needs building"
14	  - "frontend status"
15	---
16	
17	#
... [+795 chars truncated]

### User | 2026-05-14T03:03:14.840Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0).
5	 *
6	 * Reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (the stage-22 extract
7	 * of every skill's `triggers:` frontmatter — see Phase D.3). For each UserPromptSubmit
8	 * event, scores the prompt against every trigger and emits top-K suggestions a
... [+4175 chars truncated]

### Assistant | 2026-05-14T03:03:18.679Z

Hooks rule acknowledged (does not apply — this review concerns a markdown skill, not a hook script). Task-tracker reminder acknowledged; the in-progress C4 task is what I'm reviewing now. Final spot-checks.

### Assistant | 2026-05-14T03:03:20.030Z

[tool_use: Read]

### User | 2026-05-14T03:03:20.389Z

[tool_result] 4636	                result = {
4637	                  success: true,
4638	                  data: {
4639	                    totalAnalyzed: reports.length,
4640	                    matched: reports.length - unmatched,
4641	                    unmatched,
4642	                    byDispatcher: ranked,
4643	                    warnings,
4644	                  },
4645	                };
4646	        
... [+730 chars truncated]

### Assistant | 2026-05-14T03:03:21.826Z

[tool_use: Bash]

### Assistant | 2026-05-14T03:03:23.586Z

[tool_use: Bash]

### Assistant | 2026-05-14T03:03:25.360Z

[tool_use: Bash]

### User | 2026-05-14T03:04:39.733Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'pipeline_integrations\|allowed-tools\|^model:\|^effort:\|^context:'

### User | 2026-05-14T03:04:43.745Z

[tool_result] 9: *      (mirrors orphan-inventory.mjs DISPATCHER_HEURISTICS so operator
65:export const MIN_HEURISTIC_CONFIDENCE = 0.30;
66:/** docsDepth saturates here — more wiki entries don't help past this. */
84:const DISPATCHER_HEURISTICS: Heuristic[] = [
124:  capacityClass: CapacityClass;
125:  semanticConfidence: number; // [0,1]
126:  docsDepth: number;          // raw count of wiki + memory entries
2
... [+1023 chars truncated]

### User | 2026-05-14T03:04:44.822Z

[tool_result] grep: H:/prism/.claude/commands/forge.md: No such file or directory

### Assistant | 2026-05-14T03:04:47.901Z

[tool_use: Bash]

### Assistant | 2026-05-14T03:04:49.693Z

[tool_use: Bash]

### User | 2026-05-14T03:04:54.992Z

[tool_result] 17: *      engines with prior docs score higher because the wiring rationale
26: * `rationale[]` (1-2 line natural language reasons). The top candidate
29: * Reserved for the **rationale-synthesis layer** (per U-CLEANUP-C1 spec) —
127:  rationale: string[];        // 1-3 short lines explaining the rank
481:      const rationale: string[] = [
485:        rationale.push(
489:        rationale.push(`
... [+1032 chars truncated]

### User | 2026-05-14T03:04:56.578Z

[tool_result] H:/prism/.claude/commands/big-blob-hunt.md
H:/prism/.claude/commands/dispatcher-coverage.md
H:/prism/.claude/commands/envelope-drift-fix.md
H:/prism/.claude/commands/peer-file-isolation.md
H:/prism/.claude/commands/quick-archive.md
H:/prism/.claude/commands/scrutiny-batch.md
H:/prism/.claude/commands/scrutiny-replay.md
H:/prism/.claude/commands/skill-recall-tune.md
H:/prism/.claude/commands/staged
... [+192 chars truncated]

### Assistant | 2026-05-14T03:04:59.931Z

[tool_use: Bash]

### Assistant | 2026-05-14T03:05:00.515Z

[tool_use: Read]

### User | 2026-05-14T03:05:08.364Z

[tool_result] (Bash completed with no output)

### User | 2026-05-14T03:05:08.401Z

[tool_result] 1	---
2	name: scrutiny-batch
3	title: Scrutiny Batch — Parallel Per-File Reviewer Dispatch
4	description: Run the per-file scrutiny gate across N files in ONE parallel reviewer-agent block instead of N serial rounds. Optional loop mode re-runs after fixes until all files PASS or max iterations reached.
5	type: skill
6	model: sonnet
7	effort: high
8	context: development
9	allowed-tools:
10	  - Bash
... [+150 chars truncated]

### Assistant | 2026-05-14T03:05:41.718Z

Acknowledged the doctrine reminder. I've now verified the command bridge (`prism_dev:wiring_potential`) against live code and the MCP directive (snake_case, lazy import, `{success,data}` shape, action in z.enum). I have enough to finalize the review.

---

## Review Verdict: PASS with P1 caveats

**Grade: PASS** — the skill accurately wraps the live action and is operationally correct. Findings below are P1 polish, not P0 blockers.

### P0 findings
**None.** Specifically verified:
- The 3 modes named in the skill (`analyze`, `batch_unwired`, `dashboard`) match the live `switch (mode)` block at `devDispatcher.ts:4523-4650` exactly; the default branch's `allowed` list is the same three.
- Return-shape claims hold: `engineName` (L131), `topCandidate` (L132), `candidates[].rationale: string[]` (L127), `score / semanticConfidence / capacityClass / capacityRatio / docsDepth` (L124-126,505-506) all exist in `WiringPotentialEngine.ts`.
- Constant references are real: `MIN_HEURISTIC_CONFIDENCE = 0.30` (L65) and `DISPATCHER_HEURISTICS` (L84) — the skill cites both.
- Auto-trigger integration is valid: triggers are specific to wire/orphan/dispatcher-rank language (no bare `"wire"` token that would over-fire). `skill-auto-trigger.mjs` reads `name + matcher + score` only — these are all set.

### P1 findings (defer; not session-blocking)

1. **Output snippet drift.** Skill claims top-level `analyzedAt` and `knownCapacityIssues[]` in the report (lines 83-84 of the skill). `grep` finds **neither** in `WiringPotentialEngine.ts`. The capacity-warn signal lives in `candidate.capacityClass`, not a separate top-level array. Operators will copy-paste the example and find missing fields. Either (a) strip `analyzedAt` + `knownCapacityIssues` from the snippet, or (b) add them at the dispatcher wrap layer. Lines 105-106 and 126-129 of the skill reference `knownCapacityIssues` repeatedly — same fix applies.

2. **`pipeline_integrations` is documentation theater right now.** Confirmed: zero c
... [+3388 chars truncated]
