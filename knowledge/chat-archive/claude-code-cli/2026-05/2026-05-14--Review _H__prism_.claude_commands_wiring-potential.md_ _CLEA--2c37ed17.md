---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c37ed17-584a-4913-9d0f-8eb3cdcea8df"
title: "Review `H:/prism/.claude/commands/wiring-potential.md` (CLEANUP-MS0/U-CLEANUP-C4"
date: "2026-05-14"
first_ts: "2026-05-14T03:01:15.742Z"
last_ts: "2026-05-14T03:03:35.833Z"
cwd: "H:\\prism\\mcp-server"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-a09f56928c46e4d21.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review `H:/prism/.claude/commands/wiring-potential.md` (CLEANUP-MS0/U-CLEANUP-C4

> **claude-code-cli** | 2026-05-14 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-a09f56928c46e4d21.jsonl`

## Transcript

### User | 2026-05-14T03:01:15.742Z

Review `H:/prism/.claude/commands/wiring-potential.md` (CLEANUP-MS0/U-CLEANUP-C4) for operator clarity + completeness.

**Context**: This is a markdown skill (slash command) that PRISM operators invoke via `/wiring-potential <engine-name>`. It wraps the `prism_dev:wiring_potential` dispatcher action (shipped 2026-05-13 as U-CLEANUP-C2) which itself wraps `WiringPotentialEngine` (shipped same day as U-CLEANUP-C1). The action surface and engine return type are documented in:
- Engine: `H:/prism/mcp-server/src/engines/WiringPotentialEngine.ts` (exports `WiringCandidate`, `WiringPotentialReport`)
- Dispatcher: `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts:4501-4615` (3 modes: `analyze`, `batch_unwired`, `dashboard`)
- Sibling skill (pattern reference): `H:/prism/.claude/commands/wiring-batch.md` OR `C:/Users/wompu/.claude/commands/wiring-batch.md`

**Read the WHOLE file end-to-end.** Evaluate:

1. **Operator clarity** — when a JM Die machinist or Mark runs `/wiring-potential WiringPotentialEngine` cold, do they understand:
   - When to run it (the "when to fire" section)?
   - How to read the output (the trace table — `score`, `semanticConfidence`, `capacityClass`, etc.)?
   - What to do when score < 0.30 / when `knownCapacityIssues` is non-empty / when no candidates appear?
   - The difference between this and the sibling `/wiring-batch`?
2. **Completeness against the engine API** — the skill documents 3 modes (`analyze`, `batch_unwired`, `dashboard`). Are the args (`--top-k`, `--min-confidence`, `--json`, `--explain`) accurately described?
3. **Accuracy** — any false claims about what the dispatcher action returns or how the engine scores? Cross-check against the actual `WiringCandidate` shape (look at the engine source).
4. **Frontmatter conformance** — `name`, `description`, `version`, `triggers[]`, `pipeline_integrations` — does it match the wiring-batch sibling shape so the skill auto-trigger orchestrator can ingest it?
5. **Cross-refs** — the `[[nam
... [+605 chars truncated]

### Assistant | 2026-05-14T03:01:21.288Z

I'll review the skill file end-to-end against the engine/dispatcher source and sibling skill.

### Assistant | 2026-05-14T03:01:21.494Z

[tool_use: Read]

### User | 2026-05-14T03:01:21.900Z

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

### Assistant | 2026-05-14T03:01:24.604Z

Now let me check the engine source and dispatcher to verify accuracy claims.

### Assistant | 2026-05-14T03:01:25.213Z

[tool_use: Read]

### User | 2026-05-14T03:01:26.615Z

[tool_result] 1	/**
2	 * WiringPotentialEngine — Orphan-to-Dispatcher Recommendation
3	 * ===========================================================
4	 *
5	 * Analyzes an orphan engine (built but unwired) and ranks candidate
6	 * dispatchers it should be wired into. Combines three signals:
7	 *
8	 *   1. **Semantic relevance** — regex heuristic over the engine name
9	 *      (mirrors orphan-inventory.mjs DISPA
... [+26022 chars truncated]

### Assistant | 2026-05-14T03:01:31.095Z

I'll acknowledge the engine-conventions rules (noted: class+static, canonical constants, JSDoc, Zod, typed returns, no silent catch — these apply to engine code, not to the markdown skill under review). Now reading the dispatcher action to verify the skill's claims about modes and return shapes.

### Assistant | 2026-05-14T03:01:32.141Z

[tool_use: Read]

### User | 2026-05-14T03:01:32.938Z

[tool_result] 4480	                stateLoadError,
4481	                recent,
4482	                paths: { state: statePath, log: logPath },
4483	              },
4484	            };
4485	            break;
4486	          }
4487	
4488	          // ── CLEANUP-MS0/U-CLEANUP-C2: wiring_potential ───────────────
4489	          // WiringPotentialEngine (shipped in U-CLEANUP-C1) dispatcher
4490	          // surfac
... [+9891 chars truncated]

### Assistant | 2026-05-14T03:01:37.275Z

Acknowledged the rules. This is a markdown skill review only — no engine code or dispatcher action edits, so the engine and dispatcher conventions don't apply to the artifact under review. Now let me check the sibling skill for frontmatter shape conformance and verify the wikilink targets.

### Assistant | 2026-05-14T03:01:38.155Z

[tool_use: Read]

### Assistant | 2026-05-14T03:01:40.318Z

[tool_use: Bash]

### User | 2026-05-14T03:01:41.650Z

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
... [+1103 chars truncated]

### User | 2026-05-14T03:02:53.485Z

[tool_result] H:/prism/.claude/commands/build-state.md
H:/prism/.claude/commands/orphan-inventory.md
H:/prism/.claude/commands/wiring-batch.md
---memory---
C:/Users/wompu/.claude/projects/h--prism/memory/feedback_always_build.md
C:/Users/wompu/.claude/projects/h--prism/memory/feedback_roadmap_close_out.md

### Assistant | 2026-05-14T03:03:35.833Z

All wikilink targets resolve. Now I have full evidence to render the verdict.

---

# Review: `/wiring-potential` skill — VERDICT: **FAIL** (1× P0, 4× P1)

End-to-end review against `WiringPotentialEngine.ts` and `devDispatcher.ts:4501-4649`. The skill is well-written prose and operator-facing structure, but contains a load-bearing **accuracy bug** in the JSON example contract that will mislead any operator who passes `--json` or any consumer who parses the dispatcher payload.

---

## P0 (BLOCKING)

**P0-1 · JSON example contract is wrong — three fields renamed/missing vs the real `WiringCandidate` / `WiringPotentialReport` shape (lines 64-86).**
The skill documents the dispatcher return as:
```json
{ "engineName": "...", "topCandidate": "prism_dev",     ← string
  "candidates": [{ "capacityRatio": 0.43, ... }],         ← field name "capacityRatio"
  "knownCapacityIssues": [],                              ← field name "knownCapacityIssues"
  "analyzedAt": "..." }                                   ← field name "analyzedAt"
```
Real shape from `WiringPotentialEngine.ts:120-136`:
- `topCandidate` is a **full `WiringCandidate` object (or `null`)** — not a string. (`topCandidate: WiringCandidate | null`)
- The candidate's capacity field is named **`headroomRatio`**, not `capacityRatio`. (`headroomRatio: number`)
- The report-level warnings field is named **`warnings: string[]`**, not `knownCapacityIssues`. (No `knownCapacityIssues` field exists anywhere in the engine.)
- The timestamp field is named **`generatedAt`**, not `analyzedAt`. (`generatedAt: string`)

Downstream impact: every other section that references the wrong names also breaks — the trace table (line 113-119) lists `capacityRatio` (wrong; should be `headroomRatio`); the "Reading the trace" prose at line 126-129 says "if `knownCapacityIssues[]` is non-empty" (the field doesn't exist — should be `warnings[]`, which has different semantics: warnings contain *any* engine warning, not only capacity issues). An
... [+6086 chars truncated]
