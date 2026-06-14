---
name: reference_india_alpha_scaffold_corrections_2026_05_28
description: alpha's india-pending scaffold had ~6 hallucinated paths — the verified replacements
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.151Z
aliases: reference_india_alpha_scaffold_corrections_2026_05_28
---


Alpha's india-pending ai-training CLAUDE.md/MEMORY.md asserted paths that DON'T exist (Glob-verified 2026-05-28): `engines/blueprint-rag/`, `engines/cad-corpus/`, `engines/tribal-knowledge/`, `engines/mit-curriculum/`, `engines/pdf-corpus/` (no such subdirs); `EvolutionaryRewardEngine`, `OutcomeFeedbackBusEngine`, `SkillUsageEngine` (no such files); brief seed-root `extracted/mit-ocw/` (doesn't exist — `extracted/` is machines+materials DBs).

Verified replacements: `BlueprintExtractionRAGEngine`, `TribalRAGEngine`, `CADCorpusIngesterEngine`, `MITCourseRegistryEngine` (+ DeepLearning/Integration/Expansion/FullIntegration/Knowledge), `PDFProcessingPipelineEngine`, `OutcomeCaptureBusEngine`, `AdaptiveThresholdEngine`, `MetaLearningOptimizerEngine`, `CrossProcessNeuralLearningEngine`.

**Lesson:** Glob-verify before documenting a path (R8). MIT corpus is reached via `MITCourseRegistryEngine`, not a fixed dir. Bravo flagged the same alpha-hallucination class in hermes-zulu.
