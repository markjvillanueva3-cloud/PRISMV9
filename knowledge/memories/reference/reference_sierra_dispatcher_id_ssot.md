---
name: reference_sierra_dispatcher_id_ssot
description: Graph dispatcher-node id SSOT is `disp.<file-derived>` NOT `dispatcher.<mcp-tool>` — wrong prefix mints dead-pixel edges.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.936Z
aliases: reference_sierra_dispatcher_id_ssot
---


**Dispatcher-node id SSOT (system-viz wiring inference).** When mapping an MCP tool-name (e.g. `prism_cam`) → a graph dispatcher node id, the canonical prefix is **`disp.`** + the file-derived id (e.g. `prism_cam` → `disp.camdispatcher`), NOT `dispatcher.<mcp_tool_name>`. `seed-ghost-from-unwired.mjs` enforces this via its `DISPATCHER_TYPE` map (it carries an explicit guard comment that `dispatcher.<name>` is the wrong prefix — "G1 SSOT is `disp`, not `dispatcher`").

A wrong prefix produces edges to nodes that don't exist → the **dead-pixel class** (dangling edges), caught by `scripts/lib/system-viz-dead-pixel-detector.mjs`. (NOTE: as of 2026-05-29 the seeder already maps correctly to `disp.*` — an earlier agent claim that this was an open bug was stale; verified against the code.)

**Why:** node-id prefix conventions are an implicit SSOT; any generator that mints dispatcher/engine references must match the existing id form or it silently creates dead pixels.

**How to apply:** before adding any generator that emits edges to dispatcher/engine nodes, confirm the target-id prefix against the existing graph (`system-viz-query.mjs find <name>` shows the real id form). See [[reference_sierra_fast_splice_dual_registration]] · GSD §7.
