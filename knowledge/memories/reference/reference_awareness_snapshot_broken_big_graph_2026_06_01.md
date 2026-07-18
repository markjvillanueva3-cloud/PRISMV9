---
name: reference_awareness_snapshot_broken_big_graph_2026_06_01
description: "PRISM-awareness was frozen 8 days (663MB graph > V8 string limit) — RESTORED 2026-06-01 via fail-soft architecture-graph.json fallback (U-GCF-AWARENESS-FAILSOFT); sierra streaming read is the durable upgrade"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.475Z
aliases: reference_awareness_snapshot_broken_big_graph_2026_06_01
---


**RESOLVED (interim) 2026-06-01 — U-GCF-AWARENESS-FAILSOFT.** `awareness-snapshot.mjs` now falls back to `architecture-graph.json` (54MB / 50490 nodes) when the 663MB merged graph exceeds V8's readFileSync string limit, so awareness stays FRESH (degraded to the architecture subset, loudly flagged via a warning + `graphDegraded:true`). Live-verified: snapshot regenerates fresh, the `## Galaxy Federation` section renders, ghosts undercount flagged. **The durable fix is still sierra's** — a streaming/bounded read of the full 663MB graph restores the complete utilization counts (the fallback undercounts orphans/ghosts: it sees only the 50K architecture nodes, not the 372K merged). Original finding below.

**PRISM-awareness surface WAS frozen fleet-wide (found 2026-06-01, slot:alpha, GALAXY-CONTEXT-FEDERATION synergy audit).**

- **Symptom:** `state/shared/AWARENESS-SNAPSHOT.md` (the SessionStart awareness warmup banner: "Built / Ready-to-use / orphans / ghosts / drift") is **8 days stale (mtime 2026-05-24)**. Any chat trusting that banner is reading a week-old picture.
- **Root cause:** `scripts/awareness-snapshot.mjs` `safeJson()` does `JSON.parse(readFileSync(p,"utf8"))`, and `buildSnapshot()` reads the full `state/shared/system-viz/system-graph.json` that way. The merged graph is now **663 MB > V8's 536 MB (`0x1fffffe8`) max string length** → `readFileSync` throws `RangeError: Cannot create a string longer than 0x1fffffe8 characters` → `safeJson` catches → `graph=null` → `buildSnapshot` bails at its graph guard (`return {error: "system-graph.json missing or malformed"}`), so no fresh snapshot is written. Silent (caught error) → the stale file just persists. Same V8 string-limit class that blocks `JSON.parse`-ing the graph from any script.
- **Scope:** affects EVERYTHING after the graph guard in awareness-snapshot (utilization, orphans, ghosts, drift, and the new `## Galaxy Federation` section alpha wired in U-GCF-WIKI-AWARENESS-WIRE — all dead until the read is fixed).
- **Fix (sierra / system-viz graph domain):** make the graph read streaming/bounded — `stream-json`, a targeted node/edge extractor, or read the smaller `architecture-graph.json` (~20K-node generate-system-viz product) for the utilization counts. Then awareness regenerates + the federation section renders.
- **Verify:** `node -e "require('fs').readFileSync('state/shared/system-viz/system-graph.json','utf8')"` throws RangeError today; after the fix `node scripts/awareness-snapshot.mjs` writes a fresh full snapshot (mtime today, `## Galaxy Federation` present).
- Escalated: chat-bus lane galaxy-context-federation + `state/shared/dashboards/patches/AWARENESS-INJECT-PATCH-U-GCF-AWARENESS.md`. Related: [[reference_galaxy_context_federation_viz_roost_2026_06_01]] (same 663MB-graph-string-limit class hit during the system-viz roost verification). Sibling awareness surfaces (`sfc-awareness-snapshot.mjs`, academy/ai-training awareness) read small domain JSONs, NOT the big graph — they're unaffected.
