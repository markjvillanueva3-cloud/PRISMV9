# Hook + Skill Context Audit

Generated: 2026-03-28T00:55:17.581Z

## Current Surface

- Hook entries indexed: 53
- Skills indexed: 33
- Session-start compact pulse installed: yes
- Post-tool compressor installed: yes
- Coordination poll installed: yes
- Coordination daemon bootstrap installed: yes
- Auto-route context coverage: context-budget=yes, memory-prune=yes, checkpoint=yes, feature-matrix=yes

## High-Value Skill Candidates

- `activate-features` (agent) — One-shot activation of all automatic Codex features -- hooks, crons, health checks, telemetry. Run once per fresh setup.
- `checkpoint` (agent) — Create a named context checkpoint before destructive operations or after milestone completion. Saves current state summary.
- `codebase-memory-exploring` (agent) — Codebase knowledge graph expert. ALWAYS invoke this skill when the user explores code, searches for functions/classes/routes, asks about architecture, or needs codebase orientation. Do not use Grep, Glob, or file search directly — use codebase-memory-mcp search_graph and get_architecture first.
- `codebase-memory-quality` (agent) — Code quality analysis expert. ALWAYS invoke this skill when the user asks about dead code, unused functions, complexity, refactor candidates, or cleanup opportunities. Do not search files manually — use codebase-memory-mcp search_graph with degree filters first.
- `codebase-memory-reference` (agent) — Codebase-memory-mcp reference guide. ALWAYS invoke this skill when the user asks about MCP tools, graph queries, Cypher syntax, edge types, or how to use the knowledge graph. Do not guess tool parameters — load this reference first.
- `codebase-memory-tracing` (agent) — Call chain and dependency expert. ALWAYS invoke this skill when the user asks who calls a function, what a function calls, needs impact analysis, or traces dependencies. Do not grep for function names directly — use codebase-memory-mcp trace_call_path first.
- `context-budget` (agent) — Monitor context window pressure, recommend compaction, track critical fact survival rate.
- `dispatch-format` (agent) — Format PRISM output for Dispatch (phone) consumption. Compact, emoji-free, 1-line summaries with expandable details.
- `feature-matrix` (agent) — Show which Codex features are active, which should be activated, and when each triggers automatically.
- `memory-prune` (agent) — Analyze and prune stale memory entries. Checks referenced files still exist, archives old entries, keeps MEMORY.md under 180 lines.
- `model-router` (agent) — "Recommend optimal Codex model tier (haiku/sonnet/opus) for a given task based on historical success rates and cost efficiency."
- `prism-review` (agent) — Run PRISM-specific code review on recent changes. Dispatches physics, wiring, and test review agents in parallel.

## Gaps

- hook coverage should stay focused on recovery, compression, and routing; avoid noisy always-on prompts.

## Recommendations

- SessionStart — Inject compact context recovery, memory pressure, SVI watch health, and bridge coverage.
- PostToolUse(Bash|Read) — Warn when output volume or file size suggests summarization is better than raw echo.
- UserPromptSubmit — Route hook/context/token prompts toward context-budget, memory-prune, checkpoint, and feature-matrix guidance.
- PreCompact/Stop — Keep shared directive paths present in survival artifacts so compaction recovery remains durable.
- SessionStart + UserPromptSubmit — Keep shared Claude/Codex coordination status warm and inject unseen agent updates before replanning.

