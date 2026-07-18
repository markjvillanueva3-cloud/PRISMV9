# CAD-DRAWING-PIPELINE-MS0/U-CADDRAW-ROUTE-CLASS — [MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-ROUTE-CLASS (slot:delta): Ollama-draws / Claude-failsafe routing for generative CAD (stage S5 routing overlay)

**Commit:** `cfbce9539472` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:30:06-05:00
**Tags:** cad-drawing-pipeline-ms0, u-caddraw-route-class, auto-distilled

## Subject
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-ROUTE-CLASS (slot:delta): Ollama-draws / Claude-failsafe routing for generative CAD (stage S5 routing overlay)

## Body
```
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-ROUTE-CLASS (slot:delta): Ollama-draws / Claude-failsafe routing for generative CAD (stage S5 routing overlay)

WHY: the operator vision -- local LLMs draw CAD via the PRISM AI system (cheap/free), Claude is the failsafe/last line of defense. AISystemRouterEngine had NO CAD task class, so "draw a bracket" fell to "unknown" -> defaulted to Sonnet (no Ollama-first chain). This wires the routing overlay of CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md.

WHAT:
- Added a "cad_drawing" TaskClass to AISystemRouterEngine. classify() recognizes generative-CAD verbs (draw/sketch/extrude/revolve/loft, cad-gen/model/author/emit, print-to-cad, text-to-cad) and is ordered BEFORE ml_inference/reasoning ("design"/"model") and blueprint_extraction (which EXTRACTS a print -- requires read/extract), so "draw a bracket" / "generate the CAD model" win while "extract from the drawing" / "build a cad engine" / "review the cad engine" keep their existing routes.
- route() cad_drawing case: primary local-mcp (Ollama via prism_cad: cadquery_generate_script / f360_from_description / cad_from_text -- cheap/free), fallback [claude-sonnet, claude-opus] (the failsafe). Sonnet-first aligns with [[feedback_ollama_fallback_sonnet_agents]]. estimatedCost free.
- Reachable via the EXISTING ai_route_task / ai_classify_task actions (intelligenceDispatcher) -- no new wiring (engine already wired).
- TESTED: +4 cases (draw->cad_drawing local-mcp/free/failsafe; 7 generative-verb variants; no-hijack of extraction/dev/review; dispatch round-trip via aiSystemRouterDispatch) + updated getStats 12->13. 33/33 pass, tsc clean for changed files. No collision with the 29 existing route tests.

5/7 pipeline units shipped. Next: U-CADDRAW-PRINT-REGEN-VALIDATE (biggest net-new) + U-CADDRAW-STEPPED-BORE-FEATURE. Loop iter7.
```

## Files touched (3)
- mcp-server/src/__tests__/AISystemRouterEngine.test.ts | 45 ++++++++++++++++++++++++++++++++++++++---
- mcp-server/src/engines/AISystemRouterEngine.ts        | 18 ++++++++++++++++-
- 2 files changed, 59 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cfbce9539472`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAWING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._