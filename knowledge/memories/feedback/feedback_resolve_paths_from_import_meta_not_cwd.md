---
name: feedback_resolve_paths_from_import_meta_not_cwd
description: Engine/script file paths must resolve from import.meta.url or PRISM_ROOT — never bare process.cwd(). cwd is non-deterministic across launchers + breaks on drive remaps.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_resolve_paths_from_import_meta_not_cwd
---


# Resolve paths from import.meta.url / PRISM_ROOT, never bare process.cwd()

**Rule:** any engine/script that reads a repo-relative file must resolve it from `import.meta.url` (`fileURLToPath` + `path.dirname`) or `process.env.PRISM_ROOT` — **never** `join(process.cwd(), "...")`. The canonical source is `mcp-server/src/constants.ts:5-7` (`PRISM_ROOT`/`MCP_SERVER` derived from `import.meta.url`).

**Why:** `process.cwd()` is whatever directory the *launcher* happened to be in — a scheduled task, a supervisor, a watchdog→supervisor→daemon chain, or an operator shell can each set a different cwd. It also silently breaks on a **drive remap** (operator swapped `N:`→`H:` 2026-06-08; the running daemon's cwd stayed `N:\` → every `process.cwd()`-relative read hit ENOENT on the dead drive).

**The compounding trap:** when half the engines assume `cwd=mcp-server` and half assume `cwd=repo-root`, NO single cwd is correct (R7 — surface the conflict, don't average). A cwd pin then *trades* one broken cluster for another. The only correct fix is cwd-independent resolution.

**How to apply:**
- New engine reading a file → `const HERE = path.dirname(fileURLToPath(import.meta.url));` then resolve relative to HERE, OR import `PRISM_ROOT`/`MCP_SERVER` from `constants.ts`.
- Auditing a path bug → grep `process.cwd()` first; a bare `join(process.cwd(), ...)` with no HERE/env fallback is the smell.
- Spawning a child process → pass `env: { ...process.env, PRISM_ROOT: "H:/prism" }` so env-aware engines resolve correctly regardless of cwd; do NOT rely on a `cwd:` pin alone.

See [[reference_mcp_cwd_convention_conflict_2026_06_08]]. Pairs with [[feedback_missing_file_copy_back]] + the drive-swap regression class.
