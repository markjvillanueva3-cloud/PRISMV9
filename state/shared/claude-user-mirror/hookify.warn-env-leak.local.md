---
name: warn-env-leak
enabled: true
event: file
pattern: (console\.\w+\(.*process\.env|print\(.*os\.environ|log(ger)?\.\w+\(.*process\.env|console\.\w+\(.*\.env\b|JSON\.stringify\s*\(\s*process\.env\s*\))
action: warn
---

**Environment variable leak detected in logging!**

Logging environment variables can expose secrets in log files and monitoring systems.

- Never log `process.env` or `os.environ` as a whole; only log specific non-sensitive variables
- Redact values matching KEY, SECRET, TOKEN, PASSWORD patterns before logging
