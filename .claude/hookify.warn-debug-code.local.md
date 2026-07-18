---
name: warn-debug-code
enabled: true
event: file
pattern: (console\.log\(|debugger;|print\(.*#\s*debug|breakpoint\(\)|pdb\.set_trace\(\)|binding\.pry|var_dump\(|\bdd\()
action: warn
---

**Debug statement detected in code**

This debug/logging statement likely should not ship to production.

- Replace with a proper logger or remove before committing
- If intentional, add a comment explaining why
