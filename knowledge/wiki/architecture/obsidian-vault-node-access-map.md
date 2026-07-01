---
title: Obsidian-vault node-access map (cheapest token path per node type)
category: architecture
sources: 1
confidence: 0.9
last_verified: 2026-06-09
tags: [obsidian, vault, cheap-node-access, token-economy, system-viz, sierra]
---

# Obsidian-vault node-access map

**The cheapest token path to reach EVERY vault node type.** Built by slot:sierra (2026-06-08, ultracode workflow `wf_a6916cfe`) answering the operator goal "map paths to each obsidian vault node for cheaper/free token usage." Companion to [[feedback_obsidian_low_token_2nd_brain_protocol]] (the doctrine) and the CHEAP-NODE-ACCESS-MS0 primitive. Sierra-owned (system-viz domain).

**Golden rule:** never read `state/shared/system-viz/system-graph.json` (644–675MB ≈ 186K tokens) to reach a node. A node-card seek is ~136 tokens — a **99.93% cut**. Most paths below are FREE (BM25/seek/local-Ollama, zero paid tokens).

## The map

| node type | on-disk path | cheapest token path (skill / script / hook) | ~cost | free? |
|---|---|---|---|---|
| **graph node (ANY, 301K / 51 namespaces)** | `system-graph.json` (NEVER read) | `node scripts/system-viz-query.mjs node-card <id>` · skill `/node-card` — seeks offset index | ~136–200 | ✅ |
| **graph node named in prompt** | (same) | hook `node-card-prefetch-inject.mjs` (auto UserPromptSubmit) — `seekCard`, **zero tool call** | tiny | ✅ |
| **graph node + vault doc pointers inline** | (same) | hook `pre-bash-graph-inject.mjs` on grep/find/cat — `📂 vault paths` line (U-SV-NODE-VAULT-PATHS) | ≤1.5KB | ✅ |
| **vault doc → graph node(s) (REVERSE edge, U-VAULT-REVERSE-EDGE)** | `vault-backlinks.json` (NEVER read — 19.8MB; auto-refreshed in the regen tail, U-VBL-REGEN-WIRE) | CLI `node scripts/system-viz-query.mjs doc-nodes <wikiPath\|memorySlug>` OR MCP `prism_session:doc_nodes` (U-VBL-DISPATCHER, latent until daemon restart) — inverted index, then `node-card <id>` for live state | ~tens | ✅ |
| **wiki:architecture (540)** | `knowledge/wiki/architecture/*.md` | `/wiki-query <q>` → `prism_wiki:wiki_index_read`; big bodies → `/route-to-obsidian` (Ollama) | low / saves 3–10K | ✅ |
| **wiki:code-tribal (1101)** | `knowledge/wiki/code-tribal/*.md` | `/wiki-query` or `master-index-precheck-inject` (auto top-5) | <1KB | ✅ |
| **wiki:lessons (228)** | `knowledge/wiki/lessons/*.md` | `/wiki-query` · `/brain-recall <q> --wiki-only` | low | ✅ |
| **wiki:{reference,SE,os,concepts,entities,formulas,training,coordination,decisions,ux}** | `knowledge/wiki/<type>/*.md` | `/wiki-query` (BM25 over index.md + leaf-index) | low | ✅ |
| **wiki:{patterns,trajectories,summaries}** | `knowledge/wiki/<type>/` | **GAP — empty dirs**, no nodes exist (spec'd, unpopulated) | — | — |
| **mem:reference (10,927)** | `knowledge/memories/reference/*.md` | `/brain-recall <q>` · `/memory-search` · hook `memory-index-precheck-inject` (auto always-on) | ~3 lines | ✅ |
| **mem:feedback (239 doctrine)** | `knowledge/memories/feedback/*.md` | `/brain-recall <q> --memory-only`; auto via memory-index-precheck-inject | ~3 lines | ✅ |
| **mem:{project,patterns,user,scrutiny,uncategorized}** | `knowledge/memories/<type>/*.md` | `/memory-search --kind=K` · `/brain-recall` | low | ✅ |
| **mem recall by keyword ("remember/last time")** | (same) | hook `memory-rag-inject.mjs` (WIRED — U-VAULT-RAG-WIRE `9e4376b3b2`, 2026-06-08); also always-on `memory-index-precheck-inject` | ~3 lines | ✅ |
| **tribal:tips (3,920)** | `knowledge/tribal/*.md` (idx `tribal-embed-index.json` 532MB) | hook `tribal-by-domain-inject` (auto slot-domain top-3) · `/brain-recall` · `/distill-tribal` | ~3 lines (+~3s Ollama) | ✅ |
| **tribal:quarantine (~327)** | `knowledge/tribal/auto-ingested-quarantine/*.md` | `/synergy-recall <q>` (5-surface fan-out) | ≤15 lines | ✅ |
| **galaxy-card (34)** | `state/shared/galaxy-cards/*.card.md` | `node scripts/galaxy-knows-map.mjs who <q>` — 1 lookup over KNOWS-MAP.json | ~767 (whole idx) | ✅ |
| **canvas:system-map (354 nodes / 305 file)** | `knowledge/PRISM-System-Map.canvas` (146KB — NEVER full-Read) | CLI `node scripts/system-viz-query.mjs canvas` (structural summary) · `canvas-doc <vaultPath>` (which node maps a doc → chains `doc-nodes`→`node-card`) — `scripts/lib/canvas-read-lib.mjs`, fail-soft, ⚠STALE flag (U-CANVAS-READ) | ~tens | ✅ |
| **vault:root-index** | `knowledge/PRISM Knowledge Vault.md` | direct `Read` (small landing page) | small | ✅ |
| **aux:{gsd(69),claude-md(88),Skills(41),decisions(5)}** | `knowledge/{gsd,claude-md,Skills,decisions}/*.md` | `/master-index <q>` · direct Read of named file | ~200/q | ✅ |
| **C: auto-memory SOURCE (1,441 flat)** | `C:/Users/wompu/.claude/projects/H--prism/memory/*.md` | `/memory-search` · `/remember` (write); read via H: mirror | low | ✅ |
| **cross-surface (everything at once)** | all of the above | `/synergy-recall <q>` (master-index+tribal+memory+wiki+skills) · `/brain-recall` (4 substrates) | ≤15 lines | ✅ |

## Coverage

Every **populated** node type now has a verified free (≤200-token) path — including the `.canvas` (U-CANVAS-READ, 2026-06-09) and keyword memory-recall (`memory-rag-inject` re-wired U-VAULT-RAG-WIRE `9e4376b3b2`). The ONLY remaining gap is the empty wiki dirs (`patterns`/`trajectories`/`summaries` — spec'd but unpopulated, so there are no nodes to reach). **Full populated-node coverage achieved.**

## How the cheap-read primitive works (CHEAP-NODE-ACCESS-MS0)

`readCard(id)`/`seekCard(id)` parse a 24MB offset map once, then `fs.read` exact bytes from `node-cards.jsonl` (159MB, gitignored) — one record, never the 644MB graph, never throws on a miss. 301,216 cards, regenerated inside `build-graph-index` regen. The card carries `wikiEntries` + `memoryEntries` (top-8) = the node→Obsidian-vault edge, so one seek returns the node AND its doc pointers. See PRISM CLAUDE.md §CHEAP-NODE-ACCESS-MS0.

## The REVERSE edge (U-VAULT-REVERSE-EDGE, 2026-06-08 slot:sierra)

The forward edge above answers "graph node → which vault docs document it." The **reverse** answers "this vault doc → which live graph node(s) does it document" — so an agent reading a wiki/memory doc can jump to the node's real status/wiring without grepping the 644MB graph. `build-vault-backlink-index.mjs` STREAMS the existing `node-cards.jsonl` (zero graph reads — it inverts data already projected) into `vault-backlinks.json`: **29,479 vault keys ← 1,520,813 edges from 301,216 cards** (2,657 keys capped at NODE_CAP=50, honest `total`). `backlinksFor(query)` (`scripts/lib/vault-backlink-read.mjs`, fail-soft, load-once cache) normalizes a wiki path OR memory slug to a canonical key and returns the node ids; the CLI `doc-nodes <doc>` prints them + the `node-card` next-step. Round-trip-proven consistent: `doc-nodes(D)` → node N → `node-card(N).wikiEntries` lists D back. The agent pays only the small answer (~tens of tokens), never the 19.8MB index. Schema purity + reader fail-soft → 32 tests. **GAP CLOSED:** "vault→graph reverse unmapped" is now a free ≤200-token path.

**Full treatment (VAULT-REVERSE-EDGE-COMPLETE, 2026-06-09):** the reverse edge now has node_card's full kit — (1) **auto-refresh** (U-VBL-REGEN-WIRE): a fail-soft stage in `regen-viz.mjs` rebuilds `vault-backlinks.json` every regen right after `node-cards.jsonl` is written (no more rot; the staleness flag was the band-aid); (2) **MCP-invokable** (U-VBL-DISPATCHER): `prism_session:doc_nodes` (`sessionDocNodesAction.ts`, 14 tests) — latent until the next daemon restart, CLI live today. **DEFERRED by ROI assessment:** a per-prompt prefetch hook (low firing rate on raw prompts + high false-positive risk on bareword/snake_case keys — unlike node_card's distinctive dotted prefixes) and an offset-seek variant (no live consumer once the hook is deferred; the dispatcher load-once-caches in the long-lived MCP process).

## The CANVAS reader (U-CANVAS-READ, 2026-06-09 slot:sierra) — the last populated-node gap, and a THIRD graph join

`knowledge/PRISM-System-Map.canvas` is the graph→Obsidian SUMMARY (354 nodes = 305 `file` + 49 `text` layer headers, 579 edges) written by `generate-vault-graph.mjs` (already wired into regen-viz post-merge — the source auto-refreshes; no new regen-wire needed). It was the last populated vault-node type with no cheap path — reading it meant a 146 KB full Read (~40 K tokens). `scripts/lib/canvas-read-lib.mjs` (fail-soft, load-once cache, NEVER the 644 MB graph — parses the small canvas, only STATs the graph mtime for the ⚠STALE flag) exposes:
- `summarizeCanvas()` → CLI `system-viz-query canvas`: counts + the authored layer headers + per-layer file samples (~tens of tokens).
- `canvasNodesForDoc(query)` → CLI `canvas-doc <vaultPath>`: which canvas node(s) reference a doc.

**The synergy payoff — a THIRD cheap join into the graph.** `canvasNodesForDoc` reuses `normalizeVaultKey` (the same fn behind `vault-backlinks.json`), so each canvas `file` node's path lands in the SAME key space as the reverse edge. That makes the full chain cheap and round-trip-proven on live data:

```
canvas-doc <file>  →  canvas node (n0-L0-0 [L0])          # is it on the map, and where
   → doc-nodes <key>  →  graph node id (p.estimator)       # vault doc → live node (reverse edge)
   → node-card <id>   →  live state [L0·p·built] + wiki    # node's real status; wiki lists the file BACK
```

Proven 2026-06-09: `prism-tool-life-estimator.md` → `n0-L0-0` → `p.estimator` → its `wikiEntries` lists the file back (round-trip consistent). 15 tests (happy + summary + 4-branch staleness + miss + memory-slug join + 3 failure + 3 adversarial + live smoke); per-file 2-reviewer PASS (0 P0; 3 P1 test/edge-guards fixed: `samplesPerLayer` guard, substring positive-control, memory-slug join coverage). Live-caught + fixed: the `Lgit` layer was miscounted as "other" (an `L[0-9]+` regex misses the alphabetic-suffix git layer; now `L(?:git|[0-9]+[a-z]?)`). **DEFERRED with evidence:** a `prism_session:canvas_nodes` dispatcher mirror — latent-until-daemon-restart under the migration freeze + shared-tree contamination risk + the CLI fully serves it live + modest marginal value (the canvas is a curated summary view, not a hot per-call surface). Same disciplined-ROI deferral as the vault-reverse-edge prefetch hook; revive when the daemon restarts and an in-session consumer appears.

## Open work (dependency-ordered, R13)

- **A (P0) — ✅ DONE:** ~~U-VAULT-RAG-WIRE~~ `memory-rag-inject` re-wired (`9e4376b3b2`, 2026-06-08) · ~~U-VAULT-SYNC-RESILIENT~~ per-file try/catch+retry shipped (`168c20264`, 2026-06-08).
- **B (P1):** U-VAULT-MAINT-CRON (schedule promote + rot-sentinel); U-VAULT-INDEX-META (stamp wiki/index.md frontmatter).
- **C (P2 write-back):** U-VAULT-LINK-HEAL (4,136 broken `[[links]]`); tribal→wiki coverage; re-inject dedupe; inbox/mistakes daily-process; DailyFlashReportEngine email stub.

## Cross-refs
- [[feedback_obsidian_low_token_2nd_brain_protocol]] · [[reference_obsidian_vault_audit_2026_06_08]] · [[reference_humza_khalid_obsidian_article_2026_06_08]] · [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]]
- [[architecture/cheap-node-access-ms0]] · [[architecture/system-viz-galaxy]] · [[feedback_psn_definition]]
