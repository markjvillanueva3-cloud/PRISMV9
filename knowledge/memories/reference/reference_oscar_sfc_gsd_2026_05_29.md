---
name: reference_oscar_sfc_gsd_2026_05_29
description: SFC domain GSD (engines/speed-feed/GSD.md) — the Speed-Feed session/dev protocol: 6 non-negotiable physics invariants + start/verify/ship lifecycle + known gotchas, distilled from the oscar slot history. Read at SFC session start.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.256Z
aliases: reference_oscar_sfc_gsd_2026_05_29
---


# SFC domain GSD — Speed-Feed dev/session protocol (2026-05-29, slot:oscar)

Distilled the oscar slot's full history (OSCAR-SFC-9AXIS-MS0 U-OSC9-01..15 + PER-SLOT-GALAXY-BUILDOUT U-PSGB-OSCAR-*) into a domain-specific GSD at **`mcp-server/src/engines/speed-feed/GSD.md`** (auto-loads with the galaxy CLAUDE.md). Part of the fleet-wide "mine your sessions → generate domain context artifacts" directive (sibling: [[reference_delta_cad_asset_generation_2026_05_29]]).

## The 6 SFC physics invariants (each a P0)
1. Constants from `CANONICAL_KIENZLE`/`getKienzle` in physics/constants.ts — NEVER inline (kc1.1 P1800 M2100 K1100 N700 S2800 H3200). [[feedback_oscar_sfc_physics_discipline]]
2. Round speed/feed at DISPLAY/emit, never mid-pipeline (truncates sub-1.0 fz → stall). [[feedback_oscar_sf_round_at_display_not_calc]]
3. Light radial (ae/D<0.5) → feed UP via Sandvik chip-thinning, not down. [[feedback_oscar_chip_thinning_mandatory]]
4. Every G96 needs a paired G50/G92 RPM cap (P0 safety). [[feedback_oscar_css_g50_cap_mandatory]]
5. Spindle power = hard CLAMP via prism_safety/9-axis envelope, never re-roll.
6. Aggressive mode ⇒ mandatory chatter-stability (Altintas SLD) check.

## Lifecycle
- START: load CLAUDE.md + SFC-AWARENESS.md; **`/sfc-gates` before building** (mature domain, dedup); domain map before Grep.
- VERIFY: 401 gauntlet · tri-vendor smoke (~12 N-aluminum divergent, prism_only=0) · constants-inline scan (0 offenders) · `/sf-audit-oscar`.
- SHIP: provenance · **`command git commit`** (rtk mis-routes) · per-file + 3-of-3 scrutiny · doc-reflect 4 surfaces · regen SFC-AWARENESS.
- GOTCHAS: .claude gitignored in worktree (add -f) · galaxy cascade injects stale Stub Sentinel · lathe-master-post gate DEAD · MCP/Ollama may be down (pure-node fallback).

Synergized to PSN: galaxy GSD.md (auto-load) + this memory (recall) + wiki [[sfc-dev-protocol]] + galaxy CLAUDE.md pointer. See [[reference_oscar_sfc_quality_gate_ecosystem_2026_05_29]] · [[reference_oscar_sfc_domain_map_2026_05_27]].
