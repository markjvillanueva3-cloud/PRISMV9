---
name: route-suggest-stats
description: Report mcp-route-suggest fire telemetry — total TOKEN-SAVE fires this fleet, breakdown by tool (Grep/Bash/Read/Write/Glob/WebSearch) and classifier (broadGrep/verboseBash/largeRead/largeWrite/broadGlob/broadWebSearch/ollama). Reads the atomic-write sidecar at state/shared/mcp-route-suggest-stats.json. Quantifies the ROI of the TOKEN-SAVINGS-PIVOT routing layer.
version: 1.0.0
model: haiku
effort: low
allowed-tools:
  - Bash
  - Read
triggers:
  - "route suggest stats"
  - "route stats"
  - "token save stats"
  - "mcp route roi"
  - "how much did routing save"
  - "route-suggest telemetry"
related:
  - mcp-route-suggest
  - ollama-route-check
---

# /route-suggest-stats — TOKEN-SAVINGS-PIVOT ROI snapshot

Reads `H:/prism/state/shared/mcp-route-suggest-stats.json` and reports:

- **totalFires** — cumulative TOKEN-SAVE nudges injected fleet-wide.
- **byToolName** — which tool surface fires most often (Bash/Read/Grep/Write/Glob).
- **byClassifier** — which classifier triggered (isBroadGrep, isVerboseBash, isLargeRead, isLargeWrite, isBroadGlob, isBroadWebSearch, ollama, backendAuditChain, doctrineSurface).
- **recent[]** — last 10 fires with timestamps + sessionIds (truncated to 8 hex).
- **takeupTotals** (iter8) — measured take-rate: how often the model invoked the suggested MCP action within 60s of a nudge. When `takeupTotals.totalTakeups > 0`, the skill reports a **measured** take-rate (`totalTakeups / totalFires × 100%`) and uses it for ROI estimation. When no take-ups recorded yet, falls back to the **30% doctrine assumption** from CLAUDE.md §TOKEN ECONOMY.
- **estimated savings** — `totalFires × take-rate × 8000 tokens/fire` (rough lower bound, ~5-50K range per fire).

## Steps

1. Read `H:/prism/state/shared/mcp-route-suggest-stats.json` (the iter-3 telemetry sidecar).
   - If missing → report "no fires yet — mcp-route-suggest hook may be disabled or no qualifying tool calls have fired." Suggest `PRISM_MCP_ROUTE_TELEMETRY_DISABLE` env check.
2. Compute headline:
   - Total fires, age of first fire (`createdAt`), age of last fire (`lastFireAt`).
   - Top 3 tools by fire count.
   - Top 3 classifiers by fire count.
   - **Take-rate** (iter8): if `takeupTotals.totalTakeups > 0` → measured rate = totalTakeups ÷ totalFires; otherwise → 0.30 doctrine fallback.
   - **Top slots** (iter10): top 3 from `bySlot` (excluding `_unresolved`) — shows which fleet slots benefit most from routing.
3. Show last 10 entries from `recent[]` (already capped at 100 in the sidecar; show only the freshest 10).
4. Show last 5 entries from `takeups[]` (iter8) if present — mcpAction + creditedClassifiers + timestamp.
5. ROI estimate: `totalFires × take-rate × 8000 tokens/fire`. Label as "measured" if take-rate came from takeupTotals, "doctrine fallback" if 0.30.

## Output format

```
TOKEN-SAVINGS-PIVOT — route-suggest ROI snapshot
================================================
Total fires:   123 (since 2026-05-22T22:48:17Z, last 2026-05-23T01:14:39Z)
Top tools:     Bash(67) Read(28) Grep(15) Glob(8) Write(5)
Top classifs:  isVerboseBash(67) isLargeRead(28) isBroadGrep(15)
Take-rate:     42.3% MEASURED (52 of 123 fires followed by suggested MCP action ≤60s)
Estimate:      ~416K tokens saved (123 fires × 0.423 measured × 8K/fire)
Top slots:     alpha(45) bravo(28) hotel(18)  (iter10 per-slot ROI)

Recent fires (10 of 100):
  2026-05-23T01:14:39Z  Bash  alpha   [isVerboseBash]    session:5b1fef86
  ...

Recent takeups (5 of 100):
  2026-05-23T01:14:42Z  prism_session:master_index_query  [isBroadGrep]  session:5b1fef86
  ...
```

When `takeupTotals` is empty (no takeups recorded yet), the Take-rate line reads `30% DOCTRINE FALLBACK (no take-ups measured yet — see iter8 mcp-route-takeup hook)`.

## Disable

- Sidecar writes: `PRISM_MCP_ROUTE_TELEMETRY_DISABLE=1` (env on the chat that owns mcp-route-suggest)
- Skill: built-in `/help` filter — no env knob.

## Related

- `mcp-route-suggest.mjs` — the PreToolUse hook that fires + writes the sidecar (iter1+iter2+iter3 of TOKEN-SAVINGS-PIVOT).
- `ollama-route-check.md` — sister skill for the Ollama offload route.
- CLAUDE.md §TOKEN ECONOMY — overarching token-savings doctrine.
