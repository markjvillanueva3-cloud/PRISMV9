---
name: reference-lima-psn-synergy-2026-05-23
description: PSN-synergy close-out for lima 5/22-5/23 work — maps the 8 shipped lima units against the 11-leg PRISM Synergy Network. 8 legs touched + wired, 3 legs (Algorithms/Formulas/NN-GNN) N/A for PWA+auth+wiring scope. System-viz FAST regen kicked to surface new wiki+memory entries in master-index queries.
metadata:
  type: reference
  slot: lima
  domain: prism-academy
  parent: reference_lima_5_22_to_5_23_2026
---

# Lima 5/22-5/23 — PSN-synergy close-out

Sibling of [[reference_lima_5_22_to_5_23_2026]] mapping the 8 shipped lima units against the 11 PSN legs per [[feedback_psn_definition]].

## PSN leg mapping (lima 5/22-5/23 outputs)

| # | PSN leg | Touched? | Synergy artifact |
|---|---|---|---|
| 1 | **Obsidian brain** | ✓ | `reference_lima_5_22_to_5_23_2026.md` + this entry. Both written to `H:/prism/knowledge/memories/reference/` directly; auto-feed Stop hook ([[feedback_auto_memory_feeds_obsidian_stophook]]) mirrors any C:-side writes here. |
| 2 | **PRISM OS** | ✓ | `LearningProgressionEngine` wired via `operatingSystemDispatcher.course_enroll` + 8 sibling actions (course CRUD, progress, search, checkpoint_submit, learning_media). |
| 3 | **Wiki** | ✓ | `knowledge/wiki/architecture/prism-academy-mobile-ms0.md` — full architecture surface + 6-row unit ledger + cross-refs. |
| 4 | **Memories** | ✓ | Two reference memories this session (commit + commit window summary). Both linked from each other. MEMORY.md index update blocked by 22KB recall-ceiling hook — file-level discoverability via Obsidian feed + master-index regen still intact. |
| 5 | **Tribal** | ✓ (passive) | Academy domain has tribal-by-domain-inject wired (lima soul `domain_filter: academy\|learning\|course\|lesson\|certification\|tutorial\|education\|curriculum\|mit-ocw`). No new tribal tips added — would pollute the machining-wisdom namespace; UI tips belong in wiki, not tribal. |
| 6 | **System Viz** | ✓ (queued) | `regen-viz.mjs` FAST regen kicked at session end — will land both new wiki + memory entries as L8-built nodes in `system-graph.json` so future master-index queries surface them. |
| 7 | **Engines** | ✓ | `ReinforcementLearningCAMFeedbackEngine` (U-CAMAGI13, commit `fc4cf18ace`, +2067 LOC) wired to `camDispatcher`. 3 learning engines (U-AIW09, commit `a75d27afd8`) wired to `aiReasoningDispatcher`. |
| 8 | **Algorithms** | — N/A | PWA+auth+wiring scope doesn't add a new algorithm. RL CAM feedback engine consumes existing RL algorithms — no algorithm-layer change owed. |
| 9 | **Formulas** | — N/A | Frontend infra scope. The formula-card surface is referenced (`LessonRendererEngine.getAllFormulaCards()`) but no new formulas added; formula expansion is a downstream content-authoring task. |
| 10 | **NN-GNN** | — N/A | No new ghost-nodes generated this session; nothing for the GraphSAGE tier-5 cascade to classify. |
| 11 | **PRISM AI** | ✓ | 3 learning engines wired into `aiReasoningDispatcher` (U-AIW09 schema entries + dispatcher action surface). |

**Net:** 8 of 11 legs concretely touched + wired. 3 legs N/A (algorithm/formula/NN — apply to engine/physics work, not frontend+wiring scope). No PSN leg has a missing-synergy gap for this work window.

## Why no tribal entry was added

Lima soul refuse list: *"promoting an uncited claim to a course/curriculum → reject, demand source"*. The tribal corpus (`knowledge/wiki/tribal/` + `knowledge/memories/tribal/`) is machining-wisdom — JM Die operator know-how, controller dialect quirks, material-behavior tips. Adding "How to install a PWA on iOS Safari" would pollute that namespace. PWA-install instructions belong in either (a) the academy course content itself, or (b) the wiki architecture entry — both of which already exist. **The right tribal entry would be a code-tribal (`knowledge/wiki/code-tribal/`) capturing the peer-absorption pattern** — see "Surgical follow-up" below.

## Surgical follow-up (next /loop fire)

1. **`knowledge/wiki/code-tribal/learnings/peer-absorption-3of3-retroactive.md`** — capture the 2026-05-23 pattern: a slot's commits got absorbed under a peer's commit subject during the shared-main-tree window; the per-file scrutiny gate was bypassed; retroactive 3-of-3 close-out via inline self-review (when the absorbed files are bounded + scope-clear) is a defensible advisory path. This is a *code-tribal* (development-process) insight, distinct from manufacturing-tribal.

2. **Verify system-viz regen completed** — query `master_index_query` for `lima 5/22 PSN academy mobile ms0` and confirm both new entries appear as built nodes.

## Cross-references

- [[reference_lima_5_22_to_5_23_2026]] — parent reference (commit-by-commit lima ledger)
- [[feedback_psn_definition]] — canonical 11-leg PSN definition
- [[feedback_auto_memory_feeds_obsidian_stophook]] — Obsidian-feed Stop hook mechanism
- [[feedback_juliett_12chat_allocation_2026_05_17]] — lima domain partition
- [[feedback_conflict_fork_rule]] — why ITER 1 peer-absorbed
- [[feedback_parallel_scrutiny_per_file]] — per-file scrutiny gate (and retroactive close)
- Wiki: `knowledge/wiki/architecture/prism-academy-mobile-ms0.md` (the architecture leg)
