---
kind: command
slug: scrutiny-replay
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/scrutiny-replay.md
description: "Read a previous entry from `mcp-server/data/state/SCRUTINY_LEDGER.json` and re-emit its `opusReviewerPrompt` (arm A) + `opusReviewerPromptB` (arm B) so the operator (or a subagent) can re-dispatch the same review against fresh context. Useful for reviewer drift detection, post-mortems on a passed-but-buggy commit, or replaying a stale ledger entry after a tool/agent upgrade."
---

# /scrutiny-replay

Read a previous entry from `mcp-server/data/state/SCRUTINY_LEDGER.json` and re-emit its `opusReviewerPrompt` (arm A) + `opusReviewerPromptB` (arm B) so the operator (or a subagent) can re-dispatch the same review against fresh context. Useful for reviewer drift detection, post-mortems on a passed-but-buggy commit, or replaying a stale ledger entry after a tool/agent upgrade.

## Source command

See `.claude/commands/scrutiny-replay.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
