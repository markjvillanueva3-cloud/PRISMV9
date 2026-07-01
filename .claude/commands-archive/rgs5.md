---
name: rgs5
description: RGS v5 — v4 + tool-discipline + compounding-gains. Every step in every stage of every unit names the EXACT tool / skill / dispatcher / script to use, with rejection conditions if the wrong tool is used. New compounding-gains tax — every milestone MUST emit at least one reusable dev-velocity artifact (tool/script/skill/hook/digest/index) that downstream milestones can leverage. Stage S11.6 audits the artifact + ledger tracks cumulative dev-velocity gain.
---

---
policy:
  tier: 5
  triggers:
    - "rgs5"
---

# RGS v5 — Tool-Disciplined + Compounding-Gains

v5 inherits **everything** from v4 unchanged (Atomic-First Build Law, Tier Floor Gate, system-viz precondition check, 6-chat consensus, 3-way LLM, Agent 11 atomic compliance, all v3 + v2 + v1 hard rules). v5 adds two new laws and one new stage.

Read `H:/.claude/commands/rgs4.md` for the v4 baseline. v5 documents only the delta.

## Args: $ARGUMENTS
All v4 routes PLUS:

- **`toolkit-audit <milestone-id>`** (NEW): for any milestone, verify every step has a `Tool:` field, the tool is in the registry, and the prescription matches the step's class (search → index, build → engine, validate → safety, etc.).
- **`compounding-audit`** (NEW): summarize cumulative dev-velocity gain across all milestones. Reports tools/scripts/skills/hooks emitted per milestone, time-saved estimate per artifact, ratchet trajectory.
- **`emit-tooling <milestone-id>`** (NEW): given a milestone, propose ≥1 dev-velocity artifact it should emit before completion. Reads the milestone's domain + checks for known-missing tools per /forge-audit.

## TWO NEW LAWS

### TOOL-DISCIPLINE LAW (HARD RULE — applies to every step of every unit)

**Every step must name the exact tool / script / dispatcher / skill / hook to use, NOT a generic action.**

Forbidden generic verbs:
- ❌ "search the codebase" → ✅ "Tool: codebase-memory-exploring (search_graph)" OR "Tool: Grep --type ts"
- ❌ "find duplicates" → ✅ "Tool: duplicationGuardEngine.mustCheckBeforeCreating()" OR "Tool: prism_dev:duplicate_check"
- ❌ "check the inventory" → ✅ "Tool: PRISM-INVENTORY-LATEST.md" OR "Tool: prism_dev:inventory_list"
- ❌ "validate the wiring" → ✅ "Tool: /forge-wiring" OR "Tool: stop-auto-wire.mjs"
- ❌ "run the tests" → ✅ "Tool: rtk vitest run --reporter=dot"
- ❌ "build the project" → ✅ "Tool: rtk npm run build:fast"
- ❌ "lookup the formula" → ✅ "Tool: FormulaRegistry" OR "Tool: src/physics/constants.ts"
- ❌ "search the wiki" → ✅ "Tool: wiki/index.md (722 entries)" OR "Tool: /wiki-query <name>"
- ❌ "find an engine" → ✅ "Tool: ENGINE_DIGEST.md (mcp-server/data/docs/)" OR "Tool: /code-index lookup E####"

Each unit step in v5 envelopes carries the form:

```yaml
- step_id: U-XXX-S01
  description: <action>
  tool: <exact tool / skill / dispatcher / script>
  input: <what the tool consumes>
  output: <what the tool produces>
  reject_if: <conditions that mean wrong tool was used>
  compounding_gain: <what future milestones get from this step>
```

If a step lacks `tool:` or names a generic verb, the milestone is **rejected at S6** (unit population) and **S10 Agent 12** (NEW — see below) flags it as TOOL-DISCIPLINE-VIOLATION.

### COMPOUNDING-GAINS LAW (HARD RULE — applies to every milestone)

**Every milestone MUST emit at least one reusable dev-velocity artifact that downstream milestones can leverage.**

Acceptable emission classes:
- **Tool / script** — `H:/prism/.claude/scripts/<name>.mjs` or `H:/prism/scripts/<name>.mjs` (callable from any chat)
- **Skill** — `H:/.claude/commands/<name>.md` or `H:/prism/.claude/commands/<name>.md`
- **Hook** — `H:/prism/.claude/hooks/<name>.mjs` (wired into settings.json)
- **Digest / index** — `H:/prism/mcp-server/data/docs/<NAME>_DIGEST.md` or `state/shared/<NAME>.json`
- **Wiki entry** — `H:/prism/knowledge/wiki/<category>/<slug>.md`
- **Helper module** — `H:/prism/.claude/helpers/<name>.mjs` (shared across hooks/skills)
- **Engine** — production engine wired into a dispatcher (counts only if it has zero existing equivalents AND has actions in ≥2 dispatchers)

NOT acceptable:
- ❌ Documentation-only (markdown notes that no script reads)
- ❌ One-off bash command in a unit step
- ❌ Test fixtures used only by one test file
- ❌ Engines that are the milestone's PRIMARY deliverable (those don't count — the artifact must be META: tooling that helps build the next milestone faster)

Audit:
- **At S11.6 (NEW)**: verify the emission count ≥1 and document the time-saved estimate
- **At completion**: log to `state/shared/compounding-gains-ledger.json` for trajectory tracking
- **At /rgs5 compounding-audit**: aggregate ledger to surface the velocity ratchet curve

The forcing function: PRISM gets ≥1 new dev-tool per milestone. After 50 milestones, the system has 50+ tools that prior milestones could have used. The ratchet is monotonic — every milestone makes the next milestone faster.

---

## ROUTE: generate — 16-Stage v5 Pipeline (v4's 15 + S11.6)

### S0 PREFLIGHT — tool-prescribed
v4 preflight unchanged. Each preflight script call gets a `Tool:` annotation:

```bash
# Tool: update-prism-inventory.mjs (regenerates PRISM-INVENTORY-LATEST.md)
node H:/prism/scripts/update-prism-inventory.mjs --quiet

# Tool: build-state-snapshot.mjs (regenerates state/shared/BUILD_STATE.json)
node H:/prism/scripts/build-state-snapshot.mjs

# Tool: build-milestone-progress.mjs (regenerates MILESTONE_PROGRESS.json — drift truth)
node H:/prism/scripts/build-milestone-progress.mjs

# Tool: audit-unwired-engines.mjs
node H:/prism/scripts/audit-unwired-engines.mjs

# Tool: stable-session-id.mjs (NEVER use $PPID — see feedback_handoff_topic_naming)
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)

# Tool: prism-awareness-bundle.mjs (regenerates 3-doc awareness backbone)
node H:/prism/.claude/helpers/prism-awareness-bundle.mjs

# Tool: generate-system-viz.mjs (peer's lane — DO NOT modify)
node H:/prism/scripts/generate-system-viz.mjs

# Tool: system-viz-completeness-check.mjs (mine — gates atomic-roadmap)
node H:/prism/.claude/scripts/system-viz-completeness-check.mjs
```

### S0.5 DEDUP INTERCEPT — tool-prescribed

```bash
# Tool: /dont-reinvent (skill — semantic search across engines/actions/patterns)
/dont-reinvent

# Tool: prism_dev:duplicate_check (MCP action — strict name+description match)
prism_dev:duplicate_check --name="<proposed>" --description="<prop>"

# Tool: duplicationGuardEngine.mustCheckBeforeCreating() (THROWS on dup)
node -e "import('H:/prism/mcp-server/dist/engines/DuplicationGuardEngine.js')..."

# Tool: /code-index (DSL shortcode lookup — fastest)
/code-index lookup <shortcode>
```

If ANY tool flags ≥80% overlap with existing → STOP, propose using existing.

### S0.6 SYSTEM-VIZ TIER-GATING — tool-prescribed

```bash
# Tool: system-viz-query.mjs build-order
node H:/prism/scripts/system-viz-query.mjs build-order

# Tool: system-viz-query.mjs roadmap-candidates --json
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json

# Tool: viz-progress-update.mjs status (NEW — shows ghost-node state)
node H:/prism/.claude/scripts/viz-progress-update.mjs status
```

### S1 BRIEF ANALYSIS — tool-prescribed

```bash
# Tool: superpowers:brainstorming (REQUIRED — frontmatter says MUST USE)
Skill: superpowers:brainstorming

# Tool: codebase-memory-tracing (impact analysis — NOT Grep for symbols)
Skill: codebase-memory-tracing

# Tool: superpowers:writing-plans (multi-session implementation)
Skill: superpowers:writing-plans
```

### S2 CODEBASE AUDIT — tool-prescribed

| Search target | Tool (in priority order) |
|---|---|
| Existing engine | 1. ENGINE_DIGEST.md → 2. /code-index → 3. /forge-engines → 4. codebase-memory-exploring (last resort: Grep) |
| Existing dispatcher action | 1. DISPATCHER_DIGEST.md → 2. prism_session:action_search → 3. /action-search |
| Existing formula | 1. FormulaRegistry → 2. src/physics/constants.ts → 3. /formula-browse |
| Existing algorithm | 1. /algorithm-inspect → 2. AlgorithmRegistry |
| Existing hook | 1. /hook-browse → 2. settings.json scan |
| Existing skill | 1. /commands → 2. /commands-audit |
| Existing wiki entry | 1. wiki/index.md → 2. /wiki-query |
| Existing memory | 1. MEMORY.md → 2. /memory-search |
| Existing tribal tip | 1. TribalKnowledgeEngine → 2. /shop-knowledge |
| Existing AI capability | 1. capability-manifest → 2. /capabilities |

**Reject if:** any S2 step uses Grep/Glob without first consulting the index ABOVE Grep in the priority order. Index-first is the law.

### S3 KNOWLEDGE SOURCE MAPPING — tool-prescribed

For each knowledge class, name the source-of-truth file:

```yaml
engines: ENGINE_DIGEST.md (mcp-server/data/docs/)
dispatchers: DISPATCHER_DIGEST.md
formulas: FormulaRegistry @ src/registries/FormulaRegistry.ts
constants: src/physics/constants.ts (canonical kc1.1 per ISO group)
algorithms: src/registries/AlgorithmRegistry.ts (60+ algorithms)
tribal: TribalKnowledgeEngine + src/data/*-cam-tips.ts (4,245 tips)
playbook: MachiningPlaybookEngine (296 rules)
machines: MachineRegistry (910 machines)
materials: MaterialRegistry
tools: ToolCatalogEngine (95,608 tools)
reference: EXTERNAL-REFERENCE-PROGRAMS-INDEX.md
wiki: wiki/index.md (722 entries) + wiki/<category>/
memories: MEMORY.md + knowledge/memories/<type>/
```

### S4 SCOPE ESTIMATION — tool-prescribed

```bash
# Tool: analysis:performance-bottlenecks (predict bottleneck classes)
Skill: analysis:performance-bottlenecks

# Tool: team-budget (token budget for agent dispatch)
Skill: team-budget

# Tool: conformal effort estimator (existing v3 utility)
node H:/prism/.claude/scripts/conformal-effort-estimate.mjs --units N
```

### S5 PHASE DECOMPOSITION — tool-prescribed

```bash
# Tool: sparc:architect (when ≥2 architectural decisions in milestone)
Skill: sparc:architect

# Tool: sparc:orchestrator (when ≥3 agents per session)
Skill: sparc:orchestrator

# Tool: meta.roadmap.phases (graph skeleton — NEVER invent phases)
fs.readFileSync('H:/prism/state/shared/system-viz/system-graph.json').meta.roadmap.phases
```

### S6 UNIT POPULATION — tool-prescribed (NEW STRUCTURED FORM)

Every unit MUST be populated as:

```yaml
unit_id: U-<DOMAIN><NN>
title: <imperative>
tier: <0..5>
prereq_tier: <0..5 or null>
atomic_phase: <0..4>
leverage_score: <N>

steps:
  - step_id: U-XXX-S01
    description: "Look up existing <thing>"
    tool: ENGINE_DIGEST.md
    input: <thing-name>
    output: <existing engines list with line counts>
    reject_if: "step uses Grep without consulting digest first"
    compounding_gain: "future S2 audits in this domain reference this engine list"

  - step_id: U-XXX-S02
    description: "Build <X>"
    tool: superpowers:test-driven-development (RED-GREEN-REFACTOR)
    input: <test cases — happy + 3 failure modes + 2 adversarial>
    output: <engine.ts + engine.test.ts>
    reject_if: "tests use toBeDefined() OR toBeGreaterThan(0)"
    compounding_gain: "TDD pattern propagates to next domain milestone"

  - step_id: U-XXX-S03
    description: "Wire <X> into <dispatcher>"
    tool: /forge-wiring (validates wiring) + dispatcher z.enum
    input: <engine name + suggestedDispatcher from system-viz>
    output: <import + action enum + zod schema + lazy_import + round-trip test>
    reject_if: "any of (import|action enum|schema|lazy_import|round-trip) missing"
    compounding_gain: "wiring count increments — viz auto-tracks delta"

  - step_id: U-XXX-S04
    description: "Update viz ghost node"
    tool: viz-progress-update.mjs built --phase <id> --produced <engine>
    input: <phase id + engine name>
    output: <state/shared/roadmap-ghosts.json patched>
    reject_if: "viz coverage delta does not match expected_wired_delta ± 20%"
    compounding_gain: "ghost ledger grows — peer chats see real-time progress"

exit_criteria:
  - <measurable, references specific tool output>
  - ...

rollback:
  files_created: [...]
  files_modified: [...]
  abort_criteria: [<3+ measurable conditions>]
  rollback_procedure: <git commands>
```

**Tool field is REQUIRED on every step.** No exceptions.

### S7 FORGE-TRIPLE OWNERSHIP — same as v4

### S8 ENFORCEMENT INTEGRATION — tool-prescribed (expanded list)

```yaml
mandatory_enforcement_hooks:
  pre_tool_use:
    - duplicationGuardEngine (HARD BLOCK on dup)
    - file-claim-guard (HARD BLOCK on peer-claimed file)
    - inventory-check-guard (advisory)
    - master-index-search-gate (advisory)
    - h-drive-enforcement (HARD BLOCK on C: writes)
  post_tool_use:
    - compaction-budget-nudge (60%/80% nudge)
    - hook-schema-audit (verifies hook output JSON validity)
  stop:
    - scrutinize-before-stop (HARD BLOCK without 3-of-3 review)
    - chat-cleanup-on-stop (NEW v5 — orphan reaper)
    - enforce-handoff-topic
    - stop-auto-wire (advisory on unwired engines)
    - stop_on_unwired_assets (HARD BLOCK on zero-dispatcher orphans)
  pre_compact:
    - precompact-handoff (writes per-chat handoff)
    - precompact-pending-guard (armed by /precompact)
    - claude-brief-precompact
    - octopus-provider-probe
```

### S9 DEPENDENCY RESOLUTION + SVI — tool-prescribed

```bash
# Tool: optimization:auto-topology (rebuild DAG if cycles detected)
Skill: optimization:auto-topology

# Tool: conflict-predictor.mjs (pre-commit conflict simulation)
node H:/prism/.claude/helpers/conflict-predictor.mjs check --base=main --json

# Tool: phase-claim-manager.mjs workboard (live state across 6 chats)
node H:/prism/.claude/helpers/phase-claim-manager.mjs workboard
```

### S10 HYBRID SCRUTINY + 3-WAY CONSENSUS — tool-prescribed + AGENT 12

v4's Agent 11 (Atomic-First Compliance) — unchanged.

**NEW Agent 12: Tool-Discipline Compliance**

```yaml
reviews:
  - Did every unit step have a tool: field?
  - Did every tool: field name a real (not invented) tool from the registry?
  - Did the tool match the step class? (search → index, build → engine, validate → safety, etc.)
  - Did any step use Grep/Glob without consulting the priority-ordered index first?
  - Did any step use a generic verb without naming the tool?
score: 0-100 on tool-discipline
hard_floor: <40 = BLOCK
contributes_to_avg: ≥80 hybrid average
```

Hybrid review is now **12 agents** (5 Claude + 5 Ollama + Agent 11 + Agent 12).

### S11 COORDINATION + OUTPUT — same as v4

### S11.5 CRON + SKILL AUTO-CREATION — same as v4

### S11.6 COMPOUNDING-GAINS GATE (NEW IN v5 — HARD STAGE)

This is the v5 forcing function.

#### 11.6.A. Audit emitted artifacts

```bash
# Tool: compounding-gains-audit.mjs (NEW — see emit + ledger)
node H:/prism/.claude/scripts/compounding-gains-audit.mjs --milestone <id>
```

Output:
```
COMPOUNDING-GAINS AUDIT — <milestone>
======================================
Tools emitted:    [N] (paths)
Scripts emitted:  [N]
Skills emitted:   [N]
Hooks emitted:    [N]
Digests emitted:  [N]
Wiki entries:     [N]
Helpers:          [N]
Total:            [N]

Time-saved estimate: ~[N] minutes per future milestone using these
Velocity ratchet:    +[X]% over baseline (running total)

Verdict: PASS (≥1 reusable artifact) | BLOCK (zero artifacts)
```

#### 11.6.B. If BLOCK: propose tooling

```bash
# Tool: emit-tooling proposal (NEW route)
/rgs5 emit-tooling <milestone-id>
```

Returns ≥3 candidate dev-velocity artifacts the milestone could emit. The milestone owner picks one and adds it as a unit before re-running S11.6.

#### 11.6.C. Update ledger

`state/shared/compounding-gains-ledger.json` is appended:

```json
{
  "milestone": "<id>",
  "completed_at": "<iso>",
  "emitted": {
    "tools": [...],
    "scripts": [...],
    "skills": [...],
    "hooks": [...],
    "digests": [...],
    "wiki": [...],
    "helpers": [...]
  },
  "time_saved_estimate_min": <N>,
  "cumulative_artifacts": <N>,
  "velocity_ratchet_pct": <X>
}
```

#### 11.6.D. Surface to chat bus

```bash
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --agent compounding-gate \
  --status pass \
  --lane "milestone=$ID" \
  --message "Milestone $ID emitted N reusable artifacts; cumulative dev-velocity +X%"
```

---

## ROUTE: toolkit-audit <milestone-id> (NEW)

For any milestone, verify every step has `tool:` and the tool is real.

```bash
node H:/prism/.claude/scripts/toolkit-audit.mjs --milestone <id>
```

Output:
```
TOOLKIT AUDIT — <milestone>
============================
Total steps:           [N]
Steps with tool:       [N]    ([%])
Tool resolution rate:  [%]    (tool exists in registry)
Generic-verb steps:    [N]    (red flags)
Index-bypass steps:    [N]    (Grep used before digest)

Per-step report:
  U-XXX-S01  ✓ tool: ENGINE_DIGEST.md (resolves)
  U-XXX-S02  ✗ tool: <missing>           ← FAIL
  U-XXX-S03  ⚠ tool: "search the codebase" ← generic, replace with concrete tool
```

## ROUTE: compounding-audit (NEW)

```bash
node H:/prism/.claude/scripts/compounding-gains-audit.mjs --all
```

Aggregates the ledger across all completed milestones:
- Total artifacts emitted (all classes)
- Velocity trajectory (line-chart-ready data)
- Top 10 highest-leverage emissions (most-reused by downstream milestones)
- Per-milestone artifact count + time-saved
- Cumulative dev-velocity ratchet (% improvement over baseline)

Output a markdown summary + JSON to `state/shared/compounding-trajectory.json`.

## ROUTE: emit-tooling <milestone-id> (NEW)

Proposes ≥3 dev-velocity artifacts the milestone could emit. Reads the milestone's domain + checks /forge-audit findings + matches against known-missing tools per `state/shared/COMPOUNDING-CANDIDATES.md` (a curated list of "tools we wish we had").

---

## QUALITY STANDARD (v5 — supersedes v4's 55-item list)

Every roadmap MUST include all 55 v4 items PLUS:

56. **Tool: field on every step** — no generic verbs, no "search the codebase"
57. **Tool resolution check** — every named tool exists in the registry
58. **Index-first discipline** — Grep/Glob only after consulting the priority-ordered index
59. **Compounding-gains tax** — every milestone emits ≥1 reusable artifact
60. **S11.6 audit** — emitted artifacts logged to ledger; cumulative ratchet tracked
61. **Agent 12 Tool-Discipline Compliance** — 12-agent hybrid review (was 11)
62. **emit-tooling proposal** — every BLOCK at S11.6 produces 3+ candidate artifacts
63. **Ledger maintenance** — `state/shared/compounding-gains-ledger.json` appended on every milestone close
64. **Velocity trajectory tracking** — `/rgs5 compounding-audit` produces a public trajectory chart

---

## ANTI-PATTERNS TO REJECT (v5 — supersedes v4's list)

All v4 anti-patterns PLUS:

- **Tool-blind**: a step that says "search the codebase" or "find existing" without naming the tool
- **Generic-verb-pollution**: using "search", "validate", "build" without an exact tool prescription
- **Index-bypass**: jumping to Grep/Glob when an index exists for the search class
- **Phantom-tool**: naming a tool that doesn't exist in the skill/hook/script registry
- **Miscategorized tool**: using `/forge-perf` for a search task, or `Grep` for a build task
- **Compounding-blind**: a milestone with zero reusable-artifact emission ("just engines, no tools")
- **Self-counting emission**: claiming the milestone's primary deliverable as the compounding artifact (the artifact must be META — it helps build the NEXT milestone, not the current one)
- **Trivial-emission gaming**: emitting a 3-line script that nothing will ever use just to pass S11.6 (auditor flags low-leverage emissions)
- **Ledger-skip**: closing a milestone without updating `compounding-gains-ledger.json`

---

## RELATIONSHIP TO v1/v2/v3/v4

| Skill | Surface | Key add over predecessor |
|---|---|---|
| /rgs | ~4% | original 10-stage pipeline |
| /rgs2 | ~15% | knowledge layer + hybrid scrutiny |
| /rgs3 | ~40% | superpowers + codebase-memory + S0.5 dedup + S11.5 cron |
| /rgs4 | ~50% | system-viz tier-gating + atomic-roadmap + Agent 11 |
| **/rgs5** | **~60%** | **tool-discipline (per-step Tool: prescription) + compounding-gains tax (S11.6) + Agent 12 + emit-tooling + compounding ledger** |

v5 is **strictly additive** over v4. Use v5 when:
- The roadmap is the master atomic roadmap (always)
- Any milestone touching dev-tooling, scripts, hooks, skills, digests
- Any milestone that should ratchet dev-velocity
- Any 6-chat synergy run (compounding-gains compounds 6x faster across 6 chats)

v4 still works for self-contained internal refactors with no expected dev-velocity emission.

---

## QUICK REFERENCE

```bash
# v5-headline routes
/rgs5 atomic-roadmap                        # delegates to v4 atomic-roadmap, then runs S11.6 across all emitted milestones
/rgs5 toolkit-audit <milestone-id>          # verify per-step tool: prescriptions
/rgs5 compounding-audit                     # cumulative dev-velocity ratchet
/rgs5 emit-tooling <milestone-id>           # propose reusable artifacts

# Inherited from v4
/rgs4 atomic-roadmap                        # generate master roadmap from system-viz
/rgs4 tier-check <unit-id>                  # tier-floor recheck
/rgs4 leverage-rank <domain>                # wire leverage by domain
/rgs4 viz-refresh                           # refresh + delta

# Inherited from v3
/rgs3 brainstorm <topic>                    # superpowers + MXU + codebase-memory
/rgs3 generate <brief>                      # 14-stage pipeline
/rgs3 meta-coverage                         # v3→v4 gap report
```

## COMPANION SKILLS

- `/forge5` — work-execution lens (same v5 deltas, applied to brainstorm→plan→iterate)
- `/six-chat-bootstrap` — fire 6 chats; v5 ensures each chat operates under tool-discipline
- `/six-chat-commit-consensus` — Agent 12 included in 12-agent hybrid review
- `/run-continuous` — every step now references the tool used (toolkit-audit-friendly)
- `/peer-review` — checks Agent 12 Tool-Discipline as part of the 8-check rubric (already covers it)
- `/system-viz` — read-only graph viewer; ghost nodes show compounding-gains progress

## V5 V6 POINTER

Known v6-track gaps (run `/rgs5 compounding-audit` to refresh):

1. **Auto-emit-tooling**: rgs5 PROPOSES artifacts but doesn't BUILD them. v6: auto-spawn an agent to build the proposed tool.
2. **Time-saved measurement**: estimates are heuristic. v6: instrument actual tool-use telemetry to measure real time-saved per artifact.
3. **Decay model**: artifacts can become obsolete. v6: TTL on ledger entries; auto-deprecate unused artifacts.
4. **Cross-roadmap leverage**: an artifact emitted in roadmap A may help roadmap B. v6: surface cross-roadmap leverage in compounding-audit.
5. **Persona-tier compounding**: Tier-5 (UX/persona) work doesn't yet emit dev-tools — only engines. v6: define UX-velocity artifacts (templates, design-system tokens, a11y checks).

These ship when 3+ cause friction.
