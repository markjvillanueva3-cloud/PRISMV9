# Claude/Codex MCP Development Directive

## Status

Active until the user explicitly replaces this directive, or until the user confirms that newer native model/runtime capabilities have made the relevant PRISM MCP development surfaces obsolete.

Do not self-retire this directive based on speculation alone.

## Purpose

This is the canonical long-term instruction file for both Claude and Codex regarding
use of PRISM MCP-server development capabilities.

The goal is to keep both agents grounded in the same project-aware development surfaces
instead of re-inventing local state, startup context, build status, test visibility, or
SVI coverage logic from scratch in each session.

The shared operational playbook for this directive is:

- `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-UTILIZATION-DIRECTIVE.md`
- `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-POWER-PLAYBOOK.md`

## Mandatory Reads On Reconnect

Read these in this order:

1. `H:/prism/state/shared/CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md`
2. `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-UTILIZATION-DIRECTIVE.md`
3. `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-POWER-PLAYBOOK.md`
4. `H:/prism/state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md`
5. `H:/prism/state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`
6. `H:/prism/state/shared/SVI-watch-status.md`

## Core Rule

Treat PRISM MCP-server development capabilities as preferred shared infrastructure whenever they are the best source of truth for:

- startup and recovery context
- build and server status
- shared codebase search or server-side file access
- smoke-test inventory and stored test results
- SVI, Psi, drift, and watch-status reporting
- automation quality, auto-wiring, formula validation, and self-improvement status

Do not bypass these capabilities when doing so would lose shared visibility or duplicate system logic.

## Practical Preference Rule

Use the MCP-server dev surfaces when they materially improve parity, traceability, or shared state.

Examples:

- prefer `prism_dev:session_boot` for project-aware session bootstrapping
- prefer `prism_dev:build` or the matching REST route for shared build health
- prefer `prism_dev:server_info` when checking live server structure
- prefer `prism_dev:test_smoke` and `prism_dev:test_results` for shared smoke/test visibility
- prefer `prism_dev:svi_read` and `prism_dev:svi_summary` over ad hoc interpretation of stale files when the server is running
- prefer the full utilization directive when choosing among the broader `35` `prism_dev` actions and helper scripts

This directive does **not** forbid direct local shell or file tools when they are the right tool for implementation work.
It means the MCP-server should stay part of the default operating workflow whenever it adds real value.

## Current Dev Capability Surface

Primary dispatcher:

- `prism_dev:session_boot`
- `prism_dev:build`
- `prism_dev:code_template`
- `prism_dev:code_search`
- `prism_dev:file_read`
- `prism_dev:file_write`
- `prism_dev:server_info`
- `prism_dev:test_smoke`
- `prism_dev:test_results`
- `prism_dev:svi_compute`
- `prism_dev:svi_read`
- `prism_dev:svi_summary`

Primary REST mirrors:

- `/api/v1/dev/session-boot`
- `/api/v1/dev/build`
- `/api/v1/dev/code/template`
- `/api/v1/dev/code/search`
- `/api/v1/dev/file/read`
- `/api/v1/dev/file/write`
- `/api/v1/dev/server-info`
- `/api/v1/dev/test/smoke`
- `/api/v1/dev/test/results`
- `/api/v1/dev/svi/compute`
- `/api/v1/dev/svi/read`
- `/api/v1/dev/svi/summary`

## Coordination Rule

- Claude owns backend implementation unless the user explicitly changes ownership.
- Codex owns frontend implementation unless the user explicitly changes ownership.
- Both agents should still use the shared MCP dev surfaces for boot/build/test/SVI awareness when relevant.
- Both agents should leave contract notes when frontend or backend work depends on MCP-server capabilities not yet exposed cleanly enough.

## SVI Rule

When the server is running, prefer:

- `prism_dev:svi_read`
- `prism_dev:svi_summary`

Use `prism_dev:svi_compute` when a deliberate recompute is warranted after major system-surface changes.

Treat coverage alerts and drift as immediate follow-up work until Psi reaches 100%, per the shared SVI directive.

## Obsolescence Rule

This directive remains active even as models improve.

Retire or narrow it only when:

1. the user explicitly confirms that newer native model/runtime capabilities make the PRISM MCP-server dev surfaces unnecessary for the relevant workflow, or
2. the repo is updated to replace these capabilities with a new canonical system.

Until then, assume the MCP-server remains part of the intended development workflow whenever relevant.
