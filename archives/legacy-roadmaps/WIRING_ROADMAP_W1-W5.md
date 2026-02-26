# PRISM KNOWLEDGE PRESERVATION & WIRING ROADMAP
## Priority: 🔴🔴🔴 CRITICAL — This blocks everything else
## Created: 2026-02-10 | Supersedes D5 as immediate priority
## Principle: STOP LOSING KNOWLEDGE. Wire what exists. Then build new.

---

# WHY THIS IS PRIORITY #1

Every session we:
1. Discover insights → overwrite them into stale docs → lose them next rewrite
2. Build Python modules → never wire them → they sit unused
3. Improve cadence/hooks/engines → forget to update GSD/skills → next session gets wrong info
4. Have 51 unwired Python modules (25K+ lines) doing nothing
5. Have gsd_sync.py (479L) that SOLVES the stale-GSD problem — never connected

This is a SYSTEMIC problem. Building D5/D6/D7 before fixing this = more things that go stale.

---

# PHASE W1: STOP THE BLEEDING (Session 1, ~45 min)
# Make GSD self-updating. Protect skills from content loss.
# Impact: Every future session benefits immediately.

## W1.1: Refactor gsdDispatcher to Read From Files

**Current:** GSD_QUICK and SECTION_CONTENT are hardcoded strings in gsdDispatcher.ts.
Every update requires code edit + build. Content lost on each rewrite.

**Fix:** 
- Create `data/docs/gsd/` directory with individual section files
- gsdDispatcher reads files at runtime (fs.readFileSync, no caching — always fresh)
- GSD_QUICK.md = the quick reference
- sections/laws.md, sections/buffer.md, sections/tools.md, etc.
- Editing a .md file = immediately reflected in `prism_gsd action=quick`
- No rebuild required for content changes

**Files:**
```
data/docs/gsd/
  GSD_QUICK.md           ← prism_gsd action=quick reads this
  DEV_PROTOCOL.md        ← prism_gsd action=dev_protocol reads this
  sections/
    laws.md              ← prism_gsd action=get section=laws reads this
    buffer.md
    tools.md
    equation.md
    workflow.md
    manus.md
    evidence.md
    gates.md
    start.md
    end.md
    d1.md through d4.md
```

**Effort:** ~60 lines changed in gsdDispatcher.ts. Create ~15 small .md files from existing content.

## W1.2: Wire gsd_sync.py as Post-Build Auto-Fire

**Current:** gsd_sync.py (479L) exists at C:\PRISM\scripts\core\gsd_sync.py.
Scans MCP files, detects tool count changes, updates GSD. Never connected.

**Fix:**
- Update gsd_sync.py to scan the new file-based GSD structure
- Add to cadenceExecutor as post-build hook (when build success detected)
- Also callable manually: prism_skill_script action=script_execute script=core/gsd_sync.py

**Dependencies:** W1.1 (file-based GSD must exist first)

## W1.3: Anti-Regression on Documentation Files

**Current:** Anti-regression checks code files only. A 386-line skill can become
70 lines with zero warnings.

**Fix:**
- Add doc file tracking to anti-regression system
- Track line counts for: skills/*/SKILL.md, data/docs/*.md
- On any write that reduces line count by >30%, emit ⚠️ warning in cadence
- On any write that reduces by >60%, BLOCK unless bypass flag set
- Store baselines in C:\PRISM\state\doc_baselines.json

**Implementation:** ~40 lines in cadenceExecutor.ts (new autoDocAntiRegression function)

## W1.4: Changelog Protocol for Skills and Docs

**Fix:** Every skill SKILL.md and doc must have a `## Changelog` section at bottom.
New entries APPENDED, never deleted. Format:
```
## Changelog
- 2026-02-10: v2.0 — Rewritten for pressure-only architecture. Removed old call-count zones.
- 2026-02-08: v1.3 — Added D4 cache integration notes.
- 2026-02-06: v1.0 — Initial skill creation.
```

**Enforcement:** autoDocAntiRegression checks for Changelog section existence.

---

# PHASE W2: WIRE THE BIG WINS (Session 2, ~60 min)
# Connect highest-value unwired modules.
# Impact: D5 handoffs, missing hooks, script discovery.

## W2.1: Wire next_session_prep.py Into Session End

**Module:** C:\PRISM\scripts\core\next_session_prep.py (508L)
**Purpose:** Generates handoff packages for next session
**Wire point:** sessionDispatcher.ts → action=session_end
- After graceful_shutdown.py call
- Before state_save
- Writes NEXT_SESSION_HANDOFF.json to C:\PRISM\state\

## W2.2: Wire resume_detector.py + resume_validator.py Into Session Boot

**Modules:** 
- C:\PRISM\scripts\core\resume_detector.py (524L)
- C:\PRISM\scripts\core\resume_validator.py (712L)

**Wire points:** sessionDispatcher.ts → action=session_start or devDispatcher.ts → session_boot
- resume_detector identifies what needs resuming
- resume_validator scores resume completeness
- Results added to boot response

## W2.3: Register phase0_hooks.py (39 Hook Definitions)

**Module:** C:\PRISM\scripts\core\phase0_hooks.py (765L)
**Contains:** 39 hook definitions across CALC(12), FILE(8), STATE(6), AGENT(5), BATCH(6), FORMULA(4)
**Wire:** Extract hook definitions → register via hookRegistration.ts or hookDispatcher
**Some may overlap with existing 112 hooks — deduplicate first**

## W2.4: Register All 154 Scripts in ScriptRegistry

**Current:** 27 of 154 scripts registered. autoScriptRecommend can only find 27.

**Fix:** 
- Run script_registry_builder.py (exists at C:\PRISM\scripts\script_registry_builder.py)
- Or write a scan that reads all .py files in scripts/ and registers them
- Add to SCRIPT_DOMAIN_MAP in cadenceExecutor so autoScriptRecommend finds them

---

# PHASE W3: CONNECT D5 CORE (Session 3, ~60 min)
# The 9 modules (5,203L) that make sessions seamless.

## W3.1: Wire gsd_sync.py as Auto-Fire After Builds (from W1.2)

Already planned in W1.2. This module alone prevents GSD staleness forever.

## W3.2: Wire session_lifecycle.py (811L)

Full lifecycle management: init→active→save→shutdown.
Wire into sessionDispatcher as orchestration layer over existing actions.

## W3.3: Wire state_reconstructor.py (538L)

Rebuilds state from fragments after corruption.
Wire into sessionDispatcher action=state_reconstruct (new action).
Auto-fire on resume if state file is corrupted.

## W3.4: Wire checkpoint_mapper.py (495L)

Maps checkpoints to decisions for audit trail.
Wire into cadenceExecutor alongside autoCheckpoint.

## W3.5: Wire state_version.py (495L)

Version tracking for state schema migrations.
Wire into sessionDispatcher as utility.

## W3.6: Wire master_orchestrator_v2.py (641L)

Coordinates multiple subsystems during complex ops.
Wire into orchestrationDispatcher or as standalone.

---

# PHASE W4: FILL GAPS (Session 4, ~45 min)
# Wire remaining high-value modules. Register MCP wrappers.

## W4.1: Wire 15 MCP Wrappers (~4,800L total)

These are PRE-SHAPED — they already define tool schemas and handlers.
Fastest possible integration. Each ~320 lines.

Priority order:
1. handoff_mcp.py — session handoffs
2. resume_mcp.py — resume helpers  
3. context_mcp.py — context management
4. error_mcp.py — error intelligence
5. cache_mcp.py — cache management
6. state_mcp.py — state operations
7. gsd_mcp.py — GSD operations
8. attention_mcp.py — attention scoring
9. efficiency_mcp.py — efficiency metrics
10-15. batch, formula, hook, prompt, resource, skill

## W4.2: Wire template_optimizer.py (555L)

Optimize repeated prompt/template patterns. Currently unused.

## W4.3: Wire efficiency_controller.py (387L)

Global efficiency metrics and throttling. Could enhance telemetry.

## W4.4: Wire queue_manager.py (546L)

Priority queue for async work. Could enhance BatchProcessor.

---

# PHASE W5: KNOWLEDGE RECOVERY (Session 5, ~30 min)
# Recover lost knowledge from old skill versions and transcripts.

## W5.1: Mine Transcripts for Lost Knowledge

Check /mnt/transcripts/ for previous sessions where skills were written.
Extract any task-specific rules, anti-patterns, examples that were lost
in rewrites.

## W5.2: Rebuild Skills with Accumulated Knowledge

Using recovered knowledge + current architecture:
- prism-session-buffer: add back task-specific checkpoint rules
- prism-context-pressure: add back response length guidance
- Other skills: audit each against transcript history

## W5.3: Create KNOWLEDGE_CHANGELOG.md

Master changelog tracking all knowledge additions/changes across all docs.
Never overwritten — append only. Becomes institutional memory.

---

# EXECUTION ORDER & DEPENDENCIES

```
W1 (STOP THE BLEEDING) ← DO FIRST, no dependencies
  W1.1 File-based GSD (no deps)
  W1.2 Wire gsd_sync.py (needs W1.1)
  W1.3 Doc anti-regression (no deps)
  W1.4 Changelog protocol (no deps)
    │
W2 (WIRE BIG WINS) ← needs W1 complete for GSD sync
  W2.1 next_session_prep.py (no deps)
  W2.2 resume_detector + validator (no deps)
  W2.3 phase0_hooks.py (needs dedup check vs existing 112)
  W2.4 Register all 154 scripts (no deps)
    │
W3 (D5 CORE) ← needs W2 for session wire points
  W3.1-W3.6 all D5 modules
    │
W4 (FILL GAPS) ← independent, can parallel with W3
  W4.1 15 MCP wrappers
  W4.2-W4.4 remaining modules
    │
W5 (KNOWLEDGE RECOVERY) ← needs W1 (protection in place first)
  W5.1-W5.3 mine and restore
```

## Total Effort Estimate
```
W1: ~45 min (1 session, highest ROI)
W2: ~60 min (1 session)  
W3: ~60 min (1 session)
W4: ~45 min (1 session)
W5: ~30 min (can be spread across sessions)
TOTAL: ~4 hours across 4-5 sessions
```

## Success Criteria
```
After W1: GSD never goes stale again. Skills can't lose >30% content silently.
After W2: Session handoffs use real prep packages. 154 scripts discoverable.
After W3: Full D5 wired — verified complete handoffs.
After W4: 15 MCP wrappers live. 66 of 73 modules wired (from 13 today).
After W5: Lost knowledge recovered and protected.
```

---

# HOW THIS FITS INTO UNIFIED_ROADMAP_v8

```
BEFORE (old priority order):
  D1 ✅ → D2 ✅ → D3 ✅ → D4 ✅ → D5 → D6 → D7 → D8 → D9

AFTER (new priority order):
  D1 ✅ → D2 ✅ → D3 ✅ → D4 ✅ → W1 → W2 → W3(=D5) → W4(=D9 partial) → W5 → D6 → D7 → D8
```

W1-W5 replaces D5 and absorbs most of D9. The net effect:
- D5 still gets wired (W3)
- D9's 15 MCP wrappers get wired (W4)
- Plus we get knowledge preservation (W1) that D5-D9 never addressed
- Plus we get script discovery (W2.4) that was never planned
- Plus we get anti-regression on docs (W1.3) that was never planned


---

# APPENDIX: RALPH VALIDATION RESULTS (2026-02-10)
# Full validation: RALPH_VALIDATION_W1-W5.md

## VERDICT: APPROVED WITH CONDITIONS

## Critical Findings That Changed the Plan:

### 1. gsd_sync.py targets WRONG FILES (old monolith paths)
Must update gsd_sync.py BEFORE wiring. Current version scans prism_mcp_server.py 
(deleted) and GSD_CORE_v4.md (doesn't exist). Need to retarget to:
- src/tools/dispatchers/*.ts
- data/docs/gsd/ directory

### 2. Fallback pattern MANDATORY for file-based GSD
If file read fails, must fall back to hardcoded strings. Safety-critical 
software cannot have a single point of failure on disk I/O.

### 3. phase0_hooks.py needs dedup audit BEFORE registration
39 hooks were written for older architecture. Some may collide with 
existing 112 hooks. Must check each name against current registry.

### 4. Script registration must be SELECTIVE
Exclude scripts/_archive/ (superseded) and scripts/testing/ (not production).
Only register from core/, validation/, state/, batch/, extraction/.

### 5. 15 MCP wrappers may be stale
Written for older Python MCP architecture. Must audit for:
- Tool name conflicts with 27 existing dispatchers
- Stale file paths (/mnt/project/ vs C:\PRISM\)
- References to deleted modules

### 6. computationCache import was missing from autoHookWrapper
Fixed in this session. Blocks ALL Ralph validation until server restart.
Added as W1 prerequisite.

### 7. Verification protocol added for each phase
Concrete checklist of what to test after each W phase completes.
See RALPH_VALIDATION_W1-W5.md for full checklists.

## Updated Execution Sequence:
```
Session N:   Build + Restart (cache fix) → W1.1 + W1.3 + W1.4
             → Update gsd_sync.py paths → W1.2
             → Verify: GSD from files, doc AR working
             → Run Ralph loop to validate W1 (should work after cache fix)

Session N+1: W2.1 + W2.2 → W2.4 (selective) → W2.3 (with dedup)
             → Verify: session prep working, scripts registered, hooks clean

Session N+2: W3 (D5 core) → Verify: full session lifecycle

Session N+3: Audit MCP wrappers → W4 → W5
             → Verify: wrappers live, knowledge recovered
```
