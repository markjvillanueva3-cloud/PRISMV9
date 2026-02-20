# PRISM Context Auto-Loader v1.0

## Concept: Layered Context Loading

### Layer 0: Project Instructions (Always Loaded)
**280 tokens** - Bootstrap essentials only

### Layer 1: Session Context (Auto-loaded at start)
```
Triggered by: Any message in new session
Loads: prism_gsd_core (365 lines)
Result: Full instructions in context
Cost: 1 tool call
```

### Layer 2: Domain Context (On-Demand)
```
Triggered by: Task-specific keywords
Examples:
  - "calculate force" → prism-material-physics skill
  - "alarm PS0001" → prism-fanuc-programming skill
  - "design architecture" → prism-code-master skill
  
Loads: Relevant skill (avg 500 lines)
Cost: 1 tool call per domain
```

### Layer 3: Deep Context (Explicit)
```
Triggered by: User request or complexity signal
Examples:
  - "Review all hooks" → prism:hook_list + hook docs
  - "Material deep dive" → Material registry + formulas
  
Loads: Comprehensive reference (1000+ lines)
Cost: 2-3 tool calls
```

## Token Efficiency Matrix

| Context Level | Tokens | When | Tools |
|---------------|--------|------|-------|
| Bootstrap | 280 | Always | 0 |
| Session | +1,200 | Auto at start | 1 |
| Domain | +800 | Task-triggered | 1-2 |
| Deep | +2,000 | User-requested | 3-5 |

**Total Max:** ~4,300 tokens (vs 8,000+ current embedded approach)
**Efficiency Gain:** 46% token savings

## Smart Triggers

### Calculation Tasks
```
Keywords: "calculate", "compute", "force", "speed", "feed"
→ Load: prism-material-physics (formulas + coefficients)
→ Cost: 1 tool call, 800 tokens
```

### Development Tasks
```
Keywords: "code", "implement", "fix", "refactor", "design"
→ Load: prism-code-master (patterns + architecture)
→ Cost: 1 tool call, 1,000 tokens
```

### Data Query Tasks
```
Keywords: "search", "find", "lookup", "list"
→ Load: Registry status + search tools
→ Cost: 1 tool call, 400 tokens
```

## Implementation Plan

### Phase 1: Minimal Bootstrap (Immediate)
Replace current verbose instructions with 280-token version.
All context loaded via prism_gsd_core at session start.

### Phase 2: Smart Detection (Next)
Add keyword detection to auto-load relevant skills.
Reduces unnecessary context in simple sessions.

### Phase 3: Predictive Loading (Future)
ML-based prediction of needed context.
Pre-loads likely-needed skills based on conversation flow.

---
**Current State:** Manual loading via gsd_core
**Proposed State:** Auto-loading based on task type
**Benefit:** 46% token savings with zero quality loss