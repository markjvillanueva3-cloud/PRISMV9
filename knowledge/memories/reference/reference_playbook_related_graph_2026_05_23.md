---
name: reference-playbook-related-graph-2026-05-23
description: U-PB-RELATED-GRAPH (slot:foxtrot iter10) — multi-hop BFS over PlaybookRule.related_rules; extends 1-hop explainRule() with R12 fail-loud (unresolvedRefs+cycleEdges+truncated); 35/35 tests; commit fa2ccacafe
metadata:
  type: reference
---

2026-05-23 foxtrot iter10. Committed `fa2ccacafe` — `[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-RELATED-GRAPH`. Action `prism_shop_practice:playbook_related_graph` extends 1-hop `explainRule()` into an N-hop BFS walker (maxDepth ∈ [0,10], default 2) over `PlaybookRule.related_rules`. 5-surface wire (engine + dispatcher + handler map + zod schema + schema map).

**3-channel R12 fail-loud:**
- `unresolvedRefs[]` — stale ids referenced in `related_rules` that don't resolve in the current corpus
- `cycleEdges[]` — back-edges from BFS (corpus DAG violation, not an error)
- `truncated:boolean` — true when maxDepth cap clipped UNVISITED neighbors

**3-layer defense-in-depth on maxDepth** — schema (`z.number().int().min(0).max(10).optional()`) + handler (`Math.min(Math.floor(...), 10)`) + engine (`Math.max(0, Math.floor(...))`). Reviewer B P1-1 flagged the handler/engine independent clamps as "inconsistency"; retained intentionally as layered guards per [[feedback_verify_actual_contract_not_proxy]] doctrine — each layer defends in case the layer above is bypassed.

**Tests: 35/35 PASS** — 22 engine (`PlaybookRelatedGraph.test.ts`) + 13 dispatcher round-trip (`PlaybookRelatedGraphDispatcherWiring.test.ts`). Engine covers null/root-only/empty/undefined related_rules, 1-hop/2-hop/depth-respect/default/order-invariant BFS, cycle handling (2-node/3-node/dedupe/self-ref), unresolvedRefs (single/dedupe/malformed-filter), structural invariants (echo/negative-clamp/fractional-floor/diamond/real-corpus). Dispatcher covers enum-gate (typo rejected by zod-v4), input validation (missing/empty/oversized ruleId, out-of-bounds/fractional maxDepth), happy paths on real corpus `SEQ-001`, maxDepth=0 and maxDepth=10 boundaries, response-shape conformance.

**Per-file scrutiny** (Reviewer A wiring-review-agent + Reviewer B independent reviewer): both PASS. Applied 2 P1 fixes from B: (1) test corpus-drift assertion strengthened `>= 1` → `>= 2`, (2) R12-negative empty-arrays-not-undefined assertion added. P1-1 (schema/handler "inconsistency") intentionally not changed — documented as defense-in-depth.

**Lineage**: iter9 `6bd789d40d` U-PB-SUGGEST-RESOLUTION added RESOLVE; iter10 fa2ccacafe completes the playbook conflict suite **detect → rank → RESOLVE → related-graph**.

**Pivot story** (drift discipline per [[feedback_autonomous_loop_drift_discipline]]): memory recall surfaced `[[reference_post_ship_machining-tribal-coverage-u-mtc05]]` matching a planned milling-rules expansion. Verified U-MTC05 shipped only a wiki/tribal MD entry (141 lines), not engine rules — would have been a bridge promotion, not a duplicate. But per ≤1-extra-tick rule, pivoted to orthogonal pure-engine unit `U-PB-RELATED-GRAPH` instead of bridge-promoting tribal→engine in this iter.

**Files**:
- `mcp-server/src/engines/MachiningPlaybookEngine.ts` (M — types + method)
- `mcp-server/src/tools/dispatchers/shopPracticeDispatcher.ts` (M — action + handler + map)
- `mcp-server/src/schemas/shopPracticeActionSchemas.ts` (M — schema + map)
- `mcp-server/src/__tests__/PlaybookRelatedGraph.test.ts` (NEW)
- `mcp-server/src/__tests__/PlaybookRelatedGraphDispatcherWiring.test.ts` (NEW)

Wiki: [[playbook-related-graph]]. Lineage: [[playbook-suggest-resolution]].
