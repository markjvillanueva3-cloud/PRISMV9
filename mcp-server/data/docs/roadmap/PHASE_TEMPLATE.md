# PHASE TEMPLATE — v13.9 (Brainstorm-to-Ship Quality Floor)
# USE: When expanding R3-R6 stubs into full phase documents.
# PROCESS: Load stub + PHASE_FINDINGS.md (tiered) + this template → brainstorm → ship.
# v13.9: Cross-Audit Governance Hardening — 3 new required sections added.
#         ARTIFACT MANIFEST: REQUIRES/PRODUCES must be declared in context bridge (XA-1).
#         TEST LEVELS: Each MS must declare which L1-L7 test levels are required (XA-7).
#         FAULT INJECTION: Each phase must include one fault injection test (XA-13).
# v13.8: Third Infrastructure Audit — multi-session MS cumulative state protocol (IA3-4.1).
#         worked example reference (IA-10.2), framework growth monitoring checklist item.
# v13.5: Gap Analysis hardening — 8 new checklist items from 42-finding audit.
#         Cross-field physics validation required on safety calcs.
#         Material sanity checks on data loads. Reference values for tolerance tests.
#         Calc result versioning meta block. Schema migration requires pre-bump git commit.
# v13.3: Added Manus Law cognitive guard clarification. Test count tracking across phases.
# v13.2: Added coding hardening checklist items (PrismError, apiTimeout, atomicWrite,
#         result ordering, content verification, rate limiting, vitest, tolerance import).
# v13.1: Restored session management block for MEDIUM/HIGH effort MS.

---

## TEMPLATE STRUCTURE

Every expanded phase doc MUST include ALL of these sections:

### 1. HEADER BLOCK
```
# PHASE [ID]: [TITLE] — v13.0
# Status: not-started | Sessions: [N] | MS: [N] (MS0-MSN) | Role: [from §Role Protocol]
# ENV: [Code N% + MCP N%] | Model: [Haiku→Sonnet→Opus] | CC Subagents: [list or none]
# Pattern: [AUDIT/LOAD/SETUP] → [FIX/EXECUTE/BUILD] → [VERIFY/VALIDATE] → DOCUMENT
# v13.0: [List Opus 4.6 features used in this phase]
```

### 2. CONTEXT BRIDGE
```
WHAT CAME BEFORE: [1-3 sentences. What prior phase produced. Key outputs.]
WHAT THIS PHASE DOES: [2-4 sentences. Core mission.]
WHAT COMES AFTER: [1-2 sentences. What next phase expects from this one.]

ARTIFACT MANIFEST (XA-1 — REQUIRED):
  REQUIRES: [list all files this phase needs at entry — check SYSTEM_CONTRACT.md §Artifact Dependency Table]
  PRODUCES: [list all files this phase creates at exit]
```

### 3. OBJECTIVES (numbered, measurable)
Each objective MUST be verifiable with a specific prism_ call or file check.
Final objective MUST include: "TEST LEVELS: L[N]-L[N] required"
  (See SYSTEM_CONTRACT.md §Test Taxonomy for L1-L7 definitions)

### 3.5. FAULT INJECTION TEST (XA-13 — REQUIRED, one per phase)
```
[PHASE] FAULT TEST: [what to break] → [expected behavior].
  WHEN: [at which MS point — after a working baseline exists]
  HOW:  [specific steps to inject the fault]
  EXPECTED: [graceful behavior — degradation, error message, block]
  PASS: [criteria for success]
  FAIL: [what failure looks like]
  EFFORT: ~[N] calls
```

### 4. MS DEFINITIONS (one per milestone)
Each MS MUST include:
```
## [PHASE]-[MSN]: [Title]

**Effort:** ~[N] calls | **Tier:** [STANDARD/DEEP/RELEASE] | **Context:** ~[N]KB
**Response Budget:** ~[N]KB throughput, ~[N]KB peak
**Execution:** [CC | MCP | Hybrid] — [which steps run where and why]
  CC steps: [list step numbers that run in Claude Code, e.g. "Steps 2-4: bulk file processing"]
  MCP steps: [list step numbers that run in MCP, e.g. "Step 1: safety calc, Step 5: Ralph gate"]
  Subagents: [which subagent(s) if any, e.g. "registry-expert for schema, Haiku×3 for parallel scan"]
  WHY this split: [one line, e.g. "bulk file ops = CC, safety validation = MCP server-side"]
**Entry:** [prerequisite MS] COMPLETE.

[numbered steps in code block]

**Rollback:** [specific revert instructions]
**Exit:** [measurable exit criteria]
```

### 5. SESSION MANAGEMENT (for MEDIUM/HIGH effort MS)

```
Classify each MS by compaction risk:
  LOW:    <15 calls, <10KB throughput → no special handling needed
  MEDIUM: 15-30 calls OR 10-25KB throughput → flush after each group + micro-checkpoints
  HIGH:   >30 calls OR >25KB throughput → flush after each group + micro-checkpoints per sub-unit

For MEDIUM/HIGH MS, include in the MS definition:
  FLUSH POINTS: [Where to flush non-regenerable results to disk]
  MICRO-CHECKPOINTS: [Where to write sub-checkpoints for recovery granularity]
  FLUSH VERIFICATION: MANDATORY for non-regenerable data, OPTIONAL for diagnostics

Compaction API handles overflow automatically. These patterns exist for:
  (a) Cross-session persistence (results survive session boundaries)
  (b) Claude.ai fallback (where API config is not directly controllable)
  (c) Recovery granularity (re-execute 1-3 calls instead of 15-45)

MULTI-SESSION MS (>2 sessions expected — IA3-4.1):
  At each session boundary within an MS, write to CURRENT_POSITION.md:
    "CURRENT: [MS-ID] step [N]/[total] | BATCH: [M]/[total_batches] |
     CUMULATIVE: [pass_count]/[total_processed] pass_rate=[%] |
     QUARANTINE: [list of failing materials] |
     LAST_COMPLETE: [prior-MS] [date] | PHASE: [ID] in-progress"
  This costs 0 extra calls (piggybacks on existing position update).
  Session N+1 reads CURRENT_POSITION.md → knows exact batch position AND aggregate state.
  Without this, session N+1 must re-read all flushed result files to reconstruct aggregates.
```

### 6. OPUS 4.6 PATTERNS (for each MS, specify)
```
For EACH step that calls prism_ or API:
  EFFORT: Which tier? (max/high/medium/low)
  STRUCTURED OUTPUT: Required? Which schema?
  PARALLEL: Can this group run concurrently with others?
  FAST MODE: Eligible for speed: "fast"? (LOW effort only)
  CONTEXT EDITING: Clear tool results after consumption?
  FLUSH: Non-regenerable → flush to file for cross-session persistence
```

### 7. PARALLELISM MAP
```
Which MS can run in parallel? Which are sequential?
Which steps WITHIN an MS can run in parallel via Agent Teams?
Draw the dependency graph.
```

### 8. GATE REQUIREMENTS
```
Ralph >= [grade] | Omega >= [threshold] | Build passes
[Phase-specific requirements]

MANDATORY QUALITY RULE (Roadmap Audit 2026-02-17 Finding 7):
  Every gate that checks a COUNT must also check QUALITY.
  Minimum: 3 random items from the counted set reviewed against quality criteria.
  Examples:
    "Skill count >= 300" → also: "3 random skills pass v2.0 anti-template test"
    "Registry coverage >= 95%" → also: "3 random records have physically reasonable values"
    "Action exists and runs" → also: "Sample output reviewed against reference, not just no-error"
  WHY: Count-only gates caused the skill template disaster (116/116 pass, 0/116 useful).
  A gate that checks existence without checking quality is not a gate.
```

---


---

## WIRING PROTOCOL (v14.5 -- MANDATORY for every MS that creates a capability)

After completing ANY milestone that adds a new action, engine, or capability:

```
1. COMPANION SKILL: Create or update the skill that teaches Claude how to use it
   Location: skills-consolidated/prism-[name]/SKILL.md (MCP) + .claude/skills/[name].md (CC)
   Contains: WHEN TO USE, HOW TO USE, WHAT IT RETURNS, EXAMPLES (v2.0 format - all UNIQUE)
   Quality: Must pass v2.0 anti-template test. Read skill-authoring-checklist v2.0 first.
   
2. COMPANION HOOK: Register validation hook if the capability has safety/quality implications
   Location: hookRegistration.ts + .claude/settings.json
   Types: blocking (prevents bad input), warning (alerts on quality), telemetry (tracks usage)
   Quality (Audit F4): Each hook MUST specify:
     - 1 positive test case (hook allows good input)
     - 1 negative test case (hook blocks bad input)
     - 1 edge case (boundary condition)
   One-liner descriptions are NOT sufficient. If you can't define test cases, the hook is too vague.

3. UPDATE INDEXES:
   SKILL_PHASE_MAP.json: Add skill to current phase's auto-load list
   SKILL_INDEX.json: Add entry with triggers, tags, relationships
   CODEBASE_INDEX.json: Add entry for new engine/action/chain

4. SMOKE TEST: Execute 1-3 realistic queries that USE the new capability end-to-end
   The query must exercise the real code path, not just unit tests
   Document the smoke test query + expected result in the MS gate criteria
   Example: "Calculate speed/feed for 4140 turning" -> verify S(x)>=0.70, structured output valid

5. VERIFY COMPANION FIRES: Run a scenario that triggers the hook and loads the skill
   If hook doesn't fire -> fix registration. If skill doesn't load -> fix triggers.

GATE CHECK: All 5 wiring steps complete for every MS that created a capability.
If a MS doesn't create a new capability (e.g., pure data loading), steps 1-2 are optional.
```

## WIRING VERIFICATION AUDIT (v15.0 — REQUIRED after infrastructure phases)

After phases that build significant infrastructure (DA, R1, R3, R6), insert one audit
session BEFORE the phase gate passes. Purpose: catch orphaned artifacts — things built
but never called, referenced, or consumed downstream.

```
AUDIT PROCEDURE (1 session, Sonnet, 5-8 calls):

STEP 1 — INVENTORY WHAT THIS PHASE BUILT:
  Run automated scan:
    - Cadence functions: grep 'export.*function auto' cadenceExecutor.ts → list
    - Engines: ls src/engines/*.ts → list
    - Scripts: ls scripts/**/*.{ps1,js,py} → list
    - Skills: count skills-consolidated/*/SKILL.md → list new ones
    - NL hooks: check nl_hook registry → list
    - State docs: ls state/*.{md,json} → list
  Output: PHASE_ARTIFACTS.md with category → item → date created

STEP 2 — CALLER CHECK (the core test):
  For EACH artifact in the inventory:
    - grep the codebase for import/require/reference to this artifact
    - Count callers outside the artifact's own file
    - If callers = 0: ORPHANED — flag for wiring or removal
  Output: caller count per artifact. Flag orphans.

STEP 3 — DOWNSTREAM REFERENCE CHECK:
  For each artifact, check if future phase docs reference it:
    - Is it in any phase's RECOMMENDED_SKILLS?
    - Is it listed in any MS dependency?
    - Is it in SKILL_INDEX.json with triggers?
    - Is it in any hook registration?
  If future phases SHOULD use it but DON'T reference it: flag for insertion.

STEP 4 — DISPOSITION:
  For each orphaned artifact, decide:
    A) WIRE IT: add import/call to the correct consumer (most common)
    B) DEFER IT: add to downstream phase as explicit dependency
    C) DEPRECATE IT: mark as superseded, document why
    D) DELETE IT: remove if truly unused and won't be needed
  Document each decision with rationale.

STEP 5 — VERIFY WIRING:
  For items in category A: confirm the new caller works (build passes, smoke test)
  For items in category B: confirm downstream phase doc updated
  Output: updated PHASE_ARTIFACTS.md with disposition column

STEP 6 — GAP & IMPROVEMENT ASSESSMENT (v15.0):
  Beyond "is it wired?" — ask "is it complete? could it be better?"
  For each CATEGORY of artifact this phase touched, answer 3 questions:

  CADENCE FUNCTIONS:
    a) MISSING: Are there cadence functions the NEXT phase will need that don't exist yet?
       (e.g., R1 adds registries → does R2 need a "registry_freshness_check" cadence?)
    b) REDUNDANT: Are any cadence functions doing overlapping work? Could they merge?
    c) IMPROVE: Do any existing functions need parameter changes for next phase's workload?

  ENGINES:
    a) MISSING: What capabilities does the next phase expect that no engine provides?
    b) OVERLAP: Are two engines serving the same dispatcher? Document which is canonical.
    c) IMPROVE: Are any engines hitting performance limits that next phase will stress?

  SCRIPTS:
    a) MISSING: What automation does the next phase need that no script handles?
    b) DEAD: Are any scripts from previous phases now superseded? Mark for deprecation.
    c) IMPROVE: Which scripts would benefit from new data/capabilities built this phase?

  NL HOOKS:
    a) MISSING: What runtime conditions should the next phase monitor?
    b) COVERAGE: Do existing NL hooks cover new artifacts built this phase?
    c) IMPROVE: Are any hook conditions too broad (false positives) or too narrow (missed)?

  SKILLS:
    a) MISSING: What new skills does the next phase need that weren't created this phase?
    b) STALE: Are any existing skills referencing outdated procedures after this phase's changes?
    c) IMPROVE: Do any skills need updated examples based on new capabilities?

  Output: GAP_ASSESSMENT section appended to PHASE_ARTIFACTS.md
  Format per item: [CATEGORY] [MISSING|REDUNDANT|IMPROVE] — description → assigned to [PHASE-MS]
  Items tagged MISSING become explicit dependencies in the next phase doc.
  Items tagged IMPROVE become TODOs in the next phase's first milestone.

GATE ADDITION: Phase gate cannot pass if >10% of artifacts are orphaned without
documented disposition. This is a SOFT gate — dispositions B/C/D are acceptable
as long as they're documented. Only truly forgotten items (no disposition) block.
```

WHEN TO INSERT AUDIT MILESTONES:
  - After DA (dev infrastructure): catches unwired cadence functions, engines, scripts
  - After R1 (data loading): catches unqueried registries, unused data pipelines
  - After R3 (intelligence): catches unconnected proof chains, unused agent configs
  - After R6 (rendering): catches unbound UI components, unused templates
  - Optional after any phase that builds 5+ new artifacts

The audit milestone is always the LAST milestone before the phase gate.
It adds 1 session, 5-8 calls. Cost is low. Value is preventing the
"we built it but nobody calls it" pattern that compounds across phases.

## SMOKE TEST EXAMPLES (v14.5 -- per-phase guidance)

```
DA:  Start new session -> boot protocol completes in <60s, skills auto-load
R1:  "Query material 4140 properties" -> returns complete record with 127 params
R1:  "Find tool T-123 insert geometry" -> returns holder + insert + coating
R2:  "Calculate speed/feed for 4140 turning, HSS tool" -> S(x)>=0.70, structured output
R2:  "What is the safe depth of cut for Ti-6Al-4V at 60 m/min?" -> bounded result with uncertainty
R3:  "Plan a job for aluminum 6061 bracket, 3-axis" -> complete plan with all parameters
R3:  "Convert 500 SFM to m/min" -> unit-consistent result
R4:  "Create tenant for Shop_A" -> isolated tenant, no data leakage
R5:  "Show dashboard for current job" -> renders with correct data binding
R6:  "Run load test at 2x" -> S(x) stays >=0.70 under load
R7:  "Predict surface finish for 304SS face milling" -> coupled physics result
R8:  "I need to machine this part" -> intent engine routes to correct workflow
R9:  "Connect to machine M-001 via MTConnect" -> live data stream established
R10: "Generate process plan for this part geometry" -> multi-operation plan with trade-offs
R11: "Package PRISM for delivery" -> installable artifact with docs
```

## BRAINSTORM QUALITY CHECKLIST

Before finalizing any expanded phase doc, verify:

□ Every MS has Effort + Tier + Context + Response Budget headers
□ Every MS has Execution field declaring CC/MCP split with specific step allocation
□ CC steps identify which subagent(s) to use and why CC over MCP for those steps
□ MCP steps identify which prism_ dispatchers are needed (safety calcs MUST be MCP)
□ Parallel CC opportunities identified (independent data targets → spawn subagents)
□ MEDIUM/HIGH effort MS have flush points, micro-checkpoints, and risk classification
□ Every safety-relevant step specifies effort=max
□ Every calc output specifies structured output schema (physically-bounded, all params required)
□ Parallel opportunities identified (Agent Teams pattern)
□ Parallel results sorted by stable key before flush (ORDERING RULE)
□ Flush-to-file specified for non-regenerable results
□ MANDATORY flushes include content verification (read-back last 100 chars)
□ Context editing specified for consumed diagnostic results
□ Rollback instructions are specific (not "standard rollback")
□ Exit criteria are measurable with a specific command or file check
□ Context Bridge correctly references prior phase outputs
□ PHASE_FINDINGS.md tiered loading follows INDEX §Phase Findings rules
□ No assistant message prefilling anywhere
□ All model references use env vars with fallbacks (use envString() from src/utils/env.ts)
□ Idempotency classification applied to state-modifying steps
□ Error handling uses PrismError taxonomy (safety→block, network→retry, data→log)
□ All API calls wrapped in apiCallWithTimeout() from src/utils/apiTimeout.ts
□ State writes use atomicWrite() from src/utils/atomicWrite.ts
□ Tolerance values imported from src/schemas/tolerances.ts (never hardcoded)
□ New calculations added to src/__tests__/ vitest suite (regression grows with each phase)
□ Test count documented: R2 baseline N → this phase N+M → cumulative total
□ Batch operations use rate-limited p-queue (see §Code Standards §Rate Limiting)
□ New tests added to vitest suite for any new calc or validation logic
□ Build steps followed by MCP server restart instruction (see Boot Protocol Step 4)
□ Failure paths documented (what to do when a step fails, not just the happy path)
□ Intermediate variables that cross step boundaries are persisted (see §Intermediate Variable Persistence)
□ Cross-field physics validation runs on every safety calc result (SK-1 — schema validates structure, code validates physics)
□ Material sanity checks run on every material_get response (SK-5 — catches data swaps)
□ Calc result versioning meta block included in structured output (AG-2 — audit reproducibility)
□ Reference values from src/data/referenceValues.ts used for tolerance validation (SK-3 — never use untracked handbook values)
□ Schema migrations preceded by mandatory git commit (DC-4 — enables rollback)
□ LIMITATION category used for formula boundary findings, not FORMULA FIX (OB-1)
□ Per-task timeout configured for parallel batches (CB-1 — one hung task doesn't block batch)
□ Adaptive rate limiting handles 429 responses with backoff (CB-4)
□ PHASE_FINDINGS entries capped at 10 CRITICAL per phase (OB-4)
□ Brainstorm session uses effort=max for the planning/reasoning call (IA-8.2):
  prism_orchestrate action=agent_execute agent=opus effort=max task="expand R[N] stub..."
  WHY: Stub expansion is novel reasoning, not routine operation. Max effort produces
  more thorough MS definitions, better parallelism identification, and fewer gaps.
□ Framework load measured at phase gate: prism_context action=context_monitor_check (IA-12.1)
  Record in PHASE_FINDINGS.md: "Framework load at [phase] gate: [N]K tokens."
□ Every gate with a count check also has a quality sample check (Audit F7 - MANDATORY)
□ Companion assets (hooks/scripts/skills) have verification criteria, not just one-liners (Audit F4)
□ CC smoke test: if phase ENV includes Code, verify at least 1 CC-allocated step executes in CC
□ Subagent smoke test: if MS uses subagents, verify subagent responds and persists memory
□ When expanding stub phases, apply v2.0 anti-template thinking to all outputs (Audit F5)
□ Parallel result contract used for all agent results (JSON schema — IA-6.1)
□ Hook output response protocol followed when hooks fire during execution (IA-5.1)

WORKED EXAMPLE (IA-10.2): Study PHASE_P0_ACTIVATION.md as the reference implementation.
  Note: context bridges, MS header format, step numbering with [effort=tier] annotations,
  rollback instructions, exit criteria, parallelism map, session management.
  Your expanded phase doc should follow the SAME patterns as P0.

---

## MANUS LAWS — COGNITIVE GUARDS (clarification)

```
Manus Laws are META-COGNITIVE. They do NOT produce tool calls.
They are INTERNAL CHECKS the executor runs silently before each decision.
The executor does NOT need to invoke a tool for Manus compliance.
The executor DOES need to apply them at these moments:

  BEFORE CHOOSING A TOOL:
    "Is there a prism_ dispatcher for this?" (Manus 4 → Law 4: MCP FIRST)
    "Have I used this tool before in this session? What was the result?" (Manus 3 → efficiency)

  BEFORE EACH FIX:
    "What's the count/state BEFORE my change?" (Manus 5 → Law 3: NEW >= OLD)
    "Am I about to overwrite something without a backup?" (Manus 5 → anti-regression)

  AFTER EACH FIX:
    "Did counts stay >= prior? Did tests still pass?" (Manus 5 → Law 3: NEW >= OLD)
    "Is this EVIDENCE or just 'it compiled'?" (Manus 2 → Law 2: NO PLACEHOLDERS)

  AT SESSION END:
    "Did I record everything the next session needs?" (Manus 6 → ROADMAP_TRACKER + CURRENT_POSITION)
    "Are there findings that downstream phases need to know?" (Manus 6 → PHASE_FINDINGS.md)

  The 6 Manus Laws MAP TO the 8 Roadmap Laws as documented in §Manus Law Integration
  in PRISM_PROTOCOLS_REFERENCE.md. Load that section only if you need the full mapping.
```

---

## AI EDGE CASE GENERATION PATTERN (reusable from R2-MS1.5)

When a phase involves testing or validation of calculations, apply this pattern:

```
1. Compile: all formula definitions + data schemas + existing test cases
2. Prompt at effort=max: "Given these formulas and schemas, identify [N] input combinations
   that are [mathematically valid / structurally correct] but would produce [dangerous /
   incorrect / unexpected] results in [domain context]. Focus on [domain-specific edge cases]."
3. Classify results: VALID-DANGEROUS / THEORETICAL / ALREADY-COVERED
4. Execute VALID-DANGEROUS cases with structured outputs
5. Document failures as CRITICAL findings in PHASE_FINDINGS.md
```

This pattern leverages Opus 4.6's novel problem-solving (ARC-AGI-2: 68.8%) for test coverage
that human-defined cases miss. Apply in R3 (batch edge cases), R4 (compliance edge cases),
R6 (production stress edge cases).

---

## STUB EXPANSION PROCESS (concrete session procedure)

```
BRAINSTORM IS A FULL SESSION. It counts toward the phase session estimate.

1. Start a new PRISM session. Boot normally (full Boot Protocol).
2. Load: stub document + PHASE_FINDINGS.md (tiered loading per INDEX rules) + this template.
3. Run brainstorm:
   prism_sp action=brainstorm topic="Expand [PHASE_ID] [PHASE_TITLE] stub into full phase document"
   → Review the output. It suggests MS breakdown, tool selections, and dependency graph.
4. Manually refine the brainstorm output:
   - Add effort tiers per §Effort Tier Classification to every step.
   - Add structured output schemas to every safety-relevant calc.
   - Add flush points for non-regenerable results (where in each MS to flush to disk).
   - Add exit criteria that are measurable with a specific command or file check.
   - Add rollback instructions that are specific (not "standard rollback").
5. Run the BRAINSTORM QUALITY CHECKLIST below (every checkbox must pass).
6. MACHINE-VERIFIABLE VALIDATION (SD-6):
   Before writing the expanded doc, verify the brainstorm output is structurally valid:
   □ Every MS has explicit dependencies (which MS it depends on, not just phase order)
   □ Every MS has measurable exit criteria (a specific command + expected output, not prose)
   □ Every MS has a call count budget (number of prism_ calls, not wall-clock time)
   □ Total call count across all MS fits within session budget (session estimate × ~50 calls/session)
   □ No MS exceeds 55 calls (session limit — if it does, split it)
   If any checkbox FAILS → refine the brainstorm output before writing. Do not ship unvalidated docs.
7. Write the expanded document:
   prism_doc action=write name=PHASE_[ID]_[NAME].md content="[full expanded phase doc]"
7. Update PRISM_MASTER_INDEX.md: new MS count, session estimate, and status → "in-progress".
8. Save state: prism_session action=state_save + ROADMAP_TRACKER append.
9. This IS the first session of the phase. The next session starts execution at MS0.

TRIAGE RULE FOR DISPATCHER TESTS:
  During any MS, spend max 5 minutes diagnosing each failure.
  If root cause is MISSING DATA (not loaded yet) → KNOWN-WILL-FIX. Move on.
  If root cause is BROKEN CODE (error on valid input) → UNEXPECTED-FAIL. Fix now.
  If root cause is UNCLEAR after 5 min → mark INVESTIGATE-LATER. Move on.
```
