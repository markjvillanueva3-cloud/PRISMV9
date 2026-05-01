---
name: warn-error-swallowing
enabled: true
event: file
pattern: (catch\s*\([^)]*\)\s*\{\s*\}|except:\s*pass|rescue\s*=>?\s*nil|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\))
action: warn
---

**Empty error handler detected -- errors are being silently swallowed!**

Silent failures cause bugs that are nearly impossible to diagnose.

- Always log or re-throw caught errors; catch specific exception types
- If intentionally ignoring, add a comment explaining *why*
