# SFC-PROVEN/U-SFC-FRONTEND-SOUL-CORRECTION — [MAIN-FORCE] [SFC-PROVEN]/U-SFC-FRONTEND-SOUL-CORRECTION (slot:oscar): R12 self-correct a FALSE published finding -- the focused SFC page DOES surface the S(x) safety block

**Commit:** `b320db8e8f7d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:03:24-05:00
**Tags:** sfc-proven, u-sfc-frontend-soul-correction, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PROVEN]/U-SFC-FRONTEND-SOUL-CORRECTION (slot:oscar): R12 self-correct a FALSE published finding -- the focused SFC page DOES surface the S(x) safety block

## Body
```
[MAIN-FORCE] [SFC-PROVEN]/U-SFC-FRONTEND-SOUL-CORRECTION (slot:oscar): R12 self-correct a FALSE published finding -- the focused SFC page DOES surface the S(x) safety block

An earlier finding (this wiki + reference_oscar_sfc_frontend_wiring_map_2026_06_22 memory)
claimed SfcCalculatorPage violates oscar-soul by "publishing speed/feed with no uncertainty".
VERIFIED FALSE by reading the delegated component + the full data flow:
- routes/sfc.ts:28 returns { result, safety: result?.safety, meta } -- safety is a FIELD on result.
- useApiCall (useSfc.ts:27,29) returns res.result, which CARRIES result.safety.
- ResultsDisplay.tsx:62-125 ALREADY renders the S(x) safety block (score + status + factors).
So the focused page surfaces a safety/accuracy signal end-to-end -- NO bug, no blind fix needed.
The real (gated) gap is only the RICHER STATISTICAL uncertainty (CI95/confidence/weibull) that
sf_orchestrate produces but prism_product sfc_calculate does not -- the D2 canonical-engine
decision, not a UI add. Corrected the wiki finding #4/#5 + Open-next; memory corrected too.
Lesson: an Explore-recon "no X displayed" must be confirmed against the DELEGATED render
component before publishing it as a finding (read the body, not the summary).
```

## Files touched (2)
- knowledge/wiki/architecture/sfc-proven-pipeline.md | 25 +++++++++++++++++++------
- 1 file changed, 19 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- Lesson: an Explore-recon "no X displayed" must be confirmed against the DELEGATED render

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b320db8e8f7d`
- Milestone envelope: `mcp-server/data/milestones/SFC-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._