# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-PAGE-CLASSIFIER — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-PAGE-CLASSIFIER (slot:xray): drawing-vs-paperwork page gate + OCR->CAD handoff contract

**Commit:** `511e9cb95179` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T11:57:12-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-page-classifier, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-PAGE-CLASSIFIER (slot:xray): drawing-vs-paperwork page gate + OCR->CAD handoff contract

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-PAGE-CLASSIFIER (slot:xray): drawing-vs-paperwork page gate + OCR->CAD handoff contract

Closes the OCR closed-loop's actionable finding (iter5): the overnight corpus gap
is INPUT QUALITY, not model capability — only ~24% of OCR-reachable pages were
drawings (193/253 were paperwork: cover sheets, notes, BOM tables) yet the full
~50-150s/page extraction ran on ALL of them. This adds a CHEAP per-page VLM yes/no
gate (qwen3-vl:8b-instruct, num_predict 96, ~2-4s warm) to skip non-drawing pages
BEFORE the expensive extract — deeper than file-level looksLikeBlueprint (which
can't catch paperwork PAGES inside a multi-page bundle that passed the filename
filter).

- scripts/lib/page-classifier-lib.mjs (pure core, 29 tests): buildPageClassifierPrompt
  + buildClassifierRequestBody (small num_predict, think:false) + parsePageClassifierResponse
  (robust JSON/fenced/prose-fallback) + decidePageVerdict. LOAD-BEARING SAFETY BIAS:
  a false-SKIP loses a real drawing; a false-EXTRACT only wastes one GPU pass. So a
  SKIP requires ALL of: is_drawing===false AND a STRICTLY-POSITIVE floor AND conf>=floor
  AND source!=="prose". Single-sources DEFAULT_VISION_MODEL from the vision lib.
- scripts/page-classify.mjs (live actuator, 7 pure-report tests): curl @reqfile to
  /api/generate (mirrors ocr-closed-loop.mjs); EVERY failure path falls through to
  verdict:extract (field-verified live — a real curl exit=56 under cold-load stall
  correctly extracted, never skipped). buildClassificationReport is pure.
- state/shared/specs/U-CADTP-ROUNDTRIP-B-ocr-handoff-schema.md: the durable OCR->CAD
  handoff contract for delta's print->CAD round-trip B (dimensioned/GD&T part-spec,
  canonical-mm, spec-diff not geom-diff). Persists the bus post beyond AGENT_CHAT.

Per-file 2-of-2 scrutiny PASS/PASS on both file pairs (1 P1 fixed pre-commit: the
floor-0 data-loss degenerate + prose-source skip-block, regression-pinned). 36/36
tests green. Positive live classification env-blocked (Ollama cold-load stall under
host memory pressure) — deferred; failure path proven. P2 follow-up (iter6): --pdf
mode driving pdf-to-png.py to gate the real corpus inline.
```

## Files touched (6)
- scripts/lib/page-classifier-lib.mjs                          | 270 +++++++++++++++++++++++++++++++++
- scripts/lib/page-classifier-lib.test.mjs                     | 241 +++++++++++++++++++++++++++++
- scripts/page-classify.mjs                                    | 172 +++++++++++++++++++++
- scripts/page-classify.test.mjs                               |  94 ++++++++++++
- state/shared/specs/U-CADTP-ROUNDTRIP-B-ocr-handoff-schema.md | 165 ++++++++++++++++++++
- 5 files changed, 942 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 511e9cb95179`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._