---
name: reference-lathe-wizard-vendor-lookup-design-2026-05-27
description: Design notes for U-LATHE-WIZARD-VENDOR-LOOKUP — wire wizard_query_records[] from lathe-tribal-master-index into LatheCAMIntelligenceEngine.selectInsert. Direct connection from corpus → wizard decision-making.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.193Z
aliases: reference_lathe_wizard_vendor_lookup_design_2026_05_27
---


# Wizard vendor-lookup design

## Why this exists

Iter1-iter9 built `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` with:
- 14 vendors / 87+ grades / 8 indexes (by ISO group + by coating)
- `wizard_query_records[]` array — pre-shaped tuples for direct wizard consumption

But nothing in `LatheCAMIntelligenceEngine` actually consults this index. The wizard currently fabricates insert selections OR delegates to operator. This unit closes the gap.

## API design

```js
// LatheCAMIntelligenceEngine.selectInsert(spec) — new behavior
selectInsert(spec) {
  // spec = { material, iso_group, operation, depth_of_cut, surface_finish_target, controller, machine_model }

  // 1. Load master index (cached at engine boot)
  const index = loadMasterIndex();

  // 2. Query by hard constraints
  const candidates = queryByIsoAndOp(index, spec.iso_group, spec.operation);
  // returns: [{vendor, grade, coating, geometry, suggested_vc, suggested_fz, life_minutes, ...}, ...]

  // 3. Score each candidate
  const scored = candidates.map(c => ({
    candidate: c,
    score: scoreCandidate(c, spec)
  }));

  // 4. Sort + return top-K with rationale
  scored.sort((a, b) => b.score - a.score);
  return {
    primary: scored[0].candidate,
    alternates: scored.slice(1, 4),
    rationale: explainScore(scored[0], spec),
    confidence: scored[0].score / 100
  };
}
```

## Score function components (sum to 100)

- **ISO-group fit (30 pts)** — exact P-30 match scores 30; cross-group (P→M) scores 15; outside-group scores 0
- **Geometry-operation fit (20 pts)** — CNMG for facing/roughing 20; CNMG for grooving 0; etc.
- **Vendor inventory bias (15 pts)** — vendors already in JM shop (per shop-tool-library) +15
- **Coating-vs-material fit (10 pts)** — PVD-TiAlN for stainless +10; uncoated for aluminum +10
- **Cost/Life ratio (10 pts)** — higher life-per-dollar wins (vendor-curve life × edges ÷ list-price)
- **Surface-finish match (10 pts)** — wiper-geometry inserts +10 when fine finish required
- **Recency in corpus (5 pts)** — grades referenced in iter40-iter109 video corpus +5 (real-world usage signal)

## R12 fail-loud requirements

1. **Never silently fall back** — if no candidate scores ≥ 50, throw with operator-confirmation prompt
2. **Always surface rationale** — operator sees why insert was chosen
3. **Always surface alternates** — operator can override
4. **Confidence band** — `score < 70` → "low confidence" badge, `< 50` → throw

## Wiring sequence

1. `LatheCAMIntelligenceEngine.constructor` lazy-loads master index
2. Add `selectInsert(spec)` per above
3. Update `proposeFunctionOperations(part)` to call `selectInsert` per turning op
4. Quality pipeline `validateTools` cross-checks selected insert vs shop-tool-library bridge
5. Hermetic tests with synthetic master-index fixture (10-15 candidates)

## Integration boundaries

- **Reads from**: `lathe-tribal-master-index-2026-05-26.json` + shop-tool-library bridge
- **Writes to**: nothing (pure function)
- **Called by**: wizard top-level `proposeProgram(part_spec, machine_spec)`
- **Co-validates with**: quality pipeline `validateTools` + cycle-time `LatheCSSOptimizerEngine`

## Anti-patterns to prevent

- ❌ Sticky-default insert ("always CNMG-432 for everything") — score function must vary by spec
- ❌ Lowest-cost-wins (cheapest insert ≠ best — life-per-dollar is what matters)
- ❌ Ignoring shop inventory (perfect grade you don't have = useless suggestion)
- ❌ Silent fallback to operator (R12 — always surface rationale even when confident)

## Estimated scope

- API + score function: ~150 LOC
- Index loader + cache: ~50 LOC
- Tests: ~250 LOC / 30 cases (each ISO group × each operation × edge cases)
- Total: ~450 LOC, ~3 hours including tests

This is the next priority after [[reference_shop_tool_library_bridge_design_2026_05_27]] — needs the bridge for "vendor inventory bias" scoring.

## Related

- [[reference_shop_tool_library_bridge_design_2026_05_27]] — co-requisite for vendor-inventory scoring
- [[reference_insert_edge_rotation_strategy_2026_05_27]] — informs geometry-operation fit weights
- [[reference_lathe_program_quality_rubric_2026_05_27]] — uses wizard output to score programs
- [[reference_lathe_cycle_time_levers_2026_05_27]] — Tier-1 lever-3 (multi-edge) needs correct geometry pick
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — the source data
- `LatheCAMIntelligenceEngine.ts` — the wiring target
