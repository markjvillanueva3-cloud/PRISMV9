---
name: reference-audit-actionmap-synergy-chain-2026-05-18
description: U-ECHO-AUDIT-ACTIONMAP (9e27d9d420) — audit-unwired-engines table-driven detection fix + the 9-surface synergy chain it propagates through
aliases: reference_audit_actionmap_synergy_chain_2026_05_18
type: reference
slot: echo
source: prism-memory
synced: 2026-06-09T14:54:09.023Z
---


# U-ECHO-AUDIT-ACTIONMAP — audit-unwired-engines table-driven detection + synergy chain (2026-05-18 echo)

Shipped 2026-05-18 by claude-00a9c6dc slot echo. Commit `9e27d9d420` on `cad-fusion-live-ms0`. `scripts/audit-unwired-engines.mjs` (the wiring auditor BUILD_STATE.json's NEEDS_WIRING is built from) was UNTRACKED on every branch AND its detector regex only matched engine names in literal import paths. `mechanicalDesignDispatcher.ts` and `fluidThermalDispatcher.ts` each wire ~51 engines via a **table-driven `ACTION_MAP`** — `await import(\`../../engines/${file}.js\`)` (templated, variable) with the engine name as a quoted tuple element `["EngineName", "export", "method"]`. The detector never saw those quoted-table references, so ~28 genuinely-wired engines (SpringCalcEngine, BallScrewSelectionEngine, CamProfileEngine, …) were systematically false-flagged UNWIRED — fleet-wide.

**The fix:** new exported pure predicate `engineReferencedInConsumer(name, content)` detects three forms — static import, literal dynamic import, AND table-driven ACTION_MAP wiring (templated dynamic import present AND basename as the comma-terminated first tuple element `['"]Name['"]\s*,`). Literal import paths anchored to a path-segment boundary via `(?:[^'"]*/)?` so `FooEngine` is not matched inside `SuperFooEngine.js`. Engine basename `escapeRegExp`-escaped before interpolation. `.test.ts` / `.spec.ts` / `.types.ts` / `.archive.*` siblings excluded from the engine set. `main()` guarded so the module is importable by the test without triggering a full scan.

**Why the comma matters (R12 honest scope):** Form 3's two conditions are file-global, not co-located. The `,`-after-quoted-token requirement excludes prose/error-string mentions (the common false case — round-1 reviewer demonstrated `// the "GhostEngine" adapter is deprecated` in a templated-import file would otherwise false-WIRED). A comma-separated quoted mention in a comment inside such a file could still match — that residual false-WIRED risk is narrow and strictly less harmful than the false-UNWIRED bug it replaces.

**Verification:** 18 `node:test` cases incl. a real-file E2E against `mechanicalDesignDispatcher.ts` plus fail-on-revert guards for every detection form (the round-1 P1 case is a dedicated regression test). Per-file 2-reviewer scrutiny: round 1 FAIL (file-scoped false-WIRED) → fixed → round 2 PASS/PASS. Re-running the audit: UNWIRED 709→682, WIRED-DIRECT 2389→2417 (+28 exact correction).

## The 9-surface synergy chain this commit drives

The user's `/goal synergize prism mcp server, obsidian, qdrant, ollama, docker, system-viz, prism ai system, prism neural network, prism learning` directive named nine surfaces. The audit-detector fix above is the upstream truth-source that propagates through every one of them:

1. **MCP server** — `scripts/audit-unwired-engines.mjs` now committed (`9e27d9d420`) → future regenerations produce accurate output → `prism_session:master_index_query` (live-verified at `http://127.0.0.1:3100/mcp` via JSON-RPC POST — returned 1264 hits for "kienzle cutting force" with byBuildClass:{wired:1124,unknown:140}) reads accurate wired/unwired classifications.
2. **BUILD_STATE awareness** — `node scripts/build-state-snapshot.mjs` regen: `built_engines 2573→2601 (+28)`, `needs_wiring 709→682`. SessionStart `build-state-inject` hook flows this into every chat's awareness.
3. **system-viz** — next `regen-viz.mjs` cron runs `seed-ghost-from-unwired.mjs` (NN-GRAPH-MS2/U1 stage) against the corrected audit → `ghost.unwired-engine` reference nodes in the 243,687-node graph become accurate.
4. **PRISM neural network** — the cleaner ghost set seeds the NN-GRAPH retrain pool. Lifecycle fired live this session (`scripts/nn-graph-retrain-lifecycle.mjs --dry-run`): read graph (243,687 nodes / 646,986 edges / 0 ghosts pre-regen-viz), drift analysis 0%, baseline age 4.4h < 168h threshold, decision `action=skip ok=true promoted=false` (correct — no drift, no retrain).
5. **PRISM learning** — the audit→BUILD_STATE→ghost-seed→NN-pool→retrain-lifecycle chain is the closed-loop feedback path; iter-1's fix is the upstream correctness that flows through it.
6. **Ollama** — `ask-ollama viz "cutting force kienzle dispatcher" --synth --model qwen2.5-coder:7b` ran live: scanned 24,940 graph nodes deterministically, then synthesized a coherent answer naming actual artifacts (`KienzleForceModelEngine`, `formula-constants-kienzleforce`). Separately the L2b agent-loop bridge `scripts/ollama-prism-bridge.mjs` ran end-to-end against live `:3100/mcp` (qwen2.5-coder:7b returned the structurally-correct `mcp_call` JSON as text rather than via Ollama's `tool_calls` field — a known model-fidelity limitation; CLAUDE.md notes L3 deferred for exactly this reason).
7. **Docker** — autostart launcher brought up postgres/prism-server/prometheus/qdrant (ollama port-skipped — native instance already on :11434); `prism-server` healthcheck → HTTP 200 on `:3100/health` and JSON-RPC working on `:3100/mcp` (proven by the 1264-hit query above).
8. **Qdrant** — running on the standard Docker port, surfaced via `prism_session:master_index_query`'s ranking layer (the response carried wiki+memory entries per hit, the integrated Obsidian+wiki+graph ranking surface).
9. **Obsidian** — the same `master_index_query` returned `memoryEntries` arrays per hit (`plugin_architecture`, `reference_slot_force_fix_2026_05_16`, etc.); this memory file itself flows back to the Obsidian vault on Stop via `stop-obsidian-memory-feed.mjs`.

## Recurring class

Sister to [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]] (delta's CAD audit also surfaced "digest=0 absent" false-positives that turned out already-ported — the same class of "audit measurement is wrong before audit findings are actionable" lesson). Doctrine pin (R12 + R5 + R10): when an audit flags a high-volume class of work, READ THE AUDIT SCRIPT FIRST and verify against the live system before chasing its findings. The 709-engine number turned out to include ~28 already-wired false-positives traceable to one detector blind spot — three iterations of wiring those would have been wasted effort.

**Blueprint:** `scripts/audit-unwired-engines.mjs` (the fix), `scripts/audit-unwired-engines.test.mjs` (18 cases, real-file E2E). Stop-hook integration: regression-auto-write.mjs adds the commit to CLAUDE.md `## Recent regressions` on session end.
