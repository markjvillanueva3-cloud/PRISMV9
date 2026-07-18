# AI-SYSTEMS-CAD-LEARNING/U-DISPATCHER-REPO-ROOT-FIX — [MAIN-FORCE] [AI-SYSTEMS-CAD-LEARNING]/U-DISPATCHER-REPO-ROOT-FIX (slot:india): fix bundle-runtime repo-root resolution -- 7 dispatcher scripts/-loads were dead in production

**Commit:** `c741b6074dc6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T10:02:32-05:00
**Tags:** ai-systems-cad-learning, u-dispatcher-repo-root-fix, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-CAD-LEARNING]/U-DISPATCHER-REPO-ROOT-FIX (slot:india): fix bundle-runtime repo-root resolution -- 7 dispatcher scripts/-loads were dead in production

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-CAD-LEARNING]/U-DISPATCHER-REPO-ROOT-FIX (slot:india): fix bundle-runtime repo-root resolution -- 7 dispatcher scripts/-loads were dead in production

ROOT CAUSE (found live via the :3100 MCP bridge): dispatcher actions that load scripts/*.mjs did resolve(dirname(import.meta.url),'..','..','..') assuming the .../tools/dispatchers/ depth. But package.json start runs the esbuild code-split bundle dist/index.js (esbuild.config.mjs default=splitting), where bundled code has import.meta.url=.../mcp-server/dist/index.js (one level under mcp-server, not three). The fixed 3-level climb over-shot to the DRIVE ROOT (H:\scripts\lib\...) -> MODULE_NOT_FOUND for all 7 sites. blueprint_loop_drain surfaced it ('Cannot find module H:\scripts\lib\blueprint-loop-drain-lib.mjs'); the RAG tribal loader + recordOutcome + lora-pair sites failed SILENTLY behind try/catch fallbacks (silently degraded RAG tribal injection + outcome recording in prod). U-BPA-RAG-RECORDOUTCOME was wired in SOURCE but dead in the BUNDLE -- 'wired in source' != 'works in the bundle'.

FIX: new mcp-server/src/utils/resolve-repo-root.ts -- depth-independent resolveRepoRoot() that walks up to the nearest ancestor containing BOTH .git AND mcp-server/ (the unique repo-root marker; verified the live tree has mcp-server/mcp-server/ AND mcp-server/src/mcp-server/, so a bare 'mcp-server/' marker false-matches mid-tree -- .git disambiguates, absent from mcp-server/). Wired into all 7 sites (aiReasoningDispatcher x2: blueprint_loop_drain, lora-pairs; cadDispatcher x5: corpus-report x2, RAG tribal loader, recordOutcome, lora-pairs) via resolve(resolveRepoRoot(),'mcp-server') -- every downstream resolve unchanged.

VALIDATED: resolve-repo-root.test.ts 7/7 (bundle layout + tsx + tsc layouts + the nested-mcp-server false-match guard + fail-loud). Live proof: resolveRepoRoot('.../mcp-server/dist') -> H:/prism, drainPath -> H:\prism\scripts\lib\blueprint-loop-drain-lib.mjs (exists:true; was the broken H:\scripts\... before). build:fast clean. Activates on the next MCP-server restart (the running 2h-uptime process holds the old bundle); did NOT unilaterally restart the shared server.

NOTE (R12, not mine): full tsc --noEmit reports 2 PRE-EXISTING errors in src/engines/ReinforcementLearningCAMFeedbackEngine.ts (committed at HEAD, an unrelated CAM-RL file I never touched) -- TS2554 arg-count. My 4 files are type-clean.
```

## Files touched (5)
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts | 12 ++++----
- mcp-server/src/tools/dispatchers/cadDispatcher.ts         | 16 +++++------
- mcp-server/src/utils/resolve-repo-root.test.ts            | 79 +++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/utils/resolve-repo-root.ts                 | 54 +++++++++++++++++++++++++++++++++++
- 4 files changed, 148 insertions(+), 13 deletions(-)

## Lessons surfaced in commit body
- tils/resolve-repo-root.ts -- depth-independent resolveRepoRoot() that walks up to the nearest ancestor containing BOTH .git AND mcp-server/ (the unique repo-root marker; verified the live tree has mcp-server/mcp-server/ AND mcp-server/src/mcp-server/, so a bare 'mcp-server/' marker false-matches mid-tree -- .git disambiguates, absent from mcp-server/). Wired into all 7 sites (aiReasoningDispatcher x2

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c741b6074dc6`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-CAD-LEARNING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._