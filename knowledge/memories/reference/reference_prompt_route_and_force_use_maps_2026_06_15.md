---
name: reference_prompt_route_and_force_use_maps_2026_06_15
description: "Two routing-graph extensions shipped 2026-06-15 (slot:alpha). (1) FORCE-USE-MAP-MS0/U-GREP-INDEX-FORCE: 3-round dormant-feature scrutiny + getGraphNodeHits cap-safe revival (728MB graph was silently dead) + grep-index force-deny (latent, no path source) + FORCE-USE-MAP.md verdicts. (2) PROMPT-ROUTE-MAP-MS0/U-PROMPT-ROUTE: mined ALL 613 sessions (16301->4870 distinct prompts), built operator-prompt-route-map.json (build 39.7% etc) + prompt-route-inject.mjs UserPromptSubmit hook (WIRED C:+H:) that auto-injects the optimal order-of-operations + history-rank on every future prompt. Both extend scripts/lib/feature-routing-graph.mjs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.123Z
aliases: reference_prompt_route_and_force_use_maps_2026_06_15
---


# Routing-graph extensions (2026-06-15, slot:alpha)

Built on `scripts/lib/feature-routing-graph.mjs` (FEATURE-ROUTING-GRAPH-MS0 earlier this session:
`classifyRoutingClass` + `TASK_CLASS_POLICY` (12 workflow classes) + `routeTaskClass`).

## PROMPT-ROUTE-MAP-MS0 / U-PROMPT-ROUTE (commits 23e4499e9d + 56a19e3da8)
Operator: "read through every single session we've ever had, read ALL my prompts and commands, update
the graph ... map a direct route ... my future prompts should auto trigger you to look at the graph."
- `scripts/extract-operator-prompts.mjs` (+test, 14): DETERMINISTIC streaming extractor over ALL **613**
  transcripts (7.8GB, cap-safe readline -- never readFileSync a whole transcript). Pulls genuine human
  prompts (string-content user turns, NOT array tool_results / hook blocks) + slash commands, dedups,
  classifies via classifyRoutingClass. **16,301 raw -> 4,870 distinct.** Class mix: **build 39.7% (1932) ·
  learn 18.9% · fix 10.7% · orchestrate 8.7% · session 7% · domain 6.1%**; top cmds /goal 303, /loop 100,
  /checkin* . Emits `state/shared/operator-prompt-route-map.json` (committed digest) + a gitignored
  `operator-prompt-corpus.jsonl` (regenerable raw, 2.9MB).
- `.claude/hooks/prompt-route-inject.mjs` (+test, 11; UserPromptSubmit, **WIRED in C:+H: settings.json**):
  on every SUBSTANTIVE prompt, classifies it (pure, fast -- NO per-prompt cag/model/substrate I/O) and
  injects the order-of-operations from the LIVE TASK_CLASS_POLICY + the history rank, e.g.
  "class build -- your #1 (1932x, 39.7%); do: dedup-check->master-graph->...; cmds /dedup->/forge-triple;
  AVOID building before /dedup." Compact (~580B), per-class 300s throttle, MIN_PROMPT_CHARS skip, bare
  slash-command skipped (no ceremony noise), fail-open. Knobs PRISM_PROMPT_ROUTE_INJECT_DISABLE / _THROTTLE_MS.
  Reads LIVE policy (the map's per-class `route` is a gen-time snapshot -- do NOT consume it in code).

## FORCE-USE-MAP-MS0 / U-GREP-INDEX-FORCE (commits 3eb9344b76 + db02ed6b11)
Operator: "3 separate scrutiny rounds, fan out to find dormant/underused features, map when auto-used,
no advisories, FORCE usage without losing quality." 3 rounds (Explore/Sonnet miners + adversarial reviewer).
**Honest headline (R12):** forcing collides with quality on most candidates --
- **large-read-digest / wiki-read-offload / nav-rerank = KEEP-ADVISORY** -- 0/122 conversion proves the
  model correctly needs the full file; forcing a lossy summary is net-negative. Do NOT force.
- **ollama-route-pretooluse = ALREADY FORCED** (mode:auto, wired via read-bundle:16); its 0-offload is the
  exact-value guard correctly refusing .json/.md (only .log/.txt/.out qualify), not dormancy.
- **scripts/core/*.py = DROP** (stale: dead C:/PRISM root + 200K-window, 0 refs).
- **THE real dormant bug:** `getGraphNodeHits` (grep-index-first) was SILENTLY DEAD -- the 728MB
  system-graph.json exceeds V8's 512MiB string cap -> readFileSync(utf8) threw -> caught -> [] forever
  (V8-string-cap family, cf. tribal-index 2026-06-08). **Fixed:** `loadFindCacheNodes` cap-safe fallback
  (find-cache.json 62MB) -- revived 0->3 hits. + `decideForceGraphRead` force-deny (exact-name + on-disk-path
  + deny-once + PRISM_GREP_INDEX_FORCE=0 escape) -- was **LATENT** (find-cache + node-cards are path:null,
  verified 345,174 nodes / 0 with a path), now **ACTIVATED** by U-GREP-FORCE-ACTIVATE (same day, below).
- Map: `state/shared/specs/FORCE-USE-MAP.md`.

## U-GREP-FORCE-ACTIVATE (same day, slot:alpha) -- lit the latent force
The force-deny shipped dead. `scripts/lib/code-index-name-resolver.mjs` (cap-safe, fail-soft, +9 tests)
reads `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` (943KB, 4180 catalogued assets) -> a
`lower(name | file-stem) -> repo-relative path` index (EXACT-key only, no substring). `decideForceGraphRead`
now takes a `resolvePaths` fallback (cached once/process in grep-index-first.mjs). **LIVE:** `Grep AHPEngine`/
`calcDispatcher` -> DENY + path; substring `Engine`, uncatalogued, regex, re-grep (deny-once) -> ALLOW.
48/48, 2-arm scrutiny PASS. FORCE-USE-MAP.md gap marked CLOSED. Deferred P2: double-extension stem strip.

## Doctrine (the lesson)
**Force a feature ONLY when the forced path returns the SAME information cheaper.** A force substituting a
LOSSY artifact (summary/digest/rerank) for content the model may need verbatim is a quality regression --
keep those advisory. The biggest real token wins are reviving silently-dead cap-safe lookups + wiring
already-built guarded auto-routers, NOT advisory->deny flips on summary hooks. -> [[feedback_force_use_requires_lossless_substitute]].

Related: [[reference_feature_routing_graph_ms0_2026_06_15]] (the base graph) · [[feedback_psn_definition]] (the ladder).
