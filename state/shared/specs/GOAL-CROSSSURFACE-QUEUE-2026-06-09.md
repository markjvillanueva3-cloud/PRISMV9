# GOAL CROSS-SURFACE BUILD QUEUE -- 2026-06-09 (slot:alpha, fire 2)

Evidence-grounded ranked queue from an operator-directed ultracode Workflow
(`wf_9437a375-523`, 5 agents, 888K tok: 4 parallel lenses -- Blackwell/local-LLM,
obsidian-vault-value, token-savings/context-retention, system-viz/PSN -- + 1
synthesis), fed LIVE in-transcript evidence so it refines (not re-derives) the
existing queue. Standing /goal: max local-LLM utilization on the new Blackwell +
token savings + context retention + obsidian vault value, NO quality loss.

## LIVE EVIDENCE (executed this fire, all named surfaces)
- **ollama offload 6.8%** (11 offloaded / 151 kept / 93 silentSuggestions) vs 30% target.
  Worst seams: `ollama-route-pretooluse` 2126 fired / 2 offloaded; `grep-index-first`
  758 fired / 0 offloaded -- pure attention-tax today.
- **obsidian H-drive wiring LIVE**: C: auto-memory 3,296 .md -> H: knowledge/memories
  13,873 .md (4.2x superset; stop-obsidian-memory-feed every Stop). VALIDATED.
- **dark vault**: 32,630 of 39,345 wiki files unembedded (17.1% coverage) -- semantic
  layer 83% dark. Blocked on V8-cap WRITE-side sharding (india/sierra).
- **system-viz**: system-graph.json 643MB (grew from 548MB); system-viz-query.mjs OOMs
  on find AND node-card. find-cache.json + architecture-graph.json = 55-57MB (usable).
- **Blackwell**: 96GB idle; gpt-oss:20b + gpt-oss:120b CAN co-reside (~30GB headroom).
  gpt-oss:20b PROVEN to drive the codebase bridge (the 32b coder cannot tool-call).
- **PSN ~477.5k saved** cumulative (rtk dominates). NN/GNN tier-5 SELECTIVE-DEPLOY
  (AUROC 0.808, 32% coverage @ tau=0.7).

## TOP-3 ALPHA-NOW (next-fire build order, concrete)
1. **route-suggest-decay** (S) -- auto-mute advisories with <5% acceptance over the
   last >=50 fires (proven-noise only; knob PRISM_ADVISORY_DECAY_DISABLE). Cleans the
   measurement denominator (grep-index-first 758/0, route-pretooluse 2126/2 are pure
   tax). Reclaims ~700+ zero-yield fires/week. CAVEAT: must EXEMPT a hook flagged for
   upgrade (see #5) -- safest v1 = report + per-hook opt-in, not blanket auto-mute.
2. **read-dedup-cache** (M) -- PreToolUse:Read byte-identical short-circuit (path,
   mtime, offset/limit fingerprint). Read=7059 is the #1 sink; ~15% repeat-rate (CLAUDE.md
   / digests / handoffs re-read on multi-agent + /compact) ~= ~2.1M tokens/cycle. Zero-LLM,
   zero quality risk. Dependency base for #3 + #6.
3. **read-to-ollama-digest** (M, TOP FLEET ITEM) -- Read of >800-line files with
   summarize/locate intent (NOT edit -- the quality guard) routes to resident gpt-oss:20b
   for a structured digest + line-map. Generalizes the proven wiki-read-offload-advisory
   pattern to all source. Routing ~15% of 7059 Reads ~= ~1,050 offloads -- the single
   biggest lever moving offload 6.8% -> ~20%. Builds on #2's cache (cache-miss -> digest).

## REST OF QUEUE (ranked)
4. **node-card-sidecar-fallback** (S) -- fail-soft in node-card-read.mjs: when the gitignored
   159MB offset-jsonl is missing/stale, read NodeCard fields from find-cache.json (57MB) instead
   of OOM-throwing. Restores cheap-node-access. LANE: system-viz internals -> coordinate sierra.
5. **grep-to-ollama-rank** (S, alpha) -- upgrade grep-index-first: Grep >40 hit-lines -> resident
   model relevance-rank -> inject top-10. Largest never-converted seam (758/0). Order AFTER #1.
6. **precompact-survival-manifest** (M, alpha) -- precompact emits ranked <=30-line "loaded-and-
   still-live" manifest so post-compact resume re-loads ONLY those. Builds on #2. Context-retention.
7. **rank-dark-wiki-by-recall-demand** (S, alpha) -- read-only ranking of the 32,630 unembedded
   files by recall demand -> dark-wiki-recall-priority.jsonl. Decouples vault value from the
   sharding blocker (surface the ~3,000 highest-demand to embed first). Does NOT touch the V8 writer.
8. **posttool-diff-triage-ollama** (M, alpha) -- PostToolUse:Bash git-diff/test-fail >30 lines ->
   async gpt-oss:20b triage next turn. Exploits the 30GB co-resident headroom. R5-safe.
9. **generate-psn-leg-health-augmentation** (M, alpha) -- materialize the 11 PSN legs as graph
   nodes with live health (1 cached node-read vs 11 per-prompt recomputes x 26 slots).
10. **vault-coverage-census** (M, alpha->golf) -- metadata diff of Docustrata/JM-DIE/resources stems
    vs 13,873 vault stems -> first hard H-drive-not-in-vault number. No re-OCR (critical-roots rule).
11. **vault-near-dup-collapse** (M, alpha) -- nomic cosine>0.93 clusters across 13,873 -> advisory
    (never auto-delete). Shrinks the sharding-embed denominator ~10-20%.
12. **sidecar-to-gnn-refpool** (M, india; alpha provides harvest) -- harvest ghost.unwired-engine
    from find-cache (no 643MB load) to grow the GNN ref-pool past 62 ghosts / 32% coverage.

## NEEDS OPERATOR / OWNERS (out-of-alpha-lane)
- **V8-cap sharding** (india/sierra) -- blocker behind #7 + #11; confirm it stays prioritized.
- **bridge DEFAULT_MODEL** (bravo U5b) -- qwen2.5-coder:32b cannot tool-call; gpt-oss:20b works.
  Posted to AGENT_CHAT this fire. alpha mitigated via --model pin in ollama-nav-enforce.
- **system-viz-query OOM on 643MB** (sierra) -- blocks the cheap-read path fleet-wide.
- **bravo U3-U7** -- engine-routing (ModelRoutingEngine / AISystemRouter / ollama-task-offloader).

## SHIPPED THIS FIRE (fire 2)
- U-OLLAMA-NAV-ENFORCE (36105372ec) + MODELPIN (be52720b32): ollama-nav-enforce-inject.mjs
  auto-surfaces the local-LLM codebase-nav bridge on nav-intent. 8/8 tests, 3-of-3 PASS.
- Memory: [[reference_ollama_nav_enforce_2026_06_09]], [[reference_goal_crosssurface_queue_2026_06_09]].
