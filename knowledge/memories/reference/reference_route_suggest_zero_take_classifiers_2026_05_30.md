---
name: route-suggest-zero-take-classifiers-2026-05-30
description: "route-suggest nudge is net-positive overall (~304K saved) but 2 classifiers — backendAuditChain (2286 fires) + doctrineSurface (960) — are 0% take-rate = 84% of fires for zero benefit. Suppress pending alpha's companion injector."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.919Z
aliases: reference_route_suggest_zero_take_classifiers_2026_05_30
---


**Injector token-waste audit (2026-05-30, slot golf — operator: "tokens for no benefit").** Audited the 58-entry UserPromptSubmit chain + the PreToolUse route-suggest nudge.

**Findings:**
- **No duplicate hook entries** (58 entries, all unique). Apparent ×2/×3 banner repeats in a transcript are multi-round-turn context accumulation, not a settings bug.
- **Slot-awareness injectors self-gate** — `delta-cad-awareness-inject` etc. use `activeSlot===<their slot>` guards (e.g. `activeSlotIsDelta()`), so they no-op for other slots. NOT a cross-slot waste.
- **Route-suggest (`mcp-route-suggest.mjs`, owner: alpha) is the only measurable bleed, but is net-positive overall** — telemetry claims ~304K tokens saved fleet-cumulative (taken routes save more than the nudge costs). The waste is a SUBSET:

| classifier | fires | takeups | take-rate |
|---|---|---|---|
| `backendAuditChain` | 2286 | 0 | **0%** |
| `doctrineSurface` | 960 | 0 | **0%** |
| isLargeRead | 394 | 0 | 0% |
| isVerboseBash | 229 | 0 | 0% |
| (all) | 3874 | 26 | 0.67% |

`backendAuditChain` + `doctrineSurface` = **84% of all fires at 0% take-rate** — a PreToolUse nudge on every bash/audit that has NEVER been acted on.

**Recommendation (for alpha — owns the file + the design decision):** alpha's code deliberately KEPT these two "pending a companion injector" (`_COMPANION_COVERED` excludes the 5 covered classifiers; these 2 + isBroadWebSearch were left as "genuinely uncovered" awaiting an audit-snippet / doctrine-snippet injector — a future unit that has NOT shipped). Until it ships, the surgical token win is to add `backendAuditChain` + `doctrineSurface` to the suppression set (cut their nudge cost without touching the 304K-saving covered classifiers). golf did NOT edit `mcp-route-suggest.mjs` — it's alpha's hot, actively-iterated file (iter22 / COMBO-EFFICIENCY-MS0) and this is an owner design call (R7/R11). Handed off with data.

**Knobs (if operator wants the blunt immediate win):** the SessionStart savings HEADLINE silences via `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1` (telemetry only, not the nudge). The nudge itself is governed inside `mcp-route-suggest.mjs`. Related: the same file's tmp-writer leak [[reference_tmp_orphan_leak_janitor_2026_05_30]].
