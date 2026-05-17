# COURSE-DATA-ROUTING-PIPELINE — Design (U-KC-D1)

**Milestone:** KNOWLEDGE-CONVERSION-MS0 Phase 3 Lane C
**Unit:** U-KC-D1
**Date:** 2026-05-17
**Author:** claude-41db1b82 (slot india)
**Status:** shipped (advisory-only — never auto-builds)

## Problem

Course data extracted from MIT-OCW (and future sources) lands in
`state/shared/tribal-graph/course-content-candidates.jsonl` — 65 candidates,
126 assets, each pre-tagged with `kind` ∈ {algorithm, technique, formula,
engine}. Phase 1 Lane A (`scripts/course-to-tribal-tips.mjs`) already emits
tribal-tip knowledge entries for every candidate. The remaining question:
**what else can each piece of course data populate?** An algorithm name might
already exist as a PRISM algorithm file (DUPLICATE — no port needed). A
formula might be a /forge candidate that needs physics-reviewer agent gating.
An engine concept might warrant a `/forge-triple` proposal.

The CLAUDE.md doctrine is explicit: never auto-emit physics constants, never
auto-build engines/skills/hooks. So this layer is **routing + advisory
queue**, not auto-emission. Downstream `/forge` + `physics-reviewer agent`
+ human review fan out from the queue.

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  course-content-candidates.jsonl  (65 candidates × ~2 assets each)     │
│  schema: { courseId, candidateAssets:[{kind,name,rationale}],          │
│            mfgRelevance, prismDomains, rank, ... }                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
              ┌──────────────────────────────────────────────┐
              │  scripts/course-data-router.mjs (CLI)        │
              │  ├ readCandidates() — JSONL parser           │
              │  ├ readInventoryNames() — algos + engines    │
              │  └ buildLedger() ──┐                         │
              └────────────────────┼─────────────────────────┘
                                   │
                                   ▼
              ┌──────────────────────────────────────────────┐
              │  scripts/lib/course-data-router-lib.mjs      │
              │  ├ normalizeNameTokens() — CamelCase-aware   │
              │  ├ tokenMatchScore() — coverage-of-candidate │
              │  ├ findBestMatch() — dedup against inventory │
              │  ├ routeAsset() — per-kind routing rules     │
              │  ├ routeCandidate() — fan-out per candidate  │
              │  └ buildLedger() — aggregate + roll-up summary│
              └────────────────────┬─────────────────────────┘
                                   │
                                   ▼
       ┌───────────────────────────────────────────────────────┐
       │  COURSE-DATA-ROUTING-LEDGER.{json,md}                 │
       │  advisoryOnly: true, mustHumanVerify: true            │
       │  summary: byDecision/byNodeType/byLane                │
       │  items[]: {courseId, decisions[]}                     │
       └────────────────────┬──────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┬─────────────────┐
            ▼               ▼               ▼                 ▼
       TRIBAL-SHIPPED   DUPLICATE       FORGE-QUEUE       DISCARD
        (Lane A)        (Lane B)         (Lane C)         (none)
            │               │               │                 │
      Phase 1 done    verify scope    /forge-triple        drop
                      against PRISM   physics-reviewer
                                      human gate
```

## Node-type taxonomy — what course data can populate

The router maps `candidateAssets[].kind` (the source-side categorization)
to PRISM **node types** (the destination-side surface):

| Source kind | Node type | Destination surface | Lane |
|-------------|-----------|--------------------|------|
| `technique` | knowledge | `cad-engine/knowledge_store/mit-ocw-course-tips.json` (TribalKnowledgeEngine auto-load) | A (Phase 1 done) |
| `algorithm` | algorithm | `mcp-server/src/algorithms/*.ts` (computational procedure) | B if DUPLICATE, C if FORGE-QUEUE |
| `formula` | formula | `src/physics/constants.ts` + `prism_calc:<action>` | **ALWAYS C** (physics-reviewer agent gate) |
| `engine` | engine | `mcp-server/src/engines/*.ts` (stateful processing unit) | B if DUPLICATE, C if FORGE-QUEUE |
| _(derived)_ | skill | `.claude/commands/*.md` runbook | C — emerges from multiple co-occurring techniques |
| _(derived)_ | pipeline | multi-step orchestration via `prism_orchestrate` or composed skill | C — emerges from technique clusters |

The `skill` and `pipeline` node-types are not directly emitted by the
router — they appear when the human operator reviews the forge-queue and
recognizes a compound pattern. The router gives them the raw signal
(per-asset routing decisions); composition is the operator's call.

## How the AI system uses each node type

- **knowledge** (`prism_knowledge:tribal_search`) — semantic retrieval at
  prompt time. Already wired (Phase 1). Every chat surfaces relevant tips via
  `tribal-by-domain-inject` hook.
- **algorithm** — discrete computational primitives composable into
  reasoning chains. Reachable via `prism_calc:algorithm_*` actions + direct
  import in engines.
- **formula** — canonical equations + constants. The `src/physics/constants.ts`
  centralization rule means every formula gets one safe source-of-truth. AI
  reasoning chains call `prism_calc:<action>` rather than re-deriving.
- **engine** — long-lived stateful processors. Wired into dispatchers,
  callable from any skill / hook / orchestrator action.
- **skill** — slash-command runbooks the user invokes. Each captures a
  multi-step workflow.
- **pipeline** — composed orchestrations via `prism_orchestrate` or chained
  skill+dispatcher calls. The highest-level surface for AI-driven reasoning.

## Routing rules (per-kind)

### `technique` → ALWAYS TRIBAL-SHIPPED (Lane A)

No re-emission. Phase 1 already ingests every course technique as a
`KnowledgeTip` and the engine loader (`TribalKnowledgeEngine.loadDocument-
LearnedTips()`) auto-loads them. Verification: `prism_knowledge:tribal_search
{ query: "<technique>" }` returns the tip.

### `algorithm` → DUPLICATE / FORGE-QUEUE / DISCARD

1. Tokenize `name` (CamelCase-aware: `OperatorSplittingMethod` → `[operator,
   splitting]` after stripping `Method` suffix).
2. Against `mcp-server/src/algorithms/*.ts` name list, find best token-match
   score (`coverage-of-candidate` metric — full candidate-token coverage
   = 1.0).
3. If score ≥ `DEDUP_MATCH_SCORE` (0.6) → **DUPLICATE** Lane B. Human
   verifies scope match; if course version adds variant, propose extension
   via `/forge` — never duplicate the file.
4. Else if `mfgRelevance ≥ ALGORITHM_FORGE_MIN_RELEVANCE` (0.5) →
   **FORGE-QUEUE** Lane C. Action: `/forge-triple algorithm:<name>`.
5. Else → **DISCARD** — below mfg-relevance floor for an algorithm port.

### `formula` → ALWAYS FORGE-QUEUE Lane C (or DISCARD)

Doctrine pin (CLAUDE.md §SAFETY): NEVER inline physics constants. Formulas
ALWAYS require physics-reviewer agent verification of:
- dimensional consistency
- equation form against canonical references
- constant values against `src/physics/constants.ts`

So formulas with `mfgRelevance ≥ FORMULA_DISCARD_FLOOR` (0.3) go to
FORGE-QUEUE with recommendedAction citing the physics-reviewer step. Lower
relevance → DISCARD.

### `engine` → DUPLICATE / FORGE-QUEUE / DISCARD

Same dedup logic as algorithm, but against `mcp-server/src/engines/*.ts`
and with a higher threshold (`ENGINE_FORGE_MIN_RELEVANCE` = 0.6 vs 0.5 for
algorithms) — engines need the full `/forge-triple` (engine + skill + hook),
not just a single algorithm file, so the bar is higher.

## Thresholds — adjustable, RGS6-tunable

| Constant | Value | Rationale |
|----------|-------|-----------|
| `DEDUP_MATCH_SCORE` | 0.6 | Token-coverage required to call DUPLICATE — empirically distinguishes "same concept" from "shares word" |
| `ALGORITHM_FORGE_MIN_RELEVANCE` | 0.5 | mfgRelevance floor for algorithm → forge-queue |
| `ENGINE_FORGE_MIN_RELEVANCE` | 0.6 | Higher bar for engines (full /forge-triple cost) |
| `FORMULA_DISCARD_FLOOR` | 0.3 | Formulas always forge-queue if above this; physics-reviewer gates further |

Future: feed observed false-positive / false-negative rates into RGS6
`adaptive-thresholds` (the 6-magic-number self-tuner) for continuous
calibration.

## What the AI system can use it for

This routing is the **enrichment seam** between MIT-OCW (or future-source)
course material and PRISM's reasoning surfaces:

1. **Logic/reasoning enrichment** — every TRIBAL-SHIPPED entry feeds
   `tribal-by-domain-inject` hook → every chat prompt sees relevant
   course-derived tips at runtime.
2. **Skill discovery** — FORGE-QUEUE items become candidate proposals for
   new skills (`.claude/commands/*.md`) when the operator runs `/forge-triple`.
3. **Algorithm corpus growth** — FORGE-QUEUE algorithm items become
   candidate `mcp-server/src/algorithms/*.ts` files after physics-reviewer
   (for math-heavy) + scrutiny gate.
4. **Engine inventory growth** — FORGE-QUEUE engine items become candidate
   engines after the higher-bar review.
5. **Cross-domain synthesis** — `PRISMCreativeReasoningEngine` consumes
   tribal-tips + formula registry + algorithm registry to compose novel
   solutions. Every routed asset enlarges that surface.
6. **Learning corpus** — the ledger itself is training data: shows which
   course concepts already exist in PRISM (DUPLICATE) vs which are gaps
   (FORGE-QUEUE) → guides future course-mining priorities.

## Files

| File | Role |
|------|------|
| `scripts/lib/course-data-router-lib.mjs` | Pure-core routing library (14 exports, hermetic) |
| `scripts/lib/course-data-router-lib.test.mjs` | 30 tests (node:test) — 29 hermetic + 1 real-data E2E |
| `scripts/course-data-router.mjs` | CLI runner — reads candidates + inventory, emits ledger |
| `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json` | Generated ledger (advisory) |
| `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.md` | Human-readable ledger view |
| `state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md` | This design doc |

## Re-run

```bash
# Standard (uses current Date.now()):
node scripts/course-data-router.mjs

# Deterministic (diff-friendly):
node scripts/course-data-router.mjs --frozen-time 2026-05-17T00:00:00Z

# Inspect without writing:
node scripts/course-data-router.mjs --dry-run

# Pipe ledger to stdout:
node scripts/course-data-router.mjs --json | jq '.summary'
```

Tests:
```bash
"H:/.claude/bin/portable-node" --test scripts/lib/course-data-router-lib.test.mjs
```

## Live results (2026-05-17 first run)

- **65** candidates · **126** assets routed
- **TRIBAL-SHIPPED**: 31 (Phase 1 covers these)
- **FORGE-QUEUE**: 69 (Lane C candidates — real ask for human gate)
- **DUPLICATE**: 10 (Lane B — verify scope; some dedup false-positives e.g.
  `pipeline-engine → AdaptivePipelineGeneratorEngine` need human filtering)
- **DISCARD**: 16 (below mfg-relevance floor)

Sample real candidates surfaced for /forge:
- `algorithm:operator-splitting` (course 10.34 — numerical methods)
- `algorithm:bernoullis-equation-solver` (course 1.060 — fluid mechanics)
- `formula:moody-diagram-analysis` (1.060 — physics-reviewer first)
- `engine:lean-enterprise-engine` (16.852j — lean manufacturing)

## Future extensions (not in this unit)

- **`skill` + `pipeline` auto-detection** — cluster co-occurring techniques
  within a candidate to suggest composed skill / pipeline candidates.
- **`/forge-queue` skill** — operator slash-command that consumes the
  ledger's FORGE-QUEUE items and walks the human through approve/reject.
- **Other source types** — same router structure works for PDF-extracted
  candidates (`/pdf-learn` output), video-extracted candidates
  (`/video-learn`), and shop-floor tribal capture.
- **RGS6 threshold self-tuning** — feed approve/reject rates back into
  `adaptive-thresholds`.

## Doctrine alignment (CLAUDE.md)

- ✓ Karpathy R8 (read before write) — surveyed existing `course-mapper-lib`,
  `course-content-mine-lib`, `tribal-graph-*` scripts before designing.
- ✓ Karpathy R11 (conform) — uses existing `course-content-candidates.jsonl`
  schema; pure-core + injected readers pattern from RGS-TOOL-MS1.
- ✓ Karpathy R12 (fail-loud) — validators throw on malformed input; unknown
  asset kinds DISCARD with audit-trail rationale (not silent-drop).
- ✓ NEVER inline physics constants — formula path always forge-queue.
- ✓ NEVER create stub engines — router NEVER auto-emits; only proposes.
- ✓ Advisory + `mustHumanVerify: true` — every downstream consumer is
  warned.
- ✓ 1 real-data E2E test (RGS-TOOL-MS1 lesson) — hermetic-only fakes hide
  schema-seam bugs.
