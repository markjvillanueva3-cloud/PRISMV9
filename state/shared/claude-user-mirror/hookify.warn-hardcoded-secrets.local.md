---
name: warn-hardcoded-secrets
enabled: true
event: file
pattern: (api[_-]?key|api[_-]?secret|password|token|secret[_-]?key)\s*[:=]\s*['"][A-Za-z0-9+/=_\-]{8,}['"]
action: warn
---

**Possible hardcoded secret or API key detected!**

Use environment variables or a secrets manager instead of hardcoding credentials.

- Move secrets to `.env` (ensure it's in `.gitignore`) or a vault/secrets manager
- If already committed, rotate the credential immediately
