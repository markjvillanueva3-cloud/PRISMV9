---
source: global
section: HOOK ENFORCEMENT GATES
slug: hook-enforcement-gates
indexed_at: 2026-06-23T02:05:18.101Z
---

## HOOK ENFORCEMENT GATES

See `H:/PRISM/CLAUDE.md` §ENFORCEMENT and §SCRUTINY GATE — duplicating here would rot. Hook source of truth: `H:/.claude/settings.json` + `H:/PRISM/.claude/hooks/`. Key Stop hooks every chat must know: `scrutinize-before-stop`, `enforce-handoff-topic`, `error-pattern-promote`, `leave-a-copy-behind-guard`, `stop_on_failing_tests`, `stop_on_unwired_assets`, `stop_on_uncommitted_critical`. Key PreToolUse: `file-claim-guard` (blocks edits to peer-claimed files), `duplication-hard-block` (blocks duplicate engine creation), `comprehensive-build-enforce` (blocks stub/partial work). UserPromptSubmit auto-injects: `wiki-precheck-inject` (top-3 wiki entries on keyword match), `inventory-check-guard`, `chat-bus-inject`.

---
