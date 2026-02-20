# PRISM Manufacturing Intelligence — Claude Code Context

## What This Is
Safety-critical CNC manufacturing MCP server. 31 dispatchers, 368 actions, 37 engines.
Mathematical errors cause tool explosions and operator injuries.
**Lives depend on correctness. Zero tolerance for shortcuts or placeholders.**

## Safety Laws (HARD RULES)
1. **S(x) ≥ 0.70 HARD BLOCK** — safety score must pass before any release
2. **NO PLACEHOLDERS** — every value real, complete, verified
3. **NEW ≥ OLD** — never lose data, actions, hooks, knowledge, line counts
4. **MCP FIRST** — use prism: dispatchers before filesystem when available
5. **NO DUPLICATES** — check before creating, one source of truth
6. **100% UTILIZATION** — if it exists, use it everywhere

## Build
```bash
npm run build          # ONLY build command (tsc --noEmit + esbuild + test:critical)
npm run build:fast     # Non-safety only
```
- **NEVER** standalone `tsc` (OOM at 3.87MB bundle)
- After build: run `scripts/verify-build.ps1` (checks 7 required symbols + bad patterns)
- Ω ≥ 0.70 = release ready. Current: Ω = 0.77

## Registry Counts (verified 2026-02-19)
Materials: 3,533 | Machines: 1,016 | Tools: 13,967 | Alarms: 10,033
Formulas: 509 | Toolpath Strategies: 680 | Threads: 339 specs
Skills: 196 | Scripts: 215 | Agents: 75 | Hooks: 62 (100% coverage)
**Total: 29,569 indexed entries across 9 registries**

## Current Position
- **Phase:** Roadmap v17.0 COMPLETE → R2 Safety next
- **Roadmap:** v17.0 (Claude Code Maximized) — 3 subagent archetypes, agent teams, hooks, task DAGs
- Read `data/docs/roadmap/CURRENT_POSITION.md` for exact milestone
- Read `data/docs/roadmap/PRISM_ROADMAP_v17.0.md` for full execution plan
- Read `C:\PRISM\state\ACTION_TRACKER.md` for pending items

## Subagents (.claude/agents/)
- **safety-physics** (opus, red): ALL safety + physics validation. S(x) ≥ 0.70 HARD BLOCK.
- **implementer** (sonnet, blue): Code changes, wiring, data processing. Follows Safety Laws.
- **verifier** (haiku, green): Tests, audits, regression checks. Reports only, never fixes.

## Key Architecture
### Dispatchers (31 total)
Manufacturing: prism_calc (26 actions), prism_safety (29), prism_thread (12), prism_toolpath (8)
Data: prism_data (20), prism_knowledge (5)
Session: prism_session (31), prism_context (18), prism_dev (9)
Quality: prism_validate (7), prism_omega (5), prism_ralph (3)
Intelligence: prism_guard (14), prism_pfp (6), prism_memory (6), prism_telemetry (7)
Orchestration: prism_orchestrate (14), prism_atcs (12), prism_autonomous (8), prism_autopilot_d (8)
Enterprise: prism_compliance (8), prism_tenant (15), prism_bridge (13), prism_nl_hook (8)
Dev: prism_sp (19), prism_skill_script (23), prism_doc (7), prism_hook (18)
Code Gen: prism_generator (6), prism_gsd (6), prism_manus (11)

### Persistence (H1 verified)
- `state/memory_graph/` — MemGraph nodes/edges, checkpoints every 60s
- `C:\PRISM\state\DECISION_LOG.jsonl` — Auto-captured for speed_feed, strategy_select, etc.
- `C:\PRISM\state\RECENT_ACTIONS.json` — Flight recorder, last 50 actions
- `C:\PRISM\state\ERROR_LOG.jsonl` — All errors with domain classification
- `C:\PRISM\state\checkpoints/` — Real checkpoint files at every 10th call

### Param Normalization
snake_case params auto-normalize to camelCase in safety/calc/thread dispatchers.
`tool_diameter` → `toolDiameter`, `feed_per_tooth` → `feedPerTooth`, etc. (40+ aliases)

## Key Paths
```
src/tools/dispatchers/    — 31 dispatcher files
src/engines/              — 37 engine files  
src/tools/autoHookWrapper.ts — Central hook/cadence/logging wrapper
src/tools/cadenceExecutor.ts — Cadence functions (checkpoint, pressure, etc.)
src/utils/paramNormalizer.ts — Snake→camel param aliases
src/utils/smokeTest.ts       — 5 boot canary tests
src/utils/responseSlimmer.ts — Token optimization
data/docs/roadmap/           — Phase files (51 files)
data/docs/gsd/GSD_QUICK.md   — GSD v22.0 canonical protocol
C:\PRISM\state\              — Runtime state (ACTION_TRACKER, logs, checkpoints)
```

## Code Conventions
- TypeScript strict mode, esbuild bundles to single dist/index.js
- All file writes use atomic pattern (write .tmp then rename)
- Anti-regression: `validate_anti_regression` mandatory before file replacements
- >50 lines of new code → state plan and get approval first
- When ambiguous → ask, don't assume and build 200 lines wrong
- Evidence ≥ L3 required for claims. "Evidence > 'I think'"

## Editing Protocol
- READ → edit_block/str_replace → VERIFY (never retype existing code)
- Append don't rewrite. State exact lines changed after edits.
- >30% doc reduction → warning. >60% → BLOCKED.
- On errors: fix ONE build error, rebuild, repeat. >5 from one edit → revert

## Session Protocol
1. Read `CURRENT_POSITION.md` and `ACTION_TRACKER.md` on start
2. Update position every 3 tool calls or after significant work
3. Flush results to disk after each logical unit
4. After build: run `scripts/verify-build.ps1`
5. Before file replacement: run anti-regression validation

## Mode Switching (Code ↔ Chat)
This codebase has an MCP server with 31 dispatchers for manufacturing physics,
safety validation, and quality scoring. These are available in BOTH Code and Chat modes.

**Code handles 90% of work** via 3 subagent archetypes + agent teams.
**Chat handles 10%** — only when confidence-based escalation triggers:

**Switch to Chat ONLY when:**
- safety-physics reports confidence < 85% (out-of-distribution input)
- Architecture decision with multiple valid approaches needing human judgment
- Gate failure after 2 retries despite fixes
- MCP server debugging (restart, config changes)

**When switching, write to C:\PRISM\state\SWITCH_SIGNAL.md:**
```
SWITCH TO CHAT: [reason + context]
```
Then tell the user: "Switch to Chat mode — [reason]."
Chat reads SWITCH_SIGNAL.md, resolves, writes CHAT_RESOLUTION.md.
Code reads resolution and continues.

**After switching, the receiving mode reads CURRENT_POSITION.md for context.**
