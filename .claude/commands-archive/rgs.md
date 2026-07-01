---
name: rgs
description: RGS — Roadmap Generation System
---

# RGS — Roadmap Generation System

You are the unified entry point for the PRISM Roadmap Generation System. Based on the arguments, route to the appropriate RGS operation.

---

## 🪨 ATOMIC-FIRST CROSS-REFERENCE (auto-injected 2026-05-08)

**For master-roadmap synthesis, use `/rgs4 atomic-roadmap`** — it writes `PRISM-MASTER-ROADMAP-<date>-atomic.md` directly from the live system-viz with phase order baked in (Phase 0 drift → 1 atomic → 2 wire-up → 3 merges → 4 new-build).

This v1 still works for individual milestones. For any tier-spanning roadmap work, **prepend** this preflight before Stage 0 below:

```bash
node H:/prism/scripts/generate-system-viz.mjs                          # regenerate graph (~5s)
node H:/prism/scripts/system-viz-query.mjs build-order                 # canonical atomic-first phase order
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json   # roadmap-shaped candidate list
```

`atomic-roadmap` route added to Args (delegates to `/rgs4 atomic-roadmap`). Read `H:/prism/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` for the full Atomic-First Build Principle. Cross-versions: `/rgs` (~4%) → `/rgs2` (~15%) → `/rgs3` (~40%) → `/rgs4` (~50%, atomic-first hard rules).

---

## Args: $ARGUMENTS
- Empty or `status`: Show roadmap status (milestone counts, completion, available tracks)
- `brainstorm [topic]`: Brainstorm improvements and generate milestone proposals
- `generate [brief]`: Generate a new milestone from a brief (runs the 10-stage pipeline)
- `continue [milestone-id]`: Continue executing a milestone from its current position
- `list`: List all milestones with status
- `plan [milestone-id]`: Show execution plan for a milestone without executing
- `utilize [topic]`: Search 576+ MCP actions for the right tool (routes to action_search)
- `atomic-roadmap`: Generate the canonical atomic-first master roadmap from live system-viz (delegates to `/rgs4 atomic-roadmap`)

## SAFETY-CRITICAL TEST LAW (HARD RULE — PEOPLE CAN DIE)
PRISM generates CNC programs that control machines capable of killing operators. Every test
generated or run at ANY stage of the RGS pipeline MUST be a REAL test that PROVES the code
produces correct, safe output. Violations of this law are not bugs — they are safety defects.

### What "REAL TEST" means:
- **Tests MUST exercise the actual engine** with realistic inputs (real materials, real thicknesses, real wire diameters)
- **Tests MUST validate output values** against published physics or manufacturer data, NOT just check "is number > 0"
- **Tests MUST verify dimensional accuracy** — if the engine computes an offset, the test must verify the offset produces correct final part dimensions
- **Tests MUST check safety limits** — wire breakage current density, maximum taper angle, minimum radius vs wire diameter
- **Tests MUST NOT use loose ranges** like "between 0.004 and 0.020" (±250% tolerance) — use ±5-15% of published values
- **Tests MUST NOT be vacuously true** — a test that passes with ANY input is not a test
- **Tests MUST include failure cases** — what happens with NaN, zero thickness, impossible Ra target, wire too large for feature

### BANNED test patterns (enforcement hook BLOCKS these):
```
expect(value).toBeGreaterThan(0)           // Proves nothing — ANY positive number passes
expect(value).toBeLessThan(1000)           // Proves nothing — 999 is not correct
expect(array.length).toBeGreaterThan(0)    // Proves array exists, not that contents are correct
expect(result).toBeDefined()               // Proves code ran, not that output is right
expect(offset).toBeGreaterThan(0.1).and.toBeLessThan(0.5)  // ±250% is not validation
```

### REQUIRED test patterns (minimum for safety-critical code):
```
expect(ra_um).toBeCloseTo(published_ra, 1)              // Within ±10% of published Klocke value
expect(offset_mm).toBeCloseTo(physics_derived_offset, 2) // Within ±1% of DiBitonto model
expect(feed_mm_min).toBeCloseTo(mrr_derived_feed, 1)     // Within ±10% of energy balance
expect(generated_gcode).toContain('G41')                  // Structural correctness
expect(pass3_arc_dir).not.toBe(pass1_arc_dir)             // Reversal verified
expect(current_density).toBeLessThan(MAX_WIRE_CURRENT_DENSITY) // Safety limit
```

### Per-unit test requirements:
- **Physics engines**: Minimum 5 material×thickness combinations validated against published data
- **G-code generators**: Generated program must be parseable back to verify coordinates match input geometry
- **Offset calculations**: Verify final part dimension = programmed dimension ± tolerance
- **Feed calculations**: Compare against published manufacturer cutting condition tables
- **Safety gates**: Verify gate BLOCKS programs that would break wire or exceed machine limits

This law applies to ALL roadmap tracks, not just Wire EDM. CNC is inherently dangerous.
Any roadmap unit that ships without real validation tests is a safety defect.

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Sonnet 4.6 for `generate`/`continue`/`brainstorm`, Haiku 4.5 for `status`/`list`/`plan`
- **Advisor**: Opus 4.6, `max_uses: 2` (only for `generate` — complex 10-stage pipeline)
- For `status`, `list`, `plan`, `utilize`: no advisor needed (read-only/lookup).
- For `generate`: advisor validates scope and scrutinizes output quality.

## EXHAUSTIVE SCIENCE LAW (HARD RULE)
- **Exhaust ALL mathematical, statistical, and scientific possibilities** when brainstorming or generating milestones.
- Consider every applicable model, formula, algorithm, and combination — including novel cross-domain approaches.
- "Already covered" claims REQUIRE citing the SPECIFIC existing engine/formula/algorithm by name.
- Check PRISM's 499 formulas, 1,304+ engines, 60+ algorithms for existing coverage before proposing new work.
- **Completeness > Speed.** A missed mathematical model is a permanent capability gap.

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — EVERY SESSION)

Every roadmap session MUST use the MCP server's full 576+ actions. Current utilization was ~3% — this protocol raises it to 40%+.

### Session Start (before ANY code work):
```
prism_session:context_boot           — Full context hydration from prior session
prism_session:dispatcher_map         — Discover all 79 dispatchers, 3,310+ actions (live count)
prism_session:memory_recall          — Load cross-session knowledge
prism_session:system_snapshot        — Capture baseline system state
prism_session:action_search "<goal>" — Find the right MCP action for this session's work
```

### During Work (every 5-10 tool calls):
```
prism_session:auto_checkpoint        — Save incremental state
prism_session:action_search "<need>" — Route intent to optimal dispatcher
prism_session:tool_route_best        — Let MCP recommend the best tool
prism_session:wip_capture            — Snapshot work-in-progress
```

### Session End / Pre-Compact:
```
prism_session:memory_save            — Persist cross-session knowledge
prism_session:system_snapshot        — Capture post-work state (diff against baseline)
prism_session:checkpoint_enhanced    — Detailed checkpoint with artifact list
```

### Plugin & Extension Utilization:
```
Vitest MCP:       mcp__vitest__run_tests, analyze_coverage, list_tests
ESLint MCP:       mcp__eslint__lint-files (TypeScript quality gate)
Taskmaster:       mcp__taskmaster-ai__get_tasks, next_task, set_task_status
Codebase Memory:  codebase-memory-mcp search_graph, trace_call_path
Excel MCP:        mcp__excel__excel_read_sheet (data import/validation)
```

### Feature Cascade Protocol:
```
SESSION_ARTIFACTS.json  — Tracks new engines/hooks/skills built per session (auto by PostCompact)
.compaction-survival.md — Preserves critical state across compaction boundaries
HANDOFF.md              — Per-agent state written on stop, read on startup
SVI-compact.md          — System health snapshot auto-generated pre-compact
MEMORY.md               — Shared memory auto-synced across sessions/machines
```

### Skill Utilization (use these, don't reinvent):
```
/forge-engines, /forge-wiring, /prism-review, /test, /physics-verify,
/forge-triple, /calibrate, /navigate, /playbook, /scrutinize, /trace,
/action-search, /action-help, /program-validate, /auto-speed-feed,
/checkpoint, /scope, /codebase-memory-tracing, /hook-browse,
/discover, /census, /pillar, /token-economy, /learn-path, /workflow
```

### MXU Intelligence Actions (use for gap analysis + validation):
```
prism_dev:utilization_map            — Full utilization report (UtilizationContractEngine)
prism_dev:utilization_gaps           — Find unwired capability gaps
prism_dev:capability_census          — Live file system census
prism_dev:capability_census_report   — Formatted utilization report
prism_dev:discover_search            — Search capabilities by keyword
prism_dev:discover_what_can_i_do     — Full capability overview
prism_dev:pillar_summary             — Product pillar readiness
prism_dev:effectiveness_validate     — Run E2E validation tests
prism_dev:effectiveness_report       — Usage effectiveness scoring
prism_dev:copilot_check_duplication  — Check before creating new engines
prism_dev:token_economy_report       — Session token analysis
prism_dev:memory_search              — Cross-session knowledge recall
```

## Route: status (default)
Read `H:/prism/mcp-server/data/roadmap-index.json` and present:
```
RGS STATUS
==========
Roadmap:  v[X.Y.Z] | [X]/[Y] milestones ([Z]%)
Tracks:   [list tracks with counts]

By Track:
  QA   — [X]/[Y] complete
  REM  — [X]/[Y] complete
  SYS  — [X]/[Y] complete
  S3   — [X]/[Y] complete
  ...

Unblocked Next:
  [milestone-id]  [title]  [track]  [status]
  ...
```

## Route: brainstorm
1. Read `H:/prism/state/CURRENT_POSITION.md` for context
2. Read the roadmap index to understand what's done and what's planned
3. **MXU Gap Intelligence** — call these BEFORE brainstorming:
   - `prism_dev:utilization_map` → UtilizationContractEngine shows domain coverage gaps
   - `prism_dev:effectiveness_report` → CapabilityEffectivenessEngine shows underused capabilities
   - `prism_dev:pillar_summary` → ProductPillarEngine shows incomplete product pillars
   - `prism_dev:capability_census` → CapabilityCensusEngine shows dark engine count
   Use these to PRIORITIZE brainstorming toward actual gaps, not guesses.
4. If a topic is given, focus brainstorming on that area
5. If no topic, analyze system gaps holistically:
   - What QA findings remain unaddressed?
   - What system debt exists?
   - What user-facing features are next?
   - What automation opportunities exist?
   - What MXU engines report as underutilized? (from step 3)
5. Present 3-5 concrete milestone proposals with:
   - Title, track, estimated units, dependencies, rationale
6. Ask which to generate (or generate all)

## Route: generate
Execute the 10-stage RGS pipeline with ENFORCED quality standards:

### Stage 1: Brief Analysis
Parse the brief into structured form: domain, machine types, complexity, dependencies.

### Stage 2: Codebase Audit
Search existing assets — ENGINE_DIGEST.md (1,304+ engines), DISPATCHER_DIGEST.md (79 dispatchers),
FormulaRegistry (499 formulas), AlgorithmRegistry (60+ algorithms). Use knowledge graph
(search_graph, get_architecture) to find what already exists. NEVER propose building something
that already exists without citing the specific engine by name.

### Stage 3: Knowledge Source Mapping (MANDATORY)
For EVERY milestone being generated, identify ALL relevant knowledge sources:
```
ENGINES: [list every existing engine that's relevant — by name + line count]
TRIBAL KNOWLEDGE:
  - TribalKnowledgeEngine — query for domain-specific tips (3,700+ across 18 CAM systems)
  - MachiningPlaybookEngine — 296 rules, especially anti-patterns for this domain
  - src/data/*-cam-tips.ts — specific tip files for relevant CAM systems
  - controller-knowledge-tips.ts — if controller-specific
  - Academy courses — if educational content exists for this domain
FORMULAS:
  - FormulaRegistry — specific formulas needed (Kienzle, Taylor, Malkin, Sato, Schulz, Zeng-Kim, etc.)
  - src/physics/constants.ts — canonical constants that MUST be used (never inline)
  - Published data sources — Sandvik, Kennametal, Machinery's Handbook, manufacturer catalogs
REFERENCE:
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — matching reference programs
  - MachineRegistry — relevant machines from 910-machine database
  - MaterialRegistry — relevant materials from database
  - ToolCatalogEngine — relevant tools from 95,608-tool catalog
```
If knowledge sources can't be identified for a milestone, the milestone is UNDERSPECIFIED. Fix before proceeding.

### Stage 4: Scope Estimation
Classify complexity (S/M/L/XL). Calculate session count based on:
- 2-3 units per session MAX (for quality)
- /compact after every 3 units
- Each unit includes 4-loop overhead (SCRUTINIZE + GAP FILL + TIE UP)

### Stage 5: Phase Decomposition
Break into ordered phases with EXPLICIT session boundaries:
```
SESSION [N]: [title] (U-XXX01..U-XXX03)
  SMART CONFIG: Role=<role> + <specialist> | MODEL=<opus/sonnet/haiku> | EFFORT=<MAX/HIGH> | CONTEXT_BUDGET=<XX%>
  KNOWLEDGE: [per-session knowledge sources from Stage 3]
  INTENT: [what the machinist/user experiences after this session]
  SKILLS: [which /skills, /scripts to use]
  PLUGINS: [which MCP plugins to use — Vitest, ESLint, codebase-memory, etc.]
  MCP_LIFECYCLE: [context_boot, dispatcher_map, memory_recall, auto_checkpoint, memory_save]
  WORK:
    U-XXX01: [unit title]
      → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
      FILES_CREATED: [list]
      FILES_MODIFIED: [list]
      ABORT_CRITERIA: [>= 3 measurable, ZERO TOLERANCE for refactors]
      ROLLBACK: [specific git commands]
    U-XXX02: ...
  FORGE-TRIPLE: hook={name} + action=prism_{dispatcher}:{action} + skill=/{skill}
  EXIT GATE: ✓ [measurable criteria] | omega_floor >= 0.90 | SVI delta: +X%
  FEATURE CASCADE:
    NEW_HOOKS: [hook_name → protection_scope]
    NEW_ACTIONS: [dispatcher:action → consumer_intent]
    NEW_SKILLS: [/skill → trigger]
    AVAILABLE_TO: [downstream sessions — MUST include ALL consumers, not just next session]
  /compact checkpoint
```

### Stage 6: Unit Population
Fill all schema fields per unit. EVERY unit MUST have:
- Clear build description with U-{DOMAIN_PREFIX}{NN} naming (e.g., U-LTH01, U-MIL01)
- Knowledge sources to consult BEFORE building
- Exit criteria (not just "it compiles" — "machinist would accept this output")
- Rollback block (FILES_CREATED, FILES_MODIFIED, ABORT_CRITERIA, ROLLBACK_PROCEDURE)
- 4-LOOP gate explicitly stated
- Dependencies on prior units (Depends on: U-XXX01)

### Stage 7: Forge-Triple Ownership (MANDATORY — SCRUTINY-HARDENED)

**CRITICAL: Every forge-triple must have CLEAR, SINGLE OWNERSHIP.**

For every milestone, define the FORGE-TRIPLE outputs:
```
FORGE-TRIPLE for [milestone]:
  PROTECTIVE HOOK: [what enforcement hook protects this new capability]
  MCP ACTION: [what dispatcher action makes this callable by PRISM app]
  SKILL/COMMAND: [what /slash command gives users access]
  BUILT_IN: [which milestone + unit actually CREATES this artifact]
```

**Ownership Rules (prevents the double-claim bug):**
- A forge-triple artifact (hook/action/skill) is BUILT in exactly ONE unit across the entire roadmap
- If a milestone DECLARES a forge-triple but doesn't BUILD it, mark: "DECLARED here, BUILT in [MS-ID] [U-ID]"
- If a milestone CONSUMES a forge-triple from another milestone, mark: "CONSUMED from [MS-ID]"
- NEVER list an artifact in `feature_cascade.new_hooks` unless the session's units contain build instructions for it
- The milestone that BUILDS the forge-triple lists it in `feature_cascade.new_*`
- Milestones that only DECLARE or CONSUME do NOT list it in `feature_cascade.new_*`
- If enforcement hooks are deferred to a later milestone, say so explicitly: "Enforcement hooks built in [MS-ID], manually enforced until then"

No milestone ships without all 3 outputs defined (declared OR built).

### Stage 8: Enforcement Integration (MANDATORY)
Document which enforcement hooks fire during this roadmap's execution:
- PRE-LEVEL: knowledge-consult, context-retention (verify domain sources read)
- POST-LEVEL: stub detector, test quality, constants checker, physics agent, wiring agent
- COMPACT-LEVEL: review gate, wiring gate, forge-triple gate, session audit agent
- POST-COMPACT: Feature Cascade (SESSION_ARTIFACTS.json auto-written)
These are AUTOMATIC — document them so the executor knows they're active.

### Stage 9: Dependency Resolution (SCRUTINY-HARDENED)
Validate DAG, resolve references. Check that:
- No unit depends on something not yet built
- No circular dependencies
- Compaction points don't split dependent units
- Unit names use U-{DOMAIN_PREFIX}{NN} format (no bare U01)
- **Cross-track dependencies declared** (if this roadmap modifies engines that other tracks test/depend on, declare soft dependencies on QA-MS0, SYS-MS2, or relevant milestones)
- **available_to lists ALL downstream consumers** (not just the next session — include the final milestone if it needs upstream outputs)

### Stage 10: Output + 10-Agent Scrutiny (MANDATORY)
Write envelope to `data/milestones/{ID}.json`, update `roadmap-index.json`.

**10-AGENT POST-GENERATION SCRUTINY (MANDATORY — PARALLEL):**

Launch 10 review agents in parallel, each with a DISTINCT role. Each agent reads ALL milestone
envelopes and scores 0-100 on their dimension. This is not optional — it is the quality gate.

**Agent 1: Protocol Structure**
- Every session has SMART CONFIG (role, model, effort, context_budget)?
- Every session has KNOWLEDGE, INTENT, EXIT GATE, SKILLS, PLUGINS, MCP_LIFECYCLE?
- Every unit has four_loop, rollback, exit_criteria (3+ items)?
- compact_checkpoint after every 3 units?
- forge_triple and enforcement blocks on every milestone?

**Agent 2: Unit Naming**
- All IDs use U-{DOMAIN_PREFIX}{NN} format (no bare U01)?
- Zero collisions across all milestones?
- Sequential numbering within prefix?
- Domain prefix matches milestone theme?

**Agent 3: Dependency Graph**
- No circular dependencies (milestone or unit level)?
- All depends_on references point to existing units/milestones?
- Index dependencies match envelope dependencies?
- Compaction points don't split dependent units?
- Cross-track dependencies declared where needed?

**Agent 4: Exit Gate Rigor**
- Every criterion is measurable with a specific command or tool?
- Refactor units have regression checks (snapshot pre/post diff)?
- omega_floor >= 0.90 on all sessions (no unjustified drops)?
- abort_criteria are specific enough to trigger rollback (no vague "something breaks")?
- Minimum 3 exit_criteria per unit?
- Physics/manufacturing units include "machinist would accept this output"?

**Agent 5: Completeness Coverage**
- Every issue in the brief/audit is addressed by at least one unit?
- No orphaned problems (issues mentioned but no unit targets them)?
- Additional gaps identified? (misclassified files, mixed-concern services, etc.)
- Scope is complete — doesn't leave 23 of 26 violations unaddressed when it should cover all

**Agent 6: Physics Rigor** (only if roadmap touches physics/constants/formulas)
- Physics constant rewiring has SNAPSHOT-DIFF protocol (log old, log new, assert equality)?
- Regression test CREATION mandated if none exists (not just "tests pass" which is vacuously true)?
- AtomicValue outputs verified unchanged after refactoring?
- Service interfaces propagate dimensional metadata ({value, unit, source} not bare numbers)?
- /physics-verify and /calibrate referenced in correct sessions?
- Constants being rewired actually EXIST in target source (verify before referencing)?

**Agent 7: Forge-Triple Ownership**
- Every forge-triple has SINGLE ownership (one unit BUILDS it)?
- No double-claims (artifact listed in new_* of multiple sessions)?
- DECLARED vs BUILT vs CONSUMED clearly marked?
- feature_cascade.new_* only populated in the session that BUILDS artifacts?
- If a milestone "activates" another's hook, there's an implementing unit?

**Agent 8: Feature Cascade**
- available_to references all exist?
- Downstream sessions list upstream outputs in knowledge_sources?
- new_hooks/actions/skills populated only in the session that CREATES them?
- No dangling references (session produces something no one consumes)?
- Terminal milestone (enforcement) references all upstream outputs?

**Agent 9: MCP Utilization**
- Every session has SKILLS array with domain-appropriate skills?
- Every session has PLUGINS array (Vitest MCP, ESLint MCP, codebase-memory where relevant)?
- Every milestone has mcp_lifecycle block (context_boot through memory_save)?
- /checkpoint, /scope, /codebase-memory-tracing referenced for large refactors?
- No phantom skills referenced (all exist in skill registry)?
- Sessions touching 10+ engines reference /scope for impact analysis?

**Agent 10: Cross-Roadmap Coherence**
- No duplication with existing SYS/QA/REM/CC tracks?
- Dependencies on non-track milestones declared (QA-MS0, SYS-MS2)?
- No concurrent modification risk with other not_started milestones?
- Track ownership is correct (right track for this type of work)?
- BASELINE_INVENTORY.json re-verification included if engine counts change?

**Scoring & Fix Protocol:**
```
Average >= 80: PASS — write to disk, register in index
Average 70-79: CONDITIONAL — fix the 3 lowest-scoring dimensions, re-verify >= 70 each
Average < 70:  FAIL — fix ALL dimensions below 70, re-run full 10-agent scrutiny
Any agent < 40: BLOCK — that dimension has a critical defect, fix before proceeding
```

After fixes, report the before/after scores so the user can see improvement.

### QUALITY STANDARD FOR ALL GENERATED ROADMAPS
Every roadmap generated by /rgs MUST include:
1. **MCP Full Utilization Protocol** — per-milestone `mcp_lifecycle` block (context_boot, dispatcher_map, memory_recall, auto_checkpoint, memory_save)
2. Per-session **SMART CONFIG** (role, model, effort, context_budget)
3. Per-session **KNOWLEDGE SOURCES** (engines, tribal, formulas, reference — multi-source)
4. Per-session **INTENT** (what the machinist experiences, not just what code does)
5. Per-session **SKILLS** array with domain-appropriate skills (include /checkpoint, /scope for large refactors)
6. Per-session **PLUGINS** array (Vitest MCP, ESLint MCP, codebase-memory-mcp where relevant)
7. **4-LOOP** protocol per unit (BUILD → SCRUTINIZE → GAP FILL → TIE UP)
8. **FORGE-TRIPLE** per milestone with SINGLE OWNERSHIP (DECLARED/BUILT/CONSUMED clearly marked)
9. Per-unit **ROLLBACK BLOCK** (FILES_CREATED, FILES_MODIFIED, ABORT_CRITERIA with zero-tolerance for refactors, ROLLBACK_PROCEDURE)
10. Per-unit **EXIT CRITERIA** — minimum 3 measurable items, refactors MUST include snapshot pre/post diff regression check, physics units MUST include machinist-acceptance criterion
11. Per-session **EXIT GATE** with measurable criteria, omega_floor >= 0.90, SVI delta
12. **FEATURE CASCADE** block — new_* only in sessions that BUILD artifacts, available_to includes ALL downstream consumers including terminal milestone
13. **/compact** every 3 units with compaction survival + Feature Cascade
14. **U-{PREFIX}{NN}** unit naming (no bare U01 — prevents collisions)
15. Enforcement hook documentation (which hooks are active)
16. Plugin utilization per session
17. No stub tolerance — enforcement hooks BLOCK placeholder code
18. **Cross-track dependencies** declared where this roadmap touches engines/tests owned by other tracks
19. **BASELINE_INVENTORY.json** re-verification if engine/hook/skill counts change
20. **10-agent post-generation scrutiny** — average >= 80, no agent < 40, all fixes applied before output

### ANTI-PATTERNS TO REJECT (learned from ARCH-track scrutiny 2026-04-03):
- **Double-claim bug**: Same hook/action/skill in multiple sessions' `new_*` → ownership conflict
- **Phantom activation**: Claiming to "activate" a hook with no implementing unit
- **Vacuous regression**: "Tests pass" on an engine with no tests = vacuously true. Mandate test CREATION.
- **Vague abort criteria**: "Something breaks" or "Hook blocks legitimate edits" → untestable. Specify threshold.
- **Incomplete coverage**: Addressing 3 of 26 violations when audit found all 26. Cover the full scope.
- **Missing regression diff**: Refactoring an engine without before/after output comparison.
- **Dropped omega_floor**: Lowering from 0.90 to 0.85 without justification.
- **Orphaned available_to**: Terminal milestone depends on MS0 outputs but MS0's available_to omits it.
- **MCP lifecycle gap**: No checkpoint/restore strategy for sessions touching 15+ engines.
- **Cross-track blindness**: Modifying engines that QA/SYS tracks test, without declaring dependency.
- **Bare-number physics**: Service interface returns `number` instead of `{value, unit, source}`.
- **Fake tests (SAFETY DEFECT)**: Tests that use `toBeGreaterThan(0)` or `toBeLessThan(1000)` or ±250% tolerance ranges instead of validating against published data. These prove nothing and mask errors that could cause machine crashes, wire breakage, or operator injury. Every test must compare against a SPECIFIC published value with ±5-15% tolerance.
- **Untested safety limits**: Engine generates parameters without verifying wire current density, machine axis limits, minimum feature radius, or maximum taper angle. Missing safety checks = potential equipment damage or injury.
- **Semantic prefix drift**: Using DISP prefix for non-dispatcher I/O units. Match prefix to content.

This is the standard established by CAMX-RESTRUCTURED-ROADMAP-v24.md, the 8 per-machine
comprehensive roadmaps, the 20-agent scrutiny audit of 2026-03-30, and the ARCH-track
10-agent scrutiny + fix cycle of 2026-04-03.

## Route: continue
Load the milestone envelope and execute units with FULL quality enforcement:

**MCP UTILIZATION AT SESSION START:**
```
prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
Read SESSION_ARTIFACTS.json for Feature Cascade (new engines/hooks/skills from prior sessions)
```

1. Find the first `not_started` or `in_progress` unit
2. Read KNOWLEDGE SOURCES for this milestone (from roadmap or envelope)
3. Consult tribal knowledge + playbook + formulas for the domain BEFORE building
4. Execute unit steps with specified tools
5. **4-LOOP per unit (SAFETY-CRITICAL TEST LAW APPLIES TO EVERY LOOP):**
   - LOOP 1 SCRUTINIZE: /prism-review + /scrutinize → fix findings. Tests must validate ACTUAL output values against published data.
   - LOOP 2 GAP FILL: /test + /trace wiring + edge cases → fill gaps
   - LOOP 3 TIE UP: no TODOs, reasoning[], golden snapshot → polish
6. Verify exit conditions (measurable criteria, omega_floor, SVI delta)
7. Update envelope and index on completion
8. **Every 3 units: /compact (auto-triggered by hook) → /startup → continue**
9. **Every milestone complete: /forge-triple → generate protective hook + MCP action + skill**
10. Proceed to next unit or report completion

**MCP UTILIZATION DURING WORK (every 5-10 calls):**
```
prism_session:auto_checkpoint → action_search → tool_route_best → wip_capture
```

**MCP UTILIZATION AT SESSION END:**
```
prism_session:memory_save → system_snapshot → checkpoint_enhanced
PostCompact hook auto-writes SESSION_ARTIFACTS.json (Feature Cascade)
```

ENFORCEMENT HOOKS ACTIVE DURING EXECUTION:
  - Physics agent reviews every engine edit for formula correctness
  - Wiring agent reviews every engine for MCP readiness
  - Constants checker blocks inline physics values
  - Stub detector blocks placeholder returns
  - Test quality blocks || true and bare .includes()
  - Auto-compact fires at 15/25/35 edit thresholds
  - Forge-triple gate blocks compaction without hook + action + skill
  - Session audit agent reviews work before every compaction
  - PostCompact: Feature Cascade writes SESSION_ARTIFACTS.json for next session
  - SessionStart: reads Feature Cascade, reports live system counts + new capabilities

## Route: list
Read `H:/prism/mcp-server/data/roadmap-index.json` and show all milestones in a compact table:
```
ID        | Title                              | Track | Status       | Units
----------|--------------------------------------|-------|--------------|------
QA-MS0    | Audit Framework & Baseline           | QA    | complete     | 6/6
SYS-MS0   | CLAUDE.md Modular Architecture       | SYS   | not_started  | 0/6
...
```

## Route: plan
Load the milestone envelope and show the execution plan without running anything:
- All phases and units in order
- Dependencies between units
- Estimated sessions and token cost
- Which units can run in parallel
- MCP actions available for each unit's domain

## Route: utilize
Search 576+ MCP actions to find the right tool:
```
prism_session:action_search { query: "$ARGUMENTS" }
```
Returns matching dispatcher actions with descriptions and parameter hints.
