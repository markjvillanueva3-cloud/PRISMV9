---
title: PRISM pipeline — knowledge injection (closed-loop knowledge → node)
slug: knowledge-injection
kind: pipeline
status: shipped
date: 2026-05-17
milestone: KNOWLEDGE-CONVERSION-MS0
unit: U-KIP01 + U-KIP02
author: claude-41db1b82 (slot india, /forge7)
stages: [extract, route, plan, inject, bind, record, consume, feedback]
composes: [course-data-router-lib, KnowledgeInjectionPipelineEngine, prismSelfAwarenessEngine]
---

# Knowledge Injection Pipeline (KIP)

The closed loop that turns *extracted knowledge* into *knowledge a PRISM node
can actually find and use* — and then measures whether it helped.

## The loop

```
 ┌─ extract ──────────────────────────────────────────────────────┐
 │  course / PDF / video / v8.89 monolith                          │
 │      → course-content-candidates.jsonl                          │
 └────────────────────────────────────────────────────────────────┘
                              ↓
 ┌─ route (course-data-router-lib) ───────────────────────────────┐
 │  classify each asset → 6 node-types × 3 lanes                   │
 │      → COURSE-DATA-ROUTING-LEDGER.json                          │
 └────────────────────────────────────────────────────────────────┘
                              ↓
 ┌─ plan (KnowledgeInjectionPipelineEngine.plan — PURE) ──────────┐
 │  per asset → InjectionPlan: lane→target, stable injectionId,    │
 │  3 consumer-bindings, verification channel                      │
 └────────────────────────────────────────────────────────────────┘
                              ↓
 ┌─ inject + bind (executeInjection) ─────────────────────────────┐
 │  write the knowledge to THREE consumer surfaces:                │
 │   • PRISM OS      knowledge/wiki/os/knowledge/kip-<slug>.md      │
 │   • Obsidian      knowledge/memories/reference/reference_kip_*.md│
 │   • PRISM AI      state/shared/knowledge-injection-ai-registry.json
 │  → recordInjection appends to knowledge-injection-ledger.jsonl   │
 └────────────────────────────────────────────────────────────────┘
                              ↓
 ┌─ consume ──────────────────────────────────────────────────────┐
 │  a node finds the knowledge (via wiki/os, the memory vault, or  │
 │  prismSelfAwarenessEngine.recommendAIFeatures reading the AI     │
 │  registry) and uses it                                          │
 └────────────────────────────────────────────────────────────────┘
                              ↓
 ┌─ feedback (recordOutcome → computeFeedback) ───────────────────┐
 │  the consuming node reports {helped, evidence};                 │
 │  computeFeedback joins injection↔outcome → consumeRate,         │
 │  helpRate, byLane, orphanInjections punch-list                  │
 └───────────────────────────────┬────────────────────────────────┘
                                 │  orphans + low help-rate feed
                                 ↓  the next routing pass
                          (loop closes)
```

## Why it exists

Before KIP the loop was **open**: extraction + routing existed, Lane A
auto-injected tribal tips into `cad-engine/knowledge_store/`, but Lane C
(algorithms/engines) had no automatic injection, no consumer-binding, and no
outcome feedback. Extracted knowledge that wasn't a simple tip just sat in a
ledger. KIP adds the inject / bind / feedback layers and makes "did this
knowledge get used, and did it help?" a measurable number.

## The three consumer-binding surfaces

A node can only *use* injected knowledge if it can *find* it. KIP registers
every injection to all three PRISM knowledge systems:

| System | Surface | A consuming node finds it via |
|--------|---------|-------------------------------|
| **PRISM OS** | `knowledge/wiki/os/knowledge/kip-<slug>.md` | the wiki/os namespace + recall hooks |
| **Obsidian brain** | `knowledge/memories/reference/reference_kip_*.md` | `memory-relevance-inject` hook + MEMORY.md |
| **PRISM AI** | `state/shared/knowledge-injection-ai-registry.json` | `prismSelfAwarenessEngine.recommendAIFeatures` |

## Surfaces

| Surface | Path |
|---------|------|
| Engine | `mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts` |
| Tests | `mcp-server/src/engines/KnowledgeInjectionPipelineEngine.test.ts` (28) |
| CLI | `mcp-server/scripts/knowledge-injection-pipeline.ts` |
| Injection ledger | `state/shared/knowledge-injection-ledger.jsonl` |
| Outcome ledger | `state/shared/knowledge-injection-outcomes.jsonl` |
| AI registry | `state/shared/knowledge-injection-ai-registry.json` |

## Operating the pipeline

```bash
# dry-run report — what would be injected (no writes)
npx tsx mcp-server/scripts/knowledge-injection-pipeline.ts

# apply — write consumer-bindings, operator-gated + capped (default 20)
npx tsx mcp-server/scripts/knowledge-injection-pipeline.ts --apply --limit 20

# closed-loop metric — did injected knowledge get consumed / help?
npx tsx mcp-server/scripts/knowledge-injection-pipeline.ts --feedback
```

`--apply` is **operator-gated and capped** by design: injecting all ~110
eligible assets writes ~330 binding records, which should be a deliberate
batched decision. First live dry-run: 126 routed assets · 110 eligible
(69 Lane C · 31 Lane A · 10 Lane B) · 16 ineligible.

## Doctrine pins

- **`plan()` and `computeFeedback()` are pure** — hermetically testable; all
  IO takes an injectable `PipelineRoots` (RGS-TOOL-MS1 lesson: pure core +
  injected readers MUST ship one real-data E2E test — KIP's test suite does).
- **Idempotent** — re-running an injection skips already-written `create`
  bindings and dedups `append` bindings on `injectionId`. Safe to re-run.
- **Stable content-hash injectionId** — `kip-<sha256(courseId::kind::name)>`.
  The same asset always gets the same id; ledgers dedup on it.
- **The outcome ledger is the whole point** — a pipeline that injects but
  never measures consumption is open-loop. `orphanInjections` (injected but
  never consumed) is the dead-knowledge punch list.
- **Closure-class knowledge is operator-gated** — Lane C assets that need
  real implementation (algorithms/engines) are *registered* by KIP but built
  via `/forge-triple`; KIP records the injection, the forge ships the node,
  the node calls `recordOutcome`.

## Related

- [[loop]] (pipeline) — the autonomous-iteration sibling
- [[knowledge-conversion-ms0]] — parent milestone
- [[course-forge-conversions]] — the 7 nodes that are the first Lane-C consumers
- `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json` — the routing input
- `mcp-server/src/engines/CAMTribalKnowledgeInjectionEngine.ts` — the CAM-specific
  sibling (KIP is the general orchestrator; that one is CAM-tribal-only)
