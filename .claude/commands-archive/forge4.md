---
name: forge4
description: Forge v4 — v3 + System-Viz atomic-first tier-gating. Phase 0.6 binds the live system-viz graph as the dependency oracle; Phase 3 inherits the canonical meta.roadmap.phases skeleton; Phase 4 enforces a per-unit tier-floor check; Phase 6 regenerates the viz so the next iteration sees the new wiring. Default forge command for any work that touches the master roadmap.
---

---
effort: high
maxTurns: 50
policy:
  tier: 4
  triggers:
    - "forge4"
---

# Forge v4 — Atomic-First Pipeline

v4 is **v3 + the System-Viz layer** (per `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`). v3 covered ~40% of the dev surface but treated phase ordering as freeform; v4 binds it to the live 10-layer graph so every milestone is generated from the lowest tier on up. **Default to v4** when generating or revising the master roadmap, when proposing new engines/dispatchers/pages, or when reasoning about blast radius — otherwise v3 still applies.

v4 inherits **everything** in v3 unchanged (EXHAUSTIVE SCIENCE LAW, SAFETY-CRITICAL TEST LAW, ANTI-DRIFT KARPATHY CHECKPOINT, CONTEXT BUDGET POLL, advisor strategy, the 14-stage `/rgs3` delegation, the 4-LOOP, hybrid 5+5 + 3-way scrutiny, memory WRITE, cron registration, skill auto-creation). Read `H:/.claude/commands/forge3.md` for the v3 baseline.

This file documents only the **additive v4 layer**: the system-viz tier-gating that turns v3's ordering hints into hard rules.

## Args: $ARGUMENTS
A brief description of what to build, fix, or improve.
- `/forge4 generate the master atomic roadmap from current system state`
- `/forge4 close the unwired-engine backlog by domain leverage`
- `/forge4 merge cqask + mcp-cadquery frontends`
- `/forge4 add 5-axis compensation to the safety chain`

If the brief is "generate the master roadmap" or any roadmap synthesis, **delegate the heavy lifting to `/rgs4 atomic-roadmap`** — that route writes `PRISM-MASTER-ROADMAP-<date>-atomic.md` directly from the viz.

---

## ATOMIC-FIRST BUILD LAW (HARD RULE — applies to every roadmap unit)

Per `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` §"Atomic-First Build Principle":

```
Tier 0 (L6–L9): physics constants, formulas, algorithms, registries, schemas, hooks, scripts, fs
Tier 1 (L5)   : engines (3,173 — 2269 wired = 72%, 898 unwired)
Tier 2 (L3–L4): dispatchers (97), AI hierarchy (12)
Tier 3 (L2)   : transport (REST, WS, auth, rate-limit, telemetry)
Tier 4 (L1)   : frontends + 144 pages (cqask + mcp-cadquery merges pending)
Tier 5 (L0)   : personas (UX validation last)
```

**Build the lowest tier first. Each tier consumes the one beneath. Never start a higher-tier feature while its lower-tier blocks are missing.**

Building one Tier-0 atomic primitive cascades upward: unlocks 5–20 Tier-1 engines → 1–4 Tier-2 dispatchers → Tier-3 actions → N Tier-4 pages → every Tier-5 persona. Conversely, building a Tier-4 page first when its Tier-1 engine is unwired produces a **dead pixel** — exactly the failure mode for the 38 specialty pages we may already have in this state.

The viz visualizes this directly via overlays: Atomic (`6`), Cascade (`7`), Suggestions (`8`), Target-state (`9`), Roadmap export (`M`).

---

## TIER FLOOR GATE (HARD RULE — blocks higher-tier work)

For any unit at Tier-N, **all Tier-(N-1) prerequisites must be ≥90% complete in the same vertical column**. Specifically:

- **Tier-1 (engine) work** is allowed when its Tier-0 atomic prereqs (constants, formulas, algorithm libs, hook surfaces it relies on) exist on disk.
- **Tier-2 (dispatcher wiring) work** requires the Tier-1 engine to exist and ship with real tests against published data.
- **Tier-3 (transport) work** requires the Tier-2 dispatcher action to be schema-stable (zod schema committed, action enum registered).
- **Tier-4 (frontend page) work** requires the Tier-3 action contract frozen.
- **Tier-5 (persona) work** requires the Tier-4 page rendered end-to-end.

If a higher-tier unit is proposed without the lower-tier floor in place, **the unit is rejected at Phase 3 generation and at Phase 4 claim time**. The fix is either (a) lower the tier of the proposed unit until prereqs are met, or (b) push the prereqs into the same milestone as upstream sub-units that run first.

The viz `meta.roadmap.phases[].tier` and `node.tier` fields are the authoritative oracle. Never override by hand.

---

## PHASE 0 — PREFLIGHT (v3) + V4 SYSTEM-VIZ BIND

Run all v3 §0A–0D preflight scripts unchanged. Then add:

### 0A.viz — Refresh + load the system-viz graph (MANDATORY)

```bash
# Regenerate the graph from current filesystem + BUILD_STATE
node H:/prism/scripts/generate-system-viz.mjs

# Pull canonical atomic-first phase skeleton + headline state
node H:/prism/scripts/system-viz-query.mjs build-order > /tmp/atomic-phases.md
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json > /tmp/roadmap-candidates.json
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json > /tmp/coverage-by-domain.json
node H:/prism/scripts/system-viz-query.mjs dispatcher-summary --json > /tmp/dispatcher-summary.json
```

If any command fails (script missing, port collision, regen error) the preflight FAILS — do not proceed. v4 is non-functional without the viz.

### 0B.viz — Read graph headline into the preflight card

Parse `H:/prism/state/shared/system-viz/system-graph.json` → emit:

```
SYSTEM-VIZ HEADLINE
====================
Generated:        [graph.generatedAt]  (must be <30 min stale or regenerate above)
Engines wired:    [meta.headline.built] / [meta.counts.engines]  ([%] coverage)
Unwired domains:  [top-10 by leverageScore from coverage-by-domain]
Pending merges:   [list from G.nodes where status=pending_merge]
Drift cases:      [meta.headline.drift]  (envelope vs git)
Tier floor map:   T0=[count] T1=[wired/unwired] T2=[count] T3=[count] T4=[count] T5=[count]
```

The TIER FLOOR MAP is what every subsequent phase will gate against.

---

## PHASE 0.5 — INTELLIGENCE ROUTING (same as v3) + DEDUP INTERCEPT

Same as v3 unchanged. The viz adds one extra dedup signal:

### 0.5.viz — Don't propose engines that already exist in the graph

Before any new-engine proposal, search the graph:
```js
const G = JSON.parse(fs.readFileSync('H:/prism/state/shared/system-viz/system-graph.json','utf8'));
const proposedName = '<EngineName>';
const exists = G.nodes.find(n => (n.layer === 'L5' || n.layer === 'L4') && (n.label?.toLowerCase().includes(proposedName.toLowerCase()) || n.id?.toLowerCase().includes(proposedName.toLowerCase())));
if (exists) {
  // STOP — extend the existing node instead of creating new
}
```

Per directive Rule 9: "Don't propose duplicate engines. Search the graph; if any L4/L5 node label contains the proposed name, extend the existing one."

---

## PHASE 0.6 — SYSTEM-VIZ TIER-GATING (NEW IN v4 — HARD GATE)

**This phase is what makes v4 atomic-first.**

### 0.6.A. Bind to `meta.roadmap.phases` as the canonical skeleton

Read the embedded `meta.roadmap.phases` array from `system-graph.json`. This is the canonical 5-phase atomic-first skeleton (Phase 0 drift → Phase 1 atomic foundation → Phase 2 wire-up → Phase 3 pending merge → Phase 4 new build), pre-populated with the real candidate list from current state.

For the brief at hand, **classify which phase(s) the work falls into**:

| Brief flavor | Maps to phase |
|--------------|---------------|
| Reconcile envelope/git drift | Phase 0 |
| Add formulas/constants/algorithms/registries/schemas | Phase 1 |
| Wire unwired engines to dispatchers | Phase 2 |
| Merge cqask / mcp-cadquery / page-level integration | Phase 3 |
| Net-new engine or page that has no upstream gap | Phase 4 |

If the brief spans phases, decompose into per-phase sub-briefs and run them in **strict ascending order** — never start Phase N work until Phase N-1 is <10% gap.

### 0.6.B. Tier-floor enforcement matrix

For each candidate unit emitted by v3 Phase 2 (Brainstorm), compute:

```
unit.tier        = max tier of any artifact the unit creates
unit.prereq_tier = max tier the unit consumes
unit.gate        = (unit.prereq_tier full coverage in viz) ? PASS : BLOCK
```

If `unit.gate === BLOCK`, either (a) push down by adding sub-units that fill the prereq, or (b) defer until a separate milestone closes the gap. Record the decision in the unit envelope.

### 0.6.C. Use `node.suggestedDispatchers` for wiring proposals (don't invent)

Per directive Rule 4: "Don't invent target dispatchers — the generator already proposed 3 candidates per unwired domain by name + category match." For each Tier-1 unit that wires an engine, the unit's wiring proposal MUST come from `node.suggestedDispatchers` on the matching graph node. If the graph offers no candidate, that's a Tier-0 schema gap — escalate to Phase 1 instead.

### 0.6.D. Rank by `node.unlocks.leverageScore`

Per directive Rule 5: highest leverage (engineCount × dispatcherTargets) wins. Within the same tier, sort proposed units by descending leverageScore. The exported `build-order` markdown is already pre-sorted; v4 honors that order.

### 0.6.E. Pending-merge nodes outrank net-new code

Per directive Rule 6: a merge unblocks already-built work; new code creates more unwired engines. If any node has `status=pending_merge`, those go first within their tier.

### 0.6.F. Emit the v4 PHASE PLAN CARD

```
PHASE PLAN v4 (atomic-first)
=============================
Brief tier(s):        [list, e.g. T0+T1 → 1 Phase 1 sub-brief, 3 Phase 2 sub-briefs]
Tier floor:           [PASS/BLOCK with explanation]
Skeleton source:      meta.roadmap.phases @ [graph.generatedAt]
Candidate units:      [N total]
  Phase 0 drift:      [list of envelope reconciliations]
  Phase 1 atomic:     [list of constant/formula/registry units]
  Phase 2 wire-up:    [list of engine→dispatcher wirings, sorted by leverageScore]
  Phase 3 merges:     [cqask/cadquery sub-units if relevant]
  Phase 4 new-build:  [list — only if Phases 0-3 are <10% gap]
Suggested dispatchers from graph: [count, never invented]
Leverage ranking:     [top 5 with score]
```

If `Tier floor: BLOCK` → STOP and surface to user. Do not advance to Phase 1.

---

## PHASE 1 — SMART + KNOWLEDGE QUERY (same as v3)

No v4 changes. Phase 0.6 already constrained the candidate set; Phase 1 just frames the smart config + knowledge query within that set.

---

## PHASE 2 — BRAINSTORM (same as v3) + V4 GRAPH-AWARE PRUNING

After v3's creative reasoning emits 3 approaches, prune any approach whose units violate the Tier Floor Gate. Reject silently — do not present blocked approaches to the user. If all 3 approaches are blocked, escalate to v3 Phase 1 with a sub-brief one tier lower.

---

## PHASE 2B — TOOLKIT CARD (v3) + V4 ADDITIONS

Same v3 categories PLUS:

| Tier | New v4 entries |
|---|---|
| **System-Viz** | `/system-viz`, `system-viz-query.mjs build-order`, `system-viz-query.mjs roadmap-candidates`, `system-viz-query.mjs blast-radius <id>`, `system-viz-query.mjs coverage-by-domain`, `system-viz-query.mjs dispatcher-summary` |
| **Tier oracle** | `node.tier`, `node.unlocks.leverageScore`, `node.suggestedDispatchers`, `meta.roadmap.phases` |
| **Drift reconciliation** | `/envelope-sync`, `MILESTONE_PROGRESS.md`, `BUILD_STATE.md` |
| **Frontend merge** | `/forge-app-wire`, `/forge-mcp-wire`, `cqask-orion-cad`, `mcp-cadquery-frontend` |

---

## PHASE 3 — GENERATE MILESTONE (delegates to /rgs4 generate)

Delegates to `/rgs4 generate` (v3's 14-stage pipeline + S0.6 System-Viz Tier-Gating + S10's new Agent 11 Atomic-First Compliance). Same return contract as v3 + new fields:

```
generated.atomic_phase:         0 | 1 | 2 | 3 | 4
generated.tier:                 0 | 1 | 2 | 3 | 4 | 5
generated.prereq_tier:          0 | 1 | 2 | 3 | 4 | 5 | null
generated.tier_floor_passed:    true | false  (must be true to write envelope)
generated.suggested_dispatchers: [from node.suggestedDispatchers]
generated.leverage_score:       N
generated.consumes_node_ids:    [graph node IDs the unit reads]
generated.produces_node_ids:    [graph node IDs the unit creates/extends]
```

If `generate` is invoked with `--master` flag (or the brief is "the master roadmap"), `/rgs4` switches to its `atomic-roadmap` route which emits `PRISM-MASTER-ROADMAP-<date>-atomic.md` from the viz directly.

---

## PHASE 4 — EXECUTE (v3) + V4 PER-UNIT TIER-FLOOR CHECK

Same v3 4-LOOP. Add at unit claim time:

### 4A.viz — Tier-floor recheck before claim

Before claiming a unit, regenerate the viz (cheap; under 5s):
```bash
node H:/prism/scripts/generate-system-viz.mjs
```

Then verify:
- The unit's `prereq_tier` artifacts still exist in the graph (they may have been removed since generation)
- No drift case has appeared that would invalidate the unit's premise
- The wiring target dispatcher (`node.suggestedDispatchers[0]`) still has capacity (action enum length < 200; route registry not full)

If the recheck FAILS, do not claim. Surface to the user, defer the unit, refresh the milestone envelope.

### 4B–4I. Same as v3 unchanged.

### 4J.viz — Per-unit graph delta (NEW)

After each unit completes, regenerate the viz and capture the delta:
```bash
node H:/prism/scripts/generate-system-viz.mjs
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json > /tmp/coverage-after-U-XXX.json
diff /tmp/coverage-by-domain.json /tmp/coverage-after-U-XXX.json
```

Record the delta in the unit's reasoning array (e.g. `wired_count: 2269 → 2273; unwired-Other: 148 → 144`). This is the leverage-realized signal — if it didn't move, the unit didn't actually wire what it claimed.

---

## PHASE 5 — CONSENSUS SCRUTINY (v3) + V4 ATOMIC-FIRST AGENT

v3 hybrid 5+5 + 3-way unchanged. Add **Agent 11: Atomic-First Compliance** to the hybrid review:

```
Agent 11: Atomic-First Compliance
Reviews:
- Did every unit use meta.roadmap.phases as its skeleton (no invented phases)?
- Did every Tier-1+ unit cite node.suggestedDispatchers (not hand-picked)?
- Did every wiring unit cite leverageScore (not arbitrary order)?
- Did the Tier Floor Gate pass at generation time AND at claim time?
- Did the Phase 4J graph delta confirm the leverage prediction (within ±20%)?
- Did the milestone advance one tier or multiple? (Mixed-tier milestones must justify with sub-unit ordering.)
Score 0–100 on atomic-first compliance.
```

Hybrid average target unchanged: ≥80. Agent 11 has the same hard floor as the others (no agent <40).

---

## PHASE 6 — HANDOFF + KNOWLEDGE PERSIST (v3) + V4 VIZ-REFRESH

Same v3 6A–6J. Add:

### 6K.viz — Regenerate + commit the viz post-milestone

```bash
node H:/prism/scripts/generate-system-viz.mjs
node H:/prism/scripts/system-viz-query.mjs build-order > H:/prism/state/shared/system-viz/build-order.md
git add H:/prism/state/shared/system-viz/system-graph.json H:/prism/state/shared/system-viz/build-order.md
git commit -m "[VIZ-REFRESH] post-[milestone-id]: tier coverage [old]→[new], unwired [old]→[new]"
```

This ensures the next forge/rgs session starts from the new state — no drift between what the viz shows and what's on disk.

### 6L.viz — Cron-register a viz drift watcher (NEW)

Once per repository (idempotent), register:
```
schedule  hourly  node H:/prism/scripts/generate-system-viz.mjs
schedule  daily   node H:/prism/scripts/system-viz-query.mjs build-order > H:/prism/state/shared/system-viz/build-order.md
```

These keep the viewer fresh for any concurrent chat doing planning. Skip if already registered (check `H:/prism/state/shared/cron-registry.json` first).

---

## PROGRESS REPORTING (v4 expanded)

```
FORGE v4 PROGRESS
==================
P0   Preflight v3:    PASS — [counts] · system [PASS/WARN] · consensus drained [N]
P0.viz Bind:          graph @ [generatedAt] · [%] coverage · TIER FLOOR map [T0..T5]
P0.5 Routing:         [TaskClass] → [Backend]
P0.5.viz Dedup:       graph search [hits / clean]
P0.6 Tier-Gating:     [PASS/BLOCK] · phases mapped [0..4] · [N] candidate units
P1 Smart+Know+Code:   [wiki/mem/tribal/playbook/formula] hits · codebase-memory ran
P2 Brainstorm:        3 approaches · [N] tier-blocked · selected [name]
P2B Toolkit:          methodology [N] · automation [N] · monitoring [N] · system-viz [N]
P3 Generate:          /rgs4 returned [milestone-ID] · 15-agent scrutiny [score]
P4 Execute:           [X]/[Y] units · per-unit tier-recheck [N PASS] · graph delta [+W wired]
P5 Consensus:         Hybrid 11-agent avg [score] · 3-way [P/F-P/F-P/F] · Agent 11 atomic [score]
P6 Handoff:           Wiki [+N] · Memory [+M WRITE] · cron [N] · viz refreshed + committed

Current Unit: [unit-id] (T[N])  Ralph Iter: [N]  Build: [PASS/FAIL]
Tier floor:   [PASS]  Leverage realized: predicted [N], actual [M] ([±%])
```

---

## SESSION BUDGET

Same as v3. Plus: re-generate the viz at every Phase 0.6, Phase 4A.viz, and Phase 6K.viz call (3 mandatory regenerations per milestone — total <30s overhead).

---

## END STATE

```
FORGE v4 COMPLETE
==================
Milestone:           [ID] — [title]
Atomic phase:        [0..4]   Tier:    [0..5]   Prereq tier: [0..5 or none]
Units:               [X]/[Y]
Tier floor:          PASS at generation AND every claim
Phases:              0–6 executed (v4 enhancements at 0A.viz, 0.5.viz, 0.6, 4A.viz, 4J.viz, 5 Agent 11, 6K.viz, 6L.viz)
Quality:             Hybrid 11-agent avg [score] · Conformal [%] · 3-way PASS · Agent 11 atomic [score]
Build:               PASS  ·  Tests: [N] passing  ·  Ω=[X]  ·  S(x)=[X]
Token economy:       Ollama offload [%]  ·  Claude tokens [N]
System-viz delta:    wired [old→new]  ·  unwired [old→new]  ·  pending [old→new]  ·  drift [old→new]
Coordination:        Linear [issue] · Wiki [+N] · Memory [+M WRITE] · Handoff written
                     Cron [N] · Skill auto-created [Y/N] · Viz refreshed + committed
Surface coverage:    ~50% (v4 target — vs v3 ~40%, v2 ~15%, v1 ~4%)

Deliverables:
  Engines / Dispatchers / Hooks / Skills / Tests: [lists]
  Memories WRITTEN: [N at H:/prism/knowledge/memories/]
  Wiki entries INGESTED: [N at H:/prism/knowledge/wiki/]
  Skills AUTO-CREATED: [list]
  Crons REGISTERED: [list]
  Anti-drift checkpoints: [N — clean]
  Atomic-first scoreboard:
    leverage_predicted:  [N]
    leverage_realized:   [M]   delta_pct: [±%]
    tier_floor_blocks:   [N]   (units pushed down or deferred)

Next: /forge4 [next idea]  |  /rgs4 atomic-roadmap  |  /pick-task <next-unit-id>  |  /system-viz (review state)
```

---

## ANTI-PATTERNS TO REJECT (v4 — supersedes v3's list)

All v3 anti-patterns PLUS:

- **Tier-skipping**: proposing a Tier-N unit while Tier-(N-1) has an unfilled prereq column. The viz shows it; honor it.
- **Phantom-leverage**: claiming a wiring unit is high-leverage without citing `node.unlocks.leverageScore`.
- **Invented-dispatcher**: hand-picking a dispatcher target instead of the graph's `node.suggestedDispatchers`.
- **Stale-viz**: planning from a graph >30 min old; regenerate first.
- **Dead-pixel**: building a Tier-4 page whose Tier-1 engine is unwired (the 38-page risk).
- **Drift-blind**: starting a new-build milestone while ≥3 envelope drift cases sit unreconciled.
- **Merge-skipping**: building a new frontend page while `cqask` or `mcp-cadquery` are still pending merge (Tier-4 capacity is starved).
- **Graph-bypass**: doing roadmap planning by Grep/Glob across the codebase when `system-viz-query.mjs` has the same answer in one call.
- **Skeleton-invention**: writing a roadmap with hand-named phases instead of binding to `meta.roadmap.phases` from the graph.
- **Refresh-skipping**: completing a milestone without regenerating the viz (Phase 6K) — next session plans from stale state.

---

## RELATIONSHIP TO v1/v2/v3

| Skill | Surface coverage | Key add over predecessor |
|-------|-----------------|--------------------------|
| /forge | ~4% | original brainstorm→plan→iterate |
| /forge2 | ~15% | knowledge layer, hybrid scrutiny, anti-pattern rejections |
| /forge3 | ~40% | superpowers methodology, codebase-memory, automation/monitoring/analysis, memory WRITE, cron, anti-drift |
| **/forge4** | **~50%** | **System-Viz tier-gating, atomic-first ordering, leverage scoring, Agent 11, viz-refresh post-milestone** |

v4 is **strictly additive** over v3. If you're tempted to use v3 because v4 feels heavyweight, ask: "is this work touching the master roadmap or proposing new tier-spanning artifacts?" If yes, v4. If it's a self-contained internal refactor with no tier crossings, v3 is fine.

---

## QUICK REFERENCE

```bash
# Refresh + load viz
node H:/prism/scripts/generate-system-viz.mjs
node H:/prism/scripts/system-viz-query.mjs build-order

# Roadmap candidates (atomic-first JSON)
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json

# Coverage by domain (which Tier-1 areas are most lagging)
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain --json

# Blast radius for a refactor
node H:/prism/scripts/system-viz-query.mjs blast-radius <nodeId>

# Dispatcher capacity (avoid wiring into a near-full one)
node H:/prism/scripts/system-viz-query.mjs dispatcher-summary

# View graph live (port 8765)
# /system-viz   # opens viewer; press 6 (atomic), 7 (cascade), 8 (suggestions), 9 (target-state), M (export roadmap)
```

---

## 🔭 V5 POINTER (open gap inventory — for future /forge5 design)

v4 closes the system-viz tier-gating gap. Known v5-track gaps (from `/rgs4 meta-coverage` analysis):

1. **Schema-evolution layer** — atomic-first ordering doesn't yet trace into `mcp-server/src/schemas/*.ts` versioning. A Tier-0 schema bump should auto-flag every consumer that needs migration. Today: manual bookkeeping.
2. **Cross-tier conformal calibration** — `expected_wired_delta` is a single integer per Tier-1 unit; v5 could attach a conformal interval (e.g. `[3, 7]` engines) that tightens over runs.
3. **Dead-pixel auto-detection** — v4 anti-pattern flags "Tier-4 page whose Tier-1 engine is unwired" but no automated sweep over the 38 specialty pages. v5 candidate: `system-viz-query.mjs dead-pixels` adapter.
4. **Persona-tier ROI** — Tier-5 (UX/persona) work has no leverageScore equivalent. v5 could add `node.persona_unlocks` from operator/programmer/manager workflow coverage.
5. **Closed-loop wiring telemetry** — Phase 4J graph delta records leverage-realized but doesn't auto-promote tribal/wiki entries when a wire-up unit hits expected_wired_delta exactly. Manual `/wiki-ingest` today; v5 could auto-fire.
6. **Drift root-causing** — Phase 0 reconciles drift but doesn't prevent recurrence. v5 candidate: a "drift-cause" classifier that learns from each reconciliation (envelope outdated vs git incomplete vs claim never updated).
7. **Multi-roadmap merging** — when 2+ chats run `/rgs4 atomic-roadmap` against the same graph at different times, the resulting roadmap files don't merge. v5: deterministic regen + diff merge.

These are deliberately deferred. v5 ships when 3+ of these cause real friction. For now, v4's atomic-first contract is the highest-leverage bind PRISM has.
