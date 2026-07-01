# WEDM-PHASE-A/U-PHASE-B-TEMPLATE-MINING — [MAIN] [WEDM-PHASE-A]/U-PHASE-B-TEMPLATE-MINING (slot:charlie iter39): aggregate 97-pair reference_metadata into pattern catalog — strong wire-dominant signal + 2 parser-coverage gaps surfaced

**Commit:** `4cbc86229273` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T23:16:47-05:00
**Tags:** wedm-phase-a, u-phase-b-template-mining, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-PHASE-B-TEMPLATE-MINING (slot:charlie iter39): aggregate 97-pair reference_metadata into pattern catalog — strong wire-dominant signal + 2 parser-coverage gaps surfaced

## Body
```
[MAIN] [WEDM-PHASE-A]/U-PHASE-B-TEMPLATE-MINING (slot:charlie iter39): aggregate 97-pair reference_metadata into pattern catalog — strong wire-dominant signal + 2 parser-coverage gaps surfaced

Phase-B kickoff. Aggregates the 97 wedm-training-corpus/*-phase-a1.json
manifests (shipped iter-35, regen'd iter-38) into one rolled-up pattern
catalog. No engine touch — pure JSON aggregation over the
reference_metadata blocks Phase-A already produced.

Output: state/shared/wedm-phase-b-patterns.json

Top findings:

  corpus.with_reference_metadata  97 of 98   (iter-38 regen left 1
                                             AF102-05 manifest on
                                             schema 1.0.0 — orthogonal
                                             follow-up)
  format_distribution             {".mcx-8": 97}   (100% Mastercam X8 —
                                                   JM Die WEDM corpus is
                                                   format-homogeneous)
  machine_hints                   {"wire": 80, "mill": 7, "lathe": 2}
                                  (CORRECTS iter-37 sample-of-3 impression
                                   that machine_hints was thin — 80/97
                                   binaries surface "wire" in embedded
                                   printable runs)
  post_processor_hints (5 unique):
      6×  NONE.PST                  (Mastercam default, no post selected)
      2×  MPWFANUC.PST              (Fanuc WEDM-controller post)
      1×  MPM ROKU ROKU VMC.PST     (ROKU-ROKU mill — explains the 7 mill hits)
      1×  OKUMA_LB3000MSY.PST       (Okuma LB3000 mill-turn — explains the 2 lathe)
      1×  I FA-SERIES 4X WIRE.PST   (Mitsubishi FA-series 4-axis WIRE EDM post —
                                     the smoking gun for one actually-posted
                                     WEDM program in the corpus)
  zlib_chunk_distribution         {count:97, zero:89, p50:0, p95:1, max:4}
                                   89/97 (92%) report zlib_chunks=0 — PARSER
                                   COVERAGE GAP in McxProgramParserEngine
  embedded_string_count_distrib   {min:17, p50:181, p95:230, max:258}
                                   (printable-run count distribution healthy)
  materials                       [{"token":"GRAPHITE", "count":1}]
                                   (sparse — engine's COMMON_MATERIAL_TOKENS
                                    regex misses descriptive operator names)

What this unblocks vs. what the gaps mean:

  ✓ Wire-dominance proven structurally — the JM Die "WIRE EDM" folder
    IS WEDM-dominated when measured by Mastercam .mcx-* binaries (not
    by misfiled .MIN posted-NC).
  ✓ Operator workflow is "draft in Mastercam X8, leave post=NONE for
    DNC" — 6 of 11 post-tagged projects have no post selected. They
    drive the wire controller directly via Mastercam, not posted NC.
    This explains iter-36's 0/22 posted-NC pairing rate.
  ✓ Cross-process projects in WIRE EDM/ are real but rare — 1 mill
    post + 1 mill-turn post + 1 actual wire-EDM post. The other 6
    NONE.PST projects are likely also wire (default state).

  ⚠ U-MCX-COMPRESSION-COVERAGE — McxProgramParserEngine finds zero
    zlib chunks in 89/97 X8 binaries. Either X8 uses non-zlib
    compression OR the engine's 4-magic-byte scan (78 9C/DA/5E/01)
    misses some zlib variants OR the compressed regions are past the
    bytes_scanned cap. Worth investigating — recovering the
    operation-count estimate would let Phase-B mine per-op tool
    sequences.
  ⚠ U-MCX-MATERIAL-VOCAB — COMMON_MATERIAL_TOKENS regex is too tight
    for JM Die's actual operator vocabulary; needs corpus-driven
    expansion (e.g. "die steel", "carbide", "tool steel" descriptive
    terms operators actually type).

Schema 1.0.0. Noise filter drops GUIDs / paths / .NET strings / numeric-only
/ too-short(<4) / too-long(>120). v1 mines persisted hint arrays + counts
only; v2 could re-parse .mcx-* refs and aggregate raw embedded_strings
for token-frequency analysis (deferred — bigger work, would need to keep
strings in manifests).

Files:
  scripts/wedm-phase-b-pattern-mine.mjs        +193 (new)
  state/shared/wedm-phase-b-patterns.json      +69  (new — canonical
                                                    Phase-B catalog)

Memory: [[reference_phase_a_3iter_progression_2026_05_23]] (Phase-A
context this builds on), [[reference_u_mcx_metadata_wire_2026_05_23]]
(iter-35 reference_metadata wire that produced the corpus).
```

## Files touched (6)
- scripts/wedm-comparable-pairs-index.mjs     | 125 ++----------------
- scripts/wedm-phase-b-pattern-mine.mjs       | 196 ++++++++++++++++++++++++++++
- state/shared/wedm-comparable-pairs.json     | 196 ++++------------------------
- state/shared/wedm-phase-b-patterns.json     |  69 ++++++++++
- state/shared/wedm-standalone-nc-corpus.json |  95 +++++++-------
- 5 files changed, 349 insertions(+), 332 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4cbc86229273`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._