# Tribal Knowledge Propagation Roadmap
## PRISM-wide application of learned machining knowledge across every relevant consumer and pipeline

Generated: 2026-03-27
Mode: `/rgs-sync` + `/forge-triple` shared planning overlay
Canonical parent: `C:/PRISM/CAMX-RESTRUCTURED-ROADMAP-v24.md`
Status: planned overlay, execute in dependency order without forking a second master roadmap

---

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## Mission

PRISM already contains major knowledge assets:

- `TribalKnowledgeEngine`
- `MachiningPlaybookEngine`
- `FormulaRegistry`
- machine-domain comprehensive roadmaps
- learned shop-floor data, actuals, alarms, quote outcomes, and setup outcomes
- academy / learning / federated-learning surfaces

The gap is not "do we have tribal knowledge?" The gap is propagation.

The system must guarantee that any learned machining tip, anti-pattern, workaround, post quirk, tooling lesson, setup insight, quote correction, failure mode, or shop-proven heuristic is:

1. normalized once,
2. tagged with provenance and scope,
3. routed into every relevant engine,
4. surfaced in every relevant app workflow,
5. converted into reusable MCP actions, skills, and hooks where valuable,
6. fed back from real shop outcomes into the same canonical learning spine.

The rule going forward:

`No tribal knowledge stays trapped in one engine, one page, one chat, one shop, or one terminal.`

---

## Outcomes Required

By completion, PRISM should:

- apply learned machining knowledge to quoting, planning, setup, programming, simulation, post-processing, safety, inventory, purchasing, alarms, maintenance, scheduling, and training
- let each tenant/shop specialize locally without losing privacy or context
- promote safe cross-shop patterns into the broader platform through reviewed learning flows
- show provenance, evidence level, and applicability on every important recommendation
- make tribal knowledge callable through MCP actions, not just buried in engines
- protect the propagation system with hooks so knowledge consumers cannot silently drift
- improve SVI/Psi by reducing knowledge-island gaps across the platform

---

## Core Principle

PRISM needs a single tribal-knowledge spine with many consumers, not many disconnected "tips" features.

The architecture should be:

1. Source capture
2. Canonical knowledge normalization
3. Routing and applicability scoring
4. Consumer delivery
5. Shop feedback capture
6. Promotion / suppression / deprecation
7. Forge-triple enforcement

---

## Knowledge Sources To Unify

### Existing explicit sources

- `TribalKnowledgeEngine`
- `MachiningPlaybookEngine`
- `FormulaRegistry`
- comprehensive machine-domain roadmaps
- setup sheets, travelers, and program-release review notes
- quote revision history and actual-vs-estimate deltas
- alarm remediation history
- inventory/tooling/indexing outcomes
- academy and document-learning extracted knowledge

### Existing implicit sources

- operator timing and shop-floor notes
- hot-job handling and expedite outcomes
- simulation failures and collision near-misses
- tooling substitutions and insert indexing patterns
- purchasing substitutions and distributor lead-time lessons
- material shortages and supplier reliability patterns
- scheduling exceptions and release-gate failures
- NCR / quality / rework / scrap history

### New sources to formalize

- post-prove-out notes from programming and setup
- machine/controller-specific post quirks
- fixture lessons learned
- coolant, holder, and stock-behavior lessons
- customer / part-family repeat intelligence
- per-shop best-practice overrides that outperform defaults

---

## Canonical Knowledge Object Model

Every tribal-knowledge record should converge into a canonical object with:

- `knowledge_id`
- `title`
- `statement`
- `knowledge_type`
  - tip
  - anti-pattern
  - rule
  - workaround
  - failure mode
  - correction
  - heuristic
  - machine quirk
  - post quirk
  - setup lesson
  - quote correction
- `scope`
  - global
  - process-family
  - machine-family
  - controller
  - tool family
  - material family
  - feature type
  - tenant/shop
  - part family
- `applicability_tags`
  - material
  - machine
  - controller
  - operation
  - feature
  - tolerance class
  - finish target
  - risk profile
  - workholding
  - coolant
  - tooling class
- `evidence_level`
  - tribal
  - repeated-local
  - repeated-cross-shop
  - formula-backed
  - simulation-backed
  - production-validated
- `source`
  - engine
  - operator
  - document extraction
  - roadmap/domain pack
  - quote revision
  - shop-floor actual
  - alarm history
  - QA/NCR
- `provenance`
- `confidence`
- `applicable_consumers`
- `conflicts_with`
- `supersedes`
- `last_validated_at`
- `promotion_status`

This must become the common contract for both backend routing and frontend rendering.

---

## Consumer Map

The tribal-knowledge spine must feed these consumers directly.

### Manufacturing calculation and recommendation consumers

- speed/feed
- toolpath ranking
- tool selection
- holder selection
- fixture selection
- workholding and stock recommendations
- machine compatibility / collision posture
- setup-sheet generation
- post-processor recommendations
- rapid-motion and safe-start guidance

### Program pipeline consumers

- `PrintToProgramPipelineEngine`
- `TurningPrintToProgramEngine`
- `MultiAxisPrintToProgramEngine`
- `MillTurnSwissPipelineEngine`
- `EDMProgramAssemblerEngine`
- `GrindingProgramAssemblerEngine`
- `LaserProgramAssemblerEngine`
- `WaterjetProgramAssemblerEngine`
- setup-sheet and program-release workspaces

### Business and operations consumers

- instant quote
- quantity breaks
- lead-time posture
- actual-vs-estimate correction
- tooling ROI recommendations
- purchasing and distributor recommendations
- inventory reorder posture
- shortage prevention
- customer / part-family routing defaults

### Shop-floor and execution consumers

- traveler steps
- employee priorities
- hot-job handling
- labor capture hints
- insert indexing / tooling life workflow
- department check-in guidance
- alarm remediation
- maintenance and predictive health surfaces

### Knowledge and training consumers

- academy recommendations
- document learning
- search and explain surfaces
- messages / inbox summaries when knowledge affects a live record
- role-aware employee help panels

---

## What Must Be Built Or Hardened

## Wave TK-0: Audit And Coverage Matrix

Goal: prove where tribal knowledge already exists, where it is consumed, and where it dies.

Deliverables:

- `TRIBAL_KNOWLEDGE_CONSUMER_MATRIX.json`
- `TRIBAL_KNOWLEDGE_CONSUMER_MATRIX.md`
- coverage audit of every major consumer page and pipeline
- explicit list of engines already using tribal/playbook/formula inputs
- explicit list of engines/pages currently ignoring them

Checks:

- every high-value frontend page mapped
- every print-to-program pipeline mapped
- every quote / actual / safety / alarm surface mapped

SVI effect:

- raises visibility of knowledge-island gaps immediately

Forge-triple rule:

- add an MCP query action for the consumer matrix
- add a slash command/skill to query consumer coverage
- add a protective hook that warns when a new machining consumer launches without a declared knowledge dependency posture

## Wave TK-1: Canonical Tribal Knowledge Spine

Goal: unify tribal knowledge, playbook rules, formulas, and learned corrections under one routing contract.

Needed backend-facing capabilities:

- `KnowledgeApplicabilityEngine`
- `KnowledgePromotionEngine`
- `KnowledgeConflictResolverEngine`
- `KnowledgeConsumerRegistryEngine`
- `KnowledgeFeedbackIngestEngine`

Needed outputs:

- normalized knowledge objects
- applicability scoring
- conflict resolution between local overrides and global defaults
- promotion path from local evidence to cross-shop platform intelligence

Frontend-facing requirement:

- every recommendation surface gets provenance and evidence indicators

Forge-triple rule:

- MCP actions for query, score, promote, suppress
- slash commands/skills for "why did PRISM recommend this?"
- protective hooks that block silent knowledge writes without provenance/evidence fields

## Wave TK-2: Consumer Delivery Layer

Goal: route knowledge into all relevant computation and workflow consumers.

Priority consumer order:

1. speed/feed and toolpath ranking
2. print-to-CNC / program release
3. quote and cost correction
4. safety, alarms, and machine posture
5. shop-floor execution and travelers
6. purchasing, inventory, and tooling lifecycle
7. academy, search, and messaging guidance

Delivery rules:

- recommendations must include matched tribal tips + playbook rules + formulas when applicable
- output must show applicability scope, not generic "best practice"
- local-shop overrides must be visible as local, not silently mixed into global defaults

Forge-triple rule:

- each new consumer integration ships with:
  - protective hook
  - MCP action exposure
  - user-facing slash command/skill or in-app explainer entry point

## Wave TK-3: Learned Data Feedback Loop

Goal: ensure actual shop outcomes keep rewriting the recommendation layer safely.

Feedback sources:

- actual cycle time
- actual labor
- tool life and insert indexing
- crash/collision/near-miss
- prove-out edits
- quote misses
- material yield
- shortage frequency
- quality escapes and rework
- alarm frequency and fix success

Needed behavior:

- local-shop learning updates local priors first
- cross-shop promotion only happens through reviewed aggregation
- degraded or stale knowledge can be suppressed or sunset
- the system must always know which recommendations came from theory vs repeated proof

Forge-triple rule:

- MCP actions for ingesting outcome evidence
- slash command/skill for reviewing candidate promotions and regressions
- hook that flags when a consumer uses promoted knowledge with no recent validation window

## Wave TK-4: Frontend Propagation Standard

Goal: the app UI should make tribal knowledge visible and actionable everywhere it matters.

Frontend standards:

- recommendations carry:
  - rationale
  - evidence level
  - scope
  - source
  - last validation
- employees see the relevant knowledge for their role only
- programming/setup users see machine/controller/post-specific quirks inline
- buyers see sourcing/tooling lessons inline
- estimators see quote correction lessons inline
- alarm users see proven fixes ordered by evidence

Priority frontend surfaces:

- `CalculatorPage`
- `ToolpathAdvisorPage`
- `ProgramReleasePage`
- `JobsPage`
- `SchedulingPage`
- `ShopFloorClockPage`
- `AlarmPage`
- `InventoryPage`
- `PostProcessorGeneratorPage`
- `LearningDashboard`
- `DashboardPage`
- `MessagesPage`

Acceptance:

- a tribal tip learned anywhere relevant can be traced to every consuming surface where it should appear

## Wave TK-5: Platform-Wide Search, Explain, And Messaging

Goal: knowledge should not only influence decisions; it should be discoverable and explainable.

Required features:

- explain-why panel for recommendations
- "show related tribal tips" on key records
- messaging/inbox injection when learned knowledge affects a live job or release
- role-aware search results that distinguish:
  - formula
  - playbook rule
  - shop-specific lesson
  - cross-shop learned pattern

Forge-triple rule:

- MCP action for explain traces
- slash command/skill for "why this recommendation?"
- hook that warns when a recommendation UI is added without an explain pathway

## Wave TK-6: Tenant Specialization + Safe Cross-Shop Learning

Goal: make every shop better from its own data while still improving the platform.

Rules:

- tenant-local learning is default
- cross-shop learning is gated by safe-share policy and normalization
- conflicting local practices remain scoped unless proven portable
- platform promotion requires repeated success across shops or strong evidence

Needed system outputs:

- tenant adaptation score
- promotion candidate queue
- suppressed global rules list
- portability review queue

This wave should connect directly to:

- `FederatedLearningEngine`
- tenant-specific shell/dashboard posture
- SVI/coverage reporting

## Wave TK-7: Forge-Triple Enforcement For Knowledge Growth

Goal: every important tribal-knowledge capability compounds instead of decaying.

For every new tribal-knowledge capability:

1. build or update the engine/pipeline
2. add MCP dispatcher action(s)
3. add slash command or skill
4. add protective hook

Protective hook categories:

- new machining consumer without knowledge dependency declaration
- recommendation output missing provenance or evidence
- local-shop override missing scope
- promoted knowledge missing validation window
- formula-backed claim not linked to `FormulaRegistry`
- new frontend recommendation lane with no explain path

---

## Sequencing Relative To Current Convergence

This roadmap should not interrupt the active finish-current-delivery-first gate.

Execution order:

1. finish active backend/frontend convergence work
2. use this roadmap to shape the next shared `/rgs-sync` pass
3. begin `TK-0` and `TK-1` immediately after convergence stabilizes
4. deliver `TK-2` and `TK-4` in lockstep so backend propagation and frontend visibility do not drift
5. then deliver `TK-3`, `TK-5`, `TK-6`, `TK-7`

Immediate pre-convergence allowance:

- consumer matrix audit
- roadmap/spec generation
- contract design
- hook/skill planning

Avoid before convergence:

- broad new backend feature sprawl
- speculative consumer rewrites without stable routing contracts

---

## Ownership Split

### Claude-owned backend lane

- canonical knowledge object model
- routing and applicability engines
- promotion / suppression pipeline
- dispatcher actions and schemas
- persistence and audit trail
- realtime fanout where knowledge state changes matter
- reviewed cross-shop promotion logic

### Codex-owned frontend lane

- provenance/evidence UI standard
- explain-why surfaces
- consumer adoption across pages
- role-aware visibility
- search/inbox/record-context knowledge delivery
- loading/error/unavailable posture for knowledge-driven UI

### Shared cross-audit after convergence

- Claude audits frontend propagation gaps
- Codex audits backend routing/persistence/exposure gaps
- both feed the next SVI closure roadmap

---

## Acceptance Criteria

- every major machining recommendation surface declares its tribal knowledge dependencies
- every major consumer can show provenance, scope, and evidence level
- every tenant can benefit from local learning without contaminating global defaults
- every promoted cross-shop rule has explicit evidence and validation history
- every new tribal-knowledge capability ships with forge-triple outputs
- every new learning signal has a defined path into the consumer matrix
- SVI/Psi shows measurable reduction in knowledge-island gaps

---

## First Execution Pack After Convergence

1. Build the tribal-knowledge consumer matrix.
2. Define the canonical knowledge object contract.
3. Register all major consumers and pipelines.
4. Add provenance + evidence UI primitives.
5. Wire the first three consumers:
   - speed/feed + toolpath
   - print-to-CNC / program release
   - quote correction
6. Add forge-triple hooks for provenance, explainability, and consumer declaration.

---

## Follow-On Trigger

After the current convergence tranche is complete and the first tribal-knowledge consumer matrix is written:

- run another `/rgs-sync`
- identify every remaining tribal-knowledge propagation gap
- generate the next SVI-maximization follow-on roadmap to push toward `Psi = 100%`
