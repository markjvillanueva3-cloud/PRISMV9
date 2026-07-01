---
name: warn-path-traversal
enabled: true
event: file
pattern: (path\.join\(.*req\.|path\.resolve\(.*req\.|fs\.(read|write|unlink|mkdir|rmdir).*req\.(params|query|body)|open\(.*request\.(GET|POST|args|form)|file_get_contents\(\$_(GET|POST|REQUEST))
action: warn
---

**Possible path traversal vulnerability detected! (OWASP A01:2021)**

User input in file system paths allows attackers to read/write arbitrary files via `../` sequences.

- Strip path components with `path.basename()` / `Path.name` before joining
- Resolve to absolute path and verify it stays within the intended directory
