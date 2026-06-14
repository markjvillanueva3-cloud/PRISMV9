---
name: reference-tango-mcp-down-fallbacks-2026-05-29
description: script/CLI fallbacks for every discovery dispatcher action when the port-3100 MCP server is down
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.968Z
aliases: reference_tango_mcp_down_fallbacks_2026_05_29
---


The port-3100 MCP server is frequently down on this fleet (ECONNREFUSED). Discovery work must not stall. Fallbacks (slot:tango, 2026-05-29):

- `prism_session:master_index_query` → `node scripts/system-viz-query.mjs find <term>` (CLI over the graph; works offline)
- `prism_session:master_index_node_status` → grep `state/shared/BUILD_STATE.json` + `ENGINE_WIRING_INDEX`
- `prism_session:dispatcher_map_compact` → read `mcp-server/data/docs/DISPATCHER_DIGEST.md`
- `prism_guard:dup_guard_check` → `node .claude/helpers/duplication-guard.mjs` (findSimilarAssets/classifyAsset)
- `prism_dev:wiring_potential` → `node scripts/audit-unwired-engines.mjs`
- `prism_dev:capability_census` → `node scripts/build-state-snapshot.mjs`
- `prism_knowledge:tribal_capture` → append `mcp-server/data/tribal/<slot>-<domain>-tribal.jsonl`, then re-embed when MCP recovers

**Why:** the canonical dispatcher is ranked + cached (better), but a down server is not an excuse to skip search-first or dedup. **How to apply:** try the dispatcher first; on ECONNREFUSED, drop to the script fallback and note it in the commit/handoff (R12 — don't pretend the canonical path ran).
