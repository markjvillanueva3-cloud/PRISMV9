---
name: reference_galaxy_synergy_state
description: Fleet galaxy synergy state — scripts/galaxy-synergy-state.mjs catalogs all 34 per-domain galaxies + the synergy spine
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.586Z
aliases: reference_galaxy_synergy_state
---


slot:alpha (Obsidian-brain owner) built `scripts/galaxy-synergy-state.mjs` (2026-05-29) — the fleet-wide consolidated index of how PRISM is built + synergized via per-domain galaxies. Emits `state/shared/GALAXY-SYNERGY-STATE.md` (+ `--json`/`--stdout`); pure core + fail-soft readers; 9 node:test.

**Current state (first gen):** **34 galaxies** on disk (`mcp-server/src/engines/<g>/CLAUDE.md`); **6** fully built C+M+P+T; **34/34** with a master-brain back-pointer (CONN-4 complete); **2** with a custom awareness surface (token-optimization, system-viz). Top gap: ~28 are `CM--` (no PATHS/TOOLBELT), 32 lack an awareness surface.

**The synergy spine** (how galaxies connect into one system): (1) Domain-Galaxy Doctrine (per-slot ownership) · (2) MASTER-BRAIN-TEMPLATE 4-axis (PULL/PUSH/back-pointer/RECALL, alpha-owned) · (3) `slot-context-bundle-inject` (slot→galaxy auto-load per prompt) · (4) PSN 11 legs · (5) custom `*-AWARENESS.md` surfaces (clone `token-awareness-snapshot.mjs` per domain — the highest-leverage next step).

Regenerate after galaxy changes. Wiki: [[galaxy-synergy-state]]. Related: [[reference_alpha_token_awareness_surface]], `MASTER-BRAIN-TEMPLATE.md`, [[feedback_psn_definition]].
