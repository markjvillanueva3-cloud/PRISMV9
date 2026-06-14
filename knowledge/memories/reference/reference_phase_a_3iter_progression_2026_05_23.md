---
name: reference-phase-a-3iter-progression-2026-05-23
description: iter-35/36/37 charlie /loop — Phase-A WEDM training-corpus arc closed cleanly across 3 commits, each chained to the next via a finding that reframed the next unit. iter35 c1f7ba2aaa U-MCX-METADATA-WIRE (97/98 .mcx-* refs metadata, schema 1.1.0, R12 truthful gap_reason). iter36 d190ea6fbd U-WEDM-COMPARABLE-PAIRS-INDEX (definitive negative finding — 0 of 22 NC files pair with ANY .mcx-* in the WIRE EDM tree; iter-35 sibling-NC harvest hypothesis fully refuted). iter37 feb1d9ac9c U-WEDM-STANDALONE-NC-CORPUS (22/22 standalone NC parsed; real gap: 17 of 19 expected-Mitsubishi files misclassified as "unknown" dialect — WireEDMProgramParserEngine.detectDialect misses .MIN signatures). Next unit: U-WEDM-MIN-DIALECT-DETECT — extend detectDialect to recognize $PC...% / NBAR / DEF WORK / M80-M82. Acceptance: re-run wedm-standalone-nc-parse.mjs; expected_match should jump 0/22 → ≥19/22.
aliases: reference_phase_a_3iter_progression_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.268Z
---


**2026-05-23 charlie /loop iter 35-37.** Post-/compact + post-account-switch resume session. 3 substantive commits chained by findings.

## The chain

| Iter | Commit | Unit | What it added | What it discovered |
|---|---|---|---|---|
| 35 | `c1f7ba2aaa` | [[reference_u_mcx_metadata_wire_2026_05_23|U-MCX-METADATA-WIRE]] | McxProgramParserEngine wired into wedm-phase-a1-sweep.mjs; 97 of 98 .mcx-* refs now produce reference_metadata; schema 1.1.0; R12 truthful gap_reason replaces iter-33's optimistic "Phase-A.2 will extract NC text" misleader | iter-33 memo's "wire McxProgramParserEngine to extract NC text" premise was wrong — engine only does metadata; full NC needs Mastercam SDK or sibling posted-NC |
| 36 | `d190ea6fbd` | U-WEDM-COMPARABLE-PAIRS-INDEX | Cross-tree stem-match indexer + canonical result JSON capturing the negative finding | 0 of 22 NC files (19 .MIN Mitsubishi + 3 .NC generic) match ANY .mcx-* stem anywhere in the WIRE EDM tree — they're controller-side authored, not Mastercam-posted. Phase-A.2 sibling-NC harvest fully refuted as an unblocker |
| 37 | `feb1d9ac9c` | U-WEDM-STANDALONE-NC-CORPUS | 22-program parse runner + corpus output (153 lines stats + 553 lines results) | WireEDMProgramParserEngine parses all 22 structurally (passes, taper, auto-thread, contour moves), but detectDialect misclassifies 17 of 19 Mitsubishi .MIN as "unknown" — real gap exposed cleanly with 19 training samples |

Each finding reframed the next unit. iter-33 memo's framing got carried through iter-34 sweep. iter-35 surfaced the size-of-posted-NC question. iter-36 answered it with a negative finding that killed the original Phase-A.2 hypothesis. iter-37 pivoted to "OK the 22 are standalone — what does the parser do with them?" and exposed the dialect-detection gap.

## What's now true about Phase-A

- The 98-pair corpus is fully annotated with both DXF parse results (1 ok) AND Mastercam metadata (97 ok). Phase-B template/macro mining can ride this NOW — orthogonal to NC comparison.
- There is no comparable (mcx, posted-NC) corpus in JM Die's archive. ANY future deviation-report unit needs Mastercam SDK/NETHOOK at runtime, NOT sibling-NC harvest.
- The 22 standalone NC files ARE a valid independent training corpus for dialect detection + parser robustness. They're structurally parseable (22/22 ok) but dialect-detection has a 17/19 miss rate on Mitsubishi .MIN.

## What's next (in handoff)

**U-WEDM-MIN-DIALECT-DETECT** — extend `WireEDMProgramParserEngine.detectDialect()` to recognize Mitsubishi .MIN signatures:
- `$PC...%` opening header (every .MIN file has it)
- `NBAR` keyword
- `DEF WORK` keyword
- `M80` / `M82` (wire on/off Mitsubishi convention — already in parser; weight differently)

Acceptance: re-run `mcp-server/node_modules/.bin/tsx scripts/wedm-standalone-nc-parse.mjs` and watch `expected_match` jump from `0/22` to `≥19/22`. (The 3 generic .NC files may legitimately stay unknown depending on their content.)

This is an engine edit (not a script) — needs companion test file + 3-of-3 scrutiny gate + commit cycle bigger than this session's 3-script-edit run. Better fit for a fresh /loop iter than tacked onto the end of this one.

## Side-finding worth memo: script invocation hazard

`scripts/wedm-phase-a1-sweep.mjs` and `scripts/wedm-standalone-nc-parse.mjs` both import `.ts` engines directly. Plain `node` (v22) throws `ERR_UNKNOWN_FILE_EXTENSION`; must invoke under tsx:
```
mcp-server/node_modules/.bin/tsx scripts/wedm-phase-a1-sweep.mjs
mcp-server/node_modules/.bin/tsx scripts/wedm-standalone-nc-parse.mjs
```
The `dist/` fallback was tried but dist is stale (iter-32/33 DXF parser fixes hadn't been built when iter-35 sweep ran). Documented inline in both scripts. Future PRISM scripts that import .ts engines need the same caveat.

## Loop status

iter 37 / 20 (at-target +17). Session db0678d4. Charlie domain: wire/WEDM/EDM.

3 commits chain into a coherent Phase-A close-out — every unit ships AND every finding feeds the next-unit decision instead of being lost. This is the per-iter discipline working as designed.

Related: [[reference_u_mcx_metadata_wire_2026_05_23]] · [[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]] · [[reference_wedm_phase_a1_parser_blank_line_bug_2026_05_22]] · [[feedback_autonomous_loop_drift_discipline]] · [[feedback_always_close_out]].
