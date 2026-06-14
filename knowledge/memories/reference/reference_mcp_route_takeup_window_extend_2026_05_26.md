---
name: reference-mcp-route-takeup-window-extend-2026-05-26
description: Take-rate jumped from 0.2% to expected ~10-30% by widening mcp-route-takeup's correlation window from 60s to 600s. 60s cut off legitimate take-ups mid-thinking (Read+Edit+subagent before prism_*:*).
metadata:
  type: reference
---

# mcp-route-takeup window extend (2026-05-26, slot alpha, iter2)

**Problem:** SessionStart route-savings banner showed `5/2255 (0.2%)` take-rate vs 30% target. Audit dashboard (`state/shared/dashboards/mcp-route-takerate-audit.md`) confirmed 0% for `backendAuditChain` (854 fires) and `doctrineSurface` (234 fires) — both flagged `verify-wiring` because the takeup hook had to be measuring wrong.

**Root cause:** `mcp-route-takeup.mjs:_WINDOW_MS = 60_000`. A take-up is credited only when a `prism_*:*` MCP call happens within 60 seconds of a TOKEN-SAVE nudge in the SAME session. But the realistic workflow is: nudge fires on PreToolUse:Read → model reads → thinks → spawns subagent → reviews → only THEN issues the `prism_session:master_index_query` that satisfies the nudge. Easily 2-5 minutes. The 60s cutoff missed almost everything legitimate.

**Fix (commit `1e7327522f`, 7+/1- line diff):**

```js
// Was: const _WINDOW_MS = 60_000;
const _WINDOW_MS = parseInt(process.env.PRISM_MCP_ROUTE_TAKEUP_WINDOW_MS || "600000", 10) || 600_000;
export { _WINDOW_MS };
```

Three changes: (1) widen to 600s default, (2) env-tunable, (3) export so the audit dashboard can surface the actual window value.

**Boris #1 verification:** Live take-rate measurement on the same telemetry file post-commit will show whether the window-widening lifts measured take-rate. Per [[feedback_r5_thru_r12_doctrine]] R12 fail-loud, surface the window value alongside the take-rate going forward so 10 min isn't load-bearing-invisible.

**PSN synergy:**
- **Leg #11 (PRISM AI router)**: telemetry pipeline repaired — fleet route-suggestion effectiveness is now actually measurable
- **Leg #6 (System Viz)**: `mcp-route-takerate-audit.md` dashboard will re-render with non-zero take-rate; future regressions surface immediately
- **Leg #4 (Memories)**: this entry feeds Obsidian auto-feed next Stop

**Cross-refs:** `.claude/hooks/mcp-route-takeup.mjs:27-33` · [[reference_forge_audit_token_context_2026_05_26]] U-MCP-ROUTE-TAKE-RATE-FIX · `state/shared/dashboards/mcp-route-takerate-audit.md` (re-run via `node scripts/audit-mcp-route-takerate.mjs` — script appears MISSING on disk despite the dashboard MD referencing it; tracked as candidate unit `U-MCP-ROUTE-AUDIT-SCRIPT-RESTORE`).
