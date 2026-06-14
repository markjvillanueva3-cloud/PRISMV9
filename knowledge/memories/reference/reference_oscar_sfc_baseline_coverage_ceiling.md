---
name: reference-oscar-sfc-baseline-coverage-ceiling
description: The 84.6% structural coverage ceiling on vendor baseline comparison — manufacturer catalogs lack SFM/IPT columns. NOT an algorithm bug. CatalogJoiner recovers the matched cells.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.249Z
aliases: reference_oscar_sfc_baseline_coverage_ceiling
---


# SFC baseline-comparison coverage ceiling (structural, not a bug)

When diffing PRISM vs G-Wizard's toolcrib, ~84.6% of cells land in `weak_disagreement` — **because the manufacturer catalog rows lack SFM/IPT columns**: G-Wizard finds the tool (100% diameter match after the 41,209-tool export) but the catalog can't supply recommended cuts to compare against. This is a **structural data limit, not a PRISM algorithm error** — do not chase it as a regression.

**What's real signal:** the 12 residual N-aluminum cells where PRISM's Vc genuinely diverges from a baseline that DID have cuts (PRISM higher) — see [[reference_oscar_sfc_divergence_investigation_2026_05_27]].

**Recovery:** `SpeedFeedCatalogJoinerEngine` (U-OSC9-15-CATALOG-JOIN, commit `7706c534a3`) + TriVendor fallback wire unlock per-cell Vc deltas for cells where the G-Wizard toolcrib matched a tool but the row had no sfm/ipt columns.

Tri-vendor smoke after parity export: divergent cells 59→12 (−80%), prism_only 48→0, neither 56→0, gwizard_matched 9/27→27/27. Cross-ref [[reference_oscar_sfc_domain_map_2026_05_27]].
