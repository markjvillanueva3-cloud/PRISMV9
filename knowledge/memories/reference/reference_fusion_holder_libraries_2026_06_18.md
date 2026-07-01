---
name: reference_fusion_holder_libraries_2026_06_18
description: "Fusion tool-HOLDER libraries finished (slot:romeo 2026-06-18): the live .tools libs had holder NAMES but no collision GEOMETRY because jm-csv-to-fusion-tools.py dropped the CSV holder_segments column. Added a parser -> holder.segments[]; 679/1071 per-machine tools now carry real holder collision bodies (mills 100%). Operator: 'finish building the tool and tool holder libraries for fusion.'"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.581Z
aliases: reference_fusion_holder_libraries_2026_06_18
---


# Fusion tool-HOLDER libraries finished (slot:romeo, 2026-06-18)

Operator: *"finish building the tool and tool holder libraries for fusion."* The CUTTING-tool libs were
already done (25 live PRISM_JM_* libs, [[reference_fusion_live_tool_libraries_2026_06_15]]). The HOLDER
libraries were the gap: every live `.tools` tool had a holder **name** (`{description:"ER20 Collet",
product-id, vendor}`) but **no collision GEOMETRY** -> Fusion could not collision-check the holder against
part/fixture in simulation.

## Root cause + fix
`scripts/jm-csv-to-fusion-tools.py` (the converter that file-drops the live `.tools`) emitted only holder
description/product-id/vendor -- it **dropped the CSV's `holder_segments` column** (which IS populated:
399/399 rows in LTH-01 carry real data, e.g. BIG DAISHOWA ER-32-4NL =
`"H1.188980 U1.988190 L1.988190; H1.950790 U1.750000 L1.750000; H0.710630 U2.403310 L2.403310"`).
That CSV format is Fusion's own export: `H<height> U<upper-dia> L<lower-dia>;` per segment, **INCHES**.
Fix: `parse_holder_segments()` -> Fusion `.tools` schema `holder.segments=[{upper-diameter,lower-diameter,
height}]` (schema verbatim from a real Fusion holder in SAMPLE.tools), wired via `_build_holder()`.
**UNITS-FIRST: inch values copied VERBATIM, NO 25.4x scaling** (tool unit is inches; segments inherit it).
Fail-safe: `segments` key OMITTED when no real geometry parses (never an empty/fabricated body).

## Verified (R15 live data)
- Parser+integration test `scripts/test_jm_holder_segments.py` 20/20 (happy + empty/None + malformed + mixed +
  adversarial 0/negative/NaN reject + lowercase + integer-only + trailing-`;` + `_build_holder` omit-vs-emit
  anti-fabrication contract). Run: `python scripts/test_jm_holder_segments.py`. 2-arm per-file scrutiny PASS.
- Regenerated all 12 per-machine libs to the LIVE Fusion Local dir
  (`%APPDATA%/Autodesk/Autodesk Fusion 360/CAM/Libraries/Local/PRISM_JM_<M>.tools`).
- **Holder-segment coverage 679/1071 tools (was 0):** VMC-01..05 (mills) **54/54 = 100%**; LTH-01..06
  51/107; LTH-07 103/159. Live-confirmed: PRISM_JM_VMC-01.tools 54/54 with real segments.
- Partial lathe coverage is CORRECT, not a miss: turning inserts in turret blocks have no ER-collet
  `holder_segments` in the source CSV -> graceful omission (R12, no fabrication).

## Follow-ups (NOT done -- honest)
- **PRISM_JM_Milling** (the 15,994-tool aggregate lib) is NOT a `by-machine` dir, so `ALL` does not
  regenerate it -- it keeps holder-name-only until its own source CSV is run through the fixed converter.
  The per-machine VMC libs DO cover every JM mill tool with segments.
- **Gauge length**: CSV has `tool_holderGaugeLength` (e.g. 3.8504") but the exact Fusion `.tools` JSON key
  was NOT confirmed from a real example (SAMPLE had no gauge field) -> NOT emitted (R12 no-invent). Confirm
  the key from a gauge-bearing Fusion lib, then add to `_build_holder()`.
- Re-drop is file-only; Fusion rescans on Tool Library dialog open. Bridge :18361 was MCP-disconnected this
  session so no live API read-back; the file write + schema match is the verification.

All artifacts UNCOMMITTED on shared tree (lane guard; fleet sweep folds): `scripts/jm-csv-to-fusion-tools.py`
(+parser/_build_holder), `scripts/test_jm_holder_segments.py`. Sibling: [[reference_fusion_live_tool_libraries_2026_06_15]].
