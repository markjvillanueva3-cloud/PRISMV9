# PRISM Skills Comprehensive Audit Report
## Date: 2026-02-13 | Auditor: Claude Opus 4.6

---

## EXECUTIVE SUMMARY

| Metric | Current | Proposed | Savings |
|--------|---------|----------|---------|
| Total Skills | 119 files | ~48 files | -60% |
| Total Size | 2,079 KB (2.03 MB) | ~1,050 KB (~1.0 MB) | -50% |
| Est. Tokens | ~390,000 | ~197,000 | -49% |
| Deprecated (still present) | 2 | 0 | -100% |
| Empty Directories | 2 | 0 | -100% |

**Bottom line:** Nearly half the token budget is wasted on redundancy, deprecated files,
and skills that should be merged. Meanwhile, critical capabilities are completely missing.

---

## PART 1: IMMEDIATE DELETIONS (Dead Weight)

These cost tokens for zero value. Delete today.

| Skill | Size | Reason |
|-------|------|--------|
| `prism-category-defaults` | 1.8 KB | Explicitly DEPRECATED — says "use prism-material-templates" |
| `prism-derivation-helpers` | 1.7 KB | Explicitly DEPRECATED — says "use prism-physics-formulas" |
| `prism-formal-definitions/` | 0 KB | Empty directory, no SKILL.md |
| `prism-cognitive-enhancement/` | 0 KB | Empty directory, no SKILL.md |
| `prism-development` | 6.6 KB | Fully superseded by `prism-dev-utilities` (which already consolidates it) |
| `prism-dev-tools` | 1.9 KB | References Python tools at old path; superseded by `dev-utilities` |
| **TOTAL FREED** | **12.0 KB** | |

---

## PART 2: REDUNDANCY CLUSTERS & MERGE PLAN

### 2.1 Context Management → `prism-context-unified`

**Current:** 4 skills, 27.7 KB
**Target:** 1 skill, ~10 KB (64% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-context-engineering` | 4.4 KB | **KEEP as base** — already claims to be the consolidation |
| `prism-context-pressure` | 3.1 KB | **MERGE IN** — pressure caps are part of context management |
| `prism-context-dna` | 10.0 KB | **MERGE IN** — DNA fingerprints are a context recovery mechanism |
| `prism-kv-cache-optimizer` | 10.2 KB | **MERGE IN** — KV-cache is Law 1 of context-engineering |

**Logic:** `context-engineering` already defines the Manus 6 Laws which include KV-cache (Law 1),
masking (Law 2), and memory externalization. The other three are just implementations of those laws.
Merge the unique content, cut the duplicated framework descriptions.


### 2.2 Session Management → `prism-session-unified`

**Current:** 6 skills, 58.6 KB
**Target:** 1 skill, ~18 KB (69% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-session-master` | 24.3 KB | **KEEP as base** — most comprehensive |
| `prism-session-buffer` | 2.8 KB | **MERGE IN** — buffer zones are part of session management |
| `prism-session-handoff` | 13.0 KB | **MERGE IN** — handoff is a session lifecycle phase |
| `prism-state-manager` | 8.6 KB | **MERGE IN** — state persistence is core session function |
| `prism-task-continuity` | 4.9 KB | **MERGE IN** — continuity = session persistence |
| `prism-mandatory-microsession` | 5.0 KB | **MERGE IN** — microsession is a session pattern |

**Logic:** Session master already covers boot→execute→checkpoint→handoff→end.
The others are specific phases or patterns within that lifecycle.


### 2.3 Error Handling → `prism-error-management`

**Current:** 2 skills, 33.3 KB
**Target:** 1 skill, ~18 KB (46% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-error-handling-patterns` | 26.2 KB | **KEEP as base** |
| `prism-error-recovery` | 7.1 KB | **MERGE IN** — recovery is part of error handling |

**Logic:** "What to do when errors happen" and "how to recover from errors" are the same topic.


### 2.4 Physics & Formulas → `prism-physics-unified`

**Current:** 3 skills + 1 separate, 57.0 KB
**Target:** 1 merged + 1 kept, ~25 KB (56% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-physics-formulas` | 17.9 KB | **MERGE** into unified |
| `prism-physics-reference` | 6.7 KB | **MERGE** into unified — subset of physics-formulas |
| `prism-universal-formulas` | 14.2 KB | **MERGE** into unified — formula catalog |
| `prism-formula-evolution` | 18.2 KB | **KEEP SEPARATE** — lifecycle tracking, different purpose |

**Logic:** Three skills all contain physics/formula reference data. One skill with sections.


### 2.5 Expert Personas → `prism-expert-personas`

**Current:** 10 skills, 55.7 KB
**Target:** 1 skill, ~30 KB (46% reduction)

| Skill | Size | Merge Note |
|-------|------|------------|
| `prism-expert-cad-expert` | 4.6 KB | Section: CAD |
| `prism-expert-cam-programmer` | 5.1 KB | Section: CAM |
| `prism-expert-master-machinist` | 6.2 KB | Section: Machining |
| `prism-expert-materials-scientist` | 8.4 KB | Section: Materials |
| `prism-expert-mathematics` | 5.7 KB | Section: Mathematics |
| `prism-expert-mechanical-engineer` | 3.9 KB | Section: Mechanical |
| `prism-expert-post-processor` | 6.3 KB | Section: Post Processing |
| `prism-expert-quality-control` | 4.7 KB | **MERGE with quality-manager** |
| `prism-expert-quality-manager` | 5.2 KB | **MERGE with quality-control** → Section: Quality |
| `prism-expert-thermodynamics` | 5.5 KB | Section: Thermal |

**Logic:** Each persona is 4-8 KB with identical structure (profile, capabilities, decision trees).
Quality-control and quality-manager are nearly identical (SPC, Cp/Cpk, ISO standards).
One skill with a section per expert domain and a selection guide at the top.


### 2.6 Materials → `prism-materials-core`

**Current:** 6 skills (excl. deprecated), 140.9 KB
**Target:** 2 skills, ~60 KB (57% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-material-schema` | 27.9 KB | **MERGE** → `prism-materials-core` |
| `prism-material-templates` | 18.5 KB | **MERGE** → `prism-materials-core` |
| `prism-material-lookup` | 21.2 KB | **MERGE** → `prism-materials-core` |
| `prism-material-validator` | 20.7 KB | **MERGE** → `prism-materials-core` |
| `prism-material-enhancer` | 15.1 KB | **MERGE** → `prism-materials-core` |
| `prism-material-physics` | 37.5 KB | **KEEP SEPARATE** — academic/theoretical, distinct purpose |

**Logic:** Schema, templates, lookup, validator, and enhancer are all parts of the same
material data pipeline: define → template → lookup → validate → enhance. One skill.
Material-physics is theoretical metallurgy/mechanics — different audience.


### 2.7 AI/ML → `prism-aiml-unified`

**Current:** 6 skills, 134.7 KB
**Target:** 1 skill, ~50 KB (63% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-ai-bayesian` | 15.5 KB | **MERGE** — section: Probabilistic |
| `prism-ai-deep-learning` | 27.1 KB | **MERGE** — section: Neural Networks |
| `prism-ai-optimization` | 31.4 KB | **MERGE** — section: Optimization |
| `prism-ai-reinforcement` | 17.1 KB | **MERGE** — section: RL |
| `prism-aiml-engine-patterns` | 20.2 KB | **MERGE** — becomes the framework/index |
| `prism-learning-engines` | 23.4 KB | **MERGE** — section: Learning |

**Logic:** These are all module templates for AI/ML engines. aiml-engine-patterns is already
a meta-reference covering algorithm selection. Consolidate with a good index table at top.
Heavy compression opportunity: remove duplicate imports, shared utility patterns, etc.


### 2.8 Code Quality → `prism-code-quality` + `prism-code-safety`

**Current:** 8 skills, 183.6 KB
**Target:** 3 skills, ~70 KB (62% reduction)

**Group A → `prism-code-quality` (~35 KB):**

| Skill | Size | Status |
|-------|------|--------|
| `prism-code-perfection` | 28.1 KB | **MERGE** — quality metrics |
| `prism-coding-patterns` | 15.4 KB | **MERGE** — MIT patterns |
| `prism-code-complete-integration` | 19.6 KB | **MERGE** — McConnell principles |

**Group B → `prism-code-safety` (~20 KB):**

| Skill | Size | Status |
|-------|------|--------|
| `prism-typescript-safety` | 24.1 KB | **MERGE** — TS-specific safety |
| `prism-security-coding` | 22.4 KB | **MERGE** — security patterns |

**Keep Separate:**

| Skill | Size | Reason |
|-------|------|--------|
| `prism-design-patterns` | 14.8 KB | Distinct reference (GoF) |
| `prism-solid-principles` | 28.8 KB | Distinct reference (SOLID) |
| `prism-performance-patterns` | 29.6 KB | Distinct concern (perf ≠ quality) |

**Logic:** Code-perfection's 12 metrics, coding-patterns' MIT foundations, and Code Complete's
13 sub-skills all cover "how to write good code." Massive overlap in advice.
TS-safety and security-coding both focus on "don't let bad things happen in code."


### 2.9 Cognitive Enhancement → `prism-cognitive-unified`

**Current:** 6 skills, 143.4 KB
**Target:** 2 skills, ~50 KB (65% reduction)

**Group A → `prism-cognitive-core` (keep, compress to ~25 KB):**

| Skill | Size | Status |
|-------|------|--------|
| `prism-cognitive-core` | 24.3 KB | **KEEP as base** — compress |
| `prism-reasoning-engine` | 33.8 KB | **MERGE IN** — reasoning is core cognition |
| `prism-predictive-thinking` | 16.8 KB | **MERGE IN** — prediction is cognitive |
| `prism-branch-predictor` | 9.6 KB | **MERGE IN** — overlaps predictive-thinking |

**Group B → `prism-safety-cognition` (~25 KB):**

| Skill | Size | Status |
|-------|------|--------|
| `prism-anomaly-detector` | 28.5 KB | **MERGE** — safety-critical anomaly detection |
| `prism-causal-reasoning` | 31.7 KB | **MERGE** — cause-effect for safety |

**Logic:** Cognitive-core, reasoning-engine, predictive-thinking, and branch-predictor all
enhance "how Claude thinks." Anomaly-detector and causal-reasoning are specifically
about manufacturing safety cognition — different trigger conditions.


### 2.10 Orchestration → `prism-orchestration`

**Current:** 6 skills, 69.8 KB
**Target:** 2 skills, ~30 KB (57% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-agent-selector` | 10.5 KB | **MERGE** → orchestration |
| `prism-batch-orchestrator` | 8.8 KB | **MERGE** → orchestration |
| `prism-swarm-coordinator` | 13.2 KB | **MERGE** → orchestration |
| `prism-autonomous-execution` | 4.5 KB | **MERGE** → orchestration |
| `prism-api-acceleration` | 11.6 KB | **MERGE** → orchestration |
| `prism-combination-engine` | 17.0 KB | **KEEP SEPARATE** — always-on, ILP core |
| `prism-skill-orchestrator` | 21.2 KB | **KEEP SEPARATE** — meta-orchestration |

**Logic:** Agent selection, batching, swarming, autonomous execution, and API acceleration
are all "how to run multiple things." Combination engine is mathematically distinct (ILP).


### 2.11 Quality/Validation → `prism-validation`

**Current:** 5 skills, 69.8 KB
**Target:** 2 skills, ~30 KB (57% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-quality-gates` | 6.8 KB | **MERGE** → validation |
| `prism-ralph-validation` | 3.2 KB | **MERGE** → validation |
| `prism-validator` | 10.4 KB | **MERGE** → validation |
| `prism-tdd-enhanced` | 13.1 KB | **MERGE** → validation |
| `prism-anti-regression` | 36.3 KB | **KEEP SEPARATE** — mandatory, critical protocol |

**Logic:** Gates, ralph, validator, and TDD are all "verify correctness." Anti-regression
is a distinct mandatory protocol with its own enforcement lifecycle.


### 2.12 Development Workflow → `prism-dev-guide`

**Current:** 5 skills (after deletions), 34.6 KB
**Target:** 1 skill, ~18 KB (48% reduction)

| Skill | Size | Status |
|-------|------|--------|
| `prism-dev-utilities` | 11.5 KB | **KEEP as base** |
| `prism-dispatcher-dev` | 5.4 KB | **MERGE IN** |
| `prism-document-management` | 1.8 KB | **MERGE IN** |
| `prism-module-builder` | 14.1 KB | **MERGE IN** |
| `prism-skill-deployer` | 6.0 KB | **MERGE IN** |

---

## PART 3: SUPERPOWERS (SP) ASSESSMENT

The 8 SP skills consume **395.5 KB (19% of all skill tokens)**.

| Skill | Size |
|-------|------|
| `prism-sp-brainstorm` | 33.9 KB |
| `prism-sp-debugging` | 66.5 KB |
| `prism-sp-execution` | 49.6 KB |
| `prism-sp-handoff` | 36.3 KB |
| `prism-sp-planning` | 56.9 KB |
| `prism-sp-review-quality` | 67.2 KB |
| `prism-sp-review-spec` | 36.7 KB |
| `prism-sp-verification` | 48.7 KB |

**Assessment:** These are reference documents for the `prism_sp` dispatcher phases.
They should NOT be loaded into skills context simultaneously.

**Recommendation:**
- Create `prism-sp-index` (~3 KB) — thin index mapping phases to files
- Keep individual SP files as **on-demand reference only**
- Ensure `skill_load`/`skill_content` loads ONE at a time, never all 8
- **Compress each by ~40%** — these files contain excessive decorative borders,
  repeated safety warnings, and verbose examples. Target: each under 35 KB.
- **Estimated savings if compressed:** 395 KB → ~200 KB


## PART 4: CNC CONTROLLERS ASSESSMENT

5 skills, **233.4 KB (11.2% of all tokens)**.

**Verdict: KEEP AS-IS.** These are legitimate domain reference databases.
Controller-quick-ref serves as the index. They're loaded on-demand.
The content is dense, non-redundant, and safety-critical.


## PART 5: STANDALONE SKILLS (No Merge Needed)

These skills are unique, non-redundant, and appropriately sized:

| Skill | Size | Domain |
|-------|------|--------|
| `prism-anti-regression` | 36.3 KB | Quality (could trim ~30%) |
| `prism-cam-strategies` | 12.9 KB | Manufacturing |
| `prism-codebase-packaging` | 17.5 KB | Dev tooling |
| `prism-combination-engine` | 17.0 KB | Always-on ILP |
| `prism-cutting-mechanics` | 18.9 KB | Manufacturing |
| `prism-cutting-tools` | 10.4 KB | Manufacturing |
| `prism-design-patterns` | 14.8 KB | Architecture |
| `prism-efficiency-controller` | 10.6 KB | Token efficiency |
| `prism-formula-evolution` | 18.2 KB | Math lifecycle |
| `prism-high-reliability` | 2.0 KB | Safety |
| `prism-hook-system` | 18.4 KB | Infrastructure |
| `prism-knowledge-base` | 8.3 KB | Reference |
| `prism-large-file-writer` | 6.8 KB | Dev tooling |
| `prism-life-safety-mindset` | 8.7 KB | Safety culture |
| `prism-master-equation` | 21.7 KB | Core math |
| `prism-material-physics` | 37.5 KB | Materials science |
| `prism-mathematical-planning` | 10.6 KB | Planning |
| `prism-performance-patterns` | 29.6 KB | Performance |
| `prism-post-processor-reference` | 18.4 KB | CNC |
| `prism-process-optimizer` | 23.9 KB | Manufacturing |
| `prism-prompt-engineering` | 33.0 KB | Meta (could trim) |
| `prism-python-tools` | 10.3 KB | Tooling |
| `prism-scientific-packages` | 10.8 KB | Reference |
| `prism-signal-processing` | 18.6 KB | Analysis |
| `prism-skill-orchestrator` | 21.2 KB | Meta-orchestration |
| `prism-solid-principles` | 28.8 KB | Architecture |
| `prism-speed-feed-engine` | 14.3 KB | Manufacturing core |
| `prism-synergy-calculator` | 10.8 KB | Synergy |
| `prism-token-density` | 8.0 KB | Efficiency |
| `prism-tool-holder-schema` | 8.7 KB | Manufacturing |
| `prism-tool-selector` | 7.2 KB | Manufacturing |
| `prism-uncertainty-propagation` | 6.1 KB | Math safety |
| `prism-unit-converter` | 8.0 KB | Utility |
| `prism-wiring-templates` | 14.0 KB | Infrastructure |

Some of these could benefit from trimming (anti-regression, prompt-engineering,
solid-principles) but they serve distinct, non-overlapping purposes.


---

## PART 6: CRITICAL GAPS — Skills That Should Exist But Don't

These are holes in the system that, once filled, would prevent real problems.

### Gap 1: `prism-testing-strategy` (Priority: HIGH)
**What's missing:** TDD-enhanced exists but covers test-driven development methodology only.
There's no comprehensive testing STRATEGY skill covering unit test patterns for manufacturing
calculations, integration testing of dispatcher chains, property-based testing for physics
formulas (e.g., "cutting force should always be positive"), fuzz testing safety boundaries,
snapshot testing for regression detection, and manufacturing-specific test fixtures.

**Why it matters:** PRISM has 368 actions across 31 dispatchers. Testing strategy is ad hoc.
A unified testing skill would catch bugs that currently survive to production.

**Estimated size:** 15 KB


### Gap 2: `prism-architecture-decisions` (Priority: HIGH)
**What's missing:** No Architecture Decision Record (ADR) skill. Major decisions are scattered
across state saves, ACTION_TRACKER, memory, and conversation history. When a new session starts,
the "why" behind past decisions is often lost.

**Why it matters:** You've already experienced this — rebuilding context about WHY choices were
made costs sessions. A structured ADR skill would capture decision context, alternatives
considered, trade-offs accepted, and reversal conditions.

**Estimated size:** 8 KB


### Gap 3: `prism-migration-playbook` (Priority: MEDIUM)
**What's missing:** Anti-regression prevents loss during changes, but there's no proactive
migration skill. No schema evolution patterns, no database migration workflows, no version
upgrade checklists, no backward compatibility strategies.

**Why it matters:** PRISM databases (3,518+ materials, 824+ machines, 1,944+ tools) will
evolve. Without migration patterns, every schema change is ad hoc and risky.

**Estimated size:** 12 KB


### Gap 4: `prism-observability` (Priority: MEDIUM)
**What's missing:** No structured logging, distributed tracing, or metrics skill. The
TelemetryEngine exists but there's no skill teaching HOW to instrument new code, WHAT
to measure, or WHEN to alert.

**Why it matters:** Safety-critical system with no observability patterns = blind spots.
When something goes wrong at 2 AM on the shop floor, you need structured logs and traces.

**Estimated size:** 10 KB


### Gap 5: `prism-api-lifecycle` (Priority: MEDIUM)
**What's missing:** 31 dispatchers, 368 actions, but no skill about API versioning,
backward compatibility, deprecation workflows, or breaking change management.

**Why it matters:** Every time an action is renamed or params change, downstream
consumers break. KNOWN_RENAMES is a band-aid. A lifecycle skill would be the cure.

**Estimated size:** 10 KB


### Gap 6: `prism-data-pipeline` (Priority: LOW)
**What's missing:** No ETL/data flow patterns. Material databases, machine databases,
and tool databases need ingestion, transformation, validation, and enrichment pipelines.

**Why it matters:** Currently, data entry is manual and error-prone. Pipeline patterns
would enable automated data quality, batch imports, and cross-database consistency checks.

**Estimated size:** 12 KB

---

## PART 7: GAME-CHANGING PROPOSALS — Skills That Would Transform Development

These aren't gap-fillers. These are force multipliers that would fundamentally change
how PRISM development works.

### 🏆 Proposal 1: `prism-self-evolution-engine` (Impact: TRANSFORMATIVE)

**What it does:** A meta-skill that analyzes Claude's own performance across sessions.
It would:
- Track which skills are actually loaded vs. never referenced
- Identify recurring error patterns and auto-generate prevention rules
- Measure time-to-completion for common task types and flag regressions
- Suggest skill consolidations, splits, or new skills based on usage data
- Maintain a "lessons learned" database that persists across sessions
- Auto-tune truncation caps, hook priorities, and cadence timings based on evidence

**Why it's transformative:** Right now, PRISM's skill system is manually curated. This
skill would make it self-improving. Every session would make the next session better.
Instead of periodic manual audits (like this one), the system would continuously optimize.

**Integration:** Hooks into `prism_telemetry`, `prism_guard→learning_save`, and
`prism_session→state_save`. Reads from `prism_memory→get_health`.

**Estimated size:** 20 KB
**Estimated development:** 2-3 sessions


### 🏆 Proposal 2: `prism-reasoning-chain-validator` (Impact: CRITICAL FOR SAFETY)

**What it does:** Validates multi-step reasoning chains in manufacturing calculations.
NOT the same as anomaly detection (which checks outputs). This checks the REASONING:
- Step-by-step chain validation: "Did each step follow logically from the previous?"
- Unit dimensional analysis: "Do the units work out at every intermediate step?"
- Bound propagation: "Does uncertainty compound correctly through the chain?"
- Dead-end detection: "Did a reasoning path get abandoned without explanation?"
- Circular reasoning detection: "Did we assume what we're trying to prove?"
- Intermediate sanity checks: "Is this intermediate value physically possible?"

**Why it's critical:** PRISM calculates cutting forces, speeds, feeds, temperatures.
A wrong intermediate step can produce a plausible-looking final answer that's deadly.
Current validation checks the OUTPUT. This checks the REASONING that produced it.

**Example:** Calculating cutting speed → force → power → torque → deflection.
If step 2 uses the wrong Kienzle exponent, steps 3-5 look reasonable but are all wrong.
This skill catches it at step 2, not step 5.

**Integration:** Hooks into `prism_calc→*`, `prism_safety→*`, `calc:postCalc` hooks.

**Estimated size:** 18 KB
**Estimated development:** 2 sessions


### 🏆 Proposal 3: `prism-knowledge-graph` (Impact: HIGH)

**What it does:** Builds and maintains a knowledge graph of ALL PRISM entities and their
relationships:
- Materials ↔ Recommended Tools ↔ Compatible Machines
- Operations ↔ Required Parameters ↔ Safety Constraints
- Formulas ↔ Input Variables ↔ Output Variables ↔ Dependent Formulas
- Alarms ↔ Root Causes ↔ Fix Procedures ↔ Related Alarms
- Skills ↔ Dispatchers ↔ Actions ↔ Hooks

**Why it's transformative:** Currently, knowledge is siloed. To answer "What happens to
tool life if I switch from 4140 steel to Inconel 718 on a DMG MORI DMU 50?" you need
to query materials, tools, machines, and formulas separately. A knowledge graph enables
semantic traversal: one query, complete answer with all dependencies.

**Integration:** Built on top of `prism_knowledge→cross_query` and `prism_memory→get_node`.

**Estimated size:** 15 KB
**Estimated development:** 3-4 sessions


### 🏆 Proposal 4: `prism-session-intelligence` (Impact: HIGH)

**What it does:** Analytics engine for development session patterns:
- Average tokens per task type (bug fix vs. feature vs. refactor)
- Error clustering: which dispatchers/actions fail most often?
- Session productivity score: useful outputs per token consumed
- Bottleneck identification: where do sessions stall?
- Optimal session length prediction based on task complexity
- Tool call efficiency: which patterns use fewest calls for best results?

**Why it's transformative:** You're investing significant API cost in PRISM development.
This skill would tell you WHERE that investment produces the most value and WHERE
it's being wasted. It's the difference between flying blind and having instruments.

**Integration:** Reads from `prism_telemetry→get_dashboard`, `prism_guard→pattern_history`.

**Estimated size:** 12 KB
**Estimated development:** 1-2 sessions


### 🏆 Proposal 5: `prism-intent-disambiguator` (Impact: HIGH)

**What it does:** Resolves ambiguous manufacturing queries before dispatching:
- "Calculate speed for this material" → Which material? Which operation? Which machine?
- "Fix the alarm" → Which controller? Which alarm code? Current or historical?
- "Optimize the toolpath" → Optimize for what? Speed? Surface finish? Tool life? Cost?

Currently, ambiguous queries either produce wrong answers or require multiple clarification
rounds. This skill would:
- Detect ambiguity using a decision tree
- Auto-resolve using session context and user history
- Ask minimal, targeted clarification questions when needed
- Cache resolution patterns for future queries

**Why it's transformative:** Reduces wasted tool calls on wrong interpretations.
Reduces user frustration. Makes PRISM feel like it "understands" manufacturing context.

**Integration:** Pre-dispatch hook at `task:prePlan`. Reads from `prism_session→memory_recall`.

**Estimated size:** 12 KB
**Estimated development:** 1-2 sessions


### 🏆 Proposal 6: `prism-codebase-health` (Impact: HIGH)

**What it does:** Continuous health monitoring for the PRISM codebase itself:
- Dead code detection across 31 dispatchers
- Action coverage analysis (which actions have no tests?)
- Import graph analysis (circular dependencies?)
- Type safety scoring per module
- Build artifact size trending (is the 3.9MB growing?)
- Dispatcher action count drift (does MASTER_INDEX.md match reality?)
- Stale state detection (is CURRENT_STATE.json accurate?)

**Why it's transformative:** PRISM has grown to 31 dispatchers and 368 actions.
Without automated health monitoring, entropy wins. This skill would be the
"check engine light" for the codebase itself.

**Integration:** Fires at `build:postBuild` hook. Uses `prism_dev→build`, 
`prism_guard→pattern_scan`, Desktop Commander for file analysis.

**Estimated size:** 15 KB
**Estimated development:** 2 sessions

---

## PART 8: IMPLEMENTATION PRIORITY

### Phase 1: Clean House (1 session)
1. Delete 6 dead items (Part 1)
2. Compress 8 SP skills by 40% each

### Phase 2: Merge Redundancies (3-4 sessions)
Priority order based on token savings:
1. AI/ML merge (134.7 KB → 50 KB = 85 KB saved)
2. Code Quality merge (183.6 KB → 70 KB = 114 KB saved)
3. Cognitive merge (143.4 KB → 50 KB = 93 KB saved)
4. Materials merge (140.9 KB → 60 KB = 81 KB saved)
5. Session merge (58.6 KB → 18 KB = 41 KB saved)
6. Expert merge (55.7 KB → 30 KB = 26 KB saved)
7. Remaining merges (context, error, physics, orchestration, validation, dev)

### Phase 3: Fill Gaps (2-3 sessions)
1. `prism-testing-strategy` (immediate need)
2. `prism-architecture-decisions` (immediate need)
3. Remaining gaps as needed

### Phase 4: Game Changers (4-6 sessions)
1. `prism-reasoning-chain-validator` (safety-critical, highest ROI)
2. `prism-self-evolution-engine` (force multiplier for everything else)
3. `prism-intent-disambiguator` (user experience + efficiency)
4. `prism-codebase-health` (sustainability)
5. `prism-knowledge-graph` (ambitious but transformative)
6. `prism-session-intelligence` (ROI visibility)

---

## PART 9: TOKEN BUDGET PROJECTION

| Phase | Skills | Size | Tokens (est) |
|-------|--------|------|-------------|
| After Phase 1 | 111 | 1,860 KB | ~349K |
| After Phase 2 | ~48 | ~1,050 KB | ~197K |
| After Phase 3 | ~54 | ~1,117 KB | ~209K |
| After Phase 4 | ~60 | ~1,209 KB | ~227K |

Even with 6 new game-changing skills added, the final token count (227K) is 42% LESS
than today's bloated 390K. That's the power of consolidation before expansion.

---

*End of Audit Report*
