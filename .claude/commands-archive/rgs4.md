---
name: rgs4
description: RGS v4 — v3 14-stage pipeline + System-Viz atomic-first tier-gating. New Stage 0.6 (System-Viz Tier-Gating) before S1; Stage 5 binds meta.roadmap.phases as the canonical phase skeleton; Stage 6 sources wiring proposals from node.suggestedDispatchers and ranks by leverageScore; Stage 9 enforces tier ordering; Stage 10 adds Agent 11 (Atomic-First Compliance). New `atomic-roadmap` route writes PRISM-MASTER-ROADMAP-<date>-atomic.md directly from the live graph.
---

---
policy:
  tier: 4
  triggers:
    - "rgs4"
---

# RGS v4 — Atomic-First Roadmap Generation System

v4 inherits **everything** from v3 unchanged (SAFETY-CRITICAL TEST LAW, EXHAUSTIVE SCIENCE LAW, advisor strategy, MCP UTILIZATION PROTOCOL, ANTI-DRIFT KARPATHY CHECKPOINT, CONTEXT BUDGET POLL, hybrid 5+5 scrutiny, 3-way Codex+Gemini+Opus consensus, conformal calibration, memory WRITE, cron registration, skill auto-creation, error-learn-review). Read `H:/.claude/commands/rgs3.md` for the v3 baseline.

This file documents only the **additive v4 layer**: System-Viz tier-gating that turns v3's freeform phase ordering into a hard atomic-first contract, plus the new `atomic-roadmap` route that writes the master roadmap straight from the live 10-layer graph.

Authority: `H:/prism/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`. When this file disagrees with the directive, the directive wins.

## Args: $ARGUMENTS
All v3 routes (`status` / `brainstorm` / `generate` / `continue` / `list` / `plan` / `utilize` / `audit-coverage` / `sync` / `meta-coverage`) PLUS:

- **`atomic-roadmap`** (NEW — headline v4 route): generate the canonical master roadmap from the live system-viz, written to `H:/prism/PRISM-MASTER-ROADMAP-<YYYY-MM-DD>-atomic.md`. Use this for any "regenerate the master roadmap" request.
- **`tier-check <unit-id>`** (NEW): given an existing unit, verify its tier-floor still passes against the current graph; report PASS/BLOCK with prereq diff.
- **`leverage-rank <domain>`** (NEW): for a given engine domain, list the suggested dispatchers + leverageScore so you can prioritize wiring units.
- **`viz-refresh`** (NEW): regenerate `system-graph.json` and emit a coverage-by-domain delta vs the previous generation.

## Live Counts (refresh via `node scripts/update-prism-inventory.mjs --quiet`)
3,165+ engines · 97 dispatchers · 7,302 actions · 413 hooks · 520 skills · 770 wiki · 189 memories · 4,245 tribal · 540+ scripts · 9 MCP plugins · 6 Ollama models · 40+ AI/ML engines.

System-viz state (refresh via `node scripts/generate-system-viz.mjs`):
334 nodes · 627 edges · 10 layers · 2269 wired engines · 898 unwired · 2 pending merges · 3 drift cases.

---

## ATOMIC-FIRST BUILD LAW (HARD RULE — applies across the whole pipeline)

Per `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`:

| Tier | Layer in viz | Examples |
|------|--------------|----------|
| 0 | L6–L9 | Physics constants, formulas, algorithms, registries, schemas, hooks, scripts, fs |
| 1 | L5 | Engines (3,173) |
| 2 | L3, L4 | Dispatchers (97), AI hierarchy (12) |
| 3 | L2 | Transport (REST, WS, auth, rate-limit, telemetry) |
| 4 | L1 | Frontends + 144 pages |
| 5 | L0 | Personas |

**Build the lowest tier first. Each tier consumes the one beneath. Never start a higher-tier feature while its lower-tier blocks are missing.**

The `meta.roadmap.phases` array embedded in `system-graph.json` is the canonical phase skeleton:

| Phase | Tier | Theme |
|-------|------|-------|
| Phase 0 | mixed | Reality reconciliation (drift) |
| Phase 1 | T0    | Atomic foundation gaps (constants/formulas/algorithms/registries/schemas) |
| Phase 2 | T1    | Engine wire-up (highest leverage) |
| Phase 3 | T4    | Pending frontend merge |
| Phase 4 | mixed | New build (only after 1-3 stable) |

Higher phases must wait until lower phases are <10% gap.

---

## TIER FLOOR GATE (HARD RULE — blocks higher-tier work)

For any unit at Tier-N, **all Tier-(N-1) prerequisites must be ≥90% complete in the same vertical column**. Use `node.tier` and the column-specific gap from `coverage-by-domain` as the oracle. If a higher-tier unit is proposed without the lower-tier floor, the unit is **rejected at Stage 0.6 generation and at Stage 9 dependency resolution**.

---

## ANTI-DRIFT KARPATHY CHECKPOINT (v3 hard rule, still applies)

Every 5 stages or every 5 units: (1) on user goal? (2) simplest? (3) checked existing? (4) verified assumptions?

## CONTEXT BUDGET POLL (v3 hard rule, still applies)

`/context-budget` at every stage boundary. >70% → jump to S11.

---

## ROUTE: atomic-roadmap (NEW — v4 headline)

Generate the canonical master roadmap directly from the live system-viz. Use this for any "regenerate the master roadmap" or "what should we build next" request.

### Steps

```bash
# 1. Refresh the graph
node H:/prism/scripts/generate-system-viz.mjs

# 2. PRECONDITION — graph must pass completeness check or atomic-roadmap is misleading
node H:/prism/.claude/scripts/system-viz-completeness-check.mjs
# exit 0 → proceed to step 3
# exit 1 → BLOCK: surface the blockers list to user; do NOT emit master roadmap.
#          Resolve each blocker (orphan rate, hook modeling, dispatcher action
#          counts, atomic-gap detector, envelope drift, freshness) BEFORE retry.
# exit 2 → graph file missing; regenerate first.

# 3. Pull the canonical phase skeleton + headline
node H:/prism/scripts/system-viz-query.mjs build-order > /tmp/atomic-skeleton.md
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json > /tmp/candidates.json
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json > /tmp/coverage.json
node H:/prism/scripts/system-viz-query.mjs dispatcher-summary --json > /tmp/dispatchers.json
```

The completeness check enforces 8 graph-quality invariants:
1. **Orphan rate ≤5%** — too many disconnected nodes means the graph isn't a faithful map.
2. **Tier-0 inbound coverage ≥50%** — atomic primitives must be referenced by SOMETHING for the tier-floor gate to be meaningful.
3. **Hook node has edges** — `core.hooks_cl` (440 hooks) must model fire-edges; otherwise hook gaps are invisible.
4. **Phase 1 atomic detector implemented** — `meta.roadmap.phases[1]` must produce items OR be explicitly annotated as clean.
5. **Dispatcher action modeling ≥50%** — graph's per-dispatcher `actionCount` must approximate inventory's real count.
6. **Envelope drift = 0** — Phase 0 reconciliation must be done; otherwise the master roadmap will skip drift fixes.
7. **Graph freshness ≤30min** — stale graphs lead to stale roadmaps.
8. **Pending-merge nodes match BUILD_STATE** — no missing pending merges.

### Then synthesize the master roadmap with these guarantees

1. **Skeleton is `meta.roadmap.phases`** — never invent phase names; never reorder; never skip Phase 0 drift if `meta.headline.drift > 0`.
2. **Phase contents come from `roadmap-candidates`** — the candidates emitted by the adapter are pre-sorted by leverageScore; honor that order within each phase.
3. **Each candidate becomes a milestone envelope** — populate via the v4 14-stage `generate` pipeline below, but pre-classify the tier and prereq_tier from the graph node.
4. **Drift sub-units in Phase 0 cite the specific milestone IDs** from `BUILD_STATE.json` envelope drift (e.g. `MF-MS1: claims completed, real not_started_real`). Each becomes one Phase 0 reconciliation unit with `/envelope-sync` as the resolution tool.
5. **Phase 1 units** are bounded by atomic gaps the graph identifies (currently empty; if present, each missing constant/formula/algorithm/registry/schema/hook is one Phase 1 unit).
6. **Phase 2 units** wire the top-N domains by leverageScore. Each unit:
   - Targets one engine domain (e.g. `Other` 148 unwired, `Lathe` 106, `Machine` 17).
   - Cites `node.suggestedDispatchers` for the wiring proposal (verbatim from graph).
   - Sets `wire_count_target` (3–10 engines per unit; smaller units finish faster, more re-checkable).
   - Commits to a leverage-realized assertion: `wired_count: X → Y` checked at Phase 4J.
7. **Phase 3 units** are the merge sub-tasks for `cqask/ui` and `mcp-cadquery/frontend`. Each unit:
   - References the source repo + target merge surface (`mcp-server/web`).
   - Lists the page count being merged in.
   - Cites the dependency on Phase 2 wire-up so frontend pages call wired engines.
8. **Phase 4 units** are net-new only if Phases 0–3 are <10% gap on their respective columns. Otherwise this phase is intentionally empty in the master roadmap.

### Output

Write `H:/prism/PRISM-MASTER-ROADMAP-<YYYY-MM-DD>-atomic.md` containing:

```
# PRISM Master Roadmap — Atomic-First (vYYYY-MM-DD)

Generated from system-viz @ <generatedAt>
Source: meta.roadmap.phases skeleton + roadmap-candidates pre-sorted by leverageScore

## Headline state
- Engines: <built>/<total> (<%>)
- Unwired: <count>
- Pending FE: <count>
- Drift: <count>

## Phase 0 — Reality reconciliation
[milestone envelopes for each drift case]

## Phase 1 — Atomic foundation gaps (Tier 0)
[milestone envelopes for each atomic gap, or "No items" if clean]

## Phase 2 — Engine wire-up (Tier 1, highest leverage)
[milestone envelopes for top-N domains by leverageScore]

## Phase 3 — Pending frontend merge (Tier 4)
[milestone envelopes for cqask + cadquery merges]

## Phase 4 — New build
[milestone envelopes for net-new work, or "Gated until Phases 0–3 <10% gap"]

## Tier coverage at generation
T0: <count>  T1: <wired/unwired>  T2: <count>  T3: <count>  T4: <count>  T5: <count>

## Refresh discipline
Regenerate this roadmap whenever: drift count changes, any phase closes >25%, or a frontend merges.
Generation command: `/rgs4 atomic-roadmap`
```

Each milestone envelope written to `H:/prism/mcp-server/data/milestones/<id>.json` and registered in `roadmap-index.json`. Skip envelope writing for milestones that already exist with matching scope (idempotent).

### Acceptance

After writing, run `/rgs4 tier-check <each-milestone-id>` to verify all envelopes pass the tier floor. If any fail, the roadmap synthesis is rejected; surface the failures and rewrite.

---

## ROUTE: brainstorm (v4 enhanced)

v3's brainstorm chain unchanged. Add **before** v3 steps:

```bash
# Pull live state
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json
```

Use the candidate list as the **default seed** for brainstorming, not a freeform exploration. If the user's topic isn't represented in the candidates, that's a signal that either (a) the topic isn't atomic-first appropriate, (b) the viz needs regeneration, or (c) the user is proposing Phase-4 work that requires Phases 0–3 to clear first.

---

## ROUTE: generate — 15-Stage v4 Pipeline (v3's 14 + S0.6)

### Stage 0 — PREFLIGHT (v3 enhanced + V4 SYSTEM-VIZ BIND)

v3's preflight unchanged. Add the System-Viz bind:

```bash
node H:/prism/scripts/generate-system-viz.mjs    # ALWAYS first
node H:/prism/scripts/system-viz-query.mjs build-order > /tmp/atomic-skeleton.md
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json > /tmp/candidates.json
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json > /tmp/coverage.json
```

**S0 PREFLIGHT v4 CARD:**
```
S0 PREFLIGHT v4
================
Inventory:        [E/D/A/H/S]
Built:            [N/N] ([%])
Drift:            [N envelopes]
Viz @:            [generatedAt]   age [min]
Tier floor map:   T0=<N>  T1=<wired/unwired>  T2=<N>  T3=<N>  T4=<N>  T5=<N>
Top unwired:      [top 5 domains by leverageScore]
Pending merges:   [cqask, cadquery]
```

### Stage 0.5 — SYSTEM PRESSURE & DEDUP INTERCEPT (same as v3)

`/dont-reinvent` re-fire + utilization gaps + capability census + consensus drain. The viz adds a **second dedup layer**: search `G.nodes` for any L4/L5 node whose label contains the proposed name (per directive Rule 9). HARD STOP if found.

### Stage 0.6 — SYSTEM-VIZ TIER-GATING (NEW IN v4 — HARD GATE)

This is what makes v4 atomic-first.

#### 0.6.A. Bind to `meta.roadmap.phases` as the canonical skeleton

Read the embedded array. Classify the brief into one or more phases:

| Brief flavor | Maps to phase |
|--------------|---------------|
| Reconcile envelope/git drift | Phase 0 |
| Add formulas/constants/algorithms/registries/schemas | Phase 1 |
| Wire unwired engines to dispatchers | Phase 2 |
| Merge cqask / mcp-cadquery / page-level integration | Phase 3 |
| Net-new engine or page that has no upstream gap | Phase 4 |

Multi-phase briefs decompose into per-phase sub-briefs in **strict ascending order**.

#### 0.6.B. Tier-floor enforcement matrix

For each candidate unit emitted by Stage 5 brainstorming:
```
unit.tier        = max tier of any artifact the unit creates
unit.prereq_tier = max tier the unit consumes
unit.gate        = (unit.prereq_tier full coverage in viz) ? PASS : BLOCK
```

If `unit.gate === BLOCK`:
- Push down by adding sub-units that fill the prereq, OR
- Defer to a separate milestone, OR
- Reject the unit.

Record the decision in `unit.tier_gate_resolution`.

#### 0.6.C. Wiring proposals come from `node.suggestedDispatchers`

For each Tier-1 wiring unit, the target dispatcher MUST be one of `node.suggestedDispatchers` on the matching graph node. Hand-picked dispatchers are rejected. If the graph offers no candidate, that's a Tier-0 schema gap — escalate to Phase 1.

#### 0.6.D. Within-tier ranking by `node.unlocks.leverageScore`

The exported `build-order` markdown is pre-sorted by leverageScore. v4 honors that order. Override only with explicit user reason recorded in `unit.ranking_override_reason`.

#### 0.6.E. Pending-merge nodes outrank net-new code

If any node has `status=pending_merge`, those go first within their tier (per directive Rule 6).

#### 0.6.F. Emit the v4 PHASE PLAN CARD

```
PHASE PLAN v4 (atomic-first)
=============================
Brief tier(s):        [list]
Tier floor:           [PASS/BLOCK]
Skeleton source:      meta.roadmap.phases @ [graph.generatedAt]
Candidate units:      [N total]
  Phase 0 drift:      [N]
  Phase 1 atomic:     [N]
  Phase 2 wire-up:    [N, sorted by leverageScore]
  Phase 3 merges:     [N]
  Phase 4 new-build:  [N (gated)]
Suggested dispatchers from graph: [N, never invented]
Leverage ranking:     [top 5 with score]
```

`Tier floor: BLOCK` → STOP, surface to user, do not advance.

### Stage 1 — Brief Analysis (v3 enhanced)

Same as v3.

### Stage 2 — Codebase Audit (v3 enhanced + V4 graph audit)

v3's codebase-memory layer + add:
```bash
node H:/prism/scripts/system-viz-query.mjs blast-radius <node-id-of-touched-engine>
```
For every engine the brief touches, dump its blast radius from the graph. This replaces the directive's previous note about "no more grep-by-symbol" with a concrete tool invocation.

### Stage 3 — Knowledge Source Mapping (same as v3)

### Stage 4 — Scope Estimation (same as v3)

### Stage 5 — Phase Decomposition (v3 enhanced + V4 BIND TO meta.roadmap.phases)

v3's DecisionReasoning + CounterfactualReasoning chain — apply per phase, not per ad-hoc grouping. Each session block now also lists:

```
TIER:                 0 | 1 | 2 | 3 | 4 | 5
PREREQ_TIER:          0 | 1 | 2 | 3 | 4 | 5 | null
ATOMIC_PHASE:         0 | 1 | 2 | 3 | 4
LEVERAGE_SCORE:       N
SUGGESTED_DISPATCHER: [verbatim from node.suggestedDispatchers[0]]
CONSUMES_NODE_IDS:    [graph node IDs the session reads]
PRODUCES_NODE_IDS:    [graph node IDs the session creates/extends]
```

Reject any session whose tier ≤ a downstream session's tier in the same milestone (you cannot "build the page before the engine" within a single milestone).

### Stage 6 — Unit Population (v3 enhanced + V4 GRAPH-SOURCED WIRING)

v3's CreativeReasoning + CrossDisciplinary chain. Each unit MUST carry the same v4 fields as Stage 5 (TIER, PREREQ_TIER, ATOMIC_PHASE, LEVERAGE_SCORE, SUGGESTED_DISPATCHER, CONSUMES_NODE_IDS, PRODUCES_NODE_IDS).

For Tier-1 wiring units specifically:
- `wire_count_target: 3-10` (small enough to verify)
- `expected_wired_delta: { domain: '<name>', count: <N> }` (will be checked at Phase 4J)
- `dispatcher_action_floor: { dispatcher: '<from suggestedDispatchers[0]>', new_actions: [...] }`

For Tier-4 frontend merge units:
- `source_repo: cqask | mcp-cadquery`
- `target_surface: mcp-server/web`
- `pages_merged: N`
- `prereq_engines_wired: [list]` (these MUST appear in the same milestone OR an upstream milestone)

### Stage 7 — Forge-Triple Ownership (same as v3)

### Stage 8 — Enforcement Integration (same as v3)

### Stage 9 — Dependency Resolution + SVI (v3 enhanced + V4 TIER ORDERING ENFORCEMENT)

v3's DAG validation + SVI compute. Add tier-ordering checks:

```
For every unit U in the milestone:
  For every dependency D in U.depends_on:
    Assert: D.tier <= U.tier   (cannot depend on something not-yet-built)
    Assert: D.atomic_phase <= U.atomic_phase   (cannot consume a later phase)
For every milestone M in the roadmap:
  For every dependency D in M.depends_on:
    Assert: D.headline_tier <= M.headline_tier
For the roadmap as a whole:
  Assert: Phase 4 units empty OR (Phase 0..3 gap pct < 10% across covered columns)
```

Any failure → reject the roadmap, return to Stage 5 with the specific tier violation surfaced.

### Stage 10 — Hybrid Scrutiny + 3-Way Consensus (v3 enhanced + AGENT 11)

v3's hybrid 5+5 + 3-way + conformal — unchanged structure, **plus Agent 11**:

**Agent 11: Atomic-First Compliance**

```
Reviews:
- Did every milestone use meta.roadmap.phases as its skeleton (no invented phases)?
- Did every Tier-1+ unit cite node.suggestedDispatchers (not hand-picked)?
- Did every wiring unit cite leverageScore (not arbitrary order)?
- Did the Tier Floor Gate pass at generation time?
- Did each unit's tier and prereq_tier line up correctly with its depends_on?
- Did the roadmap as a whole respect Phase 0 → 1 → 2 → 3 → 4 ordering?
- Are pending merges (cqask, mcp-cadquery) honored before net-new Tier-4 work?
- Are drift cases reconciled in Phase 0 (no roadmap should sail past unreconciled drift)?
- Is the leverage_score realism check present per Tier-1 unit (expected_wired_delta)?

Score 0–100 on atomic-first compliance.
```

Hybrid average target unchanged: **≥80**. Agent 11 has the same hard floor: **<40 = BLOCK**.

Token-economy audit + verdict recording (`/scrutinize-mark`) — same as v3.

### Stage 11 — Coordination + Output (same as v3)

Add: write the milestone's tier metadata into `roadmap-index.json` (`tier`, `atomic_phase`, `leverage_score`, `prereq_tier`) so future `/rgs4 status` and `/rgs4 list` can sort by tier.

### Stage 11.5 — CRON REGISTRATION & SKILL AUTO-CREATION (v3) + V4 VIZ-REFRESH CRON

v3's cron list unchanged. Add (idempotent — only register if absent in `cron-registry.json`):

```
schedule  hourly  node H:/prism/scripts/generate-system-viz.mjs
schedule  daily   node H:/prism/scripts/system-viz-query.mjs build-order > H:/prism/state/shared/system-viz/build-order.md
schedule  weekly  /rgs4 atomic-roadmap   # weekly master roadmap regen
```

Off the :00 / :30 minute marks per scheduling discipline.

---

## ROUTE: continue (v4 enhanced)

Same as v3 + add at unit claim time:

```bash
node H:/prism/scripts/generate-system-viz.mjs    # cheap; <5s
```

Then verify the unit's tier-floor still passes against the **current** graph (drift may have shifted since generation). If FAIL → defer the unit, refresh the milestone envelope, surface to user.

After the unit completes, run the **Phase 4J graph delta check** (per `/forge4` Phase 4J): regen the viz, diff coverage-by-domain, record the leverage-realized number in the unit's reasoning array. If the realized leverage is <80% of `expected_wired_delta`, flag the unit for review (the wiring claim was inflated).

---

## ROUTE: tier-check <unit-id>

Quick command: given an existing unit (or milestone ID), regenerate the viz and verify:
- The unit's prereq tier is still satisfied
- The unit's target node still exists (not removed by a prior milestone)
- The unit's suggested dispatcher still has capacity
- No new drift case has invalidated the unit's premise

Output:
```
TIER-CHECK <unit-id>
====================
unit.tier:           <N>
unit.prereq_tier:    <N>
prereq satisfied:    PASS | FAIL  (column: <name>, gap: <%>)
target node exists:  YES | NO
dispatcher capacity: PASS | FAIL  (current actions: <N> / 200)
drift impact:        none | invalidated by <milestone-id>
verdict:             PASS — proceed | BLOCK — defer or rewrite
```

---

## ROUTE: leverage-rank <domain>

For a given engine domain (e.g. "Lathe", "Other", "Machine"), list the suggested dispatchers + leverageScore so you can decide what to wire next:

```
LEVERAGE-RANK Lathe
====================
Unwired count:       106
Suggested dispatchers (verbatim from node.suggestedDispatchers):
  1. disp.turningdispatcher          (capacity: 87/200)
  2. disp.turningprogramdispatcher   (capacity: 41/200)
Leverage score:      212
Recommended unit:    Wire 6-10 highest-coupled Lathe engines into disp.turningdispatcher
Blast radius if you do this: <N> downstream nodes affected
```

---

## ROUTE: viz-refresh

Regenerate the graph and emit a coverage-by-domain delta vs the previous generation. Useful between milestones to spot leverage shifts without running a full `/rgs4 atomic-roadmap`.

## ROUTE: completeness-check (NEW — wraps the precondition checker)

Quick wrapper: `node H:/prism/.claude/scripts/system-viz-completeness-check.mjs`. Returns ok/block verdict + score 0-100 + per-check details + concrete fixes. Run before `/rgs4 atomic-roadmap` (or rely on its built-in precondition step).

```
COMPLETENESS-CHECK
===================
Verdict:  PASS | BLOCK
Score:    [N] / 100
Checks:   8 invariants (orphan rate, tier0 coverage, hook modeling, phase1 detector,
          dispatcher action modeling, drift, freshness, pending-merge visibility)
Blockers: [list with fix instructions]
```

---

## ROUTE: list (same as v3 + V4 columns)

Add columns: `tier`, `atomic_phase`, `leverage_score`. Sort by `(atomic_phase ASC, leverage_score DESC)` so the top-of-list is what to do next.

## ROUTE: plan (same as v3 + V4 columns)

Add the v4 fields: TIER, PREREQ_TIER, ATOMIC_PHASE, LEVERAGE_SCORE, SUGGESTED_DISPATCHER per session block.

## ROUTE: utilize (same as v3)

## ROUTE: status (same as v3)

Add: tier coverage map + atomic-first compliance average from the last N milestones.

## ROUTE: audit-coverage (v4 enhanced)

v3's coverage report + add:
- atomic-first compliance score across all milestones
- tier-skip violations detected
- phantom-leverage claims (units that claimed leverage but didn't move the wired count)
- stale-viz incidents (planning ran on a graph >30 min old)
- dead-pixel risk count (Tier-4 pages whose Tier-1 engine is unwired)
- merge-skipping incidents (new Tier-4 work while pending merges sit)

## ROUTE: meta-coverage (NEW in v3, v4 unchanged)

Recursive — what does v4 still miss? This drives the eventual v5 design.

## ROUTE: sync (same as v3)

---

## QUALITY STANDARD (v4 — supersedes v3's 43-item list)

Every roadmap MUST include all 43 v3 items PLUS:

44. **System-Viz Tier-Gating** at S0.6 with the Tier Floor Gate enforced.
45. **`meta.roadmap.phases` skeleton** — never invent phase names; bind to graph.
46. **`node.suggestedDispatchers`** — wiring proposals never hand-picked; verbatim from graph.
47. **`node.unlocks.leverageScore`** — within-tier ranking sourced from graph.
48. **Per-unit `expected_wired_delta`** for Tier-1 wiring units; checked at Phase 4J.
49. **Per-unit tier-floor recheck** at claim time (drift may shift since generation).
50. **Agent 11 Atomic-First Compliance** in the Stage 10 hybrid review (≥40 floor, contributes to ≥80 average).
51. **Pending-merge precedence** — cqask / mcp-cadquery merges scheduled before net-new Tier-4 work.
52. **Drift reconciliation in Phase 0** — every drift case in `BUILD_STATE.json` becomes one Phase 0 unit before any Phase 1+ work.
53. **Viz refresh post-milestone** — Phase 6K regenerates and commits `system-graph.json`.
54. **Viz drift cron** — hourly regen + daily build-order export registered (idempotent).
55. **Tier metadata in `roadmap-index.json`** — every milestone has `tier`, `atomic_phase`, `leverage_score`, `prereq_tier`.

---

## ANTI-PATTERNS TO REJECT (v4 — supersedes v3's list)

All v3 anti-patterns PLUS:

- **Tier-skipping**: proposing a Tier-N unit while Tier-(N-1) has an unfilled prereq column.
- **Phantom-leverage**: claiming a wiring unit is high-leverage without citing `node.unlocks.leverageScore`.
- **Invented-dispatcher**: hand-picking a dispatcher target instead of the graph's `node.suggestedDispatchers`.
- **Stale-viz**: planning from a graph >30 min old; regenerate first.
- **Dead-pixel**: building a Tier-4 page whose Tier-1 engine is unwired.
- **Drift-blind**: starting a new-build milestone while ≥3 envelope drift cases sit unreconciled.
- **Merge-skipping**: building a new frontend page while `cqask` or `mcp-cadquery` are pending merge.
- **Graph-bypass**: doing roadmap planning by Grep/Glob across the codebase when `system-viz-query.mjs` answers the question in one call.
- **Skeleton-invention**: writing a roadmap with hand-named phases instead of binding to `meta.roadmap.phases`.
- **Realism-skip**: Tier-1 wiring unit without `expected_wired_delta`; cannot verify leverage prediction post-execution.
- **Atomic-blindness in continue**: claiming a unit at Phase 4 without rechecking the tier floor against the current graph.

---

## END STATE

```
RGS v4 GENERATE COMPLETE
=========================
Milestone:           [ID] — [title]
Atomic phase:        [0..4]   Tier: [0..5]   Prereq tier: [0..5 or none]
Leverage score:      [N]
Pipeline:            15 stages (S0 → S0.5 → S0.6 → S1..S11 → S11.5)
Quality:             Hybrid 11-agent avg [score] · Conformal [%] · 3-way PASS
                     Agent 11 atomic-first [score] · Anti-drift [N] checkpoints clean
Methodology:         [N] superpowers skills mapped per session
Codebase intel:      [N] codebase-memory queries
System-viz:          generated @ [ts] · tier floor PASS · suggested dispatchers cited [N]
Token economy:       Ollama offload [%] · Claude tokens [N]
Coordination:        Linear [issue] · Wiki [+N] · Memory [+M WRITE] · Handoff written
                     Cron [N] · Skills auto-created [N] · Github PR [link]
Surface coverage:    ~50% (v4 target — vs v3 ~40%, v2 ~15%, v1 ~4%)
Build:               PASS · Tests [N] · Ω=[X] · S(x)=[X]

Deliverables:
  Engines / Dispatchers / Hooks / Skills / Tests / Memories / Wiki / Crons: [lists]
  Atomic-first scoreboard:
    leverage_predicted:  [N]
    leverage_realized:   [M]   delta_pct: [±%]
    tier_floor_blocks:   [N]
    drift_reconciled:    [N]
    pending_merges_done: [N]

Next: /rgs4 continue [milestone-id] | /rgs4 atomic-roadmap | /forge4 [next idea] | /weekly-synthesis (auto-cron)
```

```
RGS v4 ATOMIC-ROADMAP COMPLETE
===============================
Wrote:          H:/prism/PRISM-MASTER-ROADMAP-<date>-atomic.md
Source:         meta.roadmap.phases @ <generatedAt>
Phases:         0 (drift, [N] units) | 1 (atomic, [N]) | 2 (wire-up, [N]) | 3 (merges, [N]) | 4 (new-build, [gated/N])
Milestones:     [N] envelopes written to data/milestones/
Tier-checks:    [N PASS / N FAIL]   (FAILs surfaced, do not enter the roadmap)
Coverage delta: tracked from prior gen — wired [old→new], unwired [old→new], pending [old→new], drift [old→new]
Cron:           weekly /rgs4 atomic-roadmap registered (idempotent)

Next: claim Phase 0 first → /pick-task — every chat starts with drift reconciliation before touching any engine.
```

---

## RELATIONSHIP TO v1/v2/v3

| Skill | Surface coverage | Key add over predecessor |
|-------|-----------------|--------------------------|
| /rgs | ~4% | original 10-stage pipeline |
| /rgs2 | ~15% | knowledge layer + hybrid scrutiny + anti-pattern rejections |
| /rgs3 | ~40% | superpowers + codebase-memory + S0.5 dedup intercept + S11.5 cron + memory WRITE |
| **/rgs4** | **~50%** | **System-Viz tier-gating (S0.6), atomic-roadmap route, Agent 11, leverage-realized check, viz refresh post-milestone** |

v4 is **strictly additive** over v3. Use v4 for:
- Master-roadmap synthesis (`atomic-roadmap` route)
- Any milestone touching multiple tiers
- Any milestone proposing new engines/dispatchers/pages

v3 still works for self-contained internal refactors with no tier crossings.

---

## COMPANION SKILLS

- `/forge4` — uses `/rgs4 generate` and `/rgs4 atomic-roadmap` as its Phase 3 engine
- `/system-viz` — opens the live viewer (port 8765) for human inspection
- `/envelope-sync` — drift reconciliation (Phase 0 unit work)
- `/workboard` — see all 6 chats' state
- `/sync-rebase` — pre-commit conflict prevention
- `/claim-phase` — claim a phase (atomic level)

---

## 🔭 V5 POINTER (open gap inventory — for future /rgs5 design)

v4 closes the system-viz tier-gating gap **and adds the completeness self-check** (added 2026-05-08 as `system-viz-completeness-check.mjs`; wired into atomic-roadmap as a hard precondition). Known v5-track gaps (run `/rgs4 meta-coverage` to refresh):

1. **Schema-evolution layer** — atomic-first ordering doesn't yet trace into `mcp-server/src/schemas/*.ts` versioning. A Tier-0 schema bump should auto-flag every consumer that needs migration. Today: manual bookkeeping in `state/shared/schema-version-bumps.md`.
2. **Cross-tier conformal calibration** — `expected_wired_delta` is a single integer per Tier-1 unit; v5 could attach a conformal interval (e.g. `[3, 7]` engines) that tightens over runs as the realism bias is learned.
3. **Dead-pixel auto-detection** — v4 anti-pattern flags "Tier-4 page whose Tier-1 engine is unwired" but no automated sweep. v5 candidate: a `system-viz-query.mjs dead-pixels` adapter that lists every Tier-4 node whose Tier-1 prereqs include unwired engines.
4. **Persona-tier ROI** — Tier-5 (UX/persona) work has no leverageScore equivalent. v5 could add `node.persona_unlocks` from operator/programmer/manager workflow coverage and rank Tier-5 work like Tier-1.
5. **Closed-loop wiring telemetry** — Phase 4J graph delta records leverage-realized but doesn't auto-promote tribal/wiki entries when a wire-up unit hits expected_wired_delta exactly. Manual `/wiki-ingest` today; v5 could auto-fire.
6. **Drift root-causing** — Phase 0 reconciles drift but doesn't prevent recurrence. v5 candidate: a "drift-cause" classifier that learns from each reconciliation (envelope outdated vs git incomplete vs claim never updated) and feeds back into Stop-hook prevention.
7. **Multi-roadmap merging** — when 2+ chats run `/rgs4 atomic-roadmap` against the same graph at different times, the resulting roadmap files don't merge. v5: deterministic regen + diff merge.
8. **Tier-floor calibration** — v4 uses a fixed 90% prereq-coverage threshold. v5 could learn the right threshold per domain (Lathe may need 95%, Shop may tolerate 80%) from observed wire-up failures.
9. **Live overlay diffing** — `/rgs4 viz-refresh` emits coverage-by-domain delta but no per-node delta (which specific engine got wired). v5: graph-diff helper for blast-radius-aware change tracking.

These are deliberately deferred. v5 ships when 3+ cause real friction. For now, v4's atomic-first contract is the highest-leverage bind PRISM has.
