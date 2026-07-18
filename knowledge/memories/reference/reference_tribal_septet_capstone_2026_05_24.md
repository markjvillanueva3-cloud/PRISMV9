---
name: reference-tribal-septet-capstone-2026-05-24
description: Tribal-corpus SEPTET + capstone orchestrator shipped slot:foxtrot iter44-iter52 2026-05-24 — 7 process-domain operator-wisdom corpora + 1 unified router behind prism_safety dispatcher
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.229Z
aliases: reference_tribal_septet_capstone_2026_05_24
---


# Tribal-corpus SEPTET + capstone — foxtrot iter44-iter52 (2026-05-24)

**Trigger:** /loop cron "all units to complete sessions autonomously" — slot:foxtrot, claude-047e0a72, 23 engines shipped iter29-iter52 with the back half (iter44-iter52) building the tribal-corpus septet + orchestrator.

## What shipped

7 process-specific tribal-knowledge corpora + 1 capstone orchestrator, all wired into `prism_safety`:

| Iter | Engine | Action | Tests | Domain |
|------|--------|--------|-------|--------|
| iter44 | OperatorCoachingTipsEngine | `operator_coaching_tips` | ~20 | General machining (mill/lathe/wedm drilling/tapping/threading/parting/chatter/BUE) |
| iter46 | SinkerEDMTribalCorpusEngine | `sinker_edm_tribal_surface` | 23 | Sinker EDM (electrode polarity/flushing/dielectric/servo) |
| iter47 | LaserCuttingTribalCorpusEngine | `laser_cutting_tribal_surface` | 29 | Laser cutting (gas/focal/pierce/ANSI Z136.1) |
| iter48 | WaterjetCuttingTribalCorpusEngine | `waterjet_cutting_tribal_surface` | 29 | Waterjet AWJ (abrasive/pressure/Zeng quality) |
| iter49 | GrindingTribalCorpusEngine | `grinding_tribal_surface` | 27 | Grinding (CBN/diamond/Cubitron II + Malkin Guo burn theory) |
| iter50 | WeldingTribalCorpusEngine | `welding_tribal_surface` | 30 | Welding TIG/MIG/cracking (AWS D1.1/D17.1 + Cr⁶⁺) |
| iter51 | AdditiveManufacturingTribalCorpusEngine | `additive_mfg_tribal_surface` | 31 | Additive FDM/SLA/DMLS/EBM (NFPA 484 + ASTM F2924) |
| iter52 | TribalCorpusOrchestratorEngine | `tribal_corpus_route` | 26 | Single-entry router across the 7 corpora |

Plus iter45 federated tool-life (Bayesian Taylor blend, 19 tests, `federated_tool_life_blend` action) closing a separate P2.

## Architecture

Every child corpus follows the same proven 5-axis match-scoring pattern:
- operation (0.20) × material/wheel/process (0.20) × auxiliary (0.10-0.15) × symptom (0.30-0.40 dominant)
- Final score = match × confidence (`<0.75` flagged draft per foxtrot soul)
- Every tip carries handbook-grade source attribution — Sandvik/Machinery's Handbook/manufacturer + JM Die operator-captured corpus
- Entry-level escalation triggers on (skill=entry × active symptom) OR (skill=entry × reactive/brittle material)
- Material-specific hazard warnings (Class D fire, Cr⁶⁺ carcinogen, NFPA 484 combustible powder, etc.)

The orchestrator (iter52) routes by explicit `process_category` OR regex-inferred from `machine_type_hint`/`operation_hint`. Forward-compatible — adding an 8th corpus just needs a route + dispatch case.

## Why it matters

Closes 8 of 11 iter20 P2 gaps in a single session (gap-by-gap roadmap had separate items for laser/waterjet/sinker/grinding/welding/AM/coaching/federated-tool-life). Combined session P1+P2 closure: **24/28 (86%)** — the largest single-chat foxtrot delivery on record.

Operators now have ONE entry point (`prism_safety:tribal_corpus_route`) instead of 7 process-specific actions to remember. Natural-language queries like "fiber laser cut stainless" auto-route; programmatic use passes `process_category` directly. The orchestrator pure-delegates — no averaging across domains, slot-soul rule intact.

## Commit chain

- iter44 — `(earlier commit; OperatorCoachingTipsEngine)`
- iter45 — `e4e9ddc9c0` federated tool-life (Bayesian Taylor)
- iter46 — `2737974d8c` sinker EDM
- iter47 — `d7f88bb618` laser cutting
- iter48 — `c3f9a856f7` waterjet
- iter49 — `4ce17e2740` grinding
- iter50 — `807d882c03` welding
- iter51 — `26b1c803dd` additive mfg
- iter52 — `96755b19b7` orchestrator capstone

All `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FIRST-PART-PERFECT-MS0]/U-*` from shared `H:/prism` tree per slot-commit-enforce one-shot escape (foxtrot worktree migration not done this session — peer-tree-contention path).

## Follow-ons for next /loop fire

Within foxtrot lane:
1. **MIT-OCW course distillation** — convert MIT 2.830 / 2.008 lecture content into tribal-corpus seed tips
2. **Tribal-corpus extension via tribal-search hits** — auto-grow corpora from `prism_knowledge:tribal_search` query results with operator review
3. **Cross-corpus conflict detection** — when two corpora's tips contradict (laser kerosene + galvanized vs welding kerosene + galvanized), surface the conflict via the orchestrator without averaging (per slot-soul §R7)

Out-of-lane (alpha/bravo/charlie):
- Transitive-fan-out audit P2 (dev-tools)
- GAP-8 multi-physics coupling P1 sub-items

## Cross-references

- [[reference_u_tribal_to_wiki_promote_2026_05_20]] — the wiki promotion side (echo) — corpus → wiki
- [[feedback_engine_tests_in_tests_dir]] — every test file in `mcp-server/src/__tests__/` (canonical scan path)
- [[feedback_conflict_fork_rule]] — when slot-tree commits fail, the bootstrap escape pattern used here
- [[feedback_psn_definition]] — PSN leg #5 (Tribal) — these engines + corpora are the leg's read-side surface
