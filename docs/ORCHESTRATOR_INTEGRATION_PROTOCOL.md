# PRISM ORCHESTRATOR INTEGRATION PROTOCOL
## Auto-Trigger Rules for Multi-Agent Orchestrator
### v1.0 | 2026-01-31

---

## TRIGGER CONDITIONS

The Multi-Agent Orchestrator should be used automatically when ANY of these conditions are met:

### 🎯 ALWAYS USE ORCHESTRATOR FOR:

| Task Type | Trigger Keywords | Why |
|-----------|------------------|-----|
| **New Material** | "add material", "new material", "create material", "Inconel", "titanium", etc. | Requires 127-parameter validation, physics checks |
| **New Machine** | "add machine", "new machine", "create machine" | Requires kinematic validation, capability checks |
| **New Alarm** | "add alarm", "new alarm", "create alarm", "alarm code" | Requires severity validation, cause analysis |
| **Cutting Parameters** | "speeds and feeds for", "cutting parameters", "machining parameters" | Safety-critical calculations |
| **Tool Data** | "add tool", "new cutting tool", "tool geometry" | Physics validation required |
| **Material Enhancement** | "enhance material", "add parameters to", "complete 127 parameters" | Cross-validation needed |

### ⚠️ USE ORCHESTRATOR WHEN:

1. **Safety-Critical Data** - Any data that will be used in CNC machine control
2. **Multi-Source Verification Needed** - Data requires cross-referencing multiple sources
3. **Physics Validation Required** - Kienzle, Taylor, Johnson-Cook calculations involved
4. **Production Code Generation** - TypeScript interfaces, JSON schemas for databases
5. **Quality Gate Enforcement** - When S(x) ≥ 0.70 must be verified

### ❌ DON'T USE ORCHESTRATOR FOR:

- Simple file operations (copy, move, rename)
- Documentation updates (markdown, roadmaps)
- Code refactoring (no new data)
- Session management tasks
- Status checks and queries

---

## DETECTION PATTERNS

```python
ORCHESTRATOR_TRIGGERS = {
    # Material-related
    r"add.*(material|alloy|steel|aluminum|titanium|inconel|hastelloy)": True,
    r"create.*(material|alloy)": True,
    r"new.*(material|alloy)": True,
    r"127.?parameter": True,
    r"kienzle|johnson.?cook|taylor.?tool.?life": True,
    
    # Machine-related
    r"add.*(machine|cnc|mill|lathe|turn)": True,
    r"new.*(machine|cnc)": True,
    
    # Alarm-related
    r"add.*(alarm|error.?code|fault)": True,
    r"new.*(alarm|error)": True,
    r"(fanuc|haas|siemens|mazak|okuma).*(alarm|error)": True,
    
    # Tool-related
    r"add.*(cutting.?tool|end.?mill|insert|drill)": True,
    r"tool.?(geometry|parameters)": True,
    
    # Cutting parameters
    r"(speed|feed|doc|woc).*(for|calculate)": True,
    r"cutting.?parameters": True,
    r"machining.?parameters": True,
    
    # Enhancement
    r"enhance.*material": True,
    r"complete.*parameters": True,
    r"full.*coverage": True
}
```

---

## INTEGRATION METHODS

### Method 1: In-Chat Detection (Recommended)

When I detect an orchestrator trigger, I will:

1. **Announce:** "This task benefits from Multi-Agent Orchestration. Launching 4-agent pipeline..."
2. **Execute:** Run the orchestrator artifact or simulate the 4-agent flow
3. **Report:** Show Ω(x) and S(x) scores with results

### Method 2: Explicit Command

User can explicitly request:
- "Use orchestrator for this"
- "Run multi-agent on this task"
- "/orchestrate [task]"

### Method 3: GSD Integration

Add to `gsd_startup.py`:
```python
def should_use_orchestrator(task: str) -> bool:
    """Check if task should use multi-agent orchestrator"""
    for pattern in ORCHESTRATOR_TRIGGERS:
        if re.search(pattern, task.lower()):
            return True
    return False
```

---

## WORKFLOW INTEGRATION

### Standard Flow (Without Orchestrator)
```
Task → Direct Execution → Result
```

### Orchestrated Flow (With Orchestrator)
```
Task → Trigger Detection → Orchestrator
                              ↓
                    ┌─────────┴─────────┐
                    ↓         ↓         ↓         ↓
                Research → Physics → Code → Safety
                    ↓         ↓         ↓         ↓
                    └─────────┬─────────┘
                              ↓
                    Quality Gate Check
                    (Ω ≥ 0.70, S ≥ 0.70)
                              ↓
                    Final Result + Files
```

---

## QUICK REFERENCE

### When You See This → Use Orchestrator

| User Says | Action |
|-----------|--------|
| "Add Inconel 718 to the database" | ✅ Orchestrator |
| "Create a new FANUC alarm entry" | ✅ Orchestrator |
| "What are the cutting parameters for Ti-6Al-4V?" | ✅ Orchestrator |
| "Update the roadmap" | ❌ Direct |
| "Read the state file" | ❌ Direct |
| "Add full 127-parameter coverage" | ✅ Orchestrator |

---

## MEMORY INSTRUCTION

**Add to Claude's memory:**

> When PRISM tasks involve adding new materials, machines, alarms, tools, or calculating cutting parameters, automatically use the Multi-Agent Orchestrator (4 agents: Research → Physics → Code → Safety) with Ω(x) ≥ 0.70 and S(x) ≥ 0.70 quality gates. Announce orchestrator usage before executing.

---

## IMPLEMENTATION STATUS

- [x] Orchestrator artifact created
- [x] Trigger patterns defined
- [ ] GSD integration script
- [ ] Memory instruction added
- [ ] Auto-detection in sessions

