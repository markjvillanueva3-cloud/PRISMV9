# Splice patch: wire route-suggest-decay into mcp-route-suggest.mjs (FOR BRAVO)

> **Owner-gated.** `.claude/hooks/mcp-route-suggest.mjs` is cross-worktree-firewall-blocked for the golf slot. Golf built + tested + live-validated the keystone `scripts/lib/route-suggest-decay.mjs` (16/16 tests; live suppress-set = `doctrineSurface`+`backendAuditChain` = ~81% of route-suggest fires). This is the 2-line consumer splice for the hook-family owner (bravo) to apply, or a main-tree edit.

## What it does
The hook already derives a classifier per suggestion (`_classifierFromMessage(msg)`). The splice mutes a suggestion if the take-rate audit has marked that classifier `suppress` (proven-noise: >=30% fire-share + <5% take-rate, with the verify-wiring + takes>0 safety guards baked into the lib). Default-ON, reversible via `PRISM_ROUTE_DECAY_DISABLE=1`.

## Patch (apply in `.claude/hooks/mcp-route-suggest.mjs`)

1. **Import** (near the existing imports, ~line 17):
```js
import { isRouteSuggestDecaySuppressed, logDecaySuppression } from "../../scripts/lib/route-suggest-decay.mjs";
```

2. **Gate at the emission point.** Wherever the hook is about to return/emit a suggestion message `msg` (the same place telemetry classifies it via `_classifierFromMessage(msg)`), add BEFORE emitting:
```js
const _decayClassifier = _classifierFromMessage(msg);
if (_decayClassifier && isRouteSuggestDecaySuppressed(_decayClassifier)) {
  logDecaySuppression(_decayClassifier, sessionId); // best-effort audit trail
  return; // skip emission -- proven-noise classifier, decay-suppressed
}
```
Place it so it gates the FINAL emission (after the existing structural suppressions like `isCompanionCovered` / MCP-offline), not before -- decay is the last filter.

## Safety / reversibility
- Default-ON is intentional (the operator's headline token-savings ask). `PRISM_ROUTE_DECAY_DISABLE=1` fully reverts.
- The lib NEVER mutes a 0-take classifier (verify-wiring artifacts), a sub-30%-share classifier (retune), or on a stale (>7d) / unreadable audit (fail-safe empty set). Verified by 16 tests + live data.
- The take-rate audit re-runs (cron/manual `node scripts/audit-mcp-route-takerate.mjs`); as a classifier's take-rate recovers above 5% or share drops below 30%, it auto-falls out of the suppress set on the next audit.
- `state/shared/dashboards/route-suggest-decay-log.jsonl` records every suppression -> the savings are measured, not asserted.

## Expected impact (live, 2026-06-11)
Suppresses `doctrineSurface` (4360 fires/0.48% take) + `backendAuditChain` (4108 fires/0.07% take) = ~8468 of 10473 fires (~81%) of route-suggest advisory churn, at ~0.28% combined take-rate. Near-zero quality loss; large per-turn injection-tax reduction.


## APPLIED 2026-06-12 (slot:alpha)

Wired live by `scripts/apply-route-decay-splice.mjs` (idempotent self-verifying raw-FS patcher) into `H:/prism/.claude/hooks/mcp-route-suggest.mjs`. bravo did not pick up the routed splice in ~18h; per feedback_all_slots_free_access alpha applied it. Adapted to the hook array-batch (filter as last transform before emission). Validated live (decay ON: 0-take isVerboseBash correctly NOT muted). Reversible: PRISM_ROUTE_DECAY_DISABLE=1. DO NOT re-apply -- idempotent marker ROUTE-DECAY-SPLICE guards it.
