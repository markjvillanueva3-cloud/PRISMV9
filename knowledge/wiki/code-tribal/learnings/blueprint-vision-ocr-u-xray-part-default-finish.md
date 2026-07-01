# BLUEPRINT-VISION-OCR/U-XRAY-PART-DEFAULT-FINISH — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PART-DEFAULT-FINISH (slot:xray): expose the part-level "unless otherwise noted" finish as a SAFE informational signal

**Commit:** `9c4bdc0986b7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:00:35-05:00
**Tags:** blueprint-vision-ocr, u-xray-part-default-finish, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PART-DEFAULT-FINISH (slot:xray): expose the part-level "unless otherwise noted" finish as a SAFE informational signal

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PART-DEFAULT-FINISH (slot:xray): expose the part-level "unless otherwise noted" finish as a SAFE informational signal

Closes the part-level surface_finishes loop the safe way. The VLM emits part-level
finishes ("63 RMS unless otherwise specified") that apply to every surface. A first cut
INHERITED that onto each dimension's surface_finish_ra -- but a 2-arm scrutiny FAILED it
(arm B, two P1s): surface_finish_ra is COST/PROCESS-bearing (feeds the quote multiplier in
TolerancePricingImpactEngine + the WEDM trim-pass count) and the readers do NOT honor an
"inherited" flag, so a derived default would silently inflate quotes / add machining passes
with no provenance + no confidence downgrade.

REDESIGN (this commit): do NOT mutate any dimension. Instead expose the single unambiguous
part-level finish as an OPTIONAL INFORMATIONAL field `part_default_surface_finish` on
BlueprintVisionResult, carrying finish_system/assumed provenance, with ZERO cost/process
impact (no forced consumer). Pure `selectPartDefaultFinish(finishes)` added to
src/utils/surfaceFinishNormalize.ts, HARDENED per scrutiny: (a) ra_um>0 guard (a mis-read 0
all-over callout can never become the default); (b) tightened all-over regex so feature-noun
strings ("all 4 holes", "overall length", "typical bore") are NOT treated as drawing-wide,
while "all over/surfaces/machined", "unless (otherwise) noted/specified", "U.O.S.", and a
location-absent finish still are; exactly-one-all-over returns it, else null (R12 no-guess).

TESTED: 34 vitest (10 new selectPartDefaultFinish cases incl every false-positive guard +
ra_um<=0 + two-competing -> null); tsc clean. Re-scrutiny 2-arm BOTH PASS, no findings --
prior P1s structurally eliminated (dimension.surface_finish_ra written ONLY by
resolveSurfaceFinishRa from the VLM's own per-dim value; cost/WEDM readers unchanged).

FOLLOW-UP (R12, queued): a consumer that USES part_default_surface_finish (e.g. apply the
default to unfinished dims) must add operator-confirm + a confidence/provenance downgrade
before it may touch a cost-bearing field.
```

## Files touched (4)
- mcp-server/src/engines/BlueprintVisionOCREngine.ts            | 26 ++++++++++++++++++++++++--
- mcp-server/src/utils/__tests__/surfaceFinishNormalize.test.ts | 75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/utils/surfaceFinishNormalize.ts                | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 173 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- tils/surfaceFinishNormalize.ts, HARDENED per scrutiny: (a) ra_um>0 guard (a mis-read 0
- till are; exactly-one-all-over returns it, else null (R12 no-guess).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c4bdc0986b7`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._