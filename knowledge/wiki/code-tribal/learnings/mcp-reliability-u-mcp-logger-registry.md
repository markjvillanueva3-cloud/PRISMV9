# MCP-RELIABILITY/U-MCP-LOGGER-REGISTRY — [MAIN] [MCP-RELIABILITY]/U-MCP-LOGGER-REGISTRY (slot:golf): restore Logger class -> BaseRegistry constructable + land the 2 deferred registry fixes

**Commit:** `62fe49af70ff` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T14:16:10-05:00
**Tags:** mcp-reliability, u-mcp-logger-registry, auto-distilled

## Subject
[MAIN] [MCP-RELIABILITY]/U-MCP-LOGGER-REGISTRY (slot:golf): restore Logger class -> BaseRegistry constructable + land the 2 deferred registry fixes

## Body
```
[MAIN] [MCP-RELIABILITY]/U-MCP-LOGGER-REGISTRY (slot:golf): restore Logger class -> BaseRegistry constructable + land the 2 deferred registry fixes

Closes the BaseRegistry non-constructable finding (reference_baseregistry_logger_stub_2026_06_10):
utils/Logger.ts was a stub exporting only log/logger consts, but BaseRegistry (+ ~15 registry
subclasses) does `new Logger()` -> threw "Logger is not a constructor".

- Logger.ts: ADD a lightweight `Logger` class (console wrapper over the existing `log` const,
  name-prefixed) -- consistent with the stub's intent (no Winston). Purely additive; the
  log/logger consts are unchanged. Verified BaseRegistry is the ONLY Logger-class consumer.
- BaseRegistry.ts: now that the base constructs, land the 2 fixes dropped from U-MCP-HARDEN:
  (5) persistItem -> atomicLockedWrite (cross-process lock + tmp->rename closes the per-item
  RMW/torn-write race); (6) single-flight ensureInitialized() (dedupe concurrent initialize()
  under 26 chats).
- baseRegistry-concurrency.test.ts: 3/3 -- constructs (regression anchor for the Logger fix),
  single-flight (initCount==1, pre-fix 5), atomic persist (no torn write under realistic
  concurrent same-id writers). tsc clean for all 3 files.
```

## Files touched (4)
- mcp-server/src/__tests__/baseRegistry-concurrency.test.ts | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/registries/BaseRegistry.ts                 | 27 ++++++++++++++++++++++-----
- mcp-server/src/utils/Logger.ts                            | 23 ++++++++++++++++++++++-
- 3 files changed, 111 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- tils/Logger.ts was a stub exporting only log/logger consts, but BaseRegistry (+ ~15 registry

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62fe49af70ff`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._