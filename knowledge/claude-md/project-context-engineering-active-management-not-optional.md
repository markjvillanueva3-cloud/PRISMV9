---
source: project
section: CONTEXT ENGINEERING — active management, not optional
slug: context-engineering-active-management-not-optional
indexed_at: 2026-04-30T17:01:39.560Z
---

## CONTEXT ENGINEERING — active management, not optional

**Pressure thresholds** (`prism_session:context_pressure`):
- <0.50 — green
- 0.50–0.65 — yellow, run `prism_context:relevance_filter` on next injection
- 0.65–0.75 — orange, `context_compact_plan` + `memory_externalize` large reads
- >0.75 — red, `/precompact` immediately, no new exploration

**Externalize OUT of context:**
- Decisions/rationale → `prism_memory:remember`
- Discovered paths/names → `prism_session:state_save`
- Plan progress → `per-agent-handoff.mjs write` (incremental)
- Error+fix pairs → `prism_guard:error_ledger_append`
- Summarized long files → `prism_context:memory_externalize`

**Anchor IN context** (`prism_sp:context_attention_anchor`): user's literal goal + acceptance criteria; active milestone + worktree + scope; failure-mode checklist. Re-anchor after every `/compact`.

**Compact early:** before any >50-tool-call workflow; before spawning multi-agent team; when `context_monitor_check` reports goal drift; every 2-3 units.

Re-reading a file already in this session = token leak. Use `relevance_filter` first.
