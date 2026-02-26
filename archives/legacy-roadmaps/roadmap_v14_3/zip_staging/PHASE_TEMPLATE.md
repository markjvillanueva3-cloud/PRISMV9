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
```

---

## BRAINSTORM QUALITY CHECKLIST

Before finalizing any expanded phase doc, verify:

□ Every MS has Effort + Tier + Context + Response Budget headers
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
