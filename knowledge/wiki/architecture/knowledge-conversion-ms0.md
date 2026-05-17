---
title: KNOWLEDGE-CONVERSION-MS0 — MIT-OCW + monolith → PRISM 6-node-type routing
slug: knowledge-conversion-ms0
kind: architecture
domain: knowledge-routing
status: shipped
shipped_at: 2026-05-17
shipped_by: claude-41db1b82 (slot india)
commits:
  - aa0335a8d  # U-KC-B1 artifact
  - 3d9324f2a  # U-KC-B2 artifact
  - 44980b391  # U-KC-B3 round-trip (collision-absorbed)
  - e4a48ebf3  # U-KC-C1 formula verification
  - "05152dff62"  # U-KC-C2 algorithm verification
  - cd00120dcd  # U-KC-D1 routing pipeline
  - 66aa07afa4  # U-KC-D1 ledger (collision-absorbed)
milestone: KNOWLEDGE-CONVERSION-MS0
related:
  - tribal-graph-ms0
  - course-data-routing-pipeline
  - master-index-surface
  - ollama-pipeline-ms0
---

# KNOWLEDGE-CONVERSION-MS0

Converts external knowledge corpora (MIT-OCW courseware, the v8.89 monolith
extraction, future PDF/video/shop-floor sources) into PRISM-consumable nodes
spanning **six node-types**: `knowledge`, `algorithm`, `formula`, `engine`,
`skill`, `pipeline`. Three lanes (A direct-wire / B port / C /forge-gated)
match autonomy posture to artifact safety: tribal-knowledge tips auto-emit,
formulas and engines always human-gated.

## Problem

Two large knowledge corpora were *extracted* but not wired into any PRISM
consumption surface:

| Corpus | Source | What existed | Wired? |
|--------|--------|-------------|--------|
| Coursework | TRIBAL-GRAPH-MS0 (MIT-OCW 226/227 zips) | 209 course-tribal nodes + 65 ranked content-mining candidates + 126 assets | No — zero TS consumers under `mcp-server/src` |
| Monolith | v8.89 extraction (2026-01-30) | 1000 modules / 12 formulas / 52 algorithms; 948 indexed | Partial — `S1-MS2` ported some algorithms+engines |

Pipeline-consumable (right shape) ≠ pipeline-consumed (a consumer reads it).
This milestone closes that gap and provides the routing seam for all future
external knowledge sources.

## Architecture — three lanes

```
External source (MIT-OCW · monolith · /pdf-learn · /video-learn · shop-floor)
                              │
                              ▼
          ┌────────────────────────────────────────────────┐
          │  Phase 0: AUDIT — monolith-port-ledger.json    │
          │  (audit-monolith-port-state.mjs — advisory)    │
          └─────────────────────┬──────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ LANE A       │      │ LANE B           │      │ LANE C           │
│ direct-wire  │      │ port             │      │ /forge-gated     │
│ autonomous   │      │ semi-autonomous  │      │ human-in-loop    │
│              │      │                  │      │                  │
│ tribal-tips  │      │ formula verify   │      │ /forge-triple    │
│ (Phase 1)    │      │ algo verify      │      │ proposals        │
│              │      │ (Phase 2)        │      │ (Phase 3)        │
└──────────────┘      └──────────────────┘      └──────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
TribalKnowledgeEngine    src/algorithms/         FORGE-QUEUE ledger
prism_knowledge:         src/engines/            human reviews →
tribal_search            src/physics/            /forge skill →
                         constants.ts            new asset
```

## Six PRISM node-types course/monolith data can populate

| Node-type | PRISM surface | How AI uses it |
|-----------|---------------|---------------|
| **knowledge** | `TribalKnowledgeEngine` ← `cad-engine/knowledge_store/*.json` | Prompt-time semantic retrieval via `prism_knowledge:tribal_search`; injected by `tribal-by-domain-inject` hook |
| **algorithm** | `mcp-server/src/algorithms/*.ts` | Computational primitives in reasoning chains; via `prism_calc:algorithm_*` |
| **formula** | `src/physics/constants.ts` + `prism_calc:<action>` | Canonical equations; centralized constants prevent inline-drift |
| **engine** | `mcp-server/src/engines/*.ts` | Stateful processors wired into dispatchers |
| **skill** | `.claude/commands/*.md` | Slash-command runbooks (derived — operator composes from technique clusters) |
| **pipeline** | `prism_orchestrate` actions / chained skills | Highest-level orchestration (derived — operator composes from multi-domain candidates) |

## Phase ship summary

### Phase 1 — Lane A direct-wire (tribal-tip emit, autonomous)

- **U-KC-B1** (`aa0335a8d`): `scripts/course-to-tribal-tips.mjs` + 44 tests +
  `cad-engine/knowledge_store/mit-ocw-course-tips.json` (126 tips).
- **U-KC-B2** (`3d9324f2a`): `scripts/monolith-to-tribal-tips.mjs` + 52 tests +
  `cad-engine/knowledge_store/monolith-data-lane-tips.json` (133 tips).
- **U-KC-B3** (`44980b391` collision-absorbed): round-trip wiring test
  through `prism_knowledge:tribal_search`. Engine loader confirms 7141
  doc-learned tips after both artifacts present.

### Phase 2 — Lane B port verification (formulas + algorithms)

- **U-KC-C1** (`e4a48ebf3`): 12 monolith formula files verified —
  0 ports needed. 2 multi-dispatcher-distributed, 2 registry-superseded,
  8 direct-mapped.
- **U-KC-C2** (`05152dff62`): 52 monolith algorithm files verified —
  1 genuine forge-candidate (`ODESolversEngine` for adaptive-step ODE solvers
  for thermal/kinematics simulation), 51 covered.

### Phase 3 — Lane C /forge-gated (queue formalization)

- **U-KC-D1** (`cd00120dcd` + `66aa07afa4` ledger absorbed): full routing
  pipeline. `scripts/lib/course-data-router-lib.mjs` + tests (30/30) +
  `scripts/course-data-router.mjs` CLI + design doc. Emits
  `COURSE-DATA-ROUTING-LEDGER.{json,md}` — 65 candidates → 126 routed
  decisions: 31 TRIBAL-SHIPPED, 69 FORGE-QUEUE, 10 DUPLICATE, 16 DISCARD.

### Phase 4 — doc-reflection (this entry)

- **U-KC-E1**: wiki entry (this file) + memory entry + plan-doc Phase 2+3
  EXECUTED update. CLAUDE.md pointer deferred to next session (file
  peer-claimed at ship time).

## Key files

| File | Role |
|------|------|
| `state/shared/specs/KNOWLEDGE-CONVERSION-PLAN.md` | Master plan, phase tracker |
| `state/shared/specs/monolith-port-ledger.json` | Phase 0 audit (advisory) |
| `state/shared/specs/U-KC-C1-FORMULA-PORT-VERIFICATION.md` | Phase 2 formula verdicts |
| `state/shared/specs/U-KC-C2-ALGORITHM-VERIFICATION.md` | Phase 2 algorithm verdicts |
| `state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md` | Phase 3 router design |
| `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json` | Phase 3 live routing output |
| `scripts/lib/course-data-router-lib.mjs` | Pure-core router (14 exports) |
| `scripts/lib/course-data-router-lib.test.mjs` | 30 tests (29 hermetic + 1 E2E) |
| `scripts/course-data-router.mjs` | CLI |
| `scripts/course-to-tribal-tips.mjs` | Lane A course → tribal-tip emitter |
| `scripts/monolith-to-tribal-tips.mjs` | Lane A monolith → tribal-tip emitter |
| `mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts` | Round-trip wiring test |

## Doctrine pins preserved

- **NEVER inline physics constants** — formula path ALWAYS Lane C with
  physics-reviewer (CLAUDE.md §SAFETY).
- **NEVER create stub engines** — router emits ADVISORY ledger only; never
  writes source code.
- **Karpathy R8 (read before write)** — pure-core + injected readers
  (RGS-TOOL-MS1 pattern); content cross-ref against existing PRISM before
  classifying as missing.
- **Karpathy R12 (fail loud)** — validators throw on malformed input;
  unknown asset kinds DISCARD with audit-trail rationale (not silent-drop).
- **advisoryOnly + mustHumanVerify** on every generated ledger.
- **1 real-data E2E test** per RGS-TOOL-MS1 lesson (hermetic-only hides
  schema-seam bugs).

## Re-run

```bash
# Phase 0 audit (regen ledger):
node scripts/audit-monolith-port-state.mjs

# Phase 1 Lane A emitters (re-emit tribal-tips):
node scripts/course-to-tribal-tips.mjs
node scripts/monolith-to-tribal-tips.mjs

# Phase 3 router (regen routing ledger):
node scripts/course-data-router.mjs
# deterministic for diffs:
node scripts/course-data-router.mjs --frozen-time 2026-05-17T00:00:00Z

# Verify round-trip:
cd mcp-server && "H:/.claude/bin/portable-node" node_modules/vitest/vitest.mjs \
  run src/__tests__/knowledge-conversion-roundtrip.test.ts

# Router lib tests:
"H:/.claude/bin/portable-node" --test scripts/lib/course-data-router-lib.test.mjs
```

## Future extensions

- **`skill` + `pipeline` auto-detection** — cluster co-occurring techniques
  within a candidate to suggest composed skill/pipeline candidates.
- **`/forge-queue` slash-command** — walks operator through approve/reject
  on the 69 FORGE-QUEUE items.
- **Other source types** — same router structure works on `/pdf-learn` and
  `/video-learn` output.
- **RGS6 threshold self-tuning** — feed approve/reject rates back into the
  `adaptive-thresholds` 6-magic-number self-tuner.
- **`ODESolversEngine`** — `/forge-triple` of the single Phase 2 algorithm
  gap (RK45 / RK4-Dormand-Prince / BDF for stiff systems).
