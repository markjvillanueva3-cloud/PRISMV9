---
name: warn-unsafe-regex
enabled: true
event: file
pattern: (new\s+RegExp\s*\(\s*(?:req\.|request\.|params\.|query\.|user|input|data)|\(\.\*\)\+|\(\.\+\)\+|\(\[^\\]\]\*\+\)\+)
action: warn
---

**Potentially unsafe regular expression detected!**

Two risks: **ReDoS** (catastrophic backtracking from nested quantifiers) and **regex injection** (user input in patterns).

- Avoid nested quantifiers like `(a+)+`; use explicit character classes instead
- Always escape user input before passing to `new RegExp()`, or use `string.includes()` instead
