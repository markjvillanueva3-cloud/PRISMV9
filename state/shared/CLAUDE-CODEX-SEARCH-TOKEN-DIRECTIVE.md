# Claude/Codex Search + Token Directive

## Status

Active until the user explicitly replaces this directive.

## Purpose

This is the canonical shared directive for how Claude and Codex should handle
search, repo orientation, context retention, and token economy while working concurrently in PRISM.

The goal is to reduce duplicated exploration, reduce token waste, and keep both agents grounded
in the same indexed surfaces before broad search.

## Core Rule

Both agents should prefer shared PRISM indexes, digests, and bridge files before broad repo sweeps.

Do not default to wide filesystem search when a shared index can answer the navigation question first.

## Preferred Search Order

1. Read current shared directives and handoff state
2. Consult the shared index surfaces registry:
   - `H:/prism/state/shared/PRISM_SHARED_INDEX_SURFACES.md`
   - `H:/prism/state/shared/PRISM_SHARED_INDEX_SURFACES.json`
3. Use high-value index files such as:
   - `MASTER_INDEX_COMPACT.md`
   - `DIRECTORY_DIGEST.md`
   - `DISPATCHER_DIGEST.md`
   - `ENGINE_DIGEST.md`
   - `CODE_SYSTEM_INDEX.json`
   - `PATH_INDEX.md`
   - `roadmap-index.json`
4. Only then fall back to targeted file reads or broader search

## Concurrent Work Rule

Assume Claude and Codex may be building at the same time.

- Claude remains backend-first unless the user changes ownership.
- Codex remains frontend-first unless the user changes ownership.
- Both agents should use the same shared directives, bridge files, and indexes.
- Both agents should avoid redundant broad repo sweeps when the shared indexes already provide orientation.
- Both agents should leave contract notes and handoff clues in shared artifacts when cross-lane work depends on each other.

## Token Economy Rule

- Prefer summaries, digests, and indexes over raw dumps.
- Prefer targeted reads over reading entire large files.
- Prefer registry and bridge artifacts over rediscovering known command or system surfaces.
- When tool output is large, summarize key lines and reference file paths rather than echoing full results.
- Treat compaction survival and shared memory as first-class recovery surfaces.

## Shared Recovery Surfaces

Read these whenever context is missing or a session reconnects after compaction:

- `H:/prism/.claude/helpers/.compaction-survival.md`
- `H:/prism/state/shared/memory/MEMORY.md`
- `H:/prism/state/shared/CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md`
- `H:/prism/state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md`
- `H:/prism/state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`
- `H:/prism/state/shared/CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md`

## Shared Index Registry

The canonical index inventory lives at:

- `H:/prism/state/shared/PRISM_SHARED_INDEX_SURFACES.md`
- `H:/prism/state/shared/PRISM_SHARED_INDEX_SURFACES.json`

Refresh it with:

```powershell
node H:\prism\scripts\index\build-shared-index-surfaces.mjs
```

## Stop Condition

This directive remains active until the user explicitly replaces it with a newer shared operating rule.
