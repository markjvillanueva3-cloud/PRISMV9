# Codex Capability Incorporation Audit
## Date: 2026-03-30

## Purpose

Audit how the full PRISM operating system works today and map what must be incorporated into Codex so Codex uses the same durable development stack instead of relying on ad hoc local behavior.

This audit focuses on:

- command pipelines
- hook and helper pipelines
- MCP-server development surfaces
- shared coordination and recovery surfaces
- Codex-local rules and skill coverage
- the gap between PRISM's intended operating model and Codex's current actual behavior

## Executive Summary

PRISM already has a strong, multi-layer operating system for development:

1. markdown command specs
2. hook-backed helper pipelines
3. shared coordination surfaces
4. MCP-server development routes and dispatcher actions
5. roadmap / task-queue / spawned-agent directives
6. automation-hardening roadmaps and quality engines

Codex currently mirrors only part of that system.

Codex is already aligned on:

- spawned-agent awareness
- `/rgs-sync`
- shared task queue

Codex is **not yet fully incorporated** into:

- `/startup` as a literal startup pipeline
- `/smart` as a literal role/model/effort protocol
- `/forge-triple` as a literal engines + skills + hooks pipeline
- `/compact` as a mirrored recovery protocol
- PRISM MCP dev surfaces as the default shared build/test/SVI infrastructure
- Claude-style automatic coordination polling and startup hook behavior

So the current truth is:

- PRISM full-system development model exists
- Codex partially participates
- Codex still needs stronger default adoption of the PRISM stack

## System Layers

## 1. Command Layer

Canonical command parity source:

- `C:\PRISM\state\shared\CLAUDE-CODEX-COMMAND-BRIDGE.md`

Key PRISM commands relevant to Codex incorporation:

- `/startup` → `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\startup.md`
- `/smart` → `C:\PRISM\.claude\commands\smart.md`
- `/forge-triple` → `C:\Users\Admin.DIGITALSTORM-PC\.claude\commands\forge-triple.md`
- `/compact` → hook pipeline from `C:\PRISM\.claude\settings.json`
- `/rgs-sync` → `C:\PRISM\.claude\commands\rgs-sync.md`

Bridge rule already states that Codex can mirror markdown commands by reading the command spec and following it as instructions.

### Audit Finding

This capability exists on paper, but Codex's local PRISM rules only explicitly encode `/rgs-sync`, task queue, and spawn awareness.

## 2. Hook + Helper Layer

Primary runtime config:

- `C:\PRISM\.claude\settings.json`

Important helper families already present:

- token/context optimization:
  - `read-optimizer.mjs`
  - `search-optimizer.mjs`
  - `posttooluse-compressor.mjs`
- compaction / recovery:
  - `pre-compact.mjs`
  - `compaction-survival.mjs`
  - `compact-restore.mjs`
  - `session-start-compact.mjs`
- coordination:
  - `agent-coordination.mjs`
  - `agent-coordination-daemon.mjs`
  - `roadmap-sync.mjs`
  - `task-queue.mjs`
  - `per-agent-handoff.mjs`
- session quality / loop resistance:
  - `loop-detector.mjs`
  - `stop-guard.mjs`
  - `session-summary.mjs`
  - `cache-writer.mjs`
  - `session-breadcrumb.mjs`

### Audit Finding

Claude gets these automatically through the hook runtime.
Codex does not currently have equivalent automatic hook execution in its local PRISM rules.

Codex therefore participates in the helper ecosystem only when explicitly instructed, not as a default development runtime.

## 3. Shared Coordination Layer

Canonical shared surfaces:

- `C:\PRISM\state\shared\AGENT_CHAT.md`
- `C:\PRISM\state\shared\AGENT_WORKBOARD.md`
- `C:\PRISM\state\shared\ROADMAP_COLLABORATION_STATE.md`
- `C:\PRISM\state\shared\TASK_QUEUE.md`
- `C:\PRISM\state\shared\TASK_COORDINATION_SPEC.md`
- `C:\PRISM\state\shared\CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`
- `C:\PRISM\state\shared\CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md`
- `C:\PRISM\state\shared\CLAUDE-CODEX-SPAWNED-AGENT-DIRECTIVE.md`

### Audit Finding

Codex already uses this layer meaningfully.
This is the strongest part of Codex incorporation today.

## 4. MCP-Server Development Layer

Canonical directive:

- `C:\PRISM\state\shared\CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md`

Mounted dev routes:

- `C:\PRISM\mcp-server\src\routes\dev.ts`

Primary dispatcher:

- `C:\PRISM\mcp-server\src\tools\dispatchers\devDispatcher.ts`

Validated actions:

- `C:\PRISM\mcp-server\src\schemas\devActionSchemas.ts`

Core dev actions available now:

- `session_boot`
- `build`
- `code_template`
- `code_search`
- `file_read`
- `file_write`
- `server_info`
- `test_smoke`
- `test_results`
- `svi_compute`
- `svi_read`
- `svi_summary`
- `quality_score*`
- `auto_wiring_*`
- `schema_gap_scan`
- `test_gap_scan`
- `formula_accuracy*`
- `self_improvement_*`
- `auto_fix_*`
- `quality_dashboard*`

### Audit Finding

These are the exact shared surfaces that should make Codex cheaper, more traceable, and more consistent for:

- startup
- build health
- smoke visibility
- SVI status
- quality/automation status
- auto-wiring analysis

But Codex is still often using direct shell and file inspection instead of preferring these shared dev surfaces when they are the better source of truth.

## 5. Roadmap + Automation-Hardening Layer

Canonical child roadmaps:

- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-FULL-AUTOMATION-BLUEPRINT.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-DEVELOPMENT-AUTOMATION-ROADMAP.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\MCP-AUTOMATION-HARDENING-ROADMAP.md`

Already-implemented examples in current backend work:

- `FormulaValidationEngine.ts`
- `quality_dashboard*`
- `auto_fix_*`
- `auto_wiring_*`

### Audit Finding

The automation system is no longer hypothetical.
Codex should treat these dev/automation surfaces as first-class capabilities, not just roadmap prose.

## 6. Codex-Local Rule Coverage

Current Codex PRISM-specific local rules are concentrated in:

- `C:\Users\Admin.DIGITALSTORM-PC\.codex\AGENTS.md`

Current explicit Codex PRISM rules cover:

- spawned-agent awareness
- `/rgs-sync`
- task queue

Current Codex PRISM-specific skill coverage found locally:

- `C:\Users\Admin.DIGITALSTORM-PC\.codex\skills\prism-spawn-awareness`

### Audit Finding

Codex lacks local PRISM-native skill or rule coverage for:

- startup mirroring
- smart config mirroring
- forge-triple execution
- compact recovery mirroring
- MCP dev-surface preference
- automatic coordination polling

## Gap Matrix

## Already Incorporated Well

- shared task queue
- roadmap sync
- spawned-agent context bundle
- shared chat/workboard usage

## Partially Incorporated

- shared command bridge
- startup behavior
- main-roadmap sequencing
- shared handoff notes

## Weak / Missing

- `/smart` protocol as a default Codex behavior
- `/forge-triple` protocol as a capability-build discipline
- `/compact` recovery discipline
- `prism_dev:*` as preferred build/test/SVI/quality infrastructure
- automatic chat/workboard polling parity with Claude hooks
- Codex-native wrappers for PRISM automation routes

## Incorporation Plan

## Immediate

1. Expand Codex PRISM rules so Codex must mirror:
   - `/startup`
   - `/smart`
   - `/forge-triple`
   - `/compact`
   - MCP dev-surface preference
2. Require Codex to use the command bridge when a PRISM slash command is referenced.
3. Require Codex to prefer `prism_dev` surfaces for:
   - session boot
   - build health
   - smoke/test result visibility
   - SVI summary
   - quality/automation dashboards

## Near-Term

4. Add Codex-local PRISM operating skill coverage for:
   - startup
   - smart config
   - forge-triple
   - compact recovery
   - MCP dev usage
5. Add a Codex-side lightweight poll helper or startup routine that reads:
   - `AGENT_CHAT`
   - `AGENT_WORKBOARD`
   - `ROADMAP_COLLABORATION_STATE`
   before PRISM work begins.

## Full Incorporation Target

Codex should eventually treat PRISM as a real development operating system with these defaults:

- read startup state through the PRISM startup stack
- choose execution posture through the PRISM smart stack
- build new capabilities through the forge-triple stack when appropriate
- recover sessions through the compact/startup stack
- use shared build/test/SVI/quality state through `prism_dev`
- remain synchronized through task queue, roadmap sync, workboard, and agent chat

## Final Judgment

PRISM already contains the system Codex should be using.

The main problem is not missing architecture.
The main problem is incomplete Codex adoption of that architecture.

This means the highest-value Codex incorporation work is:

1. stronger Codex PRISM rules
2. stronger Codex skill coverage
3. stronger preference for `prism_dev` shared development surfaces
4. stronger mirroring of command/hook pipelines already defined in PRISM
