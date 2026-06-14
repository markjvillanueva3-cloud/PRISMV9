---
name: reference-wedm-phase-a1-parser-gap-2026-05-22
description: Phase-A.1 end-to-end demo (parse→wizard) on the only verified DXF training pair (AF102-05) found a P0 gap — DXFGeometryParserEngine produces 0 contours from a real 363KB AutoCAD R2007 DXF because the file uses legacy AcDb2dPolyline (POLYLINE+VERTEX+SEQEND), and the parser only supports LINE/ARC/CIRCLE/LWPOLYLINE/ELLIPSE/SPLINE. Phase-A.1 blocked until parser gets POLYLINE support. Also discovered the DXF-pair surface is much narrower than the 148-pair count suggested: only 3 of 148 pairs have any .dxf and 2 of those 3 are tier-3 numeric-core false-positives (the generic word "SPRING" matched `edm_spring` to `31366 SPRING PLATE`).
aliases: reference_wedm_phase_a1_parser_gap_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.037Z
---


**2026-05-22 charlie /loop iter 30.** First end-to-end Phase-A.1 demo attempt against `state/shared/wedm-pair-v3-results.json`. Two findings.

## Finding 1 — DXF-pair surface is narrower than expected

v3 returned 148 high-confidence pairs. Filtering to pairs with ≥1 `.dxf` blueprint:

```
total pairs: 148 | with .dxf: 3
  - af102-05      | tier=exact         | 5 dxfs  ← REAL
  - edm_spring    | tier=numeric_core  | 3 dxfs  ← FALSE POSITIVE (core="spring")
  - edm_spring_holder | tier=numeric_core | 3 dxfs ← FALSE POSITIVE (core="spring")
```

The 2 numeric-core matches paired generic shop-program names (`edm_spring`, `edm_spring_holder`) to a real customer part (`31366 SPRING PLATE`) via the shared word "SPRING" + customer-token overlap on HAAS-HURCO/KEYSTONE. This is the **first real false-positive class** in the v3 walker: when the numeric-core is actually an English word common to many parts, the customer-overlap gate is not enough.

**Walker v4 follow-up** — add a stopword filter to `extractCore`: reject cores in `{spring, plate, holder, washer, ring, block, plug, cap, bushing, fitting, bracket, pin, shaft}` (≈40 generic mechanical terms). Or require the core to contain at least one digit. The orphan sample is dominated by digit-heavy stems like `9100928, b-18823, 57-pp-246e-09` — the digit requirement would lose almost no real pairs and kill the SPRING/PLATE/etc. false-positives.

## Finding 2 — DXFGeometryParserEngine P0 gap: no POLYLINE support

AF102-05.dxf is a real 363KB AutoCAD R2007 ASCII DXF (HEADER + TABLES + BLOCKS + ENTITIES + OBJECTS sections). The ENTITIES section (lines 4542-4796) contains 1 POLYLINE + 2 CIRCLE.

```
parseDXF → entities:0, contours:0, issues:0
```

Either the parser's section-boundary detector mis-fires (zero entities scanned) OR the POLYLINE entity's `0\nVERTEX\n...` subrecords confuse the entity loop. The supported set is LINE / ARC / CIRCLE / LWPOLYLINE / ELLIPSE / SPLINE; the legacy POLYLINE/VERTEX/SEQEND triplet (`AcDb2dPolyline`) is not in the switch.

This is a **P0 blocker for Phase-A.1** because the only verified DXF pair (AF102-05) hits this gap. Without the parser fix, the wizard never gets contours, the comparison can't run, and the training-corpus pipeline is dry.

**Fix (clean unit for a future iter):**
1. Add `parseEntityToSegments` case `"POLYLINE"` → walks forward through `(0, "VERTEX")` records collecting `(10, x) (20, y)` pairs until `(0, "SEQEND")`, emits LineSegments between consecutive vertices.
2. Handle the `70` group on the POLYLINE header (bit 1 = closed polyline → connect last→first).
3. Handle the `42` group on each VERTEX (bulge factor → arc segment, not just a line). Bulge=0 is the common case.
4. Add VERTEX/SEQEND to the entity-skip list in `extractBlocks` so the BLOCKS scan doesn't choke on them either.

Estimated 2-3 hours including 8-10 vitest cases (closed-polyline / open-polyline / bulge-arc / nested-block-with-polyline). Adds an entity class that probably exists in 30-50% of real-shop DXFs from CAM-exported parts.

## What this iter shipped

- `scripts/wedm-phase-a1-demo.mjs` — runs the parse→wizard pipeline on the AF102-05 pair, records a manifest to `state/shared/wedm-training-corpus/<stem>-phase-a1.json` whether the pipeline succeeds OR hits a gap. Gap-tolerant by design: any of the 148 pairs can feed this script and produce a structured diagnostic entry. Becomes the corpus-building script once the parser P0 is fixed.
- `state/shared/wedm-training-corpus/af102-05-phase-a1.json` — first entry, gap-flagged.

## Updated Phase-A status

| Sub-phase | Status |
|---|---|
| A.0 — walker | DONE (v3 = canonical, 148 high-confidence pairs) |
| A.1 — parse→wizard demo on first DXF pair | **GAP-BLOCKED on parser POLYLINE support** |
| A.1.1 — walker v4 with stopword/digit filter on tier-3 | clean follow-on |
| A.1.2 — DXFGeometryParserEngine + POLYLINE entity | clean follow-on (unblocks A.1) |
| A.2 — McxProgramParserEngine on .mcx-8 reference (for compare) | not started |
| A.3 — BlueprintVisionOCR for the 145 PDF-only pairs | not started |
| A.4 — full 148-pair sweep | gated on A.1.2 + A.2 |
| B — templates/macros | not started |
| C — brand-new programs from new prints | DEMOED iter 24 with stub spec; not from-corpus yet |

## Sample DXF entity check (so this is reproducible)

```bash
grep -aE "^(LINE|ARC|CIRCLE|POLYLINE|LWPOLYLINE|SPLINE|ELLIPSE|INSERT)$" "<dxf>" | sort | uniq -c
# AF102-05.dxf → 2 CIRCLE, 1 POLYLINE
```

If a DXF returns ONLY supported entity types (LINE/ARC/CIRCLE/LWPOLYLINE/ELLIPSE/SPLINE), the parser works. If POLYLINE appears, gap.

Related: [[reference_wedm_phase_a_walker_v3_yield_2026_05_22]] · [[reference_wedm_wizard_proof_and_architecture_2026_05_22]].
