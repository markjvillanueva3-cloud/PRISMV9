---
title: PSNSynergyInspectorEngine
type: engine
status: built+wired
created: 2026-05-23
slot: romeo
milestone: WIRE-UNWIRED
unit: U-WIRE-PSNSynergyInspector
dispatchers: [prism_quality]
---

# PSNSynergyInspectorEngine

Pure, read-only meta-engine that scores cross-leg coverage of the **11 PSN legs** ([[feedback_psn_definition]]) and surfaces under-wired pairs with the highest synergy ROI when bridged.

## What it does

Given a per-leg inventory snapshot (`{leg, node_count, cross_refs}` for each of the 11 legs the caller has data for), the engine:

1. Walks every unordered pair `(leg_a, leg_b)` — `C(N, 2)` pairs total.
2. Scores each pair on:
   - `total_refs` — outgoing references in both directions
   - `density` — `total_refs / (count_a × count_b)` (per-node-pair link density)
   - `under_wired_score` — `1` if both legs are non-empty but zero cross-refs; tapers linearly to `0` as density approaches `densityFloor` (default 0.001)
   - `roi_band` — `P0_critical` / `P1_high` / `P2_medium` / `P3_low` quantile of the under-wired score
3. Emits a **bridge-suggestion string** per pair from `SUGGESTIONS` catalog (e.g. `engines:wiki` → *"Add wiki entries documenting each unwired engine + cross-link via [[engine-name]]"*).
4. Returns `{ pairs, top_under_wired, leg_totals, summary }` — top-K under-wired pairs are operator-actionable bridge units.

## The 11 PSN legs

| # | Leg              | What it tracks                                            |
|---|------------------|-----------------------------------------------------------|
| 1 | `obsidian_brain` | `knowledge/memories/` (cross-session brain)               |
| 2 | `prism_os`       | `prism_operating_system` dispatcher                       |
| 3 | `wiki`           | `knowledge/wiki/` (Karpathy LLM-wiki)                     |
| 4 | `memories`       | `feedback_*` / `reference_*` standing doctrine            |
| 5 | `tribal`         | tribal-embed-index (per-domain shop-floor tips)           |
| 6 | `system_viz`     | `state/shared/system-viz/system-graph.json`               |
| 7 | `engines`        | `mcp-server/src/engines/`                                 |
| 8 | `algorithms`     | `mcp-server/src/algorithms/`                              |
| 9 | `formulas`       | `knowledge/wiki/architecture/formulas/`                   |
|10 | `nn_gnn`         | `*NeuralLearningEngine` + GraphSAGE tier-5                |
|11 | `prism_ai`       | `aiSystemRouterEngine` + `prism_ai` dispatcher            |

## Wiring

Wired into `prism_quality` as action **`psn_synergy_inspect`** ([WIRE-UNWIRED](../../wire-unwired/) milestone, slot romeo, 2026-05-23). The action is canonical-PRISM and the engine remains pure: the dispatcher passes `inventories` from the caller; engine is I/O-free per engine-conventions rule.

```jsonc
// Example: prism_quality{action:"psn_synergy_inspect", params:{...}}
{
  "inventories": [
    { "leg": "engines",  "node_count": 2752, "cross_refs": { "wiki": 1101, "memories": 25 } },
    { "leg": "wiki",     "node_count": 23992, "cross_refs": { "engines": 1101 } },
    { "leg": "memories", "node_count": 495, "cross_refs": { "engines": 25, "wiki": 60 } }
  ],
  "topK": 5
}
```

Response shape: `{ summary: { legs, pairs, p0_critical, p1_high, p2_medium, most_isolated_leg }, report: SynergyReport }` — see engine source for the full `SynergyReport` Zod schema.

## Why it matters (PSN-synergy meta-utility)

PRISM's value compounds when legs **reinforce** each other — a wiki entry that points to its source engine AND the memory that motivated it AND the system-viz node AND the AI-routing entry has 4× the recall surface of an isolated entry. The inspector is the metric that tells you *which 2-leg bridge to build next* for the highest leverage. It's the substrate for golf's hygiene cadence and any future PSN-synergy roost in `/system-viz`.

## Improvement notes (assessed 2026-05-23 during wiring, romeo)

The engine is already idiomatic PRISM (Zod-schemas, static-method class, pure `inspect()`, `summarize()`, `getPSNLegs()`, no I/O). Two follow-ups noted but **NOT** taken (separate units):

1. **Live inventory adapter** — `state/shared/specs/PSN-LEG-INVENTORY-LIVE.mjs` would walk the 11 legs on disk and produce a fresh `inventories[]` ready for the inspector. Would close the production-caller gap. Belongs in `prism_session` or `prism_dev`, not the engine itself.
2. **Historical drift series** — feed inspector output into `state/shared/dashboards/psn-synergy-drift.jsonl` and graph in `/system-viz` so the fleet sees synergy debt accumulate/retire over time. Hygiene-slot work (golf).

## Cross-refs

- Source: `mcp-server/src/engines/PSNSynergyInspectorEngine.ts`
- Engine tests: `mcp-server/src/__tests__/PSNSynergyInspectorEngine.test.ts`
- Dispatcher integration test: `mcp-server/src/__tests__/qualityDispatcher-psn-synergy-inspect.test.ts`
- Doctrine: [[feedback_psn_definition]]
- Related synergy artifacts: `[[prism-system-synergy-audit-2026-05-09]]`, `[[juliett-devtools-synergy-map]]`, `[[hermes-psn-rag-synergy-research]]`
