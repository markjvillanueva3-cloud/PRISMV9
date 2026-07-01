# PRISM RESOURCE ACTIVATION PROTOCOL v1.0
## "IF IT EXISTS, USE IT EVERYWHERE" - Enforced

---

## THE PROBLEM

```
CREATE resource → Feel accomplished → Never use it again → Wasted effort

Examples of orphaned resources:
- Hooks defined but rarely triggered
- Skills exist but few loaded per session
- Formulas documented but rarely applied
- BAYES-003 exists for learning, never called
- F-PSI-001 ILP optimizer exists, rarely invoked
```

---

## THE SOLUTION: 4-Layer Activation System

### LAYER 1: RESOURCE REGISTRY (What Exists)

```json
{
  "registry_version": "1.0",
  "last_scan": "[SESSION_TIMESTAMP]",
  "resources": {
    "hooks": {
      "total": 180,
      "categories": {
        "SYS-*": 147,
        "CTX-*": 18,
        "BAYES-*": 3,
        "OPT-*": 3,
        "MULTI-*": 3,
        "GRAD-*": 3,
        "RL-*": 3
      }
    },
    "skills": { "total": 135, "mcp_uploaded": 43 },
    "agents": { "total": 64 },
    "formulas": { "total": 22 },
    "patterns": { "total": 8 }
  }
}
```

### LAYER 2: UTILIZATION TRACKING (What Gets Used)

```json
{
  "session_id": "[CURRENT_SESSION]",
  "utilization": {
    "hooks_triggered": ["SYS-LAW1", "BAYES-001"],
    "hooks_available_but_unused": ["BAYES-002", "BAYES-003", "OPT-*", "..."],
    "skills_loaded": ["prism-quick-start", "prism-gsd-core"],
    "skills_relevant_but_unloaded": ["prism-cognitive-core", "..."],
    "formulas_applied": ["Ω(x)"],
    "formulas_applicable_but_unused": ["S(x)", "Kienzle", "..."]
  },
  "utilization_score": 0.12,  // 12% of available resources used
  "peak_potential": 0.85      // Could have used 85%
}
```

### LAYER 3: PEAK PERFORMANCE CHECKLIST (What SHOULD Be Used)

```markdown
## PEAK PERFORMANCE CHECKLIST - Every Session

### COGNITIVE (Always Active)
□ BAYES-001: Prior initialization at session start
□ BAYES-002: Change detection before any file modification
□ BAYES-003: Learning from errors (if any errors occurred)
□ OPT-001: Resource optimization for task
□ MULTI-001: Multi-objective balancing

### QUALITY (Every Output)
□ S(x) ≥ 0.70: Safety score computed
□ Ω(x) ≥ 0.70: Quality score computed
□ R(x): Reasoning completeness checked
□ C(x): Code quality checked (if code)
□ P(x): Process adherence checked

### CONTEXT (Session Management)
□ CTX-CACHE-*: Stable prefix maintained
□ CTX-MEM-*: State externalized properly
□ CTX-FOCUS-*: todo.md updated
□ CTX-ERR-*: Errors preserved (if any)

### VALIDATION (Before Completion)
□ G1-G9: All 9 gates checked
□ Anti-regression: Size comparison done
□ Evidence: Level 3+ provided
```

### LAYER 4: AUTO-INJECTION (Force Usage)

```python
# PRISM_AUTO_INJECT.py - Runs at session start

PEAK_RESOURCES = {
    "always_load": [
        "prism-cognitive-core",      # 5 AI/ML patterns
        "prism-master-equation",     # Ω(x) computation
        "prism-safety-framework",    # S(x) computation
    ],
    "always_trigger": [
        "BAYES-001",  # Initialize priors
        "OPT-001",    # Optimize resource selection
    ],
    "always_compute": [
        "S(x)",       # Safety score
        "Ω(x)",       # Quality score
    ],
    "always_check": [
        "anti_regression",
        "evidence_level",
    ]
}

def inject_peak_resources(context: dict) -> dict:
    """
    Called at START of every session.
    Ensures peak resources are active, not optional.
    """
    # Load cognitive patterns
    for skill in PEAK_RESOURCES["always_load"]:
        context = load_skill_into_context(skill, context)
    
    # Trigger initialization hooks
    for hook in PEAK_RESOURCES["always_trigger"]:
        trigger_hook(hook, context)
    
    # Inject quality gates
    context["quality_gates"] = PEAK_RESOURCES["always_compute"]
    context["validation_gates"] = PEAK_RESOURCES["always_check"]
    
    return context
```

---

## NEW HOOKS FOR ACTIVATION

### RES-ACT-001: Resource Creation Registration
```
TRIGGER: Any new resource created (hook, skill, formula, agent)
ACTION: 
  1. Add to RESOURCE_REGISTRY.json
  2. Determine utilization category (always/situational/rare)
  3. If category="always" → Add to PEAK_RESOURCES
  4. Log creation with expected usage pattern
```

### RES-ACT-002: Session Start Injection
```
TRIGGER: Session begins
ACTION:
  1. Load PEAK_RESOURCES automatically
  2. Run F-PSI-001 for task-specific resources
  3. Display "Resources Active" summary
  4. Set utilization tracking to ON
```

### RES-ACT-003: Utilization Check
```
TRIGGER: Every 5 tool calls OR checkpoint
ACTION:
  1. Compute current utilization score
  2. Identify unused-but-relevant resources
  3. If score < 0.50 → WARN: "Only using X% of available resources"
  4. Suggest specific resources to activate
```

### RES-ACT-004: Orphan Detection
```
TRIGGER: End of session
ACTION:
  1. Scan all resources
  2. Flag any not used in last 5 sessions
  3. Generate "Orphan Report"
  4. Suggest integration or deprecation
```

### RES-ACT-005: Peak Enforcement
```
TRIGGER: Before any output marked "complete"
ACTION:
  1. Verify PEAK_RESOURCES were all used
  2. If S(x) not computed → BLOCK
  3. If Ω(x) not computed → WARN
  4. If BAYES-* not triggered → WARN
  5. Log utilization for this task
```

---

## IMPLEMENTATION: Session 0.0 (NEW - Highest Priority)

### Session 0.0: Resource Activation Infrastructure (2 hours)

| # | Task | Est | Output |
|---|------|-----|--------|
| 1 | Create RESOURCE_REGISTRY.json with all resources | 20m | Registry file |
| 2 | Create PEAK_RESOURCES.json (always-use list) | 15m | Peak list |
| 3 | Create utilization_tracker.py | 25m | Tracker module |
| 4 | Implement RES-ACT-001 (registration hook) | 15m | Hook |
| 5 | Implement RES-ACT-002 (session injection) | 15m | Hook |
| 6 | Implement RES-ACT-003 (utilization check) | 15m | Hook |
| 7 | Implement RES-ACT-004 (orphan detection) | 10m | Hook |
| 8 | Implement RES-ACT-005 (peak enforcement) | 10m | Hook |
| 9 | Update gsd_startup.py to call inject_peak_resources | 10m | Integration |
| 10 | Test with mock session | 10m | Test report |

**NEW HOOKS: 5 (RES-ACT-001 through RES-ACT-005)**
**TOTAL HOOKS: 185 (180 + 5)**

---

## PEAK RESOURCES LIST (v1.0)

### ALWAYS LOAD (Every Session)
```
SKILLS:
- prism-cognitive-core       # 5 AI/ML patterns (BAYES, OPT, MULTI, GRAD, RL)
- prism-master-equation      # Ω(x) computation
- prism-safety-framework     # S(x) computation  
- prism-code-perfection      # C(x) computation
- prism-quick-start          # Session protocol

FORMULAS:
- Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
- S(x) safety score
- F-PSI-001 ILP combination

HOOKS (Auto-Trigger):
- BAYES-001: Prior initialization
- OPT-001: Resource optimization
- RES-ACT-002: Session injection
- RES-ACT-003: Utilization tracking
```

### ALWAYS COMPUTE (Every Output)
```
- S(x) ≥ 0.70 (HARD BLOCK if failed)
- Ω(x) ≥ 0.70 (WARN if failed)
- Evidence level ≥ L3
- Anti-regression check
```

### ALWAYS CHECK (Before "Done")
```
- G1-G9 validation gates
- BAYES-002 change detection (if files modified)
- Size comparison (if replacing files)
```

---

## VISUAL: Resource Activation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SESSION START                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ RES-ACT-002     │───▶│ PEAK_RESOURCES  │───▶│ Context Ready   │ │
│  │ Session Inject  │    │ Auto-Loaded     │    │ at Peak Power   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│         │                                              │            │
│         ▼                                              ▼            │
│  ┌─────────────────┐                          ┌─────────────────┐  │
│  │ BAYES-001       │                          │ OPT-001         │  │
│  │ Init Priors     │                          │ Optimize Select │  │
│  └─────────────────┘                          └─────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     DURING SESSION                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Every 5 Tool Calls:                                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ RES-ACT-003     │───▶│ Utilization     │───▶│ "Using 45% of   │ │
│  │ Util Check      │    │ Score: 0.45     │    │  resources"     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SUGGESTION: "Consider activating BAYES-003 for error        │   │
│  │              learning, you had 2 errors this session"       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     BEFORE OUTPUT                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ RES-ACT-005     │───▶│ S(x) computed?  │───▶│ Ω(x) computed?  │ │
│  │ Peak Enforce    │    │ YES ✓           │    │ YES ✓           │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│         │                       │                      │            │
│         │              ┌───────▼───────┐      ┌───────▼───────┐   │
│         │              │ S(x) < 0.70?  │      │ Ω(x) < 0.70?  │   │
│         │              │ → HARD BLOCK  │      │ → WARN        │   │
│         │              └───────────────┘      └───────────────┘   │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ OUTPUT APPROVED - All peak resources verified                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     SESSION END                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ RES-ACT-004     │───▶│ Orphan Scan     │───▶│ Report:         │ │
│  │ Orphan Detect   │    │ 5 sessions      │    │ 12 unused       │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## UPDATED PHASE STRUCTURE

```
PHASE 0.0: Resource Activation (2 hours) ← NEW, HIGHEST PRIORITY
PHASE 0.1: KV-Cache Stable Prefix (3 hours)
PHASE 0.2: Append-Only State (3 hours)
... rest of phases ...
```

---

## QUICK REFERENCE: What Gets Auto-Used Now

```
┌─────────────────────────────────────────────────────────────────┐
│  PRISM PEAK PERFORMANCE MODE                                    │
│  "Every resource that should be used, IS used"                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AUTO-LOADED:           AUTO-TRIGGERED:      AUTO-COMPUTED:     │
│  ├─ cognitive-core      ├─ BAYES-001         ├─ S(x) ≥ 0.70    │
│  ├─ master-equation     ├─ OPT-001           ├─ Ω(x) ≥ 0.70    │
│  ├─ safety-framework    ├─ RES-ACT-002       ├─ Evidence ≥ L3  │
│  ├─ code-perfection     └─ RES-ACT-003       └─ Anti-regress   │
│  └─ quick-start                                                 │
│                                                                 │
│  ENFORCED BEFORE OUTPUT:                                        │
│  ├─ S(x) computed? (HARD BLOCK if not)                         │
│  ├─ Ω(x) computed? (WARN if not)                               │
│  ├─ BAYES-002 ran? (if files changed)                          │
│  └─ G1-G9 gates passed?                                        │
│                                                                 │
│  TRACKED:                                                       │
│  ├─ Utilization score (target: >50%)                           │
│  ├─ Orphan resources (flag if unused 5+ sessions)              │
│  └─ Peak resource usage (100% = operating at full power)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**v1.0 | 2026-02-01 | 5 new hooks | Peak Performance Enforced**
