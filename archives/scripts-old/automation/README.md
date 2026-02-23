# PRISM Automation Scripts

This folder contains automation tools to streamline PRISM development.

## Quick Commands

```powershell
# Auto-context injection (for session start)
py -3 C:\PRISM\scripts\automation\auto_context.py
py -3 C:\PRISM\scripts\automation\auto_context.py --clipboard  # Copy to clipboard

# Template generation
py -3 C:\PRISM\scripts\automation\template_generator.py skill my-skill-name
py -3 C:\PRISM\scripts\automation\template_generator.py module MyModule
py -3 C:\PRISM\scripts\automation\template_generator.py database materials
py -3 C:\PRISM\scripts\automation\template_generator.py test MyModule

# Git integration
py -3 C:\PRISM\scripts\automation\git_manager.py init       # Initialize repo
py -3 C:\PRISM\scripts\automation\git_manager.py status     # Show status
py -3 C:\PRISM\scripts\automation\git_manager.py commit "Message"
py -3 C:\PRISM\scripts\automation\git_manager.py snapshot   # Create tagged snapshot

# Script cleanup
py -3 C:\PRISM\scripts\automation\script_cleanup.py --scan      # Find versioned scripts
py -3 C:\PRISM\scripts\automation\script_cleanup.py --dry-run   # Preview archive
py -3 C:\PRISM\scripts\automation\script_cleanup.py --archive   # Archive old versions
```

## Scripts

| Script | Purpose |
|--------|---------|
| `auto_context.py` | Generate session context for Claude |
| `template_generator.py` | Create skill/module/database templates |
| `git_manager.py` | Git version control automation |
| `script_cleanup.py` | Archive old versioned scripts |

## Integration with prism.py

These commands are also available through the main PRISM CLI:

```powershell
py -3 C:\PRISM\scripts\prism.py context      # Auto-context
py -3 C:\PRISM\scripts\prism.py template skill my-skill
py -3 C:\PRISM\scripts\prism.py git status
py -3 C:\PRISM\scripts\prism.py cleanup --scan
```

## Recommended Workflow

### Session Start
```powershell
py -3 C:\PRISM\scripts\automation\auto_context.py --clipboard
# Paste context into Claude conversation
```

### During Development
```powershell
# Create new skill
py -3 C:\PRISM\scripts\automation\template_generator.py skill prism-new-feature

# Commit progress
py -3 C:\PRISM\scripts\automation\git_manager.py commit "Added new feature"
```

### Session End
```powershell
# Create snapshot before ending
py -3 C:\PRISM\scripts\automation\git_manager.py snapshot --name "session-complete"

# Or auto-commit
py -3 C:\PRISM\scripts\automation\git_manager.py auto
```

### Maintenance
```powershell
# Clean up old script versions periodically
py -3 C:\PRISM\scripts\automation\script_cleanup.py --archive
```
