---
name: forge3
description: Forge v3 — v2 + superpowers methodology + codebase-memory layer + automation/optimization/monitoring/analysis skills + memory WRITE path + skill auto-creation + cron registration + anti-drift Karpathy checkpoints + /simplify cleanup + /verification-before-completion gates
---

---
effort: high
maxTurns: 50
policy:
  tier: 3
  triggers:
    - "forge3"
---

# Forge v3 — Higher-Coverage Pipeline

v3 is **v2 + the missing surface layers** (audit-coverage 2026-05-08 found v2 covered ~15% of dev surface; v3 targets ~40%). v3 inherits v2's 6-phase structure and all hard rules; what's new is **layered enhancements** at every phase. **Default to v3** unless you have a specific reason to use v2 — v3 is strictly additive.

---

## 🪨 ATOMIC-FIRST CROSS-REFERENCE (auto-injected 2026-05-08)

**For master-roadmap synthesis or any tier-spanning work, prefer `/forge4`.** It binds the live `state/shared/system-viz/system-graph.json` as the dependency oracle and enforces tier ordering (T0 atomic → T1 engines → T2 dispatchers → T3 transport → T4 frontend → T5 personas) via the canonical `meta.roadmap.phases` skeleton.

v3 still works for self-contained internal refactors with no tier crossings. For any roadmap-touching work, **append** this to the Phase 0A preflight batch:

```bash
node H:/prism/scripts/generate-system-viz.mjs                          # regenerate graph (~5s)
node H:/prism/scripts/system-viz-query.mjs build-order                 # canonical atomic-first phase order
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json   # roadmap-shaped candidate list
```

Then add a `Tier floor:` line to the PREFLIGHT v3 card and a soft-warn checkpoint at every Phase boundary: if a unit creates a Tier-N artifact while Tier-(N-1) has unfilled prereqs, advise (do not block — hard-block lives in `/forge4`). Regenerate the viz at Phase 6 handoff so the next session sees new wiring. Read `H:/prism/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` for the full Atomic-First Build Principle. Cross-versions: `/forge` (~4%) → `/forge2` (~15%) → `/forge3` (~40%) → `/forge4` (~50%, atomic-first hard rules).

---

## Args: $ARGUMENTS
A brief description of what to build, fix, or improve.
- `/forge3 add 5-axis compensation to the safety chain`
- `/forge3 optimize session startup token cost`
- `/forge3 create a dashboard for roadmap progress`

## EXHAUSTIVE SCIENCE LAW (HARD RULE)
Same as v2. Live counts only. Cite specific engines/formulas/algorithms. Completeness > Speed.

## SAFETY-CRITICAL TEST LAW (HARD RULE)
Same as v2. Real tests against published data ±5–15% tolerance. No `toBeGreaterThan(0)` or `toBeDefined()`.

## ANTI-DRIFT KARPATHY CHECKPOINT (NEW — HARD RULE)
**Every 5 tool calls or every 5 units, ask yourself:**
1. Am I still on the user's goal or did I wander?
2. Is this the simplest solution or am I over-engineering?
3. Did I check existing assets before building new?
4. Have I made any assumptions I haven't verified?

If any answer is concerning → STOP, write a 1-line refocus note, return to user's goal.

## CONTEXT BUDGET POLL (NEW — at every phase boundary)
Run `/context-budget` (or `prism_dev:token_economy_report`) at the end of every phase. If context >70%:
- Finish current unit cleanly
- Skip ahead to Phase 6 handoff
- Trigger /precompact

---

## PHASE 0 — PREFLIGHT (v3 enhanced)

### 0A. Existing v2 preflight scripts (run in parallel, single message)
```bash
node H:/prism/scripts/update-prism-inventory.mjs --quiet
node H:/prism/scripts/build-state-snapshot.mjs
node H:/prism/scripts/build-milestone-progress.mjs
node H:/prism/scripts/audit-unwired-engines.mjs
node H:/prism/.claude/helpers/sync-memory.mjs
node H:/prism/.claude/helpers/prism-awareness-bundle.mjs
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
```

### 0B. v3 ADDITIONS — System pressure + dedup intercept

```
/dont-reinvent          → intercepts build requests; searches existing engines/actions/patterns BEFORE writing
/system-health          → telemetry: tool failures, agent perf, cron reliability, review metrics, context pressure
/context-budget         → context window pressure, critical fact survival rate
/coordination-dashboard → stochastic coordination metrics (hook P(success), dedup, timeout calibration, anomaly detection)
/coverage-by-domain     → which domains are most lagging on dispatcher wiring
/curiosity-queue        → never-accessed assets, unregistered files, zero-citation tips, zero-invocation actions
```

Then drain pending consensus queue (system-level token economy):
```bash
node H:/prism/.claude/scripts/consensus-queue-drain.mjs --max=5
```
If module-not-found → run `cd H:/prism/mcp-server && npm run build:fast` first.

### 0C. Read auto-injected awareness (same as v2)
- `PRISM-INVENTORY-LATEST.md`, `CLAUDE-BRIEF.md`, `BUILD_STATE.md`, `MILESTONE_PROGRESS.md`

### 0D. Stale directive check (same as v2)
```bash
ls -la H:/prism/state/shared/CLAUDE-CODEX-*.md  # >7d → regenerate
node H:/prism/scripts/index/build-command-bridge.mjs
```

**Output enhanced PREFLIGHT CARD:**
```
PREFLIGHT v3
=============
Inventory:        [E] / [D] / [A] · [H] hooks · [S] skills (520 surface)
Built:            [N] wired / [N] unwired ([%] coverage)
Drift:            [N] envelope drift cases · [list]
System health:    [PASS/WARN/FAIL] — context [%], hook P(success) [%], anomalies [N]
Pending consensus: [N] drained / [N] failed
Memory/Wiki:      [N] memories · [N] wiki entries · staleness [hours]
Ollama:           [up/down] · [N] models · offload rate [%]
Stale directives: [list of CLAUDE-CODEX-* >7d]
Session ID:       [STABLE]
```

---

## PHASE 0.5 — INTELLIGENCE ROUTING (same as v2)

`AISystemRouterEngine.classify()` + `AISystemRouterEngine.route()` + Ollama pre-warm + octopus-provider-probe.

---

## PHASE 1 — SMART ANALYSIS + KNOWLEDGE QUERY (v3 enhanced)

### 1A. /smart protocol (same as v2)

### 1B. v3 ADDITIONS — superpowers methodology + codebase-memory layer

**Methodology (MUST USE per superpowers frontmatter):**
```
superpowers:brainstorming  → MUST USE before any creative work; explores user intent, requirements, design before implementation
superpowers:writing-plans  → if multi-session implementation; produces a plan file
```

**Codebase-memory layer (graph-based code intelligence — NOT grep):**
```
codebase-memory-exploring  → architecture orientation; ALWAYS invoke for code exploration questions BEFORE Grep/Glob
codebase-memory-tracing    → call chain + dependency expert; impact analysis (who calls X, what X calls)
codebase-memory-quality    → dead code, complexity, refactor candidates BEFORE manual file search
codebase-memory-reference  → reference guide for MCP tools, graph queries, edge types
```

### 1C. Knowledge query path (same as v2)
Wiki → Memories → Tribal → Playbook → Formulas → Self-awareness, then duplication gate.

### 1D. Library docs (same as v2)
Context7 for any external library mentioned in brief.

---

## PHASE 2 — BRAINSTORM (v3 enhanced)

### 2A. v3 ENHANCEMENT — frame via superpowers:brainstorming
Run `superpowers:brainstorming` BEFORE creative reasoning. Per its frontmatter: "MUST use this before any creative work — creating features, building components, adding functionality, or modifying behavior."

### 2B. Same as v2 — creative reasoning chain
- `prismCreativeReasoningEngine.explore(problem, "optimal")` 6 modes
- `CrossDisciplinaryDeepLearningEngine.synthesize(domain, problem)` 15 domains
- `CounterfactualReasoningEngine.generate(problem, n=2)` ≥2 alternates
- 3 approaches with conformal-bounded estimates

### 2C. v3 ADDITION — predictive impact
```
/foresight                  → predictive impact modeling (NEW)
/karpathy                   → LLM architecture reasoning (NEW)
codebase-memory-tracing     → for any approach that touches existing code, run impact analysis
prism_dev:utilization_gaps  → cross-check approach against current capability gaps
```

---

## PHASE 2B — TOOLKIT CARD (v3 expanded)

Same v2 categories PLUS:

| Tier | New v3 entries |
|---|---|
| **Methodology** | superpowers:brainstorming, superpowers:writing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, superpowers:dispatching-parallel-agents, superpowers:systematic-debugging, superpowers:finishing-a-development-branch |
| **Codebase intel** | codebase-memory-exploring, codebase-memory-tracing, codebase-memory-quality, codebase-memory-reference |
| **Automation** | automation:smart-spawn, automation:smart-agents, automation:auto-agent, automation:workflow-select, automation:self-healing |
| **Optimization** | optimization:parallel-execute, optimization:cache-manage, optimization:auto-topology, optimization:topology-optimize |
| **Monitoring** | monitoring:real-time-view, monitoring:status, monitoring:agents, monitoring:agent-metrics, monitoring:swarm-monitor |
| **Analysis** | analysis:token-usage, analysis:token-efficiency, analysis:performance-bottlenecks, analysis:performance-report, analysis:bottleneck-detect |
| **Github (if PR workflow)** | github:swarm-pr, github:swarm-issue, github:code-review-swarm, github:sync-coordinator, github:workflow-automation, github:pr-manager |
| **SPARC modes (specialized agents)** | sparc:analyzer, sparc:architect, sparc:coder, sparc:debugger, sparc:designer, sparc:reviewer, sparc:tester, sparc:integration |
| **System / cleanup** | /simplify, /skill-creator (NEW at Phase 6), /schedule (cron registration), /weekly-synthesis |

The full toolkit card output should now include `Methodology`, `Codebase intel`, `Automation`, `Optimization`, `Monitoring`, `Analysis` rows.

---

## PHASE 3 — GENERATE MILESTONE (delegates to /rgs3 generate)

Delegates to `/rgs3 generate` (which runs the 14-stage v3 pipeline = v2's 12 stages + S0.5 system-pressure-check + S11.5 cron-registration). Same return contract as v2.

---

## PHASE 4 — EXECUTE (v3 enhanced)

For each unit:

### 4A. Claim (same as v2)

### 4B. v3 ADDITIONS to the 4-LOOP

- **LOOP 1 SCRUTINIZE** — same as v2 + `superpowers:systematic-debugging` if scrutiny finds bugs
- **LOOP 2 GAP FILL** — same as v2 + `superpowers:test-driven-development` discipline (red-green-refactor; tests before implementation)
- **LOOP 3 TIE UP** — same as v2 + `/simplify` (review changed code for reuse, quality, efficiency, fix issues found) + `superpowers:verification-before-completion`

### 4C. Anti-drift checkpoint — every 5 tool calls or 5 units
Run the 4-question Karpathy checkpoint (top of this file). If wandered, refocus.

### 4D. UI changes — Playwright (same as v2)

### 4E. Ollama parallel docstring/lint/triage (same as v2)

### 4F. Linear issue update (same as v2)

### 4G. Build + tests (same as v2)

### 4H. v3 ADDITION — live monitoring during execution
For long-running work, fire monitoring:
```
monitoring:real-time-view  → real-time agent + system view
monitoring:agent-metrics   → per-agent perf
analysis:token-usage       → live token spend
```

### 4I. Auto-compact + envelope update (same as v2)

---

## PHASE 5 — CONSENSUS SCRUTINY (v3 enhanced)

### 5A. v3 ENHANCEMENT — discipline marker
Per `superpowers:dispatching-parallel-agents` frontmatter: "Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies." The hybrid 5+5 scrutiny is exactly this case. Tag explicitly.

### 5B. 3-way scrutiny (same as v2 — scrutiny-3way.mjs + Opus arm)

### 5C. Hybrid 10-agent review (same as v2 — 5 Claude + 5 Ollama)

### 5D. v3 ADDITION — explicit verdict-recording skill
After agents return, use `/scrutinize-mark` to formally record verdicts (matches scrutiny-3way's --mark-{codex|gemini|opus} flow).

### 5E. Conformal calibration check (same as v2)

### 5F. v3 ADDITION — token economy audit on the scrutiny round
```
analysis:token-usage         → which of the 10 agents was over-budget
analysis:performance-report  → identify slowest scrutiny agents
team-budget                  → flag over-budget teams for next run
```

### 5G. Record verdict (same as v2)

---

## PHASE 6 — HANDOFF + KNOWLEDGE PERSIST (v3 enhanced)

### 6A. Per-agent handoff (same as v2)

### 6B. Wiki ingest (same as v2)

### 6C. v3 ENHANCEMENT — Memory WRITE path (NEW)
Memory was query-only in v2. v3 explicitly writes back what was learned:
```
prism_session:memory_save        → persist cross-session knowledge
sync-memory                       → bidirectional C: ↔ H: sync
```

If session produced: rules, feedback, decisions, surprising results, patterns → write a memory file at `H:/prism/knowledge/memories/<type>_<slug>.md` with frontmatter (name, description, type ∈ {user, feedback, project, reference}). Update `MEMORY.md` index. **Lead the body with the rule itself, then a Why: line, then a How to apply: line.**

### 6D. v3 ADDITION — Skill auto-creation (NEW)
If a useful repeatable pattern emerged that future sessions could reuse:
```
skill-creator:skill-creator → generate a new /<slash> skill for the pattern
```
Examples: a particular tool sequence that worked, a new validation pattern, a new audit sweep that surfaced gaps. Don't force this — only when a pattern has clearly compounded.

### 6E. v3 ADDITION — Cron registration (NEW)
After successful milestone, register monitoring jobs that should run periodically:
```
/schedule weekly /scrutinize       → weekly post-merge scrutiny
/schedule daily /weekly-synthesis  → roll up daily learnings
/schedule hourly /system-health    → light system-pressure check
```
Use the `schedule` skill (or CronCreate tool directly with off-the-zero minute marks per scheduling discipline).

### 6F. Linear close-out (same as v2)

### 6G. v3 ADDITION — github layer (if PR workflow involved)
If milestone produced commits ready for PR:
```
github:pr-manager            → manage PR lifecycle
github:swarm-pr              → multi-agent PR review
github:code-review-swarm     → parallel code review agents
github:sync-coordinator      → multi-repo sync (if cross-repo)
```

### 6H. Coordination broadcast (same as v2)

### 6I. v3 ENHANCEMENT — token economy report
```
node H:/prism/scripts/ollama-offload-dashboard.mjs --window=session
analysis:token-efficiency
remediation-scorecard         → warn-to-autofix conversion progress
```
Aim: ≥45% Ollama offload (vs v2's ~40% target).

### 6J. v3 ADDITION — system feedback loop
Run `/error-learn-review` to capture any errors that happened this session into the lessons layer:
```
error-learn-review  → analyze + learn from failures
```
This compounds into the wiki/memory/tribal layers automatically via the wiki-ingest pipeline.

---

## PROGRESS REPORTING (v3 expanded)

```
FORGE v3 PROGRESS
==================
P0 Preflight:        PASS — [counts] · system [PASS/WARN] · consensus drained [N]
P0.5 Routing:        [TaskClass] → [Backend]
P1 Smart+Know+Code:  [wiki/mem/tribal/playbook/formula] hits · codebase-memory ran [Y/N]
P2 Brainstorm:       superpowers:brainstorming PASS · 3 approaches · selected [name]
P2B Toolkit:         skills [N] · methodology [N] · automation [N] · monitoring [N]
P3 Generate:         /rgs3 returned [milestone-ID] · 14-stage scrutiny [score]
P4 Execute:          [X]/[Y] units · TDD [Y/N] · simplify [Y/N] · verification PASS
                     anti-drift checkpoint [N] · monitoring active
P5 Consensus:        Hybrid avg [score] · 3-way [P/F-P/F-P/F] · token audit [tokens]
P6 Handoff:          Wiki [+N] · Memory [+M WRITE] · Linear closed · cron [N] · skill-creator [Y/N]
                     github PR [link] · error-learn-review [findings]

Current Unit: [unit-id] — [title]  Ralph Iter: [N]  Build: [PASS/FAIL]
Anti-drift: [Y/N — last check at unit X]  Context budget: [%]
```

---

## SESSION BUDGET

Same as v2. PLUS: anti-drift checkpoint at every-5-units boundary (always).

---

## END STATE

```
FORGE v3 COMPLETE
==================
Milestone:       [ID] — [title]
Units:           [X]/[Y]
Phases:          0–6 executed (with v3 enhancements at 0B, 1B, 2A/C, 4B/H, 5A/D/F, 6C/D/E/G/I/J)
Quality:         Hybrid 10-agent avg [score] · Conformal [%] · 3-way PASS · TDD [Y/N]
Build:           PASS  ·  Tests: [N] passing  ·  Ω=[X]  ·  S(x)=[X]
Token economy:   Ollama offload [%]  ·  saved [tokens]  ·  Claude tokens spent [N]
Coordination:    Linear [issue] · Wiki [+N] · Memory [+M WRITE] · Handoff written
                 Cron [N] registered · github PR [link if any]
Surface coverage: ~40% (v3 target — vs v2 ~15%, v1 ~4%)

Deliverables:
  Engines / Dispatchers / Hooks / Skills / Tests: [lists]
  Memories WRITTEN: [N at H:/prism/knowledge/memories/]
  Wiki entries INGESTED: [N at H:/prism/knowledge/wiki/]
  Skills AUTO-CREATED: [list if any via skill-creator]
  Crons REGISTERED: [list]
  Anti-drift checkpoints: [N — clean]

Next: /forge3 [next idea]  |  /pick-task <next-unit-id>  |  /rgs3 brainstorm  |  /weekly-synthesis (auto-cron)
```
