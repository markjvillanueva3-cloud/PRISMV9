# FREE-AI-MIGRATION/U-VIDEO-LEARNING-LLM-ROUTE — [MAIN-FORCE] [FREE-AI-MIGRATION]/U-VIDEO-LEARNING-LLM-ROUTE (slot:india): route VideoLearning keyframe vision through free Ollama-first queryVision, drop Anthropic fetch + key gate, R12 warn-and-skip

**Commit:** `2c07c3e73563` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T22:31:31-05:00
**Tags:** free-ai-migration, u-video-learning-llm-route, auto-distilled

## Subject
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-VIDEO-LEARNING-LLM-ROUTE (slot:india): route VideoLearning keyframe vision through free Ollama-first queryVision, drop Anthropic fetch + key gate, R12 warn-and-skip

## Body
```
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-VIDEO-LEARNING-LLM-ROUTE (slot:india): route VideoLearning keyframe vision through free Ollama-first queryVision, drop Anthropic fetch + key gate, R12 warn-and-skip

- analyzeKeyframes: per-batch DIRECT paid Claude Vision (raw fetch api.anthropic.com/v1/messages, claude-haiku-4-5, N image blocks/call) -> free llmEngine.queryVision({prompt, images, complexity:high, max_tokens:2000}); multi-image batch preserved (all N frames -> images[]). Removed the ANTHROPIC_API_KEY warn-and-return-[] gate + the api.anthropic.com fetch. R12: res.model==='offline' -> log + skip the batch (this engine's documented best-effort warn-and-skip contract; never fabricates).
- meta cost honesty (R12): api_cost_estimate.vision was Math.ceil(frames/batch)*0.04 (paid Haiku) -> 0 (free Ollama-first substrate; over-reporting a $0 cost would mislead consumers).
- New hermetic test video-learning-llm-route.test.ts (5): routing+seam (spy on the dynamic-imported llmEngine singleton -> old no-key early-return is gone), multi-image batch (images.length===2), success-parse with real frame-timestamp mapping (stubbed answer), non-JSON-answer silent-skip, no-frames edge. 2-arm per-file scrutiny PASS (arm A caught the stale pre-existing test below -> reconciled).
- Reconciled pre-existing video-learning-engine.test.ts: deleted the 2 obsolete analyzeKeyframes fetch-mock tests (asserted the removed api.anthropic.com path -> green->red) -> pointer comment to the new file (coverage MOVED + strengthened, not dropped). 20/20 across both files; my 3 changed files tsc-clean.
- FLAG for delta (NOT this diff, R12): project tsc shows 1 pre-existing/concurrent-peer error InventorCADCodeGeneratorEngine.ts:139 (Set<string> vs ReadonlySet<CADActionKind>) -- CAD domain, absent from my earlier 0-error runs, not in my changeset.
```

## Files touched (4)
- mcp-server/src/__tests__/video-learning-engine.test.ts    |  50 +++--------------------
- mcp-server/src/__tests__/video-learning-llm-route.test.ts | 119 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/VideoLearningEngine.ts             |  65 +++++++++--------------------
- 3 files changed, 144 insertions(+), 90 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2c07c3e73563`
- Milestone envelope: `mcp-server/data/milestones/FREE-AI-MIGRATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._