---
name: reference-knowledge-injection-pipeline-2026-05-17
description: KIP — closed-loop knowledge→node injection pipeline (KNOWLEDGE-CONVERSION-MS0). plan→inject→bind-3-systems→feedback. Engine + CLI + 28 tests + wiki/os doctrine. Built via /forge7.
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.495Z
aliases: reference_knowledge_injection_pipeline_2026_05_17
---


**Knowledge Injection Pipeline (KIP)** — shipped 2026-05-17 by slot india (claude-41db1b82), built via `/forge7`.
Commits `U-KIP01` (KnowledgeInjectionPipelineEngine + 28 tests) + `U-KIP02` (CLI + wiki/os doctrine).

**The gap it closed:** KNOWLEDGE-CONVERSION-MS0 had extraction + routing (course-data-router-lib classifies into 6 node-types / 3 lanes) and Lane A auto-injected tribal tips — but Lane C (algorithms/engines) had NO automatic injection, NO consumer-binding, NO outcome feedback. The loop was open.

**Three layers KIP adds:**
1. **plan** — pure `plan(asset)` → `InjectionPlan`: lane→target, stable `kip-<sha256(courseId::kind::name)>` injectionId, 3 consumer-bindings, verification channel.
2. **inject + bind** — `executeInjection` writes the knowledge to 3 consumer surfaces so a node can FIND it: PRISM OS (`knowledge/wiki/os/knowledge/kip-*.md`), Obsidian (`knowledge/memories/reference/reference_kip_*.md`), PRISM AI (`state/shared/knowledge-injection-ai-registry.json` — read by `prismSelfAwarenessEngine.recommendAIFeatures`). Idempotent: create-skip + append-dedup on injectionId.
3. **feedback** — `recordOutcome` lets a consuming node report `{helped, evidence}`; pure `computeFeedback` joins injection↔outcome ledgers → consumeRate / helpRate / byLane / `orphanInjections` (dead-knowledge punch list).

**Design:** pure-core (`plan`, `computeFeedback`) + IO-shell with injectable `PipelineRoots` (RGS-TOOL-MS1 lesson — ships a real-data E2E over the live 126-asset routing ledger). Tolerant JSONL reader skips corrupt lines (multi-chat append-race safe).

**Files:** `mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts` (+`.test.ts` 28 cases) · `mcp-server/scripts/knowledge-injection-pipeline.ts` (CLI: dry-run / `--apply --limit N` operator-gated / `--feedback`) · `knowledge/wiki/os/pipelines/knowledge-injection.md`. Live dry-run: 126 routed · 110 eligible (69 C / 31 A / 10 B) · 16 ineligible.

**NOT a dup of CAMTribalKnowledgeInjectionEngine** (CAM-tribal-specific; KIP is the general orchestrator). **WIRE-EXEMPT** — `prism_knowledge:inject` dispatcher action is the follow-up.

**Wiki:** [[knowledge-injection]] · **CLAUDE.md:** §KNOWLEDGE-CONVERSION-MS0. Sister: [[reference_course_forge_conversions_2026_05_17]], [[reference_knowledge_conversion_ms0_2026_05_17]].


## Related
[[engines/KnowledgeInjectionPipelineEngine|KnowledgeInjectionPipelineEngine]] • [[engines/CAMTribalKnowledgeInjectionEngine|CAMTribalKnowledgeInjectionEngine]] • [[dispatchers/prism_knowledge|prism_knowledge]] • [[skills/forge|/forge]] • [[skills/os|/os]] • [[skills/engines|/engines]] • [[skills/wiki|/wiki]] • [[skills/knowledge|/knowledge]] • [[skills/kip-|/kip-]] • [[skills/memories|/memories]]