---
name: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-real-defaults
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-REAL-DEFAULTS (commit f900c322d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.722Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-real-defaults
---


# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-REAL-DEFAULTS

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-REAL-DEFAULTS (slot:charlie iter45 2026-05-26): mirror QuotingMaterialBridgeEngine ISO-group cost brackets into training bootstrap. iter44 shipped runtime-side bridge (mcp-server); iter45 wires the SAME ISO defaults into scripts/quoting-baseline-bootstrap.mjs so training-time records and runtime quote-time material lookups converge on identical cost brackets. New: detectMaterialFromPath (6-ISO regex table with letter-boundary lookarounds — fixed iter46-class bug where word-boundary treats underscore as word-char, breaking AL_6061 / aluminum_6061 detection), estimateStockWeightKg (size-bucket proxy until CAD volume wired), material_iso field on every output record (null when no detection). 7 new tests (36/36 PASS) covering all 6 ISO groups across naming styles (AL7075-T6, aluminum_6061, 304-SS, hardened-HRC55, gray-iron, 4140-steel) + adversarial null/undefined/non-string + fallback to MATERIAL_BY_CLASS when path lacks material keyword + ISO-S spend >>5x ISO-N validation. LIVE regen: 75 records, all carry material_iso field (0 non-null in current JM Die corpus — files organized by customer not material; U-QP-MATERIAL-FROM-GCODE-PARSE next-iter to extract from G-code comments). Phase 1 unit 2 of 15 per QUOTING-DEEP-WIRE-AND-ALGO-2026-05-26.md spec.

**Shipped:** 2026-05-26T19:39:15-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[quoting-synergy-ms0-u-qp-bootstrap-real-defaults]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._