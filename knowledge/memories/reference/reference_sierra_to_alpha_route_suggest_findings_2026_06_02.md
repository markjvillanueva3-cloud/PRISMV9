---
name: reference_sierra_to_alpha_route_suggest_findings_2026_06_02
description: "Cross-slot coordination (sierra→alpha): the route-suggest take-rate is 0.8% because of ADOPTION not capability; 4 alpha-lane fixes identified. Plus the sierra/alpha non-dup seam: node-graph substrate (sierra) vs wiki/tribal CONTENT injection (alpha)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.946Z
aliases: reference_sierra_to_alpha_route_suggest_findings_2026_06_02
---


# sierra → alpha: route-suggest / token-savings findings + non-dup seam (2026-06-02)

Surfaced by a sierra workflow (`wf_bdf6d033-341`) evaluating the operator's
"generate a template for node-routing skills/hooks for token savings" idea. The
template was assessed **LOW ROI** — the node-routing surface already exists 4×
(find-cache CLI, four `pre-*-graph-inject` hooks, `master_index_query` MCP,
`fs_navigate`); the bottleneck is **adoption, not capability**. The fixes below
are **alpha-lane** (token-optimization / route-suggest telemetry owner); sierra
surfaces the diagnosis, does not edit alpha's telemetry.

**Why route-suggest take-rate is ~0.8% (38/4684):**
1. **81% of fires are wrong-intent** — `backendAuditChain` (57%) + `doctrineSurface`
   (24%) point at actions that don't serve the in-the-moment need. A prior golf
   audit already flagged these 0%-take and recommended **suppression**
   (`reference_route_suggest_zero_take_classifiers_2026_05_30.md:28`) — never actioned.
2. The cheap file-search classifiers are `_REDUNDANT_CLASSIFIERS`
   (`mcp-route-suggest.mjs:254-260`) — the sibling pre-fetch hook ALREADY injected
   the data, so "take the route" is a duplicate fetch the model correctly skips.
3. **The 0.8% is a measurement lie** — the take-up counter only credits a literal
   `mcp__*` call within 600s (`mcp-route-takeup.mjs:100-117`); it is BLIND to
   compliance-via-native-tool (model narrows a Grep with `glob`/`type` — the
   cheaper behavior the nudge wanted — scored as 0). True adoption is a higher
   lower-bound. **Fix: credit non-MCP compliance** so the metric stops lying down.
4. **The 467k "saved" headline is synthetic + frozen** — sum of 7 hardcoded
   constants in a dead ledger (`rtk-savings-ledger.jsonl`, last write 2026-05-26,
   no wired writer). PRISM has **no end-to-end measured token-savings number**.

**Non-dup seam (sierra vs alpha)** — consumption surface vs injection content:
- **sierra owns** the node-graph substrate: `find-cache`/`system-graph-index`
  sidecars, `system-viz-query.mjs`, regen/freshness plumbing, node resolvers.
- **alpha owns** the wiki/tribal/memory CONTENT injection hooks
  (`wiki-precheck-inject`, `tribal-by-domain-inject`, `awareness-snapshot-inject`)
  + the route-suggest/rtk/savings telemetry.
- **Seam joint** (needs alpha): the dead `wiki[0]` pathHint in
  `viz-first-redirect.mjs:152` — sierra can expose a `path` field on the node;
  alpha decides what wiki content fills it. Do NOT expand find-cache `FIND_FIELDS`
  with wiki/memory content (that pulls alpha's payload into sierra's substrate).

Sierra shipped the substrate half this session: [[reference_sierra_find_cache_cold_parse_2026_06_01]]
(U-SV-FINDCACHE-OFFLINE-REGEN c074220997 — un-breaks all 4 node-direct surfaces
by keeping find-cache fresh). The adoption half above is alpha's to action.
