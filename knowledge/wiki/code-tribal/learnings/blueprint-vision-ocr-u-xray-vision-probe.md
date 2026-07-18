# BLUEPRINT-VISION-OCR/U-XRAY-VISION-PROBE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-VISION-PROBE (slot:xray): vision-model probe CLI + EMPIRICAL close of the qwen3-vl:32b ladder work-order

**Commit:** `ed8dcf451b4c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:25:03-05:00
**Tags:** blueprint-vision-ocr, u-xray-vision-probe, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-VISION-PROBE (slot:xray): vision-model probe CLI + EMPIRICAL close of the qwen3-vl:32b ladder work-order

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-VISION-PROBE (slot:xray): vision-model probe CLI + EMPIRICAL close of the qwen3-vl:32b ladder work-order

The zulu ladder work-order asked: is bare qwen3-vl:32b JSON-safe (worth adding to
the OCR ensemble), or a thinking-trap? The bench (bench-vision-ocr-ab) could NOT
answer it -- isThinkingTrap() filters bare qwen3-vl:* out PRE-RUN (assumes trap),
so the candidate never ran (bench verdict: "only the baseline ran"). Gap: no tool
could empirically test a suspected-trap model.

SHIPPED scripts/probe-vision-model.mjs -- runs ANY vision model directly on a real
print (bypassing the pre-filter) + reports thinking-trap? / dims-extracted. Reuses
buildVisionPrompt/buildOllamaRequestBody/parseVisionResponse + the page-classify
curl@reqfile transport (node fetch fails vs Ollama). Pure detectThinkingTrap()
helper + 3 tests (9 asserts incl adversarial 'the word think is not the tag').

EMPIRICAL RESULT (live, with ~74GB free VRAM so it co-resided with the grinder):
qwen3-vl:32b on D22706-10.pdf (KNOWN-READABLE -- 8b ensemble labels it) AND
D22706-12.pdf (hard scan) -> raw_len=0 / 0 dims in BOTH format:json and raw modes,
113-170s (5-8x the 8b's ~22s). => NOT a thinking-trap (no <think> leak) but
EMPIRICALLY UNUSABLE for OCR here (empty output + far too slow). VERDICT: do NOT
add bare qwen3-vl:32b to BIG_VISION_PREFERENCE. The isThinkingTrap exclusion was
accidentally correct. Recorded the evidence in vision-model-select.mjs so the
finding is not reopened. (List/test untouched -- the -instruct entries are dormant
phantom placeholders; the finding is about the real bare tag, not in the list.)

IMPLICATION: the 15.2% recall leak is scan-quality-dominated, NOT model-capacity
-- the fix is scan preprocessing (deskew/denoise/binarize) + the proven 8b, per
blueprint-reading-improvement-backlog-2026-06-19. vision-model-select 49/49,
probe 3/3.
```

## Files touched (4)
- scripts/lib/vision-model-select.mjs |  10 +++++
- scripts/probe-vision-model.mjs      | 126 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/probe-vision-model.test.mjs |  34 ++++++++++++++++
- 3 files changed, 170 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed8dcf451b4c`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._