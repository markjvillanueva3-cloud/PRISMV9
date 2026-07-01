---
name: reference-oscar-sfc-galaxy-2026-05-28
description: Oscar speed-feed galaxy birth snapshot — 13 artifacts shipped under PER-SLOT-GALAXY-BUILDOUT / U-PSGB-OSCAR. What exists, where, and the 865-commit divergence flag.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.706Z
aliases: reference_oscar_sfc_galaxy_2026_05_28
---


# Oscar SFC galaxy — birth snapshot (2026-05-28, U-PSGB-OSCAR)

Built the speed-feed galaxy on `slot/oscar` worktree per `state/shared/per-slot-galaxy-buildout/oscar.md` (13-artifact protocol = original 11 + master-brain-link + master-index back-pointer).

**Shipped:**
- Soul realigned generic-stub → `speed-feed-specialist` (physics-rigorous, 7 refuses, SFC domain_filter) — `state/shared/slot-souls/oscar.md`.
- 4 galaxy files at `mcp-server/src/engines/speed-feed/`: CLAUDE.md (scope + PSN edges + anti-patterns), MEMORY.md (master-brain link + High-ROI + failure modes), PATHS.md (H:/-wide atlas), TOOLBELT.md (tool patterns). Superseded the 2026-05-27 stub.
- ≥10 domain memories (`*_oscar_sfc_*`, `feedback_oscar_*`) + master MEMORY.md `[galaxy:speed-feed]` back-pointer (CONN-4).
- Wiki bridge `knowledge/wiki/architecture/speed-feed-galaxy.md` + ≥3 cross-refs.
- Custom skill `/sf-audit-oscar` + additive hook `oscar-sfc-constants-guard.mjs`.

**Divergence flag (R12):** slot/oscar was **865 commits behind cad-fusion-live-ms0** at galaxy commit. New galaxy files merge clean; the 2 prior stub files (CLAUDE/MEMORY) on the integration branch are superseded by the full versions on golf merge. SLOT_GALAXY_MAP `oscar:'speed-feed'` already present in main (gate satisfied at canonical level; worktree `.claude/hooks/slot-context-bundle-inject.mjs` absent in stale checkout).

**MCP-down note:** MCP server was disconnected this session — semantic_search/tribal_capture/master_index_query degraded; PULL seeded from known memory IDs; tribal tips captured via fallback. Re-run live recall when MCP returns.

Cross-refs: [[reference_oscar_sfc_domain_map_2026_05_27]] · [[reference_oscar_sfc_9axis_ms0_2026_05_26]] · [[feedback_oscar_sfc_physics_discipline]]
