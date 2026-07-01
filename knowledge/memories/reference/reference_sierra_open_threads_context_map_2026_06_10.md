---
name: reference_sierra_open_threads_context_map_2026_06_10
description: Verified inventory of ALL open/unfinished/unwired/dormant system-viz (sierra) work as of 2026-06-10 — the cheap-regain context map for the domain. ROI-ranked with cheap-regain pointers.
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.199Z
aliases: reference_sierra_open_threads_context_map_2026_06_10
---


# Sierra / system-viz — open-thread context map (verified 2026-06-10)

Compiled at session start of the 2026-06-10 `/loop /goal` context-regain (claude-0608af86). Sources cross-checked: `MEMORY.md`, `system-viz_synthesis.md`, CLAUDE.md sierra sections, `slot/sierra` git log (last 18), live graph-health. **Cheap regain:** read THIS file first; then `node scripts/system-viz-query.mjs node-card <id>` for any node; `memory_search "system-viz <topic>"` for detail.

## Branch reality (IMPORTANT)
- My work tree = `H:/prism-slot-sierra` on branch **`slot/sierra`** (commit + edit HERE).
- Main tree `H:/prism` is on `cad-fusion-live-ms0`; its CLAUDE.md lags slot/sierra by sierra's recent ships.
- Live 713MB `system-graph.json` + sidecars live in `H:/prism` (query there); source `.mjs/.ts` mirrored on both.

## VERIFIED status per milestone

### CHEAP-NODE-ACCESS-MS0 (sierra-owned)
- ✅ `prism_session:node_card` action **WIRED** on slot/sierra (`sessionDispatcher.ts:177,1879` + `sessionNodeCardAction.ts`; main-tree CLAUDE.md still says "staged" — STALE there).
- ✅ offset index, prefetch hook, find→node-card pairing all shipped.
- **REMAINING:** (a) CAG cold-tier skip in the prefetch hook; (b) GPU semantic `--near` (nomic-768d nearest-node search).

### CROSS-SUBSTRATE-SYNERGY-MS0 (sierra-owned)
- ✅ All **4/4 typed edges** materialized: `owned-by-slot`, `documented-by` (320), `embeds` (948), `consensus-of` (1). Spine = 1348 edges.
- ✅ Self-monitoring: `detectEdgeDrift` (collapse detector) + sierra graph-health drift surface (U-XSUB-DRIFT-DETECT/SURFACE) + bugclass-sweep (endpoint-confirm-vs-merged-graph canonical rule).
- **REMAINING (from `state/shared/specs/CROSS-SUBSTRATE-SYNERGY-BOUNDED.md`):** (a) **regen-viz exec** to fold edges into the LIVE merged graph (gated on RAM/merge-OOM — but regen is GREEN now, may already be folded — VERIFY `G.meta.crossSubstrateEdges`); (b) Blackwell offload of system-viz model calls; (c) per-galaxy doc-sync as a per-slot `/loop`.

### OBSIDIAN-VAULT gap ladder (sierra-owned, audited 2026-06-08; `[[reference_obsidian_vault_audit_2026_06_08]]`)
Verdict was OPERATIONAL-WITH-GAPS. Cheap-read path LIVE. Gaps (all in the self-maintenance/write-back layer — VERIFY each before building, 3 days stale):
- **A (P0 silent):** `U-VAULT-RAG-WIRE` — `memory-rag-inject.mjs` wired 0/0/0 (header falsely claims wired, R12). `U-VAULT-SYNC-RESILIENT` — `obsidian-memory-sync.mjs:342` crashes on one locked file (UNKNOWN -4094) aborting the C:→H: pass (per-file try/catch+retry).
- **B (P1 manual):** `U-VAULT-MAINT-CRON` (promote-memory-to-wiki + vault-rot-sentinel unscheduled). `U-VAULT-INDEX-META` (wiki/index.md frontmatter stale).
- **C (P2 net-new):** `U-VAULT-LINK-HEAL` (4,136 broken `[[wikilinks]]`, nothing heals — first bidirectional unit); tribal→wiki 31.5%; re-inject dedupe; inbox/mistakes empty (no daily-process writer); `DailyFlashReportEngine.ts:149` email = `console.log` stub.

### Merge-OOM keystone (recurring sierra blocker)
- Graph-health GREEN now (713MB, last good regen ~1.2h ago, pending=0). So **not an active hard block** — intermittent.
- Failure family `[[reference_sierra_graph_oom_classes]]`: V8 external-alloc / **512MB string cap** (`0x1fffffe8`) on `JSON.parse`/`JSON.stringify` of the whole graph — `--max-old-space-size` does NOT fix the string cap. Fix pattern EXISTS: Buffer-incremental read (`scripts/lib/load-tribal-index.mjs`) + streaming write.
- **136GB RAM + Blackwell now available** (`[[feedback_build_for_blackwell_hardware]]`) — heap side unblockable; string-cap side needs the Buffer/stream pattern applied to `merge-augmentations.mjs` if a future graph write exceeds cap.

### FAST[] register gap
- Older memory `[[reference_sierra_regen_fast_registration_gap_2026_05_29]]`: 9 `*-features.mjs` absent from regen-viz FAST[], 2/9 wired, 7 blocked on merge-OOM. **Now ~48 FAST refs vs 47 features files — likely mostly closed; VERIFY the 7-gap before acting.**

### Tribal index sharding
- Sibling-writer shard-safe shipped (`7166f51e41`, `[[reference_tribal_shard_read_clobber_2026_06_10]]`). Re-embed was "restoring" — VERIFY it completed (`tribal-embed-index` manifest + shard count).

### NN-GRAPH (india owns model; sierra owns graph + ref-pool)
- Tier-5 SELECTIVE-DEPLOY live (AUROC 0.808 @ τ=0.7, 32% coverage). Full-coverage lift = **reference-pool growth** (a sierra-side lever: more high-confidence `ghost.unwired-engine` reference ghosts) + sharper features (H2GCN/GPU). `[[reference_gnn_selective_deploy_2026_06_06]]`.

## NEW operator task (2026-06-10)
- **Link system-viz galaxy into zulu** to use Hermes + Obsidian capabilities. Mechanism: `zulu-context-load.mjs` → `zebra-context-bundle.mjs#loadSlotContext`. Ensure system-viz surfaces (graph-query, node-card, ghost roosts) are reachable from the Hermes orchestration layer; verify `zulu-capability-report.mjs` includes system-viz.

## Synthesis open threads (advisory, from auto-synth)
- drift-correction vs ghost-wire-validate reconciliation (no explicit mechanism).
- multi-galaxy LoRA runtime/deploy path in the live stack.
- extending Zulu's knowledge-surface map beyond the current 10 surfaces.

## ROI-ranked next-work queue (this loop)
1. **Persist this map + enhance domain retention** (deliverable #2) — DONE this iter.
2. **Vault P0 fixes** (RAG-WIRE + SYNC-RESILIENT) — silent failures IN the retention layer the goal cares about. Highest alignment.
3. **Link galaxy → zulu** — explicit new ask, bounded.
4. **regen-exec verify + Blackwell offload** — confirm cross-substrate edges live; offload model calls.
5. Vault P1/P2, FAST-register verify, tribal re-embed verify, ref-pool growth.

Related: [[reference_obsidian_vault_audit_2026_06_08]] · [[reference_cross_substrate_synergy_ms0_2026_06_03]] · [[reference_cheap_node_access_ms0_2026_06_04]] · [[reference_sierra_graph_oom_classes]] · [[feedback_build_for_blackwell_hardware]]
