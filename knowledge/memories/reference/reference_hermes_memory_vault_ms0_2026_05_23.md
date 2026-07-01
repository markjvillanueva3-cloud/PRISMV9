---
name: reference-hermes-memory-vault-ms0-2026-05-23
description: "HERMES-MEMORY-VAULT-MS0 envelope (11 units) + companion deep-research spec shipped 2026-05-23 slot bravo; peer-absorbed under charlie commit 340385c95d (H8 misattribution class — content in HEAD, attribution drift accepted)"
aliases: reference_hermes_memory_vault_ms0_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.606Z
---


# HERMES-MEMORY-VAULT-MS0 — envelope + research spec (2026-05-23, slot bravo)

Closes the post-/compact /goal directive: *"add all gaps to unit/task queue. do deep research on other functionalities of obsidian, qdrant, and most importantly hermes agents | plan for synergizing with PSN and Prism App"*.

## What shipped (in HEAD via peer-absorption commit `340385c95d`)

1. **`mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`** — 11-unit milestone envelope (U-HMEMV01..11, schemaVersion 1.0.0, `mustHumanVerify:true`, advisory-only). PSN legs touched: 1, 3, 4, 5, 6, 10, 11.
2. **`state/shared/specs/HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md`** — 237-line companion deep-research spec.

## The 7 gaps (Simback Hermes Agent Memory Guidebook, https://x.com/KSimback/status/2058262328496554021)

| Unit | Hermes pattern | Gap in PRISM |
|------|---------------|-------------|
| U-HMEMV01 | Mnemosyne tiered consolidation | Auto-promote working → episodic → long-term (today: manual) |
| U-HMEMV02 | yantrikdb explainable retrieval | Per-hit "why retrieved" trace |
| U-HMEMV03 | Mnemosyne temporal recall | Point-in-time "what did I believe at T?" (today: manual `git show`) |
| U-HMEMV04 | GBrain dream cycle | Overnight contradiction synthesis |
| U-HMEMV05 | Mem0 memory router intercept | Auto-inject memory into every LLM dispatch (today: UserPromptSubmit only) |
| U-HMEMV06 | Hindsight reflect-on-memory | Engine reasons over its own memory |
| U-HMEMV07 | FlowState-QMD predictive warmup | Pre-load likely-next hits into index cache |

## The 4 deeper synergies (Guidebook-silent but PRISM-leveragable)

| Unit | Tech | Why deeper |
|------|------|-----------|
| U-HMEMV08 | Obsidian Bases | Frontmatter-pivoted DB views over `knowledge/memories` + `knowledge/wiki` — pure surface win, ~50 LOC |
| U-HMEMV09 | Qdrant HNSW + filter + hybrid + quantization | Scale beyond 10K corpus + per-leg filtering + 32× quantization; `INTEL-OLLAMA-OBSIDIAN-MS0/P13-U02` already shipped the docker-compose |
| U-HMEMV10 | Hermes MemoryProvider ABC compliance | Externalizes PSN as a Hermes L2 plug-in — every Hermes-native agent uses PRISM as their backend |
| U-HMEMV11 | Dataview runtime queries | Operator-callable wiki+memory queries from inside Obsidian |

## Sequencing
- P0: U-HMEMV01, U-HMEMV02
- P1: U-HMEMV03, U-HMEMV04, U-HMEMV05, U-HMEMV08, U-HMEMV09
- P2: U-HMEMV06, U-HMEMV07, U-HMEMV10, U-HMEMV11
- Total: ~1.55K LOC across 11 units

## Peer-absorption — [[reference_h8_misattribution_2026_05_20|H8 misattribution]] class

`git commit` from this session ended attached to peer slot `charlie`'s commit subject `[MAIN] [PSN-HIGH-ROI-AUDIT-MS0]/U-AUDIT-R3 (slot:charlie /goal-5 iter1): R3 spec — learning + reasoning deep dive`. The 387-line diff (150 envelope + 237 spec) is 100% mine; the subject is 100% charlie's. Same multi-chat git-index race documented in [[reference_h8_misattribution_2026_05_20]] and [[reference_mike_closeout_phases_envelope_fix_2026_05_22]].

**Recovery posture (standard):** content preserved in HEAD, attribution drift accepted, log the misattribution, do NOT amend or revert (revert would lose charlie's R3 spec). Verify any future search for this work runs `git log --all -- mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json` rather than searching by commit subject.

## Cross-refs
- Envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`
- Spec: `state/shared/specs/HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md`
- Source article: Simback Hermes Agent Memory Guidebook (2026-05-23)
- Sibling specs (this session): `HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md` (HRP set, 8 units shipped) + `HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md` (HOC set, integrated)
- Peer commit: `340385c95d` (charlie /goal-5 iter1)
- Doctrine: [[feedback_psn_definition]] · [[feedback_obsidian_brain]] · [[reference_hermes_zulu_ms0_2026_05_20]]
