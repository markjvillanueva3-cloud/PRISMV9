# WEDM-PHASE-A/U-MCX-METADATA-WIRE — [MAIN] [WEDM-PHASE-A]/U-MCX-METADATA-WIRE (slot:charlie iter35): wire McxProgramParserEngine into Phase-A.1 sweep — 97/98 .mcx-* refs now produce reference_metadata

**Commit:** `c1f7ba2aaad3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T22:17:01-05:00
**Tags:** wedm-phase-a, u-mcx-metadata-wire, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-MCX-METADATA-WIRE (slot:charlie iter35): wire McxProgramParserEngine into Phase-A.1 sweep — 97/98 .mcx-* refs now produce reference_metadata

## Body
```
[MAIN] [WEDM-PHASE-A]/U-MCX-METADATA-WIRE (slot:charlie iter35): wire McxProgramParserEngine into Phase-A.1 sweep — 97/98 .mcx-* refs now produce reference_metadata

Iter-33 reference memo ([[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]])
listed U-MCX-WIRE next: "wire McxProgramParserEngine into the sweep to read
the .mcx-8 binary into NC text, then run wedmProgramComparisonEngine to fill
in the compare block." The premise was wrong — McxProgramParserEngine's own
docstring says it deliberately stops at metadata (machine hint, embedded tool /
post / material runs, format, version, zlib chunk count). The .mcx-* container
is proprietary; full NC extraction needs Mastercam SDK / NETHOOK or a sibling
posted .nc/.eia file (none found in any inspected pair's reference dir).

So this unit reframes to U-MCX-METADATA-WIRE — extract everything the engine
DOES surface, persist it into manifest.reference_metadata, and rewrite the
misleading compare.gap_reason to R12-truthful:

  OLD: "comparison requires McxProgramParserEngine to extract NC text first (Phase-A.2)"
  NEW: "McxProgramParserEngine extracted reference_metadata but cannot recover
        full NC text. Real deviation report needs a sibling posted-NC harvest
        (Phase-A.2 / U-WEDM-POSTED-NC-INDEX) or Mastercam SDK access."

Sweep result on all 98 high-confidence v4 pairs (72,029ms total — slightly
slower than iter-34's 20s because the mcx parse adds per-pair I/O on the
292KB-1.5MB binary):

  pairs_total       98
  pdf_only_gap      97   (unchanged — awaits BlueprintVisionOCR Phase-A.3)
  dxf_parse_ok       1   (AF102-05)
  dxf_parse_failed   0
  wizard_ok          1
  wizard_failed      0
  mcx_parse_ok      97   (NEW — every .mcx-* reference parsed)
  mcx_parse_failed   0
  mcx_no_program     0

Sampled output across the corpus:

  AF102-05    fmt=.mcx-8 strings=41  tools=0 machine=-     material=-     zlib=0
  0137471     fmt=.mcx-8 strings=123 tools=0 machine=-     material=-     zlib=0
  10-001-490  fmt=.mcx-8 strings=152 tools=0 machine=wire  material=2024  zlib=0
  1134_hob    fmt=.mcx-8 strings=221 tools=0 machine=wire  material=2024  zlib=0

Real signal — 2 of the 3 sampled non-target pairs surfaced machine=wire +
material=2024 (Al alloy) via the engine's MACHINE_PATTERNS + COMMON_MATERIAL_TOKENS
regex pass over embedded printable runs. This cross-validates the wizard's
own material+machine selection independently of the binary toolpath
(which we can't get).

Also fixed a pre-existing portability hazard exposed during testing — the
script's .ts engine imports only resolve under tsx. The iter-34 sweep was
silently invoked via `mcp-server/node_modules/.bin/tsx`; plain `node` (v22)
throws ERR_UNKNOWN_FILE_EXTENSION. The dist/ fallback was tried but found
stale (iter-32/33 DXF parser fixes hadn't been built yet). Documented the
tsx requirement inline so future operators don't re-trip on it.

Schema bump 1.0.0 → 1.1.0 lets downstream consumers detect the new
reference_metadata field.

What's unblocked:
- **U-WEDM-POSTED-NC-INDEX** (next high-ROI charlie unit): scan the JM Die
  WIRE EDM tree for sibling .nc / .eia / .txt files matching .mcx-* stems —
  those ARE comparable NC text and would feed wedmProgramComparisonEngine
  for real deviation reports.
- Cross-validation hook: wizard's selected machine/material vs the
  reference's metadata-derived machine/material — disagreement = drift signal.
- Phase-B template mining can now pull operator-named tools/posts from
  reference_metadata.embedded_strings beyond just contour geometry.

Files:
  scripts/wedm-phase-a1-sweep.mjs                                  +88 -4
  state/shared/wedm-training-corpus/_sweep-summary.json            +2 (regen)
  state/shared/wedm-training-corpus/af102-05-phase-a1.json         +28 (regen)

Memory: [[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]] (iter-33
context this builds on), [[reference_u_ppl_d5_already_built]] (McxProgramParserEngine
provenance — LATHE-PROD-READY-MS0/U-LPR26).
```

## Files touched (4)
- scripts/wedm-phase-a1-sweep.mjs                    | 92 +++++++++++++++++++++-
- .../wedm-training-corpus/_sweep-summary.json       |  7 +-
- .../wedm-training-corpus/af102-05-phase-a1.json    | 30 +++++--
- 3 files changed, 118 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- wrong — McxProgramParserEngine's own

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c1f7ba2aaad3`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._