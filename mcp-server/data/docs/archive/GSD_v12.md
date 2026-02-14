# PRISM GSD v12.0 - Intelligence-Enhanced Edition
## Get Shit Done - With Intelligence Foundation, Auto-Hooks & 100% Utilization

---

## SESSION START PROTOCOL (MANDATORY)

### Step 1: Load State (MCP Tools)
```
prism_quick_resume                        → Load CURRENT_STATE.json (machine state)
```

### Step 2: Read Tracker (Desktop Commander)
```
Desktop Commander:read_file               → C:\PRISM\state\ACTION_TRACKER.md
                                          → See what's DONE vs PENDING
                                          → NEVER duplicate completed work
```

### Step 3: Initialize Session
```
prism_gsd_core                            → Load full instructions (optional)
prism_todo_update                         → Anchor attention on current task
```

### Step 4: CHECK BEFORE CREATING
```
Desktop Commander:get_file_info           → ALWAYS check if file exists
                                          → Before ANY write/create operation
```

## SESSION END PROTOCOL (MANDATORY)

### Step 1: Save State
```
prism_state_save(state={...})             → Persist to CURRENT_STATE.json
```

### Step 2: Update Tracker
```
Desktop Commander:write_file              → Update C:\PRISM\state\ACTION_TRACKER.md
                                          → Mark completed items [x]
                                          → Add new pending items [ ]
```

### Step 3: Final Anchor
```
prism_todo_update                         → Final status for next session
```

## STATE FILES (C:\PRISM\state\)
| File | Purpose | Access Method |
|------|---------|---------------|
| CURRENT_STATE.json | Machine state | prism_state_save/load/quick_resume |
| ACTION_TRACKER.md | Human tracker | Desktop Commander:read_file/write_file |
| todo.md | Attention anchor | prism_todo_update |
| SESSION_MEMORY.json | Persistent memory | prism_memory_save/recall |

---

## 6 LAWS (HARD REQUIREMENTS)
1. **S(x)≥0.70** - Safety score HARD BLOCK
2. **No placeholders** - 100% complete
3. **New≥Old** - Never lose data
4. **MCP First** - 348 tools before files
5. **NO DUPLICATES** - Check ACTION_TRACKER.md + get_file_info BEFORE creating
6. **100% UTILIZATION** - If it exists, wire it everywhere

---

## INTELLIGENCE TOOLS (26 TOOLS - P1-INTEL)

### Token Budget - Conditional Spending
```python
# Session start - reset budget
intel_budget_reset()

# Before ANY expensive operation:
if intel_budget_can_spend("deep_analysis", 1500)["allowed"]:
    # Proceed with expensive operation
else:
    # Use zero-token alternative
    intel_ast_complexity(code)  # FREE

# Track spending
intel_budget_spend("review", 500, "code review for module.py")

# Status check
intel_budget_status()  # → {zone: GREEN/YELLOW/WARNING/CRITICAL}

# Session end - full report
intel_budget_report(include_history=True)
```

### Smart Reflection - On ANY Failure
```python
# AUTOMATIC: On any error, exception, or failure
try:
    result = operation()
except Exception as e:
    # ALWAYS call this
    reflection = intel_hook_on_failure(
        failure_type="runtime_error",
        error_message=str(e),
        file_path=__file__
    )
    # Use: reflection["suggested_fix"]
    # Note: Cached = 0 tokens!
```

### Cascading Review - Before Code Commit
```python
# On ANY code write - let cascade decide depth
review = intel_review_cascade(
    code=new_code,
    file_path="module.py",
    force_deep=False  # Only escalate if issues found
)
# Saves 70-90% vs always-deep

# Check efficiency
intel_review_stats()
```

### Zero-Token Engines - ALWAYS USE FIRST
```python
# BEFORE any LLM-based analysis, try these (FREE):
intel_ast_complexity(code)      # McCabe, cognitive, maintainability
intel_entropy_quick(code)       # Duplication, health score
intel_embed_local(text, compare_to)  # Similarity without LLM
```

### High-Reliability Protocols (P1I-007) - 4 tools
```python
# Λ(x) - Formal Logic Proof Validation
# AUTO-FIRES on: calc_*, prism_cutting_force, prism_tool_life, prism_speed_feed
proof_validate(proof_lines)  # Returns: {is_valid, validity_score, issues}

# Φ(x) - Factual Claim Verification
# AUTO-FIRES on: web_search, web_fetch (when claims detected)
fact_verify(claim, sources, prior?)  # Returns: {verdict, confidence, phi_score}

# Reference tools
get_inference_rules()  # List 20 valid inference rules
get_source_tiers()     # Source tier definitions (1-4)
```

**Claim Detection Indicators:**
- "studies show", "research indicates", "according to"
- "data shows", "evidence suggests", "proven that"
- "the fact that", "it is known that", "established that"

---

## OMEGA INTEGRATION (P6-OMEGA) - 6 Tools

Master Quality Equation: `Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L`

**HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED**

```python
# Compute Omega score
omega_compute(R=0.85, C=0.80, P=0.75, S=0.90, L=0.60)
# → {omega: 0.815, status: "RELEASE_READY"}

# Check if releasable
omega_validate(omega=0.72, S=0.85)
# → {can_release: True, can_proceed: True}

# Get optimization suggestions
omega_optimize(R=0.6, C=0.6, P=0.6, S=0.7, L=0.4, target=0.70)
# → {gap: 0.09, suggestions: [{component: "S", impact: 0.03}]}

# Detailed breakdown
omega_breakdown(R=0.8, C=0.8, P=0.8, S=0.8, L=0.5)
# → {contributions: {R: 0.20, C: 0.16, ...}, percentages: {...}}
```

| Status | Threshold | Action |
|--------|-----------|--------|
| RELEASE_READY | Ω ≥ 0.70 | Deploy OK |
| ACCEPTABLE | Ω ≥ 0.65 | Dev OK |
| BLOCKED_SAFETY | S < 0.70 | HARD BLOCK |

---

## AUTO-TRIGGER HOOKS (NEW)

| Event | Hook | Tool | When |
|-------|------|------|------|
| Session Start | INTEL-BUDGET-001 | intel_budget_status | Always |
| Session End | INTEL-BUDGET-002 | intel_budget_report | Always |
| Any Failure | INTEL-FAILURE-001 | intel_hook_on_failure | On error |
| Code Write | INTEL-REVIEW-001 | intel_review_cascade | >20 lines |
| Code Save | INTEL-QUALITY-001 | intel_ast_complexity | Python files |
| Code Save | INTEL-ENTROPY-001 | intel_entropy_quick | All files |
| Safety Calc | INTEL-PROOF-001 | proof_validate (Λ) | calc_* tools |
| Web Results | INTEL-FACT-001 | fact_verify (Φ) | Claims detected |

```python
# Fire hooks manually
intel_hooks_fire("on_failure", {"error_message": "...", "file_path": "..."})
intel_hooks_fire("on_code_write", {"code": "...", "file_path": "..."})
intel_hooks_list()  # See all hooks
intel_hooks_log()   # See execution history
```

---

## ⚠️ PHASE COMPLETION CHECKLIST (MANDATORY)

**Before marking ANY phase complete, update ALL of these:**

### 1. Skills (Documentation)
```
□ Create C:\PRISM\skills\user\prism-{feature}\SKILL.md
□ Include: trigger patterns, tool reference, examples, best practices
□ Register in skill registry if applicable
```

### 2. Hooks (Auto-Triggers)
```
□ Create hooks in intel_hooks.py or hook registry
□ Define: event triggers, conditions, priorities
□ Test: intel_hooks_fire() for each event
```

### 3. GSD (Instructions)
```
□ Update session start/end protocols
□ Add new tools to appropriate sections
□ Update tool counts and laws if needed
□ Bump version number
```

### 4. Memories (Claude Context)
```
□ Update userMemories via memory_user_edits
□ Add: tool counts, new capabilities, workflow changes
□ Remove: outdated information
```

### 5. Orchestrators (Auto-Routing)
```
□ Update PRIORITY_ROADMAP.json
□ Add tools to autopilot routing tables
□ Update prism_autopilot_v2 task classification
```

### 6. State Files
```
□ Update CURRENT_STATE.json with new capabilities
□ Update tool counts in state
□ Create checkpoint: dev_checkpoint_create("phase-complete")
```

### 7. Scripts (Automation)
```
□ Update bootstrap.py if needed
□ Add to automation scripts if applicable
□ Test integration with existing workflows
```

### Quick Checklist Command:
```python
# Run this before closing any phase:
phase_checklist = {
    "skill_created": "C:\\PRISM\\skills\\user\\prism-{name}\\SKILL.md",
    "hooks_added": len(new_hooks),
    "gsd_updated": "v12.0",
    "memories_updated": True,
    "roadmap_updated": True,
    "state_saved": True,
    "scripts_updated": True
}
```

---

## DEV TOOLS (20 - TIER 1)
[Same as GSD v11 - Background Tasks, Checkpoints, Impact, Semantic, Context]

---

## TOOL COUNTS (v12)

| Category | Count | Examples |
|----------|-------|----------|
| PRISM MCP | 277 | calc_*, material_*, alarm_*, agent_* |
| Dev Tools | 20 | dev_task_*, dev_checkpoint_*, dev_semantic_* |
| Intel Tools | 26 | intel_budget_*, intel_review_*, proof_validate, fact_verify |
| Intel Hooks | 5 | intel_hooks_list, intel_hooks_fire, etc. |
| Desktop Commander | ~20 | read_file, write_file, start_process |
| **TOTAL** | **348** | |

---

## QUALITY EQUATION
```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
- R: Reasoning quality
- C: Code quality  
- P: Process adherence
- S: Safety score (HARD BLOCK if < 0.70)
- L: Learning/improvement

≥0.85: Excellent | ≥0.70: Release | <0.70: Block
```

---

## BUFFER ZONES
🟢 0-8 tools | 🟡 9-14 (checkpoint) | 🔴 15-18 (urgent) | ⚫ 19+ (STOP)

---

## DECISION TREE: Which Intelligence Tool?

```
Need to analyze code?
├── Is it a failure/error? → intel_hook_on_failure (cached!)
├── Need quality metrics? → intel_ast_complexity (0 tokens)
├── Check for duplication? → intel_entropy_quick (0 tokens)
├── Find similar code? → intel_embed_local (0 tokens)
├── Full code review? → intel_review_cascade (auto-escalate)
└── Check budget first? → intel_budget_can_spend

Before expensive operation?
├── intel_budget_can_spend() → Check if allowed
├── If NO → Use zero-token alternative
└── If YES → Proceed + intel_budget_spend() to track
```

---

**Version:** 12.3.0
**Updated:** 2026-02-05
**Tools:** 354+
**New in v12.2:** High-Reliability Protocols (Λ/Φ), 26 Intel Tools, Auto-Fire on calc_*/web_*

---

## PARALLEL CLAUDE API (NEW in v12.1)

### API Key Location
```
PRIMARY: Environment variable ANTHROPIC_API_KEY
BACKUP:  C:/PRISM/config/.anthropic_key
FORMAT:  sk-ant-api03-...
```

### Auto-Fire After 15 Minutes
```python
# System automatically monitors task duration
# If ANY task exceeds 15 minutes, parallel API kicks in

from intelligence.parallel_claude import get_auto_trigger

trigger = get_auto_trigger()
trigger.start_task("complex_build", subtasks=[...])  # Register task
# ... after 15 min, parallel executes subtasks automatically ...
trigger.complete_task("complex_build")  # Cleanup
```

### Parallel Build + Validate (Always Use Together)
```python
from intelligence.parallel_claude import parallel_build_and_validate

# DON'T just build - ALSO validate in parallel
result = parallel_build_and_validate([
    {"task_id": "hook1", "task": "Write hook for...", "model": "haiku"},
    {"task_id": "hook2", "task": "Write hook for...", "model": "haiku"},
])
# result["all_valid"] must be True before proceeding
```

---

## POST-BUILD AUTO-UPDATES (NEW in v12.1)

**After ANY parallel_build completes, these update AUTOMATICALLY:**

| Target | What Updates | Location |
|--------|--------------|----------|
| Hooks Registry | New hooks added | hooks_registry.json |
| State | Tool counts, last build | CURRENT_STATE.json |
| GSD | Recent updates section | GSD_v12.md |
| Logs | Build history | post_build.log |

### Manual Trigger (if needed)
```python
from intelligence.post_build_updater import on_build_complete

on_build_complete("hooks", [
    {"id": "hook1", "path": "path/to/file.py"},
    {"id": "hook2", "path": "path/to/file.py"},
])
```

---

## AUTO-HOOKS V2 (100% Coverage)

### What Fires Automatically Now
| Trigger | Hooks | Count |
|---------|-------|-------|
| First tool call | gsd_core, context_watch, quick_resume, budget_reset | 4 |
| Every 5 calls | todo_update | 1 |
| Every 10 calls | checkpoint_create | 1 |
| Every 20 calls | context_pressure_check | 1 |
| G-code output | collision, rapid_moves | 2 |
| Cutting force | workholding_setup, clamp_force | 2 |
| High L/D ratio | breakage, chip_load | 2 |
| High spindle | spindle_envelope, spindle_power | 2 |
| Drilling/tapping | coolant_flow, through_spindle | 2 |
| calc_* tools | S(x) ≥ 0.70 check | 1 |
| Any exception | error preserve | 1 |
| Session end | budget_report, cleanup, state_save | 3 |
| Safety calc | proof_validate (Λ) auto-fire | 1 |
| Web claims | fact_verify (Φ) auto-fire | 1 |
| **TOTAL** | | **32+** |

### Files
```
C:\PRISM\mcp-server\src\tools\intelligence\
├── parallel_claude.py          # API executor (459 lines)
├── post_build_updater.py       # Auto-updates (308 lines)
├── high_reliability.py         # Λ(x) + Φ(x) protocols (492 lines)
└── auto_hooks_v2/              # 19 modules (100% coverage)
    ├── machining_*.py          # 5 safety hooks
    ├── session_*.py            # 5 lifecycle hooks
    ├── handlers.py             # All exports
    └── ...
```


---

## TYPESCRIPT AUTO-HOOK WRAPPER (NEW)

### Location
`C:\PRISM\mcp-server\src\tools\autoHookWrapper.ts` (429 lines)

### What It Does
Wraps TypeScript tool handlers to auto-fire validation hooks.

### Auto-Fire on calc_* Tools
```
BEFORE: CALC-BEFORE-EXEC-001
AFTER:  CALC-AFTER-EXEC-001, INTEL-PROOF-001 (Λ validation)
ERROR:  REFL-002
UNSAFE: CALC-SAFETY-VIOLATION-001 (if Λ < 0.5)
```

### Auto-Fire on web_* Tools
```
AFTER: INTEL-FACT-001 (Φ verification)
```

### Usage
```typescript
import { wrapToolWithAutoHooks, getHookHistory } from './autoHookWrapper';

// Wrap a handler
const wrapped = wrapToolWithAutoHooks('calc_cutting_force', handler);

// Check history
const history = getHookHistory(50);
```

### Safety Warnings
Results include `_safety_warning` when Λ < 0.5:
```json
{
  "result": {...},
  "_safety_warning": {
    "lambda_score": 0.40,
    "issues": ["Range violation"],
    "recommendation": "Review parameters"
  }
}
```

---

## VERSION
- **GSD Version**: v12.1
- **Last Updated**: 2026-02-04
- **Tool Count**: 348+ (277 MCP + 26 Intel + 20 Dev + 20 DC + 5 Hooks)
- **Auto-Hooks**: 32+ (Python) + TypeScript wrapper
