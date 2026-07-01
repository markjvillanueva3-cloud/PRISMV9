---
name: warn-sensitive-files
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.env$|\.env\.|[/\\]credentials\.|[/\\]secrets\.|\.pem$|\.key$|id_rsa|\.p12$|\.pfx$|kubeconfig
---

**Sensitive file modification detected**

This file likely contains secrets, keys, or credentials.

- Ensure it is in `.gitignore` and no plaintext secrets are hardcoded
- Use environment variables or a secrets manager; set file permissions to 600 for keys/certs
