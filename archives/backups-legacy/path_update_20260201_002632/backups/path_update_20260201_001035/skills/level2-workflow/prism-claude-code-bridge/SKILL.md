# PRISM-CLAUDE-CODE-BRIDGE
## Script Execution Bridge | Level 2 Workflow
### Version 1.0 | Claude Code Integration

---

## SECTION 1: OVERVIEW

### Purpose
Provides the bridge between PRISM skills and Python script execution via Desktop Commander. Enables Claude to invoke orchestrators, run validation scripts, and execute Ralph loops programmatically.

### When to Use
- Executing prism_unified_system_v6.py commands
- Running validation scripts
- Launching Ralph improvement loops
- Batch processing tasks

---

## SECTION 2: EXECUTION PATTERNS

### Pattern 1: Intelligent Swarm
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task description"
```

### Pattern 2: Specific Swarm
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm deep_extraction_swarm "Task"
```

### Pattern 3: Single Agent
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --single architect "Design request"
```

### Pattern 4: Ralph Loop
```powershell
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph validator "Validate output" 3
```

### Pattern 5: Manufacturing Analysis
```powershell
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Operation"
```

---

## SECTION 3: INVOCATION VIA DESKTOP COMMANDER

### Standard Invocation
```python
# Using Desktop Commander start_process
result = start_process(
    command="py -3 C:\\PRISM\\scripts\\prism_unified_system_v6.py --intelligent \"Task\"",
    timeout_ms=300000  # 5 minutes
)
```

### Reading Output
```python
output = read_process_output(pid=result.pid, timeout_ms=10000)
```

### Interaction (for Ralph loops)
```python
# Send input to running process
interact_with_process(pid=pid, input="continue", timeout_ms=5000)
```

---

## SECTION 4: PARAMETER PASSING

### Task Context Serialization
```python
import json

task_context = {
    "description": "Extract material data from monolith",
    "domains": ["extraction", "materials"],
    "operations": ["extract", "validate"],
    "files": ["C:/PRISM/data/materials/steel.json"],
    "outputPath": "C:/PRISM/output/"
}

# Pass as JSON argument
command = f'py -3 script.py --context \'{json.dumps(task_context)}\''
```

### File-Based Context
```python
# Write context to temp file
context_file = "C:/PRISM/temp/task_context.json"
with open(context_file, 'w') as f:
    json.dump(task_context, f)

# Script reads from file
command = f'py -3 script.py --context-file {context_file}'
```

---

## SECTION 5: OUTPUT CAPTURE

### Standard Output
```python
# Script writes to stdout
print(json.dumps({"status": "success", "result": {...}}))

# Claude captures via read_process_output
output = read_process_output(pid)
result = json.loads(output.stdout)
```

### File-Based Output
```python
# Script writes to output file
output_file = "C:/PRISM/output/result.json"

# Claude reads file after completion
with open(output_file) as f:
    result = json.load(f)
```

---

## SECTION 6: ERROR HANDLING

### Process Timeout
```python
try:
    result = start_process(command, timeout_ms=300000)
except TimeoutError:
    # Kill process and report
    force_terminate(pid)
    log_error("Script timed out")
```

### Script Errors
```python
# Scripts should exit with error code
import sys
if error:
    print(json.dumps({"error": str(error)}), file=sys.stderr)
    sys.exit(1)
```

### Retry Logic
```python
max_retries = 3
for attempt in range(max_retries):
    try:
        result = execute_script(command)
        break
    except Exception as e:
        if attempt == max_retries - 1:
            raise
        time.sleep(2 ** attempt)  # Exponential backoff
```

---

## SECTION 7: AVAILABLE SCRIPTS

### Orchestrators
| Script | Purpose |
|--------|---------|
| prism_unified_system_v6.py | Main orchestrator with 64 agents |
| prism_orchestrator_v2.py | Manufacturing analysis (8 experts) |

### Validation Scripts
| Script | Purpose |
|--------|---------|
| validate_formulas.py | Formula registry validation |
| validate_materials.py | Material database validation |
| regression_tests.py | Anti-regression testing |

### Utilities
| Script | Purpose |
|--------|---------|
| material_enhancer.py | Batch material enhancement |
| run_full_suite.py | Complete test suite |

---

## SECTION 8: QUICK REFERENCE

### Command Templates
```powershell
# Intelligent swarm
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "TASK"

# Named swarm
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm SWARM_NAME "TASK"

# Single agent
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --single AGENT "TASK"

# Ralph loop (N iterations)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph AGENT "TASK" N

# List agents
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --list
```

### Timeout Guidelines
| Task Type | Timeout |
|-----------|---------|
| Quick lookup | 30s |
| Single agent | 60s |
| Small swarm | 180s |
| Large swarm | 300s |
| Ralph loop | 600s |

---

**Version:** 1.0 | **Date:** 2026-01-27 | **Level:** 2 (Workflow)
