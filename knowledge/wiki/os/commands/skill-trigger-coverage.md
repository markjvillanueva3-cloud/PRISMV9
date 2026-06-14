---
kind: command
slug: skill-trigger-coverage
status: stub
generated_at: 2026-05-23T00:34:38.924Z
generator: scripts/backfill-wiki-os-commands-entities.mjs
source: .claude/commands/skill-trigger-coverage.md
description: "Reports what fraction of PRISM skills are reachable via the auto-trigger ledger (_skill-triggers.jsonl, consumed by the skill-auto-trigger.mjs UserPromptSubmit hook). A skill with no ledger entry can only be invoked by typing its name — the hook never suggests it. Surfaces the F2 gap from HIGH-ROI-SKILL-ROUTING-AUDIT: covered vs declared-not-captured vs no-triggers, plus stale ledger rows."
---

# /skill-trigger-coverage

Reports what fraction of PRISM skills are reachable via the auto-trigger ledger (_skill-triggers.jsonl, consumed by the skill-auto-trigger.mjs UserPromptSubmit hook). A skill with no ledger entry can only be invoked by typing its name — the hook never suggests it. Surfaces the F2 gap from HIGH-ROI-SKILL-ROUTING-AUDIT: covered vs declared-not-captured vs no-triggers, plus stale ledger rows.

## Source command

See `.claude/commands/skill-trigger-coverage.md` for the live executable surface.

## Status

This entity is a U-CK11 Phase 2 backfill stub. Richer content (purpose,
composes_with chain, invocation examples, related skills) lands in a
later phase per the U-CK11 verdicts doc remediation queue.
