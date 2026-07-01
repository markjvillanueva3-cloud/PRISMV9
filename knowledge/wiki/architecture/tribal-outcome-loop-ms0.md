---
title: Tribal-Outcome Loop (TRIBAL-OUTCOME-LOOP-MS0)
type: architecture
status: shipped
milestone: TRIBAL-OUTCOME-LOOP-MS0
authored_by: claude-ef40a9d1 (slot:foxtrot)
authored_at: 2026-05-27
aliases:
  - closed-loop-self-training
  - tribal-tip-effectiveness
  - tip-program-outcome-bridge
---

# Tribal-Outcome Loop — Closed-Loop Self-Training Infrastructure for Tribal Tips

**Why this exists.** PRISM has 3,919+ tribal tips (309 milling + 3,600+ cam/lathe/edm) and a working outcome-tracking infrastructure (OutcomeTrackingEngine writes `<data>/outcomes/outcomes.jsonl`). What was MISSING — and the gap this milestone closes — is the JOIN. When a milling-wizard generates a program using tribal tip X and the shop floor later logs an outcome (good/scrap/adjusted/aborted) for that program, no record connected tip-X to that outcome. We had data on both sides, no bridge, no learning signal.

This milestone ships the bridge. Closed-loop tribal-tip self-training is now possible.

## The 5-unit milestone

| Unit | Status | Ships |
|------|--------|-------|
| U-TTOB01 | ✅ shipped | `TribalTipOutcomeBridgeEngine` + 9/9 vitest |
| U-TTOB02 | ✅ shipped | `prism_mill` dispatcher actions: `mill_tribal_tip_record_application`, `mill_tribal_tip_effectiveness` |
| U-TTOB03 | ✅ shipped | `KnowledgeCurriculumBridgeEngine.lessonsForOperationRankedByEffectiveness()` — retrieval re-ranking by closed-loop score |
| U-TTOB04 | ✅ shipped | `KnowledgeCurriculumBridgeEngine.lessonsForOperationWithRecording()` — auto-instrumentation wrapper |
| U-TTOB05 | ✅ this entry | wiki doctrine |

## Pipeline

```
                ┌─────────────────────────────┐
                │  Tribal-tip corpus          │
                │  (mcp-server/src/data/      │
                │   tribal-tips/*.ts)         │
                └──────────────┬──────────────┘
                               │ retrieve
                               ▼
   ┌───────────────────────────────────────────────────┐
   │  KnowledgeCurriculumBridgeEngine                  │
   │  • lessonsForOperation(op)              [base]    │
   │  • lessonsForOperationRankedByEffectiveness(op)   │
   │  • lessonsForOperationWithRecording(op, progId)   │
   └─────────────┬──────────────────────────┬──────────┘
                 │ surface tips             │ record(tipId, progId)
                 ▼                          ▼
       ┌────────────────────┐    ┌──────────────────────────────┐
       │ Mill consumer      │    │ TribalTipOutcomeBridgeEngine │
       │ (MillStudio,       │    │  • recordApplication()       │
       │  MillingWizard,    │    │  • effectiveness()           │
       │  mill-agi, …)      │    └──────────────┬───────────────┘
       └─────────┬──────────┘                   │ join
                 │ generates                    │
                 ▼                              │
       ┌────────────────────┐                   │
       │ Program (NC code)  │                   │
       └─────────┬──────────┘                   │
                 │ runs on shop                 │
                 ▼                              │
       ┌────────────────────┐                   │
       │ OutcomeTracking    │◄──────────────────┘
       │ Engine.log()       │     bridge reads
       │ outcomes.jsonl     │     forProgram(progId)
       └────────────────────┘
                 │
                 │ feedback
                 ▼
            tip effectiveness scores → next retrieval re-ranks
```

## Scoring

| Outcome | Weight | Rationale |
|---------|-------:|-----------|
| good | +1.0 | tip helped produce a good run |
| adjusted | +0.5 | tip helped but operator tweaked params |
| aborted | −0.25 | aborted often = machine issue not tip quality |
| scrap | −1.0 | tip drove a bad final result (2× cost of aborted) |

Raw score = mean(weight) across joined outcomes. Laplace-smoothed score adds 1 prior good + 1 prior bad — protects single-bad-outcome tips from collapsing to −1.0. Confidence tier: low (<5 joined), medium (5-20), high (>20).

## Foxtrot-soul refuse_list compliance

The slot-soul refuse_list (`promoting-low-confidence-tribal-to-doctrine`, `dropping-source-attribution-on-ingest`, `softening-tribal-conflict-by-averaging`) is preserved:

- **Effectiveness score is ADVISORY for retrieval ranking only** — NOT a doctrine-promotion signal. Tips graduate draft → validated → doctrine via human review. The bridge does not auto-flip status fields.
- **Source attribution preserved end-to-end** — tipId is the join key. The bridge never synthesizes a "consensus tip" from outcome data.
- **Conflicts surfaced not averaged** — when two tips disagree (e.g. ball-nose "more RPM" vs "less FPT") and BOTH have positive effectiveness, retrieval surfaces BOTH ranked. No synthesis.

## Storage

- Applications: `<data>/tribal-outcomes/tip-program-applications.jsonl` (append-only)
- Outcomes: `<data>/outcomes/outcomes.jsonl` (existing OutcomeTrackingEngine)

## How to use

### Read path

```typescript
import { knowledgeCurriculumBridgeEngine } from "./engines/KnowledgeCurriculumBridgeEngine.js";

// Best-cited tips (original ordering, no outcome data needed)
const baseTips = knowledgeCurriculumBridgeEngine.lessonsForOperation("face_milling");

// Best-performing tips (re-ranked by closed-loop score where data exists)
const rankedTips = await knowledgeCurriculumBridgeEngine
  .lessonsForOperationRankedByEffectiveness("face_milling");
```

### Write path (auto-instrumented)

```typescript
// Consumer that knows the programId being generated:
const tips = await knowledgeCurriculumBridgeEngine.lessonsForOperationWithRecording(
  "face_milling",
  programId,
  "MillStudio",
);
// Tips are returned ranked AND each application is logged in background.
// Next time effectiveness() runs, this program's outcomes will join in.
```

### MCP dispatcher

```bash
# Record (manual instrumentation point for non-TS callers)
prism_mill:mill_tribal_tip_record_application
  { tipId: "MILL-TIP-PTS-BALLNOSE-ZERO-SPEED-AT-TIP",
    programId: "PROG-42",
    operation: "ball_end_milling" }

# Query effectiveness
prism_mill:mill_tribal_tip_effectiveness
  { tipId: "MILL-TIP-PTS-BALLNOSE-ZERO-SPEED-AT-TIP" }
```

## What's still NOT closed (honest gaps)

1. **Bucket-parity** — uneven distribution: `tool_management` 1 tip vs `drilling` 11 vs `high_efficiency_milling` 9 vs `order_of_operations` 6. Low-N buckets give weak effectiveness signal. Mitigation: weight by tier; treat low-N tiers as advisory.
2. **Source corroboration** — 309/309 milling tips remain `confidence: "draft"`. Effectiveness score doesn't promote draft → validated; that's a human-review step still.
3. **Embedding regeneration** — adding a new tip doesn't auto-rebuild the tribal embedding index. Retrieval matches existing index until manual rebuild.
4. **Train/val/test split** — no temporal split implemented. To fine-tune a model on this data without leakage, build a chronological split (tips authored ≤T train, T+1d..T+7d val, >T+7d test) at index-rebuild time.
5. **Cross-domain corpus parity** — lathe/wedm/cam tribal corpora are at different maturities. Bridge only currently hits milling-pdf-cited-tips; sibling consumer methods needed for lathe + edm + drilling.

## Related

- [[reference_psn_definition]] — leg #5 (Tribal) + leg #11 (PRISM AI) bridge here
- [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]] — milling tribal surface map
- `mcp-server/src/engines/OutcomeTrackingEngine.ts` — outcome storage half
- `mcp-server/src/engines/TribalTipOutcomeBridgeEngine.ts` — the bridge
- `mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts` — retrieval-side wiring
- `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` — the 309-tip milling corpus

## Commits

- U-TTOB01 `32ffe7bbe7` — engine + test
- U-TTOB02 `af13bbd78a` — dispatcher wire
- U-TTOB03 `92a3c13dca` — retrieval re-ranking
- U-TTOB04 `9076f604a2` — auto-instrumentation wrapper
- U-TTOB05 (this entry) — wiki doctrine
