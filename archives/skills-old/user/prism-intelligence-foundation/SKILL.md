# PRISM Intelligence Foundation Skill
## P1-INTEL: Token Budget + Smart Reflection + Cascading Review + Zero-Token Engines + Auto-Hooks

**Version:** 1.2.0
**Tools:** 22
**Lines:** 2,644
**Location:** `C:\PRISM\mcp-server\src\tools\intelligence\`
**Reliability:** 99% (server-level auto-hooks)

---

## WHEN TO USE THIS SKILL

**ALWAYS USE when:**
- Starting any session (budget tracking)
- Any operation fails (smart reflection)
- Reviewing code (cascading review)
- Analyzing code quality (zero-token engines)
- Checking token spend (budget report)

**TRIGGER PATTERNS:**
- "error", "failed", "exception" → `intel_hook_on_failure`
- "review", "check code" → `intel_review_cascade`
- "complexity", "quality" → `intel_ast_complexity`
- "similar", "duplicate" → `intel_embed_local`
- "budget", "tokens" → `intel_budget_status`

---

## TOOL REFERENCE

### Token Budget (5 tools) - Conditional Spending
```python
# Check current budget
intel_budget_status()
# → {spent, remaining, zone: GREEN/YELLOW/WARNING/CRITICAL}

# Before spending tokens
intel_budget_can_spend(category="reflection", tokens=300)
# → {allowed: true/false, reason}

# Record spending
intel_budget_spend(category="review", tokens=500, operation="code review")

# Full report
intel_budget_report(include_history=True)

# New session
intel_budget_reset()
```

**Categories & Limits:**
| Category | Tokens | Use Case |
|----------|--------|----------|
| reflection | 300 | Error analysis |
| review | 800 | Code review |
| deep_analysis | 1500 | Comprehensive review |
| background | 500 | Health checks |
| cascade_cheap | 100 | Quick patterns |
| cascade_focused | 500 | Targeted analysis |
| cascade_deep | 1500 | Full security/perf |
| subagent | 2000 | Spawn sub-tasks |
| composition | 1000 | CCE composition |

### Smart Reflection (3 tools) - Failure Analysis
```python
# On any failure - CACHED (same error = 0 tokens)
intel_hook_on_failure(
    failure_type="test_failure",  # test_failure, build_failure, runtime_error
    error_message="AssertionError: expected 5, got 3",
    file_path="tests/test_calc.py",
    line_number=42
)
# → {root_cause, confidence, suggested_fix, tokens_used, cached}

# Simple interface
intel_reflection_run("TypeError: undefined is not a function")

# Check cache
intel_reflection_cache_status()
```

### Cascading Review (2 tools) - Progressive Depth
```python
# CHEAP (0 tokens) → FOCUSED (500) → DEEP (1500)
# Only escalates when issues found!
result = intel_review_cascade(
    code=source_code,
    file_path="module.py",
    force_deep=False  # Let cascade decide
)
# → {summary, findings, tiers_run, tokens_used, escalation_path}

# Statistics
intel_review_stats()
# → {total_reviews, stopped_at_cheap, tokens_saved, efficiency}
```

### Zero-Token Engines (3 tools) - FREE Intelligence
```python
# AST Complexity - McCabe, Cognitive, Maintainability
intel_ast_complexity(code, language="python")
# → {cyclomatic, cognitive, maintainability_index, tokens_used: 0}

# Entropy/Health - Duplication, Diversity
intel_entropy_quick(code)
# → {duplication_score, health_score, warnings, tokens_used: 0}

# Local Embeddings - Similarity without LLM
intel_embed_local(
    text="function to calculate speed",
    compare_to="method for computing velocity",
    find_similar_in=["func1", "func2", "func3"]
)
# → {similarity: 0.87, similar_items: [...], tokens_used: 0}
```

---

## INTEGRATION POINTS

### Auto-Trigger on Failure
```python
# In any try/except:
try:
    result = operation()
except Exception as e:
    # AUTO-TRIGGER
    reflection = intel_hook_on_failure(
        failure_type="runtime_error",
        error_message=str(e),
        file_path=__file__
    )
    # Use reflection.suggested_fix
```

### Code Review Workflow
```python
# Before committing any code:
review = intel_review_cascade(code)
if review['risk_score'] > 0.5:
    # Needs human review
    pass
```

### Budget-Aware Operations
```python
# Before expensive operations:
if intel_budget_can_spend("deep_analysis", 1500)['allowed']:
    # Proceed with deep analysis
    pass
else:
    # Fall back to cheap analysis
    intel_ast_complexity(code)  # 0 tokens
```

---

## BEST PRACTICES

1. **Always check budget before LLM calls**
2. **Use zero-token engines FIRST** (AST, entropy, embeddings)
3. **Let cascade decide depth** - don't force_deep unless critical
4. **Cache is your friend** - same errors don't cost tokens
5. **Track everything** - budget report at session end

---

## RELATED SKILLS
- prism-cognitive-core (Omega equation)
- prism-dev-tools (Background tasks, checkpoints)
- prism-quality-master (Validation)


---

## AUTO-HOOKS (5 tools) - Automatic Triggers

### Hook Management
```python
# List all intelligence hooks
intel_hooks_list()
# → [{id, name, event, tool, priority, enabled}, ...]

# Fire hooks for an event
intel_hooks_fire("on_failure", {
    "error_message": "TypeError: undefined",
    "file_path": "module.py"
})
# → {event, hooks_fired, results}

# Enable/disable specific hooks
intel_hooks_enable("INTEL-REVIEW-001")
intel_hooks_disable("INTEL-ENTROPY-001")

# View execution history
intel_hooks_log(limit=50)
# → {log: [...], total_executions}
```

### Available Hooks
| Hook ID | Event | Tool | Priority |
|---------|-------|------|----------|
| INTEL-BUDGET-001 | on_session_start | intel_budget_status | 9 |
| INTEL-BUDGET-002 | on_session_end | intel_budget_report | 8 |
| INTEL-FAILURE-001 | on_failure | intel_hook_on_failure | 10 |
| INTEL-REVIEW-001 | on_code_write | intel_review_cascade | 5 |
| INTEL-QUALITY-001 | on_code_save | intel_ast_complexity | 6 |
| INTEL-ENTROPY-001 | on_code_save | intel_entropy_quick | 5 |

### Auto-Trigger Flow
```
Session Start
    └── INTEL-BUDGET-001 fires → intel_budget_status()

Code Written (>20 lines)
    └── INTEL-REVIEW-001 fires → intel_review_cascade()

Code Saved (Python)
    ├── INTEL-QUALITY-001 fires → intel_ast_complexity()
    └── INTEL-ENTROPY-001 fires → intel_entropy_quick()

Any Failure/Error
    └── INTEL-FAILURE-001 fires → intel_hook_on_failure()

Session End
    └── INTEL-BUDGET-002 fires → intel_budget_report()
```

---

## PHASE COMPLETION CHECKLIST

When creating new tools/phases, always update:
1. **Skill** - This SKILL.md file
2. **Hooks** - intel_hooks.py for auto-triggers
3. **GSD** - GSD_v12.md for instructions
4. **Memories** - memory_user_edits for context
5. **Roadmap** - PRIORITY_ROADMAP.json for tracking
6. **State** - CURRENT_STATE.json for persistence
7. **Package** - __init__.py for exports
