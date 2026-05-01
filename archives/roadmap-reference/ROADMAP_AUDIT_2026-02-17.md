# ROADMAP AUDIT: ASPIRATIONAL MARKDOWN vs ACTIONABLE TOOLING
# Date: 2026-02-17 | Triggered by: Skill template disaster
# Question: Where else in the roadmap will we hit the same problem?
# Pattern: "Document says X is enforced/exists, but no code/tool/procedure actually does X"

---

## EXECUTIVE SUMMARY

The skill checklist failure (115 identical templates passing audit) exposed a systemic
pattern: PRISM's roadmap is heavy on DESCRIBING what should happen and light on TOOLING
that makes it happen. This audit found 14 concrete instances of the same disease across
the modular roadmap. Each is categorized by severity and has a specific fix.

**Severity levels:**
- **CRITICAL**: Will cause the same template/shortcut disaster when executed
- **HIGH**: Creates false confidence that something is enforced when it isn't
- **MEDIUM**: Wastes tokens or causes confusion but won't break anything
- **LOW**: Cleanup items, not urgent

---

## FINDING 1: PROTOCOLS_CORE IS A 2,187-LINE TOKEN BOMB
**Severity: MEDIUM | File: PRISM_PROTOCOLS_CORE.md**

**Problem:** 80+ lines of version history changelog before any actual content. The doc
is supposed to be "ALWAYS loaded every session" but at 2,187 lines (~40K tokens), loading
it burns half the context window on changelog entries nobody reads.

**Same disease as skills?** Yes — bloat that passes a "does it exist?" check but actively
harms execution by crowding out useful context.

**Fix:** 
- Strip ALL version history into a separate PROTOCOLS_CHANGELOG.md
- Split into tiered files (DA-MS0 Step 0 already planned this but it hasn't happened):
  - PROTOCOLS_BOOT.md (~2K tokens) — boot sequence + laws + config
  - PROTOCOLS_SAFETY.md (~2K tokens) — structured outputs + physics validation  
  - PROTOCOLS_CODING.md (~1.5K tokens) — code standards + build process
- Load ONLY what the current session needs
- **Effort**: S (5-8 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 2: SYSTEM_CONTRACT REFERENCES FUTURE PHASES AS "TESTED AT"
**Severity: HIGH | File: SYSTEM_CONTRACT.md**

**Problem:** The contract lists invariants with "Tested at: R2-MS0", "Tested at: R6-MS1",
"Tested at: R6-MS5" — but R2, R6 haven't been executed. These invariants are ASPIRATIONS
wearing the language of VERIFIED CONTRACTS. The doc even has the self-awareness to say
"If an invariant cannot satisfy all three [threshold, enforcement, violation response],
it is an ASPIRATION, not a CONTRACT" — but then lists invariants that fail this test.

**Specific violations:**
- INV-S5 (Safety Stability Under Load): "Tested at R6-MS1" — R6 doesn't exist
- INV-C4 (Calc Reproducibility): "Tested at R6-MS5" — R6 doesn't exist  
- INV-P1-P3 (Performance SLAs): All "Targets for R6 Production Gate" — not tested
- INV-C1 (Calculation Accuracy): "Tested at R2-MS0" — R2 not executed yet
- INV-C2 (Registry Completeness): Claims ≥95% thresholds — not verified

**Same disease as skills?** Yes — documents that DESCRIBE enforcement create the illusion
that enforcement EXISTS. When I read these during a session, I act as if the invariant is
verified when it's actually just a wish.

**Fix:**
- Add a STATUS column to every invariant: ACTIVE (code enforces it NOW), PLANNED (will be
  enforced at phase X), ASPIRATIONAL (no enforcement mechanism designed yet)
- Strip "Tested at" for phases that haven't run — replace with "WILL BE tested at"
- Add a summary table at the top: "X/Y invariants currently active"
- **Effort**: S (3-5 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 3: DA-MS9/MS10 USE OUTDATED SKILL FORMAT (PRE-v2.0)
**Severity: CRITICAL | File: PHASE_DA_DEV_ACCELERATION.md lines 1159-1404**

**Problem:** DA-MS10 defines skill output format as:
```
# prism-gcode-g28-reference-return
WHEN TO USE: [triggers]
FUNCTION: [knowledge, 50-150 lines max]
RELATED: [linked skills]
SOURCE: [origin]
```
This is the OLD format. No "How To Use", no "What It Returns", no "Examples", no
anti-template rules, no v2.0 compliance. If someone executes DA-MS10 as written,
they'll produce 170-200 skills in the wrong format — then need to remediate them ALL.

**Same disease as skills?** EXACTLY the same. The procedure will produce quantity without
quality, and the gate check (count ≥ 170) doesn't verify format compliance.

**Fix:**
- Update DA-MS9 Step 1 (SKILL_INDEX schema) to reference v2.0 checklist
- Update DA-MS10 skill output format to match v2.0: When/How/Returns/Examples
- Update DA-MS10 quality gate to include: "All skills pass v2.0 anti-template test"
- Update course extraction script spec to output v2.0 format
- Add: "Read skill-authoring-checklist v2.0 BEFORE creating any skill" to both MS headers
- Already partially addressed in SKILL_ATOMIZATION_SPEC v15.0, but PHASE_DA still has the
  old format and that's what gets loaded during execution
- **Effort**: S (3-5 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 4: COMPANION ASSETS ARE DELIVERABLE LISTS, NOT QUALITY SPECS
**Severity: HIGH | Files: R1, R3, R7 companion asset sections**

**Problem:** Every phase lists companion hooks, scripts, and skills as outputs:
```
HOOKS (3 new):
  data_validation_gate — blocking, post-load, runs bounds checks
  tool_schema_completeness — warning, post-load, checks 85-param population
```
But there's no quality criteria for these hooks. What makes a GOOD data_validation_gate?
What are its specific thresholds? What does it check? The description is a one-liner.

When execution time comes, Claude will generate a hook that technically matches the
one-line description but may be as hollow as the templated skill headers.

**Same disease as skills?** Yes — specifying WHAT to build without specifying what GOOD
looks like. The hook will "exist" but may not actually catch the problems it's supposed to.

**Fix:**
- For each companion hook/script/skill, add a VERIFICATION CRITERIA block:
  - Inputs it must handle (with edge cases)
  - Outputs it must produce (with examples)
  - Failure modes it must catch (with test cases)
  - At minimum: 1 positive test case, 1 negative test case, 1 edge case
- Don't need to write full test suites now — just enough specificity that the builder
  can't produce a hollow implementation that "passes"
- **Effort**: M (8-12 calls) | **Model**: Opus 4.6 | **Role**: Safety Engineer

---

## FINDING 5: R4-R6 STUB PHASES HAVE NO PROCEDURES
**Severity: MEDIUM | Files: PHASE_R4_ENTERPRISE.md, PHASE_R5_VISUAL.md, PHASE_R6_PRODUCTION.md**

**Problem:** These phases have:
- "STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)"
- Milestone assignment tables (Role/Model/Effort/Sessions)
- "TOOL ANCHORS" — dispatcher calls that might work

But NO step-by-step procedures. When it's time to execute R4-MS0, Claude will read
"Tenant Isolation" and a list of dispatcher calls, then improvise the implementation.
The quality will depend entirely on which Claude instance happens to be running.

**Same disease as skills?** Partially — stubs are acknowledged as stubs (the doc literally
says "expand at phase start"). The risk is that expansion happens hastily at execution time
without the quality rigor applied to R1-R3.

**Fix:**
- This is actually OK as-is IF the expansion process is rigorous. The PHASE_TEMPLATE.md
  provides structure. The real fix is ensuring the Brainstorm-to-Ship expansion for each
  stub phase applies the same anti-template thinking as v2.0 skills:
  - Each step must have verification criteria (not just "implement X")
  - Each gate must test behavior (not just existence)
  - Each companion asset must have quality specs (Finding 4)
- Add a note to each stub: "When expanding, apply v2.0 quality standards per Finding 5
  of ROADMAP_AUDIT_2026-02-17.md"
- **Effort**: S (2-3 calls) | **Model**: Sonnet | **Role**: Context Engineer
- **Timing**: Do this when each phase is about to start, not now

---

## FINDING 6: BOOT PROTOCOL REFERENCES SYSTEMS THAT DON'T EXIST
**Severity: HIGH | File: PRISM_PROTOCOLS_CORE.md boot protocol + RECOVERY_CARD**

**Problem:** The boot protocol references:
- Step 2.5: "REQUIRES artifacts from SYSTEM_CONTRACT.md" — but no code checks this
- SESSION_KNOWLEDGE system — "built in DA-MS7" but DA-MS7 hasn't executed
- COMPACTION_SNAPSHOT.md — referenced in recovery but not reliably produced
- "prism_dev action=health" validation against HEALTH_SCHEMA — exists as text, 
  but does Claude actually validate the schema or just call health and move on?

Each reference creates a branching instruction: "IF this system exists, use it."
But when Claude is under context pressure post-compaction, it may assume systems exist
and try to use them, or skip steps it shouldn't.

**Same disease as skills?** Similar — the procedure looks complete on paper but parts of it
reference phantom infrastructure, which means execution either fails silently or takes
shortcuts.

**Fix:**
- Add a SYSTEM_EXISTS_CHECKLIST to the boot protocol with boolean flags:
  ```
  knowledge_system: false (built at DA-MS7)
  response_guard: false (built at DA-MS2) 
  section_index: true (built at DA-MS5, exists now)
  skill_quality_gate: false (prompt-level only, see Finding 8)
  ```
- Boot protocol checks flags and SKIPS steps for systems that don't exist yet
- Update flags as systems come online
- This prevents phantom-dependency failures during execution
- **Effort**: S (3-5 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 7: PHASE GATES CHECK COUNTS, NOT QUALITY
**Severity: CRITICAL | Files: Multiple phase docs**

**Problem:** Phase gates across the roadmap check quantities:
- R1-MS9: "SKILL_INDEX.json count >= 300"
- DA-MS10: "Total new atomic skills: ~170-200"
- R1-MS4: "Coverage >= 95%"

None of these gates check QUALITY. The skill disaster proved that 116/116 passing a
count-based gate means nothing if the content is hollow.

**Specific gates that need quality criteria:**
- DA-MS10 skill pilot gate: Currently checks count. Should check v2.0 compliance.
- R1 registry gates: Check load counts. Don't verify data QUALITY (are the values
  physically reasonable? do materials have all critical parameters?).
- R3 job_plan gate: Checks that the action exists. Doesn't verify output quality.

**Same disease as skills?** Identical pattern. "Does it exist?" ≠ "Is it good?"

**Fix:**
- Every phase gate that checks a count MUST also check quality:
  - Skill gates: Random sample passes v2.0 anti-template test
  - Registry gates: Random sample has physically reasonable values
  - Action gates: Sample output reviewed against reference (not just "runs without error")
- Add to PHASE_TEMPLATE.md: "GATE RULE: Every count-based gate must include a quality
  sample check. Minimum: 3 random items reviewed against quality criteria."
- **Effort**: M (8-10 calls) | **Model**: Opus 4.6 | **Role**: Safety Engineer

---

## FINDING 8: NO ENFORCEMENT HOOKS FOR NON-SAFETY DOMAINS  
**Severity: HIGH | Observation across all docs**

**Problem:** The hook system has 62 hooks, but they're concentrated on calculations and
safety. There are ZERO hooks for:
- Skill creation quality (Finding from skill disaster)
- Phase gate validation (gates are procedural, not code-enforced)
- Document quality (no check when writing roadmap docs, tracker entries, etc.)
- Companion asset quality (hooks/scripts/skills produced during phases)

The hook infrastructure EXISTS and works. It's just pointed at the wrong things.
Safety calcs (which are well-tested) have 18 hooks. Skills (which just failed badly)
have 0 hooks.

**Same disease as skills?** Directly caused the skill disaster. The most-tested part of
the system (calcs) has the most hooks. The least-tested part (skills) has none.

**Fix:**
- Priority 1: SKILL-QUALITY-GATE hook (already spec'd in SKILL_ATOMIZATION_SPEC v15.0)
- Priority 2: PHASE-GATE-QUALITY hook — fires at phase boundaries, runs quality sample
- Priority 3: DOC-ANTI-REGRESSION hook — fires on doc writes, checks word count didn't
  drop by >50% (prevents accidental truncation)
- These don't need to be complex. Even a basic "does the SKILL.md have 4 unique sections
  totaling >500 chars?" hook would have caught the template disaster.
- **Effort**: L (15-20 calls) | **Model**: Sonnet | **Role**: Systems Engineer
- **Timing**: Should be part of next dev session, not deferred to R-SKILL

---

## FINDING 9: RECOVERY CARD SKILL ATOMIZATION SECTION IS STALE
**Severity: MEDIUM | File: PRISM_RECOVERY_CARD.md lines ~200-215**

**Problem:** The recovery card's SKILL ATOMIZATION PARALLEL TRACK section says:
- "BULK: Haiku extracts, Sonnet reviews quality, batches of 10-20 skills per session"
- References SKILL_ATOMIZATION_SPEC.md (now v15.0, but recovery card cites v14.5 behavior)

If someone loads the recovery card during compaction recovery, they'll get outdated
skill creation instructions that conflict with v2.0 checklist.

**Fix:**
- Update recovery card skill section to reference v15.0 spec and v2.0 checklist
- Change batch size from "10-20" to "3-5" per v2.0 rules
- Add: "NEVER auto-generate operational sections"
- **Effort**: S (1-2 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 10: ROLE/MODEL ASSIGNMENTS ARE ADVISORY, NOT ENFORCED
**Severity: MEDIUM | File: ROLE_MODEL_EFFORT_MATRIX.md + all phase docs**

**Problem:** Every milestone has "Role: X | Model: Y | Effort: Z" but nothing prevents
execution with the wrong model. In claude.ai, the user picks the model. In Claude Code,
the config picks it. There's no gate that says "this MS requires Opus, you're running
Sonnet, STOP."

**Same disease?** Low severity version — model mismatches degrade quality but don't
cause template disasters. The real risk is safety-critical work (R2) running on Sonnet
instead of Opus.

**Fix:**
- Add model validation to safety-critical MS headers:
  "HARD: This MS requires Opus. If running Sonnet/Haiku, STOP and switch models."
- For non-safety MS: keep advisory (current approach is fine)
- **Effort**: S (2-3 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 11: SCRIPTS REFERENCED BUT EXISTENCE UNVERIFIED
**Severity: MEDIUM | Files: DA-MS9, R1 companion assets**

**Problem:** The roadmap references scripts that should exist:
- split-skill.ps1 (DA-MS9 Step 2)
- extract-course-skills.ps1 (DA-MS9 Step 3)
- update-skill-index.ps1 (DA-MS9 Step 4)
- registry_health_check (R1 companion)
- material_search_diagnostic (R1 companion)

Some may exist from earlier work, some may not. The roadmap doesn't track which
scripts actually exist vs which are planned.

**Fix:**
- Run a script existence audit: check C:\PRISM\mcp-server\scripts\ for each referenced script
- Add SCRIPT_INVENTORY.md to roadmap/ tracking: script name, status (exists/planned/stub),
  last verified date, referenced by (which MS)
- **Effort**: S (3-5 calls) | **Model**: Sonnet | **Role**: Context Engineer

---

## FINDING 12: CHANGE CONTROL TIERS HAVE NO ENFORCEMENT
**Severity: HIGH | File: SYSTEM_CONTRACT.md § Change Control Tiers**

**Problem:** The contract defines 3 tiers of change control:
- Tier 1 (Safety-critical): "requires manual verification against handbook values"
- Tier 2 (Operational): "requires build pass + health check"
- Tier 3 (Documentation): "requires code change only"

But there's no mechanism that ROUTES a change to the right tier. When Claude edits
tolerances.ts, nothing says "this is Tier 1, you need manual verification." The tier
system exists as text that Claude may or may not remember to consult.

**Same disease as skills?** Yes — a governance structure that depends on Claude reading
a document and choosing to follow it, with no guardrail when Claude doesn't.

**Fix:**
- Add a FILE→TIER mapping as a pre-write hook:
  - Files matching *tolerances*, *referenceValues*, *safety*, *S(x)* → Tier 1 warning
  - Files matching *Dispatcher*, *Engine*, *registry* → Tier 2 warning
  - Everything else → Tier 3
- The hook doesn't need to BLOCK — just WARN: "This file is Tier 1 (safety-critical).
  Have you verified against handbook values?"
- Piggybacks on existing hook infrastructure (docAntiRegression already fires on file-write)
- **Effort**: M (6-8 calls) | **Model**: Sonnet | **Role**: Systems Engineer

---

## FINDING 13: R5 UI SPECS REFERENCE ACTIONS THAT DON'T EXIST
**Severity: LOW | File: PHASE_R5_VISUAL.md**

**Problem:** R5 lists 12 UI components that call specific dispatcher actions:
- job_plan, setup_sheet, what_if, material_substitute, strategy_for_job,
  strategy_compare, novel_strategies, tool_facets, machine_recommend

Several of these actions don't exist yet (they're built in R3). The R5 doc doesn't
note this dependency clearly — it reads as if the actions are ready to consume.

**Fix:**
- Add dependency markers to each R5 component: "REQUIRES: [action] from [phase-MS]"
- Add to R5 phase gate: "ENTRY: All referenced actions exist and return valid data"
- **Effort**: S (2-3 calls) | **Model**: Sonnet | **Role**: Context Engineer
- **Timing**: When R5 expansion starts, not now

---

## FINDING 14: PROTOCOLS_CORE BURIES ACTIVE RULES IN 2,187 LINES
**Severity: MEDIUM | File: PRISM_PROTOCOLS_CORE.md**

**Problem:** Active, critical rules (boot protocol, safety gates, stuck protocol) are
buried among version history, infrastructure audit findings, and gap analysis notes.
When Claude loads this file, attention decay means rules at line 1800 get less weight
than rules at line 50. The first 120 lines are ALL changelog — zero operational content.

The version history is important for auditing but actively harmful for execution.
Rules that matter (like "S(x) ≥ 0.70 HARD BLOCK") compete for attention with
"IA3-9.1: STUCK PROTOCOL: 3-attempt ceiling" change notes.

**Fix:** (Same as Finding 1 — split the file)
- Move changelog to PROTOCOLS_CHANGELOG.md
- Put ACTIVE RULES at the TOP of each tiered file
- First 20 lines of PROTOCOLS_BOOT.md should be the 10 most critical rules
- **Effort**: Part of Finding 1 fix

---

## PRIORITY ACTION PLAN

### DO NOW (next 1-2 sessions)
| # | Finding | Effort | Status |
|---|---------|--------|--------|
| 3 | Update DA-MS9/MS10 skill format to v2.0 | S (3-5) | DONE - v2.0 examples + quality gate |
| 9 | Update Recovery Card skill section | S (1-2) | DONE - v15.0, batch limits, anti-template |
| 7 | Add quality criteria to phase gates | M (8-10) | DONE - PHASE_TEMPLATE + DA-MS10 gate |

### DO NEXT (sessions 3-5)
| # | Finding | Effort | Status |
|---|---------|--------|----------|
| 1+14 | Split PROTOCOLS_CORE, strip changelog | S (5-8) | DONE - 4 files, refs updated |
| 2 | Add STATUS column to SYSTEM_CONTRACT invariants | S (3-5) | DONE - status summary added |
| 6 | Add SYSTEM_EXISTS_CHECKLIST to boot | S (3-5) | DONE - added to Recovery Card |
| 8 | Build SKILL-QUALITY-GATE hook | L (15-20) | DONE - blocking hook in EnforcementHooks.ts |

### DO WHEN RELEVANT (at phase start)
| # | Finding | Effort | Status |
|---|---------|--------|------|
| 4 | Add quality specs to companion assets | M (8-12) | DONE - PHASE_TEMPLATE updated |
| 5 | Apply v2.0 quality to stub phase expansion | S (2-3) | DONE - checklist items added |
| 10 | Add model validation to safety MS headers | S (2-3) | DONE - R2 header updated |
| 11 | Script existence audit | S (3-5) | DONE - 3/3 skill scripts exist (real), 3 R1 scripts planned |
| 12 | File-to-Tier pre-write hook | M (6-8) | DONE - NL hook deployed + tier mapping |
| 13 | R5 dependency markers | S (2-3) | DONE - action dependency check block added |

---

## THE PATTERN TO WATCH FOR

Every time we write a roadmap document, ask these 3 questions:

1. **"Does this describe enforcement or IS it enforcement?"**
   If it's a description of what should happen → it's aspirational, not a tool.
   Aspirational is fine as long as it's LABELED aspirational.

2. **"Will this gate catch a hollow implementation?"**
   If the gate checks count/existence → it won't catch templates/stubs.
   Every gate needs at least one quality sample check.

3. **"Can a shortcut-taking Claude comply with this without doing the actual work?"**
   If yes → the spec needs more constraints.
   The test: could a script generate compliant output? If yes, the spec is too loose.

---

## SCORECARD

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| False enforcement (says enforced, isn't) | 4 | 0 | 3 | 0 | 1 |
| Count-not-quality gates | 2 | 2 | 0 | 0 | 0 |
| Token bloat / buried rules | 3 | 0 | 0 | 3 | 0 |
| Stale references | 3 | 1 | 1 | 1 | 0 |
| Missing infrastructure | 2 | 0 | 2 | 0 | 0 |
| **TOTAL** | **14** | **3** | **6** | **4** | **1** |

3 CRITICAL findings that will cause repeat disasters if not fixed before execution.
6 HIGH findings that create false confidence or missing guardrails.
4 MEDIUM findings that waste tokens or cause confusion.
1 LOW finding that's a cleanup item.

REMEDIATION PROGRESS (2026-02-17):
  DONE: 14 of 14 findings fixed. ALL COMPLETE.
  F1+F14: PROTOCOLS_CORE split into BOOT(723)+SAFETY(804)+CODING(553)+CHANGELOG(138)
  F2: SYSTEM_CONTRACT invariant status summary (ACTIVE/PLANNED/ASPIRATIONAL)
  F3: DA-MS9/MS10 v2.0 skill format + quality gate (count AND quality)
  F4: PHASE_TEMPLATE companion assets require 3 test cases per hook
  F5: Stub expansion checklist has v2.0 anti-template items
  F6: SYSTEM_EXISTS_CHECKLIST in Recovery Card (9 systems tracked)
  F7: Phase gate quality rule (every count check must sample 3 items)
  F8: SKILL-QUALITY-GATE blocking hook in EnforcementHooks.ts (5 checks, code enforcement)
  F9: Recovery Card skill section updated to v15.0
  F10: R2 HARD model requirement (Opus for golden values)
  F11: Script audit (3/3 skill scripts real, 3 R1 scripts planned)
  F12: File-to-Tier NL hook deployed (warns on safety-critical file writes)
  F13: R5 action dependency check block (lists all required actions before expansion)