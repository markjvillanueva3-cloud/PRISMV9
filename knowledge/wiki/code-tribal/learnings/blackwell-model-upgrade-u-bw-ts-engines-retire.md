# BLACKWELL-MODEL-UPGRADE/U-BW-TS-ENGINES-RETIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE (slot:alpha): 11 .ts engine DEFAULT/env-fallback models pointed at DELETED qwen2.5-coder:7b -> re-pointed to kept qwen2.5-coder:32b floor (live regression the retirement created — silent dead-model on every call). Files: ConnectionFinder, ErrorExplainer, IdeaBlockExtractor, IncrementalLearning, LocalHookAggregator, LocalCommitMessage, LocalAwarenessRouter, LocalValidation, OllamaCAMIntegration, WeeklySynthesis, WikiIngestRouter. Type-trivial string swaps. AISystemRouterEngine ollama-codellama/deepseek backend-enum is PRE-EXISTING (never-installed, not this retirement) -> separate refactor in U1b.

**Commit:** `619ef16347c9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:25:49-05:00
**Tags:** blackwell-model-upgrade, u-bw-ts-engines-retire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE (slot:alpha): 11 .ts engine DEFAULT/env-fallback models pointed at DELETED qwen2.5-coder:7b -> re-pointed to kept qwen2.5-coder:32b floor (live regression the retirement created — silent dead-model on every call). Files: ConnectionFinder, ErrorExplainer, IdeaBlockExtractor, IncrementalLearning, LocalHookAggregator, LocalCommitMessage, LocalAwarenessRouter, LocalValidation, OllamaCAMIntegration, WeeklySynthesis, WikiIngestRouter. Type-trivial string swaps. AISystemRouterEngine ollama-codellama/deepseek backend-enum is PRE-EXISTING (never-installed, not this retirement) -> separate refactor in U1b.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE (slot:alpha): 11 .ts engine DEFAULT/env-fallback models pointed at DELETED qwen2.5-coder:7b -> re-pointed to kept qwen2.5-coder:32b floor (live regression the retirement created — silent dead-model on every call). Files: ConnectionFinder, ErrorExplainer, IdeaBlockExtractor, IncrementalLearning, LocalHookAggregator, LocalCommitMessage, LocalAwarenessRouter, LocalValidation, OllamaCAMIntegration, WeeklySynthesis, WikiIngestRouter. Type-trivial string swaps. AISystemRouterEngine ollama-codellama/deepseek backend-enum is PRE-EXISTING (never-installed, not this retirement) -> separate refactor in U1b.
```

## Files touched (12)
- mcp-server/src/engines/ConnectionFinderEngine.ts     |    6 +-
- mcp-server/src/engines/ErrorExplainerEngine.ts       |    4 +-
- mcp-server/src/engines/IdeaBlockExtractorEngine.ts   |  476 +++++++++++++++
- mcp-server/src/engines/IncrementalLearningEngine.ts  |    2 +-
- mcp-server/src/engines/LocalAwarenessRouterEngine.ts |    2 +-
- mcp-server/src/engines/LocalCommitMessageEngine.ts   |    2 +-
- mcp-server/src/engines/LocalHookAggregatorEngine.ts  |    2 +-
- mcp-server/src/engines/LocalValidationEngine.ts      |    2 +-
- mcp-server/src/engines/OllamaCAMIntegrationEngine.ts |    4 +-
- mcp-server/src/engines/WeeklySynthesisEngine.ts      | 1278 ++++++++++++++++++++--------------------
_(+2 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 619ef16347c9`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._