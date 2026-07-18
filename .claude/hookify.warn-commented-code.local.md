---
name: warn-commented-code
enabled: true
event: file
pattern: (\/\/\s*(const|let|var|function|class|return|import|export)\s+\w|#\s*(def|class|import|from|return)\s+\w)
action: warn
---

**Commented-out code detected**

Commented code creates noise and maintenance burden. Version control already preserves history.

- Delete it -- `git log` has the history. If needed, reference the approach in a comment instead
- Exception: short inline examples in docs/tests are fine
