# CAD-LEARNING-AI/U-CAD-TEXT-TRIBAL-INJECT — [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-TEXT-TRIBAL-INJECT (slot:india): inject the CAD-draw tribal corpus into the text->CAD Ollama prompt

**Commit:** `6732f5387ea2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:51:29-05:00
**Tags:** cad-learning-ai, u-cad-text-tribal-inject, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-TEXT-TRIBAL-INJECT (slot:india): inject the CAD-draw tribal corpus into the text->CAD Ollama prompt

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-TEXT-TRIBAL-INJECT (slot:india): inject the CAD-draw tribal corpus into the text->CAD Ollama prompt

Goal directive: "replicate the tribal-injection pattern to the text->CAD Ollama loop."
cad-text-to-cadquery.mjs buildPrompt carried the engine codegen prompt + feature-template
names + hard-coded JM doctrine, but NOT the delta CAD-draw tribal corpus -- so local-LLM
generations were doctrine-aware but not tribal-aware. New fail-soft loadTribalTips(request)
mirrors loadEnginePrompt's dist-load (pathToFileURL on Windows) and ranks the SAME
CAD_DRAW_TRIBAL_TIPS via cadTribalDrawInjectionEngine.recommend that U-CAD-LEARN-TRIBAL-INJECT
wired into cad_learning_*; buildPrompt gains a pure tribalTips param rendering a SHOP TRIBAL
KNOWLEDGE section before the REQUEST. tribalTipCount surfaced in request.json + summary.

WIRE: loadTribalTips -> buildPrompt(4th param) -> main(); reuses the proven corpus+engine.
TEST: +4 (13/13) -- section rendered+ordered before REQUEST, empty/3-arg backward compat,
non-string/blank filter + cap 5, loadTribalTips ranks via injected engine (DrawContext asserted),
fail-soft [] on import-throw / missing-recommend / non-array-corpus (no disk).
VALIDATE: live dist corpus -> 5 real tips (topology-before-tolerance, periodic-B-spline ban,
INCH convention, archetype-match-before-scale, sinker spark gap) -- the exact rules that counter
the known CAD-gen failure modes; prompt SHOP TRIBAL KNOWLEDGE section confirmed (2429 chars).
```

## Files touched (3)
- scripts/cad-text-to-cadquery.mjs      | 49 +++++++++++++++++++++++++++++++++++++++++++++----
- scripts/cad-text-to-cadquery.test.mjs | 66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 111 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6732f5387ea2`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._