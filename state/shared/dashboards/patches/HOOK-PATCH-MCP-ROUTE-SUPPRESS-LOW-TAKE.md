# HOOK-PATCH — suppress the backendAuditChain route-suggest nudge (token savings)

**Surface:** `H:/prism/.claude/hooks/mcp-route-suggest.mjs` (cross-worktree-guarded harness-exec hook — a slot chat can't Edit/Write it; golf or a main-tree chat applies).
**Author:** claude-da9aacf5 (slot alpha), 2026-06-02.
**Unit:** U-MCP-ROUTE-SUPPRESS-LOW-TAKE.

## Why

`state/shared/dashboards/mcp-route-takerate-audit.md` recommends **SUPPRESS** for `backendAuditChain`:
**1682 fires / 1 take / 0.1% take-rate / 73.3% of ALL route-suggest fires** — the dominant noise generator. A full nudge is injected on ~3 of every 4 route-suggest fires and acted on 0.1% of the time = **negative token ROI** (injected advisory tokens fleet-wide for ignored advice). It is NOT companion-covered (so the full message still emits), and its "proper fix" (an audit-snippet injector) is a deferred v2 that never landed.

**R7 conflict resolved:** the in-code comment (iter22, 2026-05-23) says "keep backendAuditChain, build the injector"; the data-driven audit (2026-05-26, 1682 real fires) says "suppress." Per R7 we act on the data-backed, more-recent recommendation NOW (suppress reversibly) and leave the injector as the comprehensive follow-up — both coexist (suppress is interim; injector is the eventual upgrade, at which point flip the knob).

## Apply (one command — the patcher is self-verifying + reversible)

```bash
node H:/prism-slot-alpha/scripts/patch-mcp-route-suppress-low-take.mjs "H:/prism/.claude/hooks/mcp-route-suggest.mjs"
# (after slot/alpha merges, the patcher is also at H:/prism/scripts/patch-mcp-route-suppress-low-take.mjs)
```

The patcher: EOL-aware (the hook is CRLF), 2 anchored inserts, JSON/import self-verify (imports the patched module + asserts `filterSuppressedMessages` drops a `backendAuditChain` message, keeps a non-suppressed one, and the `=0` knob restores), writes a `.bak-suppress-low-take`, and **rolls back on verify failure**. Idempotent (re-run is a no-op). Proven against a real-location copy of the live hook (`patched+verified`, 39436→40884B, slot:alpha commit on `slot/alpha`).

Then commit from the main tree:
```bash
cd H:/prism && git add .claude/hooks/mcp-route-suggest.mjs && \
  git commit -m "[MAIN] [TOKEN-SAVINGS]/U-MCP-ROUTE-SUPPRESS-LOW-TAKE: suppress backendAuditChain nudge (audit-recommended, reversible)"
```

## What it changes (exact)

1. New exports near `formatTakeRateAdvisory`: `_LOW_TAKE_SUPPRESSED = new Set(["backendAuditChain"])` + pure `filterSuppressedMessages(messages)` (drops messages whose `_classifierFromMessage` is in the set; respects `PRISM_MCP_ROUTE_SUPPRESS_LOW_TAKE=0`).
2. After `messages = appendActionHints(messages)` in `main()`: `messages = filterSuppressedMessages(messages)`, then bail clean (`{continue:true}`) if nothing remains (so no orphaned take-rate advisory emits on an empty nudge set).

**Telemetry preserved:** `_recordRouteFires` runs BEFORE the filter, so the audit still counts the would-be `backendAuditChain` match — it just stops being injected into context. Re-run `node H:/prism/scripts/audit-mcp-route-takerate.mjs` after a session to confirm fire-share drops out of OUTPUT while the match is still measured.

## Reversibility
`PRISM_MCP_ROUTE_SUPPRESS_LOW_TAKE=0` restores the nudge at runtime (no code change). Per [[feedback_never_delete_only_disable]]. Delete this patch-sibling once applied + committed.
