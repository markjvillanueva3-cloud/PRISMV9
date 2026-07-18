---
name: reference_post_ship_blackwell-model-upgrade-u-bw-ts-engines-retire
description: Auto-distilled learnings from shipping BLACKWELL-MODEL-UPGRADE/U-BW-TS-ENGINES-RETIRE (commit 619ef1634). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.764Z
aliases: reference_post_ship_blackwell-model-upgrade-u-bw-ts-engines-retire
---


# BLACKWELL-MODEL-UPGRADE/U-BW-TS-ENGINES-RETIRE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-TS-ENGINES-RETIRE (slot:alpha): 11 .ts engine DEFAULT/env-fallback models pointed at DELETED qwen2.5-coder:7b -> re-pointed to kept qwen2.5-coder:32b floor (live regression the retirement created — silent dead-model on every call). Files: ConnectionFinder, ErrorExplainer, IdeaBlockExtractor, IncrementalLearning, LocalHookAggregator, LocalCommitMessage, LocalAwarenessRouter, LocalValidation, OllamaCAMIntegration, WeeklySynthesis, WikiIngestRouter. Type-trivial string swaps. AISystemRouterEngine ollama-codellama/deepseek backend-enum is PRE-EXISTING (never-installed, not this retirement) -> separate refactor in U1b.

**Shipped:** 2026-06-04T13:25:49-05:00 by markjvillanueva3-cloud
**Files:** 12 touched

Full distillation: [[blackwell-model-upgrade-u-bw-ts-engines-retire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._