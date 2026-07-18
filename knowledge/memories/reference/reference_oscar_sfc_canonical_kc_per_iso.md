---
name: reference-oscar-sfc-canonical-kc-per-iso
description: The 6 canonical Kienzle kc1.1 values per ISO group and WHERE they live (physics/constants.ts only). The single most-cited SFC fact; never inline.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.696Z
aliases: reference_oscar_sfc_canonical_kc_per_iso
---


# Canonical kc1.1 per ISO group (the most-cited SFC constant)

Kienzle specific cutting force kc1.1 (MPa) per ISO material group — the anchor of every SFC force/power/MRR calc (Fc = kc1.1·b·h^(1−mc)):

| ISO | group | kc1.1 (MPa) |
|-----|-------|-------------|
| P | steel | 1800 |
| M | stainless | 2100 |
| K | cast iron | 1100 |
| N | aluminium/non-ferrous | 700 |
| S | superalloy/Ti | 2800 |
| H | hardened | 3200 |

**These live ONLY in `mcp-server/src/physics/constants.ts`** alongside Taylor C/n + mc. **NEVER inline** them in an engine, doc, or test — import. `comprehensive-build-enforce` blocks inlined-constant edits; it's a P0 violation class.

Note: the **N (aluminium) group** is where PRISM's Vc diverges from vendor baselines (PRISM higher) — a real algorithm delta, not noise; see [[reference_oscar_sfc_divergence_investigation_2026_05_27]]. Standing doctrine: [[feedback_oscar_sfc_physics_discipline]].
