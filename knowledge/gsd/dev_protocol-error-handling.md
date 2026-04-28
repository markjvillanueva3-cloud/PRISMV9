---
source: dev_protocol
section: Error Handling
slug: error-handling
indexed_at: 2026-04-28T02:50:03.668Z
---

## Error Handling

Brief acknowledgment ("my bad") → immediate fix → todo update for
prevention. Add fixable errors to todo via
`prism_context:todo_update`. System automatically learns from errors
(D3 error chain + UNIFIED_ERROR_LEDGER). Check
`prism_guard:failure_library` and `prism_guard:error_ledger_recent`
for known failure patterns.
