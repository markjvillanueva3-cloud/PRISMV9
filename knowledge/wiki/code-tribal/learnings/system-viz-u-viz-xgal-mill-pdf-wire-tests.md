# SYSTEM-VIZ/U-VIZ-XGAL-MILL-PDF-WIRE-TESTS — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE-TESTS (slot:sierra): R9 regression lock for the milling-bridge wire

**Commit:** `d86206339751` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:33:06-05:00
**Tags:** system-viz, u-viz-xgal-mill-pdf-wire-tests, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE-TESTS (slot:sierra): R9 regression lock for the milling-bridge wire

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE-TESTS (slot:sierra): R9 regression lock for the milling-bridge wire

Adds scripts/generate-milling-extracted-pdf-bridge.test.mjs (12 tests, node:test) + a __test
export of the pure helpers (the isMain guard keeps FAST[] spawn behavior unchanged -- verified
the generator still runs 77/116 after the export).

Locks BOTH defect-fixes from U-VIZ-XGAL-MILL-PDF-WIRE against regression (R9 -- a test that
fails if the business logic changes):
 - loadPeerAug fail-soft: MISSING file + CORRUPT json both -> {newNodes:[]} (no throw), so a
   future un-guarding can never silently re-introduce the regen-crash. Plus valid-json passthrough.
 - canonical edge-ids: consumed-by -> eng.knowledge.knowledgecurriculumbridgeengine, feeds-wizard
   -> eng.mill.millmasterorchestratorfacadeengine, page-extracts -> parent; both asserted to match
   /^eng\./ so a revert to engine.<PascalCase> (the dangling-edge bug) fails the suite.
Coverage: happy + unmatched-slug + empty-extractions failure modes + adversarial candidate-order
(mill wins over cam) + lathe-only-parent + safeSlug sanitize/empty/truncate. 12/12 pass.
```

## Files touched (3)
- scripts/generate-milling-extracted-pdf-bridge.mjs      |  12 ++++++
- scripts/generate-milling-extracted-pdf-bridge.test.mjs | 120 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 132 insertions(+)

## Lessons surfaced in commit body
- till runs 77/116 after the export).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d86206339751`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._