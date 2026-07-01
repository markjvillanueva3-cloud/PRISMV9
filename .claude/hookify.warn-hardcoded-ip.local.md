---
name: warn-hardcoded-ip
enabled: true
event: file
action: warn
conditions:
  - field: new_text
    operator: regex_match
    pattern: ['"](?!127\.0\.0\.1|0\.0\.0\.0|localhost|255\.255)(\d{1,3}\.){3}\d{1,3}['"]
---

**Hardcoded IP address detected!**

IP addresses in source code break across environments (dev/staging/prod).

- Use environment variables or config files for host addresses
- Only `127.0.0.1` and `0.0.0.0` are acceptable inline
