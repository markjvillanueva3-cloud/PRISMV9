---
name: warn-race-condition
enabled: true
event: file
pattern: (fs\.exists\s*\(|os\.path\.exists\s*\(.*os\.(remove|unlink|rename)|access\s*\(.*F_OK|if\s*\(.*\.length\s*[>!=].*\).*\.(pop|shift|splice))
action: warn
---

**Potential TOCTOU race condition detected (Time-of-Check to Time-of-Use)**

Checking a condition then acting on it creates a window where state can change between the check and the action.

- Prefer "try and handle failure" (atomic operations) over "check then act"
- Use flags like `{ flag: 'wx' }` or try/except patterns instead of existence checks
