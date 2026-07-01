# AI-SYSTEMS GOAL -- fleet dispatch plan (slot:alpha, 2026-06-11)

**Standing /goal:** "improve ai systems, deep learning, deep reasoning, nn, gnn, lora, cag + rag + hybrids across all galaxies and domains and ensure they're all synergized with obsidian vault, hermes, psn, prism awareness of each galaxy, claude.md/souls.md of each galaxy, memories and wikis across all galaxies."

**Why this doc exists:** the goal is fleet-wide and spans many ownership lanes -- it is NOT one chat's work. One chat editing 34 galaxies' souls + india's GNN/LoRA production is a cross-lane clobber (forbidden by slot-worktree discipline + R8). This converts the goal into per-owner bounded units so the fleet executes it in PARALLEL. Each owner reads their row, verifies current state from the cited file (do NOT trust this doc's state claims without checking -- read-everything rule), and ships.

## Component -> owner -> next bounded unit -> grounding pointer

| # | Goal component | Owner slot | Concrete next unit (verify state first) | Grounding pointer |
|---|---|---|---|---|
| 1 | **GNN tier-5** | **india** | Wire a SELECTIVE-DEPLOY promotion path: the live tier-5 runs the ancient 8-dim AUROC-0.096 checkpoint; the selective checkpoint (AUROC 0.808 @ tau=0.7, 32% coverage) is production-ready-selective but `nn-graph-retrain-lifecycle.mjs` promotes ONLY on full-coverage `verdict==="deploy-ready"`. Add a gated selective-promote branch (opt-in flag, do not auto-flip live). | CLAUDE.md NN-GRAPH section; [[reference_gnn_selective_deploy_2026_06_06]]; alpha shipped checkpoint provenance 676dd275b5 |
| 2 | **GNN full-coverage gate** | **india** | Grow the reference pool + sharper features (H2GCN/GPU retrain) to lift full-coverage AUROC past 0.78 (calibration is a proven dead-end for Brier; it is ref-pool + arch, not calibration). Multi-seed before any AUROC claim. | [[feedback_multiseed_before_auroc_claim]]; CLAUDE.md NN-GRAPH "STATUS UPDATE 2026-06-06" |
| 3 | **LoRA** | **india** | Run the GPU fine-tune now that the corpus is trainingReady TRUE (856->1138 rows, wiki-canonical-pairs unblocked by tango 5ffc77fb35). Verify trainingReady + corpus path before launch. | recent commit 5ffc77fb35 (U-FLOR-WIKI-CANON-WIRE); [[reference_vault_to_ai_feeders_2026_06_09]] |
| 4 | **CAG** | **alpha** | CAG cold-cache is an aspirational catalog (Claude Code does not expose `cache_control` to hooks); the real caching is Anthropic's automatic prompt cache. Next: verify the cold-tier sources sit EARLY + STABLE in context so the auto prompt-cache actually covers them (positioning, not a hook directive). | `scripts/lib/cag-router.mjs#COLD_SOURCES`; `cag-cold-cache-anchor.mjs`; this session's CAG verification |
| 5 | **RAG + hybrids** | **alpha** (memory-RAG) + **india** (corpus) | Verify `memory-rag-inject.mjs` retrieval quality (it injects prompt-relevant memory hits every turn -- the legitimate every-turn variable cost); india owns the RAG corpus + partial-dense hybrid (charlie shipped U-RAG-PARTIAL-DENSE 86e7e6b77e). | recent commit 86e7e6b77e; [[reference_fleet_injection_budget_audit_2026_06_11]] |
| 6 | **Deep reasoning** | **india** + octopus | The galaxy-reasoning bridge now has opt-in deep-reasoning mode (gpt-oss:120b->deepseek-r1:32b, b6bc5de8cd); the octopus multi-model consensus ledger is live (PSN-OCTOPUS-FLEET-SYNERGY). Extend deep-reason coverage per galaxy. | recent commit b6bc5de8cd; CLAUDE.md PSN-OCTOPUS-FLEET-SYNERGY-MS0 |
| 7 | **Obsidian vault synergy** | **alpha** | Auto-feed (C: memory -> H: knowledge/memories) fires every Stop and is healthy; vault->AI feeders wired (vault-to-gnn-refpool, vault-to-lora-dataset). Next: verify feeder freshness + coverage. | [[reference_obsidian_fully_operational_2026_06_09]]; [[reference_vault_to_ai_feeders_2026_06_09]] |
| 8 | **Hermes / Zulu** | **bravo / zebra** | Hermes master-orchestrator + slot-brief channel; extend agentic-loop coverage. | [[reference_hermes_master_orchestrator_arch_2026_06_02]]; [[reference_slot_brief_channel_2026_06_02]] |
| 9 | **PSN awareness across galaxies** | **sierra** (system-viz) + **bravo** (octopus) | The build-once PSN-octopus layer shipped (corpus loader, 5 text legs, ledger 522B->9244B); cross-substrate typed edge spine shipped (sierra). Wave-3 per-galaxy: corpus-tuning + ledger-roosts + verify-links. | CLAUDE.md PSN-OCTOPUS-FLEET-SYNERGY-MS0 + CROSS-SUBSTRATE-SYNERGY-MS0 |
| 10 | **Per-galaxy souls.md / CLAUDE.md / wiki / memory** | **each domain slot** | Each slot runs its `/galaxy-buildout-<slot>` to ensure its 5 PSN legs (soul/claude.md/wiki/memory/tribal) are populated + master-index back-pointer present. delta=CAD, kilo=CAM, mike=WEDM, oscar=SFC, whiskey=lathe, foxtrot=mill, charlie=quoting, hotel=business, lima=academy, echo=post-proc, xray=blueprint, juliett=database, quebec=frontend. | `state/shared/per-slot-galaxy-buildout/<slot>.md`; MASTER-BRAIN-TEMPLATE; master MEMORY.md galaxy back-pointers |

## Cross-cutting (whole-fleet, no single owner)
- **GNN <- vault <- LoRA loop:** india's GNN ref-pool is fed by alpha's Obsidian vault (vault-to-gnn-refpool); the LoRA corpus by vault-to-lora-dataset. Keep the feeders fresh = the synergy backbone.
- **PSN 11-leg coverage:** every galaxy should light all 11 legs (Obsidian/PRISM-OS/Wiki/Memories/Tribal/System-Viz/Engines/Algorithms/Formulas/NN-GNN/PRISM-AI). The per-prompt PSN-leg-state hook surfaces concerning legs with `-> owner`.

## Immediate safe actions (any slot, now)
1. **DO NOT restart the context-bundle daemon** (would ADD the bundle on top of 60 still-wired legacy injectors = worse; Phase C1 migration incomplete). See chat-1781194016377.
2. india: pick up rows 1-3, 5-6 (the AI-systems core). This is india's galaxy.
3. Each domain slot: row 10 (`/galaxy-buildout-<slot>`).
4. alpha (me): rows 4, 7 (CAG positioning + vault-feeder freshness) -- my lane, on request.

## Honest status (R12)
Shipped this session toward the goal: GNN checkpoint provenance (676dd275b5, alpha), fleet surrogate guard (83e5aa61d4), injection throttle (791f2073ac). The rest above is NOT done -- it is dispatched to owners. This doc is coordination, not completion.
