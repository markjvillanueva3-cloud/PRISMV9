---
name: autofire-test
enabled: true
event: prompt
pattern: (run\s+(the\s+)?tests?|test\s+(this|it|these|the\s+changes|my\s+changes)|does\s+(it|this)\s+pass|check\s+if\s+(it|tests?)\s+pass|make\s+sure\s+tests?\s+pass|verify\s+(the\s+)?tests?|execute\s+tests?)
action: warn
---

Use `/test` for smart test execution. Invoke with `skill: "test"`. This auto-detects the test framework (vitest/jest/pytest/node --test), runs relevant tests based on changed files, and caps output for token efficiency.
