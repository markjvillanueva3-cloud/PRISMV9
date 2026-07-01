# BLUEPRINT-VISION-OCR/U-XRAY-PERPRINT-UNITS — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERPRINT-UNITS (slot:xray): per-print unit propagation -- anchor the title-block unit, force it across pages 2+ (principled supersede of the global --force-units band-aid)

**Commit:** `463b1d8fa1cd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T14:48:11-05:00
**Tags:** blueprint-vision-ocr, u-xray-perprint-units, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERPRINT-UNITS (slot:xray): per-print unit propagation -- anchor the title-block unit, force it across pages 2+ (principled supersede of the global --force-units band-aid)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERPRINT-UNITS (slot:xray): per-print unit propagation -- anchor the title-block unit, force it across pages 2+ (principled supersede of the global --force-units band-aid)

PROBLEM: multi-page JM drawing PDFs lose the title block on pages 2+, so the VLM
GUESSES units there and emits wrong-scale weak labels (a .94in dim read as 0.94mm).
The prior fix forced a GLOBAL --force-units in (correct for the inch-dominant JM
corpus, WRONG for a rare metric print -- every page forced to inch).

FIX (auto mode, when --force-units is NOT set): detect the print's unit from the
FIRST OCR'd page that declares a confident title block (usually page 1) and force it
on every later page of the SAME print via the EXISTING authoritative forceUnits
channel in extractDimension -- inch AND metric, one OCR pass, zero re-OCR. No change
to extractDimension's precedence (surgical, R8). An explicit --force-units stays
authoritative (the cron path is byte-equivalent); PRISM_OCR_PER_PRINT_UNIT_DISABLE=1
reverts to pure per-page.

Two pure helpers in the canonical unit lib (scripts/lib/ollama-vision-extract-lib.mjs):
  - resolvePageTitleBlockUnit(per_model_runs) -> "in"|"mm"|null : consensus title-block
    unit across the ensemble's per-model extractions. Majority wins; a tie/conflict
    returns null (never anchor a print on a disagreed guess); null/"mixed" abstain.
    CORROBORATION GATE (scrutiny P2 closed): a vote counts only when the title_block
    ALSO carries an identity field (part_number/drawing_number/title) -- a dimension-
    only continuation page where the VLM hallucinated a bare `units` can NOT anchor the
    whole print. This is what makes the anchor safe for the METRIC case.
  - pageForceUnit(explicitForce, printAnchor) -> "in"|"mm"|null : explicit operator
    --force-units wins, else the propagated per-print anchor.

WIRED (apply-to-all, R15) into the two multi-page per-page OCR loops:
  - scripts/blueprint-ocr-training-loop.mjs (the closed-loop training corpus that feeds
    india's LoRA -- the operator-prioritized surface). Forward-only; late-anchor logged
    (R12) so the rare title-block-on-a-later-page case is measurable, not silent.
  - scripts/validate-perfect-parts.mjs (recall-validation, non-tiling branch) -- clone,
    not fork. Tiling branch noted as scoped follow-up.

TESTS: +25 real reference-value cases (ollama-vision-extract-lib.test.mjs): majority/
tie/abstain, alias coverage, both fallback fields, corroboration gate, and the metric-
print "page-1 bare 'in' must not force inch" invariant. Full suite 121/121 (was 95).
node --check clean on all 3 edited scripts; vision-ensemble-fuse 32/32. Per-file 2-arm
scrutiny PASS/PASS (reviewer + code-analyzer); the closed P2 was the corroboration gate.
```

## Files touched (5)
- scripts/blueprint-ocr-training-loop.mjs        |  22 +++++++++++++-
- scripts/lib/ollama-vision-extract-lib.mjs      |  69 +++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-vision-extract-lib.test.mjs | 108 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/validate-perfect-parts.mjs             |  12 +++++++-
- 4 files changed, 209 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong-scale weak labels (a .94in dim read as 0.94mm).
- WRONG for a rare metric print -- every page forced to inch).
- tiling branch) -- clone,
- Tiling branch noted as scoped follow-up.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 463b1d8fa1cd`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._