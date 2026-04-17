---
name: warn-lint-suppression
enabled: true
event: file
pattern: (@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable|eslint-disable-next-line|# noqa|# type:\s*ignore|# pylint:\s*disable|# noinspection|@SuppressWarnings|// nolint)
action: warn
---

**Lint/type-check suppression detected!**

Suppressing linter or type-checker errors hides real issues instead of fixing them.

- Fix the underlying error if possible; prefer `@ts-expect-error` over `@ts-ignore`
- If suppression is truly needed, add a comment explaining **why** on the preceding line
