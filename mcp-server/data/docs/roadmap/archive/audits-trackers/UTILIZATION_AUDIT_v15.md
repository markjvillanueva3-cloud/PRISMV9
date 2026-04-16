# PRISM UTILIZATION & ENFORCEMENT AUDIT v15.0
# Date: 2026-02-18
# Auditor: Opus 4.6 (Systems Architect + Context Engineer + Safety Engineer)
# Effort: 100 (Maximum — Zero-tolerance for gaps)
# Scope: Every artifact, script, hook, skill, document across the entire system
#
# METHODOLOGY: For each artifact, answer:
#   HOW is it used? WHEN does it fire? WHY was it built?
#   WHERE does it live? WITH WHAT does it integrate?
#   Is it utilized to the MAX? Can it serve MULTIPLE scenarios?
#   Does a fresh session know HOW to invoke it?

---

## EXECUTIVE SUMMARY

### Overall Utilization Score: 47/100 (FAILING)

We have 368 MCP actions, 72 hooks, 10 scripts (roadmap), 3 scripts (skills),
116 indexed skills, and ~20 state/tracking documents. Of these:
- **Actually firing in production**: ~25% of hooks (4/11 categories)
- **NL hooks that have ever executed**: 0/10 (ZERO)
- **Skills over 10KB** (need splitting): 49/116 (42%)
- **Scripts with documented trigger conditions**: 3/13 (position-validator, rebuild-section-index, fix-encoding)
- **Phase docs with complete role/model/effort on EVERY milestone**: 2/12 (DA, R1)
- **Recovery card tested end-to-end**: YES (this session)
- **Built artifacts actively improving development**: ~30%

### Root Cause
We build artifacts, document them, but don't close the loop:
WHO calls them, WHEN, and what TRIGGERS the call. Most artifacts are
"available" but not "active" — they sit until someone remembers they exist.

---

## SECTION 1: HOOK UTILIZATION AUDIT

### 1A. CODE HOOKS (62 registered, 100% enabled)

FIRING: Only 4 categories fire (DISPATCH=69, FILE=32, STATE=28, CONTEXT=6 executions)
DEAD: 7 categories with 0 executions (CALC, FORMULA, AGENT, BATCH, INTEL, REFL, ORCH)
WHY DEAD: These categories guard subsystems not yet built/exercised:
  CALC hooks: Fire when prism_calc processes a calculation — but no session
    has run a full calculation pipeline (R2 phase not started).
  FORMULA hooks: Fire on formula application — formulas exist but no
    safety-critical calculation campaign has run yet.
  AGENT/ORCH hooks: Guard multi-agent operations — agents exist but
    never spawn in normal roadmap execution.
  BATCH hooks: Guard batch operations — no batch campaign run yet.
  INTEL hooks: Guard intelligence/proof operations — R7 phase not started.
  REFL hooks: Fire on repeated errors — errors happen but the
    autoHookWrapper doesn't route to REFL triggers yet.

VERDICT: Not a bug — these hooks are FORWARD-DEPLOYED for phases R2+.
  They WILL fire when those phases activate. No action needed except:
  RECOMMENDATION: Add a "hook activation matrix" showing which hooks
  activate at which phase. Add to PHASE TEMPLATE so every phase doc
  declares "HOOKS THAT SHOULD BE FIRING THIS PHASE: [list]"
  This prevents hooks remaining dead after the system they guard is built.

ACTIVE HOOKS (firing correctly):
  DISPATCH-ACTION-VALIDATE-001: BLOCKING, fires on every tool call. GOOD.
  DISPATCH-PERF-TRACK-001: Tracks performance. GOOD.
  FILE-BEFORE-WRITE-001: BLOCKING pre-write validation. GOOD.
  FILE-AFTER-WRITE-001: Post-write verification. GOOD.
  STATE-SESSION-BOUNDARY-001: Session lifecycle. GOOD.
  STATE-CHECKPOINT-CREATE-001: Auto-checkpointing. GOOD.

### 1B. NL HOOKS (10 registered, 0 executions)

CRITICAL FINDING: ALL 10 NL hooks have ZERO executions.

Root cause analysis:
  NL hooks compile to "warning" mode regardless of requested "blocking" mode.
  They fire on "on-tool-call" or "pre-file-write" phases.
  But the NL hook system appears to NOT inject into the actual dispatch pipeline.
  The autoHookWrapper.ts only fires CODE hooks, not NL hooks.
  NL hooks exist in the NL hook registry but have no runtime integration.

  In other words: NL hooks are METADATA ONLY. They describe what SHOULD happen
  but nothing in the actual code execution path reads or fires them.

  This means:
    - roadmap-force-recovery-card: NEVER fires. Recovery card loading depends
      entirely on the Claude prompt-level instructions in userMemories.
    - position-cross-validate: NEVER fires. We rely on manual script execution.
    - phase-prerequisite-check: NEVER fires. Phase ordering is purely honor-system.
    - skill-quality-warning: NEVER fires. Skills load without quality check.
    - All other NL hooks: Same — metadata, not enforcement.

  WHY THIS MATTERS: We spent 2 sessions creating NL hooks believing they
  add enforcement. They add ZERO enforcement. They're documentation pretending
  to be code.

  FIX OPTIONS (ordered by effort):
    A. CONVERT TO PROMPT-LEVEL: Move NL hook logic into PRISM_RECOVERY_CARD.md
       as explicit "IF X THEN Y" instructions. At least the instructions are
       in a place Claude reads. (CHEAPEST, DO NOW)
    B. WIRE INTO CADENCE: The cadenceExecutor.ts has 25 auto-firing functions.
       Add NL hook evaluation to the cadence check. When a matching condition
       is detected, inject the warning into the response. (MEDIUM, DA-MS11)
    C. WIRE INTO AUTOHOOKWRAPPER: The autoHookWrapper.ts fires code hooks.
       Extend it to also evaluate NL hooks against the current context.
       (EXPENSIVE, requires schema alignment between code hooks and NL hooks)

  RECOMMENDATION: Option A immediately + Option B in DA-MS11 planning.

### 1C. HOOK ACTIVATION MATRIX (proposed — does not exist yet)

Phase → Which hooks MUST be firing:
  DA  → DISPATCH, FILE, STATE (current — correct)
  R1  → + DATA hooks (need: material_validate, machine_validate, tool_validate)
  R2  → + CALC, FORMULA, SAFETY hooks (the entire 12-hook CALC category)
  R3  → + INTEL hooks (proof validation on intelligence features)
  R4  → + AGENT, ORCH hooks (enterprise multi-tenant needs agent guards)
  R5  → + BATCH hooks (bulk visual rendering)
  R6  → ALL hooks active (production hardening = everything fires)
  R7+ → ALL hooks active

  ACTION: Create HOOK_ACTIVATION_MATRIX.md and reference from each phase doc.
  At phase start, VERIFY that expected hooks are actually firing.

---

## SECTION 2: SCRIPT UTILIZATION AUDIT

### 2A. ROADMAP SCRIPTS (C:\PRISM\mcp-server\scripts\roadmap\)

| Script | Size | Trigger | Called By | Frequency | Multi-Use? |
|--------|------|---------|-----------|-----------|------------|
| position-validator.js | 3KB | Recovery, session start | Manual (node) | Every session | YES: recovery, audit, CI |
| build-section-index.ps1 | 1.5KB | After anchor placement | Manual (pwsh) | After DA-MS5 | ONE-OFF |
| place-anchors.ps1 | 3.2KB | Phase doc creation | Manual (pwsh) | Per phase doc | LOW |
| roadmap-lint.ps1 | 3.4KB | After phase doc edit | Manual (pwsh) | Occasionally | YES: CI, pre-gate |
| roadmap-regression-test.ps1 | 2KB | After phase edit | Manual (pwsh) | Occasionally | YES: CI |
| rebuild-section-index.ps1 | 3.8KB | After any anchor change | Manual (pwsh) | After edits | YES: CI, recovery |
| update-token-estimates.ps1 | 2.1KB | After file size changes | Manual (pwsh) | Occasionally | LOW |

PROBLEMS:
  1. ALL scripts are "manual" — no automation triggers them.
     position-validator.js SHOULD run at every session start.
     rebuild-section-index SHOULD run after any phase doc edit.
     roadmap-lint SHOULD run before any phase gate.
  2. There's ALSO a rebuild_section_index.js at C:\PRISM\ (root) — duplicate!
     Two implementations of the same function at different locations.
  3. Scripts have no "--help" or documented parameters.
  4. No script is registered in the PRISM script registry (prism_skill_script).

FIXES:
  F1. Wire position-validator.js into session_boot (prism_dev:session_boot should
      call it and report result in boot output).
  F2. Wire roadmap-lint + regression-test into phase gate checks.
  F3. Delete C:\PRISM\rebuild_section_index.js (root copy). Canonical = scripts/roadmap/.
  F4. Register all 7 scripts in the script registry with proper metadata.
  F5. Add --help output to each script showing: purpose, parameters, examples.

### 2B. SKILL SCRIPTS (C:\PRISM\mcp-server\scripts\skills\)

| Script | Size | Trigger | Status |
|--------|------|---------|--------|
| split-skill.ps1 | 8KB | DA-MS9/MS10: Splitting oversized skills | READY but untested on production skills |
| extract-course-skills.ps1 | 10.7KB | DA-MS9/MS10: MIT course extraction | READY but untested on production courses |
| update-skill-index.ps1 | 9.2KB | After any skill creation/modification | READY, used to index 116 existing skills |

PROBLEMS:
  1. split-skill.ps1 has NEVER been run against a real skill (DA-MS10 not started).
     We don't know if it actually works on prism-gcode-reference (62KB).
  2. extract-course-skills.ps1 has NEVER been run against a real course.
     We don't know if it handles MIT OCW's actual directory structure.
  3. update-skill-index.ps1 has been run once (to index 116 skills).
     But it's not integrated into any workflow — new skills created
     manually won't auto-update the index.

FIXES:
  F6. DA-MS10 MUST validate scripts against real data BEFORE bulk execution.
  F7. Wire update-skill-index.ps1 to run after any skill creation.
     Either as a post-write hook or as a step in the companion asset protocol.
  F8. Add output format documentation to each script.

### 2C. ONE-OFF SCRIPTS (~40 scripts at scripts/ root)

Files like: final_pass.js, final_pass2.js, final_pass3.js, final_pass4.js,
stub_filler.js, stub_filler2.js, mega_promote.js, etc.

VERDICT: These are development artifacts from previous sessions.
  They serve no ongoing purpose. They're noise.
  ACTION: Archive to C:\PRISM\archives\dev-scripts\ to reduce clutter.
  Keep only: add_atcs_renames.js (still referenced), recover_autoHookWrapper.js (recovery).

---

## SECTION 3: SKILL UTILIZATION AUDIT

### 3A. SKILL INDEX STATUS

Total skill directories: 118
With SKILL.md: 116
Indexed in SKILL_INDEX.json: 116
Over 10KB (need splitting): 49 (42%)
Without SKILL.md: 2 (phantom entries)

### 3B. SKILL QUALITY PROBLEMS

1. 49 skills over 10KB violate the atomization principle.
   DA-MS9 builds infrastructure to fix this. DA-MS10 pilots.
   But we're AT DA-MS9 now — this is the next work item.

2. SKILL_INDEX.json has BOM corruption (byte 0xFEFF at start).
   JSON.parse fails without stripping. Any automated tool that
   reads this file will silently fail.
   FIX: Strip BOM immediately.

3. Skills are NOT auto-loaded based on context.
   The cadenceExecutor.ts has skill routing (line ~1060) but
   it maps actions to skill names — the skills are loaded by
   prism_skill_script:skill_load which Claude must explicitly call.
   There's no "auto-suggest relevant skill" mechanism.
   FIX: This is R8 scope (intent engine). For now, document
   in each phase doc which skills to load at phase start.

4. 2 phantom skill directories with no SKILL.md.
   FIX: Delete or populate them.

### 3C. SKILL UTILIZATION IN ROADMAP PHASES

Currently NO phase doc says "load these skills at phase start."
This means every session starts skill-less and relies on Claude's
memory or luck to load relevant skills.

PROPOSED SKILL LOADING BY PHASE:
  DA: prism-session-master, prism-anti-regression, prism-error-handling
  R1: prism-material-physics, prism-cutting-mechanics, prism-safety-framework
  R2: prism-safety-framework, prism-master-equation, prism-cutting-mechanics
  R3: prism-formula-evolution, prism-cam-strategies, prism-combination-engine
  R4: prism-hook-system, prism-design-patterns, prism-codebase-packaging
  R5: (UI skills — not yet built)
  R6: prism-anti-regression, prism-safety-framework, prism-perf-patterns

  ACTION: Add "RECOMMENDED_SKILLS:" line to each phase doc header.

---

## SECTION 4: DOCUMENT UTILIZATION AUDIT

### 4A. ROADMAP DOCUMENTS (67 files in roadmap/)

ACTIVELY USED every session:
  PRISM_RECOVERY_CARD.md ✅ — Tested end-to-end, 305 lines
  CURRENT_POSITION.md ✅ — Updated every session
  ROADMAP_TRACKER.md ✅ — Append-only log, 100 lines
  ROADMAP_SECTION_INDEX.md ✅ — 533 lines, 496 anchors
  PHASE_DA_DEV_ACCELERATION.md ✅ — Active phase doc

USED at phase gates / occasionally:
  ROLE_MODEL_EFFORT_MATRIX.md ⚠️ — 669 lines, COMPLETE for all 95 milestones.
    BUT: Phase docs already have role/model inline. Matrix is redundant UNLESS
    you need to look up a future milestone. Keep but mark as reference-only.
  ROADMAP_INSTRUCTIONS.md ⚠️ — 341 lines. Good but partially stale:
    - Line counts wrong (DA says "~6K tokens" but it's 1446 lines = ~7K)
    - Still references v13.9 in header (should be v14.5)
    - Phase overview table says DA="not-started" (should be "in-progress")
  SYSTEM_CONTRACT.md ⚠️ — Read at phase gates. Not validated since creation.
  PARALLEL_TRACKER.md ⚠️ — Created but never used (no parallel execution yet).
  DRY_RUN_R1_MS4_5.md ⚠️ — Good reference for R1 session.
  E2E_RECOVERY_TEST.md ⚠️ — Good reference. One-time validation.

NEVER LOADED / DEAD WEIGHT:
  BULLETPROOF_ASSESSMENT_v14.5.md — Audit artifact, not operational
  COMPETITIVE_POSITIONING.md — Strategy doc, not operational
  CONTEXT_AUDIT.md — One-time audit result
  CONTEXT_BUDGET_LOG.md — Never maintained
  DEPLOYMENT_GUIDE.md — Future reference
  HIERARCHICAL_INDEX_SPEC.md — Spec, not operational
  MASTER_ACTION_PLAN_v2.md — Superseded by phase docs
  OPERATIONAL_IMPROVEMENTS_PLAN.md — Superseded
  OPUS_CONFIG_BASELINE.md — P0 output, reference only
  P0_CHAIN_RESULTS.md — P0 output
  P0_DISPATCHER_BASELINE.md — P0 output
  PRISM_AUDIT_v14_3.md — Superseded by v15
  PRISM_Cross_Audit_Assessment.md — One-time
  PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md — Superseded
  PRISM_MASTER_INDEX.md — 5 entries, mostly superseded by recovery card
  PRISM_MASTER_INDEX_SLIM.md — Duplicate
  PRISM_MASTER_INDEX_v14.2.1.md — Duplicate
  PRISM_PROTOCOLS_BOOT.md — Referenced but recovery card covers boot
  PRISM_PROTOCOLS_CHANGELOG.md — Historical
  PRISM_PROTOCOLS_CODING.md — Reference only
  PRISM_PROTOCOLS_CORE.md — Split into other files, redirect only
  PRISM_PROTOCOLS_REFERENCE.md — On-demand sections
  PRISM_PROTOCOLS_SAFETY.md — R2+ reference
  REGISTRY_AUDIT.md — One-time
  ROADMAP_AUDIT_2026-02-17.md — This session's predecessor
  ROADMAP_v14_2_GAP_ANALYSIS.md — Superseded
  SKILLS_SCRIPTS_HOOKS_PLAN.md — Companion asset spec
  SKILL_ATOMIZATION_SPEC.md — DA-MS9 reference
  SUBAGENT_SPECS.md — Claude Code specs, future
  SYSTEMS_ARCHITECTURE_AUDIT.md — Integrated into phases
  SYSTEM_ACTIVATION_REPORT.md — P0 output
  SYSTEM_CONTRACT_v14.2.1.md — Duplicate
  TOOL_UTILIZATION_AUDIT_v13_2.md — Superseded
  _archived_PRISM_PROTOCOLS_CORE_pre_split.md — Archive
  _AUDIT_FIXES_v14.5.md — Audit artifact

VERDICT: 35+ documents are dead weight taking up cognitive space.
  ACTION: Archive non-operational docs to C:\PRISM\archives\roadmap-reference\.
  Keep ONLY: recovery card, position, tracker, instructions, phase docs (12),
  section index, role matrix, system contract, parallel tracker, template,
  skill atomization spec, companion asset plan = ~20 operational files.
  Move everything else to archive.

### 4B. STATE DOCUMENTS (C:\PRISM\mcp-server\data\docs\)

  ACTION_TRACKER.md ✅ — 87 completed, 33 pending. Actively used.
  todo.md ⚠️ — Auto-maintained by prism_context:todo_update. Contains
    placeholder steps (Step 1-10) from session init, not real tasks.
    FIX: todo_update should read from ACTION_TRACKER pending items.
  SESSION_HANDOFF.md ⚠️ — Written at session end, read at session start.
    BUT: Not always written (depends on clean session exit).
    FIX: Wire into session_end cadence function to auto-generate.
  COMPACTION_SNAPSHOT.md — Listed in recovery card as FALSE (doesn't exist).
    Remove from recovery card or build it.

---

## SECTION 5: COMPACTION RECOVERY AUDIT

### Current Recovery Sequence:
1. prism_dev:session_boot (fires _COMPACTION_DETECTED recovery)
2. Read CURRENT_POSITION.md → position
3. Read phase doc → instructions
4. Continue work

### PROBLEMS:

P1. session_boot returns a massive JSON blob (~8K tokens) with
    NINE different recovery sections (recovery_manifest, reasoning_trail,
    workflow_recovery, recovery_context, action_tracker_next, recent_tool_calls,
    compaction_survival, handoff_package, gsd_protocol). This is
    OVERWHELMING for a post-compaction Claude instance that has
    zero context. It doesn't know which section to trust.

    FIX: session_boot should return a SINGLE clear instruction:
      "You are at DA-MS9 Step 1. Read PHASE_DA_DEV_ACCELERATION.md
       from line 1159. Your last completed work was [X]. Next: [Y]."
    Everything else should be OPTIONAL follow-up reads.

P2. The _COMPACTION_DETECTED block says "READ recovery_manifest"
    but recovery_manifest shows stale data (phase: "unknown",
    pending_todos: "Step 1-10" which are placeholder).
    Real position is in CURRENT_POSITION.md, not recovery_manifest.

    FIX: Recovery manifest should be refreshed from CURRENT_POSITION.md
    every time prism_context:todo_update fires, not just at checkpoint.

P3. After compaction, Claude sees "_MANDATORY_RECOVERY" telling it
    to NOT ask the user. But the recovery data is often stale/wrong.
    Claude then proceeds with wrong context, generating irrelevant work.

    FIX: The recovery sequence should be:
      1. Read CURRENT_POSITION.md (2 lines, always fresh)
      2. Run position-validator.js (3 lines output, confirms truth)
      3. Read 80 lines of current phase doc from the section index
      4. Resume.
    Total: ~100 lines of context. NOT the 8K-token session_boot blob.

### PROPOSED EFFICIENT RECOVERY SEQUENCE:

```
COMPACTION DETECTED:
  Step 1: DC read_file CURRENT_POSITION.md [15 lines, 200 tokens]
  Step 2: DC start_process "node position-validator.js" [5 lines, 50 tokens]
  Step 3: DC start_process "node -e find-anchor.js [current_MS]" [1 line, 20 tokens]
  Step 4: DC read_file PHASE_[X].md offset=[anchor_line] length=80 [80 lines, 1K tokens]
  Step 5: Resume work.
  TOTAL: ~1.3K tokens, 4 tool calls. vs current: ~8K tokens, 1 tool call + confusion.
```

---

## SECTION 6: ROLE/MODEL/EFFORT COMPLIANCE AUDIT

### 6A. ROLE_MODEL_EFFORT_MATRIX.md

669 lines, covering all 95 milestones across 12 phases.
Format is consistent: MS-ID, Role, Model, Effort, Sessions, Why.
This is GOOD — every milestone has an assignment.

### 6B. BUT: Phase docs don't ENFORCE model selection.

The recovery card says "RULE: Follow the assigned model."
But nothing in the system PREVENTS using the wrong model.
Claude in claude.ai doesn't pick its own model — the USER does.
This means model assignment is advisory, not enforceable.

FIX: Phase doc headers should say:
  "RECOMMENDED MODEL: [X]. If using a different model, expect [limitation]."
  This manages expectations rather than pretending to enforce.

### 6C. Missing from phase docs:

Phase docs R4-R11 lack these items in their headers:
  RECOMMENDED_SKILLS: [list of skills to load at phase start]
  HOOKS_EXPECTED_ACTIVE: [list of hook categories that should be firing]
  DATA_PATHS: [list of data directories this phase reads/writes]
  COMPANION_ASSETS_FROM_PRIOR_PHASE: [list of skills/hooks/scripts expected from prior]

R1 was patched this session with DATA_PATHS. The pattern should extend to ALL phases.

---

## SECTION 7: PROGRESSIVE UTILIZATION AUDIT

### Question: Are we using built tools to improve development?

ARTIFACT → USED DURING DEVELOPMENT?

| Built Artifact | Used in Dev? | How? |
|----------------|-------------|------|
| position-validator.js | YES | Recovery test, session start |
| rebuild_section_index.js | YES | After every phase doc edit |
| fix_encoding.js | YES | One-time encoding fix |
| roadmap-lint.ps1 | NO | Never run during development |
| roadmap-regression-test.ps1 | NO | Never run |
| split-skill.ps1 | NO | Built for DA-MS10, not used yet |
| extract-course-skills.ps1 | NO | Built for DA-MS10, not used yet |
| update-skill-index.ps1 | ONCE | Used to index 116 skills |
| SKILL_INDEX.json | NO | Exists but nothing queries it |
| prism_calc engines | NO | No calculations run yet (R2) |
| prism_safety engines | NO | No safety validation run yet (R2) |
| prism_thread engines | NO | No threading calculations yet |
| PARALLEL_TRACKER.md | NO | No parallel execution yet |
| Session knowledge system | PARTIALLY | 8 entries exist, occasionally queried |
| NL hooks (10) | NO | Zero executions |
| Code hooks (62) | PARTIALLY | 4 of 11 categories fire |

### KEY INSIGHT: Most of what we build is FORWARD-DEPLOYED.
We're building infrastructure for future phases. This is correct
for a phased roadmap. But we should be USING completed infrastructure
to improve the building of future infrastructure.

MISSED OPPORTUNITIES:
  1. roadmap-lint.ps1 should run BEFORE every phase doc edit session.
  2. SKILL_INDEX.json should be queried to find relevant skills at session start.
  3. position-validator.js should run at session_boot, not manually.
  4. roadmap-regression-test.ps1 should run after every roadmap tracker update.
  5. The 45 formulas loaded should be used to VALIDATE phase doc claims
     about calculation counts (e.g., "R2 = 50-calc matrix" — are there 50?).
  6. The 2,480 materials loaded should be used to validate R1 completeness
     claims without needing a separate data audit.

---

## SECTION 8: ATOMIZATION AUDIT

### Question: Is everything atomized for indexing?

SKILLS: 49 of 116 are over 10KB (NOT atomized). DA-MS9/10 addresses this.
PHASE DOCS: Have ANCHOR tags (496 total). CAN be loaded by section. GOOD.
SCRIPTS: NOT atomized. No index, no metadata, no trigger documentation.
HOOKS: Atomized by ID. Each hook has: id, name, category, trigger, priority, enabled.
STATE DOCS: NOT atomized. ACTION_TRACKER.md is a flat file, not queryable.
KNOWLEDGE: 8 entries in SESSION_KNOWLEDGE_INDEX.json. Atomized but small.

### What needs atomization:

1. SCRIPTS: Need a SCRIPT_INDEX.json similar to SKILL_INDEX.json.
   Fields: id, purpose, trigger_condition, parameters, output_format,
   location, dependencies, phase_relevance[], frequency.
   This enables "what script should I run before a phase gate?" queries.

2. ACTION_TRACKER: Convert from flat markdown to structured JSON.
   Fields: id, status, phase, milestone, description, completed_date.
   This enables "what's pending for R1?" queries.

3. HOOK ACTIVATION: Need phase-to-hook mapping (Section 1C above).
   This enables "what hooks should be firing right now?" queries.

4. COMPANION ASSETS: Need a manifest per phase showing which skills,
   hooks, and scripts were produced. Currently in phase doc text
   but not queryable.

---

## SECTION 9: PRIORITIZED ACTION PLAN

### TIER 1 — DO IMMEDIATELY (this session or next)

T1-1. Strip BOM from SKILL_INDEX.json.
  HOW: node -e "const fs=require('fs');let c=fs.readFileSync(path,'utf8');
       if(c.charCodeAt(0)===0xFEFF)fs.writeFileSync(path,c.slice(1),'utf8')"
  WHEN: Now.
  WHY: Any automated tool parsing this file silently fails.

T1-2. Convert NL hook enforcement to prompt-level instructions.
  HOW: Add explicit IF/THEN rules to PRISM_RECOVERY_CARD.md Step 3.
  WHEN: Now.
  WHY: NL hooks have 0 executions — they're decoration, not enforcement.

T1-3. Wire position-validator.js into session start protocol.
  HOW: Add to recovery card Step 1 as MANDATORY (not optional).
  WHEN: Now.
  WHY: Cross-validation only works if it actually runs.

T1-4. Add RECOMMENDED_SKILLS to each phase doc header.
  HOW: Insert "RECOMMENDED_SKILLS: [list]" after Role line in each phase.
  WHEN: This session (10 min for all 12 phases).
  WHY: Sessions start skill-less; relevant skills improve output quality.

T1-5. Add HOOKS_EXPECTED_ACTIVE to each phase doc header.
  HOW: Insert "HOOKS_EXPECTED: [category list]" after skills line.
  WHEN: This session (alongside T1-4).
  WHY: Without this, hooks deployed for a phase sit silent forever.

T1-6. Update ROADMAP_INSTRUCTIONS.md header + stale data.
  HOW: Fix version (v14.5), DA status (in-progress), line count estimates.
  WHEN: This session (5 min).
  WHY: Stale instructions cause fresh sessions to make wrong assumptions.

### TIER 2 — DO IN DA-MS9 (current milestone)

T2-1. Archive dead-weight roadmap documents (~35 files).
  HOW: Move to C:\PRISM\archives\roadmap-reference\.
  WHEN: DA-MS9 session 1.
  WHY: 67 files in roadmap/ when only ~20 are operational. Noise.

T2-2. Create SCRIPT_INDEX.json for all 13 operational scripts.
  HOW: JSON file with id, purpose, trigger, parameters, output, location.
  WHEN: DA-MS9 (alongside SKILL_INDEX work).
  WHY: Scripts can't be discovered or auto-suggested without an index.

T2-3. Register roadmap scripts in prism_skill_script registry.
  HOW: prism_skill_script:script_list should show them.
  WHEN: DA-MS9.
  WHY: If scripts aren't in the registry, the system can't recommend them.

T2-4. Delete duplicate rebuild_section_index.js from C:\PRISM\ root.
  HOW: Move to archive. Canonical copy at scripts/roadmap/.
  WHEN: DA-MS9.
  WHY: Two copies = confusion about which is current.

### TIER 3 — DO IN DA-MS11 (proposed new milestone)

T3-1. Wire NL hooks into cadenceExecutor.ts.
  HOW: cadenceExecutor checks NL hook conditions on each auto-fire cycle.
  WHEN: New DA-MS11 milestone.
  WHY: Makes NL hooks actually functional, not just metadata.

T3-2. Streamline session_boot recovery output.
  HOW: Return position + next_step + 1-line summary instead of 8K blob.
  WHEN: DA-MS11.
  WHY: Post-compaction Claude gets overwhelmed by current output.

T3-3. Create HOOK_ACTIVATION_MATRIX.md.
  HOW: Phase → expected hook categories → verification query.
  WHEN: DA-MS11.
  WHY: Prevents hooks remaining dead after their target system is built.

T3-4. Convert ACTION_TRACKER.md to queryable JSON.
  HOW: Parallel JSON file updated alongside markdown.
  WHEN: DA-MS11.
  WHY: Enables "what's pending for phase X?" without parsing markdown.

---

## SECTION 10: SESSION INSTRUCTION TEMPLATE

Every phase doc milestone should provide this information for a fresh session:

```
## [PHASE]-[MS]: [TITLE]
### Role: [Role] | Model: [Model] | Effort: [XS/S/M/L/XL] ([call range]) | Sessions: [N]
### RECOMMENDED_SKILLS: [skill-1], [skill-2], [skill-3]
### HOOKS_EXPECTED: [CALC, FILE, DISPATCH, ...]
### DATA_PATHS: [paths this milestone reads/writes]
### PREREQUISITE_CHECK: [what must be true before starting]

**Entry:** [State of the world when this MS starts]
**Exit:** [State of the world when this MS completes]
**Gate:** [What must pass for this MS to be marked COMPLETE]
**Companion Assets:** [Skills, hooks, scripts produced by this MS]

**IMPLEMENTATION:**
  Step 1: [Specific action with tool call example]
  Step 2: [Specific action with tool call example]
  ...

**CHECKPOINT:**
  ACTION_TRACKER entry: "[PHASE]-[MS] COMPLETE [what was done]"
```

Every milestone following this template can be executed by a fresh Claude
instance with ZERO prior context — just the recovery card + this section.

---

## SECTION 11: COMPACTION RECOVERY INSTRUCTIONS (UPDATED)

Replace current approach with:

```
ON COMPACTION DETECTED:
  1. READ C:\PRISM\mcp-server\data\docs\roadmap\CURRENT_POSITION.md
     → Gives: current MS, last complete, phase, blockers, next 3 steps
     → Cost: 15 lines, ~200 tokens

  2. RUN: node C:\PRISM\mcp-server\scripts\roadmap\position-validator.js
     → Confirms position is consistent across tracking files
     → Cost: 5 lines, ~50 tokens

  3. FIND SECTION: grep "[current_MS]" in ROADMAP_SECTION_INDEX.md
     → Gives: line number in phase doc for current milestone
     → Cost: 1 line, ~20 tokens

  4. READ: phase doc from [line] for 80-100 lines
     → Gives: full milestone instructions including role/model/effort
     → Cost: 80 lines, ~1K tokens

  5. RESUME: Execute next step from milestone instructions.

  TOTAL CONTEXT RECOVERED: ~1.3K tokens in 4 tool calls.
  TOTAL TIME: <30 seconds.
  COMPARISON: Current approach uses ~8K tokens in 1 tool call + confusion.
```

---

# END OF AUDIT
# Next: Execute T1-1 through T1-6 immediately.
# Then: DA-MS9 incorporates T2-1 through T2-4.
# Then: Plan DA-MS11 for T3-1 through T3-4.
