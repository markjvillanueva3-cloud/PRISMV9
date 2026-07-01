# Claude/Codex Shared SVI Directive

## Status

Active until **Psi (reachability) = 100%** or the user explicitly replaces this directive.

## Purpose

This is the canonical long-term instruction file for both Claude and Codex regarding
PRISM System Variability Index behavior, reachability goals, and ongoing coverage discipline.

If a future session is missing context, the first recovery step is to read this file.

## Mandatory Reads On Reconnect

Read these in this order:

1. `H:/prism/state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md`
2. `H:/prism/state/shared/SVI-watch-status.md`
3. `H:/prism/state/shared/SVI-compact.md`
4. `H:/prism/state/shared/CODEX-SVI-AWARENESS.md`

## Core Rule

Treat **SVI** and **Psi** as standing operating metrics, not optional telemetry.

- Prefer work that increases real reachable system coverage.
- Do not hide disconnected systems behind page-local state or isolated workflows.
- Treat newly added features, routes, schemas, registries, engines, dispatchers, and database surfaces as possible SVI coverage changes.
- Treat any SVI coverage alert as immediate follow-up work until Psi reaches 100%.

## Live Sources

- `H:/prism/state/shared/SVI.json`
- `H:/prism/state/shared/SVI-compact.md`
- `H:/prism/state/shared/SVI-watch-status.json`
- `H:/prism/state/shared/SVI-watch-status.md`

## Runtime Behavior

When the PRISM MCP server is running:

- the server starts an always-on SVI watch loop
- watched surfaces are checked for drift automatically
- status is persisted to `SVI-watch-status.json` and `SVI-watch-status.md`
- `prism_dev:session_boot`, `prism_dev:build`, `prism_dev:svi_read`, and `prism_dev:svi_summary` include live watch status

When the PRISM MCP server is not running:

- read the shared SVI files directly
- treat the most recent watch status as advisory until the server is back up

## Preferred Access Paths

Use one of these whenever available:

- MCP: `prism_dev:svi_read`
- MCP: `prism_dev:svi_summary`
- REST: `/api/v1/dev/svi/read`
- REST: `/api/v1/dev/svi/summary`

## Coordination Rule

- Claude owns backend implementation unless the user explicitly redirects that ownership.
- Codex owns frontend implementation unless the user explicitly redirects that ownership.
- Both agents should leave contract notes when SVI coverage depends on surfaces not yet wired through the stack.
- Both agents should use this directive as the shared source of truth instead of relying on one-off prompts.

## What To Do When Coverage Alerts Appear

1. Identify which watched area changed.
2. Decide whether the change affects SVI counts, wired coverage, pipeline reachability, or both.
3. Leave a note or implement the needed wiring in the correct ownership lane.
4. Re-read `SVI-watch-status.md` and `SVI-compact.md` after the change.

## Stop Condition

This directive remains active until:

- **Psi reaches 100%**, or
- the user explicitly replaces this file with a new operating directive.
