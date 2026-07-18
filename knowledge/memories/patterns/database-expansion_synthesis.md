---
name: database-expansion_synthesis
description: "[auto-synth · verify] Compounding synthesis of the database-expansion domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: database-expansion
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T17:58:56.543Z
  sourceHash: 5723c4161904
  advisoryOnly: true
  mustHumanVerify: true
---

# database-expansion — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **MCP :3100 instability** – frequent ECONNREFUSED, OOM kills, daemon crashes, or orphaned child processes repeatedly starve the live server and break discovery dispatchers.  
  - Server down → discovery actions stall unless a fallback is present ([reference_reference_tango_mcp_down_fallbacks_2026_05_29]).  
  - Orphaned `dist/index.js` workers consume ~12 GB, preventing HEAD checks from succeeding ([reference_mcp_orphan_server_leak_2026_05_29]; [reference_mcp_daemon_orphaned_by_design_2026_06_15]).
  - Boot‑time OOM under a 384 MB heap cap kills the server within seconds of start ([reference_mcp_boot_heap_oom_2026_06_09]; [reference_mcp_oom_heap_bump_2026_05_23]).
- **Supervision & watchdog gaps** – the MCP supervisor is fire‑once and dies, leaving the daemon unsupervised; boot‑guard is built but disabled by default ([reference_mcp_supervisor_persistence_fix_2026_05_31]; [reference_mcp_bootgrace_dormant_wiring_2026_06_04]).
- **Retry budget mismatch** – client retry window (15 s) is shorter than a cold‑boot restart (~50 s), causing JSON‑RPC failures that cascade into dropped `prism` calls ([reference_mcp_retry_budget_harden_2026_06_17]).
- **Transport singleton misuse** – the SDK’s `McpServer.connect()` binds a single transport; reusing it across sessions corrupts state. A factory per session is required ([reference_mcp_sdk_single_transport_invariant_2026_05_25]).
- **Vector‑store (qdrant) outage fallback** – semantic search fails when qdrant is down; the system must fall back to a write‑hook index and master `MEMORY.md` ([reference_bravo_qdrant_down_fallback]).
- **Lean “call‑engine” path** – scripts that invoke engine methods directly bypass the flaky MCP layer, providing a reliable shortcut for database‑expansion jobs ([reference_call_engine_server_free_invoker_2026_06_08]).

## Key decisions & rules
1. **Per‑session MCP client** – always create a fresh `McpServer` instance via a factory for each chat/operation; never reuse a singleton transport ([ref 13]).
2. **Enable boot‑guard by default** – ship the watchdog with `PRISM_MCP_WATCHDOG_BOOTGUARD=ON` and wire the `bootStartedAt` stamp into the reconnect hook to prevent flapping ([ref 6]; [ref 7] FIX‑3).
3. **Retry budget ≥ max restart time** – set client retry timeout to at least 60 s (or configurable) so that a full server reboot is covered ([ref 12]).
4. **Supervisor persistence** – run the MCP supervisor as a long‑lived service (auto‑restart on failure) rather than fire‑once; ensure it logs `LastResult` and restarts both daemon and its parent process ([ref 19]; [ref 7] FIX‑1/FIX‑2).
5. **Orphan cleanup policy** – monitor for stray `dist/index.js` processes; on detection, kill and log them, then restart the main MCP server to reclaim memory ([ref 4]; [ref 10]).
6. **Heap sizing** – raise Node heap limit (`--max-old-space-size`) above 2 GB or lower inherited caps via `NODE_OPTIONS` to avoid boot‑time OOM ([ref 9]; [ref 18]).
7. **Fallback CLI layer** – for every dispatcher action (e.g., `prism_memory:semantic_search`, discovery steps) provide a script that runs locally when MCP is unreachable, using the “call‑engine” path as the implementation base ([ref 1]; [ref 23]).
8. **Vector store degradation path** – on qdrant connection error, automatically switch to the write‑hook index and update `MEMORY.md` so downstream expansion pipelines continue uninterrupted ([ref 5]).

## Open threads
- **Daemon startup crash source** – the opaque `[ERROR] Server startup failed {}` remains unexplained; root cause analysis needed ([ref 3]).
- **Orphan process residuals** – despite supervisor fixes, occasional orphan clusters still appear; investigate whether launch scripts or OS‑level PID inheritance need redesign ([ref 4]; [ref 10]).
- **Integration backlog for slot golf** – many golf‑slot changes (including MCP resilience work) are not merged into the main branch, creating a merge bottleneck that could re‑introduce regressions ([ref 24]).
- **Boot‑guard wiring completeness** – confirm that all entry points (discovery, bridge, call‑engine) emit `bootStartedAt` and respect the guard flag; current implementation may miss edge cases ([ref 6]).
- **Vector‑store fallback validation** – test the semantic‑search fallback against large‑scale database‑expansion queries to ensure relevance quality is acceptable ([ref 5]).
