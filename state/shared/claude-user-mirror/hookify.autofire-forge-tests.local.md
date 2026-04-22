---
name: autofire-forge-tests
enabled: true
event: prompt
pattern: (add\s+(more\s+)?tests?|missing\s+tests?|test\s+coverage|need\s+tests?\s+for|write\s+tests?\s+for|generate\s+tests?|no\s+tests?\s+(for|exist)|untested|increase\s+coverage)
action: warn
---

Use `/forge-tests` for test gap discovery and generation. Invoke with `skill: "forge-tests"`. This analyzes code coverage, identifies untested paths, generates test files following existing patterns (vitest/jest/pytest), and validates they pass.
