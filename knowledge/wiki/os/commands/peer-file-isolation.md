---
kind: command
slug: peer-file-isolation
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/peer-file-isolation.md
description: "Cross-reference this chat's working-tree mutations (staged + unstaged + untracked) against the chat-bus file-claim ledger (`state/shared/chat-bus/claims/*.json`). Surface a per-file conflict matrix with recommended action per row (proceed / wait / post / fork). Sharp subset of `/checkin` step 4 — useful before any commit or milestone unit start."
---

# /peer-file-isolation

Cross-reference this chat's working-tree mutations (staged + unstaged + untracked) against the chat-bus file-claim ledger (`state/shared/chat-bus/claims/*.json`). Surface a per-file conflict matrix with recommended action per row (proceed / wait / post / fork). Sharp subset of `/checkin` step 4 — useful before any commit or milestone unit start.

## Source command

See `.claude/commands/peer-file-isolation.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
