# F6 — Shared Graph-Cache Daemon (design spec)

**Status:** specced (not built)
**Owner:** HIGH-ROI-TS2 audit-final/iter3 (slot:alpha, 2026-05-22)
**Source audit:** `state/shared/specs/OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18.md` Finding F6

## Problem

Every PreToolUse / UserPromptSubmit / SubagentStart hook that needs the system-graph spawns a fresh Node process and re-parses (or re-loads the sidecar of) the 363.5 MB merged `state/shared/system-viz/system-graph.json`. Even with the sidecar fast-path (`U-MEMORY-INDEX-SIDECAR`), the load is ~100 ms per spawn. With 5+ known graph-consumers (master-index-precheck-inject, viz-first-redirect, subagent-start-context, pre-read-graph-inject, pre-bash-graph-inject, wiki-precheck) firing per turn × ~50 turns/session × 26 chats = ~6500 redundant parses per active session.

A shared graph-cache daemon would amortize the parse: one resident process holds the parsed inverted index + nodes in memory; hooks query it via a tiny IPC (Unix socket on POSIX / named pipe on Windows). Per-spawn cost drops from ~100 ms to ~5 ms.

## Verification channel

```bash
# Baseline (pre-daemon): time a cold spawn of master-index-precheck-inject
echo '{"prompt":"x"}' | time node H:/prism/.claude/hooks/master-index-precheck-inject.mjs

# Target (post-daemon): same probe should drop ~95%
echo '{"prompt":"x"}' | time node H:/prism/.claude/hooks/master-index-precheck-inject.mjs --daemon
```

**Expected signal:** wall-clock time per hook spawn.
**Re-run cost:** ~5 s.
**Baseline today:** ~100 ms per spawn × 5+ graph-consumers × 50 turns × 26 chats = ~650 s/session/fleet.
**Daemon target:** ~5 ms per spawn → ~32 s/session/fleet (95% reduction).

## Architecture

```
+--------------------------+        +---------------------------------+
|  hook process (cold)     |        |  graph-cache-daemon (resident)  |
|  — opens socket          | <----> |  — loads sidecar once            |
|  — sends BM25 query      |        |  — holds inverted index + nodes  |
|  — gets top-K JSON back  |        |  — handles concurrent queries    |
+--------------------------+        +---------------------------------+
                                              |
                                              v
                                    state/shared/system-viz/
                                    system-graph-index.json (sidecar)
                                    system-graph.json (mtime check)
```

## Components

1. **`scripts/graph-cache-daemon.mjs`** — Node process, listens on a named pipe (`\\.\pipe\prism-graph-cache` on Windows, `/tmp/prism-graph-cache.sock` on POSIX). Auto-respawn via durable scheduled task (Windows) or `systemd --user` (Linux/Mac). Reloads graph on sidecar mtime change.

2. **`scripts/lib/graph-cache-client.mjs`** — Shared client lib. `queryGraph(tokens, opts)` opens the pipe, sends JSON `{op:"search", tokens, k}`, returns the top-K hits. Fall-back to direct `master-index-search-lib.mjs` if the daemon is unreachable (graceful degradation).

3. **Hook migrations** — Each of the 5+ graph-consumer hooks switches from `import { runMasterIndexSearch } from "../../scripts/lib/master-index-search-lib.mjs"` to `import { queryGraph } from "../../scripts/lib/graph-cache-client.mjs"`. The function signature is identical so the migration is mechanical.

4. **Watchdog** — A small Stop hook (`graph-cache-daemon-health.mjs`) checks the daemon is alive (probe the pipe with a no-op `ping`). If down, alerts via `state/shared/AGENT_CHAT.md` and the durable scheduled task restarts it.

## Safety properties

- **Graceful degradation** — if the daemon is down, every consumer falls back to the existing sidecar-fast-path code. No regression.
- **mtime gate** — daemon reloads when the sidecar file mtime changes (peer slot regenerated system-viz). Bounded staleness ≤ 30 s (poll interval).
- **Per-host pipe** — the named pipe is per-machine; cross-host cluster operation is not in scope.
- **Authentication** — pipe is owned by the user account; no remote/network exposure.
- **Resource cap** — daemon RSS budget ≤ 500 MB (graph nodes + inverted index). Restart on OOM via watchdog.

## Why deferred

- ~200 LOC across 4 new files + 5+ hook migrations + 1 watchdog + 1 scheduled task = full milestone scope.
- Windows named-pipe + POSIX socket dual-platform code is non-trivial.
- Daemon lifecycle management is the kind of cross-fleet wiring that benefits from dedicated golf-slot ownership.

## Recommended ownership

Open this as `GRAPH-CACHE-DAEMON-MS0` with units U-GCD01 (daemon), U-GCD02 (client lib), U-GCD03 (hook migrations 1-3), U-GCD04 (hook migrations 4-5), U-GCD05 (watchdog), U-GCD06 (scheduled task installer), U-GCD07 (Linux/Mac socket fallback).

## Cross-refs

- `[[reference_u_memory_index_sidecar_2026_05_20]]` — sidecar that today does 95% of the heavy lifting; the daemon caches its parsed form.
- `OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18` — original Finding F6.
- `HIGH-ROI-TS2/iter1-3` — exact-match collapse hooks (sister optimizations that reduce inject *size*; this spec attacks inject *latency*).
