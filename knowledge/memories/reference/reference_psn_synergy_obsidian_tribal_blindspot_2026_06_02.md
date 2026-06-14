---
name: reference_psn_synergy_obsidian_tribal_blindspot_2026_06_02
description: PSN-SYNERGY-COLLECT-MS2 — fixed obsidian_brain false-isolation (3→10 peers) + tribal 530MB mis-path (0→33049) in the synergy collector
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.901Z
aliases: reference_psn_synergy_obsidian_tribal_blindspot_2026_06_02
---


PSN-SYNERGY-COLLECT-MS2 (slot:alpha, 2026-06-02, branch cad-fusion-live-ms0). Two measurement blind-spots fixed in `scripts/psn-synergy-collect.mjs` — the production feeder that builds the live `PSNLegInventory[]` consumed by `PSNSynergyInspectorEngine` (`prism_intelligence:psn_synergy_inspect`).

**Bug 1 — obsidian_brain falsely isolated.** The collector only counted obsidian → `{wiki, engines, memories}` cross_refs, leaving obsidian → `{tribal, system_viz, prism_ai, nn_gnn, prism_os, algorithms, formulas}` at zero — even though those bridges exist in production (memory→tribal capture via ObsidianVaultSyncEngine, octopus→obsidian via ConsensusObsidianPersistenceEngine, memories→GNN via graph-node-embedding-bridge, obsidian_viz_* into system-viz). The synergy math therefore reported the Obsidian PSN leg as under-wired/most-isolated. Fix: `scanObsidianOutEdges()` — one bounded single-pass over memory-file heads tallying real subsystem-mention patterns. Result: obsidian coverage_pct **40% → 100%**, out-peers 3 → 10, refs_out 8191 → 26918. Symmetric fix applied to the `memories` leg (⊂ obsidian_brain).

**Bug 2 — tribal leg counted 0.** `collectTribalLeg()` read `mcp-server/data/state/tribal-embed-index.json` (does not exist); canonical index is `state/shared/tribal-embed-index.json` (**~530MB**, shape `{schemaVersion, model, entries:[...]}`). It also `JSON.parse`d the whole file (OOM risk) and counted `Object.keys` (~5) instead of `entries.length`. Fix: candidate-path list + `countNeedleStreaming()` (1 MiB chunked scan of the per-entry `"embedding":[` delimiter, never parses the blob) + `j.entries` shape handling. Result: tribal node_count **0 → 33049**; total PSN nodes 40556 → 73605.

**Honest caveat (R12):** residual `P0_critical` ROI bands on obsidian↔{engines, system_viz, prism_ai, prism_os} are a *density-floor calibration artifact* (under_wired uses `refs/(count_a×count_b)`; at thousands-of-nodes scale every pair sits below the 0.001 floor) — uniform across all high-node-count legs, NOT obsidian-specific, and out of scope for this fix. The `coverage_pct` metric is the true connectivity signal and it is now correct.

**Verified:** real-data E2E — ran collector → fed live snapshot to `psnSynergyInspectorEngine.inspect()` via tsx → confirmed obsidian coverage 100% + all 10 peer edges populated.

**Follow-on (commit b64475b058):** wiki leg given the same treatment — hardcoded memories:0/obsidian_brain:0 + omitted legs → out-peers 1→10, coverage→100%. Extracted shared `countPatternsInFiles` (DRY, test-guarded). Now obsidian_brain, memories, wiki are all coverage_pct=100%.

**densityFloor recalibration — SHIPPED (commit 1be4e99e06, 3-of-3 PASS).** The diagnosis held: adding real edges pushed p0_critical 29→37 (more connectivity → MORE P0 flags = backwards) because absolute `densityFloor=0.001` is meaningless at thousands-of-nodes scale. Replaced with scale-invariant density-quantile ranking (the schema's own documented intent): zero-ref both-non-empty pairs → 1.0 (the ONLY P0 band); connected pairs ranked by density into [0,0.84]; empty-leg → 0. Real-snapshot effect: **p0_critical 37→19, all 19 now genuinely zero-ref** (actionable missing-bridge backlog), with a real P1/P2 gradient. Non-breaking (25 prior tests unchanged + 3 new proving P0-reduction/scale-invariance/monotonicity; 28/28). `opts.densityFloor` kept @deprecated/no-op for API compat.

**Two bugs found via the fix (commit cdff2006ca):** `scripts/psn-synergy-rank.mjs` carried an inline FALLBACK reimplementing the ranking with the OLD absolute thresholds (drift from engine). Root cause of why it was always used: the dist import passed a bare Windows absolute path (`"H:/…"`) which ESM `import()` treats as a URL scheme → `ERR_UNSUPPORTED_ESM_URL_SCHEME`, swallowed by `.catch` → dist engine NEVER loaded on Windows → fallback ran every time. Fixed: removed the 60-line fallback (single source of truth, R8, hard-fail if engine absent) + `pathToFileURL()` on the import. **Build caveat:** per-file `dist/engines/*.js` (tsc) can't be cleanly refreshed — blocked by 4 PRE-EXISTING unrelated tsc errors in `shopDispatcher.ts` (peer territory, untouched); the esbuild BUNDLE carries the fix for the MCP daemon.

**Still inbound-only / next iteration:** tribal (most-isolated, cross_refs={} — needs `source`-distribution stream-count of the 530MB index), algorithms/formulas/nn_gnn/prism_os/prism_ai (out-peers=1). Deferred: ObsidianVaultSyncEngine auto-discovery (configured:false). Tests: `scripts/psn-synergy-collect.test.mjs` (9/9). Lineage: [[reference_psn_synergy_collect_ms0_2026_05_23]] · [[reference_psn_synergy_inspect_ms0_2026_05_23]] · [[feedback_psn_definition]].
