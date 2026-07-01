# ECHO-WINMAX/U-MASTERPOST-VALIDATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-MASTERPOST-VALIDATE: master Hurco post validation + auto-pocket + hyperMILL holder/machine exporters + conformance structural mode

**Commit:** `98fcc59597df` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T18:53:38-05:00
**Tags:** echo-winmax, u-masterpost-validate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-MASTERPOST-VALIDATE: master Hurco post validation + auto-pocket + hyperMILL holder/machine exporters + conformance structural mode

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-MASTERPOST-VALIDATE: master Hurco post validation + auto-pocket + hyperMILL holder/machine exporters + conformance structural mode

Comprehensive master-Hurco-post validation (19-agent workflow wf_c087d89f) + the P1-d validator
fix it surfaced. NEW artifacts only (HurcoV11*/master-post engines READ-only, 16 in-flight peer handoffs).

DELIVERABLES (all verified):
- MASTER-HURCO-POST-CHECKLIST.md: 123-feature checklist. Standalone master_post_hurco_v11 path
  52/52 generated + 52/52 hurco dialect-lint clean across a 127-combo PAIRWISE matrix (13 axes:
  materials/holders/tooling/inserts/coatings/params/machines/spindle/motion/build-quality/age/
  packages/controller-settings). Units correct (G20/G21, no 25.4x). VERDICT: WinMax-ready for the
  validated single-op envelope.
- scripts/winmax-tool-pocket-autoselect.mjs (+test): op-list -> WinMax pocket map (T1..Tn), dedups
  identical tools to one pocket, emits define-tool course params + ATC table. VERIFIED: base job 5
  ops -> 4 pockets (dup 1/2in EM deduped). The automake-tool-pocket deliverable.
- scripts/export-hypermill-holder-db.mjs (selftest holders=8/couplings=9 FK-clean) +
  export-hypermill-machine-db.mjs (machines=6, 2x5-axis): hyperMILL HOLDER + MACHINE DB exporters
  (were gaps; only tool DB existed). .hmt SQLite + JSON/CSV, uploadable-confirmed.
- scripts/post-nc-conformance.mjs: checkStructural() + --structural CLI (P1-d FIX). The golden
  4-tool check false-failed all 52 matrix combos (0/52); structural mode gates ANY NC on
  invariants (units/work-offset/>=1 tool/every-tool-has-spindle/O-number/G28/M30). VERIFIED: a real
  matrix NC (A_inch_g54, T1 S5494) now passes. 30/30 conformance tests (+6 structural).
- test-matrix.json (127 pairwise) + 52 validated NC + per-chunk reports + exports/.

Real findings for owning chats (peer-owned, reported NOT edited): P1-a dispatcher clamps
work_offset to [54,59] -> extended-WCS G54.1 dead code; P1-b AGI path emits Haas G187 for Hurco
(use master_post_hurco_v11 not AGI); P1-c AGI kinematics cant resolve jmdie_hurco_v11; P2-a no G94
feed-mode block. Open (mine, next): Fusion+Mastercam holder/machine exporters; drive matrix chunks 3-5.
```

## Files touched (173)
- scripts/export-hypermill-holder-db.mjs                                                  |  229 ++++
- scripts/export-hypermill-machine-db.mjs                                                 |  206 ++++
- scripts/winmax-tool-pocket-autoselect.mjs                                               |  366 +++++++
- scripts/winmax-tool-pocket-autoselect.test.mjs                                          |  222 ++++
- state/shared/master-post-validation/A_ulti_on_adaptive.nc                               |   31 +
- state/shared/master-post-validation/B_ulti_on_contour.nc                                |   31 +
- state/shared/master-post-validation/C_ulti_off.nc                                       |   30 +
- state/shared/master-post-validation/D_inch_extwcs.nc                                    |    0
- state/shared/master-post-validation/D_inch_g55.nc                                       |   29 +
- state/shared/master-post-validation/MASTER-HURCO-POST-CHECKLIST.md                      |  164 +++
_(+163 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 98fcc59597df`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._