# WIRING-AUDIT/U-AUDIT-ENTRY-CONSUMER — [MAIN-FORCE] [WIRING-AUDIT]/U-AUDIT-ENTRY-CONSUMER (slot:alpha): audit false-positived entry-booted + module-array engines -- de-noise the graph

**Commit:** `9f54ef156aec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T11:13:13-05:00
**Tags:** wiring-audit, u-audit-entry-consumer, auto-distilled

## Subject
[MAIN-FORCE] [WIRING-AUDIT]/U-AUDIT-ENTRY-CONSUMER (slot:alpha): audit false-positived entry-booted + module-array engines -- de-noise the graph

## Body
```
[MAIN-FORCE] [WIRING-AUDIT]/U-AUDIT-ENTRY-CONSUMER (slot:alpha): audit false-positived entry-booted + module-array engines -- de-noise the graph

audit-unwired-engines.mjs feeds BUILD_STATE NEEDS_WIRING + system-viz ghost roosts (operator 'maximize the graph' focus). TWO false-UNWIRED blind spots, both fixed: (1) index.ts (the server entry, MCP=mcp-server/src) was NOT in the consumer set -> engines booted via await import('./engines/X.js') from index.ts (reactive-chains-boot at index.ts:949) were falsely UNWIRED. Added entryFiles + a WIRED-VIA-ENTRY pass (after singletons, before engine->engine; first-match-wins so it never downgrades a real wiring). (2) engineReferencedInConsumer Form 4: a module-specifier string-array imported via a VARIABLE (REGISTRATION_MODULES + import(m)) -- literal import('...X.js') never appears so Forms 1-3 miss it. Guarded (both file-global, like Form 3): a bare-identifier dynamic import AND the basename as the FINAL segment of a quoted PATH string (mandatory leading slash excludes prose/error mentions).

VALIDATED LIVE: UNWIRED 12->8. Attributable delta EXACTLY 3 (WIRED-VIA-ENTRY +1 reactive-chains-boot; WIRED-VIA-ENGINE +2 reactiveChainBootstrap + cycleSchedulingBridge); WIRED-DIRECT unchanged 3594 = NO false-WIRED. The 4th clearance (SemanticAssetIndexEngine) was an independent concurrent peer WIRE-EXEMPT, not this change. +7 R9 tests (Form-4 happy + reactive-chains-boot shape + 3 adversarial guards + WIRED-VIA-ENTRY classification + priority), 35/35. 2-arm scrutiny: PASS (0 P0/P1; ReDoS-free, blast-radius clean). Same false-UNWIRED detector family as array-dispatch (2026-06-11) + lazy-import (2026-06-18).
```

## Files touched (3)
- scripts/audit-unwired-engines.mjs      | 41 +++++++++++++++++++++++++++++++----
- scripts/audit-unwired-engines.test.mjs | 86 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 123 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9f54ef156aec`
- Milestone envelope: `mcp-server/data/milestones/WIRING-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._