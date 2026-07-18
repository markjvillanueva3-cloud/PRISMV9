---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/user_shop_profile.md
source_filename: user_shop_profile.md
content_hash: 7baae8e920f7e92959cab46b810cf7d2d8c90f277940b43f5fee1b7619844ad6
mirror_ts: 2026-05-05T13:00:09.564Z
mirror_engine: ObsidianMemorySyncEngine
---

## Material Portfolio
Heavy tool steel shop: H13, 4140, 4140-PH, A2, D2, S7, O2, 52100, 1018/1020, M2, M4, M42 and other steels.

## Critical Workflow: Brazed Carbide Inserts
Almost all parts can have cutouts for carbide inserts that are brazed on, then profiles are wire-cut through the combined steel body + brazed carbide insert. This means:
- Wire crosses steel → braze zone → carbide → braze zone → steel transitions
- Each material has different conductivity, spark characteristics, and cutting behavior
- Wire break risk is highest at material boundaries
- Parameters must adapt per-zone (different energy, feed, flushing, tension)

## Multi-Axis
Some parts require UV axis movements (taper cuts through bi-material).

## Priority
**Why:** Backend must be perfected before frontend — the physics and parameter optimization must handle bi-material zones, material transitions, and per-steel-grade optimization accurately before any UI work.
**How to apply:** When building EDM features, always consider bi-material scenarios. Don't assume single-material profiles. Steel+carbide is the primary use case, not edge case.
