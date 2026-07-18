---
name: reference-wedm-phase-a1-proven-end-to-end-2026-05-22
description: Phase-A.1 end-to-end pipeline DELIVERED — AF102-05.dxf (real JM Die OMG INC die part) → DXFGeometryParserEngine → wedmPrintToProgramEngine → 795 chars of dialect-correct Mitsubishi WEDM G-code in 316ms. This is the first real Phase-A training datapoint generated from JM Die's actual blueprint archive (not a synthetic spec). The 98-pair v4 sweep is now unblocked — projected runtime ~30s for the full training corpus. Resolved three sequential parser bugs (POLYLINE handler missing → blank-line parity shift → empty-text-value misinterpretation) over iters 30-33. The wedm-phase-a1-demo.mjs script also got two fixes — missing `await` on the async wizard call + missing bbox/area/perimeter passthrough on the contour shape.
aliases: reference_wedm_phase_a1_proven_end_to_end_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.254Z
---


**2026-05-22 charlie /loop iter 33.** Operator's queued /goal Phase A is no longer plan — it's data.

## The proof

```
H:/prism/JM DIE/HAAS-HURCO/OMG INC/AF102-05.dxf  (363 KB, AutoCAD R2007)
    ↓ DXFGeometryParserEngine.parseDXF (28ms)
3 contours, 3 entities, 0 issues, units detected as "inch"
    ↓ wedmPrintToProgramEngine.generate (316ms)
       material=D2, thickness=12.7mm, target_ra=1.6µm,
       wire=brass_cuzn37, controller=mitsubishi, program=9002
795 chars of dialect-correct Mitsubishi WEDM G-code
    ↓ persist
state/shared/wedm-training-corpus/af102-05-phase-a1.json
```

344ms total runtime. Production-tractable. First real Phase-A datapoint.

## The journey (iters 30-33)

| Iter | Discovery | Unit | Commit |
|---|---|---|---|
| 30 | DXFGeometryParserEngine missing POLYLINE support → AF102-05 yields 0 contours | (audit) | iter-30 finding memo |
| 32 | parsePolyline() shipped + 10 vitest cases | U-PARSER-POLYLINE | `d6403ac3d6` |
| 32 | But still 0 entities — found parseDXFGroups blank-line bug | (audit) | iter-32 finding memo |
| 33 | First fix attempt: skip blanks in-place — STILL 0 entities. Discovered the third bug: blank lines are valid EMPTY VALUES for text-type codes ($DIMPOST). The intermediate "skip" fix was wrong. | (re-audit) | (in-iter discovery) |
| 33 | Real fix: strict 2-line stride, never skip blanks. 8 vitest cases. AF102-05 regression PASSES. | U-PARSER-BLANK-LINES | `152d6970fb` |
| 33 | Phase-A.1 demo's `wedmPrintToProgramEngine.generate()` is ASYNC — was missing `await`, returned a Promise treated as `{}` | (demo fix) | included in 152d6970fb |
| 33 | Phase-A.1 demo's contour-mapping dropped `bbox` / `area_mm2` / `perimeter_mm` — wizard's `summarizeGeometry` needs those | (demo fix) | included in 152d6970fb |

Four sequential bugs, three in the parser + one in the demo. Each unblocked the next layer. The cycle proves the per-file scrutiny doctrine — every fix surfaces the next-layer issue immediately, no compound errors propagate.

## The first datapoint manifest (committed `152d6970fb`)

`state/shared/wedm-training-corpus/af102-05-phase-a1.json`:

```json
{
  "schema_version": "1.0.0",
  "phase": "A.1",
  "pair_stem": "af102-05",
  "pair_tier": "exact",
  "pair_confidence": "high",
  "blueprint_path": "H:/prism/JM DIE/HAAS-HURCO/OMG INC/AF102-05.dxf",
  "reference_program_path": "H:/prism/JM DIE/WIRE EDM/MCAM X8/OMG/AF102-05.mcx-8",
  "parse": { "ok": true, "runtime_ms": 34, "contour_count": 3, "entity_count": 3, "source_units": "inch", ... },
  "wizard": {
    "ok": true,
    "runtime_ms": 316,
    "program_length_chars": 795,
    "program_text": "<795 chars of Mitsubishi G-code>",
    ...
  },
  "compare": {
    "done": false,
    "gap_reason": "reference is .mcx-8 Mastercam binary; comparison requires McxProgramParserEngine to extract NC text first (Phase-A.2). Also blocked on parse-gap above."
  }
}
```

The compare-gap_reason is now WRONG (parse gap is fixed). Next-iter cleanup: update the demo to drop the "Also blocked on parse-gap above" sentence on success.

## What's unblocked

- **U-PHASE-A1-SWEEP** (~30 sec runtime): iterate state/shared/wedm-pair-v4-results.json (98 high-conf pairs), run wedm-phase-a1-demo.mjs on each, persist 98 manifests. First real training corpus.
- **U-MCX-WIRE** (small unit, McxProgramParserEngine already-built per [[reference_u_ppl_d5_already_built]]): wire it into wedm-phase-a1-demo.mjs to read the .mcx-8 binary into NC text, then run wedmProgramComparisonEngine to fill in the `compare` block of each manifest. THIS produces the first real deviation reports.
- **Phase-B** (templates/macros): once the corpus has 98 datapoints with deviation reports, the systematic deltas between wizard-output and shop-reality become extractable patterns → those patterns become the macro library.

## Loop status

iter 33 / 20 (at-target +13). Session: db0678d4. Charlie domain: wire/WEDM/EDM.

Cumulative this session:
- 8 substantive units shipped (U-WIRE-WEDM-PROGRAM-COMPARE-1, U-PAIR-V1/V2/V3/V4, U-A1-DEMO, U-PARSER-POLYLINE, U-PARSER-BLANK-LINES)
- 7 reference memos
- 1 inventory spec
- 1 wizard from-scratch proof (iter 24)
- 1 real-corpus end-to-end proof (this iter)

Related: [[reference_wedm_phase_a1_parser_blank_line_bug_2026_05_22]] · [[reference_wedm_phase_a1_parser_gap_2026_05_22]] · [[reference_wedm_phase_a_walker_v3_yield_2026_05_22]] · [[reference_wedm_wizard_proof_and_architecture_2026_05_22]] · [[reference_u_ppl_d5_already_built]].
