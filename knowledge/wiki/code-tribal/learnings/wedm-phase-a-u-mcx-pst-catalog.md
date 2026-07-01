# WEDM-PHASE-A/U-MCX-PST-CATALOG — [MAIN] [WEDM-PHASE-A]/U-MCX-PST-CATALOG (slot:charlie iter47): extend wmd catalog to also extract .pst post-processor refs in same pass — 77/97 explicit Mitsubishi WEDM post selections cross-validate iter-43 88pct machine-def finding. 8 unique .pst identities (vs Phase-B iter-39 heuristic that caught only 5): 53/97 MPW MITS FA-FX EDM(TECH).PST + 24/97 Mitsubishi FA-Series 4X Wire (TECH).pst + 6/97 NONE.PST default + 2/97 MPWFANUC.PST (cross-process mill) + 1 each MPM ROKU ROKU VMC + OKUMA_LB3000MSY + NONE.pst case-variant + I FA-SERIES 4X WIRE.PST. Suffix-fragment dedup pass (same algorithm as wmd) suppressed 4 noise variants. Manifests with zero pst = 16/97 (almost same as zero-wmd 18 — both indicate default-machine-def projects where operator imported geometry and never customized post). The 77/97 Mitsubishi WEDM post + 16 zero-pst (assume default-NONE) + 4 cross-process posts + heuristic-only 0 = 97/97 accounted for. Symmetric finding confirms iter-43: programs that select Mitsubishi machine-def also select Mitsubishi post (as expected — they couple in Mastercam). Charlie operational picture is now belt-and-suspenders validated. Files: scripts/wedm-mcx-wmd-catalog.mjs (added PST_RE + pstMap + dedup + output fields, ~35 lines net) + state/shared/wedm-mcx-wmd-catalog.json (regen with pst_distribution block). Memory: reference_phase_a_full_arc_2026_05_23.

**Commit:** `844f19b15f6e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T10:33:11-05:00
**Tags:** wedm-phase-a, u-mcx-pst-catalog, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-MCX-PST-CATALOG (slot:charlie iter47): extend wmd catalog to also extract .pst post-processor refs in same pass — 77/97 explicit Mitsubishi WEDM post selections cross-validate iter-43 88pct machine-def finding. 8 unique .pst identities (vs Phase-B iter-39 heuristic that caught only 5): 53/97 MPW MITS FA-FX EDM(TECH).PST + 24/97 Mitsubishi FA-Series 4X Wire (TECH).pst + 6/97 NONE.PST default + 2/97 MPWFANUC.PST (cross-process mill) + 1 each MPM ROKU ROKU VMC + OKUMA_LB3000MSY + NONE.pst case-variant + I FA-SERIES 4X WIRE.PST. Suffix-fragment dedup pass (same algorithm as wmd) suppressed 4 noise variants. Manifests with zero pst = 16/97 (almost same as zero-wmd 18 — both indicate default-machine-def projects where operator imported geometry and never customized post). The 77/97 Mitsubishi WEDM post + 16 zero-pst (assume default-NONE) + 4 cross-process posts + heuristic-only 0 = 97/97 accounted for. Symmetric finding confirms iter-43: programs that select Mitsubishi machine-def also select Mitsubishi post (as expected — they couple in Mastercam). Charlie operational picture is now belt-and-suspenders validated. Files: scripts/wedm-mcx-wmd-catalog.mjs (added PST_RE + pstMap + dedup + output fields, ~35 lines net) + state/shared/wedm-mcx-wmd-catalog.json (regen with pst_distribution block). Memory: reference_phase_a_full_arc_2026_05_23.

## Body
```
[MAIN] [WEDM-PHASE-A]/U-MCX-PST-CATALOG (slot:charlie iter47): extend wmd catalog to also extract .pst post-processor refs in same pass — 77/97 explicit Mitsubishi WEDM post selections cross-validate iter-43 88pct machine-def finding. 8 unique .pst identities (vs Phase-B iter-39 heuristic that caught only 5): 53/97 MPW MITS FA-FX EDM(TECH).PST + 24/97 Mitsubishi FA-Series 4X Wire (TECH).pst + 6/97 NONE.PST default + 2/97 MPWFANUC.PST (cross-process mill) + 1 each MPM ROKU ROKU VMC + OKUMA_LB3000MSY + NONE.pst case-variant + I FA-SERIES 4X WIRE.PST. Suffix-fragment dedup pass (same algorithm as wmd) suppressed 4 noise variants. Manifests with zero pst = 16/97 (almost same as zero-wmd 18 — both indicate default-machine-def projects where operator imported geometry and never customized post). The 77/97 Mitsubishi WEDM post + 16 zero-pst (assume default-NONE) + 4 cross-process posts + heuristic-only 0 = 97/97 accounted for. Symmetric finding confirms iter-43: programs that select Mitsubishi machine-def also select Mitsubishi post (as expected — they couple in Mastercam). Charlie operational picture is now belt-and-suspenders validated. Files: scripts/wedm-mcx-wmd-catalog.mjs (added PST_RE + pstMap + dedup + output fields, ~35 lines net) + state/shared/wedm-mcx-wmd-catalog.json (regen with pst_distribution block). Memory: reference_phase_a_full_arc_2026_05_23.
```

## Files touched (3)
- scripts/wedm-mcx-wmd-catalog.mjs       |  83 +++++++++++++++++---
- state/shared/wedm-mcx-wmd-catalog.json | 135 ++++++++++++++++++++++++++++++++-
- 2 files changed, 204 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 844f19b15f6e`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._