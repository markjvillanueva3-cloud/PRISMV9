---
kind: command
slug: staged-sanity
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/staged-sanity.md
description: "Manual pre-commit dry-run that combines four checks into one report — (1) peer-claim conflicts on staged files (via /peer-file-isolation), (2) envelope drift on milestones touched by staged files, (3) lane discipline (does the staged scope match this chat's slot + branch?), (4) untracked-but-related-files surface (catch un-staged tests / specs). Surfaces a single PROCEED / BLOCK verdict. Companion to (not replacement for) the existing PreToolUse:Bash runtime gates (`commit-ownership-guard`, `file-claim-commit-guard`, `staged-pretest-guard`)."
---

# /staged-sanity

Manual pre-commit dry-run that combines four checks into one report — (1) peer-claim conflicts on staged files (via /peer-file-isolation), (2) envelope drift on milestones touched by staged files, (3) lane discipline (does the staged scope match this chat's slot + branch?), (4) untracked-but-related-files surface (catch un-staged tests / specs). Surfaces a single PROCEED / BLOCK verdict. Companion to (not replacement for) the existing PreToolUse:Bash runtime gates (`commit-ownership-guard`, `file-claim-commit-guard`, `staged-pretest-guard`).

## Source command

See `.claude/commands/staged-sanity.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
