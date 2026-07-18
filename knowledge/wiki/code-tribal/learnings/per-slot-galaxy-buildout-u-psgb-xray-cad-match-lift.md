# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-CAD-MATCH-LIFT — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CAD-MATCH-LIFT (slot:xray): fix 4-digit-PN blindspot in CAD-match — 272->498 PNs (+83%)

**Commit:** `7385b735fe5b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T19:50:14-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-cad-match-lift, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CAD-MATCH-LIFT (slot:xray): fix 4-digit-PN blindspot in CAD-match — 272->498 PNs (+83%)

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CAD-MATCH-LIFT (slot:xray): fix 4-digit-PN blindspot in CAD-match — 272->498 PNs (+83%)

candidatePNs extracted digit-runs \d{5,} only, blind to ALL 4-digit PNs — but
14,394 of 76,205 v6 PNs (~19%) are 4-digit, so CAD geometry files genuinely
named '1005 HAMMERHOB.ipt' were invisible to the supervised-pair join. Lowered
the digit-run floor to \d{4,}, gated by knownPNs membership (a 4-digit run only
matches an ACTUAL JM PN -> false positives bounded to real-PN collisions).

Measured + rejected alternatives: 3-digit extraction (+46 PNs only, but revs/
dates -> noise) and folder co-location (v6 program dirs are shared/customer
folders -> many-parts-per-PN noise, degrades label quality). Each CAD entry now
carries matched_via (join key) for audit.

Real corpus result: CAD-matched PNs 272->498, full-triple 238->426, train-
eligible 4,207->4,245. 11/11 node:tests (8->11, +4digit +3digit-boundary
+matched_via).
```

## Files touched (3)
- scripts/build-blueprint-cad-program-pairs.mjs      | 14 ++++++++++----
- scripts/build-blueprint-cad-program-pairs.test.mjs | 24 ++++++++++++++++++++++++
- 2 files changed, 34 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7385b735fe5b`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._