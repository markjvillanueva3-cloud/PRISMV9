# PRISM Manufacturing Intelligence — Core Rules

## What This Is
Safety-critical CNC manufacturing MCP server. 45 dispatchers, 1060 actions, 125 engines.
Mathematical errors cause tool explosions and operator injuries.
**Lives depend on correctness. Zero tolerance for shortcuts or placeholders.**

## Safety Laws (HARD RULES)
1. **S(x) >= 0.70 HARD BLOCK** — safety score must pass before any release
2. **NO PLACEHOLDERS** — every value real, complete, verified
3. **NEW >= OLD** — never lose data, actions, hooks, knowledge, line counts
4. **MCP FIRST** — use prism: dispatchers before filesystem when available
5. **NO DUPLICATES** — check before creating, one source of truth
6. **100% UTILIZATION** — if it exists, use it everywhere

## Build
```bash
npm run build          # tsc --noEmit (type-check) + esbuild (bundle)
npm run build:fast     # esbuild only (no type-check)
```
- **NEVER** standalone `tsc` (needs 16GB+ heap for 130K LOC)
- After build: run `scripts/verify-build.ps1` (checks 7 required symbols + bad patterns)
- Omega >= 0.70 = release ready. Current: Omega = 0.912 (R3 verified)

## Subagents (.claude/agents/)
- **safety-physics** (opus, red): ALL safety + physics validation. S(x) >= 0.70 HARD BLOCK.
- **implementer** (sonnet, blue): Code changes, wiring, data processing. Follows Safety Laws.
- **verifier** (haiku, green): Tests, audits, regression checks. Reports only, never fixes.

## Key Paths
```
src/tools/dispatchers/       — 45 dispatcher files (see dispatchers/CLAUDE.md)
src/engines/                 — 125 engine exports (see engines/CLAUDE.md)
src/tools/autoHookWrapper.ts — Central hook/cadence/logging wrapper
src/tools/cadenceExecutor.ts — Cadence functions (checkpoint, pressure, etc.)
src/utils/paramNormalizer.ts — Snake-to-camel param aliases
src/utils/smokeTest.ts       — 5 boot canary tests
src/utils/responseSlimmer.ts — Token optimization
data/roadmap-index.json      — Master roadmap index (v5.3.0, 94 milestones)
data/milestones/             — 94 milestone envelope JSON files
data/docs/gsd/GSD_QUICK.md   — GSD v22.0 canonical protocol
C:/PRISM/state/              — Runtime state (logs, checkpoints, position)
```

## Code Conventions
- TypeScript strict mode, esbuild bundles to single dist/index.js
- All file writes use atomic pattern (write .tmp then rename)
- Anti-regression: `validate_anti_regression` mandatory before file replacements
- >50 lines of new code: state plan and get approval first
- When ambiguous: ask, don't assume and build 200 lines wrong
- Evidence >= L3 required for claims. "Evidence > 'I think'"

## Editing Protocol
- READ then edit_block/str_replace then VERIFY (never retype existing code)
- Append don't rewrite. State exact lines changed after edits.
- >30% doc reduction: warning. >60%: BLOCKED.
- On errors: fix ONE build error, rebuild, repeat. >5 from one edit: revert

## Session Protocol
1. Read `CURRENT_POSITION.md` and `ACTION_TRACKER.md` on start
2. Update position every 3 tool calls or after significant work
3. Flush results to disk after each logical unit
4. After build: run `scripts/verify-build.ps1`
5. Before file replacement: run anti-regression validation

## Domain Context (loaded from subdirectory CLAUDE.md files)
- `src/engines/CLAUDE.md` — AtomicValue schema, calculation patterns, engine list
- `src/tools/dispatchers/CLAUDE.md` — Dispatcher conventions, param normalization, action routing
- Registry counts, persistence paths, and architecture details: see MASTER_INDEX.md
