---
name: reference_echo_stub_wired_dark_engines
description: The 8 stub-wired + ~14 AGI-tier dark post-processor engines — the canonical wire-it-now leverage list (slot echo)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.098Z
aliases: reference_echo_stub_wired_dark_engines
---


Post-processor's highest-leverage backlog = engines with code but no live dispatcher surface.

**8 stub-wired** (single `engine.method?.()` case with `"method not callable"` fallback — `camDispatcher.ts` L19871–20022):
- `WEDMPostMitsubishiEngine` (12K) · `WEDMPostSodickEngine` (10K) · `WEDMPostMakinoEngine` (10K) · `WEDMPostAgieEngine` (10K) · `WEDMPostFanucEngine` (10K) — wire-EDM dialects (highest blast radius: JM wire-EDM revenue path)
- `LathePostProcessorAIEngine` (73K, largest dark — only `getPostProfile` wired)
- `LathePostGeneratorActiveLearningEngine` (18K — only `queueFailure`)
- `JMDiePostProcessorLearningEngine` (21K — only `learn`)

**~14 AGI-tier fully dark** (0 dispatcher case = MS-MASTERPOST ghost-roost anchor): `MasterPostProcessor{AGIOrchestration,Genius,UnifiedAGI}Engine` · `PostProcessorTransformerEngine` · `PostProcessorAGIContinuousLearningEngine` (+registry/wiring) · `CrossCAMPostEngine` · `NovelPostProcessorBridgeEngine` · `HybridPostMergeEngine` · `FusionPostSyncEngine` · `MachineFingerprintEngine` · `PostProcessorTrainerEngine`.

Re-measure: `grep -A1 "method not callable" mcp-server/src/tools/dispatchers/camDispatcher.ts`. See [[feedback_echo_stub_wired_is_dark]].
