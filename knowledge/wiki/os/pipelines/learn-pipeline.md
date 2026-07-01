---
title: PRISM pipeline — /learn-pipeline knowledge ingest chain
slug: learn-pipeline
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK20
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [source-classifier, /pdf-learn, /video-learn, /shop-knowledge, course-data-router, duplication-guard, tribal-store-append, wiki-write, memory-write, KnowledgeInjectionPipelineEngine]
stages: [detect, extract, dedup, tribal, wiki, memory, register]
consumes:
  - knowledge/memories/MEMORY.md
  - knowledge/wiki/index.md
  - DuplicationGuardEngine
  - KnowledgeInjectionPipelineEngine
produces:
  - tribal-tip-append
  - wiki-entry
  - memory-entry
  - kip-injection-record
  - close-out-debt-eliminated
downgrade:
  mode: user-prompt
  fallback_to: manual-step-by-step
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/learn-pipeline` — Knowledge Ingest Pipeline (U-CK20)

Composed front-end over the canonical PRISM knowledge ingest chain.
Threads source → tribal/wiki/memory/KIP-registry so the operator
types one entry instead of running 5 leaf surfaces in sequence.
R8: adds 0 logic.

Solves the **extracted-but-not-consumed** class — the
`feedback_ollama_docker_pipeline_dead_code_2026_05_16` lesson
(88% of Ollama hook surface unwired despite shipping milestone) +
the KNOWLEDGE-CONVERSION-MS0 7-unit close-out (3-lane A/B/C router
existed, KIP closed the consumer-binding loop). Without the
REGISTER stage (7), every prior extraction was silent close-out
debt waiting to happen.

## Stage table

| # | Stage | What | Stop-on-fail |
|---|-------|------|--------------|
| 1 | detect | classify src into pdf/video/shop-text/course/monolith/unknown | yes — unknown halts; run /research first |
| 2 | extract | dispatch to /pdf-learn / /video-learn / /shop-knowledge / course-data-router / monolith-to-* | yes — unparseable logs to failure ledger |
| 3 | dedup | duplicationGuardEngine.checkBeforeCreating() per candidate fact | yes — dup THROW honored |
| 4 | tribal | knowledge_store/<domain>.json append (lane A direct-wire); engine auto-loads | yes — write failure bails |
| 5 | wiki | knowledge/wiki/{concepts,entities,...}/<slug>.md for compounding-doc facts | yes — frontmatter FAIL must fix |
| 6 | memory | knowledge/memories/{reference,feedback}/<name>.md + MEMORY.md pointer | yes — 24KB ceiling triggers prune |
| 7 | register | KIP plan + executeInjection → PRISM OS + Obsidian + PRISM AI registry | yes — null plan means classify wrong |

## Rollback chain

| Failed stage | Rollback |
|--------------|----------|
| 1 detect | no-op (read-only) |
| 2 extract | clean partial files in `state/shared/extracted-partials/`; log failure |
| 3 dedup | no-op (read-only) |
| 4 tribal | revert knowledge_store/<domain>.json append (last N rows) |
| 5 wiki | git restore wiki entry |
| 6 memory | git restore memory + revert MEMORY.md pointer line |
| 7 register | KIP supports `revertInjection(injectionId)` — call it |

## Inputs

| Flag | Default | Purpose |
|------|---------|---------|
| `<src>` | (required) | file / dir / URL |
| `--domain <name>` | (auto) | force tribal domain |
| `--lane A|B|C` | (auto per classifier) | force KIP lane |
| `--dry-run` | false | KIP plan only |
| `--no-register` | false | stop after stage 6 |

## Composes-with

Composed BY:

- `/session-cycle` (U-CK17) BUILD when deliverable is source ingest
- `/loop` autonomous-iter learn sweeps (e.g. nightly PDF batch)
- `/pipeline execute learn-pipeline` (U-CK25)
- direct operator invocation when a new source lands

Composes:

- `/pdf-learn`, `/video-learn`, `/shop-knowledge` — extract leaves
- `scripts/course-data-router.mjs` — lane A/B/C (KNOWLEDGE-CONVERSION-MS0)
- `scripts/monolith-to-tribal-tips.mjs`, `monolith-to-formulas.mjs` — monolith leaves
- `DuplicationGuardEngine.checkBeforeCreating()` — DEDUP
- `KnowledgeInjectionPipelineEngine` — REGISTER closed loop

## Karpathy discipline pins

- **R8** — DETECT stage IS the classify-before-extract step
- **R10** — each stage emits explicit verdict (classified? extracted N facts? deduped to N'? injected?)
- **R12** — unparseable source logs to failure ledger; never silent-skip; dup THROW honored; null KIP plan halts
- **WIRE-UNWIRED-MS0** — REGISTER stage 7 IS the close-the-loop step that prevents silent ingestion debt
- **never delete only disable** — superseded facts are deprecated in their wiki frontmatter, not removed

## Knobs

- `PRISM_LEARN_PIPELINE_DRY_RUN=1`, `_NO_REGISTER=1`, `_FORCE_LANE=A|B|C`
- Scrutiny gate not fired (this skill writes docs, not code); wiki-lint hook is backstop

## Related

- [[session-cycle]] — fires learn-pipeline in BUILD for ingest units
- [[knowledge-injection]] — KIP closed loop (REGISTER stage)
- [[research]] — fallback classifier when DETECT can't classify (U-CK18)
- [[pipeline]] — meta-command (U-CK25)

## See also

- `.claude/commands/learn-pipeline.md` — operator skill spec (gitignored mirror)
- `feedback_ollama_docker_pipeline_dead_code_2026_05_16.md` — extracted-but-not-consumed lesson
- `reference_knowledge_conversion_ms0_2026_05_17.md` — KNOWLEDGE-CONVERSION-MS0 lessons (3-lane router)
- `mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts` — REGISTER stage engine
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK20 — envelope
