---
session: claude-339c8ff7
topic: bravo-html-stack
slot: 
written_at: 2026-05-16T21:36:33.747Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-339c8ff7
status: active
---

# HANDOFF: claude-339c8ff7
Updated: 2026-05-16T21:36:33.747Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-339c8ff7

## STATE
PER-SLOT-CLAIM-MS0 complete 6/6 + AUDIT-SYNERGY-MS0 5u shipped. 4 commits this session. 11 HTML units claimed to bravo. Next: HTML-COMPANION-MS0.

## RESUME
Continue HTML-COMPANION-MS0 (4u, all claimed to bravo via slot-task-claim, 2h TTL). Order: U-HTML-CLAUDE-MD-EDIT (role-split rule into H:/prism/CLAUDE.md: machine-consumed surfaces stay MD, strategic specs get MD+HTML companion) -> U-HTML-DOCTRINE-UPDATE (BORIS-LOOP-AGENT-DOCTRINE.md qualifying-artifact defn) -> U-HTML-COMPANION-GENERATOR (build scripts/spec-html-companion-generator.mjs ON TOP OF the shipped mdToHtml() in scripts/lib/html-report-render.mjs - do NOT re-implement a parser; wire as PostToolUse Write hook on state/shared/specs/*.md) -> U-HTML-BACKFILL. Then HTML-PRIMARY-MS0 (7u: U-HPS01 SpecHTMLCompanionEngine reuses mdToHtml as base layer, then HPS02-07). Then MEMORY-SLOT-VIEW-MS0 (2u, queued - filtered projection of shared MEMORY.md, mirrors wiki-domain-bias pattern, NO fork). PER-SLOT-CLAIM-MS0 is 6/6 DONE (commits 3a8741d4f/b6f24770c/e752b186e/0078f996e). slot-task-claim CLI live: node .claude/helpers/slot-task-claim.mjs list shows the 11 HTML claims. Use /pick-unit --slot bravo --chatId claude-339c8ff7 (claim filter active).

## CONTEXT

