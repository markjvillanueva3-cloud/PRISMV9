# PRISM OPERATIONAL IMPROVEMENTS — MASTER ACTION PLAN v2.0
# Scope: 15 operational improvements + 4-branch hierarchical index + session knowledge system + skill atomization
# Organized into 8 implementation waves by dependency order
# Each task has: role, model, effort, prerequisites, deliverables, verification
# Principle: Detailed enough that any Claude instance can execute without prior context

---

## OVERVIEW

This plan transforms PRISM from a system that loses knowledge between sessions into one
that accumulates intelligence over time. Three interlocking capabilities:

1. OPERATIONAL IMPROVEMENTS (Waves 0-4): Fix the session experience — compaction resilience,
   context efficiency, proactive health monitoring, QA tooling.

2. HIERARCHICAL INDEX (Wave 5): Index the entire MCP server — code structure, data taxonomy,
   cross-registry relationships. Every phase contributes to the index as a byproduct.

3. SESSION KNOWLEDGE SYSTEM (Wave 6 + embedded in all waves): Capture what Claude learns
   each session — decisions, errors, relationships, observations — and make it queryable
   in future sessions. This is the "memory that survives everything."

Combined effect: A new session starts → reads Recovery Card (position) → queries knowledge
index (what do I know about this MS?) → loads only the sections needed (via anchor index)
→ executes with full accumulated intelligence → extracts new knowledge at session end.

ESTIMATED TOTAL: 8-12 sessions across all waves.
TOKEN SAVINGS: ~12K per session after completion (~60% reduction in overhead).
KNOWLEDGE RETENTION: ~90% of session learnings preserved (currently ~5%).

---

## FULL INVENTORY (24 items, re-prioritized)

| # | Item | Wave | Impact | Effort | Model |
|---|------|------|--------|--------|-------|
| 1 | Pre-compaction auto-dump hook | W4 | HIGH | Medium | Sonnet |
| 2 | Tiered handoffs | W7 | LOW | Low | defer |
| 3 | Session health signal | W4 | HIGH | Medium | Sonnet+Opus |
| 4 | Skill/dispatcher phase-loading | W5 | MEDIUM | High | All 3 |
| 5 | PowerShell DC workaround doc | W0 | MEDIUM | Trivial | Any |
| 6 | Binary transfer gap | W7 | LOW | Can't fix | defer |
| 7 | Content-addressed doc cache | W3 | HIGH | Medium | Sonnet |
| 8 | Diff capability for docs | W3 | MEDIUM | Medium | Sonnet |
| 9 | Context cost reduction (split) | W5 | HIGH | High | Opus+Sonnet |
| 10 | Cross-session continue | W0 | MEDIUM | Low | Any |
| 11 | Roadmap lint script | W2 | MEDIUM | Low | Sonnet |
| 12 | Token estimate accuracy | W2 | LOW | Trivial | Sonnet |
| 13 | Companion asset tracking | W0 | LOW | Trivial | Any |
| 23 | Skill atomization (34 skills -> atomic) | W8 | HIGH | Very High | Haiku+Sonnet+Opus |
| 24 | Course extraction (206 MIT + 25 CNC/CAM) | W8 | HIGH | Very High | Haiku+Sonnet |
| 14 | Roadmap regression test | W2 | MEDIUM | Low | Sonnet |
| 15 | Section anchors + index | W1 | V.HIGH | Medium | Haiku+Sonnet |
| 16 | Hierarchical code index (Branch 1) | W5 | HIGH | Medium | Haiku+Sonnet |
| 17 | Hierarchical data index (Branch 2) | W5 | HIGH | Medium | Haiku+Sonnet |
| 18 | Relationship graph (Branch 3) | W6 | V.HIGH | High | Opus |
| 19 | Session knowledge extraction | W6 | V.HIGH | Medium | Sonnet+Opus |
| 20 | Session knowledge index | W6 | V.HIGH | Medium | Sonnet |
| 21 | Knowledge query on boot | W6 | HIGH | Low | Sonnet |
| 22 | Cross-phase knowledge promotion | W6 | HIGH | Medium | Opus |


---

## DEPENDENCY MAP

```
W0 (protocol fixes) ─────────────────────────────── zero dependencies, do first
  │
W1 (section anchors + doc index) ──────────────────── zero dependencies, do with W0
  │
  ├──→ W2 (QA tooling) ────────────────────────────── needs W1 anchors to validate
  │
  ├──→ W3 (prism_doc enhancements) ────────────────── needs W1 anchors for read_section
  │     │
  │     └──→ W4 (session intelligence) ────────────── needs W3 hash for efficient state checks
  │           │
  │           └──→ W5 (context optimization + code index) ── needs W1-W4 infrastructure
  │                 │
  │                 └──→ W6 (knowledge system + relationships) ── needs W5 index structure
  │
  └──→ W6 (knowledge system) ─────────────────────── CAN start schema design in parallel with W2
        │                                             but full implementation needs W5
        └──→ W7 (deferred) ───────────────────────── solve when painful
```

CRITICAL PATH: W0 → W1 → W3 → W4 → W5 → W6
PARALLEL TRACK: W0 ∥ W1, then W2 ∥ W3, then W4, then W5, then W6
W6 SCHEMA DESIGN can start during W2 (Opus designs while Sonnet builds scripts)
```


---

## WAVE 0: PROTOCOL FIXES (zero code, immediate wins)
**Role:** Technical Writer
**Model:** Any (Opus if already in session, Sonnet or Haiku fine)
**Effort:** ~15 minutes total
**Prerequisites:** None — this is the starting point
**Environment:** Claude.ai MCP or DC mode — either works
**Parallel:** Run alongside W1 (no conflicts)

### W0-1: PowerShell Desktop Commander Protocol (Item #5)

**PROBLEM:** Desktop Commander strips `$` from inline PowerShell commands, causing every
command with variables to fail. This wastes 3-5 calls per occurrence.

**WHAT TO DO:**
1. Open PRISM_PROTOCOLS_CORE.md
2. Find the section `<!-- ANCHOR: code_standards -->` (or the "## Code Standards" header)
3. Add the following AFTER the existing code standards section:

```
DESKTOP COMMANDER + POWERSHELL PROTOCOL:
  NEVER pass inline PowerShell with $ variables through DC start_process.
  DC strips $ from inline commands, causing parse failures every time.

  CORRECT PATTERN (3 calls, all succeed):
    Call 1: DC write_file → C:\PRISM\temp_[task].ps1 (write the PS script)
    Call 2: DC start_process → powershell -ExecutionPolicy Bypass -File C:\PRISM\temp_[task].ps1
    Call 3: DC delete → C:\PRISM\temp_[task].ps1 (cleanup, optional)

  WRONG PATTERN (1 call, always fails):
    DC start_process → powershell -Command "$var = Get-Content..."  ← BROKEN

  WHY: 3 working calls beat 5 failed retries + debugging. Accept the overhead.
  NAMING: Use temp_[descriptive-name].ps1 to avoid collisions.
  CLEANUP: Delete temp scripts after use unless debugging.
```

4. Also add a 1-line reminder to PRISM_RECOVERY_CARD.md under §ESSENTIAL RULES:
   `POWERSHELL: Never inline $ vars in DC start_process. Write .ps1 file first.`

**VERIFY:** Read both files back. Confirm the text appears where expected.
**DELIVERABLE:** 2 file edits (PROTOCOLS_CORE + RECOVERY_CARD)

---

### W0-2: Companion Asset Checklist Protocol (Item #13)

**PROBLEM:** New dispatcher actions need a skill + hook + script as companion assets.
These aren't tracked individually — they're a blob at end of phase docs. Easy to forget.

**WHAT TO DO:**
1. Open PRISM_PROTOCOLS_CORE.md
2. Find the "Companion Asset Rule" section (search for "companion")
3. Add tracking format:

```
COMPANION ASSET TRACKING:
  When ANY MS adds a new dispatcher action, immediately add to ACTION_TRACKER.md:
    COMPANION: [action-name] — SKILL: pending | HOOK: pending | SCRIPT: pending
  When the companion asset is created, update to:
    COMPANION: [action-name] — SKILL: done ([filename]) | HOOK: done ([name]) | SCRIPT: done ([name])
  AT PHASE GATE: Count all COMPANION entries. If ANY show "pending" → gate FAILS.
  This prevents shipping features without their safety nets.
```

4. Open PHASE_TEMPLATE.md
5. Add to the template's gate section:
   `  Check: All COMPANION entries in ACTION_TRACKER show "done" for this phase.`

**VERIFY:** Read both files. Confirm additions.
**DELIVERABLE:** 2 file edits (PROTOCOLS_CORE + PHASE_TEMPLATE)

---

### W0-3: Cross-Session Position Reliability (Item #10)

**PROBLEM:** If a chat closes unexpectedly (browser crash, timeout), no handoff gets written.
CURRENT_POSITION.md may be stale if the last auto-save was 5+ calls ago.

**WHAT TO DO:**
1. Open PRISM_PROTOCOLS_CORE.md
2. Find the position auto-save rule (search for "every 3 calls" or "CURRENT_POSITION")
3. Ensure it says "every 3 calls" (not 5). If it says 5, change to 3.
4. Add emphasis:

```
POSITION AUTO-SAVE PROTOCOL:
  Write CURRENT_POSITION.md EVERY 3 prism_ calls. Non-negotiable.
  This is the ONLY reliable cross-session state if chat closes unexpectedly.
  SESSION_HANDOFF.md is ADDITIONAL context — position auto-save is the baseline.
  Format: "CURRENT: [MS-ID] step [N] | LAST_COMPLETE: [MS-ID] [date] | PHASE: [ID] [status]"
  Include step number (not just MS) — this prevents re-running completed steps.
```

**VERIFY:** Search PROTOCOLS_CORE for "every 5 calls" — should return 0 hits.
Search for "every 3 calls" — should appear in position auto-save section.
**DELIVERABLE:** 1 file edit

---

### W0 COMPLETION CHECKLIST:
```
□ PROTOCOLS_CORE has PowerShell DC protocol
□ RECOVERY_CARD has PowerShell 1-liner
□ PROTOCOLS_CORE has companion asset tracking format
□ PHASE_TEMPLATE has companion gate check
□ PROTOCOLS_CORE says "every 3 calls" for position saves (not 5)
□ All edits verified by re-reading the modified sections
```


---

## WAVE 1: SECTION ANCHORS + DOCUMENT INDEX (the force multiplier)
**Role:** Information Architect
**Model:** Haiku (bulk anchor placement) + Sonnet (index design + script)
**Effort:** ~1 session (60-90 minutes)
**Prerequisites:** None — runs in parallel with W0
**Environment:** Claude Code preferred (parallel subagents for bulk work), DC fallback
**Parallel:** W0 can run simultaneously. W1-1 through W1-4 are sequential.

### WHY THIS IS THE HIGHEST-LEVERAGE ITEM:
Every subsequent wave benefits from anchor-based loading. After W1:
- Post-compaction recovery loads ~1K tokens instead of ~15K
- Any section of any file can be loaded in isolation
- The index becomes the primary navigation tool
- QA scripts (W2) can validate anchors exist
- prism_doc read_section (W3) uses anchors as boundaries
- Knowledge system (W6) tags entries by anchor section
Without W1, every other wave is less efficient.

---

### W1-1: Place section anchors in all roadmap files
**Model: Haiku** (mechanical, high-volume, no judgment needed)
**Effort:** ~30 minutes

**WHAT ARE SECTION ANCHORS:**
HTML comments placed before section headers that serve as stable reference points.
Format: `<!-- ANCHOR: [section_id] -->`
They don't affect rendering. They're invisible to readers. They're grep-able by tools.

**NAMING CONVENTION:**
- All lowercase, underscores only, max 40 characters
- Prefix with abbreviated filename: `pc_` for PROTOCOLS_CORE, `r1_` for R1, etc.
- Descriptive: `pc_boot_protocol`, `r1_ms5_tool_schema`, `mi_phase_registry`
- No spaces, no hyphens, no special characters

**ANCHOR PLACEMENT RULES:**
- Place an anchor BEFORE every `##` header (second-level headers)
- Place an anchor BEFORE every `### ` header that starts a milestone or major subsection
- Do NOT anchor every paragraph — only structural sections
- Do NOT anchor lines inside code blocks
- Each anchor must be on its OWN line, immediately before the header

**EXAMPLE:**
```markdown
<!-- ANCHOR: pc_boot_protocol -->
## Boot Protocol

<!-- ANCHOR: pc_environment_detection -->
### STEP 0.5: ENVIRONMENT DETECTION
```

**FILE PROCESSING ORDER** (highest value first):

**Group 1 — Core files (Haiku subagent 1):**
```
PRISM_PROTOCOLS_CORE.md    → prefix: pc_   → estimate: ~50 anchors
  Key sections to anchor:
    pc_version_history, pc_gitignore, pc_orphan_cleanup,
    pc_state_snapshot, pc_environment_detection, pc_boot_context,
    pc_health_gate, pc_phase_role, pc_position_recovery,
    pc_position_validation, pc_phase_boundary_check,
    pc_compaction_protocol, pc_compaction_avoidance,
    pc_compaction_detection, pc_compaction_recovery_cascade,
    pc_compaction_telemetry, pc_rapid_compaction,
    pc_adaptive_thinking, pc_structured_outputs,
    pc_health_schema, pc_calc_schema, pc_safety_schema,
    pc_laws_8, pc_code_standards, pc_build_rules,
    pc_error_taxonomy, pc_stuck_protocol,
    pc_mcp_crash_recovery, pc_graceful_degradation,
    pc_hook_response_protocol, pc_cadence_functions,
    pc_build_failure_triage, pc_rate_limit_protocol,
    pc_claudeai_recovery, pc_claudeai_pure_recovery,
    pc_flush_early, pc_session_handoff,
    ... (scan file for all ## and ### headers)
```

**Group 2 — Active phase docs (Haiku subagent 2):**
```
PHASE_DA_DEV_ACCELERATION.md → prefix: da_  → estimate: ~15 anchors
PHASE_R1_REGISTRY.md          → prefix: r1_  → estimate: ~25 anchors
PHASE_R2_SAFETY.md            → prefix: r2_  → estimate: ~15 anchors
PHASE_R3_CAMPAIGNS.md         → prefix: r3_  → estimate: ~20 anchors
```

**Group 3 — Remaining files (Haiku subagent 3):**
```
PRISM_MASTER_INDEX.md          → prefix: mi_  → estimate: ~15 anchors
SYSTEM_CONTRACT.md             → prefix: sc_  → estimate: ~12 anchors
ROADMAP_INSTRUCTIONS.md        → prefix: ri_  → estimate: ~8 anchors
SKILLS_SCRIPTS_HOOKS_PLAN.md   → prefix: ssh_ → estimate: ~10 anchors
PRISM_RECOVERY_CARD.md         → prefix: rc_  → estimate: ~8 anchors
PHASE_R4 through R11           → prefix: r4_ through r11_ → estimate: ~8 each
CLAUDE_CODE_INTEGRATION.md     → prefix: cci_ → estimate: ~8 anchors
DEPLOYMENT_GUIDE.md            → prefix: dg_  → estimate: ~5 anchors
```

**TOTAL ESTIMATED ANCHORS:** ~220-250 across 20+ files

**PROCESS FOR EACH FILE:**
```
1. Read the file (full or via DC read_file)
2. Find every ## and ### header line
3. Generate anchor name using prefix + descriptive_name
4. Insert `<!-- ANCHOR: [name] -->` on a NEW LINE before each header
5. Write the modified file back
6. Read it again to verify anchors are in place
7. Count anchors placed — record in progress tracker
```

**VERIFY:** After all files processed:
```
grep -r "<!-- ANCHOR:" C:\PRISM\mcp-server\data\docs\roadmap\ --include="*.md" | wc -l
Expected: 220-250
If less than 200: some files were missed. Check which files have 0 anchors.
```

---

### W1-2: Build the section index
**Model: Sonnet** (needs judgment for descriptions and grouping)
**Effort:** ~20 minutes
**Depends on:** W1-1 complete (anchors must exist to index)

**CREATE FILE:** `C:\PRISM\mcp-server\data\docs\roadmap\ROADMAP_SECTION_INDEX.md`

**FORMAT:**
```markdown
# PRISM ROADMAP — SECTION INDEX v14.3
# Auto-generated from section anchors. Regenerate with: scripts/roadmap/rebuild-section-index.ps1
# Use: Find any section by topic → load only those lines via read_section or line range
# Load this (~200 lines, ~1.5K tokens) instead of full MASTER_INDEX for navigation

## PRISM_PROTOCOLS_CORE.md (2,106+ lines, ~13K tokens)

| Anchor | Line | Section | Description |
|--------|------|---------|-------------|
| pc_boot_protocol | ~169 | Boot Protocol | Steps 0-2.5, session initialization |
| pc_environment_detection | ~168 | Env Detection | MCP vs DC vs minimal mode |
| pc_compaction_recovery_cascade | ~540 | Compaction Recovery | 3-layer cascade |
| pc_stuck_protocol | ~1608 | Stuck Protocol | 6-level autonomous escalation |
| pc_rapid_compaction | ~610 | Rapid Compaction | Ultra-minimal mode trigger |
| pc_session_handoff | ~1836 | Session Handoff | End-of-session state capture |
| pc_build_failure_triage | ~1380 | Build Triage | Error diagnosis + fix |
| ... | ... | ... | ... |

## PHASE_R1_REGISTRY.md (1,497+ lines, ~9K tokens)

| Anchor | Line | Section | Description |
|--------|------|---------|-------------|
| r1_quick_reference | ~33 | Quick Reference | Standalone rules after compaction |
| r1_execution_model | ~36 | Execution Model | Env + parallel config |
| r1_ms4_5_validation | ~175 | MS4.5 | Data validation pipeline |
| r1_ms5_tool_schema | ~253 | MS5 | Tool normalization + ToolIndex |
| ... | ... | ... | ... |

[... repeat for all files ...]
```

**PROCESS:**
```
For each file with anchors:
  1. Read the file
  2. Find every <!-- ANCHOR: xxx --> line
  3. Record: anchor name, line number, the header text on the NEXT line
  4. Write a 1-line description based on the header + first sentence of section
  5. Add to the index table for that file
  6. Include file-level stats: total lines, estimated tokens (words ÷ 0.75)
```

**VERIFY:**
```
Count entries in index. Should match total anchor count from W1-1 (220-250).
Spot-check 10 random entries: does the line number match the actual anchor location?
```

---

### W1-3: Build the index regeneration script
**Model: Sonnet** (script writing)
**Effort:** ~15 minutes
**Depends on:** W1-1 + W1-2 (need to know the format)

**CREATE FILE:** `C:\PRISM\mcp-server\scripts\roadmap\rebuild-section-index.ps1`

**SCRIPT REQUIREMENTS:**
```
INPUT:  All .md files in C:\PRISM\mcp-server\data\docs\roadmap\ (not archive/)
OUTPUT: ROADMAP_SECTION_INDEX.md (overwrite)
ALSO:   .roadmap-index-baseline.json (anchor positions for drift detection)

LOGIC:
  1. Get all .md files in roadmap/ directory (exclude archive/)
  2. For each file:
     a. Read all lines
     b. Find every line matching: <!-- ANCHOR: (.*) -->
     c. Extract anchor name from capture group
     d. Record line number
     e. Read the NEXT non-empty line (the header)
     f. Read the line AFTER the header (first sentence of content)
     g. Store: {file, anchor, line, header, description}
  3. Group entries by file
  4. For each file group:
     a. Count total lines, estimate tokens
     b. Format as markdown table
  5. Write ROADMAP_SECTION_INDEX.md with all tables
  6. Write .roadmap-index-baseline.json with:
     { "generated": "ISO-date", "anchors": { "pc_boot_protocol": { "file": "...", "line": 169 }, ... } }
  7. If .roadmap-index-baseline.json ALREADY EXISTS:
     Compare old line numbers to new. For any anchor that moved >10 lines:
     Output WARNING: "DRIFT: pc_boot_protocol moved from line 169 to line 185 (+16)"
  8. Print summary: "X files scanned, Y anchors indexed, Z drift warnings"
```

**VERIFY:** Run the script. Check output matches W1-2's manually-built index.
Delete the index, run script again, confirm it regenerates identically.

---

### W1-4: Update Recovery Card to use section index
**Model: Sonnet**
**Effort:** ~5 minutes
**Depends on:** W1-2 (index must exist)

**EDIT:** PRISM_RECOVERY_CARD.md

**ADD** between STEP 1 (position) and STEP 2 (phase doc):
```
STEP 1.5: LOAD SECTION INDEX (recommended — saves tokens)
  Read ROADMAP_SECTION_INDEX.md (~200 lines, ~1.5K tokens)
  This lets you load ONLY the sections you need from any file.
  Example: Need stuck protocol? → find pc_stuck_protocol → line ~1608 → load 30 lines.
  Example: Need R1-MS5 detail? → find r1_ms5_tool_schema → line ~253 → load that section.
  IF section index is missing: Fall back to loading full phase doc (works but uses more tokens).
```

**ALSO UPDATE** the Recovery Card header to reference the index:
```
# After this file, optionally load ROADMAP_SECTION_INDEX.md for precision navigation.
```

**VERIFY:** Read Recovery Card back. Confirm STEP 1.5 exists between STEP 1 and STEP 2.

---

### W1 COMPLETION CHECKLIST:
```
□ All 20+ roadmap .md files have section anchors
□ Total anchor count: 220-250 (verified via grep)
□ ROADMAP_SECTION_INDEX.md exists with all anchors listed
□ rebuild-section-index.ps1 exists and regenerates the index correctly
□ .roadmap-index-baseline.json exists with anchor positions
□ Recovery Card has STEP 1.5 referencing section index
□ No file lost content (line counts equal or greater than before)
□ 10 random spot-checks: anchor line numbers match actual positions
```


## WAVE 2: ROADMAP QA TOOLING (automated integrity checks)
**Role:** DevOps Engineer
**Model:** Sonnet (script writing + testing)
**Effort:** ~30 minutes
**Prerequisites:** W1 complete (anchors exist to validate)
**Environment:** Claude Code preferred, DC fallback
**Parallel:** Can run alongside W3 (no file conflicts)

### W2-1: Token estimate updater script (Item #12)

**PROBLEM:** MASTER_INDEX says "~12K tokens" for R1 but actual is ~9K. Stale estimates
cause over- or under-budgeting of context windows.

**CREATE:** `C:\PRISM\mcp-server\scripts\roadmap\update-token-estimates.ps1`

**SCRIPT LOGIC:**
```
1. Scan all .md files in roadmap/ (exclude archive/)
2. For each file:
   a. Count words (split on whitespace)
   b. Estimate tokens = words ÷ 0.75 (standard English ratio)
   c. Count lines
   d. Record: {filename, lines, words, est_tokens}
3. Read PRISM_MASTER_INDEX.md
4. Find the Document Manifest table
5. For each file in the table:
   a. Update the "Lines" column with actual line count
   b. Update the "Tokens (est)" column with calculated estimate
   c. If estimate changed >20% from previous: flag as WARNING
6. Write updated MASTER_INDEX back
7. Also update PRISM_RECOVERY_CARD.md phase-file mapping with current line counts
8. Print summary: "X files measured, Y estimates updated, Z significant changes"
```

**OUTPUT EXAMPLE:**
```
PRISM_PROTOCOLS_CORE.md: 2,106 lines, 14,820 words, ~19,760 tokens (was ~13K — UPDATED)
PHASE_R1_REGISTRY.md: 1,497 lines, 9,230 words, ~12,307 tokens (was ~12K — OK)
```

**VERIFY:** Run script. Check MASTER_INDEX document manifest table has updated numbers.
Compare 3 files manually (word count ÷ 0.75) to confirm script accuracy within 5%.
**DELIVERABLE:** 1 script + updated estimates in MASTER_INDEX + RECOVERY_CARD

---

### W2-2: Roadmap lint script (Item #11)

**PROBLEM:** Cross-references between files can drift. Files can shrink from bad edits.
Skip markers can point past EOF. No automated way to catch these.

**CREATE:** `C:\PRISM\mcp-server\scripts\roadmap\roadmap-lint.ps1`

**CHECKS (each produces PASS/WARN/FAIL):**
```
CHECK 1 — FILE EXISTENCE:
  Read MASTER_INDEX Document Manifest table.
  For each file listed: verify it exists on disk.
  FAIL if any listed file is missing.

CHECK 2 — LOADER:SKIP VALIDITY:
  Find all <!-- LOADER: SKIP TO LINE [N] --> markers.
  For each: verify line N exists (not beyond EOF).
  FAIL if any skip marker points beyond file length.

CHECK 3 — ANCHOR COVERAGE:
  For each .md file with anchors:
    Count anchors in file. Count entries in SECTION_INDEX for that file.
    WARN if counts don't match (index is stale — run rebuild script).

CHECK 4 — PHASE FILE MAPPING:
  Read MASTER_INDEX Phase Registry table.
  For each phase: verify matching PHASE_[X].md file exists.
  FAIL if phase listed but file missing, or file exists but phase not listed.

CHECK 5 — POSITION VALIDITY:
  Read CURRENT_POSITION.md.
  Extract phase and MS references.
  Verify: phase exists in Phase Registry, MS exists in the phase doc.
  WARN if position references non-existent phase or MS.

CHECK 6 — SIZE REGRESSION:
  Read .roadmap-lint-baseline.json (created on first run).
  For each file: compare current size to baseline.
  WARN if any file shrank >10% (possible content loss).
  Update baseline with current sizes.

CHECK 7 — VERSION CONSISTENCY:
  Scan all files for version headers (e.g., "v14.3").
  WARN if any file has a lower version than the majority.

CHECK 8 — CROSS-REFERENCE RESOLUTION:
  Find all "See [FILENAME]" or "See [FILENAME] §[section]" references.
  Verify: filename exists. If section mentioned, verify anchor exists.
  WARN if reference target doesn't exist.

CHECK 9 — QUICK REFERENCE HEADERS:
  For each PHASE_*.md file (excluding P0 which is complete):
    Verify file contains "QUICK REFERENCE" section.
    FAIL if any active phase doc lacks it.

CHECK 10 — RECOVERY CARD CONSISTENCY:
  Read PRISM_RECOVERY_CARD.md phase-file mapping.
  Verify every listed file exists and line counts are within 10% of actual.
  WARN if Recovery Card references are stale.
```

**BASELINE FILE:** `C:\PRISM\mcp-server\scripts\roadmap\.roadmap-lint-baseline.json`
```json
{
  "generated": "2026-02-16T20:00:00Z",
  "files": {
    "PRISM_PROTOCOLS_CORE.md": { "lines": 2106, "bytes": 123085 },
    "PHASE_R1_REGISTRY.md": { "lines": 1497, "bytes": 75202 },
    ...
  }
}
```

**EXIT CODES:** 0 = all pass, 1 = warnings only, 2 = any failures
**VERIFY:** Run lint on current roadmap. Should produce 0 failures (we just fixed everything).
If any warnings appear, investigate and fix before proceeding.
**DELIVERABLE:** 1 script + baseline file

---

### W2-3: Roadmap regression test (Item #14)

**PROBLEM:** No single command validates "the roadmap is healthy." Currently requires
manual checking across multiple files.

**CREATE:** `C:\PRISM\mcp-server\scripts\roadmap\roadmap-regression-test.ps1`

**SCRIPT LOGIC (orchestrates the other tools):**
```
1. Run roadmap-lint.ps1 → capture output + exit code
   IF exit code = 2 (failures): STOP. Print failures. Exit 2.

2. Run rebuild-section-index.ps1 → capture drift warnings
   IF any anchor drifted >10 lines: WARN (index needs regeneration)

3. Run update-token-estimates.ps1 → capture significant changes
   IF any estimate changed >20%: WARN (MASTER_INDEX needs updating)

4. STRUCTURE CHECKS:
   a. PRISM_RECOVERY_CARD.md exists and is 100-300 lines (not empty, not bloated)
   b. ROADMAP_SECTION_INDEX.md exists and has entries for all files
   c. All scripts in scripts/roadmap/ are syntactically valid (powershell -Command "& { . script.ps1 }")
   d. CURRENT_POSITION.md exists and is non-empty

5. SUMMARY:
   PASS: "All checks passed. Roadmap is healthy. [X files, Y anchors, Z total lines]"
   WARN: "Roadmap passed with N warnings: [list]. Recommend fixing before next session."
   FAIL: "Roadmap has N failures: [list]. DO NOT proceed until fixed."
```

**WHEN TO RUN:**
- After any batch of roadmap edits (end of editing session)
- At phase gates (mandatory — gate fails if regression test fails)
- After compaction recovery if edits were made mid-session

**VERIFY:** Run it. Should produce PASS for current roadmap.
**DELIVERABLE:** 1 script (wraps lint + index check + token update + structure validation)

---

### W2 COMPLETION CHECKLIST:
```
□ update-token-estimates.ps1 exists and updates MASTER_INDEX accurately
□ roadmap-lint.ps1 exists and runs all 10 checks
□ roadmap-regression-test.ps1 exists and orchestrates all 3 scripts
□ .roadmap-lint-baseline.json exists with current file sizes
□ Running regression test on current roadmap produces PASS
□ All scripts use .ps1 files (not inline PS — per W0-1 protocol)
□ Scripts directory: C:\PRISM\mcp-server\scripts\roadmap\ (4 files total including rebuild from W1)
```


---

## WAVE 3: PRISM_DOC ENHANCEMENTS (MCP server code changes)
**Role:** Platform Engineer
**Model:** Sonnet (implementation) + Opus (schema review gate)
**Effort:** ~1 session (60-90 minutes)
**Prerequisites:** W1 complete (anchors required for read_section)
**Environment:** Claude Code (write → build → test loop), MCP fallback for verification
**Parallel:** Can run alongside W2 (different file domains — code vs scripts)

### IMPORTANT: These are MCP server code changes. Build + test after each action.

---

### W3-1: Content-addressed doc cache — `prism_doc action=hash` (Item #7)

**PROBLEM:** After compaction, Claude re-reads files that haven't changed. PROTOCOLS_CORE
is 2,106 lines (~13K tokens). If it hasn't changed, that's 13K tokens wasted on every recovery.

**WHAT TO BUILD:**
Add a new action `hash` to the document dispatcher (`src/dispatchers/docDispatcher.ts`).

**STEP-BY-STEP:**
```
1. Open src/dispatchers/docDispatcher.ts
2. Find the action switch/case block
3. Add new case:

case 'hash': {
  // Returns SHA-256 hash of file content WITHOUT loading content into response
  // This lets Claude check "has this file changed?" for ~50 tokens instead of ~13K
  const resolvedPath = resolvePath(params.name);
  const content = await fs.readFile(resolvedPath, 'utf-8');
  const hash = crypto.createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16); // 16-char short hash is sufficient for change detection
  const stat = await fs.stat(resolvedPath);
  return {
    success: true,
    name: params.name,
    hash: hash,
    lines: content.split('\n').length,
    bytes: stat.size,
    modified: stat.mtime.toISOString()
  };
}

4. Add 'hash' to the action validation list (if one exists)
5. Import crypto at top of file if not already imported:
   import crypto from 'crypto';
```

**BUILD + TEST:**
```
npm run build
  → Must succeed with 0 errors
Test: prism_doc action=hash name=PRISM_PROTOCOLS_CORE.md
  → Should return: { success: true, hash: "abc123...", lines: 2106, ... }
Test: Run hash twice on same file → hashes must match
Test: Edit file, run hash → hash must change
Test: prism_doc action=hash name=NONEXISTENT.md → should return error, not crash
```

**USAGE PATTERN (document in skill later):**
```
SESSION START:
  hash_protocols = prism_doc action=hash name=PRISM_PROTOCOLS_CORE.md
  IF hash_protocols.hash == remembered_hash → skip reload, content unchanged
  ELSE → reload, update remembered_hash

POST-COMPACTION:
  hash_current_phase = prism_doc action=hash name=PHASE_R1_REGISTRY.md
  IF hash matches pre-compaction memory → skip reload
  ELSE → reload (someone edited the file mid-session, unlikely but possible)
```

**TOKEN SAVINGS:** ~13K per avoided PROTOCOLS_CORE reload, ~9K per avoided phase doc reload.
Typical session with 1 compaction: saves ~22K tokens = room for ~15 more useful tool calls.

---

### W3-2: Diff capability — `prism_doc action=diff` (Item #8)

**PROBLEM:** After editing a file, verifying the edit requires re-reading the entire file
and comparing mentally. No way to see "what changed" cheaply.

**WHAT TO BUILD:**
Add `diff` action to document dispatcher.

**STEP-BY-STEP:**
```
1. In docDispatcher.ts, add new case:

case 'diff': {
  // Compare current file to a baseline state
  // Mode 1: diff against a known hash (from previous prism_doc action=hash)
  // Mode 2: diff against git (what changed since last commit)
  const resolvedPath = resolvePath(params.name);
  const currentContent = await fs.readFile(resolvedPath, 'utf-8');
  const currentLines = currentContent.split('\n');

  if (params.mode === 'git' || !params.baseline_content) {
    // Git diff mode: compare against last committed version
    const { execSync } = require('child_process');
    try {
      const gitDiff = execSync(
        `git diff HEAD -- "${resolvedPath}"`,
        { cwd: projectRoot, encoding: 'utf-8', timeout: 5000 }
      );
      // Parse git diff output into structured summary
      const additions = (gitDiff.match(/^\+[^+]/gm) || []).length;
      const deletions = (gitDiff.match(/^-[^-]/gm) || []).length;
      // Find which anchor sections were affected
      const changedAnchors = findChangedAnchors(gitDiff, currentContent);
      return {
        success: true,
        name: params.name,
        mode: 'git',
        additions: additions,
        deletions: deletions,
        net_change: additions - deletions,
        changed_sections: changedAnchors, // e.g., ["pc_boot_protocol", "pc_stuck_protocol"]
        summary: `${additions} lines added, ${deletions} removed, ${changedAnchors.length} sections affected`
      };
    } catch (e) {
      return { success: false, error: 'Git diff failed: ' + e.message };
    }
  }
  // Hash comparison mode: just report if changed
  const currentHash = crypto.createHash('sha256')
    .update(currentContent).digest('hex').substring(0, 16);
  return {
    success: true,
    name: params.name,
    changed: currentHash !== params.baseline_hash,
    current_hash: currentHash,
    baseline_hash: params.baseline_hash,
    current_lines: currentLines.length
  };
}

2. Add helper function findChangedAnchors():
function findChangedAnchors(diffOutput: string, currentContent: string): string[] {
  // Parse diff hunks to find line ranges, then map to nearest anchor
  const anchors = [...currentContent.matchAll(/<!-- ANCHOR: (\w+) -->/g)];
  // ... map changed line ranges to anchor sections
  return affectedAnchors;
}
```

**BUILD + TEST:**
```
npm run build → 0 errors
Test: Make a small edit to a test file, then:
  prism_doc action=diff name=test_file.md mode=git
  → Should show additions/deletions/changed sections
Test: prism_doc action=diff name=X baseline_hash=old_hash
  → Should return changed: true if file was modified
Test: prism_doc action=diff on unmodified file
  → Should return changed: false, 0 additions, 0 deletions
```

---

### W3-3: Anchor-aware partial loading — `prism_doc action=read_section` (Item #15 payoff)

**PROBLEM:** Loading a full file to read one section wastes context.
PROTOCOLS_CORE is 2,106 lines but the stuck protocol is only 30 lines.

**WHAT TO BUILD:**
Add `read_section` action that reads from one anchor to the next.

**STEP-BY-STEP:**
```
1. In docDispatcher.ts, add new case:

case 'read_section': {
  // Read content between two anchors (or anchor to EOF)
  // Usage: prism_doc action=read_section name=PRISM_PROTOCOLS_CORE.md section=pc_stuck_protocol
  const resolvedPath = resolvePath(params.name);
  const content = await fs.readFile(resolvedPath, 'utf-8');
  const lines = content.split('\n');

  const anchorPattern = `<!-- ANCHOR: ${params.section} -->`;
  const startIdx = lines.findIndex(l => l.includes(anchorPattern));

  if (startIdx === -1) {
    return { success: false, error: `Anchor '${params.section}' not found in ${params.name}` };
  }

  // Find the NEXT anchor after this one (section boundary)
  let endIdx = lines.length; // default: read to EOF
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].includes('<!-- ANCHOR:')) {
      endIdx = i;
      break;
    }
  }

  const sectionLines = lines.slice(startIdx, endIdx);
  return {
    success: true,
    name: params.name,
    section: params.section,
    start_line: startIdx + 1, // 1-indexed for human readability
    end_line: endIdx,
    line_count: sectionLines.length,
    content: sectionLines.join('\n')
  };
}

2. ALSO add read_sections (plural) for loading multiple sections at once:

case 'read_sections': {
  // Load multiple sections from one or more files in a single call
  // Usage: prism_doc action=read_sections sections=[
  //   {name: "PROTOCOLS_CORE.md", section: "pc_boot_protocol"},
  //   {name: "PROTOCOLS_CORE.md", section: "pc_stuck_protocol"},
  //   {name: "PHASE_R1_REGISTRY.md", section: "r1_ms5_tool_schema"}
  // ]
  const results = [];
  for (const req of params.sections) {
    // Reuse read_section logic for each
    const result = await readSection(req.name, req.section);
    results.push(result);
  }
  return { success: true, sections: results };
}
```

**BUILD + TEST:**
```
npm run build → 0 errors

Test 1 — Single section:
  prism_doc action=read_section name=PRISM_PROTOCOLS_CORE.md section=pc_boot_protocol
  → Returns ONLY the boot protocol section (~30-50 lines)
  → Verify: content starts with boot protocol header, ends before next section

Test 2 — Multiple sections:
  prism_doc action=read_sections sections=[
    {name: "PRISM_PROTOCOLS_CORE.md", section: "pc_stuck_protocol"},
    {name: "PRISM_PROTOCOLS_CORE.md", section: "pc_rapid_compaction"}
  ]
  → Returns both sections, each with their own start/end lines

Test 3 — Invalid anchor:
  prism_doc action=read_section name=PRISM_PROTOCOLS_CORE.md section=nonexistent_anchor
  → Returns error message, not crash

Test 4 — Last section in file:
  prism_doc action=read_section name=X section=[last-anchor-in-file]
  → Returns content from that anchor to EOF
```

**OPUS GATE:** Before merging these 3 actions:
Opus reviews: Are the response schemas consistent with existing prism_doc actions?
Are error cases handled? Could any action leak file content that shouldn't be exposed?
This takes ~5 minutes but catches schema issues before they become tech debt.

---

### W3 COMPLETION CHECKLIST:
```
□ prism_doc action=hash works — returns hash + metadata without content
□ prism_doc action=diff works — git mode + hash comparison mode
□ prism_doc action=read_section works — loads single section by anchor
□ prism_doc action=read_sections works — loads multiple sections in one call
□ npm run build passes with 0 errors after all additions
□ prism_dev action=health shows all dispatchers healthy
□ Error cases tested: missing file, missing anchor, empty file
□ Opus reviewed response schemas for consistency
□ All 4 new actions documented in dispatcher's action list
```


---

## WAVE 4: SESSION INTELLIGENCE (proactive health + auto-dump)
**Role:** Platform Engineer
**Model:** Sonnet (implementation) + Opus (threshold calibration)
**Effort:** ~1 session (60-90 minutes)
**Prerequisites:** W3 complete (hash action for efficient state saves)
**Environment:** Claude Code preferred, MCP fallback
**Parallel:** Sequential — needs W3's doc actions available

---

### W4-1: Session health tracking (Item #3)

**PROBLEM:** Claude has no concrete signal for "this session is degrading." Relies on
feel, or on compaction hitting unexpectedly. Need a counter that says "wrap up now."

**WHAT TO BUILD:**
Add SessionHealth tracking to the session dispatcher + expose via health_check.

**STEP-BY-STEP:**

**Part A — Define the interface** (in `src/types/session.ts` or equivalent):
```typescript
interface SessionHealth {
  call_count: number;          // total prism_ calls this session
  estimated_tokens_in: number; // rough: sum of request content lengths
  estimated_tokens_out: number;// rough: sum of response content lengths
  elapsed_turns: number;       // conversation turns since boot
  last_position_save: number;  // call_count at last CURRENT_POSITION write
  compaction_count: number;    // number of recovery events detected
  session_start: string;       // ISO timestamp
  health_status: 'green' | 'yellow' | 'red';
  advisory: string;            // human-readable recommendation
}
```

**Part B — Add tracking to session dispatcher** (in `src/dispatchers/sessionDispatcher.ts`):
```
1. Add a module-level sessionHealth object initialized on session_boot
2. Increment call_count on EVERY dispatcher entry (middleware pattern)
   - Option A: Add counter in the main dispatch router before routing to specific dispatcher
   - Option B: Add pre-dispatch hook that increments
   - Prefer Option A — single point of tracking, can't miss any calls
3. Estimate tokens: on each call, add request params length + response length (rough but cheap)
4. Track compaction_count: increment when session_boot detects a recovery scenario
   (gap > 30s, or explicit recovery flag)
```

**Part C — Health status calculation:**
```typescript
function calculateHealthStatus(health: SessionHealth): 'green' | 'yellow' | 'red' {
  // RED conditions (any one triggers)
  if (health.call_count > 40) return 'red';
  if (health.estimated_tokens_out > 100000) return 'red';
  if (health.compaction_count >= 3) return 'red';

  // YELLOW conditions (any one triggers)
  if (health.call_count > 25) return 'yellow';
  if (health.estimated_tokens_out > 60000) return 'yellow';
  if (health.compaction_count >= 1) return 'yellow';
  if (health.call_count - health.last_position_save > 5) return 'yellow'; // overdue save

  return 'green';
}

function getAdvisory(status: string, health: SessionHealth): string {
  switch (status) {
    case 'green': return 'Session healthy. Continue normally.';
    case 'yellow':
      if (health.call_count - health.last_position_save > 5)
        return 'OVERDUE: Position save needed. Write CURRENT_POSITION.md now.';
      if (health.compaction_count >= 1)
        return 'Compaction detected. Save state frequently. Consider wrapping up current MS.';
      return 'Session aging. Finish current step, save state, consider wrapping up.';
    case 'red':
      return 'SESSION CRITICAL. Complete current step. Write handoff. Stop taking new work.';
  }
}
```

**Part D — Expose via action:**
```
Add to session dispatcher:

case 'health_check': {
  const status = calculateHealthStatus(sessionHealth);
  sessionHealth.health_status = status;
  sessionHealth.advisory = getAdvisory(status, sessionHealth);
  return { success: true, health: sessionHealth };
}
```

**Part E — Wire into cadence system:**
```
In hookRegistration.ts, add health check to the existing cadence cycle:
- Piggyback on the existing pressure@8 cadence function
- OR add a new cadence: health@5 (check every 5 calls)
- When health returns YELLOW or RED, include advisory in the cadence response
- This means Claude gets health warnings automatically without having to remember to check
```

**OPUS GATE:** Opus calibrates the thresholds. The numbers above (40/100K/25/60K) are
estimates. Opus should review based on:
- How many calls does a typical productive session have? (~30-50)
- What token volume causes degradation? (depends on model context window)
- At what point is compaction likely? (typically 70-80% of context)
Opus may adjust thresholds up or down. Document the reasoning.

**BUILD + TEST:**
```
npm run build → 0 errors
Test: prism_session action=health_check after session_boot
  → Should return green status with call_count near 0
Test: Make 30+ calls, then health_check
  → Should return yellow
Test: Verify advisory text is helpful and specific
Test: Verify call_count actually increments (not stuck at 0)
```

---

### W4-2: Pre-compaction auto-dump hook (Item #1)

**PROBLEM:** Compaction is unpredictable. If it hits between position saves, work since
last save is lost. Need to save state BEFORE compaction hits.

**WHAT TO BUILD:**
A hook that fires when context pressure crosses a threshold, automatically saving state.

**STEP-BY-STEP:**

**Part A — Add the hook:**
```typescript
// In hookRegistration.ts
registerHook({
  name: 'pre_compaction_dump',
  trigger: 'cadence',
  cadence: 8, // check every 8 calls (same as pressure@8)
  condition: async () => {
    // Check context pressure estimate
    const pressure = await contextMonitor.getPressure();
    return pressure > 0.55; // fire at 55% — well before compaction threshold
  },
  action: async (context) => {
    const dumpResult = {
      position: await writeCurrentPosition(),
      actions: await appendActionTracker('AUTO-DUMP at pressure ' + pressure),
      snapshot: await writeCompactionSnapshot()
    };
    return {
      type: 'info',
      message: `Pre-compaction dump saved at ${Math.round(pressure * 100)}% pressure. ` +
               `Position: ${dumpResult.position}, Actions logged.`,
      blocking: false // don't interrupt Claude's work
    };
  },
  priority: 1 // high priority — run before other cadence hooks
});
```

**Part B — Implement helper functions:**
```typescript
async function writeCurrentPosition(): Promise<string> {
  // Read current position from session state
  const pos = sessionState.currentPosition;
  const content = `CURRENT: ${pos.ms} step ${pos.step} | ` +
                  `LAST_COMPLETE: ${pos.lastComplete} ${pos.lastCompleteDate} | ` +
                  `PHASE: ${pos.phase} ${pos.phaseStatus}`;
  await docDispatcher.handle({ action: 'write', name: 'CURRENT_POSITION.md', content });
  return pos.ms;
}

async function writeCompactionSnapshot(): Promise<void> {
  // Write a minimal snapshot that survives compaction
  const snapshot = {
    timestamp: new Date().toISOString(),
    position: sessionState.currentPosition,
    health: sessionHealth,
    recent_actions: sessionState.recentActions.slice(-5), // last 5 actions
    trigger: 'pre_compaction_dump'
  };
  await fs.writeFile(
    path.join(stateDir, 'COMPACTION_SURVIVAL.json'),
    JSON.stringify(snapshot, null, 2)
  );
}
```

**Part C — Update existing pressure@8 to coordinate:**
```
The existing pressure@8 cadence function already checks context pressure.
Modify it to:
1. Run pre_compaction_dump FIRST if pressure > 55%
2. THEN run the existing pressure response (context_compress at 60%+)
3. This ensures state is saved BEFORE compression runs

Order matters: save state → then compress context → safe if compaction follows
```

**BUILD + TEST:**
```
npm run build → 0 errors
Test: Set a mock pressure value to 60%
  → pre_compaction_dump should fire
  → CURRENT_POSITION.md should be updated
  → COMPACTION_SURVIVAL.json should exist in state directory
Test: Set pressure to 40%
  → hook should NOT fire (below 55% threshold)
Test: Verify COMPACTION_SURVIVAL.json contains valid JSON with position + health
```

---

### W4-3: Wire session health into Recovery Card + boot protocol

**WHAT TO DO:**
1. Update PRISM_RECOVERY_CARD.md §COMPACTION ADAPTATION:
```
After recovery, if MCP available:
  prism_session action=health_check
  IF status = RED:
    → ULTRA-MINIMAL MODE (already defined above)
    → Do NOT load section index — go straight to position + execute
    → Target: complete ONE step only, then handoff
  IF status = YELLOW:
    → REDUCED MODE
    → Load Recovery Card + section index (skip MASTER_INDEX + PROTOCOLS_CORE)
    → Skip non-essential skill loading
    → Update position every 2 calls instead of 3
  IF status = GREEN:
    → NORMAL MODE (full boot as defined)
```

2. Update PRISM_PROTOCOLS_CORE.md boot protocol to call health_check after session_boot:
```
STEP 1.5: SESSION HEALTH CHECK
  prism_session action=health_check
  Read the status and advisory.
  If YELLOW or RED: announce to user, adjust behavior per Recovery Card §COMPACTION ADAPTATION
```

**VERIFY:** Read both files. Confirm health-based mode selection is documented.
**DELIVERABLE:** 2 file edits

---

### W4 COMPLETION CHECKLIST:
```
□ SessionHealth interface defined with all fields
□ Call counter increments on every prism_ call
□ health_check action returns accurate status + advisory
□ Thresholds calibrated by Opus (documented reasoning)
□ pre_compaction_dump hook registered and fires at >55% pressure
□ CURRENT_POSITION.md auto-saved on dump
□ COMPACTION_SURVIVAL.json written on dump
□ Recovery Card updated with health-based mode selection
□ PROTOCOLS_CORE boot has STEP 1.5 health check
□ npm run build passes, prism_dev action=health passes
□ Cadence hooks coordinate: dump BEFORE compress
```


---

## WAVE 5: CONTEXT OPTIMIZATION + HIERARCHICAL CODE INDEX
**Role:** Systems Architect (analysis) → Platform Engineer (implementation)
**Model:** Opus (architecture, usage analysis, tier decisions) + Haiku (file scanning) + Sonnet (implementation)
**Effort:** ~2 sessions
**Prerequisites:** W1 (anchors), W2 (token estimates), W3 (read_section), W4 (health signal)
**Environment:** Hybrid — Opus for analysis in claude.ai, Sonnet/Haiku for implementation in Claude Code

---

### W5-1: PROTOCOLS_CORE usage analysis + tier classification
**Model: Opus** (architectural judgment — this decides what loads every session)
**Effort:** ~30 minutes

**WHAT TO DO:**
```
1. Load ROADMAP_SECTION_INDEX.md (from W1)
2. List every section in PRISM_PROTOCOLS_CORE.md with its anchor name
3. For EACH section, classify into one of four tiers:

TIER A — EVERY SESSION (must load on every boot, even ultra-minimal):
  Criteria: Claude cannot function without this. Boot fails without it. Safety depends on it.
  Expected sections:
    pc_environment_detection    — need to know what tools work
    pc_boot_context             — how to start
    pc_position_recovery        — where am I
    pc_compaction_recovery_cascade — how to recover
    pc_rapid_compaction         — when to go minimal
    pc_build_rules              — how to build safely
    pc_session_handoff          — how to end
  Estimated: ~8 sections, ~2K tokens

TIER B — PHASE-DEPENDENT (load only the sections relevant to current phase):
  Criteria: Needed for execution but only for certain types of work.
  Expected sections:
    pc_stuck_protocol           — when execution fails
    pc_build_failure_triage     — when build fails
    pc_structured_outputs       — when producing schemas
    pc_code_standards           — when writing code
    pc_rate_limit_protocol      — when doing batch operations
  Estimated: ~10 sections, ~4K tokens

TIER C — ON-DEMAND (load only when the specific situation arises):
  Criteria: Handles rare scenarios. Not needed unless the scenario occurs.
  Expected sections:
    pc_mcp_crash_recovery       — only if MCP crashes
    pc_graceful_degradation     — only if multiple failures
    pc_error_taxonomy           — only when diagnosing unknown errors
    pc_cadence_functions        — only when debugging hook timing
  Estimated: ~8 sections, ~3K tokens

TIER D — REFERENCE (never load automatically, only on explicit request):
  Criteria: Historical, detailed specifications, changelog.
  Expected sections:
    pc_version_history          — only if checking what changed
    pc_gitignore                — only if setting up new clone
    pc_orphan_cleanup           — only if temp files found
  Estimated: ~5 sections, ~2K tokens

4. Write the classification to: PROTOCOLS_CORE_TIER_MAP.md
   Format:
     | Section Anchor | Tier | Tokens (est) | When to Load |
     |---------------|------|-------------|-------------|
     | pc_boot_protocol | A | ~300 | Every session |
     | pc_stuck_protocol | B | ~200 | When stuck |
     | ... | ... | ... | ... |

5. Sum up: Tier A = ~2K tokens (was 13K for full file). 85% savings.
```

**VERIFY:** Sum of all tier estimates should approximately equal full file token estimate.
Each section should be in exactly one tier. No sections missing.
**DELIVERABLE:** PROTOCOLS_CORE_TIER_MAP.md

---

### W5-2: Create PROTOCOLS_BOOT.md (Tier A extraction)
**Model: Sonnet** (mechanical extraction)
**Effort:** ~20 minutes
**Depends on:** W5-1 (tier classification must exist)

**WHAT TO DO:**
```
1. Read PROTOCOLS_CORE_TIER_MAP.md — get list of all Tier A sections
2. For each Tier A section:
   prism_doc action=read_section name=PRISM_PROTOCOLS_CORE.md section=[anchor_name]
3. Concatenate all Tier A sections into a new file:

CREATE: C:\PRISM\mcp-server\data\docs\roadmap\PRISM_PROTOCOLS_BOOT.md

FORMAT:
  # PRISM PROTOCOLS — BOOT (Tier A)
  # Load THIS instead of full PROTOCOLS_CORE. Contains only what every session needs.
  # For phase-specific rules: use read_section on PROTOCOLS_CORE with anchor name.
  # For full reference: load PROTOCOLS_CORE (but only when you need the whole thing).
  # Token budget: ~2K (vs ~13K for full PROTOCOLS_CORE)
  # Auto-extracted from PROTOCOLS_CORE Tier A sections. Do not edit directly.
  # Regenerate with: scripts/roadmap/extract-protocols-boot.ps1

  [Tier A section content here, in order]

4. DO NOT modify PROTOCOLS_CORE itself. It stays as-is for reference and read_section access.
5. Add markers in PROTOCOLS_CORE at each Tier A section:
   <!-- TIER: A — Also in PROTOCOLS_BOOT.md -->
   This tells editors: changes here must be reflected in BOOT too (or just run regeneration script).
```

**ALSO CREATE:** `C:\PRISM\mcp-server\scripts\roadmap\extract-protocols-boot.ps1`
```
Script that:
1. Reads PROTOCOLS_CORE_TIER_MAP.md
2. Extracts all Tier A anchor names
3. For each: reads that section from PROTOCOLS_CORE
4. Writes PROTOCOLS_BOOT.md with all Tier A sections
5. Reports: "Extracted N sections, ~X tokens"
Run after any edit to a Tier A section in PROTOCOLS_CORE.
```

**VERIFY:**
```
Token count of PROTOCOLS_BOOT.md should be ~2K (±500)
All Tier A content from PROTOCOLS_CORE is present in BOOT
BOOT is self-contained — Claude can operate from BOOT alone for basic tasks
```

---

### W5-3: MASTER_INDEX slim-down (Item #9)
**Model: Sonnet**
**Effort:** ~15 minutes

**WHAT TO DO:**
```
Current MASTER_INDEX: 552 lines, ~4K tokens. Contains:
  - System overview (needed)
  - Registry counts (needed, but condensable)
  - Phase registry table (needed)
  - Document manifest (needed, but section index replaces detail)
  - Session workflow (now redundant — Recovery Card does this better)
  - Dependency resolution (phase boundaries only)
  - Detailed changelog (reference only)

CREATE: PRISM_MASTER_INDEX_SLIM.md (~150-200 lines, ~1.5K tokens)

INCLUDE:
  - System overview (10 lines, condensed)
  - Registry counts (5 lines, key numbers only)
  - Phase registry table (as-is, ~25 lines)
  - Document manifest (filename + token estimate only, no descriptions — use section index)
  - Session workflow: "See PRISM_RECOVERY_CARD.md" (1 line reference)

EXCLUDE (stays in full MASTER_INDEX for reference):
  - Detailed dependency resolution
  - Changelog
  - Extended session workflow steps
  - Quality tier definitions
  - File descriptions in manifest

UPDATE RECOVERY CARD:
  Step 1: "Read PRISM_RECOVERY_CARD.md" (already exists)
  Step 1.5: "Read ROADMAP_SECTION_INDEX.md" (from W1)
  New: "Read PRISM_MASTER_INDEX_SLIM.md for system state and phase overview"
  Old instruction to load full MASTER_INDEX → change to "load SLIM version"
```

**VERIFY:** SLIM is under 200 lines. Contains all info needed for normal session operation.
Full MASTER_INDEX remains untouched for phase gates and deep reference.

---

### W5-4: Hierarchical Code Index — Branch 1 (Item #16)
**Model: Haiku** (bulk extraction) + **Sonnet** (schema design + script)
**Effort:** ~45 minutes

**WHAT IS THIS:**
An auto-generated index of the MCP server's code structure: every dispatcher, every action,
every engine, every registry call — and how they connect.

**STEP-BY-STEP:**

**Part A — Sonnet designs the schema:**
```json
{
  "version": "1.0",
  "generated": "ISO-date",
  "dispatchers": {
    "prism_calc": {
      "file": "src/dispatchers/calcDispatcher.ts",
      "actions": {
        "speed_feed": {
          "params": ["material", "tool", "operation", "machine"],
          "engines": ["SpeedFeedEngine", "SafetyEngine"],
          "registries": ["materials", "tools", "machines"],
          "formulas": ["chip_thinning", "effective_cutting_speed", "max_rpm"],
          "returns": "SpeedFeedResult",
          "safety_critical": true
        },
        "cutting_force": {
          "params": ["material", "tool", "cutting_params"],
          "engines": ["KienzleForceEngine"],
          "registries": ["materials"],
          "formulas": ["kienzle_specific_force", "tangential_force"],
          "returns": "ForceResult",
          "safety_critical": true
        }
      }
    }
  },
  "engines": {
    "SpeedFeedEngine": {
      "file": "src/engines/speedFeedEngine.ts",
      "formulas_used": ["chip_thinning", "effective_cutting_speed"],
      "registries_read": ["materials.machinability", "tools.geometry"],
      "called_by": ["prism_calc.speed_feed"]
    }
  },
  "registries": {
    "materials": {
      "file": "src/registries/materialRegistry.ts",
      "record_count": 3518,
      "key_fields": ["iso_group", "family", "grade"],
      "used_by_engines": ["SpeedFeedEngine", "KienzleForceEngine", "TaylorToolLifeEngine"]
    }
  }
}
```

**Part B — Haiku builds the extraction script:**
```
CREATE: C:\PRISM\mcp-server\scripts\build-code-index.ps1

LOGIC:
1. Scan src/dispatchers/*.ts
   For each file:
   a. Find all case 'action_name': blocks
   b. Extract parameter names from params destructuring
   c. Find all new XxxEngine() instantiations → list engines
   d. Find all registry.get/search/load calls → list registries
   e. Find all formula references → list formulas

2. Scan src/engines/*.ts
   For each file:
   a. Extract class name
   b. Find formula function calls
   c. Find registry data access patterns

3. Scan src/registries/*.ts
   For each file:
   a. Extract registry name
   b. Count records (or find count method)
   c. Find exported methods (get, search, load, etc.)

4. Cross-reference: For each engine, which dispatchers call it?
   For each registry, which engines read it?

5. Write CODEBASE_INDEX.json to C:\PRISM\mcp-server\data\
6. Write CODEBASE_INDEX_READABLE.md (human-readable tree format)

NOTE: This is STATIC analysis — parsing TypeScript source text, not executing it.
It will miss dynamic dispatch and runtime-only connections. That's OK for now.
Tier 2 (runtime instrumentation, deferred) will catch those.
```

**Part C — Sonnet creates readable summary:**
```
CREATE: C:\PRISM\mcp-server\data\docs\roadmap\CODEBASE_INDEX_READABLE.md

FORMAT:
  # PRISM Codebase Index
  # Auto-generated. Regenerate: scripts/build-code-index.ps1
  # Shows: dispatcher → action → engine → formula → registry chains

  ## prism_calc (5 actions, safety-critical)
    speed_feed → SpeedFeedEngine → [chip_thinning, effective_speed] → materials, tools
    cutting_force → KienzleForceEngine → [kienzle_kc1_1] → materials
    tool_life → TaylorToolLifeEngine → [taylor_vt_n] → materials, tools
    ...

  ## prism_data (8 actions, read-only)
    material_get → MaterialRegistry.get() → materials
    material_search → MaterialRegistry.search() → materials
    ...

  [... all 31 dispatchers ...]
```

**INTEGRATION:** Add to Recovery Card's STEP 1.5:
```
IF debugging a dispatcher chain or understanding dependencies:
  Read CODEBASE_INDEX_READABLE.md — shows the full dispatch → engine → formula → registry tree
```

**VERIFY:**
```
Run script → CODEBASE_INDEX.json created
Spot-check 5 dispatchers: do extracted actions match actual code?
Cross-reference: does every engine listed appear in at least one dispatcher?
Does every registry appear in at least one engine?
```

---

### W5-5: Hierarchical Data Index — Branch 2 (Item #17)
**Model: Haiku** (bulk scanning) + **Sonnet** (taxonomy design)
**Effort:** ~30 minutes

**WHAT IS THIS:**
A taxonomy of PRISM's data: materials by ISO group, tools by category, machines by
manufacturer, alarms by controller family. Already implicit in directory structure — making it explicit and queryable.

**STEP-BY-STEP:**

**Part A — Haiku scans registry directories:**
```
Scan each registry directory and build taxonomy:

C:\PRISM\mcp-server\data\materials\
  → Group by ISO group (P, M, K, N, S, H, O) from file content
  → Within each group: list families (carbon_steel, alloy_steel, etc.)
  → Within each family: list grades (AISI-1045, AISI-4140, etc.)
  → Record count per group, per family

C:\PRISM\mcp-server\data\tools\
  → Group by category (milling, turning, drilling, threading, etc.)
  → Within each: list types (face_mill, end_mill, ball_nose, etc.)
  → Record count per category, per type

C:\PRISM\mcp-server\data\machines\
  → Group by manufacturer (Okuma, DMG Mori, Haas, etc.)
  → Within each: list models
  → Record count per manufacturer

C:\PRISM\mcp-server\data\alarms\
  → Group by controller family (Fanuc, Siemens, Okuma, etc.)
  → Within each: list alarm ranges
  → Record count per family
```

**Part B — Sonnet writes taxonomy file:**
```
CREATE: C:\PRISM\mcp-server\data\docs\roadmap\DATA_TAXONOMY.md

FORMAT:
  # PRISM Data Taxonomy
  # Auto-generated from registry directories
  # Shows: what data PRISM has, how it's organized, how much of each

  ## Materials (3,518 records)
  | ISO Group | Name | Families | Records | Key Properties |
  |-----------|------|----------|---------|---------------|
  | P | Steel | 8 (carbon, alloy, tool, ...) | 1,240 | kc1.1, mc, tensile, hardness |
  | M | Stainless | 4 (austenitic, martensitic, ...) | 520 | corrosion_resist, work_hardening |
  | S | Superalloys | 3 (nickel, cobalt, titanium) | 380 | thermal_resist, strain_rate_sensitivity |
  | ... | ... | ... | ... | ... |

  ## Tools (5,238 records)
  | Category | Types | Records | Key Properties |
  |----------|-------|---------|---------------|
  | Milling | face, end, ball, trochoidal | 2,100 | diameter, flutes, helix_angle, grade |
  | Turning | external, boring, grooving, threading | 1,800 | insert_shape, nose_radius, grade |
  | ... | ... | ... | ... |

  [... machines, alarms, formulas ...]
```

**Part C — Create regeneration script:**
```
CREATE: C:\PRISM\mcp-server\scripts\build-data-taxonomy.ps1
  Scans registry directories, counts files, extracts taxonomy, writes DATA_TAXONOMY.md
  Run after any registry data changes (R1 phases especially).
```

**VERIFY:** Record counts match known database sizes (3,518 materials, 5,238+ tools, etc.)

---

### W5-6: Skill phase-loading system (Item #4)
**Model: Opus** (phase-skill mapping design) → **Sonnet** (implementation) → **Haiku** (validation)
**Effort:** ~30 minutes

**WHAT TO DO:**

**Part A — Opus designs the mapping:**
```
Based on what each phase needs, create SKILL_PHASE_MAP.json:

{
  "DA": {
    "skills": ["session-management", "context-engineering", "parallel-execution", "build-pipeline"],
    "hooks": ["position_save", "health_check", "compaction_dump"],
    "description": "Development acceleration — focus on tooling and workflow"
  },
  "R1": {
    "skills": ["material-science", "formula-registry", "data-loading", "tool-schema", "file-processing"],
    "hooks": ["data_validation", "registry_integrity", "position_save"],
    "description": "Registry and data foundation — heavy file I/O and schema work"
  },
  "R2": {
    "skills": ["speed-feed-calc", "kienzle-force", "taylor-tool-life", "thread-calcs", "safety-validation"],
    "hooks": ["safety_check", "formula_validation", "uncertainty_propagation"],
    "description": "Safety-critical calculations — every result needs S(x) >= 0.70"
  },
  "R3": {
    "skills": ["data-campaigns", "quality-validation", "pfp-engine", "batch-processing"],
    "hooks": ["campaign_progress", "quality_gate", "rate_limit"],
    "description": "Intelligence campaigns — batch operations with quality tracking"
  },
  ... (R4-R11)
}
```

**Part B — Sonnet implements auto-loading in session_boot:**
```typescript
// In session dispatcher, after position recovery:
const currentPhase = position.phase; // e.g., "R1"
const phaseConfig = SKILL_PHASE_MAP[currentPhase];

if (phaseConfig) {
  // Load only skills relevant to current phase
  for (const skillName of phaseConfig.skills) {
    await skillLoader.load(skillName);
  }
  // Enable only relevant hooks
  for (const hookName of phaseConfig.hooks) {
    await hookManager.enable(hookName);
  }
  console.log(`Loaded ${phaseConfig.skills.length} skills, ${phaseConfig.hooks.length} hooks for phase ${currentPhase}`);
} else {
  // Unknown phase — load core skills only
  await skillLoader.loadCore();
}
```

**Part C — Haiku validates:**
```
For each phase in SKILL_PHASE_MAP:
  1. Set position to that phase
  2. Run session_boot
  3. Verify: correct skills loaded, irrelevant skills NOT loaded
  4. Run 3 representative operations from that phase
  5. Verify: no "skill not found" or "hook not registered" errors
```

**VERIFY:** Skills loaded per phase < 10 (vs all 126). No errors from missing skills.
**DELIVERABLE:** SKILL_PHASE_MAP.json + updated session_boot + validation results

---

### W5 COMPLETION CHECKLIST:
```
□ PROTOCOLS_CORE_TIER_MAP.md exists with all sections classified A/B/C/D
□ PROTOCOLS_BOOT.md exists with Tier A sections only (~2K tokens)
□ extract-protocols-boot.ps1 regenerates BOOT correctly
□ PRISM_MASTER_INDEX_SLIM.md exists (~150-200 lines, ~1.5K tokens)
□ CODEBASE_INDEX.json exists with all dispatcher→engine→registry chains
□ CODEBASE_INDEX_READABLE.md exists in human-readable format
□ build-code-index.ps1 regenerates code index correctly
□ DATA_TAXONOMY.md exists with material/tool/machine/alarm breakdown
□ build-data-taxonomy.ps1 regenerates taxonomy correctly
□ SKILL_PHASE_MAP.json exists with phase-to-skill mapping
□ Session boot loads only phase-relevant skills
□ Haiku validated all phase skill mappings
□ npm run build passes
□ Recovery Card updated to reference SLIM index + BOOT protocols
□ Token budget: normal session loads ≤6K tokens of roadmap docs (BOOT + SLIM + sections)
```


---

## WAVE 6: SESSION KNOWLEDGE SYSTEM + RELATIONSHIP GRAPH
**Role:** Knowledge Architect (design) → Platform Engineer (implementation)
**Model:** Opus (schema design, relationship modeling, promotion rules) + Sonnet (implementation) + Haiku (data scanning)
**Effort:** ~2-3 sessions
**Prerequisites:** W5 complete (code index + data taxonomy provide the skeleton; read_section enables cheap queries)
**Environment:** Hybrid — Opus for design in claude.ai, Sonnet for implementation in Claude Code
**NOTE:** This is the most architecturally complex wave. Schema design (W6-1) can start
during W3-W4 as Opus-only work. Implementation (W6-2 through W6-7) needs W5 infrastructure.

---

### W6-1: Design session knowledge schema
**Model: Opus** (schema decisions affect every future session)
**Effort:** ~30 minutes
**CAN START EARLY: During W3/W4, while Sonnet builds infrastructure**

**WHAT TO DESIGN:**

**Knowledge Node Schema:**
```typescript
interface KnowledgeNode {
  // Identity
  id: string;                    // auto-generated: type_phase_ms_timestamp
  type: KnowledgeType;
  created: string;               // ISO timestamp
  session_id: string;            // which session created this

  // Context — WHERE this knowledge applies
  phase: string;                 // "R1", "R2", "DA", etc.
  milestone: string;             // "MS5", "MS6", etc. (optional if phase-wide)
  section_anchors: string[];     // which anchors this relates to (links to W1 index)
  tags: string[];                // free-form tags for search: ["tool_registry", "schema", "TypeScript"]

  // Content — WHAT was learned
  summary: string;               // 1-2 sentences, enough to decide if you need the detail
  detail: string;                // full explanation, code snippets, examples
  confidence: 'verified' | 'observed' | 'hypothesized';

  // Relationships — HOW this connects to other knowledge
  related_nodes: string[];       // IDs of related knowledge nodes
  supersedes: string | null;     // ID of older node this replaces (prevents stale knowledge)
  promoted_to: string | null;    // if this became a permanent index entry, where?

  // Lifecycle
  status: 'active' | 'superseded' | 'promoted' | 'archived';
  access_count: number;          // how many times this was loaded in a session
  last_accessed: string;         // for relevance decay
}

type KnowledgeType =
  | 'decision'         // architectural/design choice — respect in future sessions
  | 'error_fix'        // bug found + solution — never debug this again
  | 'assumption'       // something validated or invalidated — prevent repeating
  | 'performance'      // timing/resource observation — don't re-benchmark
  | 'blocker'          // what's blocked and why — pick up where left off
  | 'relationship'     // cross-registry connection discovered — feeds Branch 3
  | 'pattern'          // recurring code/data pattern — use as template
  | 'constraint'       // safety/system limit discovered — hard boundary
  | 'workaround'       // temporary fix with TODO — track for proper fix later
  ;
```

**Knowledge Index Schema (lightweight, loaded on every boot):**
```typescript
interface KnowledgeIndex {
  version: string;
  last_updated: string;
  total_nodes: number;
  nodes_by_phase: Record<string, number>;    // {"R1": 45, "DA": 12, ...}
  nodes_by_type: Record<string, number>;     // {"decision": 20, "error_fix": 15, ...}

  // Quick lookup: phase+ms → list of node summaries (enough to decide what to load)
  phase_index: Record<string, Record<string, KnowledgeNodeSummary[]>>;
  // Example: phase_index["R1"]["MS5"] = [
  //   { id: "dec_r1_ms5_001", type: "decision", summary: "Composite key for ToolIndex uses [category, diameter, material_class]" },
  //   { id: "err_r1_ms5_002", type: "error_fix", summary: "MaterialRegistry returns null for ISO designations with spaces" },
  // ]

  // Cross-phase knowledge (not tied to a specific MS)
  global_entries: KnowledgeNodeSummary[];
}

interface KnowledgeNodeSummary {
  id: string;
  type: KnowledgeType;
  summary: string;
  confidence: string;
  tags: string[];
}
```

**VERIFY:** Walk through 5 realistic scenarios — does the schema capture everything?
1. "Decided to use composite key for ToolIndex" → decision node with detail
2. "trim() needed before MaterialRegistry lookup" → error_fix node
3. "Inconel 718 needs both kc1.1 AND thermal conductivity" → relationship node
4. "Loading 3,518 files takes 4.2s, batched=2.8s" → performance node
5. "R1-MS5 step 7 blocked by schema limitation" → blocker node with detail

---

### W6-2: Implement knowledge storage engine
**Model: Sonnet** (implementation)
**Effort:** ~30 minutes

**WHAT TO BUILD:**
A simple file-based storage for knowledge nodes. NOT a database — flat files are more
resilient, easier to inspect, and work with both MCP and DC modes.

**DIRECTORY STRUCTURE:**
```
C:\PRISM\knowledge\
├── index\
│   └── SESSION_KNOWLEDGE_INDEX.json     ← loaded on every boot (~small)
├── nodes\
│   ├── R1\
│   │   ├── MS5\
│   │   │   ├── dec_r1_ms5_001.json      ← individual knowledge nodes
│   │   │   ├── err_r1_ms5_002.json
│   │   │   └── rel_r1_ms5_003.json
│   │   ├── MS6\
│   │   └── ...
│   ├── DA\
│   ├── R2\
│   └── _global\                          ← cross-phase knowledge
│       ├── con_global_001.json           ← e.g., "never use standalone tsc"
│       └── wrk_global_002.json           ← e.g., "DC strips $ from PS"
├── promoted\                              ← nodes that became permanent entries
│   └── [copies of promoted nodes]
└── archive\                               ← superseded/stale nodes
    └── [old nodes moved here]
```

**IMPLEMENT IN MCP SERVER:**
Add actions to prism_memory dispatcher (or create new prism_knowledge if cleaner):

```typescript
// Action: knowledge_store — save a new knowledge node
case 'knowledge_store': {
  const node: KnowledgeNode = {
    id: generateId(params.type, params.phase, params.milestone),
    type: params.type,
    created: new Date().toISOString(),
    session_id: currentSessionId,
    phase: params.phase,
    milestone: params.milestone || '',
    section_anchors: params.section_anchors || [],
    tags: params.tags || [],
    summary: params.summary,
    detail: params.detail,
    confidence: params.confidence || 'observed',
    related_nodes: params.related_nodes || [],
    supersedes: params.supersedes || null,
    promoted_to: null,
    status: 'active',
    access_count: 0,
    last_accessed: new Date().toISOString()
  };

  // Write node file
  const dir = path.join(knowledgeDir, 'nodes', params.phase, params.milestone || '_phase');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${node.id}.json`), JSON.stringify(node, null, 2));

  // Update index
  await updateKnowledgeIndex(node);

  return { success: true, id: node.id, summary: node.summary };
}

// Action: knowledge_query — find relevant knowledge for current context
case 'knowledge_query': {
  const index = await loadKnowledgeIndex();

  // Filter by phase+MS if specified
  let results: KnowledgeNodeSummary[] = [];
  if (params.phase && params.milestone) {
    results = index.phase_index[params.phase]?.[params.milestone] || [];
  } else if (params.phase) {
    // All entries for a phase
    const phaseEntries = index.phase_index[params.phase] || {};
    results = Object.values(phaseEntries).flat();
  }

  // Also add global entries that match tags
  if (params.tags) {
    const globalMatches = index.global_entries.filter(e =>
      e.tags.some(t => params.tags.includes(t))
    );
    results = [...results, ...globalMatches];
  }

  // Filter by type if specified
  if (params.type) {
    results = results.filter(r => r.type === params.type);
  }

  return { success: true, count: results.length, entries: results };
}

// Action: knowledge_get — load full detail for a specific node
case 'knowledge_get': {
  const nodePath = findNodeFile(params.id);
  const node = JSON.parse(await fs.readFile(nodePath, 'utf-8'));
  node.access_count++;
  node.last_accessed = new Date().toISOString();
  await fs.writeFile(nodePath, JSON.stringify(node, null, 2));
  return { success: true, node: node };
}

// Action: knowledge_supersede — mark old node as replaced by new one
case 'knowledge_supersede': {
  const oldNode = await loadNode(params.old_id);
  oldNode.status = 'superseded';
  oldNode.supersedes = null; // it was superseded, not superseding
  await saveNode(oldNode);
  // Move to archive
  await moveToArchive(oldNode);
  return { success: true, archived: params.old_id };
}
```

**BUILD + TEST:**
```
npm run build → 0 errors
Test: knowledge_store → create a test node → verify file created on disk
Test: knowledge_query → query by phase+MS → should find the test node
Test: knowledge_get → load full detail → should increment access_count
Test: knowledge_supersede → mark old node → should move to archive
Test: knowledge_query with tags → should filter correctly
```

---

### W6-3: Session knowledge extraction protocol
**Model: Opus** (designs extraction rules) + **Sonnet** (implements)
**Effort:** ~30 minutes

**PROBLEM:** Knowledge extraction needs to happen at session end, but ALSO after significant
discoveries mid-session. Can't wait until handoff — compaction might hit first.

**EXTRACTION TRIGGERS:**
```
1. EXPLICIT: Claude decides "I just learned something important" → store immediately
   Examples:
   - Found a bug and fixed it → error_fix node
   - Made an architectural decision → decision node
   - Discovered a cross-registry relationship → relationship node

2. PERIODIC: At every position save (every 3 calls), review recent actions:
   "Did I learn anything in the last 3 calls that should be persisted?"
   If yes → store. If no → skip. Takes ~30 seconds of reasoning.

3. SESSION END: Before writing SESSION_HANDOFF.md, do a final extraction:
   Review the session's ACTION_TRACKER entries.
   For each significant action, ask: "Is this a reusable insight?"
   Store all yes answers as knowledge nodes.
```

**EXTRACTION RULES (what to capture vs skip):**
```
ALWAYS CAPTURE:
  - Bug fixes (always → error_fix)
  - Architectural decisions (always → decision)
  - Safety-critical discoveries (always → constraint)
  - Cross-registry relationships (always → relationship)
  - Workarounds with TODOs (always → workaround)

CAPTURE IF SIGNIFICANT:
  - Performance measurements (if >2x difference from expected → performance)
  - Assumptions tested (if assumption was wrong → assumption)
  - Patterns discovered (if used 3+ times → pattern)

NEVER CAPTURE:
  - Routine operations (reading a file, running a build)
  - Transient errors (typos, syntax fixes)
  - Conversation meta-data (greetings, clarifications)
  - Already-known facts (things in existing docs/protocols)
```

**PROTOCOL ADDITION TO PRISM_PROTOCOLS_CORE.md:**
```
SESSION KNOWLEDGE EXTRACTION PROTOCOL (v14.3):

AT EVERY POSITION SAVE (cadence: every 3 calls):
  Quick check: "Did I learn anything new in the last 3 calls?"
  IF yes:
    prism_memory action=knowledge_store
      type=[decision|error_fix|relationship|...]
      phase=[current phase]
      milestone=[current MS]
      summary="1-2 sentence description"
      detail="full explanation with code/examples"
      tags=["relevant", "search", "terms"]
  IF no: continue without storing.

AT SESSION END (before handoff):
  1. Read ACTION_TRACKER entries from this session
  2. For each significant entry: create knowledge node if not already stored
  3. Run: prism_memory action=knowledge_query phase=[current] → verify nodes saved
  4. Write SESSION_HANDOFF.md (existing protocol)
  5. Include in handoff: "Knowledge nodes created this session: N"

AT SESSION START (after position recovery):
  1. prism_memory action=knowledge_query phase=[current] milestone=[current MS]
  2. Review returned summaries (typically 0-10 entries, ~200 tokens)
  3. For any entry relevant to current work: load full detail with knowledge_get
  4. This replaces "rediscovery" — past sessions' insights are immediately available
```

---

### W6-4: Relationship Graph — Branch 3 (Item #18)
**Model: Opus** (relationship modeling is judgment-heavy)
**Effort:** ~45 minutes
**Depends on:** W5-4 (code index) + W5-5 (data taxonomy) + W6-2 (knowledge storage)

**WHAT IS THIS:**
The cross-registry intelligence layer. Connects materials to compatible tools, applicable
formulas, machine requirements, and safety constraints. This is what makes PRISM
"intelligent" rather than just a "database with a search function."

**HOW IT'S BUILT:**
The relationship graph isn't built all at once. It's assembled over time as relationships
are discovered during R1-R8 phases. Each phase contributes specific types of edges:

```
PHASE → RELATIONSHIP CONTRIBUTIONS:

R1 (Registry): Data exists but relationships are implicit
  → Material→ISO_Group edges (from registry structure)
  → Tool→Category edges (from registry structure)
  → Machine→Manufacturer edges (from registry structure)
  → These are STRUCTURAL relationships — they exist in the data already

R2 (Safety): Formula validation discovers parameter requirements
  → Material→Formula edges: "Inconel 718 uses kienzle(kc1.1=2800, mc=0.25)"
  → Tool→Formula edges: "face_mill uses chip_thinning(ae/Dc)"
  → Material→Constraint edges: "Inconel 718 max temp = 650°C"
  → These are COMPUTATIONAL relationships — discovered during validation

R3 (Campaigns): Cross-registry intelligence campaigns
  → Material→Tool edges: "Inconel 718 compatible with carbide C6+, ceramic SiAlON"
  → Material→Strategy edges: "superalloys → trochoidal milling, light radial"
  → These are EXPERIENTIAL relationships — built from manufacturing knowledge

R7 (Intelligence): Coupled physics discovers constraint interactions
  → Multi-way edges: "material X + tool Y + speed Z → thermal softening risk"
  → Constraint chains: "if DOC > 3mm AND material hardness > 40HRC → force limit applies"
  → These are PHYSICAL relationships — discovered by coupled simulation
```

**GRAPH STORAGE (simple, file-based):**
```
C:\PRISM\knowledge\graph\
├── RELATIONSHIP_GRAPH_INDEX.json     ← lightweight index loaded on boot
├── edges\
│   ├── material_formula\             ← edges grouped by type
│   │   ├── inconel718_kienzle.json
│   │   ├── aisi1045_kienzle.json
│   │   └── ...
│   ├── material_tool\
│   │   ├── inconel718_compatible_tools.json
│   │   └── ...
│   ├── material_constraint\
│   ├── tool_formula\
│   ├── material_strategy\
│   └── constraint_chain\
└── nodes\                             ← extended property records
    ├── materials\                     ← enriched versions of registry records
    └── tools\                         ← with relationship pointers added
```

**Edge Schema:**
```typescript
interface RelationshipEdge {
  id: string;
  type: 'material_formula' | 'material_tool' | 'material_constraint' |
        'tool_formula' | 'material_strategy' | 'constraint_chain';
  source: { registry: string; id: string; name: string; };
  target: { registry: string; id: string; name: string; };
  properties: Record<string, any>;  // type-specific: coefficients, limits, conditions
  confidence: 'verified' | 'derived' | 'estimated';
  source_phase: string;              // which phase discovered this
  created: string;
  last_validated: string;
}
```

**MCP ACTIONS (add to prism_knowledge or prism_data):**
```
knowledge_graph_add_edge    → add a new relationship
knowledge_graph_query       → "given material X, what tools/formulas/constraints apply?"
knowledge_graph_traverse    → "trace all connections from entity X, N levels deep"
knowledge_graph_validate    → "are all edges still consistent with registry data?"
```

**IMPORTANT: This is NOT built all at once.**
W6-4 creates the SCHEMA and STORAGE. The edges are populated during R1-R8 as a
byproduct of each phase's work. The session knowledge extraction (W6-3) automatically
creates relationship nodes when cross-registry connections are discovered.

---

### W6-5: Knowledge query integration into boot protocol
**Model: Sonnet**
**Effort:** ~15 minutes

**UPDATE PRISM_RECOVERY_CARD.md:**
```
Add new STEP 1.7 between section index and phase doc loading:

STEP 1.7: QUERY SESSION KNOWLEDGE (if knowledge system available)
  MCP: prism_memory action=knowledge_query phase=[current] milestone=[current MS]
  DC:  Read C:\PRISM\knowledge\index\SESSION_KNOWLEDGE_INDEX.json
       Filter entries matching current phase + MS

  IF entries found (typically 0-10, ~200 tokens):
    Review summaries. For entries relevant to current work:
    MCP: prism_memory action=knowledge_get id=[entry_id]
    DC:  Read the corresponding .json file from knowledge\nodes\

  IF no entries found: Continue normally. This is expected for new phases/milestones.

  WHAT THIS GIVES YOU:
    - Decisions made in prior sessions → respect them, don't re-decide
    - Bugs fixed before → don't re-debug
    - Workarounds in place → know what's temporary
    - Relationships discovered → use them in current work
    - Blockers noted → pick up resolution where it left off
```

**UPDATE PRISM_PROTOCOLS_CORE.md boot sequence:**
```
After STEP 1.5 (section index), add:

STEP 1.7: SESSION KNOWLEDGE QUERY
  Query knowledge index for entries matching current phase + MS.
  Load relevant entries. This prevents re-learning what prior sessions discovered.
  Cost: ~200-500 tokens. Saves: potentially 10-20 calls of rediscovery.
  IF knowledge system not available (MCP down, files missing): skip gracefully.
```

---

### W6-6: Cross-phase knowledge promotion protocol
**Model: Opus** (decides what's permanent)
**Effort:** ~20 minutes

**PROBLEM:** Knowledge nodes accumulate. Some are temporary ("workaround until MS6 fixes schema").
Some are permanent ("Inconel 718 always needs kc1.1 AND thermal conductivity"). Need a
promotion path from session knowledge to permanent system knowledge.

**PROMOTION RULES:**
```
AUTOMATIC PROMOTION (no human review needed):
  - error_fix nodes accessed 3+ times across different sessions → permanent
    Action: Add to codebase as a test case or code comment
  - decision nodes referenced in 2+ phases → permanent
    Action: Add to PROTOCOLS_CORE or SYSTEM_CONTRACT
  - constraint nodes with confidence=verified → permanent
    Action: Add to safety validation rules

SEMI-AUTOMATIC PROMOTION (review at phase gate):
  - relationship nodes with confidence=verified → promote to Branch 3 graph
    Action: Create formal edge in relationship graph
  - pattern nodes used 3+ times → promote to skill or template
    Action: Create new skill file or code template
  - performance nodes → promote if still accurate after re-measurement
    Action: Add to operational docs

ARCHIVAL (nodes that expire):
  - blocker nodes after the blocker is resolved → archive
  - workaround nodes after the proper fix is implemented → archive
  - assumption nodes after the assumption is formally validated → archive (truth is now in code)
  - Any node not accessed in 10+ sessions → candidate for archival

PROMOTION HAPPENS AT PHASE GATES:
  At each phase gate, before checking quality metrics:
  1. Query all knowledge nodes for the completing phase
  2. For each node: evaluate against promotion rules
  3. Promote eligible nodes. Archive expired nodes.
  4. Report: "Promoted X nodes, archived Y, Z remaining active"
```

**ADD TO PROTOCOLS_CORE:**
Phase gate checklist addition:
```
PHASE GATE CHECKLIST — KNOWLEDGE REVIEW:
  □ Query all knowledge nodes for this phase
  □ Evaluate each against promotion rules
  □ Promote eligible → permanent system knowledge
  □ Archive expired → knowledge/archive/
  □ Update SESSION_KNOWLEDGE_INDEX.json
  □ Report node counts in gate documentation
```

---

### W6-7: Embed knowledge contribution in all phase docs
**Model: Sonnet** (mechanical — add section to each phase doc)
**Effort:** ~20 minutes

**WHAT TO DO:**
Add a "Knowledge Contribution" section to EVERY phase doc (DA, R1-R11).
This tells each phase explicitly what knowledge it's expected to produce.

**TEMPLATE (add near the end of each phase doc, before the phase gate section):**
```
## KNOWLEDGE CONTRIBUTIONS (this phase → knowledge system)

This phase is expected to produce knowledge nodes of these types:

| Type | Expected Entries | Example |
|------|-----------------|---------|
| [type] | [estimate] | [concrete example] |

### Branch 3 Relationships Discovered This Phase:
[List specific cross-registry relationships this phase is positioned to discover]

### Knowledge Extraction Checkpoints:
- After [MS-X]: Extract [what]
- After [MS-Y]: Extract [what]
- At phase gate: Promote verified relationships to Branch 3 graph
```

**PHASE-SPECIFIC CONTENT:**

**DA (Development Acceleration):**
```
| decision | ~10 | "Section anchors use prefix_name convention" |
| pattern | ~5 | "PS script file pattern for DC commands" |
| error_fix | ~5 | "DC $ stripping workaround" |
| performance | ~3 | "Token estimates per doc file" |
```

**R1 (Registry):**
```
| relationship | ~20 | "ISO group P covers 8 material families with [list]" |
| error_fix | ~10 | "Material files with spaces in ISO need trim()" |
| decision | ~8 | "Composite key for ToolIndex: [category, diameter, material_class]" |
| assumption | ~5 | "Not all tool files have geometry field (1,247 missing)" |
Branch 3: material→ISO_group, tool→category, machine→manufacturer structural edges
```

**R2 (Safety):**
```
| relationship | ~30 | "Inconel 718 kienzle: kc1.1=2800, mc=0.25" |
| constraint | ~15 | "Max surface speed for Ti-6Al-4V: 60 m/min with carbide" |
| error_fix | ~5 | "Kienzle formula fails for mc > 0.4 — needs clamping" |
| decision | ~5 | "Uncertainty propagation uses Monte Carlo, not linear" |
Branch 3: material→formula, tool→formula, material→constraint edges (BULK production)
```

**R3 (Campaigns):**
```
| relationship | ~40 | "Inconel 718 compatible with: carbide C6+, ceramic SiAlON, CBN" |
| pattern | ~10 | "Batch validation pattern for cross-registry campaigns" |
| performance | ~5 | "Campaign execution: 50 materials × 10 tools = 500 pairs in 12 min" |
Branch 3: material→tool compatibility, material→strategy recommendation edges
```

**(R4-R11 follow same pattern with phase-specific knowledge types)**

**VERIFY:** Every phase doc has a Knowledge Contributions section.
Types + estimates are realistic for that phase's scope.
Branch 3 contribution expectations are clear.

---

### W6 COMPLETION CHECKLIST:
```
□ KnowledgeNode schema defined and documented
□ KnowledgeIndex schema defined (lightweight boot loader)
□ C:\PRISM\knowledge\ directory structure created
□ knowledge_store action works — creates node files + updates index
□ knowledge_query action works — filters by phase, MS, type, tags
□ knowledge_get action works — loads full detail, increments access count
□ knowledge_supersede action works — archives old nodes
□ Relationship graph schema defined (RelationshipEdge)
□ Graph storage directory structure created
□ knowledge_graph_add_edge action works
□ knowledge_graph_query action works
□ Recovery Card has STEP 1.7 (knowledge query)
□ PROTOCOLS_CORE has knowledge extraction protocol
□ PROTOCOLS_CORE phase gate has knowledge review checklist
□ All phase docs have Knowledge Contributions section
□ Promotion rules documented and integrated into phase gate
□ npm run build passes
□ End-to-end test: store node → query → get detail → supersede → verify archived
```


---

## WAVE 7: DEFERRED (solve when painful, not before)
**Revisit after W0-W6 complete. These items have workarounds or low impact.**

### Item #2: Tiered handoffs
**Current state:** SESSION_HANDOFF.md is ~8 lines flat text. ~50 tokens to load.
**When to revisit:** If handoffs grow beyond ~20 lines or ~300 tokens.
**Workaround:** Flat format is fine at current scale. Recovery Card is the lean bootstrap.

### Item #6: Binary transfer (DC ↔ container)
**Current state:** Cannot move files between Windows (DC) and Linux (container).
**When to revisit:** If Anthropic adds bridge capability, or if we find a creative workaround.
**Workaround:** Build all deliverables on Windows side. Tell user the path. User downloads directly.

### Item #10: Cross-session continue (residual gap)
**Current state:** Position auto-save every 3 calls + SESSION_HANDOFF + knowledge system.
**Remaining gap:** If chat closes between position saves (0-2 call window).
**When to revisit:** If users report significant data loss on unexpected chat closure.
**Workaround:** Position auto-save at 3 calls limits max loss to ~5 minutes of work.

---

## EXECUTION SCHEDULE

```
SESSION 1:  W0 (15min) + W1 (60min)                              │ Model: Haiku+Sonnet
            Protocol fixes + section anchors + document index      │ DC or Claude Code
            ─────────────────────────────────────────────────────  │
SESSION 2:  W2 (30min) + W3 start (45min)                         │ Model: Sonnet + Opus gate
            QA scripts + prism_doc hash+diff                       │ Claude Code
            W6-1 (30min Opus) CAN START in parallel                │ Opus in claude.ai
            ─────────────────────────────────────────────────────  │
SESSION 3:  W3 finish (30min) + W4 (60min)                        │ Model: Sonnet + Opus gate
            read_section action + session health + auto-dump       │ Claude Code
            ─────────────────────────────────────────────────────  │
SESSION 4:  W5-1 through W5-3 (90min)                             │ Model: Opus + Sonnet
            Protocol tier analysis + BOOT split + SLIM index       │ Hybrid
            ─────────────────────────────────────────────────────  │
SESSION 5:  W5-4 through W5-6 (90min)                             │ Model: Haiku+Sonnet+Opus
            Code index + data taxonomy + skill phasing             │ Claude Code
            ─────────────────────────────────────────────────────  │
SESSION 6:  W6-1 finish + W6-2 + W6-3 (90min)                     │ Model: Sonnet
            Knowledge storage engine + extraction protocol         │ Claude Code
            ─────────────────────────────────────────────────────  │
SESSION 7:  W6-4 + W6-5 (90min)                                   │ Model: Opus + Sonnet
            Relationship graph schema + boot integration           │ Hybrid
            ─────────────────────────────────────────────────────  │
SESSION 8:  W6-6 + W6-7 + FINAL REGRESSION (90min)                │ Model: Opus + Sonnet
            Promotion protocol + phase doc updates + full test     │ Hybrid
            ─────────────────────────────────────────────────────  │

TOTAL: 8 sessions, ~10-12 hours of execution
BUFFER: Add 2-3 sessions for debugging, compaction recovery, and rework
REALISTIC TOTAL: 10-11 sessions
```

---

## MODEL USAGE SUMMARY

```
HAIKU (cheapest — use for bulk mechanical work):
  ┌─────────────────────────────────────────────────────────────────┐
  │ W1-1: Bulk anchor placement across 20+ files (~200 anchors)    │
  │ W5-4 Part B: Build code index extraction script                │
  │ W5-5 Part A: Scan registry directories for taxonomy            │
  │ W5-6 Part C: Validate phase skill mappings (test each phase)   │
  │ Any: File scanning, grep, line counting, file-by-file edits    │
  └─────────────────────────────────────────────────────────────────┘
  WHEN TO USE HAIKU: Task is mechanical, repetitive, low-judgment.
  Volume: hundreds of similar small edits, or scanning thousands of files.
  NOT for: any decision-making, architecture, schema design, or safety logic.

SONNET (mid-tier — the workhorse):
  ┌─────────────────────────────────────────────────────────────────┐
  │ W0-*: All protocol text edits (trivial)                        │
  │ W1-2: Section index design + content                           │
  │ W1-3: Index regeneration script                                │
  │ W2-*: All QA scripts (lint, token, regression)                 │
  │ W3-*: All prism_doc action implementation                      │
  │ W4-1 Parts A-D: Session health implementation                  │
  │ W4-2: Pre-compaction auto-dump hook                            │
  │ W5-2: PROTOCOLS_BOOT extraction                                │
  │ W5-3: MASTER_INDEX slim-down                                   │
  │ W5-4 Part C: Codebase index readable summary                   │
  │ W5-5 Part B: Data taxonomy file                                │
  │ W5-6 Part B: Skill auto-loading implementation                 │
  │ W6-2: Knowledge storage engine (all actions)                   │
  │ W6-3: Extraction protocol implementation                       │
  │ W6-5: Boot integration (Recovery Card + PROTOCOLS_CORE)        │
  │ W6-7: Knowledge contribution sections in all phase docs        │
  └─────────────────────────────────────────────────────────────────┘
  WHEN TO USE SONNET: Task requires implementation, script writing,
  moderate judgment, or working with existing patterns.
  NOT for: architectural decisions, threshold calibration, safety-critical schemas.

OPUS (most capable — use for decisions that affect everything):
  ┌─────────────────────────────────────────────────────────────────┐
  │ W3 GATE: Review response schemas for prism_doc actions         │
  │ W4-1 Part E: Calibrate health thresholds (GREEN/YELLOW/RED)    │
  │ W5-1: PROTOCOLS_CORE usage analysis + tier classification      │
  │ W5-4 Part A: Code index schema design                          │
  │ W5-6 Part A: Phase-to-skill mapping design                     │
  │ W6-1: Knowledge node schema design (affects all future storage)│
  │ W6-3: Extraction rules (what to capture vs skip)               │
  │ W6-4: Relationship graph schema + edge types                   │
  │ W6-6: Promotion rules (what becomes permanent)                 │
  └─────────────────────────────────────────────────────────────────┘
  WHEN TO USE OPUS: Task requires architectural judgment, safety-critical
  decisions, schema design that affects multiple future phases, or
  threshold calibration where wrong values cause system misbehavior.
  NOT for: mechanical edits, file scanning, routine implementation.

ROLE SWITCHES WITHIN A SESSION:
  A single session may switch models. For example in Session 5:
    - Start with Opus: design code index schema (W5-4 Part A)
    - Switch to Haiku: scan codebase to extract data (W5-4 Part B)
    - Switch to Sonnet: write readable summary + regeneration script (W5-4 Part C, W5-5)
  In claude.ai: model is conversation-wide (can't switch mid-chat).
    → Use separate chats for different model tiers.
    → Share state via files on disk (CURRENT_POSITION, knowledge nodes).
  In Claude Code: model switching is supported per-task.
    → Can switch within one session.
```

---

## SUCCESS CRITERIA (pass ALL to declare complete)

### FUNCTIONAL TESTS:

**TEST 1 — Cold Start:**
```
Start new chat. Say "continue".
EXPECTED:
  1. Claude reads PRISM_RECOVERY_CARD.md (from memory edit #27)
  2. Detects environment (MCP or DC)
  3. Reads CURRENT_POSITION.md → finds phase + MS
  4. Queries knowledge index → loads relevant prior learnings
  5. Loads only needed section(s) of phase doc via read_section
  6. Begins executing next step WITHOUT asking human for guidance
PASS IF: All 6 steps complete autonomously. No "what should I continue?" questions.
```

**TEST 2 — Compaction Recovery:**
```
Mid-session, simulate or wait for compaction.
EXPECTED:
  1. Claude detects post-compaction state
  2. Reads Recovery Card (~1K tokens)
  3. Loads section index (~1.5K tokens)
  4. Hashes previously-loaded files → skips unchanged
  5. Resumes work within 3 tool calls
PASS IF: Recovery takes ≤3 calls. No full file reloads. No duplicate work.
```

**TEST 3 — Rapid Compaction:**
```
3 compactions in one session.
EXPECTED:
  1. After 2nd recovery: switches to ultra-minimal mode
  2. Loads only Recovery Card (no PROTOCOLS_CORE, no section index)
  3. Still makes progress (≥1 step per cycle)
  4. State saved between every step
PASS IF: Productivity ≥1 step per recovery. No state loss.
```

**TEST 4 — Phase Transition:**
```
Complete last MS of a phase.
EXPECTED:
  1. Updates CURRENT_POSITION first (safe if compaction hits)
  2. Updates ROADMAP_TRACKER second
  3. Knowledge promotion runs (review nodes from completed phase)
  4. Loads next phase doc
  5. Continues without human guidance
PASS IF: Position always points to next phase after transition. No work repeated.
```

**TEST 5 — Knowledge Persistence:**
```
Session A: Discover a bug fix (e.g., "trim() needed before lookup").
Session B (new chat): Start working on same MS.
EXPECTED:
  1. Boot queries knowledge for current phase+MS
  2. Finds the bug fix node from Session A
  3. Applies the fix without rediscovering it
PASS IF: Session B does NOT repeat the debugging from Session A.
```

**TEST 6 — Regression Test:**
```
Run roadmap-regression-test.ps1 after all waves complete.
EXPECTED: All checks PASS. No warnings. No failures.
PASS IF: Exit code 0 with "All checks passed" message.
```

**TEST 7 — Token Budget:**
```
Normal session boot (not compaction recovery).
MEASURE: Total tokens loaded before first productive action.
EXPECTED:
  Recovery Card: ~1K
  Section Index: ~1.5K
  MASTER_INDEX_SLIM: ~1.5K
  PROTOCOLS_BOOT: ~2K
  Phase doc sections (not full): ~1-2K
  Knowledge query results: ~0.2-0.5K
  TOTAL: ≤8K tokens
PASS IF: ≤8K tokens loaded before productive work begins.
  (Current baseline without improvements: ~18K+ tokens)
```

**TEST 8 — Session Health:**
```
At call 30+, check session health.
EXPECTED: Status = YELLOW with advisory to wrap up.
At call 40+: Status = RED with directive to stop.
PASS IF: Health signal correctly reflects session state.
```

---

## INTEGRATION WITH EXISTING ROADMAP

These waves map directly into PHASE DA (Development Acceleration) milestones:

```
EXISTING DA MILESTONES → WAVE MAPPING:

DA-MS0 (Context Engineering):
  ORIGINAL: Token optimization, context window management
  NOW INCLUDES: W0 (protocols), W1 (anchors+index), W5-1/W5-2 (BOOT split),
                W5-3 (SLIM index)

DA-MS1 (Session Continuity):
  ORIGINAL: Cross-session state, compaction resilience
  NOW INCLUDES: W4 (health signal + auto-dump), W6-5 (knowledge boot integration)

DA-MS2 (Skill/Script/Hook Configuration):
  ORIGINAL: Skill tier map, auto-injection, hook config
  NOW INCLUDES: W2 (QA scripts), W5-6 (skill phase-loading)

DA-MS3 (Performance + Tooling):
  ORIGINAL: Build optimization, DX improvements
  NOW INCLUDES: W3 (prism_doc enhancements: hash, diff, read_section)

DA-MS4 (Knowledge System):
  NEW MILESTONE — replaces or extends original DA-MS4
  INCLUDES: W6 (knowledge storage, extraction, graph, promotion)
  This is the biggest addition. May need to be split into DA-MS4a and DA-MS4b.

DA-MS5 (Integration Gate):
  ORIGINAL: Full regression, quality metrics
  NOW INCLUDES: W2-3 (regression test), all success criteria tests above
  ALSO: Run knowledge promotion for DA phase knowledge nodes

DA-MS6 (Code Index + Data Taxonomy):
  NEW MILESTONE
  INCLUDES: W5-4 (code index), W5-5 (data taxonomy), Branch 1+2 of hierarchical index
  Optional: could merge into DA-MS3 if session budget allows
```

**THIS MEANS DA PHASE GROWS FROM 6 TO 7 MILESTONES.**
The added work is significant but the payoff compounds across every future phase.
Every session of R1-R11 benefits from the infrastructure built during DA.

---

## COMPANION ASSETS PRODUCED BY EACH WAVE

```
WAVE 1:
  SCRIPT: rebuild-section-index.ps1
  FILE:   ROADMAP_SECTION_INDEX.md
  FILE:   .roadmap-index-baseline.json

WAVE 2:
  SCRIPT: update-token-estimates.ps1
  SCRIPT: roadmap-lint.ps1
  SCRIPT: roadmap-regression-test.ps1
  FILE:   .roadmap-lint-baseline.json

WAVE 3:
  CODE:   prism_doc action=hash (docDispatcher.ts)
  CODE:   prism_doc action=diff (docDispatcher.ts)
  CODE:   prism_doc action=read_section (docDispatcher.ts)
  CODE:   prism_doc action=read_sections (docDispatcher.ts)
  SKILL:  prism-doc-efficiency (teaches hash→check→read_section workflow)

WAVE 4:
  CODE:   SessionHealth interface + tracking (sessionDispatcher.ts)
  CODE:   prism_session action=health_check
  CODE:   pre_compaction_dump hook (hookRegistration.ts)
  SKILL:  prism-session-health (teaches health monitoring)

WAVE 5:
  FILE:   PROTOCOLS_CORE_TIER_MAP.md
  FILE:   PRISM_PROTOCOLS_BOOT.md
  SCRIPT: extract-protocols-boot.ps1
  FILE:   PRISM_MASTER_INDEX_SLIM.md
  FILE:   CODEBASE_INDEX.json + CODEBASE_INDEX_READABLE.md
  SCRIPT: build-code-index.ps1
  FILE:   DATA_TAXONOMY.md
  SCRIPT: build-data-taxonomy.ps1
  FILE:   SKILL_PHASE_MAP.json
  CODE:   Skill auto-loading in session_boot

WAVE 6:
  CODE:   knowledge_store, knowledge_query, knowledge_get, knowledge_supersede actions
  CODE:   knowledge_graph_add_edge, knowledge_graph_query, knowledge_graph_traverse actions
  DIR:    C:\PRISM\knowledge\ (full directory structure)
  FILE:   SESSION_KNOWLEDGE_INDEX.json
  FILE:   RELATIONSHIP_GRAPH_INDEX.json
  PROTOCOL: Session knowledge extraction (in PROTOCOLS_CORE)
  PROTOCOL: Knowledge promotion rules (in PROTOCOLS_CORE)
  SECTIONS: Knowledge Contributions section in all 12 phase docs
```

**TOTAL NEW ASSETS:** ~10 scripts, ~12 files, ~15 code changes, ~14 protocol additions


---

## WAVE 8: SKILL ATOMIZATION + COURSE EXTRACTION (NEW in v14.5)
**The knowledge multiplication wave.** Transforms 34 monolithic skills + 206 MIT courses + ~25 CNC/CAM
training resources into ~3,880 atomic single-function skills, each <=5KB, all indexed.

**Depends on:** W5 (skill phase-loading uses SKILL_INDEX.json from this wave)
**Tracked in:** DA-MS9 (infrastructure) + DA-MS10 (pilot), then parallel tracks alongside R1+
**Total estimated sessions:** 50-80 (mostly Haiku bulk work)
**Token savings:** 70-90% reduction in per-query skill loading costs

### Phase 1: Infrastructure (DA-MS9, 2 sessions)
**Role:** Data Architect | **Model:** Opus (schema) then Sonnet (scripts) | **Effort:** L

| # | Task | Model | Calls |
|---|------|-------|-------|
| 1 | Create SKILL_INDEX.json schema | Opus | 3 |
| 2 | Build split-skill.ps1 automation | Sonnet | 4 |
| 3 | Build extract-course-skills.ps1 pipeline | Sonnet | 4 |
| 4 | Build update-skill-index.ps1 tool | Sonnet | 3 |
| 5 | Index existing 65 right-sized skills | Haiku | 3 |

**Gate:** 4 scripts tested. Index has 65 entries. Split tool proposes reasonable splits.

### Phase 2: Pilot (DA-MS10, 4 sessions)
**Role:** Data Architect | **Model:** Haiku (extraction) then Sonnet (review) then Opus (validation) | **Effort:** XL

Pilot Set A - Skill Splits (3 flagship skills -> ~100 atomic):
  Split 1: prism-gcode-reference (62KB, 37 sections -> ~37 skills)
  Split 2: prism-material-physics (37.5KB, 59 sections -> ~50 skills)
  Split 3: prism-safety-framework (24.9KB, 32 sections -> ~30 skills)

Pilot Set B - Course Extraction (3 courses -> ~70-90 skills):
  Course 1: 2.830j Control of Manufacturing Processes (~25 skills)
  Course 2: 3.012 Fundamentals of Materials Science (~25 skills)
  Course 3: 18.03 Differential Equations (~20 skills)

**Gate:** ~170-200 new atomic skills. All <=5KB. All indexed. Zero knowledge loss.

### Phase 3: Bulk Execution (parallel tracks, 40-65 sessions)
**Role:** Data Architect | **Model:** Haiku (bulk) then Sonnet (batch review)

Track A - Remaining Skill Splits (31 skills -> ~560 atomic, 5-8 sessions):
  Model: Haiku (splitting) then Sonnet (quality review per batch of 5)
  Batch size: 5 skills per session
  Quality gate: each batch reviewed before next

Track B - Course Extraction by Tier (206 courses -> ~2,800 skills):
  T1 Manufacturing (25 courses): 5-8 sessions | Haiku extract, Sonnet review | Runs during R1
  T2 Materials (11 courses): 2-3 sessions | Haiku extract, Sonnet review | Runs during R1
  T3 Math (28 courses): 4-6 sessions | Haiku extract, Sonnet review | Runs during R3
  T4 CS/Algorithms (52 courses): 8-12 sessions | Haiku extract, Sonnet review | Runs during R3
  T5 Operations (20 courses): 3-5 sessions | Haiku extract, Sonnet review | Runs during R7
  T6+ Other (70 courses): 10-15 sessions | Haiku extract, Sonnet review | Runs during R7+

Track C - CNC/CAM Training (~25 resources -> ~420 skills, 3-5 sessions):
  Model: Haiku (parsing) then Sonnet (manufacturing accuracy review)
  Content: SolidCAM, InventorCAM, HyperMILL, CNC Cookbook guides, Post Processor guides
  Runs during R3 (feeds toolpath intelligence directly)

### Phase 4: Cross-Reference + Quality (3-5 sessions)
**Role:** Data Architect | **Model:** Sonnet (linking) then Opus (gap analysis)
  - Link related skills (G-code skill <-> toolpath skill)
  - Verify no gaps (every PRISM calculation has supporting skill)
  - Verify no duplicates (course skill vs split skill)
  - Build skill dependency graph
  - Final SKILL_INDEX.json validation

### W8 Companion Assets:
`
SCRIPT: scripts/skills/split-skill.ps1
SCRIPT: scripts/skills/extract-course-skills.ps1
SCRIPT: scripts/skills/update-skill-index.ps1
FILE:   skills-consolidated/SKILL_INDEX.json
FILE:   skills-consolidated/_archived/ (originals)
DIR:    ~3,880 new atomic skill directories
FILE:   SKILL_ATOMIZATION_TRACKER.md
`

**TOTAL NEW ASSETS:** ~3,880 skill directories, 3 scripts, 2 tracking files

---
END OF MASTER ACTION PLAN v2.0
