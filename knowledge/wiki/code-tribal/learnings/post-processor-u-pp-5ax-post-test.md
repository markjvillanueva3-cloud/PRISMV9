# POST-PROCESSOR/U-PP-5AX-POST-TEST — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-5AX-POST-TEST (slot:echo): FiveAxisPostEngine companion test (34) -- RTCP/singularity/inverse-time/linearize/unwind

**Commit:** `447c2e3d05be` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:20:13-05:00
**Tags:** post-processor, u-pp-5ax-post-test, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-5AX-POST-TEST (slot:echo): FiveAxisPostEngine companion test (34) -- RTCP/singularity/inverse-time/linearize/unwind

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-5AX-POST-TEST (slot:echo): FiveAxisPostEngine companion test (34) -- RTCP/singularity/inverse-time/linearize/unwind

FiveAxisPostEngine (5-axis RTCP/TCPC post, serves JM VMC-02 Okuma M460V-5AX) had no
companion test. 34 R9 cases with hand-traced reference values:
- per-controller TCPC codes (Fanuc G43.4 H<o>, Okuma OSP-P300 bare G43.4 vs OSP-P500 G43.5,
  Haas G234, Siemens TRAORI(1)/TRAFOOF, Heidenhain FUNCTION TCPM) + unknown->generic_fanuc fallback
- tilted-plane rotation (Fanuc/Haas G68.2, Siemens CYCLE800, Heidenhain PLANE SPATIAL)
- singularity detection (head-head gimbal at B~0 critical/warning bands; table-tilt at A~0;
  axis-flip in the 170-190deg window incl. the 200deg adversarial boundary; near_pole on limits)
- G93 inverse-time feed (3-4-5 linear F_inv=20; 90deg pivot-200 arc F_inv~3.1831; zero-dist guard)
- chord-error linearize (pure-linear passthrough; large-move split bounded by tolerance; 100-seg cap)
- rotary unwind (+/-360 near limits; centered untouched)
All green first run (engine verified correct -- no bug surfaced). Advances ECHO-ULTIMATE-ROADMAP
v2 Track A/G4 (untested post engines). Single additive test file; 3-of-3 at Stop.
```

## Files touched (3)
- knowledge/wiki/code-tribal/learnings/stopgate-session-attribution.md |  12 ++++--
- mcp-server/src/__tests__/FiveAxisPostEngine.test.ts                  | 300 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 308 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- tilted-plane rotation (Fanuc/Haas G68.2, Siemens CYCLE800, Heidenhain PLANE SPATIAL)
- tilt at A~0;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 447c2e3d05be`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._