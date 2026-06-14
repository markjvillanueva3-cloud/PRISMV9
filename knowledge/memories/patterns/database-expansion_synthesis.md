---
name: database-expansion_synthesis
description: "[auto-synth · verify] Compounding synthesis of the database-expansion domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: database-expansion
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:47:30.760Z
  sourceHash: 8172d6e1ea0e
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
- **MCP :3100 instability** – repeated crashes caused by OOM on boot, orphaned `node dist/index.js` processes, and port‑bind contention ([reference_mcp_boot_heap_oom_2026_06_09], [reference_mcp_orphan_server_leak_2026_05_29], [reference_mcp_daemon_pileup_port_conflict_2026_06_09]).  
- **Missing watchdog/boot‑guard** – the server runs without a persistent supervisor, so a single failure takes the whole fleet down ([reference_mcp_supervisor_persistence_fix_2026_05_31], [reference_mcp_bootgrace_dormant_wiring_2026_06_04]).  
- **Single‑transport invariant violation** – `McpServer.connect()` is used as a singleton, leaking state across sessions and amplifying the above failures ([reference_mcp_sdk_single_transport_invariant_2026_05_25]).  
- **Fallback CLI paths** – every high‑level dispatcher (discovery, semantic search) has a scripted “run‑lean” fallback that bypasses the MCP server when it is unavailable ([reference_reference_tango_mcp_down_fallbacks_2026_05_29], [reference_bravo_qdrant_down_fallback], [reference_call_engine_server_free_invoker_2026_06_08]).  
- **Observability & metrics** – a `/metrics` endpoint now emits per‑tool call counts, latency percentiles and RSS, enabling automated detection of the above patterns ([reference_mcp_metrics_observability_2026_05_30]).  
- **Fleet‑wide resilience plan** – ordered fix list (bootguard default‑on, supervisor persistence, heap bump, duplicate daemon reaper) that is applied across all engines, including `database‑expansion` ([reference_mcp_resilience_plan_2026_06_04], [reference_mcp_fleet_scale_fix_2026_05_29]).

## Key decisions & rules
1. **Run every MCP engine under the permanent watchdog** – enable `PRISM_MCP_WATCHDOG_BOOTGUARD` by default and wire the `bootStartedAt` stamp into the reconnect hook ([reference_mcp_bootgrace_dormant_wiring_2026_06_04]).  
2. **Create a fresh `McpServer` per session** (factory pattern) instead of re‑using a singleton; this satisfies the single‑transport invariant and prevents cross‑session leaks ([reference_mcp_sdk_single_transport_invariant_2026_05_25]).  
3. **Cap or bump the Node heap for the MCP process** to stay below the 384 MiB portable‑node limit, avoiding OOM on boot ([reference_mcp_boot_heap_oom_2026_06_09], [reference_mcp_oom_heap_bump_2026_05_23]).  
4. **Detect and reap duplicate daemons** before they bind `:3100`; the fleet reaper must be extended to watch for port‑conflict signatures ([reference_mcp_daemon_pileup_port_conflict_2026_06_09], [reference_mcp_multi_instance_leak_3100_2026_06_02]).  
5. **Provide a CLI fallback for every `prism_*` dispatcher** that calls the engine directly via `scripts/call-engine.mjs` when MCP is unreachable ([reference_call_engine_server_free_invoker_2026_06_08], [reference_reference_tango_mcp_down_fallbacks_2026_05_29]).  
6. **Instrument `database‑expansion` with `/metrics`** and expose per‑engine counters so its health can be correlated with MCP stability ([reference_mcp_metrics_observability_2026_05_30]).  
7. **Adopt the GSD (Get‑Stuff‑Done) session‑lifecycle pattern** for `database‑expansion`, mirroring the CAM and Lathe domains, to guarantee clean start/close semantics ([reference_kilo_cam_gsd_2026_05_29], [reference_whiskey_lathe_gsd_protocol_2026_05_29]).

## Open threads
- **Integration of GSD lifecycle into `database‑expansion`** – a concrete spec (similar to CAM/GSD) is still missing; need to define `orient → emit → ship → close` steps for schema migrations.  
- **Metrics granularity for DB‑expansion queries** – current `/metrics` covers generic MCP calls; we must add custom counters for `prism_database_expand`, `prism_schema_check`, etc.  
- **Testing the single‑transport rule across all DB‑expansion actions** – no explicit verification exists that each action spawns its own server instance.  
- **Automated fallback trigger** – decide whether the CLI fallback should be invoked automatically on a 5 s HEAD timeout or only via operator command.  
- **Heap sizing for large schema loads** – OOM has been observed with generic MCP traffic; it is unclear if DB‑expansion’s bulk import will exceed the current heap bump.  

*All citations refer to the numbered memory excerpts provided.*
