# WEDM-PHASE-A/U-WEDM-CORPUS-CORRECTION — [MAIN] [WEDM-PHASE-A]/U-WEDM-CORPUS-CORRECTION (slot:charlie iter38): MAJOR — 19 of 22 "WEDM" NC files are actually misfiled Mitsubishi LATHE programs; real WEDM corpus = 2 files, not 22

**Commit:** `0a690f376a27` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T23:05:04-05:00
**Tags:** wedm-phase-a, u-wedm-corpus-correction, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-WEDM-CORPUS-CORRECTION (slot:charlie iter38): MAJOR — 19 of 22 "WEDM" NC files are actually misfiled Mitsubishi LATHE programs; real WEDM corpus = 2 files, not 22

## Body
```
[MAIN] [WEDM-PHASE-A]/U-WEDM-CORPUS-CORRECTION (slot:charlie iter38): MAJOR — 19 of 22 "WEDM" NC files are actually misfiled Mitsubishi LATHE programs; real WEDM corpus = 2 files, not 22

CRITICAL CORRECTION to iter-36/37 findings. iter-36 indexed 22 NC files
under `JM DIE/WIRE EDM/` and tagged 19 .MIN files as "mitsubishi WEDM
dialect" purely from extension. iter-37 then parsed them, found 17 of 19
"misclassified" by WireEDMProgramParserEngine as unknown, and proposed
U-WEDM-MIN-DIALECT-DETECT as the next unit.

Content sniffing on the 19 .MIN files proves the opposite — they are
Mitsubishi LATHE programs, NOT WEDM. Every .MIN opens with this prelude:

  $WAFER.MIN%
  M1
  NBAR
  CLEAR
  DEF WORK
  PS LC,[-400,0],[400,19]
  END
  DRAW
  /CALL OBAR        ← invokes setup macro
  M1
  NAT01             (T00L HOLDER WITH .015R)
  T010101           ← LATHE TOOL CHANGE (6-digit Mitsubishi convention)
  G50 S1250         ← LATHE max-spindle for CSS
  G97 S1000 M3 M8   ← LATHE CSS-off, RPM, spindle, coolant
  G96 S350          ← LATHE CSS-on at 350 SFM
  G1 X-.04 F.004    ← LATHE per-rev feed
  G85 NTURN D.030 U.008 W.005 F.005   ← LATHE finish-turn canned cycle

That's lathe G-code with G50/G96/G97 + T-codes + NTURN turning canned
cycles + F-per-rev. Operators filed them under WIRE EDM/ for whatever
reason (probably a shop-floor filing artifact — maybe the part has both
a turning op AND a WEDM op and they grouped by final-part-family).
WireEDMProgramParserEngine was RIGHT to call them dialect=unknown.

Adding Mitsubishi .MIN detection to WireEDMProgramParserEngine would have
been WRONG WORK — it would teach the parser to misclassify lathe code as
WEDM. U-WEDM-MIN-DIALECT-DETECT (the iter-37 next-unit pointer) is
CANCELED.

The corrective fix in this commit:

  scripts/wedm-comparable-pairs-index.mjs:
    - Replace pure extension-based dialect tag with content sniffing
    - LATHE_MARKERS (T-codes, G50, G96/G97, NTURN, $NAME.MIN% header)
      and WEDM_MARKERS (H-register decls, M80/M82, E-codes, G51 W/U)
    - sniffDialectFamily() reads first 2KB, returns {family, hits}
    - classifyDialect() maps family + ext → final label
    - Schema 1.0.0 → 1.1.0
    - New stats: by_family, true_wedm_count, misfiled_lathe_count

  Re-run result:
    by_family   {"lathe": 19, "wedm": 2, "indeterminate": 1}
    true_wedm   2  ← ITW SHAKEPROOF 500-...NC + NOZE TEST.NC (both have
                     H175 = 0.0000 H-register declaration — actual WEDM)
    misfiled    19 ← all the .MIN files (mitsubishi-lathe)
    indeterm     1 ← "Wire Program - 5 inch square.NC" — bare G-code,
                     no WEDM/lathe markers, probably a tutorial sample

  state/shared/wedm-comparable-pairs.json: regen with corrected dialects
  state/shared/wedm-standalone-nc-corpus.json: regen (re-pulled fresh
    dialect labels from the corrected index; parse data structurally
    identical — the issue was labeling, not parsing)

Phase-A.2 implications (this is the REAL picture now):

- JM Die's WEDM training corpus is effectively 2 operator-authored
  programs. That's too few for meaningful dialect calibration.
- 19 misfiled-lathe programs are a separate finding — they belong to
  lathe-domain training (slot:bravo's corpus, not slot:charlie's).
- For Phase-A WEDM work to progress past metadata mining, PRISM needs
  WEDM training data from elsewhere: vendor sample programs, public
  corpora, or synthetic generation.

R12 fail-loud in action: shipping the negative finding + correction is
more valuable than shipping the wrong-work U-WEDM-MIN-DIALECT-DETECT
extension. The corpus IS the deliverable — it's just smaller than we
thought.

Memory: [[reference_phase_a_3iter_progression_2026_05_23]] (iter 35-37
chain this corrects), [[reference_u_mcx_metadata_wire_2026_05_23]]
(Phase-A context), [[feedback_no_skipping]] / R12.
```

## Files touched (6)
- .claude/hooks/__tests__/mcp-route-suggest.test.mjs |  91 ++++++++++
- .claude/hooks/mcp-route-suggest.mjs                |  40 ++++-
- scripts/wedm-comparable-pairs-index.mjs            | 125 ++++++++++++-
- state/shared/wedm-comparable-pairs.json            | 196 ++++++++++++++++++---
- state/shared/wedm-standalone-nc-corpus.json        |  95 +++++-----
- 5 files changed, 462 insertions(+), 85 deletions(-)

## Lessons surfaced in commit body
- WRONG WORK — it would teach the parser to misclassify lathe code as
- wrong-work U-WEDM-MIN-DIALECT-DETECT

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a690f376a27`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._