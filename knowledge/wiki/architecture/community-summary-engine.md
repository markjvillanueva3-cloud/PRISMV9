---
title: CommunitySummaryEngine (token-bounded per-domain engine-catalog summaries)
type: architecture
layer: L6
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC06
tags: [community-summary, clustering, engine-catalog, token-budget, ollama, prism_dev, system-viz]
related:
  - graph-context-lens-engine
  - graphrag-retrieval-engine
  - spatial-address-book-engine
---

# CommunitySummaryEngine

Sixth unit of GRAPH-AS-LLM-CONTEXT-MS0 (slot:sierra). Collapses the ~3200-engine catalog into
per-DOMAIN community summaries so an LLM grasps a cluster in <=200 tokens instead of enumerating
~8000 tokens of engine names.

## Design

- **Cluster source**: ENGINE_DIGEST.md (the flat `- **Name**: desc` catalog -- it has NO domain
  `##` headers, so the spec's assumed section-clustering does not apply). Clustered by an ordered
  first-match keyword ruleset (`DOMAIN_RULES`, exported) into WEDM / Lathe / Mill / CAM / CAD /
  PostProcessor / Quoting-Business / AI-ML / Safety-Quality / Other. Order matters (WEDM before
  Mill so a wire-EDM engine is not swallowed by a "mill" substring).
- **Summary**: deterministic **extractive** by default (domain + count + top-K names + tail count;
  free, always works, bounded by construction). Opt-in **Ollama** prose pass (`useLlm`, fail-soft
  -> extractive on throw OR empty string). The spec's "fall back to Claude" is NOT auto-invoked --
  an engine silently spending Claude tokens is a cost surprise; extractive is the guaranteed path.
- **Token cap**: every summary <= `maxTokens` (default 200, hard ceiling 300). Suffix-aware
  truncation: reserves room for ` ...[truncated]`, and when `maxTokens` is below the suffix cost
  the suffix is dropped so the cap ALWAYS holds (even at `maxTokens=2`).
- Composes the spirit of GAC01.summarizeCommunity (counts) + GAC02's extractive-default/opt-in-Ollama pattern.

## Surfaces

- `prism_dev:community_summary` -- params `{domain?, useLlm?, maxTokens?, topK?}`. With `domain`,
  one ClusterSummary; else all clusters. Result in `r.data`.
- `scripts/community-summary-gen.mjs [--domain=X] [--use-llm] [--out=<path>]` -- esbuild-bundles
  the engine to a gitignored temp, writes `state/shared/community-summaries.json`.

## Live proof (real catalog)

10 domains, **3222 engines clustered, every summary 80-91 tokens** (the ~8000-token enumeration ->
~85 tokens/domain). Lathe=178 engines -> 88-token summary; Mill=85; CAM=247; AI-ML=206; WEDM=108;
CAD=110. "Other"=2108 (65%) -- the keyword heuristic leaves cross-cutting/infrastructure engines
unclassified; the spec's named "Other" bucket anticipates this, and the Other summary is still
bounded (top-12 + "+2096 more"). Future enrichment: more domain keywords or galaxy-subdir clustering.

## Tests + 2-agent scrutiny

15 tests: `CommunitySummaryEngine.test.ts` (12 -- clustering correctness, DOMAIN_RULES order,
happy/empty/malformed/Ollama-unreachable/Ollama-empty/Ollama-success/token-cap/tiny-maxTokens/
1000-engine/summarizeAll-no-drop) + `devDispatcher.communitySummary-wire.test.ts` (3 round-trip on
the REAL catalog). A PASS + B FAIL->fixed: token-cap suffix overshoot at `maxTokens<=3` (now drops
the suffix -> cap always holds), CLI verifies_via doc was inaccurate (summary ~85 tok not [100,300]
-- corrected), schema `.max(300)` co-change comment, wire-test `vi.setConfig`-in-beforeAll no-op
(-> per-it timeouts), wire lower-bound assert.

## Lessons

- A fixed truncation SUFFIX must be budgeted against the cap, and when the cap is smaller than the
  suffix the suffix has to be DROPPED -- otherwise `tokens <= maxTokens` silently breaks at tiny caps.
- A `verifies_via` token band is an ESTIMATE; measure the real output and document the truth
  (over-compression to ~85 tokens is success, not a failure to reach an arbitrary 100 floor).
- A keyword domain-classifier honestly buckets cross-cutting engines into "Other"; surface the
  count rather than forcing a wrong domain.

## Next: U-GAC07..08 (2 remaining)
stale-graph guard hook (mtime+hash, 1h cron), hallucinated-node-id guard hook (hooks =
cross-worktree-blocked, use node-fs).
