---
name: warn-eval-exec
enabled: true
event: file
pattern: (\beval\s*\(|new\s+Function\s*\(|os\.system\s*\()
action: warn
---

**Dynamic code execution pattern detected -- injection risk!**

Executing strings as code is one of the most dangerous patterns in software engineering.

- Use data-driven alternatives: bracket notation, `JSON.parse()`, `ast.literal_eval()`, `subprocess.run()` with arrays
- If constructing a string to interpret as code, refactor to avoid dynamic execution entirely
