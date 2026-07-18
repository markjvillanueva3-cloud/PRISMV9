# BLUEPRINT-VISION-OCR/U-XRAY-GDT-STRUCTURED-PROMPT — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-STRUCTURED-PROMPT (slot:xray): P1.4 -- GD&T-aware structured prompting (ASME Y14.5 FCF grammar) in both the .mjs + .ts OCR prompts

**Commit:** `21cb2618fa71` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:09:27-05:00
**Tags:** blueprint-vision-ocr, u-xray-gdt-structured-prompt, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-STRUCTURED-PROMPT (slot:xray): P1.4 -- GD&T-aware structured prompting (ASME Y14.5 FCF grammar) in both the .mjs + .ts OCR prompts

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-STRUCTURED-PROMPT (slot:xray): P1.4 -- GD&T-aware structured prompting (ASME Y14.5 FCF grammar) in both the .mjs + .ts OCR prompts

Backlog P1.4 (GD&T-aware structured prompting). The prompt gave the VLM only a thin "identify the
geometric characteristic symbol and ALL datum references" instruction -> misread frame structure (wrong
datum order, missed material modifiers, form-tolerance datum confusion). Replaced with the structured ASME
Y14.5 FCF grammar so the VLM reads frames in the fixed left-to-right order:
  [1] geometric characteristic symbol -> "symbol" (one of the 14 listed names)
  [2] tolerance zone (a LEADING DIAMETER SYMBOL = cylindrical zone) + tolerance value
  [3] OPTIONAL material modifier (circled M = MMC, circled L = LMC, none = RFS)
  [4] datum references primary|secondary|tertiary as ["A","B","C"] IN THAT ORDER
plus the form-vs-location rule: FORM tolerances (flatness/straightness/circularity/cylindricity) take NO
datum; LOCATION/ORIENTATION/RUNOUT require >=1 datum (and never invent one -- R12). This feeds the now-wired
FCFSyntaxValidatorEngine (datum-deficiency flagging) cleaner, better-structured frames.

Build-everywhere: the SAME guidance is in both buildVisionPrompt (scripts/lib/ollama-vision-extract-lib.mjs,
the script/training path) and BlueprintVisionOCREngine's prompt (the production MCP path). Pure-ASCII
(modifiers described in words, not the circled glyphs).

96 tests (+P1.4 FCF-grammar structural test: asserts the left-to-right order, MMC/LMC/RFS, datum order, the
form-no-datum rule, and the no-invent-datum guard are all present). tsc --noEmit clean. HONEST (R12): this
is a reasoned prompt enhancement (correct ASME Y14.5 grammar, removes nothing) validated STRUCTURALLY by the
prompt tests; the quantitative GD&T-recall A/B (old vs new prompt) needs a GPU run and is pending.
```

## Files touched (4)
- mcp-server/src/engines/BlueprintVisionOCREngine.ts |  3 ++-
- scripts/lib/ollama-vision-extract-lib.mjs          |  3 ++-
- scripts/lib/ollama-vision-extract-lib.test.mjs     | 11 +++++++++++
- 3 files changed, 15 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 21cb2618fa71`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._