---
name: forge5
description: Forge v5 — v4 + tool-discipline at every phase + compounding-gains tax. Every step in every phase names the EXACT tool to use. Every forge run MUST emit at least one reusable dev-velocity artifact (tool/script/skill/hook/digest/index/helper) before completion. Strictly additive over v4.
---

---
effort: high
maxTurns: 50
policy:
  tier: 5
  triggers:
    - "forge5"
---

# Forge v5 — Tool-Disciplined + Compounding-Gains

v5 inherits **everything** from v4 (Atomic-First Build Law, Tier Floor Gate, system-viz precondition, 6-chat synergy contract, viz-progress-update at every unit, auto-wire-plan, chat-cleanup-on-stop, all v3+v2+v1 hard rules).

Read `H:/.claude/commands/forge4.md` for v4 baseline. v5 documents only the delta.

## Args: $ARGUMENTS
A brief description of what to build, fix, or improve. Same shape as v4. Examples:
- `/forge5 wire the Lathe domain unwired engines (106 candidates)`
- `/forge5 close the 3 envelope drift cases via /envelope-sync`
- `/forge5 merge cqask + mcp-cadquery frontends into mcp-server/web`

## TWO LAWS INHERITED FROM RGS5 (HARD RULES)

### TOOL-DISCIPLINE LAW

Every step in every phase below names the EXACT tool / skill / dispatcher / script / hook / digest. Generic verbs ("search the codebase", "find duplicates", "validate wiring") are forbidden — replace with concrete tool prescription.

The full forbidden→required mapping is in `/rgs5` §TOOL-DISCIPLINE LAW. Read it once, apply per phase below.

### COMPOUNDING-GAINS LAW

Every forge run MUST emit ≥1 reusable dev-velocity artifact (tool / script / skill / hook / digest / index / helper / wiki entry) that the NEXT forge run can leverage. The artifact must be META — not the run's primary deliverable.

Audit gate fires at Phase 6 handoff (NEW v5 sub-phase 6L: compounding-gains-audit).

---

## PHASE 0 — PREFLIGHT (v4 baseline + v5 tool prescription)

```bash
# Tool: update-prism-inventory.mjs            — refresh PRISM-INVENTORY-LATEST.md
# Tool: build-state-snapshot.mjs              — refresh BUILD_STATE.json
# Tool: build-milestone-progress.mjs          — refresh MILESTONE_PROGRESS.json
# Tool: audit-unwired-engines.mjs             — refresh UNWIRED-ENGINE-AUDIT-*.json
# Tool: stable-session-id.mjs                 — chat identity (NEVER $PPID)
# Tool: prism-awareness-bundle.mjs            — refresh CLAUDE-BRIEF + BUILD-CONTEXT + VISION
# Tool: generate-system-viz.mjs               — refresh system-graph.json (peer's lane — read-only invocation)
# Tool: system-viz-completeness-check.mjs     — gate atomic-roadmap precondition
# Tool: viz-progress-update.mjs status        — see ghost-node state
# Tool: auto-wire-plan.mjs --status           — see auto-wire queue
```

Run all in parallel via single Bash message. Output the v5 PREFLIGHT CARD which adds:

```
PREFLIGHT v5
=============
... (v4 fields) ...
Compounding ledger: [N] cumulative artifacts | velocity ratchet +[X]% over baseline
Available tools:    [N] skills · [N] hooks · [N] scripts · [N] dispatchers · [N] digests
Mandatory artifact emission this run: planned (must produce ≥1 by Phase 6)
```

## PHASE 0.5 — DEDUP INTERCEPT (tool prescription)

```bash
# Tool: /dont-reinvent
# Tool: prism_dev:duplicate_check
# Tool: duplicationGuardEngine.mustCheckBeforeCreating()
# Tool: /code-index
```

If ≥80% overlap → STOP. The compounding-gains principle ALSO applies negatively here: if an existing engine ≥80% covers the brief, the work is duplicate, no new artifact is needed.

## PHASE 0.6 — SYSTEM-VIZ TIER-GATING (v4 — tool-prescribed)

Same as v4. Add:

```bash
# Tool: viz-progress-update.mjs claim --phase ... --owner ...
# (after tier-floor PASS, before any unit work)
```

## PHASE 1 — SMART + KNOWLEDGE QUERY (v3+v4 + v5 tool list)

| Goal | Tool |
|---|---|
| Frame brief intent | `Skill: superpowers:brainstorming` (MUST USE per frontmatter) |
| Architecture orientation | `Skill: codebase-memory-exploring` (search_graph) |
| Impact map | `Skill: codebase-memory-tracing` (trace_call_path) |
| Smart config | `Skill: smart` |
| Knowledge query | `Tool: wiki/index.md` → `Tool: MEMORY.md` → `Tool: TribalKnowledgeEngine` → `Tool: MachiningPlaybookEngine` → `Tool: FormulaRegistry` |
| External library docs | `MCP: context7` (if library is external) |
| Multi-session plan | `Skill: superpowers:writing-plans` |

## PHASE 2 — BRAINSTORM (v4 + v5 tool list)

| Goal | Tool |
|---|---|
| Cross-domain synthesis | `Engine: prismCreativeReasoningEngine.explore("optimal")` |
| 15-domain synthesis | `Engine: CrossDisciplinaryDeepLearningEngine.synthesize` |
| Counterfactuals | `Engine: CounterfactualReasoningEngine.generate(n=2)` |
| Predictive impact | `Skill: /foresight` |
| Karpathy reasoning | `Skill: /karpathy` |
| Capability gaps | `MCP: prism_dev:utilization_gaps` |

## PHASE 2B — TOOLKIT CARD (v3+v4 + v5: per-domain tool registry)

For each domain in the brief, emit a TOOLKIT CARD with EVERY tool to be invoked:

```
TOOLKIT v5 — [domain]
=====================
Search:        ENGINE_DIGEST.md → /code-index → /forge-engines (in priority order)
Build:         superpowers:test-driven-development → /forge-triple
Wire:          /forge-wiring → suggestedDispatchers from system-viz
Validate:      /forge-safety → /scrutinize → physics-verify → /test-coverage
Track:         viz-progress-update.mjs (claim/tick/built/wired/complete)
Compact:       compaction-budget-nudge (60%/80% auto-trigger)
Emit:          ≥1 of [tool/script/skill/hook/digest/wiki/helper]
```

## PHASE 3 — GENERATE (delegates to /rgs5 generate)

`/rgs5 generate` runs the 16-stage pipeline (15 v4 + S11.6 compounding gate). Every step gets the v5 `tool:` field in the unit envelope.

## PHASE 4 — EXECUTE (v4 + v5 per-step tool nudges)

For each unit:

### 4A. Pre-unit
```bash
# Tool: viz-progress-update.mjs tick --phase ... --unit ...
# (every unit start — pulse the ghost node)
```

### 4B. The 4-LOOP — each LOOP names the tool

**LOOP 1 BUILD:**
- Tool: `superpowers:test-driven-development` for engine creation
- Tool: `sparc:coder` for code-heavy units
- Tool: `sparc:tester` for test-heavy units
- Tool: `physics-verify` for physics engines
- Tool: `/forge-safety` for safety-critical paths

**LOOP 2 SCRUTINIZE:**
- Tool: `/prism-review` (multi-role review)
- Tool: `/scrutinize` (single-chat review)
- Tool: `superpowers:systematic-debugging` if bugs found
- Tool: `superpowers:requesting-code-review` if peer review needed

**LOOP 3 GAP FILL:**
- Tool: `/test` (verify all coverage classes)
- Tool: `/trace` (impact analysis)
- Tool: `/forge-tests` (gap discovery)

**LOOP 4 TIE UP:**
- Tool: `/simplify` (reuse + quality cleanup)
- Tool: `superpowers:verification-before-completion`
- Tool: `de-sloppify`

### 4C. Post-unit
```bash
# Tool: viz-progress-update.mjs tick --phase ... --unit ... --note "..."
# Tool: rtk vitest run                        — verify tests pass
# Tool: rtk npm run build:fast                — verify build clean
# Tool: system-viz-query.mjs coverage-by-domain --json   — verify expected delta
```

### 4D. Anti-drift checkpoint (every 5 units)
- Tool: `Skill: karpathy` (the 4-question discipline)
- Tool: `/context-budget` (token economy)

### 4E. Phase complete
```bash
# Tool: viz-progress-update.mjs built
# Tool: auto-wire-plan.mjs --phase ...
# (if queued: continue with auto-wire units)
# Tool: viz-progress-update.mjs wired
# Tool: phase-claim-manager.mjs ready
```

## PHASE 5 — CONSENSUS SCRUTINY (v4 + Agent 12)

Hybrid 12-agent review (v3's 5+5 hybrid + Agent 11 atomic + **NEW Agent 12 tool-discipline**).

Tools:
- `Tool: scrutiny-3way.mjs` (Codex+Gemini parallel)
- `Tool: Agent({subagent_type:'reviewer'})` (Opus arm)
- `Tool: /scrutinize-mark` (record verdicts)
- `Tool: /peer-review` (cross-chat in 6-chat synergy)
- `Tool: analysis:token-usage` (audit scrutiny round token spend)

## PHASE 6 — HANDOFF + KNOWLEDGE PERSIST + COMPOUNDING-GAINS AUDIT

### 6A. Per-agent handoff
- Tool: `node H:/prism/.claude/helpers/per-agent-handoff.mjs write --terminal "$STABLE" --topic ... --resume ...`

### 6B. Wiki ingest
- Tool: `/wiki-ingest --auto`

### 6C. Memory WRITE
- Tool: `MCP: prism_session:memory_save`
- Tool: `node H:/prism/.claude/helpers/sync-memory.mjs`

### 6D. Skill auto-creation (if pattern compounded)
- Tool: `Skill: skill-creator:skill-creator`

### 6E. Cron registration
- Tool: `Skill: /schedule`

### 6F. Github layer (if PR workflow)
- Tool: `Skill: github:pr-manager` (or swarm-pr / code-review-swarm)

### 6G. Token economy report
- Tool: `node H:/prism/scripts/ollama-offload-dashboard.mjs --window=session`
- Tool: `Skill: analysis:token-efficiency`

### 6H. Error-learn loop
- Tool: `Skill: error-learn-review`

### 6I. Coordination broadcast
- Tool: `node H:/prism/.claude/helpers/agent-coordination.mjs post`

### 6J. Final viz refresh + commit-prep
- Tool: `node H:/prism/scripts/generate-system-viz.mjs`
- Tool: `node H:/prism/scripts/system-viz-query.mjs build-order > state/shared/system-viz/build-order.md`

### 6K. Cron-register viz drift watcher (idempotent)
- Tool: `Skill: /schedule`

### 6L. **COMPOUNDING-GAINS AUDIT (NEW v5 — HARD GATE)**

```bash
# Tool: compounding-gains-audit.mjs --milestone <id>
node H:/prism/.claude/scripts/compounding-gains-audit.mjs --milestone "$MILESTONE"
```

If audit returns BLOCK (zero artifacts emitted):
- Tool: `/rgs5 emit-tooling <milestone-id>` — get 3+ candidate artifacts
- Pick one, add as a unit, run Phase 4 for it
- Re-run 6L

If audit returns PASS:
- Tool: append to `state/shared/compounding-gains-ledger.json`
- Tool: `agent-coordination.mjs post --status compounding-pass --message "+N artifacts, +X% velocity"`

## PROGRESS REPORTING (v5 expanded)

```
FORGE v5 PROGRESS
==================
P0   Preflight v4:        PASS — [counts] · system [PASS/WARN] · consensus drained [N]
P0.viz   Bind:             graph @ [generatedAt] · TIER FLOOR map · ledger [N] cumulative
P0.5     Routing+Dedup:    [TaskClass] → [Backend] · graph search [hits/clean]
P0.6     Tier-Gating:      [PASS/BLOCK] · [N] candidate units · viz-progress claim posted
P1       Smart+Know+Code:  toolkit card emitted with [N] tools per domain
P2       Brainstorm:       3 approaches · selected [name] · counterfactuals [N]
P2B      Toolkit:          [N] tools mapped per domain (search/build/wire/validate/track/compact/emit)
P3       Generate:         /rgs5 returned [milestone-ID] · 12-agent scrutiny [score] · Agent 12 tool-discipline [score]
P4       Execute:          [X]/[Y] units · per-unit viz tick logged · auto-wire [N queued / N executed]
P5       Consensus:        Hybrid 12-agent avg [score] · 3-way [P/F-P/F-P/F] · Agent 11 atomic [score] · Agent 12 tool [score]
P6       Handoff:          Wiki [+N] · Memory [+M WRITE] · cron [N] · github PR [link]
P6L      Compounding:      [N] artifacts emitted · cumulative [M] · velocity ratchet +[X]% (PASS/BLOCK)

Current Unit: [unit-id] (T[N], step S[NN])  Ralph Iter: [N]  Build: [PASS/FAIL]
Tools used this turn: [list]  Wrong-tool flags: [N]  Generic-verb flags: [N]
```

## END STATE

```
FORGE v5 COMPLETE
==================
Milestone:           [ID] — [title]
Atomic phase:        [0..4]   Tier:    [0..5]   Prereq tier: [0..5 or none]
Units:               [X]/[Y]
Tools used:          [N] distinct tools across all steps
Tool-discipline:     PASS — every step had a tool: prescription, no generic verbs
Compounding-gains:   PASS — emitted [N] reusable artifact(s):
                       Tools:   [list]
                       Scripts: [list]
                       Skills:  [list]
                       Hooks:   [list]
                       Digests: [list]
                       Wiki:    [list]
                       Helpers: [list]
                     Time-saved estimate: ~[N] min per future milestone
                     Velocity ratchet:    +[X]% (running cumulative)
Quality:             Hybrid 12-agent avg [score] · 3-way PASS · Agent 11 [score] · Agent 12 [score]
Build:               PASS · Tests [N] · Ω=[X] · S(x)=[X]
Surface coverage:    ~60% (v5 target — vs v4 ~50%, v3 ~40%, v2 ~15%, v1 ~4%)
System-viz delta:    wired [old→new] · unwired [old→new] · pending [old→new] · drift [old→new]

Deliverables (PRIMARY — milestone's core output):
  Engines / Dispatchers / Hooks / Skills / Tests: [lists]

Deliverables (META — compounding-gains artifacts):
  [list of dev-tools that future milestones will leverage]

Coordination:
  Linear [issue] · Wiki [+N] · Memory [+M WRITE] · Handoff written
  Cron [N] · Skills auto-created [N] · Github PR [link]

Next: /forge5 [next idea]  |  /rgs5 atomic-roadmap  |  /rgs5 compounding-audit (see trajectory)
```

---

## ANTI-PATTERNS TO REJECT (v5 — supersedes v4's list)

All v4 anti-patterns PLUS the v5 anti-patterns from `/rgs5`:

- Tool-blind, generic-verb-pollution, index-bypass, phantom-tool, miscategorized tool
- Compounding-blind, self-counting emission, trivial-emission gaming, ledger-skip

---

## RELATIONSHIP TO v1/v2/v3/v4

| Skill | Coverage | Key add |
|---|---|---|
| /forge | ~4% | original |
| /forge2 | ~15% | knowledge layer + scrutiny |
| /forge3 | ~40% | superpowers + codebase-memory |
| /forge4 | ~50% | system-viz + tier-gating + 6-chat synergy + viz-progress + auto-wire |
| **/forge5** | **~60%** | **per-step tool: prescription + compounding-gains tax + Agent 12 + 6L audit gate** |

v5 is **strictly additive** over v4. Default to v5 when:
- Building infrastructure (the artifact emission compounds the most)
- Running 6-chat synergy (each chat emits ≥1 artifact = 6 artifacts per round)
- Master-roadmap atomic-roadmap synthesis

Use v4 only when the work is genuinely a one-off with no expected dev-velocity emission (rare).

---

## QUICK REFERENCE

```bash
# v5 routes
/forge5 <brief>                                 # full v5 pipeline
/rgs5 toolkit-audit <milestone-id>              # verify per-step tool: fields
/rgs5 compounding-audit                         # cumulative dev-velocity
/rgs5 emit-tooling <milestone-id>               # propose reusable artifacts

# Live ops (inherited from v4)
node viz-progress-update.mjs claim|tick|built|wired|complete|release
node auto-wire-plan.mjs --phase <id>
node system-viz-completeness-check.mjs
node compounding-gains-audit.mjs --milestone <id>
```

## V6 POINTER

Same as `/rgs5` §V6 POINTER. v6 ships when 3+ of those gaps cause real friction.
