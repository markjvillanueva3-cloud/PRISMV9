---
title: Hook — route-savings-session-start-inject
type: hook
hook_name: route-savings-session-start-inject
hook_source: runtime
source_path: H:/prism/.claude/hooks/route-savings-session-start-inject.mjs
events: [SessionStart]
generated_by: manual (HIGH-ROI-TS2/iter4)
last_verified: 2026-05-22
tags: [hook, source-runtime, event-sessionstart, token-savings, telemetry, inject]
related:
  - knowledge/wiki/architecture/hooks/runtime/mcp-route-suggest.md
  - knowledge/wiki/architecture/hooks/runtime/mcp-route-takeup.md
  - knowledge/wiki/architecture/token-savings-pivot.md
---

# Hook — `route-savings-session-start-inject`

**Source:** runtime · **File:** `H:/prism/.claude/hooks/route-savings-session-start-inject.mjs`
**Triggers on:** SessionStart

## Purpose

One-line ROI banner at the top of every chat. Closes the feedback loop on the TOKEN-SAVINGS-PIVOT telemetry chain: the sidecar collects fires + take-ups, `/route-suggest-stats` reports them on demand, this hook surfaces them unprompted on SessionStart so every fresh chat is aware of the running ROI numbers.

## Output

```
## 💰 Route-savings telemetry (TOKEN-SAVINGS-PIVOT)
Fires: 57 · Take-rate: 1.8% measured · Est. saved: ~8K tokens · Top tool: Read(17) · Top classifier: backendAuditChain(22)
_Use /route-suggest-stats for the full breakdown. Disable this banner: `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1`._
```

## Logic

1. If `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1` → silent pass.
2. Read `state/shared/mcp-route-suggest-stats.json` once. If missing or unparseable → silent pass.
3. If `totalFires === 0` → silent pass.
4. Compute take-rate: measured (`takeupTotals.totalTakeups / totalFires`) when totalTakeups > 0, else 30% doctrine.
5. Compute lower-bound saving: `totalFires × take-rate × 8000 tokens/fire`.
6. Top-1 tool name (by fire count) + top-1 classifier.
7. Emit single-line banner as `additionalContext`.

## Safety properties

- **Fail-silent** — any IO error or parse error pass-through with `{continue:true}`.
- **<50ms** — one file read, no subprocess, no fetch. Constant-time formatting.
- **No state mutation** — reads sidecar only; never writes.
- **Disable knob** — `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1` for opt-out.

## Wiring

`C:/Users/wompu/.claude/settings.json` SessionStart `""` matcher, after `portable-python-guard.mjs`. Auto-mirrored to `H:/.claude/settings.json` by `c-to-h-mirror.mjs`.

## See also

- [[mcp-route-suggest]] — PreToolUse hook that writes the sidecar this banner reads.
- [[mcp-route-takeup]] — PostToolUse hook that adds the takeup data feeding the measured take-rate.
- [[token-savings-pivot]] — milestone home.
- `/route-suggest-stats` skill (haiku) — on-demand full breakdown.
