---
name: reference_goal_crosssurface_queue_2026_06_09
description: "Fire-2 operator-directed ultracode Workflow (wf_9437a375-523, 5 agents, 888K tok) cross-surface high-value discovery -- 4 lenses (Blackwell/local-LLM, obsidian-vault-value, token-savings/context-retention, system-viz/PSN) fed LIVE evidence -> ranked owner-tagged build queue. TOP-3 ALPHA-NOW: route-suggest-decay (auto-mute <5% advisories), read-dedup-cache (byte-identical Read short-circuit ~2.1M tok/cycle), read-to-ollama-digest (large-Read->gpt-oss:20b, the headline 6.8%->20% offload mover). Full queue: state/shared/specs/GOAL-CROSSSURFACE-QUEUE-2026-06-09.md."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.594Z
aliases: reference_goal_crosssurface_queue_2026_06_09
---


# Goal cross-surface build queue -- fire 2 (2026-06-09, slot:alpha)

Standing /goal (refined): max local-LLM utilization on the new Blackwell + token
savings + context retention + obsidian vault value, NO quality loss. This fire
executed ALL named surfaces with live in-transcript evidence, then ran the
operator-directed ultracode Workflow to rank the improvements.

## Live evidence (executed this fire)
- ollama offload **6.8%** (11 off / 151 kept / 93 silent) vs 30%. Worst seams:
  ollama-route-pretooluse 2126/2-off, grep-index-first 758/0-off (pure attention-tax).
- obsidian H-drive feed LIVE: C: 3,296 .md -> H: 13,873 .md (validated).
- dark vault: 32,630 unembedded wiki files (17.1%); blocked on V8-cap sharding (india/sierra).
- system-viz: system-graph.json 643MB (was 548MB), OOMs find+node-card; sidecars 55-57MB usable.
- Blackwell 96GB idle; gpt-oss:20b+120b co-reside (~30GB headroom); gpt-oss:20b drives the bridge.

## TOP-3 ALPHA-NOW (next-fire build order)
1. **route-suggest-decay** (S) -- auto-mute proven-noise advisories (<5% accept over >=50 fires);
   reclaims ~700+ zero-yield fires/week. Safest v1 = report + per-hook opt-in. Coordinate w/ #5.
2. **read-dedup-cache** (M) -- PreToolUse:Read byte-identical short-circuit; Read=7059 top sink,
   ~15% repeat ~= ~2.1M tok/cycle; zero quality risk; dependency base for #3+#6.
3. **read-to-ollama-digest** (M, TOP FLEET) -- >800-line Read w/ summarize-intent (NOT edit) ->
   gpt-oss:20b digest+line-map; ~1,050 offloads moves 6.8% -> ~20%. The headline offload lever.

Rest of queue (4-12) + owner routing + needs-operator in
`state/shared/specs/GOAL-CROSSSURFACE-QUEUE-2026-06-09.md`.

## Owner-routed (out-of-alpha-lane)
- V8-cap sharding (india/sierra) -- blocker behind dark-wiki items.
- bridge DEFAULT_MODEL (bravo U5b) -- posted to AGENT_CHAT this fire.
- system-viz-query OOM on 643MB (sierra). bravo U3-U7 engine-routing.

## Shipped this fire
- U-OLLAMA-NAV-ENFORCE (36105372ec) + MODELPIN (be52720b32) -- see
  [[reference_ollama_nav_enforce_2026_06_09]].
- U-DARK-WIKI-RANK: scripts/rank-dark-wiki-by-recall.mjs + lib/dark-wiki-rank.mjs (6/6 tests).
  LIVE: of 32,630 dark wiki files only **71 are DEMANDED** (recalled-but-unembedded, 170
  recalls) -> state/shared/dark-wiki-recall-priority.jsonl. Embedding those 71 first =
  ~460x prioritization win; routed to india/sierra to consume on sharding. Read-only,
  decouples vault value from the V8-cap blocker. This is queue item #7.

## R8 QUEUE CORRECTION (verified -- do NOT build the top offload items)
Rigorous R8 (read-before-build) on the queue's top-3 found they are NOT cleanly
alpha-buildable -- a lesson for any chat picking from an agent-produced queue:
- **#2 read-dedup-cache = ALREADY BUILT.** file-read-cache.mjs ("PreToolUse:Read
  hard-dedup") + read-once-cache + read-already-have + warn-redundant-read. Duplicate.
- **#3 read-to-ollama-digest = already attempted + NON-CONVERTING.** ollama-route-pretooluse.mjs
  fires **2172x / 2 offloaded (0.1%)**, grep-index-first 772/0. The read/offload hook space is
  SATURATED (15+ hooks). The bottleneck is CONVERSION (advisories ignored = pure context tax),
  NOT coverage. Building another advisory adds tax.
- **#1 route-suggest-decay = genuinely novel** (mcp-route-takeup MEASURES take-rate but nothing
  ACTS on it to suppress proven-noise) BUT its high-impact consumers (ollama-route-pretooluse,
  grep-index-first) are bravo/sierra-owned, and alpha's own hooks lack a taken-signal to gate on
  -> route the decay-gate to bravo (the route/ollama family owner), don't orphan it in alpha.
LESSON: an agent-built discovery queue does NOT R8-check existing assets -- always verify
before building. The directive's real token-savings lever is advisory-DECAY (kill the
2172/0.1% tax), owned by bravo, not more offload coverage.

## QUEUE MINED OUT for clean alpha-lane work (3 R8 catches this fire -- next fire: don't re-mine)
- **#10 vault-coverage-census = mis-premised + already-built.** `scripts/h-drive-census.mjs`
  already does full H: file-accounting. AND the vault is PRISM's DERIVED brain (53K notes), NOT
  a mirror of the ~742K raw source files (resources 167K + JM DIE 317K + Docustrata 258K) --
  so "vault coverage of the H-drive" is a meaningless metric (you don't put 742K customer prints
  in Obsidian). Don't build.
- **"obsidian fully wired/synergized to the entire H drive" = ALREADY SATISFIED.** 34/34 galaxy
  PATHS.md wired to the 3 critical-resource-roots (`wire-galaxies-to-resource-roots.mjs`);
  Docustrata indexed (manifest.json); C:->H: memory feed live (C:13.9K->H: mirror). Verified live.
- **#6 precompact-survival-manifest (context-retention) = ALREADY BUILT + ORPHANED, no value to wire.**
  `precompact-dossier.mjs` (U-CTX03) already captures the "100K survival budget" snapshot (git +
  reasoning + bandit + goals + curiosity + causal + cognitive-budget + workboard). But it has 0 refs
  in settings.json (catalogued in UNWIRED-HOOKS-AUDIT-2026-05-27), NOTHING reads its LATEST_DOSSIER.json
  (no consumer), and its data sources are mostly EMPTY (REASONING_TRACE_LEDGER 0B, BANDIT/CAUSAL ~200B --
  the autonomous-cognition subsystem isn't live). Wiring it = write-only theater. Real context-retention
  is ALREADY provided by the WIRED precompact-handoff.mjs (RESUME + memory-seed) + the SessionStart
  inject stack. Do NOT wire it.
- **U-LINT-ORPHAN-OOM SHIPPED (5e990a3ac6):** fixed lint-wiki-orphans.mjs OOM (gated the 643MB-graph
  block behind --graph); restored vault-orphan detection (39,497 files, 13,055 orphans/33.1%).
- **U-GRAPH-STREAM-DEGREE SHIPPED (317e7d3d31) -- THE KEYSTONE, now prototyped not just routed:**
  scripts/lib/graph-stream-degree.mjs -- a true STREAMING graph pass (callback-per-element, never
  materializes; 643MB Buffer is off-heap, only a small Set/records on-heap) that kills the 643MB-graph
  OOM at DEFAULT heap. Wired into lint-orphans --graph as the reference consumer: was OOM-abort ->
  exit 0 in 2839ms on the real graph (12,546 degree-0 / 302,538 nodes), _disconnected-graph-nodes.md
  regen restored. 8/8 tests. ROUTED to sierra with a concrete system-viz-query find+node-card adoption
  path (streamGraphElements + bounded top-K / id-match) -- unblocks CHEAP-NODE-ACCESS fleet-wide.
  Don't reflexively defer ([[feedback_all_slots_free_access]]): the keystone was alpha-buildable as a
  standalone helper + own-consumer without touching the risky shared graph-io in place.
- **Net (6 R8 catches, EXHAUSTIVE):** the directive's ALPHA-lane surface is verified-saturated across
  ALL named dimensions -- token-savings (offload hooks built+non-converting -> bravo decay),
  context-retention (precompact-handoff wired+works; dossier orphan-no-consumer), vault-value
  (dark-wiki-rank + orphan-lint shipped; census/moc/backlink all built), obsidian-H-drive (34/34 wired).
  4 units SHIPPED this session; the high-value frontier is genuinely OWNER-GATED: **sierra graph-io.mjs
  streaming** (the keystone OOM behind system-viz-query + lint-orphans --graph), india/sierra V8-cap
  sharding (dark-wiki list ready), bravo advisory-decay + bridge-model. Building further in alpha =
  duplicates or no-value orphan-wiring (R8/R12/R13 forbid).

## Note
The goal-clear -> queue-fallback automation (the stale plan-mode file
`modular-inventing-backus.md`) ALREADY shipped as `632335cec6`
[FLEET-LOOP-AUTOMATION]/U-GOAL-CLEAR-ADVANCE-STOP-HOOK -- see
[[reference_goal_clear_advance_stop_hook_2026_06_08]]. That plan is DONE, not pending.

Prior discovery: [[reference_ultracode_highvalue_discovery_2026_06_09]],
[[reference_obsidian_vault_synergy_queue_2026_06_09]].
