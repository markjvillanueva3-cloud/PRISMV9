# CIMCO-INTEGRATION-MS0/U-NC-DIALECT-MASKS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-NC-DIALECT-MASKS (slot:echo): per-dialect volatileCommentMask profiles + golden round-trip classifier (scripts/lib/nc-dialect-masks.mjs). roundTrip(golden,candidate) → byte-identical | volatile-header-only (SAFE: same program, header churn) | semantic-drift (content differs). Masks derived from JM's OWN golden headers (not vendor manuals): Mastercam DATE/TIME/MCX-FILE/NC-FILE (Haas .nc + Okuma .MIN), PRISM source-path, Mitsubishi paren-date; Hurco .hnc has none. detectDialect heuristic + maskFor + union allMask. SAFETY: masks never alter semantic G-code (10/10 tests incl over-mask probes). Validated on real AGRATI 9007405.MIN: header-churn→safe, S800→S1200→semantic-drift@L10. Workflow-roadmap #2; the only offline-provable proof arm. Agents session-limited (8:40pm CT) → parallel extraction+scrutiny deferred; session 3-of-3 holds.

**Commit:** `d0e5df9e161a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T20:44:41-05:00
**Tags:** cimco-integration-ms0, u-nc-dialect-masks, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-NC-DIALECT-MASKS (slot:echo): per-dialect volatileCommentMask profiles + golden round-trip classifier (scripts/lib/nc-dialect-masks.mjs). roundTrip(golden,candidate) → byte-identical | volatile-header-only (SAFE: same program, header churn) | semantic-drift (content differs). Masks derived from JM's OWN golden headers (not vendor manuals): Mastercam DATE/TIME/MCX-FILE/NC-FILE (Haas .nc + Okuma .MIN), PRISM source-path, Mitsubishi paren-date; Hurco .hnc has none. detectDialect heuristic + maskFor + union allMask. SAFETY: masks never alter semantic G-code (10/10 tests incl over-mask probes). Validated on real AGRATI 9007405.MIN: header-churn→safe, S800→S1200→semantic-drift@L10. Workflow-roadmap #2; the only offline-provable proof arm. Agents session-limited (8:40pm CT) → parallel extraction+scrutiny deferred; session 3-of-3 holds.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-NC-DIALECT-MASKS (slot:echo): per-dialect volatileCommentMask profiles + golden round-trip classifier (scripts/lib/nc-dialect-masks.mjs). roundTrip(golden,candidate) → byte-identical | volatile-header-only (SAFE: same program, header churn) | semantic-drift (content differs). Masks derived from JM's OWN golden headers (not vendor manuals): Mastercam DATE/TIME/MCX-FILE/NC-FILE (Haas .nc + Okuma .MIN), PRISM source-path, Mitsubishi paren-date; Hurco .hnc has none. detectDialect heuristic + maskFor + union allMask. SAFETY: masks never alter semantic G-code (10/10 tests incl over-mask probes). Validated on real AGRATI 9007405.MIN: header-churn→safe, S800→S1200→semantic-drift@L10. Workflow-roadmap #2; the only offline-provable proof arm. Agents session-limited (8:40pm CT) → parallel extraction+scrutiny deferred; session 3-of-3 holds.
```

## Files touched (3)
- scripts/lib/nc-dialect-masks.mjs      | 126 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/nc-dialect-masks.test.mjs |  96 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 222 insertions(+)

## Lessons surfaced in commit body
- tileCommentMask profiles + golden round-trip classifier (scripts/lib/nc-dialect-masks.mjs). roundTrip(golden,candidate) → byte-identical | volatile-header-only (SAFE: same program, header churn) | semantic-drift (content differs). Masks derived from JM's OWN golden headers (not vendor manuals): Mastercam DATE/TIME/MCX-FILE/NC-FILE (Haas .nc + Okuma .MIN), PRISM source-path, Mitsubishi paren-date; Hur

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d0e5df9e161a`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._