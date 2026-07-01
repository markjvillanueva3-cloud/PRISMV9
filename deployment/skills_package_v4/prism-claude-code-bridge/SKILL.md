---
name: prism-claude-code-bridge
description: |
  Bridge between Claude and PRISM Python scripts for automated execution.
  Level 2 Workflow skill - enables Claude to execute Python scripts via
  Desktop Commander or bash tools. Provides script registry access and
  command templates for all 52 registered scripts across 8 categories.
---

# PRISM CLAUDE CODE BRIDGE v1.0
## Script Execution Interface | 52 Scripts | 8 Categories
### Level 2 Workflow | Updated: 2026-01-30

---

# PURPOSE

Enables Claude to execute PRISM Python scripts programmatically:
- Access SCRIPT_REGISTRY.json for available scripts
- Use quick commands for common operations
- Execute scripts via Desktop Commander or bash tools
- Parse script output for automated workflows

---

# QUICK COMMANDS

## Session Management
```powershell
# Start session
py -3 C:\PRISM\scripts\session_manager.py start <session_id>

# Check status
py -3 C:\PRISM\scripts\session_manager.py status

# End session
py -3 C:\PRISM\scripts\session_manager.py end

# Update state
py -3 C:\PRISM\scripts\update_state.py complete "Description"
py -3 C:\PRISM\scripts\update_state.py next "ID" "Name"
```

## Orchestration
```powershell
# Intelligent ILP-optimized execution
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task description"

# Swarm pattern execution
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm deep_extraction_swarm "Task"

# Single agent execution
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --single architect "Task"

# Ralph improvement loop
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph validator "Task" 3

# List all resources
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --list
```

## Toolkit
```powershell
# System health check
py -3 C:\PRISM\scripts\prism_toolkit.py health

# Full audit
py -3 C:\PRISM\scripts\prism_toolkit.py audit

# Dashboard view
py -3 C:\PRISM\scripts\prism_toolkit.py dashboard
```

## Validation
```powershell
# Validate all skills
py -3 C:\PRISM\scripts\skill_validator.py --all C:\PRISM\skills

# Regression check
py -3 C:\PRISM\scripts\regression_checker.py old_file.md new_file.md

# Code quality scan
py -3 C:\PRISM\scripts\code_quality_scanner.py C:\PRISM\scripts --strict
```

## Materials
```powershell
# Audit materials
py -3 C:\PRISM\scripts\materials_audit_v2.py

# Verify materials DB
py -3 C:\PRISM\scripts\verify_materials_db.py

# Enhance materials
py -3 C:\PRISM\scripts\materials_bulk_enhancer_v2.py
```

## Extraction
```powershell
# Extract module from monolith
py -3 C:\PRISM\scripts\extract_module.py <monolith_path> <start_line> <end_line> <output_path>

# Extract constants
py -3 C:\PRISM\scripts\extract_prism_constants.py
```

---

# SCRIPT CATEGORIES

| Category | Scripts | Purpose |
|----------|---------|---------|
| session | 3 | Session and state management |
| extraction | 3 | Monolith extraction tools |
| materials | 5 | Materials database tools |
| validation | 4 | Validation and quality tools |
| audit | 3 | Audit and analysis tools |
| orchestration | 4 | Orchestration and coordination |
| testing | 3 | Testing and verification |
| building | 3 | Database building tools |

---

# EXECUTION PATTERNS

## Pattern 1: Direct Execution
```python
# Using Desktop Commander
Desktop Commander:start_process
command: "py -3 C:\PRISM\scripts\script_name.py args"
timeout_ms: 60000
```

## Pattern 2: With Output Capture
```python
# Start process
Desktop Commander:start_process -> get PID

# Read output
Desktop Commander:read_process_output
pid: <PID>
timeout_ms: 30000
```

## Pattern 3: Interactive REPL
```python
# Start Python REPL
Desktop Commander:start_process
command: "py -3 -i"

# Send commands
Desktop Commander:interact_with_process
pid: <PID>
input: "import json; print(json.load(open('file.json')))"
```

---

# SCRIPT REGISTRY ACCESS

Location: `C:\PRISM\data\coordination\SCRIPT_REGISTRY.json`

Structure:
```json
{
  "scriptRegistry": {
    "categories": {
      "<category>": {
        "scripts": {
          "<script_name>": {
            "path": "C:\\PRISM\\scripts\\script.py",
            "commands": ["cmd1", "cmd2"],
            "trigger": "keyword",
            "description": "What it does"
          }
        }
      }
    },
    "quickCommands": {
      "health": "py -3 C:\\PRISM\\scripts\\prism_toolkit.py health"
    }
  }
}
```

---

# TRIGGER PATTERNS

| Trigger | Script | Command |
|---------|--------|---------|
| "run health" | prism_toolkit | health |
| "audit system" | prism_toolkit | audit |
| "start session" | session_manager | start |
| "end session" | session_manager | end |
| "check state" | update_state | stats |
| "validate skills" | skill_validator | --all |
| "regression check" | regression_checker | <old> <new> |
| "extract module" | extract_module | <args> |
| "orchestrate task" | prism_unified_v6 | --intelligent |

---

# ERROR HANDLING

## Script Not Found
```
If script doesn't exist:
1. Check SCRIPT_REGISTRY.json for correct path
2. Verify file exists at path
3. Report missing script to user
```

## Execution Failure
```
If script fails:
1. Capture error output
2. Check for missing dependencies (requirements.txt)
3. Verify Python version (py -3)
4. Report error with context
```

## Timeout
```
If script times out:
1. Check if script is hung
2. Increase timeout_ms if needed
3. Consider breaking into smaller tasks
```

---

# INTEGRATION WITH ORCHESTRATOR

The prism-skill-orchestrator v6.0 uses this bridge to:
1. Execute validation scripts before task completion
2. Run regression checks on file updates
3. Trigger swarm patterns for complex tasks
4. Update state files automatically

---

# PATHS

```
SCRIPT_REGISTRY: C:\PRISM\data\coordination\SCRIPT_REGISTRY.json
SCRIPTS_DIR:     C:\PRISM\scripts\
ORCHESTRATOR:    C:\PRISM\scripts\prism_unified_system_v6.py
TOOLKIT:         C:\PRISM\scripts\prism_toolkit.py
STATE:           C:\PRISM\state\CURRENT_STATE.json
```

---

**v1.0 | 2026-01-30 | Script Execution Bridge**
