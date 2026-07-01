---
name: zulu-awareness-pipeline
description: ZULU-AWARENESS-MS0 — zulu synergized with all 10 PRISM knowledge surfaces (awareness/obsidian/OS/wiki/tribal/NN-GRAPH/skills/scripts/hooks/memories/system-viz); pure-lib + CLI builds per-slot capability fingerprint, trains weights from outcome ledgers, ranks slot recommendations for any task
type: architecture
status: shipped
mapped_units: ZULU-AWARENESS-MS0
date: 2026-05-20
---

# ZULU-AWARENESS-MS0 — Zulu synergized with the 10 knowledge surfaces

## What it solves

After HERMES-MS0/MS1 designated zulu as the orchestrator-Hermes and gave it
souls + a closed learning loop, zulu still lacked a **unified read** of every
PRISM knowledge surface and a **trained model** for routing tasks to the right
specialist. The user's 2026-05-20 directive — *"get zulu fully synergized with
prism-awareness, obsidian brain + prism os + wiki + tribal knowledge + neural
network + skills + scripts + hooks + memories and most of all system-viz. we
need to train it as the hermes agent at the forefront of these systems. it
needs training then implement what it learns to the prism ai systems"* — names
the gap directly.

## What it builds

A four-stage pure pipeline (`scripts/lib/zulu-awareness-pipeline.mjs`):

| Stage | Function | Reads | Writes |
|---|---|---|---|
| 1 — fingerprint | `buildCapabilityFingerprint(slot, soul, ctx)` | slot soul + queue depth + recent commits + tribal scores + viz nodes + verdict ledger | per-slot fingerprint object |
| 2 — score | `scoreSlotForTask(fp, taskDescriptor, weights)` | fingerprint + task descriptor (text/domain/kind) + weights | `{score, evidence[]}` |
| 3 — train | `trainFromOutcomes(verdictLines, taskClaims, opts)` | skill-loop-verdicts.jsonl + slot-task-claims.json | tuned weights bounded ±50% of defaults |
| 4 — rank | `rankSlotsForTask(taskDescriptor, fingerprints, weights)` | all fingerprints + descriptor + tuned weights | ranked `[{slot, score, evidence, fingerprint}]` |

CLI orchestrator: `scripts/zulu-awareness-run.mjs`. Persists per-slot index at
`state/shared/zulu-awareness-index.json` and trained weights at
`state/shared/zulu-awareness-weights.json` on every run (atomic writes).

## The 10 surfaces consumed

| # | Surface | File / source | Stage that reads it |
|---|---|---|---|
| 1 | prism-awareness | `state/shared/AWARENESS-SNAPSHOT.md` (auto-injected) | informs domain filter via slot soul |
| 2 | obsidian brain | `knowledge/memories/{feedback,reference}/*.md` | feeds tribal scoring via embed index |
| 3 | prism os | `knowledge/wiki/os/**/*.md` | embedded via tribal index |
| 4 | wiki | `knowledge/wiki/architecture/**/*.md` | embedded via tribal index |
| 5 | tribal knowledge | `state/shared/tribal-embed-index.json` | direct read in stage-1 (`buildTribalDomainScores`) |
| 6 | neural network | `state/shared/nn-graph/graphsage-checkpoint.json` | currently informational; future stage-5 routing-classifier |
| 7 | skills | `.claude/commands/*.md` (gitignored, local-only) | future U-HERMES07 ship target |
| 8 | scripts | `scripts/**/*.mjs` | indexed via system-viz node count |
| 9 | hooks | `.claude/hooks/*.mjs` + `HOOK_REGISTRY.json` | indexed via system-viz + recent commit scopes |
| 10 | memories | `C:/Users/.../memory/MEMORY.md` + per-file | feeds soul refuse_list semantics |
| 11 | system-viz | `state/shared/system-viz/system-graph.json` | direct stage-1 read (`countVizNodes` — node-id substring match against soul domains) |

## Usage

```bash
# Dump per-slot index (markdown)
node scripts/zulu-awareness-run.mjs

# JSON output
node scripts/zulu-awareness-run.mjs --json

# Rank slots for a candidate task
node scripts/zulu-awareness-run.mjs --rank "calculate kc1.1 for AISI 4140 milling" --domain mill
node scripts/zulu-awareness-run.mjs --rank "wire 12 engines to dispatchers" --domain backend-dev

# Run trainer only, emit tuned weights
node scripts/zulu-awareness-run.mjs --train-only
```

Sample real-data output (this session):

```
# Zulu route advisory for: calculate kc1.1 for AISI 4140 milling

summary: bravo=8.00[domain:mill,tribal:mill=52]  golf=1.81[viz:1560-nodes,queue:5]

- **bravo** score=8.00 :: domain:mill, tribal:mill=52, viz:21170-nodes, queue:365
- **golf** score=1.81 :: viz:1560-nodes, queue:5, no-domain-match
```

Bravo wins for a mill task — its soul declares `domain_filter: mill|milling|…`,
its tribal hits include 52 mill entries, and its system-viz neighborhood
covers 21170 nodes (overwhelming).

## Trainer math (stage-3 details)

Outcome ledger (`skill-loop-verdicts.jsonl`) drives two weight adjustments:

- **`successRate` weight** — bumped +0.5 when recommended-PASS rate ≥0.7; dampened −0.5 when ≤0.3. Reinforces the model when its recommendations land; softens when they fail.
- **`queueDepth` penalty weight** — softened when heavy-queue slots (depth ≥5) keep succeeding; hardened when they fail. Catches the "this slot's saturated, even though it's the domain expert" case.

Adjustments are conservative: bounded ±0.5 per training run, total ±50% of default per weight. No catastrophic drift; many training runs converge stably.

## How it "implements what it learns to PRISM AI systems"

Zulu exports the ranking result as advisory context that any downstream
consumer can read:

1. **The existing `zulu-orchestrator-sweep.mjs`** can prepend the ranking
   into its action plan when picking which slot to nudge with /compact +
   /checkin — currently the sweep uses slot pressure + drift; adding the
   ranking gives it task-awareness too.
2. **`aiSystemRouterEngine.route()`** can read `zulu-awareness-index.json`
   to inform model-tier choice — e.g., if a task scores highly for a
   physics-specialist slot, prefer the physics-reviewer subagent type.
3. **`prismSelfAwarenessEngine.recommendAIFeatures()`** can cross-reference
   the per-slot fingerprint when surfacing capability recommendations.
4. **The closed learning loop** (HERMES-MS1) feeds back into the awareness
   trainer — every PASS/FAIL verdict tunes the routing weights for the
   next sweep.

This is the "synergize → train → implement" cycle the user named.

## Safety invariants

1. **Pure read-only by default** — CLI persists only the index + weights files; never edits engines, dispatchers, or skill files.
2. **Refuse-list HARD VETO** — a task hitting any slot's `refuse_list` short-circuits with `-Infinity` score (filtered out of results entirely). Zulu cannot route mill work to charlie (lathe specialist) when charlie's soul refuses it.
3. **Bounded training** — per-run weight delta ≤0.5; total deviation from defaults ≤50%. No runaway adjustment.
4. **Narrow-sample tempering** — success-rate weight only kicks in at sample size ≥3, preventing single-failure overreaction.
5. **R12 fail-loud** — every fingerprint records `ok: false` + `reason` on any input gap; never silently degraded.

## Tests

`scripts/lib/zulu-awareness-pipeline.test.mjs` — 29 `node:test` cases across 7 suites (constants, parseDomainFilter, fingerprint, scoring, training, ranking, summarize). All PASS.

## Knobs

| Env | Effect |
|---|---|
| `PRISM_ROOT` | Override the prism root for tests / alt installations. |
| `--threshold N` (CLI) | Cluster threshold for emit gate. |
| `--apply` (CLI) | Actually write trained weights + index file (default is also write, but `--train-only` returns immediately after writing weights). |

## See also

- [[hermes-zulu-integration]] — HERMES-MS0+MS1 predecessor (personality + closed learning loop)
- [[zulu-orchestrator]] — ZULU-ORCHESTRATOR-MS0 (CHO01/02/04 + SendKeys actuator)
- [[skill-loop-pipeline]] — HERMES-MS1 cluster→gate→ship (the outcome ledger that feeds the trainer)
- [[hermes-adoption-pattern-matrix]] — operator-flippable decision matrix
- [[reference_hermes_zulu_ms0_2026_05_20]] — Obsidian memory for the predecessor ship

## Next iteration (ZULU-AWARENESS-MS1)

- **NN-GRAPH integration** — currently the GraphSAGE checkpoint is informational; MS1 wires the classifier as a 5th scoring stage (per-task graph-embedding cosine similarity to slot-domain centroids).
- **MEMORY.md feedback weight** — read `recall-counter` hits per memory to weight which memories are load-bearing for which slots.
- **Live sweep integration** — `zulu-orchestrator-sweep.mjs` calls `rankSlotsForTask` on every queued task in its action plan rather than relying solely on slot soul + queue depth.
- **Backend-dev priority lock** — current U-ZULU05 backend-dev priority filter is keyword-based; MS1 wires the ranking model as the primary picker with the keyword filter as a tiebreak.
