# LAUNCH-FE/U-Q-POST-SAFETY-FENCE — [MAIN-FORCE] [LAUNCH-FE]/U-Q-POST-SAFETY-FENCE (slot:quebec): P0 SAFETY -- stop unvalidated post-processor G-code from masquerading as a machine-ready _PRISM_optimized.nc

**Commit:** `554bfb735f9d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T11:00:07-05:00
**Tags:** launch-fe, u-q-post-safety-fence, auto-distilled

## Subject
[MAIN-FORCE] [LAUNCH-FE]/U-Q-POST-SAFETY-FENCE (slot:quebec): P0 SAFETY -- stop unvalidated post-processor G-code from masquerading as a machine-ready _PRISM_optimized.nc

## Body
```
[MAIN-FORCE] [LAUNCH-FE]/U-Q-POST-SAFETY-FENCE (slot:quebec): P0 SAFETY -- stop unvalidated post-processor G-code from masquerading as a machine-ready _PRISM_optimized.nc

PostProcessorGeneratorPage builds a program three ways: /ppg/pipeline (the real
38-stage PostProcessorPipelineEngine, P1 physics + P5 alarm/safety gate -- the ONLY
machine-ready output), /ppg/template (controller template, NO safety gate), and an
offline buildLocalGeneratedOutput fallback (NO safety gate). Previously ALL THREE
downloaded/copied as `<name>_PRISM_optimized.nc` with no warning -- an operator could
run an un-validated template/fallback program on a machine trusting it was
physics-optimized + safety-gated. P0 hazard.

Fix -- a single safety fence over every program egress:
- new pure postExportSafety.ts: decorateExport(out, validated) prepends a loud
  PREVIEW-ONLY comment-only-G-code header when not validated (inert if pasted into a
  controller); exportFileSuffix(validated) -> _PRISM_optimized.nc only when validated,
  else _PREVIEW_unvalidated.nc. 11/11 tests incl fail-safe coercion (undefined/null
  validity -> stamped; the fence never fails OPEN).
- new REQUIRED field GeneratedOutput.pipelineValidated set at all 3 construction sites
  (compiler-enforced: pipeline=true, template=false, offline-fallback=false).
- fenced EVERY egress: handleDownload (.nc), handleCopyToClipboard, both Download-CPS
  branches (preview-fallback stamped + _PREVIEW_unvalidated.cps name; a genuine backend
  .cps config is left intact -- it is a post config, not the program), and
  PostPreviewComponent copy (delegates to the page fenced handler via onCopy) + its
  download (routes through the fenced handleDownload, was a discarded no-op).
- UI: honest subtitle + filename label + an amber "Preview only -- not machine-ready"
  banner when !pipelineValidated; all read-sites use === true / !== true (fail-safe on a
  hydrated/undefined flag). Verified the only setGenerated callers are the 3 typed sites.

A validated pipeline program is BYTE-IDENTICAL + still named _PRISM_optimized.nc (test-pinned).
tsc clean for all touched files (1 pre-existing calculatorData.ts error untouched, oscar
domain). Per-file 2-arm scrutiny PASS/PASS (round-2; arm A CPS-egress P0 + arm B
.cps-egress/hydration P1 both fixed). jsdom .tsx render tests un-runnable here (jsdom absent).
```

## Files touched (5)
- mcp-server/web/src/__tests__/postExportSafety.test.ts      | 91 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/ppg/PostPreviewComponent.tsx | 11 +++++--
- mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx    | 93 +++++++++++++++++++++++++++++++++++++++++-------------
- mcp-server/web/src/pages/postExportSafety.ts               | 58 ++++++++++++++++++++++++++++++++++
- 4 files changed, 229 insertions(+), 24 deletions(-)

## Lessons surfaced in commit body
- till named _PRISM_optimized.nc (test-pinned).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 554bfb735f9d`
- Milestone envelope: `mcp-server/data/milestones/LAUNCH-FE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._