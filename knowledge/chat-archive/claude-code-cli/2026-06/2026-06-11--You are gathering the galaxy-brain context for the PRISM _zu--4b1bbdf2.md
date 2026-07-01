---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "You are gathering the galaxy-brain context for the PRISM \"zulu\" chat slot (galax"
date: "2026-06-11"
first_ts: "2026-06-11T03:19:06.080Z"
last_ts: "2026-06-11T03:21:19.857Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 16
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a50d7a1c9ccdf3463.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# You are gathering the galaxy-brain context for the PRISM "zulu" chat slot (galax

> **claude-code-cli** | 2026-06-11 | 36 msgs (16 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-a50d7a1c9ccdf3463.jsonl`

## Transcript

### User | 2026-06-11T03:19:06.080Z

You are gathering the galaxy-brain context for the PRISM "zulu" chat slot (galaxy: hermes-zulu). READ-ONLY. Report only what you actually read (file:line or filename).

TASK: Read these files (skip any that don't exist, note which):
- H:/prism/mcp-server/src/engines/hermes-zulu/MEMORY.md
- H:/prism/mcp-server/src/engines/hermes-zulu/CLAUDE.md
- H:/prism/mcp-server/src/engines/hermes-zulu/PATHS.md
- H:/prism/mcp-server/src/engines/hermes-zulu/TOOLBELT.md
- H:/prism/knowledge/memories/patterns/hermes-zulu_synthesis.md
- H:/prism/state/shared/per-slot-galaxy-buildout/zulu.md

Then list the actual engine files in H:/prism/mcp-server/src/engines/hermes-zulu/ (use Glob *.ts) and count them.

Report:
1. **Domain map** — what the hermes-zulu galaxy IS (its purpose, capabilities, the engines/scripts it owns). 1 paragraph + a bullet list of the key owned assets with paths.
2. **Documented open threads** — any "open thread", "TODO", "pending", "next", "NEEDS" items recorded in MEMORY.md/synthesis/buildout. Quote them.
3. **Hermes + Obsidian linkage** — does the galaxy brain document how it connects to (a) Hermes agent capabilities and (b) the Obsidian vault? Is that linkage CONCRETE (named scripts/dispatchers/hooks) or vague/missing? This matters: the operator wants the galaxy "linked into zulu to utilize hermes capabilities and obsidian vault capabilities" — report the current state of that linkage honestly.
4. **Staleness/gaps** — any place the brain references a file/script/asset that you should spot-check exists (Glob/Read a couple of the most load-bearing ones and report if they're real or phantom — PRISM has a history of hallucinated asset names in galaxy brains).

Tight markdown. Under ~700 lines. This feeds a synthesis step.

### Assistant | 2026-06-11T03:19:10.790Z

I'll read all the galaxy brain files in parallel, then glob the engine files.

### Assistant | 2026-06-11T03:19:11.253Z

[tool_use: Read]

### Assistant | 2026-06-11T03:19:11.767Z

[tool_use: Read]

### Assistant | 2026-06-11T03:19:12.252Z

[tool_use: Read]

### Assistant | 2026-06-11T03:19:12.742Z

[tool_use: Read]

### Assistant | 2026-06-11T03:19:12.746Z

[tool_use: Read]

### Assistant | 2026-06-11T03:19:13.184Z

[tool_use: Read]

### User | 2026-06-11T03:19:21.734Z

[tool_result] 1	# BRAVO + ZULU Galaxy Memory — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
2	
3	Append-only cross-session memory for the hermes-zulu galaxy. Bravo owns the build side; zulu owns the runtime/orchestration side. Both share this file.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="
... [+34029 chars truncated]

### User | 2026-06-11T03:19:24.525Z

[tool_result] 1	# Hermes-Zulu Galaxy (BRAVO + ZULU slots)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> BRAVO - HERMES/ZULU BUILDING + STUB HUNTING
5	> ZULU - HERMES AGENT CHAT FLEET ORCHESTRATOR
6	
7	Bravo BUILDS hermes-zulu (engines, hooks, dispatchers, soul-files, dream cycle, self-reflect populater, stub-hunter audits). Zulu IS the live orchestrator running on top — cross-slot synthesis, fleet d
... [+7397 chars truncated]

### User | 2026-06-11T03:19:26.225Z

[tool_result] 1	# Hermes-Zulu PATHS.md — H:/-wide path atlas (slot:bravo)
2	
3	Converts every future Grep/Glob from O(N) → O(1) for slot:bravo. All paths **glob-verified against canonical `H:/prism` on 2026-05-28** (the slot worktree carries only this session's touched files; verify against `H:/prism`). bravo writes the same relative paths in its slot worktree `H:/prism-slot-bravo`. Format: `<absolute-path> | <
... [+9637 chars truncated]

### User | 2026-06-11T03:19:29.433Z

[tool_result] 1	# Hermes-Zulu TOOLBELT.md — tool-call efficiency for slot:bravo
2	
3	The exact patterns bravo reaches for, memoized so future sessions don't re-derive them. Each entry saves tokens or time vs. the naive alternative.
4	
5	## Glob patterns (narrow, path-scoped — NEVER bare-root recursive)
6	- `*{zulu,hermes,stub,slot-soul,slot-context,slot-task}*` | path `H:/prism/.claude/hooks` | ~9 hits | find g
... [+7848 chars truncated]

### User | 2026-06-11T03:19:31.031Z

[tool_result] 1	---
2	name: hermes-zulu_synthesis
3	description: "[auto-synth · verify] Compounding synthesis of the hermes-zulu domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
4	metadata:
5	  type: patterns
6	  galaxy: hermes-zulu
7	  synthesizedFrom: 24
8	  model: gpt-oss:120b
9	  synthesizedAt: 2026-06-11T02:52:1
... [+3098 chars truncated]

### User | 2026-06-11T03:19:32.339Z

[tool_result] 1	# Galaxy buildout — slot:zulu (galaxy:hermes-zulu)
2	
3	> **Auto-fire trigger:** this file is THE first prompt slot:zulu executes on fresh-launch when `mcp-server/src/engines/hermes-zulu/` is missing OR incomplete.
4	> **Master protocol:** `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`
5	
6	## Your mission (per operator goal 2026-05-28)
7	
8	Build slot:zulu's **complete galaxy** so future ses
... [+17536 chars truncated]

### Assistant | 2026-06-11T03:19:35.709Z

Now I'll glob the actual engine files in the hermes-zulu directory.

### Assistant | 2026-06-11T03:19:36.109Z

[tool_use: Glob]

### User | 2026-06-11T03:19:40.436Z

[tool_result] No files found

### Assistant | 2026-06-11T03:19:43.229Z

[tool_use: Glob]

### User | 2026-06-11T03:19:48.077Z

[tool_result] mcp-server\src\engines\hermes-zulu\PATHS.md
mcp-server\src\engines\hermes-zulu\CLAUDE.md
mcp-server\src\engines\hermes-zulu\TOOLBELT.md
mcp-server\src\engines\hermes-zulu\AWARENESS.md
mcp-server\src\engines\hermes-zulu\MEMORY.md
mcp-server\src\engines\hermes-zulu\SOUL.md

### Assistant | 2026-06-11T03:19:51.346Z

Now spot-check two of the highest-leverage assets named in PATHS.md — the actual engine TS files are claimed to live in the root `src/engines/` directory (not the galaxy subdirectory). Let me verify a few.

### Assistant | 2026-06-11T03:19:52.374Z

[tool_use: Glob]

### Assistant | 2026-06-11T03:19:52.963Z

[tool_use: Glob]

### User | 2026-06-11T03:19:58.638Z

[tool_result] mcp-server\src\engines\MoonshotClientEngine.ts
mcp-server\src\engines\HermesFileScopePartitionerEngine.ts
mcp-server\src\engines\HermesParallelBudgetEnvelopeEngine.ts
mcp-server\src\engines\HermesParallelVerdictAggregatorEngine.ts
mcp-server\src\engines\HermesSelfCorrectionEngine.ts
mcp-server\src\engines\ZuluDashboardControlEngine.ts
mcp-server\src\engines\ZuluTaskAuctionEngine.ts
mcp-server\src\
... [+94 chars truncated]

### User | 2026-06-11T03:19:58.775Z

[tool_result] .claude\hooks\slot-brief-inject.mjs

### Assistant | 2026-06-11T03:20:01.134Z

[tool_use: Glob]

### Assistant | 2026-06-11T03:20:01.726Z

[tool_use: Glob]

### User | 2026-06-11T03:20:04.323Z

[tool_result] scripts\hermes-obsidian-memory-bridge.mjs

### User | 2026-06-11T03:20:04.749Z

[tool_result] scripts\account-switch-restart-coordinator.mjs

### Assistant | 2026-06-11T03:20:07.784Z

Good — all spot-checked assets are real. Now check the open-tasks ledger and the DreamMarkerScanner/ModelAttribution engine files that were claimed wired.

### Assistant | 2026-06-11T03:20:08.870Z

[tool_use: Glob]

### Assistant | 2026-06-11T03:20:09.522Z

[tool_use: Glob]

### User | 2026-06-11T03:20:12.075Z

[tool_result] state\shared\specs\BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md

### User | 2026-06-11T03:20:12.224Z

[tool_result] mcp-server\src\engines\OpusCapabilityEngine.ts
mcp-server\src\engines\ModelAttributionEngine.ts
mcp-server\src\engines\DreamMarkerScannerEngine.ts

### Assistant | 2026-06-11T03:20:14.739Z

[tool_use: Read]

### User | 2026-06-11T03:20:17.547Z

[tool_result] 1	# BRAVO / HERMES-ZULU — Domain Open-Tasks Ledger (curated, ROI-ordered)
2	
3	> **Canonical single-read context-regain surface for the bravo (hermes-zulu) galaxy.**
4	> Curated by a human-in-the-loop chat — DISTINCT from the two auto/narrative surfaces:
5	> - `state/shared/handoffs/consolidated/bravo.md` — auto-generated raw thread feed (40 threads,
6	>   mostly peer-drift + `L8-P*-MS2 / 759ms 37
... [+9561 chars truncated]

### Assistant | 2026-06-11T03:21:19.857Z

All reads complete. Here is the synthesis report.

---

## 1. Domain Map — What hermes-zulu IS

The hermes-zulu galaxy is PRISM's **agent-fleet orchestration substrate**. It has two roles sharing one galaxy directory: **bravo BUILDS** the orchestration infrastructure (engines, hooks, dispatch wiring, stub-hunting), and **zulu IS** the slot-less runtime master conductor (the Hermes desktop app embodies ZULU — above the 25 worker slots, never a 26th worker).

Key owned assets:

- **Engine files** (9 real `.ts` files, all in `H:/prism/mcp-server/src/engines/`, NOT in the galaxy subdirectory — the galaxy dir contains only brain/doc files):
  - `HermesParallelFanoutPlannerEngine.ts` — parallel agent fan-out planning
  - `HermesFileScopePartitionerEngine.ts` — file-scope partitioning (no collisions)
  - `HermesParallelBudgetEnvelopeEngine.ts` — per-fanout token/turn budget
  - `HermesParallelVerdictAggregatorEngine.ts` — aggregate parallel reviewer verdicts
  - `HermesSelfCorrectionEngine.ts` — self-correction loop
  - `ZuluTaskAuctionEngine.ts` — soul-weighted NATO-slot work order auction
  - `ZuluDashboardControlEngine.ts` — fleet dashboard control
  - `ZuluFleetGovernorEngine.ts` — authority gate (wired `prism_session:zulu_authority_check`)
  - `MoonshotClientEngine.ts` — Opus heavy-reasoning invocation
  - Plus wired orphan rescues: `DreamMarkerScannerEngine.ts`, `ModelAttributionEngine.ts`, `OpusCapabilityEngine.ts`
- **Brain files** in `H:/prism/mcp-server/src/engines/hermes-zulu/`: `CLAUDE.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md`, `SOUL.md`, `AWARENESS.md` (6 files, 0 `.ts`)
- **Hooks**: `slot-context-bundle-inject.mjs`, `slot-soul-inject.mjs`, `zulu-advisory-inject.mjs`, `stop-slot-task-claims-advisory.mjs`, `auto-consensus-critical-edit` (PreToolUse, wired 2026-06-10)
- **Helpers/runtime CLIs**: `hermes-self-reflect-populater.mjs`, `hermes-dream-cycle-populater.mjs`, `chat-slots.mjs`, `slot-task-claim.mjs`, `per-agent-handoff.mjs`
- **Scripts**: `hermes-obsidi
... [+7030 chars truncated]
