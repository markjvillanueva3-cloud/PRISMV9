---
name: reference_xray_no_native_reader_gaps
description: blueprint-vision has NO native reader for SAT, OBJ, FBX, X_T (Parasolid) — standing gap
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.071Z
aliases: reference_xray_no_native_reader_gaps
---


slot:xray standing gap (per [[reference_blueprint_ocr_cad_reading_atlas_2026_05_27]], re-confirmed 2026-05-29): PRISM has native parsers for DXF, SVG, STEP, STL, F3D/F3Z, FCStd, plus live bridges for SLDPRT/IPT/3DM/HMC — but **NO native reader** for:

- **SAT** (ACIS) · **OBJ** · **FBX** · **X_T** (Parasolid)

These require a forged engine or a vendor SDK bridge. Until then, route these formats through an upstream converter (e.g. STEP/IGES export) or flag the print as `unsupported-format` rather than silently returning empty geometry (the silent-empty-parse failure mode). Also: mixed-unit handling is weak in some legacy parsers — cross-check units explicitly.

If asked to build one of these readers, it is a real galaxy gap, not a duplicate — but run `duplicationGuardEngine.mustCheckBeforeCreating()` first. See galaxy MEMORY.md `## Standing gaps`.
