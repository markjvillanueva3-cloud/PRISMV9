---
name: error-learn-ledger
description: PostToolUse capture + PreToolUse prewarn pair that records every hook-block / tool-error and surfaces matches before the agent repeats a known-blocked pattern.
type: project
originSessionId: 2a125756-5751-4129-a9cc-b48330e2b9d8
---
# Error-Learn Ledger

Two hooks paired with a JSONL store:
- `.claude/hooks/error-block-capture.mjs` (PostToolUse Write/Edit/MultiEdit/Bash) — appends to ledger when `tool_response.decision === "block"` or `tool_response.error` present
- `.claude/hooks/error-block-prewarn.mjs` (PreToolUse same matchers) — scans incoming content for 21 trigger tokens; emits warning when match found in past blocks

**Storage:** `mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl` — bounded at 500 entries, oldest dropped on overflow.

**Trigger tokens** the prewarn watches:
- `eval`, `Function(`, `execSync`, `spawnSync`
- `secret`, `token`, `password`, `apikey`
- `toBeDefined`, `toBeUndefined`, `toBeTruthy`, `toBeFalsy`
- `expect(true)`, `expect(1)`, `describe.skip`, `it.skip`
- `TODO`, `FIXME`, `@ts-nocheck`, `@ts-ignore`
- `rm -rf`, `git push --force`, `--no-verify`

**Why it exists:** the same blocks were repeating session-to-session (especially `toBeUndefined()` in tests, eval-shaped regex in engines). The capture/prewarn pair forces learning across sessions.

**Skill:** `/error-learn-review` — inspect ledger, propose soft-warn hook drafts (drafts NEVER auto-promote to hard-blocks).

**Helper API** (`.claude/helpers/error-learn-store.mjs`): `recordEvent`, `readAll`, `searchSimilar`, `proposeHookDraft`, `clearLedger`, `fingerprint`, `fileSuffix`.

**Tests:** `.claude/helpers/error-learn-store.test.mjs` (21 tests).

**Adopted from** `everything-claude-code` instinct/observation pattern (MIT, 2026-04-27), specialized for hook-block events. Shipped commit `9e422902b`.
