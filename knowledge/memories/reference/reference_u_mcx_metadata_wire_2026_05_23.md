---
name: reference-u-mcx-metadata-wire-2026-05-23
description: iter-35 charlie /loop — U-MCX-METADATA-WIRE shipped. McxProgramParserEngine wired into wedm-phase-a1-sweep.mjs; 97/98 .mcx-* refs now produce reference_metadata (format/version/machine_hints/tool_labels/material_hints/embedded_strings). Schema 1.0.0→1.1.0. compare.gap_reason rewritten R12-truthful — McxProgramParserEngine cannot recover full NC text from proprietary .mcx-* binary; real deviation report needs sibling posted-NC harvest. Critical discovery: only 22 candidate posted-NC files (19 .min + 3 .nc) across 3,970 .mcx-* binaries in JM Die WIRE EDM tree — Phase-A.2 unblocker is U-WEDM-COMPARABLE-PAIRS-INDEX (match .mcx-* stems to sibling .min/.nc; .MIN is Mitsubishi WEDM NC dialect).
aliases: reference_u_mcx_metadata_wire_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.003Z
---


**2026-05-23 charlie /loop iter 35.** First /loop iter after weekly-limit reset + account-switch. Operator's queued /goal "complete all remaining charlie (wire) tasks in high-ROI order, complete and wired" still active.

## What shipped (commit `c1f7ba2aaa`)

U-MCX-METADATA-WIRE — `scripts/wedm-phase-a1-sweep.mjs` +88/-4 (98-pair corpus regenerated):

```
sweep result (72,029ms)
  98 pairs · 97 pdf_only_gap · 1 dxf_parse_ok · 1 wizard_ok
  97 mcx_parse_ok · 0 mcx_parse_failed · 0 mcx_no_program
```

Sample metadata signal:
- AF102-05    fmt=.mcx-8 strings=41  machine=-     material=-
- 10-001-490  fmt=.mcx-8 strings=152 machine=wire  material=2024
- 1134_hob    fmt=.mcx-8 strings=221 machine=wire  material=2024

## The framing correction (R7 + R12)

Iter-33 reference memo (`reference_wedm_phase_a1_proven_end_to_end_2026_05_22`) listed U-MCX-WIRE next: *"wire McxProgramParserEngine into the sweep to read the .mcx-8 binary into NC text"*. **That premise was wrong** — the engine's own docstring says it deliberately stops at metadata because the .mcx-* container is proprietary. Full NC extraction needs Mastercam SDK / NETHOOK.

R7 fix: pick the more-recent / more-tested authority (the engine's actual docstring + behavior) over the older memo's optimistic claim. R12 fix: replace misleading `compare.gap_reason` ("requires McxProgramParserEngine to extract NC text first — Phase-A.2") with the truthful obstacle:

> "McxProgramParserEngine extracted reference_metadata but cannot recover full NC text. Real deviation report needs a sibling posted-NC harvest (Phase-A.2 / U-WEDM-POSTED-NC-INDEX) or Mastercam SDK access."

## Critical discovery — posted-NC pool is TINY

Extension census of `JM DIE/WIRE EDM/`:
- **2191 .mcx-8** (Mastercam X8 binaries)
- **1779 .mcx** (legacy Mastercam binaries)
- **28 .esp** (Esprit, separate CAM)
- **19 .min** (Mitsubishi WEDM NC dialect — CONFIRMED real NC text)
- **3 .nc**
- **2 .txt** (mostly non-NC)

→ **22 candidate posted-NC files vs 3,970 .mcx-* refs** (0.55%)

The shop apparently runs Mastercam direct-to-controller (DNC), not posted-NC. So:
- Original Phase-A.2 framing ("sibling posted-NC harvest will unlock comparison for all 98 pairs") is wrong — at most ~22 pairs of the corpus have comparable text
- `.MIN` is Mitsubishi WEDM dialect (`$PC12-12.MIN%` / `NBAR` / `DEF WORK` / M-codes) — those 19 files are the real Phase-A.2 training-data nucleus
- Phase-B template/macro mining still has full 97-pair corpus via `reference_metadata` (operator-named tools + post identity + material from embedded printable runs)

## Side-fix — script portability

Iter-34 sweep silently invoked via `mcp-server/node_modules/.bin/tsx`; plain `node` (v22) throws `ERR_UNKNOWN_FILE_EXTENSION` on the `.ts` engine imports. The dist/ fallback was tried but found stale (iter-32/33 DXF parser fixes hadn't been built yet — src 2026-05-22 21:04, dist 2026-05-20 17:22, no rebuild since). Documented the tsx requirement inline so the next operator doesn't re-trip on it.

## What's unblocked

- **U-WEDM-COMPARABLE-PAIRS-INDEX** (next high-ROI charlie unit, scoped + small): walk `JM DIE/WIRE EDM/**`, find all `*.{min,nc,eia}` files, match by stem to `*.mcx-*` siblings in the same dir, persist `state/shared/wedm-comparable-pairs.json`. Expected yield: ≤22 pairs. Each becomes a real comparable-NC training datapoint.
- **U-WEDM-MIN-PARSER**: WireEDMProgramParserEngine likely already handles standard G-code dialects — verify it parses Mitsubishi `.MIN` (`$PC...%` headers, NBAR, DEF WORK). If gap, write a small extension (Mitsubishi dialect).
- **U-WEDM-POSTED-NC-DEVIATION**: once the 19-22 pairs are indexed AND the parser works on .MIN, run WEDMProgramComparisonEngine on each → first FLEET of real per-parameter deviation reports → calibration signal for the wizard.
- **Phase-B template mining** (orthogonal): the 97-pair `reference_metadata.embedded_strings` corpus is ready NOW for operator-tool / post-name / material-callout pattern extraction — doesn't wait on the .MIN path.

## Loop status

iter 35 / 20 (at-target +15). Session: db0678d4. Charlie domain: wire/WEDM/EDM.

Cumulative since iter 30:
- 5 substantive units (U-PARSER-POLYLINE iter32, U-PARSER-BLANK-LINES iter33, U-PHASE-A1-SWEEP iter34, U-MCX-METADATA-WIRE + corpus regen iter35)
- 3 reference memos
- 1 corpus delivery (98 manifests with reference_metadata)
- 1 framing correction (iter-33 memo's NC-extraction premise → R12 truthful gap_reason)

Related: [[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]] · [[reference_u_ppl_d5_already_built]] · [[reference_wedm_phase_a1_parser_blank_line_bug_2026_05_22]] · [[feedback_parallel_scrutiny_per_file]].
