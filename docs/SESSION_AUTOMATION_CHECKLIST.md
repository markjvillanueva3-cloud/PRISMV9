# PRISM SESSION AUTOMATION CHECKLIST
## MUST RUN THESE - NO EXCEPTIONS

---

## 🚀 SESSION START (Run First!)

```powershell
# Health check - run EVERY session start
py -3 C:\PRISM\scripts\prism_toolkit.py health

# Or quick status
py -3 C:\PRISM\scripts\session_manager.py status
```

---

## 📊 DURING WORK

### Before Making Changes:
```powershell
# Audit what exists BEFORE modifying
py -3 C:\PRISM\scripts\database_auditor.py C:\PRISM\EXTRACTED
```

### Before Replacing Files:
```powershell
# ALWAYS run regression check before replacing
py -3 C:\PRISM\scripts\regression_checker.py old_file.md new_file.md
```

### For Material Work:
```powershell
# Audit materials before changes
py -3 C:\PRISM\scripts\materials_audit_v2.py
```

### For Skill Work:
```powershell
# Validate skills
py -3 C:\PRISM\scripts\skill_validator.py --all C:\PRISM\skills
```

---

## 🏁 SESSION END

```powershell
# End session properly
py -3 C:\PRISM\scripts\session_manager.py end

# Or quick update
py -3 C:\PRISM\scripts\update_state.py complete "Task description"
```

---

## 🔧 SPECIALIZED TOOLS

### Extraction:
```powershell
py -3 C:\PRISM\scripts\extract_module.py <monolith> <start_line> <end_line> <output>
```

### Skill Tree Navigation:
```powershell
py -3 C:\PRISM\scripts\skill_tree_navigator.py --load-for "task description"
py -3 C:\PRISM\scripts\skill_tree_navigator.py --branch L3_DOMAIN/MATERIALS
```

### Code Quality:
```powershell
py -3 C:\PRISM\scripts\code_quality_scanner.py C:\PRISM\EXTRACTED --strict
```

### Progress Dashboard:
```powershell
py -3 C:\PRISM\scripts\progress_dashboard.py
```

---

## ⚠️ ANTI-PATTERNS TO AVOID

| ❌ DON'T | ✅ DO |
|----------|-------|
| Read state file manually | Run `session_manager.py status` |
| Eyeball file comparisons | Run `regression_checker.py` |
| Skip health checks | Run `prism_toolkit.py health` |
| Forget scripts exist | Check this file first! |

---

## 📋 COPY-PASTE QUICK COMMANDS

```powershell
# Session start
py -3 C:\PRISM\scripts\prism_toolkit.py health

# Quick status
py -3 C:\PRISM\scripts\session_manager.py status

# Session end
py -3 C:\PRISM\scripts\update_state.py complete "Done with X"

# Regression check
py -3 C:\PRISM\scripts\regression_checker.py OLD NEW

# Full audit
py -3 C:\PRISM\scripts\prism_toolkit.py audit
```

---

**RULE: If a script exists for the task, USE IT. Don't do manually what automation can do.**
