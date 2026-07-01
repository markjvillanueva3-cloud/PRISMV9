---
session: claude-a6304a93
topic: tooling-db-b
slot: juliett
written_at: 2026-06-01T02:51:59.940Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-a6304a93
status: active
---

# HANDOFF: claude-a6304a93
Updated: 2026-06-01T02:51:59.941Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-a6304a93

## STATE
iter 12/20. Shipped: masterplan(920b4dc7), toolbelt --status fix(eeeef9e6), classifier core(25 tests, 2-round scrutiny PASS). camelot 1.0.9 + Ollama up.

## RESUME
NEXT UNIT: per-vendor COLUMN NORMALIZER consuming classifyDocument().cuttingDataTables (scripts/lib/catalog-table-classifier.mjs SHIPPED). Map cols -> MATH_SCIENCE_SCHEMA (vc/fz/ap/ae per [tool,material_iso]); VALIDATE vs reference value BEFORE persist; provenance-tag (vendor+pdf+page) -> prism-reference-db. Pipeline: camelot-extract.py -> classify-tables(SHIPPED) -> normalizer(NEXT) -> persist. camelot-stream surfaces SF grids unevenly (garr-sf=0, cgs-sf=1) -> may need --flavor lattice tuning. db-toolbelt --run classify-tables.

## CONTEXT

