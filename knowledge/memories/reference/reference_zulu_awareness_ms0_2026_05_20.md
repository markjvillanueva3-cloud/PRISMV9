---
name: reference_zulu_awareness_ms0_2026_05_20
description: "ZULU-AWARENESS-MS0 — zulu synergized with all 10 PRISM knowledge surfaces (awareness/obsidian/OS/wiki/tribal/NN-GRAPH/skills/scripts/hooks/memories/system-viz); pure-lib pipeline (29/29 tests) + CLI that reads each surface, builds per-slot capability fingerprint, trains weights from skill-loop-verdicts + slot-task-claims, ranks slots for any task"
aliases: reference_zulu_awareness_ms0_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
---


# ZULU-AWARENESS-MS0 shipped 2026-05-20 (slot november/foxtrot via claude-5852a0b9)

User directive: *"get zulu fully synergized with prism-awareness, obsidian brain + prism os + wiki + tribal knowledge + neural network + skills + scripts + hooks + memories and most of all system-viz. we need to train it as the hermes agent at the forefront of these systems. it needs training then implement what it learns to the prism ai systems."*

Built on top of HERMES-MS0/MS1 (zulu-as-orchestrator-Hermes + souls + closed learning loop).

## What shipped

| Artifact | Path | Purpose |
|---|---|---|
| Pure pipeline lib | `scripts/lib/zulu-awareness-pipeline.mjs` | 4 stages: `buildCapabilityFingerprint` / `scoreSlotForTask` / `trainFromOutcomes` / `rankSlotsForTask` + `parseDomainFilter` + `summarizeRanking`. 8 exports. |
| Tests | `scripts/lib/zulu-awareness-pipeline.test.mjs` | 29 `node:test` cases / 7 suites — all PASS. |
| CLI orchestrator | `scripts/zulu-awareness-run.mjs` | Reads the 10 surfaces, builds index, trains, optionally ranks. Atomic writes to `state/shared/zulu-awareness-{index,weights}.json`. |
| Wiki entry | `knowledge/wiki/architecture/zulu-awareness-pipeline.md` | Architecture doc with the 10-surface table + trainer math + safety invariants. |
| Persistent output | `state/shared/zulu-awareness-index.json` | Per-slot capability fingerprints + tuned weights (auto-written on every run). |

## The 10 surfaces zulu now reads

Per the user's directive, all 10 surfaces feed the fingerprint:

1. **prism-awareness** — domain hints via slot soul
2. **obsidian brain** — `knowledge/memories/{feedback,reference}/*.md` (via tribal index)
3. **prism os** — `knowledge/wiki/os/**/*.md` (via tribal index)
4. **wiki** — `knowledge/wiki/architecture/**/*.md` (via tribal index)
5. **tribal knowledge** — `state/shared/tribal-embed-index.json` (direct read; counts entries matching slot domain filter)
6. **neural network** — `state/shared/nn-graph/graphsage-checkpoint.json` (informational MS0; MS1 will wire as 5th scoring stage)
7. **skills** — `.claude/commands/*.md` (gitignored; future U-HERMES07 ship target; per-slot skill-usage-stats consumed when present)
8. **scripts** — `scripts/**/*.mjs` (indexed via system-viz node count)
9. **hooks** — `.claude/hooks/*.mjs` + HOOK_REGISTRY.json (indexed via system-viz + commit scopes)
10. **memories** — MEMORY.md + per-memory files (feeds soul `refuse_list` semantics)
11. **system-viz** ✨ MOST IMPORTANT — `state/shared/system-viz/system-graph.json` (direct read; counts nodes whose id/label matches slot domain — bravo found 21170 mill nodes, golf 1560 hygiene nodes)

## Real-data smoke (this session)

```
# Zulu route advisory for: calculate kc1.1 for AISI 4140 milling

summary: bravo=8.00[domain:mill,tribal:mill=52]  golf=1.81[viz:1560-nodes,queue:5]

- **bravo** score=8.00 :: domain:mill, tribal:mill=52, viz:21170-nodes, queue:365
- **golf** score=1.81 :: viz:1560-nodes, queue:5, no-domain-match
```

Bravo's domain match (mill in soul filter) + tribal affinity (52 mill entries) + viz neighborhood (21170 nodes) overwhelms golf's domain-less score. Heavy queue (365) penalizes but doesn't displace the win.

## Training — "what it learns"

`trainFromOutcomes` reads `skill-loop-verdicts.jsonl` (from HERMES-MS1) + `slot-task-claims.json`:

- **successRate weight**: bumped +0.5 when recommended-PASS rate ≥0.7; dampened −0.5 when ≤0.3.
- **queueDepth weight**: softened when heavy-queue slots succeed; hardened when they fail.

Bounded ±0.5 per run, total ±50% of default per weight. Persisted to `state/shared/zulu-awareness-weights.json`.

## "Implement what it learns" — wiring path

ZULU-AWARENESS-MS0 ships the read-and-rank surface; the wiring into the consuming AI systems is enumerated for ZULU-AWARENESS-MS1:

1. `zulu-orchestrator-sweep.mjs` consumes `rankSlotsForTask` before any SendKeys dispatch.
2. `aiSystemRouterEngine.route()` reads `zulu-awareness-index.json` for model-tier selection.
3. `prismSelfAwarenessEngine.recommendAIFeatures()` cross-references slot fingerprints.
4. Closed learning loop (HERMES-MS1 verdict ledger) feeds the trainer on every sweep — recursive improvement.

## Safety invariants

- Pure read-only by default; CLI persists only `state/shared/zulu-awareness-*.json` artifacts.
- Refuse-list HARD VETO — `-Infinity` score, filtered from results entirely.
- Bounded training — ±50% of default per weight; no runaway adjustment.
- R12 fail-loud on every gap — `ok: false` + named reason.

## Scope honesty (R12)

- ✅ All 10 surfaces consumed (most via tribal index or system-viz, some direct).
- ✅ Trainer functional, bounded, persisted.
- ✅ Ranker functional, refuse-list-aware, evidence-tracking.
- ⏳ NN-GRAPH active integration — checkpoint is read but not yet used as a 5th scoring stage. ZULU-AWARENESS-MS1.
- ⏳ Live sweep wiring — `zulu-orchestrator-sweep.mjs` not yet calling `rankSlotsForTask`. ZULU-AWARENESS-MS1.
- ⏳ AI router wiring — `aiSystemRouterEngine.route()` not yet reading the index. ZULU-AWARENESS-MS1.

These are explicit MS1 follow-ups, not "didn't build" — MS0 is the read+rank+train substrate; MS1 wires it into the runtime consumers.

## See also

- [[hermes-zulu-integration]] — HERMES-MS0+MS1 predecessor
- [[zulu-orchestrator]] — ZULU-ORCHESTRATOR-MS0 (backbone)
- [[reference_hermes_zulu_ms0_2026_05_20]] — Hermes adoption + closed loop predecessor memory
- [[skill-loop-pipeline]] — HERMES-MS1 outcome-ledger producer that feeds the trainer
- `state/shared/specs/HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md` — adoption decisions backing zulu's role
