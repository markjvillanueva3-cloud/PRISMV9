---
name: reference_community_summary_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC06 shipped (slot:sierra, 2026-06-15). CommunitySummaryEngine = cluster the 3222-engine catalog by domain -> token-bounded (<=200 tok) summary per cluster (extractive default + opt-in Ollama fail-soft). Wired prism_dev:community_summary + scripts/community-summary-gen.mjs. 15 tests. 6/8 units. Live: 10 domains all 80-91 tok."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.526Z
aliases: reference_community_summary_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06 -- CommunitySummaryEngine (2026-06-15, slot:sierra)

Sixth unit of the roadmap loop (operator "push through all building, self compaction").

## What shipped
- `mcp-server/src/engines/CommunitySummaryEngine.ts` -- collapses the ~3200-engine catalog into
  per-DOMAIN community summaries (<=200 tok each) so an LLM grasps a cluster instead of enumerating
  ~8000 tokens. Clusters ENGINE_DIGEST.md by an ordered keyword ruleset (`DOMAIN_RULES`, exported);
  extractive summary default (free/deterministic/bounded) + opt-in Ollama (fail-soft -> extractive).
  Composes GAC01.summarizeCommunity (counts) + GAC02's extractive-default pattern.
- Wired `prism_dev:community_summary` (devDispatcher + devActionSchemas) + `scripts/community-summary-gen.mjs`
  (esbuild-bundle CLI -> state/shared/community-summaries.json). 15 tests.
- Live: 10 domains, 3222 engines, EVERY summary 80-91 tok. Lathe 178->88tok, CAM 247->90, AI-ML 206->89.

## KEY DECISIONS / gotchas
- **ENGINE_DIGEST.md has NO domain `##` headers** (the spec's assumed clustering source) -- it's a
  flat `- **Name**: desc` list. So clustering is keyword-domain inference over name+desc.
- **"Other" = 2108 (65%)**: the keyword heuristic honestly buckets cross-cutting/infra engines into
  Other (the spec's named bucket); the Other summary is still bounded (top-12 + "+2096 more").
  Future enrichment: more keywords or galaxy-subdir clustering. R12 honest -- surface the count,
  don't force a wrong domain.
- **No auto-Claude fallback**: the spec said "Ollama offline -> fall back to Claude (max 5)"; an
  engine silently spending Claude tokens is a cost surprise. Extractive is the guaranteed free path;
  the caller escalates deliberately.
- **Suffix-aware token cap**: ` ...[truncated]` is 15 chars (4 tok); reserve room for it, and when
  maxTokens < suffix cost DROP the suffix -> `tokens <= maxTokens` ALWAYS holds (tested at maxTokens=2).
- security_reminder_hook.py false-positives on the digest-parser regex .exec call -- blocks once,
  re-submit passes.

## 2-agent scrutiny (A PASS + B FAIL -> fixed)
- **P1** CLI verifies_via doc claimed [100,300] but the summary FIELD is ~85 tok (over-compression,
  not under-delivery) -> corrected the comment + added a wire `tokens>0` lower-bound assert.
- **P2** token-cap overshoot at maxTokens<=3 (suffix alone = 4 tok) -> drop-suffix branch + maxTokens:2 test.
- **P2** schema `.max(300)` duplicates HARD_TOKEN_CEIL -> co-change comment.
- **P2** wire-test `vi.setConfig` inside beforeAll is a Vitest no-op -> per-it `{timeout:30000}`.

## Milestone status: 6/8
Done: GAC01..06. Next: GAC07 stale-graph guard HOOK (mtime+hash, 1h cron), GAC08 hallucinated-node-id
guard HOOK. Both hooks = cross-worktree-blocked -> node-fs write + settings.json wire via node-fs.

Related: [[reference_spatial_address_book_ms0_2026_06_15]] · [[reference_graphrag_retrieval_ms0_2026_06_15]] · [[reference_dual_channel_context_ms0_2026_06_15]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
