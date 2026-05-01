---
source: project
section: OFFLOAD DISCIPLINE — default = offload, justify keep
slug: offload-discipline-default-offload-justify-keep
indexed_at: 2026-04-30T17:01:39.557Z
---

## OFFLOAD DISCIPLINE — default = offload, justify keep

| Task signal | Route |
|---|---|
| explain/describe file/fn | `/ollama-explain` |
| summarize commits/log/session | `/ollama-diff-summary` or `/ollama-summarize` |
| list engines/dispatchers/actions | `/ollama-classify` + `ENGINE_DIGEST.md` |
| docstring/JSDoc/comments | `/ollama-docstring` |
| format/convert JSON/YAML/units | `/ollama-extract` |
| error/stack triage | `/ollama-error-triage` |
| test stub generation | `/ollama-test-stub` |
| >100-file batch | Docker `batch-processor` |

**Keep-on-Claude only when:** physics constants (Kienzle/Taylor/JC), safety gates, source edits >2 files, cross-domain synthesis, build-vs-buy decisions. Otherwise → offload first; if Ollama unreachable, document why in handoff.

**RTK enforcement:** every Bash starts with `rtk` (including `&&` chains). Bypass only with `command <cmd>`. Output <500 chars exempt. Violations = token waste, treat as gate.
