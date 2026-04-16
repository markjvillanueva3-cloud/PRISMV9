# PRISM Code System Index — Compact Reference

**3500+ files** mapped to shortcodes. Use `/code-index` skill or `CodeSystemIndexEngine.resolve(code)`.

Generated: 2026-04-12

## Categories

- **E** = Engine (1536)
- **D** = Dispatcher (82)
- **A** = Algorithm (156)
- **S** = Schema (151)
- **H** = Hook (109)
- **U** = Util (31)
- **RG** = Registry (24)
- **SV** = Service (11)
- **T** = Test (1255)
- **C** = Catalog (101)
- **M** = Milestone (419)
- **DOC** = Doc (47)
- **R** = Root (4)

## Usage

- `E0001` -> first engine alphabetically
- `D01` -> first dispatcher
- `T0001` -> first test file
- `M001` -> first milestone envelope

## Entry Points

- **ToolRouter**: 107 patterns -> 44 dispatcher targets
- **CLI**: `prism <command>` (8 commands)
- **MCP**: 82 dispatchers, 4,668 actions
- **Skills**: 45 slash commands in .claude/skills/

## DSL-Eligible Actions

Many dispatcher actions support DSL-style structured invocation:
- Speed/Feed calculations: `prism_calc:speed_feed { material, tool, operation }`
- Post-processing: `prism_cam:post_process { program, dialect, options }`
- Quoting: `prism_business:quote_estimate { part, material, operations }`

See MASTER_INDEX.json `dsl_eligible_actions` field per dispatcher.

## Full Index Files

- `data/docs/CODE_SYSTEM_INDEX.json` — Full shortcode mapping
- `data/MASTER_INDEX.json` — Complete dispatcher/action/engine index
- `data/docs/ENGINE_DIGEST.md` — 1536 engines, 1-line each
- `data/docs/DISPATCHER_DIGEST.md` — 82 dispatchers with action counts

## Engine

`src/engines/CodeSystemIndexEngine.ts` — Resolves shortcodes to paths
