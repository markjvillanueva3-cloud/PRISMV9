---
title: Windows --max-old-space-size is a COMMIT RESERVATION — never raise the fleet hook heap to "fix" the master-index sidecar ceiling
type: lesson
tags: [hardening, windows, heap, mcp-fleet-capacity, master-index, portable-node, near-miss, regression-guard]
slot: sierra
date: 2026-06-23
severity: high
status: active
---

# Lesson: don't raise the fleet hook heap (Windows commit-reservation trap)

## The trap (a near-miss, 2026-06-23, slot sierra)
The master-index cheap-search degrades on every prompt: `master-index-search-lib.mjs`
rejects the ~267MB `system-graph-index.json` sidecar with
`"267MB exceeds the safe parse ceiling 151MB for this 432MB heap -- using legacy path"`
and falls back to the 59MB `architecture-graph.json` (fewer nodes, advisory top-5 hits).

The OBVIOUS "fix" — raise the hook heap so the sidecar loads — is **DANGEROUS** and was
caught in review before shipping. It would reintroduce a documented production outage.

## Why raising the heap reintroduces an outage (the load-bearing fact)
`.claude/bin/portable-node` (canonical: `C:/Users/wompu/.claude/bin/portable-node`, mirrored
to `H:/.claude/bin/portable-node` — NOT the stale `H:/prism/.claude/bin/` project copy) caps
the hook heap at `--max-old-space-size=${PRISM_HOOK_HEAP_MB:-384}` **deliberately**
(MCP-FLEET-CAPACITY-MS0, 2026-06-08). The rationale, verbatim from the script header:

> On Windows, `--max-old-space-size` is a **COMMIT RESERVATION** (counts against the commit
> ceiling even when unused), unlike Linux's lazy mmap. With ~30 hooks/Stop x multiple chats,
> a blanket 4GB cap = ~84 node procs each RESERVING 4GB -> ~210GB commit against a 227GB
> ceiling, while only ~7GB was ever RESIDENT. At >=96% commit Windows refuses new process
> spawns (ERROR_NO_SYSTEM_RESOURCES 0x800710E0) and the MCP supervisor can't launch ->
> false "MCP Server failing".

So a blanket heap raise (in portable-node OR via `PRISM_HOOK_HEAP_MB`) re-creates the exact
commit-storm that broke MCP server spawns. **The 384MB cap + architecture-graph fallback is
the FIX, not the bug.** The fallback is intentional graceful degradation for an ADVISORY inject.

## Do / Don't
- **DON'T** raise `PRISM_HOOK_HEAP_MB` / portable-node's default heap to load the big sidecar.
- **DON'T** apply `ensure-heap-floor.mjs` to portable-node. `ensureHeapFloor` floors JS **child
  spawns** (the MCP daemon/supervisor — one or few processes, floored to 4096/24576MB). That is
  a DIFFERENT case from the **many-concurrent-hook** commit budget. Do not generalize it.
- **DO** let the architecture-graph fallback stand — it returns layer hits; the delta is only
  memory/wiki/ghost nodes in an advisory top-5.
- **DO**, if full-coverage cheap-search is genuinely required, **SHARD** the sidecar: emit the
  inverted index + node store as size-bounded shards + a manifest; the reader loads only the
  shard(s) for the query's tokens, keeping the resident footprint under the 384MB cap (no big
  reservation). This is a high-cost load-bearing rewrite of `master-index-search-lib.mjs` (every
  hook uses it) for modest advisory value — scope it as a dedicated focused build, not a quick fix.

## Verify before "fixing" a heap/OOM ceiling
- A `--max-old-space-size` value on Windows is a commit reservation; multiply it by the number
  of CONCURRENT processes before raising it, and compare to the commit ceiling (`systeminfo` /
  Get-CimInstance Win32_OperatingSystem TotalVirtualMemorySize).
- The interactive Bash heap (default ~4144MB here) is NOT the hook-execution heap (~432MB via
  the 384 cap). Test the REAL path: `echo '{"prompt":"x"}' | "H:/.claude/bin/portable-node" .claude/hooks/<hook>.mjs`.

Related: `scripts/lib/ensure-heap-floor.mjs` · `.claude/helpers/mcp-server-daemon.mjs` (ensureHeapFloor for spawns) ·
[[reference_mcp_boot_heap_oom_2026_06_09]] · [[reference_sierra_octopus_localonly_and_synergy_state_2026_06_23]] ·
`scripts/lib/master-index-search-lib.mjs` (tryLoadSidecar ceiling).
