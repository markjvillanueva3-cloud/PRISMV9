---
name: reference_post_ship_fleet-hygiene-u-mcp-selfhealer-selfprotect
description: Auto-distilled learnings from shipping FLEET-HYGIENE/U-MCP-SELFHEALER-SELFPROTECT (commit 757e17bbd). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.853Z
aliases: reference_post_ship_fleet-hygiene-u-mcp-selfhealer-selfprotect
---


# FLEET-HYGIENE/U-MCP-SELFHEALER-SELFPROTECT

[MAIN-FORCE] [FLEET-HYGIENE]/U-MCP-SELFHEALER-SELFPROTECT (slot:golf): the cadence self-healer 'PRISM Fleet Task Health' was itself DISABLED and NOT crash-critical -- so its 5-min auto-re-enable was dormant (only chat-Stops fired the audit) AND nothing could re-enable IT if it dropped. Re-enabled it live ([Ready], PT5M) + added to CRASH_CRITICAL_TASKS (self-protect: the non-dry Stop-hook audit now re-enables it if ever disabled) + KNOWN_PRISM_TASKS (preserves the MUST_EXIST subset CRASH_CRITICAL subset KNOWN invariant; it has a real installer so not drift-stale). +1 revert-proof test (real CRASH_CRITICAL_TASKS). R16 gap-closure on U-MCP-CRASHCRIT-SELFHEAL -- the self-heal system is now self-protecting end-to-end. Pre-existing drift test 69 unchanged (separate unit).

**Shipped:** 2026-06-17T20:07:02-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-hygiene-u-mcp-selfhealer-selfprotect]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._