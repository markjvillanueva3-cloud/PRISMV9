# PRISM RECOVERY CARD   v14.5
# LOAD THIS FILE ON EVERY "continue" / "start roadmap" / post-compaction recovery.
# This is the ONLY file needed to bootstrap recovery. ~150 lines, ~1K tokens.
# Location: C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md

---

<!-- ANCHOR: rc_step_0_detect_environment -->
## STEP 0: DETECT ENVIRONMENT

```
TRY: prism_dev action=health
  â†’ SUCCESS (status ok, dispatchers   31): MCP MODE. Use prism_ tools for everything.
  â†’ FAIL (connection refused / tool not found): NO MCP.
    TRY: Desktop Commander available? (read_file / start_process)
      â†’ SUCCESS: DC MODE. Read/write files via Desktop Commander.
      â†’ FAIL: ASK human to start MCP server or enable Desktop Commander.

LOG: State your detected environment in first response:
  "Environment: MCP mode" or "Environment: DC mode (MCP unavailable)"
```

<!-- ANCHOR: rc_step_1_find_position -->
## STEP 1: FIND POSITION

```
ALWAYS RUN FIRST (all modes):
  node C:\PRISM\mcp-server\scripts\roadmap\position-validator.js
  → Reads CURRENT_POSITION.md and ROADMAP_TRACKER.md
  → Cross-validates they agree. Reports PASS or MISMATCH.
  → If MISMATCH: trust ROADMAP_TRACKER.md (append-only, more reliable).

MCP MODE:
  prism_doc action=read name=CURRENT_POSITION.md
  â†’ Format: "CURRENT: [MS-ID] | LAST_COMPLETE: [MS-ID] [date] | PHASE: [ID] [status]"
  â†’ OPTIONAL: prism_doc action=read name=SESSION_HANDOFF.md (richer context if available)
  â†’ If missing: prism_doc action=read name=ROADMAP_TRACKER.md (last 5 entries)
  â†’ If both missing: position = DA-MS0

DC MODE:
  Desktop Commander read_file C:\PRISM\mcp-server\data\docs\roadmap\CURRENT_POSITION.md
  â†’ OPTIONAL: read SESSION_HANDOFF.md for richer context (next step, in-progress work)
  â†’ If missing: read ROADMAP_TRACKER.md, find last COMPLETE entry, advance to next MS.
  â†’ If both missing: position = DA-MS0

COMPACTION RECOVERY (if you suspect compaction occurred):
  0.5. RUN POSITION VALIDATOR: node C:\PRISM\mcp-server\scripts\roadmap\position-validator.js
       Confirms CURRENT_POSITION.md and ROADMAP_TRACKER.md agree. Flags mismatches.
  1. Check /mnt/transcripts/journal.txt â†’ read latest transcript tail
  2. Check /home/claude/ for progress files from this session
  3. Reconcile with CURRENT_POSITION.md â†’ use LATER position
```

<!-- ANCHOR: rc_step_1_5_load_section_index_recommended_saves_tokens -->
## STEP 1.5: LOAD SECTION INDEX (recommended    saves tokens)

```
IF ROADMAP_SECTION_INDEX.md exists (built in DA-MS5, Wave 1):
  Read ROADMAP_SECTION_INDEX.md (~200 lines, ~1.5K tokens)
  This lets you load ONLY the sections you need from any file.
  Example: Need stuck protocol? â†’ find pc_stuck_protocol â†’ line ~1608 â†’ load 30 lines.
  Example: Need R1-MS5? â†’ find r1_ms5_tool_schema â†’ line ~253 â†’ load that section.
  IF section index missing: Fall back to loading full phase doc (works but uses more tokens).
```

<!-- ANCHOR: rc_step_2_load_phase_doc -->
## STEP 2: LOAD PHASE DOC

```
PHASE â†’ FILE MAPPING:
  P0  â†’ PHASE_P0_ACTIVATION.md           (COMPLETE    skip unless re-gate)
  DA    PHASE_DA_DEV_ACCELERATION.md      (1446 lines)
  R1    PHASE_R1_REGISTRY.md             (1578 lines   skip to MS4.5+ via LOADER:SKIP))
  R2    PHASE_R2_SAFETY.md               (850 lines)
  R3    PHASE_R3_CAMPAIGNS.md            (1065 lines)
  R4    PHASE_R4_ENTERPRISE.md           (283 lines)
  R5    PHASE_R5_VISUAL.md               (346 lines)
  R6    PHASE_R6_PRODUCTION.md           (354 lines)
  R7    PHASE_R7_INTELLIGENCE.md         (1180 lines)
  R8    PHASE_R8_EXPERIENCE.md           (1018 lines)
  R9    PHASE_R9_INTEGRATION.md          (710 lines)
  R10   PHASE_R10_REVOLUTION.md          (1123 lines)
  R11   PHASE_R11_PRODUCT.md             (247 lines)

ALL DOCS AT: C:\PRISM\mcp-server\data\docs\roadmap\
MCP: prism_doc action=read name=roadmap/[filename]
DC:  Desktop Commander read_file C:\PRISM\mcp-server\data\docs\roadmap\[filename]

SKIP COMPLETED MILESTONES: Look for <!-- LOADER: SKIP TO LINE [N] --> markers.
  Read from that line forward to avoid loading completed MS content.

AFTER LOADING PHASE DOC — read its HEADER (first 5 lines) for:
  RECOMMENDED_SKILLS: [skills to load for this phase]
  HOOKS_EXPECTED: [hook categories that should be firing]
  DATA_PATHS: [directories this phase reads/writes]
  Load the recommended skills. Verify expected hooks are active.
```

<!-- ANCHOR: rc_step_2_5_load_session_knowledge_if_knowledge_system_exists -->
## STEP 2.5: LOAD SESSION KNOWLEDGE (if knowledge system exists)

```
IF C:\PRISM\knowledge\sessions\SESSION_KNOWLEDGE_INDEX.json exists:
  MCP: prism_doc action=read name=knowledge/sessions/SESSION_KNOWLEDGE_INDEX.json
  DC:  Desktop Commander read_file C:\PRISM\knowledge\sessions\SESSION_KNOWLEDGE_INDEX.json

  QUERY: Filter for current phase + current milestone + promoted_to = null
  LOAD matching knowledge nodes (typically 3-10 entries, ~500-1000 tokens)
  These are DECISIONS, ERROR FIXES, OBSERVATIONS from prior sessions about THIS work.
  Apply them: don't re-decide what was decided, don't re-debug what was fixed.

IF the file doesn't exist yet: Skip this step. Knowledge system is built in DA-MS7.
IF the file exists but is corrupted (JSON parse error):
  1. Try reading the raw entries from C:\PRISM\knowledge\sessions\ directory
  2. If directory has individual session files, reconstruct index from those
  3. If reconstruction fails: proceed WITHOUT knowledge. Log "KNOWLEDGE_UNAVAILABLE" in session.
  4. After session: rebuild index using extract_knowledge.ps1

ALSO (optional, high value):
  IF ROADMAP_SECTION_INDEX.md exists: Load it (~200 lines, ~1.5K tokens).
  This lets you load ONLY the sections you need from any file instead of full docs.
  Find section â†’ get line number â†’ load just that range. Saves ~10K tokens per session.
```

<!-- ANCHOR: rc_step_2_75_enforcement_rules -->
## STEP 2.75: ENFORCEMENT RULES (mandatory — replaces NL hooks)

```
These rules are MANDATORY. Check BEFORE executing any milestone step.
They replace NL hooks which have zero runtime integration.

RULE 1 — POSITION VALIDATION (replaces: position-cross-validate hook)
  WHEN: Every session start AND every post-compaction recovery
  HOW:  Run: node C:\PRISM\mcp-server\scripts\roadmap\position-validator.js
  IF FAIL: STOP. Fix mismatch before proceeding. Trust ROADMAP_TRACKER over CURRENT_POSITION.

RULE 2 — PHASE PREREQUISITE CHECK (replaces: phase-prerequisite-check hook)
  WHEN: Starting any phase R2-R11 for the first time
  HOW:  Read ROADMAP_TRACKER.md. Verify prerequisite phase is marked COMPLETE.
        P0→DA→R1→R2→R3→R4→R5→R6. R7 needs R1+R3. R8 needs R3+R7. R9 needs R7+R8.
  IF FAIL: STOP. Do not start a phase whose prerequisite is incomplete.

RULE 3 — SKILL LOADING (replaces: skill-quality-warning hook)
  WHEN: Session start, after loading phase doc
  HOW:  Read RECOMMENDED_SKILLS line from phase doc header. Load each via prism_skill_script:skill_load.
        Current skills have known quality issues (49 of 116 over 10KB). Load but don't trust size claims.
  IF NO RECOMMENDED_SKILLS LINE: Skip. Phase doc needs updating (see audit T1-4).

RULE 4 — HOOK VERIFICATION (new — prevents dead hooks)
  WHEN: Session start, after loading phase doc
  HOW:  Read HOOKS_EXPECTED line from phase doc header.
        Run: prism_hook action=performance. Verify expected categories appear in results.
  IF MISSING CATEGORIES: Note in session log. Non-blocking but indicates wiring gap.

RULE 5 — BUILD SIZE GUARD (replaces: build-size-monitor hook)
  WHEN: After every npm run build
  HOW:  Check bundle size in build output. Alert if > 4.5MB.
  IF OVER: Investigate what grew. Do not merge oversized builds without justification.

RULE 6 — CONTEXT PRESSURE FLUSH (replaces: context-pressure-flush hook)
  WHEN: After every 10 tool calls during execution
  HOW:  Write any in-memory results to disk. Update CURRENT_POSITION.md.
  WHY:  If compaction hits, unsaved work is lost.

RULE 7 — FILE WRITE SAFETY (replaces: file-write-safety + tier1-write-warning hooks)
  WHEN: Before writing to ANY dispatcher, engine, or Tier 1 file
  HOW:  Read current file first. Verify edit won't reduce line count by >30%.
        For Tier 1 files (dispatchers, engines, index.ts): extra caution, verify anti-regression.
  IF >30% REDUCTION: STOP. This is likely a destructive edit.

RULE 8 — COMPANION ASSET CHECK (replaces: phase-gate-asset-check hook)
  WHEN: At every phase gate (last MS of a phase)
  HOW:  Read phase doc "Companion Assets" section. Verify each skill, hook, script exists.
  IF MISSING: Create before marking phase COMPLETE.

RULE 9 — RECOVERY CARD FIRST (replaces: roadmap-force-recovery-card hook)
  WHEN: User says "continue", "start roadmap", "resume roadmap", "next milestone"
  HOW:  Load THIS FILE (PRISM_RECOVERY_CARD.md) BEFORE doing anything else.
        Follow Steps 0→1→2→2.5→2.75→3 in order.
  VIOLATION: Skipping recovery card leads to wrong position, duplicated work, lost context.
```

<!-- ANCHOR: rc_step_3_execute -->
## STEP 3: EXECUTE

```
1. Find your current MS in the phase doc
2. Find the current STEP within that MS (from ACTION_TRACKER.md or CURRENT_POSITION.md)
3. Execute steps sequentially
4. After each step: verify (build if code changed, check output if data)
5. Update position:
   - CURRENT_POSITION.md: every 3 calls (or after each significant step)
   - ACTION_TRACKER.md: after each step-group completion
   - ROADMAP_TRACKER.md: after each MS completion
6. Flush results to disk after each logical unit of work
7. FOR COMPLEX MILESTONES (50+ calc matrix, batch campaigns, etc.):
   Update SUBSTEP_PROGRESS in CURRENT_POSITION.md with progress:
     e.g. "R2-MS3: 23/50 calcs complete"
   Update SUBSTEP_ITEMS_DONE: ["4140-turning", "1045-milling", ...]
   Update SUBSTEP_ITEMS_REMAINING: ["Ti64-turning", "718-drilling", ...]
   Update SUBSTEP_CHECKPOINT_DATA: serialized state for exact resume
   This ensures mid-milestone compaction doesn't lose progress.
```


<!-- ANCHOR: rc_step_3_5_enforcement_checks -->
## STEP 3.5: ENFORCEMENT CHECKS (prompt-level — replaces NL hooks)

```
These rules MUST be followed. They replace the NL hook system which is metadata-only.

BEFORE STARTING ANY PHASE R2-R11:
  CHECK: Is the prerequisite phase marked COMPLETE in ROADMAP_TRACKER.md?
  IF NOT → STOP. Do not start. Report: "Phase [X] prerequisite [Y] not complete."

BEFORE LOADING ANY SKILL (skill_load or skill_content):
  KNOW: 49 of 116 skills are >10KB (bloated). Loading burns 5-15K tokens.
  PREFER: Load ONLY skills listed in RECOMMENDED_SKILLS in the phase doc header.
  AVOID: Loading skills not relevant to current milestone.

AFTER EVERY BUILD:
  CHECK: Is bundle size > 4.5MB? (current: 3.9MB)
  IF YES → Report warning. Investigate what grew.

AT CONTEXT PRESSURE >70%:
  ACTION: Flush all staging data to disk immediately.
  ACTION: Write SESSION_HANDOFF.md with current position.
  ACTION: Focus on completing current step only, stop planning ahead.

BEFORE ANY PHASE GATE:
  CHECK: Do companion assets exist? (skills, hooks, scripts listed in phase doc)
  CHECK: Run roadmap-lint.ps1 against the phase doc.
  CHECK: Run position-validator.js to confirm tracking consistency.

AFTER READING CURRENT_POSITION.md:
  CHECK: Does LAST_COMPLETE match the last COMPLETE entry in ROADMAP_TRACKER.md?
  IF NOT → Run position-validator.js. Trust its output over either file alone.

ON SKILL CREATION:
  CHECK: Is the skill <8KB? Does it have unique When/How/Returns/Examples?
  CHECK: Could the How To Use section swap with another skill? If yes, rewrite.

ON FILE WRITE TO DISPATCHER/ENGINE:
  CHECK: Does the file already exist? Read it first. Use edit_block, not rewrite.
  CHECK: Will this change reduce line count >30%? If yes, WARNING.
```

<!-- ANCHOR: rc_role_model_assignment_v14_5 -->
## ROLE / MODEL ASSIGNMENT (v14.5)

```
Every milestone has a Role + Model + Effort assignment (### Role: line after ## header).
RULE: Follow the assigned model. Do NOT use Haiku for safety-critical work.
  Haiku  = Bulk ops, file scanning, grep, mechanical transforms
  Sonnet = Implementation, testing, scripts, validation, wiring
  Opus   = Architecture, safety-critical review, phase gates, schema design
CANONICAL REF: ROLE_MODEL_EFFORT_MATRIX.md (668 lines, all 95 milestones)
```

<!-- ANCHOR: rc_skill_atomization_parallel_track_v14_5 -->
## SKILL ATOMIZATION PARALLEL TRACK (v15.0 - updated 2026-02-17)

```
RUNS ALONGSIDE: R1+ phases (not blocking, not blocked by)
WHAT: Split 34 oversized skills + extract from 206 MIT courses + 25 CNC/CAM resources
OUTPUT: ~3,880 atomic skills, each 2-5KB, indexed in SKILL_INDEX.json
DA-MS9: Build infrastructure (index schema, automation scripts)
DA-MS10: Pilot (3 skill splits + 3 course extractions to validate pattern)
BULK: Sonnet writes, Opus reviews, 3-5 skills/session. NEVER auto-generate ops.
SPEC: SKILL_ATOMIZATION_SPEC.md v15.0 + skill-authoring-checklist v2.0
FORMAT: v2.0 mandatory - When/How/Returns/Examples (all UNIQUE per skill)
ANTI-TEMPLATE: If How To Use could swap between skills, rewrite. See checklist v2.0.
QUALITY GATE: Count AND quality. Swap test + fresh instance test + anti-template scan.
COURSES AT: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MIT COURSES\ + RESOURCE PDFS\
```

<!-- ANCHOR: rc_essential_rules_standalone_no_other_doc_needed -->

<!-- ANCHOR: rc_system_exists_checklist -->
## SYSTEM EXISTS CHECKLIST (added 2026-02-17 per Roadmap Audit Finding 6)

```
Before using any system in boot or execution, check this list.
If a system is marked FALSE, SKIP all steps that reference it.
Do NOT assume a system exists just because the protocol mentions it.

knowledge_system:       FALSE  (built at DA-MS7, does not exist yet)
response_guard:         FALSE  (built at DA-MS2, does not exist yet)
session_knowledge_idx:  FALSE  (built at DA-MS7, does not exist yet)
compaction_snapshot:    FALSE  (referenced in recovery, not reliably produced)
section_index:          TRUE   (built at DA-MS5, exists and works)
skill_quality_gate:     FALSE  (prompt-level only, no code hook - see Audit F8)
protocols_split:        FALSE  (DA-MS0 Step 0 planned, not done)
claude_md_hierarchy:    FALSE  (DA-MS0 Step 1 planned, not done)
context_budget_tracking: FALSE (DA-MS0 Step 4 planned, not done)

UPDATE THIS LIST as systems come online. FALSE -> TRUE when code is deployed.
```

## ESSENTIAL RULES (standalone    no other doc needed)

```
BUILD:     npm run build (NEVER standalone tsc    OOM at current scale)
SAFETY:    S(x) >= 0.70 is HARD BLOCK. Never skip safety validation.
FLUSH:     Write results to disk after each logical unit. Don't accumulate in context.
POSITION:  Update CURRENT_POSITION.md every 3 calls during execution.
ERRORS:    Fix ONE build error. Rebuild. Repeat. If >5 errors from one edit â†’ revert.
IDEMPOTENT: Read-only calls = safe to re-run. Write calls = check if already done first.
NO PLACEHOLDERS: Every value must be real, complete, verified.
TRANSITION: When MS completes â†’ update CURRENT_POSITION first, ROADMAP_TRACKER second.
POWERSHELL: Never inline $ vars in DC start_process. Write .ps1 file first, execute file.
SCRIPTS:   See C:\PRISM\mcp-server\data\docs\SCRIPT_INDEX.json for all operational scripts.
           Key scripts: position-validator.js (session start), roadmap-lint.ps1 (pre-gate),
           update-skill-index.ps1 (after skill creation), split-skill.ps1 (DA-MS10).
```

<!-- ANCHOR: rc_stuck_protocol_autonomous -->
## STUCK PROTOCOL (autonomous)

```
ATTEMPT 1-3: Try to fix the problem with different approaches.
ATTEMPT 4:   Search codebase for similar patterns (code_search / grep).
ATTEMPT 5:   Read related test files for expected behavior.
ATTEMPT 6:   Try a completely different approach (not a variation).
IF NON-BLOCKING: Skip step, mark DEFERRED in ACTION_TRACKER, continue to next step.
IF BLOCKING:     Write detailed diagnosis to ACTION_TRACKER, ask human for guidance.
  "BLOCKED on [error] after [N] attempts. Tried: [list]. Need: [specific question]."
DATA ERRORS (R1): Quarantine bad data in PHASE_FINDINGS.md, continue with remaining data.
```

<!-- ANCHOR: rc_compaction_adaptation -->
## COMPACTION ADAPTATION

```
EFFICIENT RECOVERY (4 calls, ~1.3K tokens — replaces 8K session_boot blob):

  STEP A: Read position [15 lines, ~200 tokens]
    DC: read_file C:\PRISM\mcp-server\data\docs\roadmap\CURRENT_POSITION.md
    -> Gives: current MS, last complete, phase, blockers, next 3 steps

  STEP B: Validate position [5 lines, ~50 tokens]
    DC: start_process "node C:\PRISM\mcp-server\scripts\roadmap\position-validator.js"
    -> Confirms CURRENT_POSITION and ROADMAP_TRACKER agree. Trust its output.

  STEP C: Find section anchor [1 line, ~20 tokens]
    DC: start_process "node -e const fs=require('fs');const c=fs.readFileSync(
        'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\ROADMAP_SECTION_INDEX.md','utf8');
        c.split('\\n').filter(l=>l.includes('[current_ms_id]')).forEach(l=>console.log(l))"
    -> Gives: line number in phase doc for current milestone

  STEP D: Load milestone instructions [80 lines, ~1K tokens]
    DC: read_file [phase_doc_path] offset=[line_number] length=80
    -> Gives: full milestone instructions with role/model/effort

  STEP E: Resume work from the milestone instructions.

DO NOT call prism_dev:session_boot for recovery. Its 8K output overwhelms
post-compaction context. Use the 4-step sequence above instead.

AFTER RECOVERY, if session has capacity:
  - Load RECOMMENDED_SKILLS from the phase doc header (first 5 lines).
  - Check HOOKS_EXPECTED from the phase doc header.
  - Read ACTION_TRACKER.md last 10 lines for sub-step position.
```

<!-- ANCHOR: rc_phase_transition_protocol -->
## PHASE TRANSITION PROTOCOL

```
When the LAST MS of a phase completes:
  1. FIRST: Update CURRENT_POSITION.md â†’ point to NEXT phase's first MS
  2. SECOND: Append to ROADMAP_TRACKER.md â†’ "[Phase] COMPLETE [date]"
  3. Update MASTER_INDEX Phase Registry â†’ [this-phase] status = complete
  4. Load next phase doc
  5. Continue with next phase MS0

WHY THIS ORDER: If compaction hits between step 1 and 2, CURRENT_POSITION
already points to the next milestone. Recovery finds the right place.
```

<!-- ANCHOR: rc_active_enforcement_hooks -->
## ACTIVE ENFORCEMENT HOOKS (NL hooks = METADATA ONLY, not auto-firing)

```
NOTE: NL hooks are NOT wired into the execution pipeline. They document
INTENT but have 0 executions. The actual enforcement is in Step 3.5 above.
Keeping this list for reference and future wiring (DA-MS11).

roadmap-force-recovery-card    INTENT    On "continue/start/resume roadmap"   see Step 3.5
phase-prerequisite-check       INTENT    Before R2-R11 start   see Step 3.5
skill-quality-warning          INTENT    On skill_load/skill_content   see Step 3.5
build-size-monitor             INTENT    After build   see Step 3.5
context-pressure-flush         INTENT    At >70% pressure   see Step 3.5
phase-gate-asset-check         INTENT    At phase gate   see Step 3.5
post-compaction-recovery       INTENT    After compaction   see Compaction Adaptation
file-write-safety              INTENT    On file write   see Step 3.5
tier1-write-warning            INTENT    On Tier 1 file modification   see Step 3.5
position-cross-validate        INTENT    After reading CURRENT_POSITION   see Step 1
skill-quality-gate             INTENT    On skill creation   see Step 3.5
```

<!-- ANCHOR: rc_session_end_protocol -->
## SESSION END PROTOCOL

```
Before ending any session (or when context pressure > 75%):
  1. Write SESSION_HANDOFF.md:
     POSITION: [current MS and step]
     LAST_COMPLETED: [last finished step]
     NEXT_STEP: [what to do next]
     IN_PROGRESS: [any partial work, where it's saved]
     BLOCKING: [any issues preventing progress]
  2. Update CURRENT_POSITION.md with latest position
  3. Append to ROADMAP_TRACKER.md if any MS completed
  4. Save state: prism_session action=state_save (MCP mode only)
  5. SCRIPT MAINTENANCE (run if applicable):
     IF skills were created/modified this session:
       powershell -File scripts\skills\update-skill-index.ps1
     IF phase docs were edited (anchors added/moved):
       powershell -File scripts\roadmap\rebuild-section-index.ps1
     IF approaching a phase gate:
       powershell -File scripts\roadmap\roadmap-lint.ps1
       powershell -File scripts\roadmap\roadmap-regression-test.ps1
  6. KNOWLEDGE EXTRACTION (if knowledge system exists    built in DA-MS7):
     Review session: What decisions? What errors fixed? What learned?
     Write knowledge nodes to C:\PRISM\knowledge\sessions\[date]_session_knowledge.json
     Update SESSION_KNOWLEDGE_INDEX.json
     Types: decision, error_fix, assumption, observation, relationship, blocker
     MINIMUM: 1 node per session. Most sessions produce 3-8.
     TOOL: powershell -File C:\PRISM\knowledge\extract_knowledge.ps1 -EntriesFile <entries.json>

MCP:  prism_doc action=write name=SESSION_HANDOFF.md content="..."
DC:   Desktop Commander write_file C:\PRISM\mcp-server\data\docs\SESSION_HANDOFF.md
```
