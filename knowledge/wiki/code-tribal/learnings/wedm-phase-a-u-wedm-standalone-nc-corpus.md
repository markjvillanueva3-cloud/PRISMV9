# WEDM-PHASE-A/U-WEDM-STANDALONE-NC-CORPUS — [MAIN] [WEDM-PHASE-A]/U-WEDM-STANDALONE-NC-CORPUS (slot:charlie iter37): 22/22 standalone NC parsed; exposes Mitsubishi .MIN dialect-detection gap (17/19 misclassified as "unknown")

**Commit:** `feb1d9ac9cbe` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T22:45:06-05:00
**Tags:** wedm-phase-a, u-wedm-standalone-nc-corpus, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-WEDM-STANDALONE-NC-CORPUS (slot:charlie iter37): 22/22 standalone NC parsed; exposes Mitsubishi .MIN dialect-detection gap (17/19 misclassified as "unknown")

## Body
```
[MAIN] [WEDM-PHASE-A]/U-WEDM-STANDALONE-NC-CORPUS (slot:charlie iter37): 22/22 standalone NC parsed; exposes Mitsubishi .MIN dialect-detection gap (17/19 misclassified as "unknown")

Closes the Phase-A loop the way iter-36's negative finding pointed at:
treat the 22 standalone NC files (zero .mcx-* siblings, controller-side
authored) as their own independent training/validation corpus, parse each
via WireEDMProgramParserEngine, and capture both the structural metadata
and any dialect-detection gaps surfaced by real shop-authored programs.

Parse stats (5,117ms total — 22 files, ~233ms avg per file):
  total            22
  parse_ok         22   (100% structural parse success — engine is robust)
  parse_failed      0

  expected_dialect (from index): mitsubishi=19, generic=3
  detected_dialect (parser):     unknown=20,    mitsubishi=2
  expected_vs_detected_match     0/22

  has_passes        22 (every program has at least one pass detected)
  has_taper          1
  has_auto_thread    2

REAL GAP: WireEDMProgramParserEngine misclassifies 17 of 19 Mitsubishi .MIN
files as "unknown" dialect. The parser CAN extract passes / contour moves /
taper / auto-thread successfully (no parse failures), but its
dialect-detection logic misses Mitsubishi's distinctive signatures:

  - $PC...% header (every .MIN file opens with this)
  - NBAR keyword (block-number declaration)
  - DEF WORK keyword (workspace definition)
  - M-code distribution (M80=wire on, M82=wire off — Mitsubishi convention)

The 2 .MIN files that WERE detected as mitsubishi must have hit some other
existing heuristic; the other 17 fell through. Worth investigating which
2 succeeded — that's the existing detection path, and the remaining 17
likely just need that path's threshold/regex expanded.

Files:
  scripts/wedm-standalone-nc-parse.mjs            +168 (new runner)
  state/shared/wedm-standalone-nc-corpus.json     +553 (new — 22-program
                                                       structural parse + gap
                                                       evidence per file)

What's unblocked next (high-ROI for charlie):

  U-WEDM-MIN-DIALECT-DETECT — extend WireEDMProgramParserEngine.detectDialect
  to recognize the .MIN signatures above. Acceptance: re-run this parse
  script, expected_match should jump 0/22 → ≥19/22 (the 19 expected-Mitsubishi
  files all detect as Mitsubishi; the 3 generic .NC may legitimately stay
  "unknown" depending on their actual content).

  U-WEDM-MIN-DIALECT-CONFIDENCE — the corpus now provides 19 real .MIN
  training samples + 2 expected-confused-as-mitsubishi positives + a clear
  failure-case set. Confidence-score calibration can ride this.

Memory: [[reference_u_mcx_metadata_wire_2026_05_23]] (Phase-A iter-35
provenance), [[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]]
(Phase-A iter-33 origin).
```

## Files touched (3)
- scripts/wedm-standalone-nc-parse.mjs        | 168 +++++++++
- state/shared/wedm-standalone-nc-corpus.json | 553 ++++++++++++++++++++++++++++
- 2 files changed, 721 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show feb1d9ac9cbe`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._