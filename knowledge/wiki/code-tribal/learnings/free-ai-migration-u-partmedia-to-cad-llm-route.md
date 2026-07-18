# FREE-AI-MIGRATION/U-PARTMEDIA-TO-CAD-LLM-ROUTE — [MAIN-FORCE] [FREE-AI-MIGRATION]/U-PARTMEDIA-TO-CAD-LLM-ROUTE (slot:india): route PartMediaToCAD per-frame vision through free Ollama-first queryVision, drop Anthropic SDK + key gate, R12 honest degradation

**Commit:** `6023a84cc820` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T22:16:47-05:00
**Tags:** free-ai-migration, u-partmedia-to-cad-llm-route, auto-distilled

## Subject
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-PARTMEDIA-TO-CAD-LLM-ROUTE (slot:india): route PartMediaToCAD per-frame vision through free Ollama-first queryVision, drop Anthropic SDK + key gate, R12 honest degradation

## Body
```
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-PARTMEDIA-TO-CAD-LLM-ROUTE (slot:india): route PartMediaToCAD per-frame vision through free Ollama-first queryVision, drop Anthropic SDK + key gate, R12 honest degradation

- analyzeFrame: per-frame PAID Claude Vision (new Anthropic().messages.create) -> free llmEngine.queryVision (Ollama vision -> Claude backup -> offline); system=VISION_SYSTEM_PROMPT preserved; complexity:high; offline THROWS (caught per-frame -> warning, the engine's documented always-returns-degraded contract).
- Removed @anthropic-ai/sdk import + the generateFromMedia ANTHROPIC_API_KEY pre-call gate + new Anthropic() client + DEFAULT_MODEL. imageSourceToBlock -> imageSourceToVisionImage ({data,media_type}); URL sources now fetched in-engine -> base64 (Ollama cannot fetch remote URLs) with a bounded AbortSignal.timeout(15s) so a hung host degrades to a warning (2-arm scrutiny P2 fix).
- R12 honesty: meta.model reports the REAL provider (providerModel ?? "offline"), was the hardcoded claude id; new loud "NOT based on real part data" warning when zero frames succeed. Fixed the stale "Anthropic SDK / Claude Vision" header + JSDoc.
- New hermetic test part-media-to-cad-llm-route.test.ts (6): seam-removal+routing, base64, url-fetch-!ok-degrade, url-fetch-success->queryVision wiring (global.fetch stubbed), R12 zero-frame degradation, pre-existing no-images guard. 2-arm per-file scrutiny PASS (both); tsc 0 errors.
- Public generateFromMedia signature unchanged; sole consumer camDispatcher:cad_part_media_to_template wraps result opaquely. DEFERRED to kilo (cross-galaxy P2, pre-existing): that dispatcher returns success:true even when total_vision_calls===0 -- should downgrade/annotate success on a fully-degraded scaffold.
```

## Files touched (3)
- mcp-server/src/__tests__/part-media-to-cad-llm-route.test.ts | 124 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PartMediaToCADEngine.ts               | 112 +++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------------------------------------------
- 2 files changed, 182 insertions(+), 54 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6023a84cc820`
- Milestone envelope: `mcp-server/data/milestones/FREE-AI-MIGRATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._